"use client";

import React, { useState } from "react";
import { GithubRepository } from "@/types/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BranchDropdown from "./BranchDropdown";
import { logger } from "@/lib/logger";
import { Settings } from "lucide-react";
import { IconBrandGithub, IconBrandBitbucket } from "@tabler/icons-react";

interface RepositoryItemProps {
  repo: GithubRepository;
  teamId?: string;
}

const RepositoryItem: React.FC<RepositoryItemProps> = ({ repo, teamId }) => {
  const [selectedBranch, setSelectedBranch] = useState(
    repo.defaultBranch || "main",
  );
  const [isHovered, setIsHovered] = useState(false);

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    // Here you could also update the URL or trigger other actions
    logger.debug("Branch changed", {
      branch,
      repoFullName: repo.fullName,
      repoId: repo._id,
    });
  };

  return (
    <div
      className="group flex items-center justify-between gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/analysis/${encodeURIComponent(repo._id)}${teamId ? `?teamId=${teamId}` : ""}${selectedBranch !== "main" ? `${teamId ? "&" : "?"}branch=${selectedBranch}` : ""}`}
        className="flex items-center gap-3"
      >
        {repo.source === 'bitbucket' ? (
          <IconBrandBitbucket className="size-4 shrink-0 " />
        ) : (
          <IconBrandGithub className="size-4 shrink-0" />
        )}
        <div className="text-sm whitespace-pre-wrap md:text-base">
          {repo.fullName}
        </div>
        <Badge
          variant={"outline"}
          className="text-muted-foreground rounded-full"
        >
          {repo.private ? "Private" : "Public"}
        </Badge>
      </Link>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={`transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <Link
            href={`/repo/${encodeURIComponent(repo._id)}/settings${teamId ? `?teamId=${teamId}` : ""}`}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        <BranchDropdown
          repositoryId={repo._id}
          teamId={teamId}
          selectedBranch={selectedBranch}
          onBranchChange={handleBranchChange}
        />
      </div>
    </div>
  );
};

export default RepositoryItem;
