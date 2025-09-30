"use client";

import React, { useState } from "react";
import { GithubRepository } from "@/types/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BranchDropdown from "./BranchDropdown";
import { logger } from "@/lib/logger";
import { Settings } from "lucide-react";

interface RepositoryItemProps {
  repo: GithubRepository;
  teamId?: string;
}

const RepositoryItem: React.FC<RepositoryItemProps> = ({ repo, teamId }) => {
  const [selectedBranch, setSelectedBranch] = useState(repo.defaultBranch || 'main');
  const [isHovered, setIsHovered] = useState(false);

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    // Here you could also update the URL or trigger other actions
    logger.debug("Branch changed", { 
      branch, 
      repoFullName: repo.fullName,
      repoId: repo._id 
    });
  };

  return (
    <div 
      className="flex items-center justify-between gap-3 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link 
        href={`/analysis/${encodeURIComponent(repo._id)}${teamId ? `?teamId=${teamId}` : ''}${selectedBranch !== 'main' ? `${teamId ? '&' : '?'}branch=${selectedBranch}` : ''}`} 
        className="flex items-center gap-3 flex-1"
      >
        <span>{repo.fullName}</span>
        <Badge
          variant={"outline"}
          className="border-primary text-primary text-sm rounded-full">
          {repo.private ? "Private" : "Public"}
        </Badge>
      </Link>
      <div className="flex items-center gap-2">
           <Link href={`/repo/${encodeURIComponent(repo._id)}/settings${teamId ? `?teamId=${teamId}` : ''}`}>
          <Button
            variant="ghost"
            size="sm"
            className={`transition-opacity duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
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