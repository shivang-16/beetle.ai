"use client";

import React, { useState } from "react";
import { GithubRepository } from "@/types/types";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import BranchDropdown from "./BranchDropdown";

interface RepositoryItemProps {
  repo: GithubRepository;
  teamId?: string;
}

const RepositoryItem: React.FC<RepositoryItemProps> = ({ repo, teamId }) => {
  const [selectedBranch, setSelectedBranch] = useState(repo.defaultBranch || 'main');

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    // Here you could also update the URL or trigger other actions
    console.log(`Branch changed to: ${branch} for repo: ${repo.fullName}`);
  };

  return (
    <div className="flex items-center justify-between gap-3">
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
      <BranchDropdown 
        repositoryId={repo._id} 
        teamId={teamId}
        selectedBranch={selectedBranch}
        onBranchChange={handleBranchChange}
      />
    </div>
  );
};

export default RepositoryItem;