"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { logger } from "@/lib/logger";
import { getPrAnalyses } from "../../analysis/_actions/getPrAnalyses";
import { CircleCheck, CircleX, Ellipsis, ExternalLink, GitPullRequestIcon, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { statusClasses } from "@/lib/utils/statusClasses";
import { formatDistanceToNow } from "date-fns";
import { IconBrandGithub } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { useAuth } from "@clerk/nextjs";
import { _config } from "@/lib/_config";
import ConnectGithubCard from "../../_components/connect-github-card";

type RepoScope = "user" | "team";

const PrAnalysisList = ({ scope = "user" }: { scope?: RepoScope }) => {
  const [items, setItems] = useState<Array<{
    repoUrl: string;
    model: string;
    status: string;
    pr_number?: number;
    pr_url?: string;
    pr_title?: string;
    createdAt?: string;
  }>>([]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [query, setQuery] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installationsLoading, setInstallationsLoading] = useState(true);
  const [hasInstallations, setHasInstallations] = useState<boolean | null>(null);
  const { getToken } = useAuth();
  const isTeamContext = scope === "team";

  const debouncedSetQuery = useDebouncedCallback((val: string) => {
    setPage(1); // Reset to first page on new search
    setQuery(val);
  }, 400);

  // First, check if the user has any GitHub installations (skip on team pages)
  useEffect(() => {
    let cancelled = false;
    const checkInstallations = async () => {
      try {
        // In team context, we do NOT show ConnectGithubCard.
        // Skip installation check and allow list to load.
        if (isTeamContext) {
          if (!cancelled) {
            setHasInstallations(true);
            setInstallationsLoading(false);
          }
          return;
        }
        if (!_config.API_BASE_URL) {
          if (!cancelled) {
            setHasInstallations(false);
            setInstallationsLoading(false);
          }
          return;
        }
        const token = await getToken();
        const res = await fetch(`${_config.API_BASE_URL}/api/user/installations`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        const data = await res.json();
        const arr = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled) {
          setHasInstallations(arr.length > 0);
          setInstallationsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setHasInstallations(false);
          setInstallationsLoading(false);
        }
      }
    };
    checkInstallations();
    return () => {
      cancelled = true;
    };
  }, [getToken, isTeamContext]);

  // Fetch PR analyses only if installations exist (or when in team context)
  useEffect(() => {
    const fetchData = async () => {
      if (installationsLoading || hasInstallations !== true) return;
      try {
        setLoading(true);
        setError(null);
        const res = await getPrAnalyses({ page, limit, query });
        setItems(res?.data || []);
        const p = res?.pagination;
        setTotalPages(p?.totalPages || 1);
        setTotal(p?.total || (res?.data ? res.data.length : 0));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        logger.error("Failed to fetch PR analyses in PrAnalysisList", {
          error: msg,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, limit, query, installationsLoading, hasInstallations]);

  const repoName = (url?: string) => {
    if (!url) return "";
    try {
      const parts = url.replace("https://github.com/", "").split("/");
      return parts.slice(0, 2).join("/");
    } catch (_) {
      return url;
    }
  };

  // statusClasses imported from shared utility

  return (
    <div className="w-full">
      {/* Search bar */}
      <div className="flex items-center justify-between m-2">
        <div className="flex items-center gap-2 max-w-sm w-full border shadow-xs rounded-md pl-3">
          <Search className="size-5" />
          <Input
            placeholder="Search PRs, title, repo, number"
            className="border-none shadow-none"
            onChange={(e) => debouncedSetQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 px-3 py-2 text-xs text-muted-foreground">
        <div className="col-span-1">#</div>
        <div className="col-span-4">Title</div>
        <div className="col-span-3">Repository</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Last Updated</div>
      </div>
      <Separator />

      {/* Rows */}
      {installationsLoading ? (
        <div className="min-h-[70vh] grid place-items-center text-sm text-neutral-500">Checking GitHub installation…</div>
      ) : (!isTeamContext && hasInstallations === false) ? (
        <div className="mt-2 min-h-[68vh]">
          <ConnectGithubCard />
        </div>
      ) : (
        <ul className="min-h-[70vh]">
          {loading ? (
            <div className="min-h-[70vh] grid place-items-center text-sm text-neutral-500">
              Loading...
            </div>
          ) : items && items.length > 0 ? (
            items.map((item, idx) => {
            // Compute descending global index across the full dataset
            const globalIndex = Math.max(total - (page - 1) * limit - idx, 1);
            // Prepare title with PR number prefix
            const rawTitle = item?.pr_title
              ? item.pr_title.length > 30
                ? `${item.pr_title.slice(0, 30)}...`
                : item.pr_title
              : "Untitled Pull Request";
            const prPrefix = item?.pr_number ? `#${item.pr_number} ` : "";
            const displayTitle = `${prPrefix}${rawTitle}`;
            return (
            <React.Fragment key={`${item.repoUrl}-${item.pr_number}-${idx}`}>
              <li className="py-4">
                <div className="grid grid-cols-12 items-center">
                  {/* Show descending index in the # column */}
                  <div className="col-span-1 text-sm text-muted-foreground">{globalIndex}</div>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <GitPullRequestIcon className="h-4 w-4 flex-shrink-0" />
                    <div className="truncate">
                      {item?.pr_url ? (
                        <a
                          href={item.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm truncate hover:underline"
                        >
                          {displayTitle}
                        </a>
                      ) : (
                        <span className="text-sm truncate">
                          {displayTitle}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 text-sm truncate flex items-center gap-2">
                    <IconBrandGithub className="h-4 w-4 flex-shrink-0" />
                    {item?.repoUrl ? (
                      <a
                        href={item.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline"
                      >
                        {repoName(item.repoUrl)}
                      </a>
                    ) : (
                      <span className="truncate">{repoName(item.repoUrl)}</span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className={`text-xs px-1.5 py-1 rounded-lg inline-block ${statusClasses(item.status)}`}>
                   
                      <span className="align-middle">{item.status}</span>
                        {item.status === "completed" && (
                        <CircleCheck className="h-3 w-3 inline-block ml-1" />
                      )}
                      {item.status === "error" && (
                        <CircleX className="h-3 w-3 inline-block ml-1" />
                      )}
                      {item.status === "running" && (
                        <Ellipsis className="h-3 w-3 inline-block ml-1 animate-pulse" />
                      )}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                      {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : "—"}
                    </div>
                    <a
                      href={item.pr_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </li>
              <Separator />
            </React.Fragment>
          );
            })
          ) : (
            <li className="min-h-[70vh] grid place-items-center text-base font-medium text-foreground">
              {error ? `Error: ${error}` : "No PR analyses found"}
            </li>
          )}
        </ul>
      )}

      {/* Pagination controls */}
      <div className="flex items-center justify-between py-2 px-3 text-xs border-t mt-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Items per page:</span>
          <select
            aria-label="Items per page"
            className="h-7 rounded-md bg-background border px-2"
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Previous page"
            className="h-7 w-7 grid place-items-center rounded-md border disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground">
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <button
            aria-label="Next page"
            className="h-7 w-7 grid place-items-center rounded-md border disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
            disabled={page >= (totalPages || 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrAnalysisList;
