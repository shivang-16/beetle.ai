"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { getBranches } from "../_actions/getBranches";
import { logger } from "@/lib/logger";

interface BranchDropdownProps {
  repositoryId: string;
  teamId?: string;
  selectedBranch: string;
  onBranchChange: (branch: string) => void;
}

interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

const BranchDropdown: React.FC<BranchDropdownProps> = ({
  repositoryId,
  teamId,
  selectedBranch,
  onBranchChange,
}) => {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = async () => {
    if (branches.length > 0) return; // Don't fetch if already loaded

    setLoading(true);
    setError(null);

    try {
      const result = await getBranches(repositoryId, teamId);
      if (result.success && result.data) {
        setBranches(result.data);
      } else {
        setError(result.message || "Failed to fetch branches");
      }
    } catch (err) {
      setError("Failed to fetch branches");
      logger.error("Error fetching branches", {
        repositoryId,
        teamId,
        error: err instanceof Error ? err.message : err,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownToggle = () => {
    setOpen(!open);
    if (!open) {
      fetchBranches();
    }
  };

  const handleBranchSelect = (branchName: string) => {
    onBranchChange(branchName);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={handleDropdownToggle}
        disabled={loading}
      >
        <span>{selectedBranch}</span>
        <ChevronsUpDown />
      </Button>

      {open && (
        <div className="bg-popover absolute right-0 z-50 mt-2 max-h-64 w-48 overflow-y-auto rounded-md border shadow-md">
          {loading && (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              Loading branches...
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && branches.length === 0 && (
            <div className="text-muted-foreground px-3 py-2 text-sm">
              No branches found
            </div>
          )}

          {!loading &&
            !error &&
            branches.map((branch) => (
              <button
                key={branch.name}
                onClick={() => handleBranchSelect(branch.name)}
                className={`hover:bg-accent w-full px-3 py-2 text-left text-sm ${
                  selectedBranch === branch.name ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{branch.name}</span>
                  {branch.protected && (
                    <span className="text-muted-foreground text-xs">
                      protected
                    </span>
                  )}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default BranchDropdown;
