"use client";

import React from "react";

import { BoxSelect, Eye, Import, SearchCode } from "lucide-react";
import { Icon } from "@iconify/react";
import { v4 as uuidv4 } from "uuid";

import { detectLanguage, extractPath, parseToolCall } from "@/lib/utils";
import { LogItem } from "@/types/types";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RenderLLMSegments } from "./RenderLLMSegments";

export const RenderToolCall = ({
  log,
  allLogs,
  repoId,
  analysisId,
  isLoadedFromDb,
}: {
  log: LogItem;
  allLogs?: LogItem[];
  repoId?: string;
  analysisId?: string;
  isLoadedFromDb?: boolean;
}) => {
  const result = parseToolCall(log.messages.join("\n"));
  // console.log(result?.type, result,"here is read file");

  if (result?.type === "READ_FILE") {
    return (
      // <div className="w-full break-words whitespace-pre-wrap">
      //   <span>
      //     {/* <Eye className="inline-block w-4 h-4 mr-1"/> {extractPath(result.result.file_path)} <span className="text-sm text-slate-500">{result.result.start_line ?? 0}-{result.result.end_line ?? 0}</span>  */}
      //   </span>
      // </div>

      null
    );
  }

  if (result?.type === "READ_FILE_RESULT") {
    const filePath = result.result.file_path;
    const normalizedFilePath = extractPath(filePath);

    // Filter logs for this specific file if allLogs is provided
    const getFileSpecificLogs = () => {
      if (!allLogs || !normalizedFilePath) return [];

      const fileContextGroups: { [filePath: string]: LogItem[] } = {};
      let currentFileContext: string | undefined = undefined;

      allLogs.forEach((logItem) => {
        // Check if this is a read_file tool call that starts a new file context
        if (logItem.type === "TOOL_CALL") {
          const toolResult = parseToolCall(logItem.messages.join("\n"));
          if (
            toolResult?.type === "READ_FILE" &&
            toolResult?.result?.file_path
          ) {
            const normalizedLogPath = extractPath(toolResult.result.file_path);
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
          fileContextGroups[currentFileContext]?.push(logItem);
        }
      });

      return fileContextGroups[normalizedFilePath] || [];
    };

    const fileSpecificLogs = getFileSpecificLogs();
    const filteredLogs = fileSpecificLogs.filter((logItem) => {
      // Exclude INFO logs
      if (logItem.type !== "LLM_RESPONSE" && logItem.type !== "TOOL_CALL") {
        return false;
      }
      // Include LLM_RESPONSE segments
      if (logItem.type === "LLM_RESPONSE") {
        return true;
      }
      // Include non-READ_FILE tool calls
      if (logItem.type === "TOOL_CALL") {
        const toolResult = parseToolCall(logItem.messages.join("\n"));
        return !toolResult?.type?.includes("READ_FILE");
      }
      // Include other log types (except INFO which is already excluded above)
      return true;
    });

    // Count issues and fixes from the filtered logs
    const getCounts = () => {
      let issueCount = 0;
      let fixCount = 0;
      let warningCount = 0;

      filteredLogs.forEach((logItem) => {
        if (logItem.type === "LLM_RESPONSE" && logItem.segments) {
          logItem.segments.forEach((segment) => {
            if (segment.kind === "githubIssue") {
              issueCount++;
            } else if (
              segment.kind === "patch" ||
              segment.kind === "githubPullRequest"
            ) {
              fixCount++;
            } else if (segment.kind === "warning") {
              warningCount++;
            }
          });
        }
      });

      return { issueCount, fixCount, warningCount };
    };

    const { issueCount, fixCount, warningCount } = getCounts();

    return (
      <Accordion
        type="single"
        collapsible
        defaultValue={filePath ?? "item-1"}
        className="mb-2 w-full rounded px-2"
      >
        <AccordionItem
          value={filePath ?? "item-1"}
          className="w-full border-none"
        >
          <AccordionTrigger className="cursor-pointer py-2 hover:no-underline data-[state=closed]:rounded-b-md">
            <span className="flex flex-col text-gray-400 lg:flex-row lg:items-center">
              <span>
                <Eye className="mr-2 inline-block size-4" />
                <span className="font-medium">{normalizedFilePath}</span>
              </span>
              <span>
                {result.result?.current_range && (
                  <span className="ml-2 text-xs text-slate-500">
                    Lines {result.result.current_range.start_line}-
                    {result.result.current_range.end_line}
                  </span>
                )}
                {issueCount > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    {issueCount} Github issue{issueCount !== 1 ? "s" : ""},
                  </span>
                )}
                {fixCount > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    {fixCount} Fix suggested{fixCount !== 1 ? "" : ""}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="ml-2 text-xs text-slate-400">
                    {warningCount} Warning{warningCount !== 1 ? "s" : ""}
                  </span>
                )}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="w-full p-0">
            <div className="w-full">
              {filteredLogs.length > 0 ? (
                <div className="flex w-full flex-col items-start gap-3.5">
                  {filteredLogs.map((logItem: any, index: number) => (
                    <React.Fragment key={index}>
                      {logItem.type === "LLM_RESPONSE" && logItem.segments ? (
                        <div className="llm-segment m-0 w-full text-sm whitespace-pre-wrap">
                          <RenderLLMSegments
                            segments={logItem.segments}
                            repoId={repoId || ""}
                            analysisId={analysisId}
                            isLoadedFromDb={isLoadedFromDb || false}
                          />
                        </div>
                      ) : logItem.type === "TOOL_CALL" ? (
                        <div className="tool-call m-0 w-full text-sm whitespace-pre-wrap">
                          <RenderToolCall
                            log={logItem}
                            allLogs={filteredLogs}
                            repoId={repoId}
                            analysisId={analysisId}
                            isLoadedFromDb={isLoadedFromDb}
                          />
                        </div>
                      ) : (
                        <div className="text-muted-foreground nothing w-full text-sm break-all whitespace-pre-wrap">
                          {logItem.messages.join("\n")}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : // Only show "no logs found" if analysis is loaded from DB (not streaming)
              // During live streaming, don't show any message as logs may still be coming
              isLoadedFromDb ? (
                <div className="text-muted-foreground py-4 text-center">
                  No logs found for this file
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS") {
    return (
      // <div className="w-full break-words whitespace-pre-wrap">
      //   {/* <p>
      //     <span className="px-2 py-1 border border-input font-medium rounded">
      //       Extract Imports
      //     </span>{" "}
      //     {extractPath(result.result.file_path)}
      //   </p> */}
      // </div>
      null
    );
  }

  if (result?.type === "EXTRACT_IMPORTS_RESULT") {
    // Don't display anything if there are no imports
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = uuidv4();

    return (
      <Accordion
        type="single"
        collapsible
        className="mb-3 inline-block w-full rounded px-2"
      >
        <AccordionItem value={`item-${id}`} className="w-full border-none">
          <AccordionTrigger className="cursor-pointer rounded-t-md py-0 hover:no-underline data-[state=closed]:rounded-b-md">
            <span className="text-gray-400">
              <Import className="mr-1 inline-block h-4 w-4" /> Extract{" "}
              {result.result?.file_path &&
                extractPath(result.result?.file_path)}{" "}
            </span>{" "}
          </AccordionTrigger>
          <AccordionContent className="bg-card border-input output-scrollbar text-muted-foreground w-full overflow-x-auto rounded-md border p-2 text-xs leading-6">
            {result.result.map((item: string, i: number) => {
              const language = detectLanguage(item);
              return (
                <div key={i} className="flex items-center gap-1">
                  <Icon icon={language?.icon || ""} /> {extractPath(item)}
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "SELECT_FILES") {
    return (
      // <div className="w-full break-words whitespace-pre-wrap">
      //   {/* <p>
      //     <span className="px-2 py-1.5 border border-input font-medium rounded">
      //       Select Files
      //     </span>{" "}
      //     {result.result}
      //   </p> */}
      // </div>

      null
    );
  }

  if (result?.type === "SELECT_FILES_RESULT") {
    // Don't display anything if there are no files
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = uuidv4();

    return (
      <Accordion
        type="single"
        collapsible
        className="mb-2 inline-block w-full rounded px-2"
      >
        <AccordionItem value={`item-${id}`} className="w-full border-none">
          <AccordionTrigger className="cursor-pointer rounded-t-md py-0 hover:no-underline data-[state=closed]:rounded-b-md">
            <span className="text-gray-400">
              <BoxSelect className="mr-1 inline-block h-4 w-4" /> Select{" "}
              <span className="text-sm text-slate-500">
                {result.result?.file_path &&
                  extractPath(result.result?.file_path)}{" "}
              </span>
            </span>{" "}
          </AccordionTrigger>
          <AccordionContent className="bg-card border-input output-scrollbar text-muted-foreground w-full overflow-x-auto rounded-md border p-2 text-xs leading-6">
            {result.result && result.result.length > 0 ? (
              result.result.map((item: string, i: number) => {
                const language = detectLanguage(item);
                return (
                  <div key={i} className="flex items-center gap-1">
                    <Icon icon={language?.icon || ""} /> {extractPath(item)}
                  </div>
                );
              })
            ) : (
              <div>No files found</div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT") {
    return (
      // <div className="w-full break-words whitespace-pre-wrap">
      //   {/* <div className="border border-b-0 border-input py-3 px-1.5 rounded-t-md">
      //     <span className="px-2 py-1.5 border border-input font-medium rounded">
      //       Grep File
      //     </span>
      //   </div>

      //   <div className="border border-input p-3 rounded-b-md bg-card space-y-2">
      //     <p>Target string: {result.result.target_string}</p>
      //     <p>Repo name: {result.result.repo_name}</p>
      //   </div> */}
      // </div>

      null
    );
  }

  if (result?.type === "GREP_FILE_CONTENT_RESULT") {
    const id = uuidv4();

    return (
      <Accordion
        type="single"
        collapsible
        className="mb-2 inline-block w-full rounded px-2"
      >
        <AccordionItem value={`item-${id}`} className="w-full border-none">
          <AccordionTrigger className="cursor-pointer rounded-t-md py-0 wrap-break-word whitespace-pre-wrap hover:no-underline data-[state=closed]:rounded-b-md">
            <span className="text-gray-400">
              <SearchCode className="mr-1 inline-block h-4 w-4" /> Searching
              Codebase{" "}
              <span className="block text-sm wrap-break-word text-slate-500 lg:inline-block">
                {result.result?.search_query}
              </span>{" "}
            </span>{" "}
          </AccordionTrigger>

          <AccordionContent className="bg-card border-input output-scrollbar text-muted-foreground w-full overflow-x-auto rounded-md border p-2 text-xs leading-6">
            <p>Files searched: {result.result.search_summary.files_searched}</p>
            <p>
              Total files with matches:{" "}
              {result.result.search_summary.total_files_with_matches}
            </p>

            <ul>
              {result.result.results_count &&
              result.result.results_count.length > 0
                ? result.result.results_count.map((item: any, i: number) => {
                    return <li key={i}>File Path: {item.file_path}</li>;
                  })
                : null}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div className="w-full space-y-2 wrap-break-word whitespace-pre-wrap">
      <p>{log.messages.join("\n")}</p>
    </div>
  );
};
