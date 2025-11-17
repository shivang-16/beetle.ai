"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  ExternalLink,
  Calendar,
  Plus,
  ArrowRightLeft,
} from "lucide-react";
import { _config } from "@/lib/_config";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { extractPath, parsePatchString } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/ui/markdown";
import { createGithubIssue } from "../_actions/github-actions";
import dynamic from "next/dynamic";

interface GithubIssue {
  _id: string;
  issueNumber: number;
  issueId: string;
  title: string;
  body: string;
  state: "open" | "closed" | "draft";
  githubUrl?: string;
  githubId?: string;
  labels: string[];
  assignees: string[];
  createdBy: string;
  github_repositoryId: string;
  githubCreatedAt?: string;
  githubUpdatedAt?: string;
  patch?: string; // Add patch field for issue patches
}

interface GithubPullRequest {
  _id: string;
  pullRequestNumber: number;
  pullRequestId: string;
  title: string;
  body: string;
  state: "open" | "closed" | "merged" | "draft";
  githubUrl?: string;
  githubId?: string;
  headBranch: string;
  baseBranch: string;
  issueId?: string;
  createdBy: string;
  github_repositoryId: string;
  githubCreatedAt?: string;
  githubUpdatedAt?: string;
  patch?: string; // Add patch field for PR patches
}

interface GithubIssueWithPR extends GithubIssue {
  pullRequests?: GithubPullRequest[]; // Change to array to match API response
}

interface GithubIssuesSliderProps {
  repoId: string;
  analysisId?: string;
}

