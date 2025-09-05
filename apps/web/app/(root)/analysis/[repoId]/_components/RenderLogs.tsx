"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { _config } from "@/lib/_config";
import {
  createParserState,
  extractTitleAndDescription,
  parseLines,
} from "@/lib/utils";
import { LLMResponseSegment, LogItem, ParserState } from "@/types/types";
import { RefreshCcwDotIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const GithubIssueDialog = dynamic(() => import("./GithubIssueDialog"));

const RenderLogs = ({ repoName }: { repoName: string }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController>(null);
  const parserStateRef = useRef<ParserState>(createParserState());

  const analyzeRepo = async () => {
    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      setLogs([]);
      setIsLoading(true);

      const repoUrl = `https://github.com/${repoName}.git`;

      const res = await fetch(`${_config.API_BASE_URL}/api/analysis/execute`, {
        method: "POST",
        body: JSON.stringify({ repoUrl }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        signal,
      });

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
        toast.error(
          `An unexpected error occurred while analyzing the repo ${repoName}.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // console.log("State Logs ====> ", logs);

  const handleCancelLogs = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  };

  // Auto-scroll to bottom when new logs arrive
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  function renderLLMSegments(segments: LLMResponseSegment[]) {
    return segments.map((seg, i) => {
      if (seg.kind === "text") {
        return (
          <div key={i} className="w-full text-sm mb-2">
            <Markdown
              components={{
                code(props) {
                  // eslint-disable-next-line react/prop-types
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}>
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                },
              }}>
              {seg.content}
            </Markdown>
          </div>
        );
      }

      if (seg.kind === "githubIssue") {
        const githubIssue = extractTitleAndDescription(seg.content);

        return (
          <Card key={i} className="mt-5 mb-3">
            <CardHeader>
              <div className="font-semibold text-sm text-muted-foreground mb-5">
                📌{" "}
                <span className="underline underline-offset-2">
                  Suggested GitHub Issue
                </span>
              </div>
              <CardTitle>{githubIssue.title}</CardTitle>
              <CardDescription className="sr-only">
                {githubIssue.title}
              </CardDescription>

              <CardContent className="px-0 mt-3 pb-0 text-muted-foreground text-sm">
                <Markdown>{`${githubIssue.description.substring(0, 500)}...`}</Markdown>
              </CardContent>

              <CardFooter className="p-0 justify-end-safe pt-2.5">
                <GithubIssueDialog
                  title={githubIssue.title}
                  description={githubIssue.description}
                />
              </CardFooter>
            </CardHeader>
          </Card>
        );
      }

      if (seg.kind === "patch") {
        return (
          <div
            key={i}
            className="w-full border border-green-400 rounded p-2 mb-2">
            <div className="font-semibold text-sm mb-1">
              💻 Patch Suggestion
            </div>
            {/* <div className="whitespace-pre text-xs bg-gray-900 text-green-200 p-2 rounded overflow-x-auto">
              {seg.content}
            </div> */}
            <Markdown
              components={{
                code(props) {
                  // eslint-disable-next-line react/prop-types
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={match[1]}
                      style={vscDarkPlus}
                      customStyle={{
                        backgroundColor: "rgba(255, 0, 0, 0.1)",
                      }}>
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code {...rest} className={className}>
                      {children}
                    </code>
                  );
                },
              }}>
              {seg.content}
            </Markdown>
            <Button variant={"secondary"} className="my-3">
              Copy Patch
            </Button>
          </div>
        );
      }
      return null;
    });
  }

  function renderBlock(log: LogItem, index: number) {
    // const styles: Record<LogType, string> = {
    //   INFO: "bg-gray-100 text-gray-800 border-l-4 border-gray-500",
    //   TOOL_CALL: "bg-blue-100 text-blue-800 border-l-4 border-blue-500",
    //   LLM_RESPONSE: "bg-green-100 text-green-800 border-l-4 border-green-500",
    //   DEFAULT:
    //     "bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500 italic",
    // };

    return (
      <div
        key={index}
        className={`w-full p-3 my-2 rounded whitespace-pre-wrap text-muted-foreground`}>
        {log.type === "LLM_RESPONSE" && log.segments ? (
          renderLLMSegments(log.segments)
        ) : (
          <div className="w-full break-words text-xs m-0">
            {log.messages.join("\n")}
          </div>
        )}
      </div>
    );
  }

  return (
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
      <div className="flex-1 px-4 pb-3 max-h-[calc(100%-60px)] max-w-5xl w-full mx-auto">
        <div className="w-full h-full py-3 overflow-y-auto output-scrollbar">
          <div className="w-full flex flex-col items-start gap-3.5">
            {logs.map((log, i) => renderBlock(log, i))}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2">
              <RefreshCcwDotIcon className="size-5 animate-spin text-primary" />
              <span className="italic text-secondary text-sm">
                Analyzing...
              </span>
            </div>
          )}

          {/* <div ref={logsEndRef} /> */}
        </div>
      </div>
    </div>
  );
};

export default RenderLogs;
