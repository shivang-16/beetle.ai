"use client";

import { cn, extractPath } from "@/lib/utils";
// Accordion components removed as they are not used
import { LogItem } from "@/types/types";
import { useTheme } from "next-themes";
import Markdown from "react-markdown";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Icon } from "@iconify/react";

function parseLogLine(log: string): { type: string; result: any } | null {
  try {
    // Extract type (inside square brackets)
    const typeMatch = log.match(/\[(.*?)\]/);
    if (!typeMatch) return null;
    const type = typeMatch[1] ?? "";

    // Extract payload (after square bracket)
    const payloadMatch = log.match(/\] (.*)$/s);
    if (!payloadMatch) return { type, result: null };
    let jsonLike = payloadMatch[1] ? payloadMatch[1].trim() : "";

    // Handle empty array case directly
    if (jsonLike === "[]") {
      return { type, result: [] };
    }

    // Convert Python-style values
    jsonLike = jsonLike
      .replace(/\bTrue\b/g, "true")
      .replace(/\bFalse\b/g, "false")
      .replace(/\bNone\b/g, "null");

    // Replace single-quoted strings safely with double quotes
    jsonLike = jsonLike.replace(/'([^']*)'/g, (_, val) => {
      return `"${val.replace(/"/g, '\\"')}"`;
    });

    return {
      type,
      result: !jsonLike.includes("Scanning")
        ? JSON.parse(jsonLike)
        : payloadMatch[1]?.trim(),
    };
  } catch (err) {
    console.error("Failed to parse log:", err);
    return null;
  }
}

function detectLanguage(
  filePath: string
): { language: string; icon: string } | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return null;

  // Map extension → language + VS Code icon name
  const map: Record<string, { language: string; icon: string }> = {
    js: { language: "javascript", icon: "vscode-icons:file-type-js" },
    jsx: { language: "javascript", icon: "vscode-icons:file-type-reactjs" },
    ts: { language: "typescript", icon: "vscode-icons:file-type-typescript" },
    tsx: { language: "typescript", icon: "vscode-icons:file-type-reactts" },
    py: { language: "python", icon: "vscode-icons:file-type-python" },
    java: { language: "java", icon: "vscode-icons:file-type-java" },
    cs: { language: "csharp", icon: "vscode-icons:file-type-csharp" },
    cpp: { language: "cpp", icon: "vscode-icons:file-type-cpp" },
    c: { language: "c", icon: "vscode-icons:file-type-c" },
    rb: { language: "ruby", icon: "vscode-icons:file-type-ruby" },
    php: { language: "php", icon: "vscode-icons:file-type-php" },
    go: { language: "go", icon: "vscode-icons:file-type-go" },
    rs: { language: "rust", icon: "vscode-icons:file-type-rust" },
    swift: { language: "swift", icon: "vscode-icons:file-type-swift" },
    kt: { language: "kotlin", icon: "vscode-icons:file-type-kotlin" },
    m: { language: "objective-c", icon: "vscode-icons:file-type-objectivec" },
    scala: { language: "scala", icon: "vscode-icons:file-type-scala" },
    sh: { language: "shell", icon: "vscode-icons:file-type-shell" },
    sql: { language: "sql", icon: "vscode-icons:file-type-sql" },
    json: { language: "json", icon: "vscode-icons:file-type-json" },
    yaml: { language: "yaml", icon: "vscode-icons:file-type-yaml" },
    yml: { language: "yaml", icon: "vscode-icons:file-type-yaml" },
    md: { language: "markdown", icon: "vscode-icons:file-type-markdown" },
    html: { language: "html", icon: "vscode-icons:file-type-html" },
    css: { language: "css", icon: "vscode-icons:file-type-css" },
    scss: { language: "scss", icon: "vscode-icons:file-type-scss" },
    xml: { language: "xml", icon: "vscode-icons:file-type-xml" },
    Dockerfile: {
      language: "Dockerfile",
      icon: "vscode-icons:file-type-docker",
    },
  };

  return map[ext] || null;
}

export const MergedLogs = ({ log }: { log: LogItem }) => {
  const { resolvedTheme } = useTheme();

  const result = parseLogLine(log.messages.join("\n"));

  if (result?.type === "READ_FILE") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <p>
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Read File
          </span>{" "}
          {extractPath(result.result.file_path)}
        </p>
      </div>
    );
  }

  if (result?.type === "READ_FILE_RESULT") {
    const language = detectLanguage(result.result.file_path);

    return (
      <div className="w-full">
        <div className="w-full border border-input border-b-0 rounded-t-md py-3.5 px-2.5">
          <span className="border border-input rounded px-2 py-1">
            Read File Result
          </span>{" "}
          {extractPath(result.result.file_path)}
        </div>
        <div className="w-full border border-input rounded-b-md py-3.5 px-2.5 bg-card overflow-x-auto output-scrollbar">
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
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    {...rest}
                    className={cn("whitespace-pre-wrap w-full", className)}>
                    {children}
                  </code>
                );
              },
            }}>
            {`${result.result.content_preview}`}
          </Markdown>
        </div>
      </div>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <p>
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Extract Imports
          </span>{" "}
          {extractPath(result.result.file_path)}
        </p>
      </div>
    );
  }

  if (result?.type === "EXTRACT_IMPORTS_RESULT") {
    return (
      <div className="w-full">
        <div className="w-full border border-input border-b-0 rounded-t-md py-3.5 px-2.5">
          <span className="border border-input rounded px-2 py-1">
            Extract Imports Result
          </span>
        </div>

        <div className="w-full border border-input rounded-b-md py-3.5 px-2.5 bg-card space-y-2 overflow-x-auto output-scrollbar">
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
            <div>No imports found</div>
          )}
        </div>
      </div>
    );
  }

  if (result?.type === "SELECT_FILES") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <p>
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Select Files
          </span>{" "}
          {result.result}
        </p>
      </div>
    );
  }

  if (result?.type === "SELECT_FILES_RESULT") {
    return (
      <div className="w-full">
        <div className="w-full border border-input border-b-0 rounded-t-md py-3.5 px-2.5">
          <span className="border border-input rounded px-2 py-1">
            Select Files Result
          </span>
        </div>

        <div className="w-full border border-input rounded-b-md py-3.5 px-2.5 bg-card space-y-2 overflow-x-auto output-scrollbar">
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
        </div>
      </div>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT") {
    return (
      <div className="w-full whitespace-pre-wrap break-words">
        <div className="border border-b-0 border-input py-3 px-1.5 rounded-t-md">
          <span className="px-2 py-1.5 border border-input font-medium rounded">
            Grep File
          </span>
        </div>

        <div className="border border-input p-3 rounded-b-md bg-card space-y-2">
          <p>Target string: {result.result.target_string}</p>
          <p>Repo name: {result.result.repo_name}</p>
        </div>
      </div>
    );
  }

  if (result?.type === "GREP_FILE_CONTENT_RESULT") {
    return (
      <div className="w-full">
        <div className="w-full border border-input border-b-0 rounded-t-md py-3.5 px-2.5">
          <span className="border border-input rounded px-2 py-1">
            Grep File Result
          </span>
        </div>

        <div className="w-full border border-input rounded-b-md py-3.5 px-2.5 bg-card space-y-2 overflow-x-auto output-scrollbar">
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
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 whitespace-pre-wrap break-words">
      <p>{log.messages.join("\n")}</p>
    </div>
  );
};