const GithubIssuesSlider: React.FC<GithubIssuesSliderProps> = ({
  repoId,
  analysisId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issues, setIssues] = useState<GithubIssueWithPR[]>([]);
  const [loading, setLoading] = useState(false);
  const { getToken } = useAuth();

  // Helper function to limit words in text
  const limitWords = (text: string, maxWords: number = 35): string => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  // Helper function to extract fenced content
  const extractFencedContent = (
    input: string | undefined,
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

  const fetchGithubIssues = async () => {
    if (!repoId) return;

    setLoading(true);
    try {
      const token = await getToken();
      console.log(token, "here is token in slider");
      const params = new URLSearchParams({
        github_repositoryId: repoId,
        ...(analysisId && { analysisId }),
      });

      const response = await fetch(
        `${_config.API_BASE_URL}/api/github/issues?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          // cache: "force-cache",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch GitHub issues");
      }

      const data = await response.json();
      console.log(data, "here is data in slider");
      setIssues(data.data.issues || []);
    } catch (error) {
      console.error("Error fetching GitHub issues:", error);
      toast.error("Failed to fetch GitHub issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && issues.length === 0) {
      fetchGithubIssues();
    }
  }, [isOpen, repoId, analysisId]);

  const getStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "bg-green-500";
      case "closed":
        return "bg-purple-500";
      case "merged":
        return "bg-purple-600";
      case "draft":
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStateBadgeVariant = (state: string) => {
    switch (state) {
      case "open":
        return "default";
      case "closed":
        return "secondary";
      case "merged":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "outline";
    }
  };

  // Open Issue functionality
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [showIssueDialog, setShowIssueDialog] = useState(false);

  // Function to handle opening existing GitHub issues
  const handleOpenExistingIssue = (issue: GithubIssueWithPR) => {
    console.log(issue, "here is issue in slider");
    if (issue.githubUrl) {
      window.open(issue.githubUrl, "_blank");
      toast.success(`Opened issue #${issue.issueNumber}: ${issue.title}`);
    } else {
      handleOpenIssue(issue.title, issue.body, issue.issueId);
    }
  };

  const handleOpenIssue = async (
    title: string,
    body: string,
    issueId: string,
  ) => {
    if (!title || !body || !issueId) {
      // If no title/body provided, show a simple dialog or use defaults
      setShowIssueDialog(true);
      return;
    }

    setIsCreatingIssue(true);
    try {
      const result = await createGithubIssue({
        repoId,
        analysisId,
        title,
        body,
        labels: ["analysis", "manual"],
        segmentIssueId: issueId,
      });

      if (result.success && result.data) {
        console.log(result.data, "here is result.data in slider");
        if (result.data.html_url) {
          window.open(result.data.html_url, "_blank");
        }

        toast.success("GitHub issue created successfully!");

        // Refresh the issues list
        await fetchGithubIssues();

        // Open the created issue in a new tab
      } else {
        toast.error(result.error || "Failed to create GitHub issue");
      }
    } catch (error) {
      console.error("Error creating GitHub issue:", error);
      toast.error("Failed to create GitHub issue");
    } finally {
      setIsCreatingIssue(false);
      setShowIssueDialog(false);
    }
  };

  const renderPatchContent = (patch: any) => {
    const before = extractFencedContent(patch.before).code.split("\n");
    const after = extractFencedContent(patch.after).code.split("\n");
    const explanation = patch.explanation || "";
    const file = patch.file || "";

    return (
      <div className="w-full overflow-hidden">
        <div className="text-muted-foreground text-xs font-medium">
          Suggested change
        </div>

        <div className="bg-muted/20 my-2 rounded-md border">
          <div className="text-muted-foreground flex items-center gap-2 border-b px-2 py-2 text-xs">
            <span className="bg-background rounded-md border px-2 py-0.5">
              Read
            </span>
            <span className="truncate">{extractPath(file)}</span>
          </div>

          <div className="p-0.5">
            <pre className="overflow-y-auto font-mono text-xs leading-5">
              {before.map((line: string, idx: number) => (
                <div
                  key={`-b-${idx}`}
                  className="flex items-start gap-2 rounded-sm border-l-4 border-red-600/70 bg-red-500/10 px-3 py-0.5 text-red-600"
                >
                  <span className="select-none">-</span>
                  <span className="text-foreground/90 whitespace-pre-wrap">
                    {line || "\u00A0"}
                  </span>
                </div>
              ))}
              {after.map((line: string, idx: number) => (
                <div
                  key={`+a-${idx}`}
                  className="mt-0.5 flex items-start gap-2 rounded-sm border-l-4 border-emerald-600/70 bg-emerald-500/10 px-3 py-0.5 text-emerald-700 dark:text-emerald-400"
                >
                  <span className="select-none">+</span>
                  <span className="text-foreground/90 whitespace-pre-wrap">
                    {line || "\u00A0"}
                  </span>
                </div>
              ))}
            </pre>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pb-4">
          <Button size="sm">Commit suggestion</Button>
        </div>
        {explanation && (
          <div className="text-muted-foreground p-2 text-xs">{explanation}</div>
        )}
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="cursor-pointer">
          <GitBranch className="size-4" />
          <span className="sr-only lg:not-sr-only">GitHub Issues</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex max-w-sm flex-col sm:max-w-2xl"
      >
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            GitHub Issues & Pull Requests
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
            </div>
          ) : issues.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <GitBranch className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No GitHub issues found</p>
              <p className="text-sm">Issues will appear here when created</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {issues.map((issue) => (
                <AccordionItem
                  key={issue._id}
                  value={issue._id}
                  className="mb-2 rounded-2xl border-t-2 border-neutral-800 px-2"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex w-full items-start gap-3 text-left">
                      {/* State indicator */}
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${getStateColor(
                            issue.state,
                          )}`}
                        />
                      </div>

                      {/* Issue content */}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{issue.title}</div>

                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getStateBadgeVariant(issue.state)}
                              className="text-xs"
                            >
                              {issue.state}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              #{issue.issueNumber}
                            </span>
                            {issue.githubCreatedAt && (
                              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                <Calendar className="h-3 w-3" />
                                {new Date(
                                  issue.githubCreatedAt,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenExistingIssue(issue);
                            }}
                            className="bg-card flex cursor-pointer items-center justify-center gap-1 rounded-md border p-1 shadow-xs"
                          >
                            Open
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="">
                    <div className="space-y-4">
                      {/* Issue description */}
                      <div>
                        <div className="bg-muted/50 rounded-md text-sm">
                          <MarkdownRenderer
                            content={limitWords(
                              issue.body || "No description provided",
                            )}
                            isUserMessage={false}
                          />
                        </div>
                      </div>

                      {/* Issue Patch */}
                      {/* {issue.patch && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Issue Patch</h4>
                          {renderPatchContent(issue.patch)}
                        </div>
                      )} */}

                      {/* Labels */}
                      {issue.labels && issue.labels.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">Labels</h4>
                          <div className="flex flex-wrap gap-1">
                            {issue.labels.map((label, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Associated Pull Requests */}
                      {issue.pullRequests && issue.pullRequests.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium">
                            Associated Pull Requests
                          </h4>
                          <div className="space-y-3">
                            {issue.pullRequests.map((pr, idx) => (
                              <div key={idx} className="bg-muted/20">
                                <div className="mb-2 flex items-center gap-2">
                                  <div
                                    className={`h-2 w-2 rounded-full ${getStateColor(pr.state)}`}
                                  />
                                  <span className="text-sm font-medium">
                                    {pr.title}
                                  </span>
                                  <Badge
                                    variant={getStateBadgeVariant(pr.state)}
                                    className="text-xs"
                                  >
                                    {pr.state}
                                  </Badge>
                                </div>
                                <div className="text-muted-foreground mb-2 text-xs">
                                  #{pr.pullRequestNumber} • {pr.headBranch} →{" "}
                                  {pr.baseBranch}
                                </div>
                                {pr.body && (
                                  <div className="text-muted-foreground text-sm">
                                    <MarkdownRenderer
                                      content={limitWords(pr.body)}
                                      isUserMessage={false}
                                    />
                                  </div>
                                )}
                                {/* PR Patch */}
                                {pr.patch && (
                                  <div>
                                    {/* <h5 className="text-xs font-medium mb-1">Pull Request Patch</h5> */}
                                    {renderPatchContent(pr.patch)}
                                  </div>
                                )}
                                {/* PR GitHub Link */}
                                {pr.githubUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="mt-2 gap-2"
                                  >
                                    <a
                                      href={pr.githubUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                      View PR
                                    </a>
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GithubIssuesSlider;
