"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { LLMResponseSegment } from "@/types/types";
import {
  cn,
  extractPath,
  extractTitleAndDescription,
  parsePatchString,
  parseWarningString,
} from "@/lib/utils";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { _config } from "@/lib/_config";

const GithubIssueDialog = dynamic(() => import("./GithubIssueDialog"));

// Types for issue state management
interface IssueState {
  state: 'draft' | 'open' | 'closed';
  githubUrl?: string;
  githubId?: number;
  issueNumber?: number;
}

export function RenderLLMSegments({
  segments,
  repoId,
  analysisId,
}: {
  segments: LLMResponseSegment[];
  repoId: string;
  analysisId?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { getToken } = useAuth();

  // State management for GitHub issues
  const [issueStates, setIssueStates] = useState<Record<string, IssueState>>({});
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [statesFetched, setStatesFetched] = useState(false);

  // Memoize GitHub issue segments and their issueIds
  const githubIssueSegments = useMemo(() => {
    return segments
      .map((seg, index) => ({ seg, index }))
      .filter(({ seg }) => seg.kind === "githubIssue");
  }, [segments]);

  const issueIds = useMemo(() => {
    return githubIssueSegments.map(({ seg, index }) => {
      const { issueId } = extractTitleAndDescription(seg.content);
      return issueId || `segment-${index}`;
    });
  }, [githubIssueSegments]);

  // Performance optimization: Only fetch states for a reasonable number of issues at once
  const prioritizedIssueIds = useMemo(() => {
    const MAX_INITIAL_FETCH = 20; // Fetch states for first 20 issues immediately
    return issueIds.slice(0, MAX_INITIAL_FETCH);
  }, [issueIds]);

  // Batch fetch GitHub issue states with debouncing and chunking for large datasets
  const fetchIssueStates = useCallback(async () => {
    if (issueIds.length === 0 || statesFetched || isLoadingStates) {
      return;
    }

    try {
      setIsLoadingStates(true);
      const token = await getToken();
      if (!token) return;

      // Process in chunks to handle large numbers of issues
      const CHUNK_SIZE = 50; // Smaller than API limit for better performance
      const chunks = [];
      for (let i = 0; i < issueIds.length; i += CHUNK_SIZE) {
        chunks.push(issueIds.slice(i, i + CHUNK_SIZE));
      }

      // Process chunks sequentially to avoid overwhelming the API
      for (const chunk of chunks) {
        const response = await fetch(`${_config.API_BASE_URL}/api/github/issue-states`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            github_repositoryId: repoId,
            analysisId,
            issueIds: chunk,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.issueStates) {
            setIssueStates(prev => ({ ...prev, ...data.data.issueStates }));
          }
        }
        
        // Small delay between chunks to prevent API rate limiting
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      setStatesFetched(true);
    } catch (error) {
      console.error("Error fetching GitHub issue states:", error);
    } finally {
      setIsLoadingStates(false);
    }
  }, [issueIds, statesFetched, isLoadingStates, getToken, repoId, analysisId]);

  // Effect to fetch issue states when prioritizedIssueIds change
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (prioritizedIssueIds.length > 0) {
      // Debounce the fetch to avoid excessive API calls
      timeoutId = setTimeout(() => {
        fetchIssueStates();
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [prioritizedIssueIds, fetchIssueStates]);

  // Lazy load remaining issue states after initial render
  useEffect(() => {
    if (issueIds.length > 20 && statesFetched) {
      const remainingIds = issueIds.slice(20);
      const timeoutId = setTimeout(() => {
        // Fetch remaining states in background
        fetchIssueStates();
      }, 1000); // Delay to prioritize initial render

      return () => clearTimeout(timeoutId);
    }
  }, [issueIds, statesFetched, fetchIssueStates]);

  // Cleanup effect to prevent memory leaks with large datasets
  useEffect(() => {
    return () => {
      // Clear states when component unmounts to free memory
      setIssueStates({});
      setStatesFetched(false);
    };
  }, []);

  // Save GitHub issue to database during streaming
  const saveGithubIssueToDb = async (segment: LLMResponseSegment, segmentIndex: number) => {
    try {
      const token = await getToken();
      if (!token) return;

      const { title, description, issueId } = extractTitleAndDescription(segment.content);
      const finalIssueId = issueId || `segment-${segmentIndex}`;
      
      await fetch(`${_config.API_BASE_URL}/api/github/save-issue`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_repositoryId: repoId,
          analysisId,
          title: title || "Issue from Analysis",
          body: description || segment.content,
          labels: ["analysis", "automated"],
          segmentIssueId: finalIssueId,
        }),
      });

      // Update local state to reflect the saved issue
      setIssueStates(prev => ({
        ...prev,
        [finalIssueId]: {
          state: 'draft',
        }
      }));
    } catch (error) {
      console.error("Error saving GitHub issue to database:", error);
    }
  };

  // Save patch to database during streaming
  const savePatchToDb = async (segment: LLMResponseSegment, segmentIndex: number) => {
    try {
      const token = await getToken();
      if (!token) return;

      const patch = parsePatchString(segment.content);
      const before = extractFencedContent(patch.before).code;
      const after = extractFencedContent(patch.after).code;
      const patchId = patch.patchId || `patch-${segmentIndex}`;
      const issueId = patch.issueId || `segment-${segmentIndex}`;

      await fetch(`${_config.API_BASE_URL}/api/github/save-patch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_repositoryId: repoId,
          analysisId,
          patchId,
          title: `Patch for ${extractPath(patch.file || "")}`,
          body: patch.explanation || "Automated patch suggestion",
          filePath: patch.file || "",
          before,
          after,
          explanation: patch.explanation || "",
          segmentIssueId: issueId,
        }),
      });
    } catch (error) {
      console.error("Error saving patch to database:", error);
    }
  };

  const openGithubIssue = async (segment: LLMResponseSegment) => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Authentication token not available");
        return;
      }

      const { title, description, issueId } = extractTitleAndDescription(segment.content);
      const finalIssueId = issueId || `segment-${segments.indexOf(segment)}`;
      
      console.log("issueId ====> ", finalIssueId);
      const response = await fetch(`${_config.API_BASE_URL}/api/github/issue`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          github_repositoryId: repoId,
          analysisId,
          title: title || "Issue from Analysis",
          body: description || segment.content,
          labels: ["analysis", "automated"],
          segmentIssueId: finalIssueId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(data, "here is teh dat")
      
      if (data.success && data.data?.html_url) {
        toast.success("GitHub issue created successfully!");
        
        // Update local state to reflect the opened issue
        setIssueStates(prev => ({
          ...prev,
          [finalIssueId]: {
            state: 'open',
            githubUrl: data.data.html_url,
            githubId: data.data.id,
            issueNumber: data.data.number,
          }
        }));
        
        // Open the GitHub issue in a new tab
        window.open(data.data.html_url, "_blank");
      } else {
        throw new Error("Failed to create GitHub issue");
      }
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create GitHub issue");
    }
  };
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(
    new Set()
  );
  const [savedSegments, setSavedSegments] = useState<Set<number>>(new Set());

  const extractFencedContent = (
    input: string | undefined
  ): { code: string; lang?: string } => {
    const trimmed = (input || "").trim();
    const openMatch = trimmed.match(/^```(\w+)?\n/);
    if (openMatch) {
      const lang = openMatch[1] || undefined;
      const withoutOpen = trimmed.replace(/^```(\w+)?\n/, "");
      const withoutClose = withoutOpen.replace(/\n```$/, "");
      return { code: withoutClose, lang };
    }
    return { code: trimmed };
  };

  return segments.map((seg, i) => {
    if (seg.kind === "text") {
      return (
        <div
          key={i}
          className="w-full dark:text-neutral-200 text-neutral-800 text-sm leading-7 mb-2 whitespace-pre-wrap">
          <Markdown
            components={{
              code(props) {
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
      const currentIssueId = githubIssue.issueId || `segment-${i}`;
      const issueState = issueStates[currentIssueId];

      // Save to database during streaming (only once per segment)
      if (!savedSegments.has(i)) {
        saveGithubIssueToDb(seg, i);
        setSavedSegments(prev => new Set(prev).add(i));
      }

      // Determine button state and color
      const isOpen = issueState?.state === 'open';
      const isDraft = !issueState || issueState.state === 'draft';
      const isClosed = issueState?.state === 'closed';
      
      const stateColor = isOpen ? '#238636' : isClosed ? '#8b5cf6' : '#6b7280';
      const buttonText = isOpen ? 'View' : 'Open';
      const buttonAction = isOpen && issueState?.githubUrl 
        ? () => window.open(issueState.githubUrl, "_blank")
        : () => openGithubIssue(seg);

      return (
        <div
          key={i}
          className="w-full my-4 rounded-md border bg-card hover:bg-accent/40 transition-colors">
          <div className="flex items-center gap-3 p-4">
            {/* state dot */}
            <div 
              className="border rounded-full p-1 mt-1 h-4 w-4 flex items-center justify-center"
              style={{ borderColor: stateColor }}
            >
              <span
                aria-hidden
                className="inline-block h-1 w-1 rounded-full"
                style={{ backgroundColor: stateColor }}
              />
            </div>

            {/* main content */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <GithubIssueDialog
                title={githubIssue.title}
                description={githubIssue.description}
                trigger={
                  <Button
                    variant={"link"}
                    className="text-left font-bold text-md hover:underline text-black dark:text-white truncate justify-start p-0 cursor-pointer">
                    {githubIssue.title}
                  </Button>
                }
              />

              <div className="text-xs text-muted-foreground">
                <span className="font-medium">
                  {isOpen && issueState?.issueNumber ? `#${issueState.issueNumber}` : `#${i + 1}`}
                </span>
                <span className="mx-1">·</span>
                <span>
                  {isOpen ? 'Open on GitHub' : isClosed ? 'Closed' : 'Beetle suggested this issue'}
                </span>
                {isLoadingStates && !issueState && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="text-blue-500">Loading...</span>
                  </>
                )}
              </div>
            </div>

            {/* right meta */}
            <div>
              <Button 
                className="cursor-pointer" 
                onClick={buttonAction}
                disabled={isLoadingStates && !issueState}
                variant={isOpen ? "secondary" : "default"}
              >
                {buttonText}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (seg.kind === "patch") {
      const patch = parsePatchString(seg.content);
      const before = extractFencedContent(patch.before).code.split("\n");
      const after = extractFencedContent(patch.after).code.split("\n");
      const explanation = patch.explanation || "";
      const file = patch.file || "";

      // Save to database during streaming (only once per segment)
      if (!savedSegments.has(i)) {
        savePatchToDb(seg, i);
        setSavedSegments(prev => new Set(prev).add(i));
      }

      return (
        <div key={i} className="w-full my-5 overflow-hidden">
          <div className="pt-3 text-xs font-medium text-muted-foreground">
            Suggested change
          </div>

          <div className="my-2 rounded-md border bg-muted/20">
            <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
              <span className="rounded-md border bg-background px-2 py-0.5">
                Read
              </span>
              <span className="truncate">{extractPath(file)}</span>
            </div>

            <div className="p-0.5">
              <pre className="font-mono text-xs leading-5">
                {before.map((line, idx) => (
                  <div
                    key={`-b-${idx}`}
                    className="flex items-start gap-2 rounded-sm border-l-4 border-red-600/70 bg-red-500/10 px-3 py-0.5 text-red-600">
                    <span className="select-none">-</span>
                    <span className="whitespace-pre-wrap text-foreground/90">
                      {line || "\u00A0"}
                    </span>
                  </div>
                ))}
                {after.map((line, idx) => (
                  <div
                    key={`+a-${idx}`}
                    className="mt-0.5 flex items-start gap-2 rounded-sm border-l-4 border-emerald-600/70 bg-emerald-500/10 px-3 py-0.5 text-emerald-700 dark:text-emerald-400">
                    <span className="select-none">+</span>
                    <span className="whitespace-pre-wrap text-foreground/90">
                      {line || "\u00A0"}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
             {explanation && (
            <div className="m-2 px-3 text-foreground/90">
              {explanation}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pb-4">
            <Button variant="secondary" size="sm" disabled>
              Add suggestion to batch
            </Button>
            <Button size="sm" disabled>
              Commit suggestion
            </Button>
          </div>

       

        </div>
      );
    }

    if (seg.kind === "warning") {
      const warning = parseWarningString(seg.content);
      const isExpanded = expandedWarnings.has(i);

      const toggleWarning = () => {
        const newExpanded = new Set(expandedWarnings);
        if (isExpanded) {
          newExpanded.delete(i);
        } else {
          newExpanded.add(i);
        }
        setExpandedWarnings(newExpanded);
      };

      return (
        <div key={i} className="w-full my-4 rounded-md border bg-card">
          <button
            onClick={toggleWarning}
            className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/40 transition-colors cursor-pointer">
            {/* Warning triangle icon */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Warning content */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground">
                Warning in {extractPath(warning.file || "")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Line {warning.line} • {warning.type}
              </div>
            </div>

            {/* Arrow icon */}
            <div className="flex-shrink-0">
              <svg
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform",
                  isExpanded ? "rotate-180" : "rotate-0"
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {/* Expanded content */}
          {isExpanded && (
            <div className="border-t bg-muted/20">
              <div className="p-4 space-y-4">
                {/* Warning description */}
                {warning.warning && (
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                      Warning
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {warning.warning}
                    </div>
                  </div>
                )}

                {/* Current Code */}
                {warning.currentCode && (
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                      Current Code
                    </div>
                    <Markdown
                      components={{
                        code(props) {
                          const { children, className, ...rest } = props;
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <SyntaxHighlighter
                              PreTag="div"
                              language={match[1]}
                              style={
                                resolvedTheme === "dark" ? vscDarkPlus : vs
                              }
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
                )}

                {/* Suggested Fix */}
                {warning.exampleFix && (
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                      Suggested Fix
                    </div>
                    <Markdown
                      components={{
                        code(props) {
                          const { children, className, ...rest } = props;
                          const match = /language-(\w+)/.exec(className || "");
                          return match ? (
                            <SyntaxHighlighter
                              PreTag="div"
                              language={match[1]}
                              style={
                                resolvedTheme === "dark" ? vscDarkPlus : vs
                              }
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
                )}

                {/* Why this matters */}
                {warning.whyThisMatters && (
                  <div>
                    <div className="text-sm font-medium text-foreground mb-2">
                      Why this Matters?
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {warning.whyThisMatters}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (seg.kind === "file_status") {
      const file_status = seg.content.split("\n");

      return (
        <Card
          key={i}
          className="mt-3 mb-5 w-max dark:text-neutral-200 text-neutral-800 text-sm leading-7">
          <CardContent className="flex flex-col items-start gap-y-1.5 pb-0 py-3.5 px-2.5">
            {file_status && file_status.length > 0
              ? file_status.map((item, i) => <span key={i}>{item}</span>)
              : null}
          </CardContent>
        </Card>
      );
    }
    return null;
  });
}
