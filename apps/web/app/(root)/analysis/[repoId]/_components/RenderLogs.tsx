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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { executeAnalysis } from "../_actions/analyzeRepo";

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
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController>(null);
  const parserStateRef = useRef<ParserState>(createParserState());

  const analyzeRepo = async () => {
    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setLogs([]);
      setIsLoading(true);

      const body = {
        github_repositoryId: repoId,
        branch,
        teamId
      };

      const res = await executeAnalysis(body);

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
      await refreshAnalysisList(repoId);
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

        console.log("🔄 Loading analysis from db: ", analysisId);

        const res = await fetch(
          `${_config.API_BASE_URL}/api/analysis/${encodeURIComponent(analysisId)}/logs`,
          {
            method: "GET",
            credentials: "include",
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
    <main className="flex w-full">
      <RepoFileTree repoTree={repoTree} />

      <div className="h-full w-full flex flex-col">
        <div className="px-4 py-3 flex justify-end-safe gap-3">
          <Button onClick={analyzeRepo} className="cursor-pointer">
            Fetch Logs
          </Button>

          <Button
            variant={"outline"}
            onClick={handleCancelLogs}
            className="cursor-pointer">
            Cancel Logs
          </Button>
        </div>
        <div className="flex-1 px-4 pb-3 max-h-[calc(100%-60px)] max-w-2xl w-full mx-auto">
          <div className="w-full h-full py-3 overflow-y-auto output-scrollbar">
            <div className="w-full flex flex-col items-start gap-3.5">
              {processedLogs.map((log, i) => (
                <React.Fragment key={i}>
                  {log.type === "LLM_RESPONSE" && log.segments ? (
                    <div className="w-full p-3 break-words text-sm m-0">
                      <RenderLLMSegments segments={log.segments} />
                    </div>
                  ) : log.type === "TOOL_CALL" ? (
                    <div className="w-full p-3 whitespace-pre-wrap text-sm m-0">
                      <RenderToolCall log={log} />
                    </div>
                  ) : log.type === "INITIALISATION" ? (
                    <div className="w-full p-3 whitespace-pre-wrap dark:text-neutral-200 text-neutral-800 text-sm leading-7 m-0">
                      <Accordion
                        type="single"
                        collapsible
                        defaultValue="item-1">
                        <AccordionItem value="item-1" className="border-none">
                          <AccordionTrigger className="px-3 border border-input rounded-t-md data-[state=closed]:rounded-b-md cursor-pointer">
                            Bootstrapping Codetector Sandbox
                          </AccordionTrigger>
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
