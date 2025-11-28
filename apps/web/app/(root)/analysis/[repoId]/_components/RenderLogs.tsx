"use client";

import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import {
  createParserState,
  parseLines,
  parseFullLogText,
  bufferJSONToUint8Array,
  gunzipUint8ArrayToText,
  parseToolCall,
  extractPath,
} from "@/lib/utils";
import { LogItem, ParserState, RepoTree } from "@/types/types";
import { PlayIcon, RefreshCcwDotIcon, SquareIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
// import { RenderLLMSegments } from "./RenderLLMSegments";
import { RenderToolCall } from "./RenderToolCall";
import RepoFileTree from "./RepoFileTree";
// import { refreshAnalysisList } from "../_actions/getAnalysiswithId";
import GithubIssuesSlider from "./GithubIssuesSlider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  executeAnalysisStream,
  updateAnalysisStatus,
  stopAnalysis,
} from "@/lib/api/analysis";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createAnalysisRecord } from "../_actions/createAnalysis";
import { triggerAnalysisListRefresh } from "@/lib/utils/analysisEvents";
import { IconSandbox } from "@tabler/icons-react";
import AnalysisSheet from "./AnalysisSheet";
import { useIsTablet } from "@/hooks/use-tablet";
import RepoFileTreeSheet from "./RepoFileTreeSheet";

