"use client";

import { Button } from "@/components/ui/button";
import { _config } from "@/lib/_config";
import {
  createParserState,
  parseLines,
  parseFullLogText,
  bufferJSONToUint8Array,
  gunzipUint8ArrayToText,
} from "@/lib/utils";
import { LogItem, ParserState, RepoTree } from "@/types/types";
import { RefreshCcwDotIcon } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";
import { RenderLLMSegments } from "./RenderLLMSegments";
import { RenderToolCall } from "./RenderToolCall";
import RepoFileTree from "./RepoFileTree";
import { refreshAnalysisList } from "../_actions/getAnalysiswithId";
import GithubIssuesSlider from "./GithubIssuesSlider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { executeAnalysisStream, updateAnalysisStatus } from "@/lib/api/analysis";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { createAnalysisRecord } from "../_actions/createAnalysis";
import { triggerAnalysisListRefresh } from "@/lib/utils/analysisEvents";
import { IconSandbox } from "@tabler/icons-react";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadedFromDb, setIsLoadedFromDb] = useState(false);
  const { getToken } = useAuth();

  const abortControllerRef = useRef<AbortController>(null);
  const parserStateRef = useRef<ParserState>(createParserState());

  const streamAnalysis = async (targetAnalysisId: string) => {
    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setLogs([]);
      setIsLoading(true);
      setIsLoadedFromDb(false);

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
        prompt: "Analyze this codebase for security vulnerabilities and code quality",
        analysisId: targetAnalysisId // Pass the pre-created analysis ID
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
        prompt: "Analyze this codebase for security vulnerabilities and code quality"
      });

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || "Failed to create analysis record");
      }

      const newAnalysisId = analysisResult.analysisId;
      
      // Trigger analysis list refresh to show the new draft analysis
      triggerAnalysisListRefresh();
      
      console.log('Routing to new analysis page:', newAnalysisId);
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
              "Authorization": `Bearer ${token}`  
            }
          }
        );

        // if (!res.ok) {
        //   toast.error(`Failed to fetch analysis: ${res.status}`);
        //   setIsLoading(false);
        //   return;
        // }

        // console.log("🔄 Loading analysis from db: ", res);

        const json = await res.json();
        // console.log("🔄 Loading analysis from db: ", json);
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

  const handleCancelLogs = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
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

      const statusUpdateResult = await updateAnalysisStatus(analysisId, "running", token);
      if (!statusUpdateResult.success) {
        toast.error(statusUpdateResult.error || "Failed to update analysis status");
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
    const initLogs = logs.filter((log) => log.type === "INITIALISATION");
    const otherLogs = logs.filter((log) => log.type !== "INITIALISATION");

    if (initLogs.length === 0) {
      return logs;
    }

    // Combine all initialization messages into one object
    const combinedInitLog: LogItem = {
      type: "INITIALISATION",
      messages: initLogs.flatMap((log) => log.messages),
    };

    return [combinedInitLog, ...otherLogs];
  }, [logs]);

  return (
    <main className=" flex w-full h-full">
      <RepoFileTree repoTree={repoTree} />

      <div className="h-full w-full flex flex-col overflow-hidden ">
            
        <div className="px-4 py-3 flex justify-end-safe gap-3 flex-shrink-0">
          <GithubIssuesSlider 
            repoId={repoId} 
            analysisId={analysisId || undefined} 
          />
          <Button 
            onClick={() => analyzeRepo()} 
            className="cursor-pointer"
          >
            {'Start New Analysis'}
          </Button>

          <Button
            variant={"outline"}
            onClick={handleCancelLogs}
            className="cursor-pointer">
            Cancel Logs
          </Button>
        </div>
        <div className="flex-1 px-4 pb-3 max-w-4xl w-full mx-auto overflow-hidden">
          <div className="w-full h-full py-3 overflow-y-auto output-scrollbar">
            {/* Show start analysis button when no logs exist and not loading */}
            {processedLogs.length === 0 && !isLoading && analysisId && (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="text-center space-y-4">
                  <Button 
                    onClick={startCurrentAnalysis}
                    size="lg"
                    className="px-8 py-3 text-base font-medium"
                  >
                    Start Analysis
                  </Button>
                  <p className="text-sm text-muted-foreground max-w-md">
                    You are about to start a full repository analysis on your default branch. 
                    This will analyze your codebase for security vulnerabilities and code quality.
                  </p>
                </div>
              </div>
            )}

            {/* Show logs when they exist */}
            {processedLogs.length > 0 && (
              <div className="w-full flex flex-col items-start gap-3.5">
                {processedLogs.map((log, i) => (
                  <React.Fragment key={i}>
                    {log.type === "LLM_RESPONSE" && log.segments ? (
                      <div className="w-full p-3 break-words text-sm m-0">
                        <RenderLLMSegments segments={log.segments} repoId={repoId} analysisId={analysisId} isLoadedFromDb={isLoadedFromDb} />
                      </div>
                    ) : log.type === "TOOL_CALL" ? (
                      <div className="w-full whitespace-pre-wrap text-sm m-0">
                        <RenderToolCall log={log} />
                      </div>
                    ) : log.type === "INITIALISATION" ? (
                      <div className="w-full px-2 whitespace-pre-wrap dark:text-neutral-200 text-neutral-800 text-sm leading-7 m-0">
                        <Accordion
                          type="single"
                          collapsible
                          >
                          <AccordionItem value="item-1" className="border-none">
          <AccordionTrigger className=" p-2 border bg-neutral-800 border-input rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
<span className="text-gray-400">
            <IconSandbox className="inline-block w-4 h-4 mr-1"/> Bootstrapping Beetle AI Sandbox
        </span>                               </AccordionTrigger>
                            <AccordionContent className="border border-input rounded-b-md bg-card p-3">
                              <div>{log.messages.join("\n")}</div>
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
              <div className="flex items-center gap-2">
                <RefreshCcwDotIcon className="size-5 animate-spin text-primary" />
                <span className="italic text-secondary text-sm">
                  Analyzing...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default RenderLogs;
