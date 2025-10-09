"use client";

import { cn, detectLanguage, extractPath, parseToolCall, removeLineNumberAnnotations } from "@/lib/utils";
// Accordion components removed as they are not used
import { LogItem } from "@/types/types";
import { useTheme } from "next-themes";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Icon } from "@iconify/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BoxSelect, Eye, Import, SearchCode } from "lucide-react";

export const RenderToolCall = ({ log }: { log: LogItem }) => {
  const { resolvedTheme } = useTheme();

  const result = parseToolCall(log.messages.join("\n"));
  // console.log(result?.type, result,"here is read file");

  if (result?.type === "READ_FILE") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <span>
            {/* <Eye className="inline-block w-4 h-4 mr-1"/> {extractPath(result.result.file_path)} <span className="text-sm text-slate-500">{result.result.start_line ?? 0}-{result.result.end_line ?? 0}</span>  */}
        </span>
      </div>
    );
  }

  if (result?.type === "READ_FILE_RESULT") {
    const language = detectLanguage(result.result.file_path);

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-2">
        <AccordionItem
          value={result.result.file_path ?? "item-1"}
          className="border-none">
          <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <Eye className="inline-block w-4 h-4 mr-1"/> {extractPath(result.result.file_path)}  <span className="text-sm text-slate-500">{result.result?.current_range?.start_line ?? 0}-{result.result?.current_range?.end_line ?? 0}{" "}</span> 
        </span>        
          </AccordionTrigger>
          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
            <Markdown
              components={{
                code(props) {
                  const { children, className, ...rest } = props;
                  const match = /language-(\w+)/.exec(className || "");
                  return match ? (
                    <SyntaxHighlighter
                      PreTag="div"
                      language={language?.language ?? match[1]}
                      style={resolvedTheme === "dark" ? vscDarkPlus : vs}
                      customStyle={{
                        backgroundColor:
                          resolvedTheme === "dark"
                            ? "rgba(255, 0, 0, 0.15)"
                            : "rgba(255,0,0,0.05)",
                        borderRadius: 4,
                        padding: 16,
                        fontSize: 14,
                      }}
                      showLineNumbers>
                      {removeLineNumberAnnotations(String(children).replace(/\n$/, ""))}
                    </SyntaxHighlighter>
                  ) : (
                    <code
                      {...rest}
                      className={cn("whitespace-pre-wrap w-full", className)}>
                      {removeLineNumberAnnotations(String(children))}
                    </code>
                  );
                },
              }}>
              {`${result.result.content_preview}`}
            </Markdown>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <p>
          <span className="px-2 py-1 border border-input font-medium rounded">
            Extract Imports
          </span>{" "}
          {extractPath(result.result.file_path)}
        </p> */}
      </div>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS_RESULT") {
    // Don't display anything if there are no imports
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-3">
        <AccordionItem value={`item-${id}`} className="border-none">
           <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <Import className="inline-block w-4 h-4 mr-1"/> Extract {" "} {result.result?.file_path && extractPath(result.result?.file_path)}{" "} 
        </span>            </AccordionTrigger>
          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
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
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <p>
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Select Files
          </span>{" "}
          {result.result}
        </p> */}
      </div>
    );
  }

  if (result?.type === "SELECT_FILES_RESULT") {
    // Don't display anything if there are no files
    if (!result.result || result.result.length === 0) {
      return null;
    }

    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-2">
        <AccordionItem value={`item-${id}`} className="border-none">
            <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <BoxSelect className="inline-block w-4 h-4 mr-1"/> Select {" "} <span className="text-sm text-slate-500">{result.result?.file_path && extractPath(result.result?.file_path)}{" "}</span>
        </span>            </AccordionTrigger>
          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
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
      <div className="w-full whitespace-pre-wrap break-words">
        {/* <div className="border border-b-0 border-input py-3 px-1.5 rounded-t-md">
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Grep File
          </span>
        </div>

        <div className="border border-input p-3 rounded-b-md bg-card space-y-2">
          <p>Target string: {result.result.target_string}</p>
          <p>Repo name: {result.result.repo_name}</p>
        </div> */}
      </div>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT_RESULT") {
    const id = String(Math.floor(Math.random() * 100));

    return (
      <Accordion type="single" collapsible className="inline-block px-2 rounded mb-2">
        <AccordionItem value={`item-${id}`} className="border-none">
            <AccordionTrigger className=" py-0 rounded-t-md data-[state=closed]:rounded-b-md hover:no-underline cursor-pointer">
 <span className="text-gray-400">
            <SearchCode className="inline-block w-4 h-4 mr-1"/> Searching Codebase {" "} <span className="text-sm text-slate-500">{result.result?.search_query}</span>{" "} 
        </span>            </AccordionTrigger>

          <AccordionContent className="w-full bg-card p-2 border border-input rounded-md overflow-x-auto output-scrollbar text-xs text-muted-foreground leading-6">
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
    <div className="w-full space-y-2 whitespace-pre-wrap break-words">
      <p>{log.messages.join("\n")}</p>
    </div>
  );
};