const RenderLogs = ({
  repoId,
  analysisId,
  repoTree,
  branch,
  teamId,
}: {
  repoId: string;
  analysisId?: string;
  repoTree: RepoTree;
  branch?: string;
  teamId?: string;
}) => {
  const isTablet = useIsTablet();
  const router = useRouter();

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadedFromDb, setIsLoadedFromDb] = useState(false);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string | null>(
    null,
  );
  const { getToken } = useAuth();

  const abortControllerRef = useRef<AbortController>(null);
  const parserStateRef = useRef<ParserState>(createParserState());
  type AnalysisStatus =
    | "draft"
    | "completed"
    | "interrupted"
    | "error"
    | "running";
  const [analysisStatus, setAnalysisStatus] = useState<
    AnalysisStatus | undefined
  >(undefined);

  const streamAnalysis = async (targetAnalysisId: string) => {
    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setLogs([]);
      setIsLoading(true);
      setIsLoadedFromDb(false);
      setAnalysisStatus("running");

      const token = await getToken();
      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      console.log("Starting analysis stream for:", targetAnalysisId);

      // Start the actual analysis with the pre-created ID
      const body = {
        github_repositoryId: repoId,
        branch: branch,
        teamId: teamId,
        model: "gemini-2.0-flash",
        prompt:
          "Analyze this codebase for security vulnerabilities and code quality",
        analysisId: targetAnalysisId, // Pass the pre-created analysis ID
      };

      const res = await executeAnalysisStream(body, token, teamId);

      if (!res.ok) {
        toast.error(`HTTP error! status: ${res.status}`);
        return;
      }

      // Type guard for res.body
      if (!res.body) {
        toast.error("Response body is null - streaming not supported");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // local copy to avoid races with React state; we commit periodically
      let localLogs: LogItem[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done || signal.aborted) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        if (lines.length > 0) {
          const result = parseLines(lines, localLogs, parserStateRef.current);
          localLogs = result.logs;
          parserStateRef.current = result.state;
          // update UI once per chunk (not once per line) to avoid races/duplication
          setLogs(localLogs.map((l) => ({ ...l, messages: [...l.messages] })));
        }
      }

      // leftover buffer
      if (buffer.trim()) {
        const result = parseLines([buffer], localLogs, parserStateRef.current);
        localLogs = result.logs;
        parserStateRef.current = result.state;
        setLogs(localLogs.map((l) => ({ ...l, messages: [...l.messages] })));
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`${error.message}`);
      } else {
        toast.error(`An unexpected error occurred while analyzing this repo.`);
      }
    } finally {
      // Trigger analysis list refresh to show the completed/error status
      triggerAnalysisListRefresh();
      setIsLoading(false);
      // Fetch latest analysis status from backend
      try {
        const token = await getToken();
        if (token && targetAnalysisId) {
          const res = await fetch(
            `${_config.API_BASE_URL}/api/analysis/${encodeURIComponent(targetAnalysisId)}/logs`,
            {
              method: "GET",
              credentials: "include",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          const json = await res.json();
          const statusFromDb = json?.data?.status as AnalysisStatus | undefined;
          if (statusFromDb) {
            setAnalysisStatus(statusFromDb);
          }
        }
      } catch (e) {
        // ignore status fetch errors
        console.log(e);
      }
    }
  };

  const analyzeRepo = async () => {
    try {
      setIsLoading(true);

      const token = await getToken();
      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      // Step 1: Create analysis record upfront
      const analysisResult = await createAnalysisRecord({
        github_repositoryId: repoId,
        branch: branch,
        teamId: teamId,
        model: "gemini-2.0-flash",
        prompt:
          "Analyze this codebase for security vulnerabilities and code quality",
      });

      if (!analysisResult.success) {
        throw new Error(
          analysisResult.error || "Failed to create analysis record",
        );
      }

      const newAnalysisId = analysisResult.analysisId;

      // Trigger analysis list refresh to show the new draft analysis
      triggerAnalysisListRefresh();

      console.log("Routing to new analysis page:", newAnalysisId);
      // Step 2: Navigate to the new analysis page - user will manually start analysis
      router.push(`/analysis/${repoId}/${newAnalysisId}`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`${error.message}`);
      } else {
        toast.error(`An unexpected error occurred while creating analysis.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadFromDb = async () => {
      try {
        setIsLoading(true);
        setLogs([]);

        if (!analysisId) {
          setIsLoading(false);
          return;
        }

        const token = await getToken();

        console.log("🔄 Loading analysis from db: ", analysisId);

        const res = await fetch(
          `${_config.API_BASE_URL}/api/analysis/${encodeURIComponent(analysisId)}/logs`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        // if (!res.ok) {
        //   toast.error(`Failed to fetch analysis: ${res.status}`);
        //   setIsLoading(false);
        //   return;
        // }

        // console.log("🔄 Loading analysis from db: ", res);

        const json = await res.json();
        // console.log("🔄 Loading analysis from db: ", json);
        const statusFromDb = json?.data?.status as AnalysisStatus | undefined;
        if (statusFromDb) {
          setAnalysisStatus(statusFromDb);
        }
        let logsText: string = "";
        const bufJson = json?.data?.logsCompressed;
        const binary = bufferJSONToUint8Array(bufJson);
        // console.log("🔄 Loading binary from db: ", binary);
        if (binary) {
          const decoded = await gunzipUint8ArrayToText(binary);
          if (decoded) {
            logsText = decoded;
          }
        }
        if (!logsText) logsText = json?.data?.logsText || "";

        const result = parseFullLogText(logsText);
        // console.log("🔄 Loading result from db: ", result);
        setLogs(result.logs.map((l) => ({ ...l, messages: [...l.messages] })));
        setIsLoadedFromDb(true);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to load analysis";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadFromDb();
  }, [analysisId]);

  // console.log("State Logs ====> ", logs);

  const handleStopAnalysis = async () => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      if (!analysisId) {
        toast.error("No analysis is active");
        return;
      }

      const res = await stopAnalysis(analysisId, token);
      if (!res.success) {
        toast.error(res.error || "Failed to stop analysis");
        return;
      }

      // Abort local stream reading
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Update UI state and refresh list
      setIsLoading(false);
      setAnalysisStatus("interrupted");
      triggerAnalysisListRefresh();
      toast.success("Analysis stopped");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to stop analysis",
      );
    }
  };

  const startCurrentAnalysis = async () => {
    if (!analysisId) return;

    try {
      // First, update the analysis status from 'draft' to 'running'
      const token = await getToken();
      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      const statusUpdateResult = await updateAnalysisStatus(
        analysisId,
        "running",
        token,
      );
      if (!statusUpdateResult.success) {
        toast.error(
          statusUpdateResult.error || "Failed to update analysis status",
        );
        return;
      }

      // Trigger analysis list refresh to show the updated status
      triggerAnalysisListRefresh();

      // Then start the analysis stream
      await streamAnalysis(analysisId);
    } catch (error) {
      console.error("Error starting analysis:", error);
      toast.error("Failed to start analysis");
    }
  };

  const processedLogs = useMemo(() => {
    // First filter out INFO logs from all logs
    let filteredLogs = logs.filter((log) => log.type !== "INFO");

    // Apply file filter if selected
    if (selectedFileFilter) {
      // Group logs by file context
      const fileContextGroups: { [filePath: string]: LogItem[] } = {};
      let currentFileContext: string | undefined = undefined;
      const ungroupedLogs: LogItem[] = [];

      filteredLogs.forEach((log) => {
        // Check if this is a READ_FILE tool call that starts a new file context
        if (log.type === "TOOL_CALL") {
          const result = parseToolCall(log.messages.join("\n"));
          if (result?.type === "READ_FILE" && result?.result?.file_path) {
            const normalizedLogPath = extractPath(result.result.file_path);
            if (normalizedLogPath) {
              currentFileContext = normalizedLogPath;
              if (!fileContextGroups[currentFileContext]) {
                fileContextGroups[currentFileContext] = [];
              }
            }
          }
        }

        // Add log to appropriate group
        if (currentFileContext) {
          fileContextGroups[currentFileContext]?.push(log);
        } else {
          ungroupedLogs.push(log);
        }
      });

      // Return logs for the selected file plus ungrouped logs (like INITIALISATION)
      const selectedFileLogs = fileContextGroups[selectedFileFilter] || [];
      const initLogs = ungroupedLogs.filter(
        (log) => log.type === "INITIALISATION",
      );

      console.log("File context groups:", Object.keys(fileContextGroups));
      console.log("Selected file filter:", selectedFileFilter);
      console.log("Selected file logs count:", selectedFileLogs.length);

      filteredLogs = [...initLogs, ...selectedFileLogs];
    }

    const initLogs = filteredLogs.filter(
      (log) => log.type === "INITIALISATION",
    );
    const otherLogs = filteredLogs.filter(
      (log) => log.type !== "INITIALISATION",
    );

    if (initLogs.length === 0) {
      return filteredLogs;
    }

    // Combine all initialization messages into one object
    const combinedInitLog: LogItem = {
      type: "INITIALISATION",
      messages: initLogs.flatMap((log) => log.messages),
    };

    return [combinedInitLog, ...otherLogs];
  }, [logs, selectedFileFilter]);

  return (
    <section className="flex h-full w-full">
      {!isTablet && (
        <RepoFileTree
          repoTree={repoTree}
          onFileSelect={setSelectedFileFilter}
          selectedFile={selectedFileFilter}
        />
      )}

      <div className="mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-2 py-3 md:px-4">
          <div>
            {isTablet && <AnalysisSheet />}
            {isTablet && (
              <RepoFileTreeSheet
                repoTree={repoTree}
                onFileSelect={setSelectedFileFilter}
                selectedFile={selectedFileFilter}
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <GithubIssuesSlider
              repoId={repoId}
              analysisId={analysisId || undefined}
            />

            <Button onClick={() => analyzeRepo()} className="cursor-pointer">
              <PlayIcon className="size-4" />
              <span className="sr-only lg:not-sr-only">Start New Analysis</span>
            </Button>

            {/* <Button
              variant={"outline"}
              onClick={handleCancelLogs}
              className="cursor-pointer">
              Cancel Logs
            </Button> */}

            {analysisId &&
              (analysisStatus === "running" ||
                analysisStatus === "interrupted" ||
                analysisStatus === "error") && (
                <Button
                  variant={
                    analysisStatus === "running" ? "destructive" : "outline"
                  }
                  onClick={
                    analysisStatus === "running"
                      ? handleStopAnalysis
                      : startCurrentAnalysis
                  }
                  className="cursor-pointer"
                >
                  {analysisStatus === "running" ? (
                    <SquareIcon className="size-4" />
                  ) : (
                    <RefreshCcwDotIcon className="size-4" />
                  )}
                  <span className="sr-only lg:not-sr-only">
                    {analysisStatus === "running"
                      ? "Stop Analysis"
                      : "Restart Analysis"}
                  </span>
                </Button>
              )}
          </div>
        </div>

        {/* File filter indicator */}
        <div className="flex items-center gap-2">
          {selectedFileFilter && (
            <div className="bg-accent/50 flex items-center gap-2 rounded-md px-3 py-1.5 text-sm">
              <span className="text-muted-foreground">Filtering:</span>
              <span className="font-medium">
                {selectedFileFilter.split("/").pop()}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFileFilter(null)}
                className="hover:bg-accent h-auto p-1"
              >
                ✕
              </Button>
            </div>
          )}
        </div>

        <div className="output-scrollbar flex-1 overflow-y-auto">
          <div className="w-full px-3 pt-3 pb-6 sm:px-4">
            {/* Show start analysis button when no logs exist and not loading */}
            {processedLogs.length === 0 &&
              !isLoading &&
              analysisId &&
              !selectedFileFilter && (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                  <div className="space-y-4 text-center">
                    <Button
                      onClick={startCurrentAnalysis}
                      size="lg"
                      className="px-8 py-3 text-base font-medium"
                    >
                      Start Analysis
                    </Button>
                    <p className="text-muted-foreground max-w-md text-sm">
                      You are about to start a full repository analysis on your
                      default branch. This will analyze your codebase for
                      security vulnerabilities and code quality.
                    </p>
                  </div>
                </div>
              )}

            {/* Show message when no logs found for selected file */}
            {processedLogs.length === 0 && !isLoading && selectedFileFilter && (
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="space-y-4 text-center">
                  <p className="text-lg font-medium">
                    No logs found for this file
                  </p>
                  <p className="text-muted-foreground max-w-md text-sm">
                    The selected file &quot;
                    {selectedFileFilter.split("/").pop()}&quot; doesn&apos;t
                    have any analysis logs yet. Try selecting a different file
                    or clear the filter to see all logs.
                  </p>
                  <Button
                    onClick={() => setSelectedFileFilter(null)}
                    variant="outline"
                  >
                    Clear Filter
                  </Button>
                </div>
              </div>
            )}

            {/* Show logs when they exist */}
            {processedLogs.length > 0 && (
              <div className="flex w-full flex-col items-start gap-3.5">
                {processedLogs.map((log, i) => (
                  <React.Fragment key={i}>
                    {log.type === "TOOL_CALL" ? (
                      (() => {
                        // Only render READ_FILE_RESULT tool calls in main area
                        // Other tool calls are handled within READ_FILE_RESULT accordions
                        const result = parseToolCall(log.messages.join("\n"));
                        if (
                          result?.type === "READ_FILE_RESULT" &&
                          result?.result
                        ) {
                          return (
                            <div className="m-0 w-full text-sm whitespace-pre-wrap">
                              <RenderToolCall
                                log={log}
                                allLogs={processedLogs}
                                repoId={repoId}
                                analysisId={analysisId}
                                isLoadedFromDb={isLoadedFromDb}
                              />
                            </div>
                          );
                        }
                        return null;
                      })()
                    ) : log.type === "INITIALISATION" ? (
                      <div className="m-0 mb-6 w-full text-sm leading-7 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                        <Accordion type="single" collapsible>
                          <AccordionItem value="item-1" className="border-none">
                            <AccordionTrigger className="border-input cursor-pointer rounded-t-md border bg-neutral-800 p-2 hover:no-underline data-[state=closed]:rounded-b-md">
                              <span className="text-gray-400">
                                <IconSandbox className="mr-1 inline-block h-4 w-4" />{" "}
                                Bootstrapping Beetle AI Sandbox
                              </span>{" "}
                            </AccordionTrigger>
                            <AccordionContent className="border-input bg-card w-full rounded-b-md border p-3">
                              <div className="w-full text-sm break-all whitespace-pre-wrap">
                                {log.messages.join("\n")}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    ) : null}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Show loading indicator */}
            {isLoading && (
              <div className="ml-2 flex items-center gap-2 py-2">
                <RefreshCcwDotIcon className="text-primary size-5 animate-spin" />
                <span className="text-sm text-gray-400 italic">
                  {isLoadedFromDb ? "Loading..." : "Analyzing..."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RenderLogs;
