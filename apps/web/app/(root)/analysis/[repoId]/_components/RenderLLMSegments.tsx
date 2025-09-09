"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { LLMResponseSegment } from "@/types/types";
import {
  cn,
  extractTitleAndDescription,
  parsePatchString,
  parseWarningString,
} from "@/lib/utils";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const GithubIssueDialog = dynamic(() => import("./GithubIssueDialog"));

export function RenderLLMSegments({
  segments,
}: {
  segments: LLMResponseSegment[];
}) {
  const { resolvedTheme } = useTheme();

  return segments.map((seg, i) => {
    if (seg.kind === "text") {
      return (
        <div key={i} className="w-full text-sm mb-2 whitespace-pre-wrap">
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
                  <code
                    {...rest}
                    className={cn("w-full whitespace-pre-wrap", className)}>
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
        <Card key={i} className="my-5 w-full">
          <CardHeader>
            <div className="font-semibold text-sm text-muted-foreground mb-5">
              📌{" "}
              <span className="underline underline-offset-2">
                Suggested GitHub Issue
              </span>
            </div>
            <CardTitle>{githubIssue.title}</CardTitle>
          </CardHeader>

          <CardContent className="mt-3 pb-0 text-muted-foreground text-sm">
            <Markdown>{`${githubIssue.description.substring(0, 500)}...`}</Markdown>
          </CardContent>

          <CardFooter className="justify-end-safe pt-2.5">
            <GithubIssueDialog
              title={githubIssue.title}
              description={githubIssue.description}
            />
          </CardFooter>
        </Card>
      );
    }

    if (seg.kind === "patch") {
      const patch = parsePatchString(seg.content);

      return (
        <Card key={i} className="w-full my-5">
          <CardHeader>
            <div className="font-semibold text-sm mb-5">
              💻{" "}
              <span className="underline underline-offset-2">
                Patch Suggestion
              </span>
            </div>
            <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
              <span className="border rounded-md px-3 py-1">Read</span>{" "}
              {patch.file}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <span>Issue</span>

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
                        showLineNumbers
                        startingLineNumber={Number(
                          patch.line_range?.split("-")[0]
                        )}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}>
                {patch.before}
              </Markdown>
            </div>

            <div>
              <span>Fix</span>

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
                        style={resolvedTheme === "dark" ? vscDarkPlus : vs}
                        customStyle={{
                          backgroundColor:
                            resolvedTheme === "dark"
                              ? "rgba(123, 241, 168,0.2)"
                              : "rgba(123, 241, 168,0.2)",
                          borderRadius: 4,
                          padding: 16,
                          fontSize: 14,
                        }}
                        showLineNumbers
                        startingLineNumber={Number(
                          patch.line_range?.split("-")[0]
                        )}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}>
                {patch.after}
              </Markdown>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (seg.kind === "warning") {
      const warning = parseWarningString(seg.content);

      return (
        <Card key={i} className="w-full my-5">
          <CardHeader>
            <div className="font-semibold text-sm mb-5">
              ⚠️ <span className="underline underline-offset-2">Warning</span>
            </div>
            <CardTitle className="flex items-center gap-1.5 text-muted-foreground">
              <span className="border rounded-md px-3 py-1">Read</span>{" "}
              {warning.file}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            <div>
              <span>Current Code</span>
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
                        showLineNumbers
                        startingLineNumber={Number(warning.line)}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}>
                {warning.currentCode}
              </Markdown>
            </div>

            <div>
              <span>Suggested Fix</span>

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
                        style={resolvedTheme === "dark" ? vscDarkPlus : vs}
                        customStyle={{
                          backgroundColor:
                            resolvedTheme === "dark"
                              ? "rgba(123, 241, 168,0.2)"
                              : "rgba(123, 241, 168,0.2)",
                          borderRadius: 4,
                          padding: 16,
                          fontSize: 14,
                        }}
                        showLineNumbers
                        startingLineNumber={Number(warning.line)}>
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code {...rest} className={className}>
                        {children}
                      </code>
                    );
                  },
                }}>
                {warning.exampleFix}
              </Markdown>
            </div>
          </CardContent>

          <CardFooter className="flex-col items-start gap-1.5">
            <div className="text-muted-foreground text-base font-medium">
              Why this Matters?
            </div>
            <p className="text-muted-foreground text-sm font-normal">
              {warning.whyThisMatters}
            </p>
          </CardFooter>
        </Card>
      );
    }

    if (seg.kind === "file_status") {
      return (
        <Card key={i} className="mt-3 mb-5">
          <CardContent className="pt-6">{seg.content}</CardContent>
        </Card>
      );
    }
    return null;
  });
}
