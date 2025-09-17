"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { getBranches } from "../_actions/getBranches";

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
      console.error("Error fetching branches:", err);
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
        className="h-8 px-3 text-xs"
        onClick={handleDropdownToggle}
        disabled={loading}
      >
        <span className="mr-2">{selectedBranch}</span>
        <ChevronsUpDown className="size-3" />
      </Button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-64 overflow-y-auto bg-popover border rounded-md shadow-md z-50">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Loading branches...
            </div>
          )}
          
          {error && (
            <div className="px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}
          
          {!loading && !error && branches.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No branches found
            </div>
          )}
          
          {!loading && !error && branches.map((branch) => (
            <button
              key={branch.name}
              onClick={() => handleBranchSelect(branch.name)}
              className={`w-full text-left px-3 py-2 hover:bg-accent text-sm ${
                selectedBranch === branch.name ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{branch.name}</span>
                {branch.protected && (
                  <span className="text-xs text-muted-foreground">protected</span>
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