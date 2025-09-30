"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, ExternalLink, Loader2 } from "lucide-react";
import { getRepository } from "@/app/(root)/analysis/_actions/getRepository";
import { addRepositoriesToTeam } from "../_actions/add-repositories-to-team";
import { toast } from "sonner";
import { GithubRepository } from "@/types/types";

interface AddRepositoriesModalProps {
  teamSlug: string;
}

export function AddRepositoriesModal({ teamSlug }: AddRepositoriesModalProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Fetch repositories when modal opens or search query changes
  useEffect(() => {
    if (open) {
      fetchRepositories();
    }
  }, [open, searchQuery]);

  const fetchRepositories = async () => {
    setLoading(true);
    try {
      const result = await getRepository(searchQuery, "user");
      setRepositories(result.data || []);
    } catch (error) {
      console.error("Failed to fetch repositories:", error);
      toast.error("Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const handleRepoToggle = (repoId: number) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repoId)) {
      newSelected.delete(repoId);
    } else {
      newSelected.add(repoId);
    }
    setSelectedRepos(newSelected);
  };

  const handleAddRepositories = async () => {
    if (selectedRepos.size === 0) {
      toast.error("Please select at least one repository");
      return;
    }

    setAdding(true);
    try {
      const repoIds = Array.from(selectedRepos);
      const result = await addRepositoriesToTeam(repoIds);
      
      if (result.success) {
        toast.success(`Successfully added ${result.data?.modifiedCount || selectedRepos.size} repositories to team`);
        setSelectedRepos(new Set());
        setOpen(false);
        // Refresh the page to show updated repositories
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to add repositories");
      }
    } catch (error) {
      console.error("Failed to add repositories:", error);
      toast.error("Failed to add repositories to team");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer text-xs">
          <Plus />
          <span>Add Repositories</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Add Repositories to Team</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="ml-auto"
          >
            <a
              href="https://github.com/apps/beetles-ai/installations/select_target"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Add from GitHub
            </a>
          </Button>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Repository List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading repositories...</span>
              </div>
            ) : repositories.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-gray-500">
                {searchQuery ? "No repositories found" : "No repositories available"}
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {repositories.map((repo) => (
                  <div
                    key={repo.repositoryId}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-neutral-800"
                  >
                    <Checkbox
                      checked={selectedRepos.has(repo.repositoryId)}
                      onCheckedChange={() => handleRepoToggle(repo.repositoryId)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{repo.fullName}</div>
                      {/* {repo.description && (
                        <div className="text-sm text-gray-500">{repo.description}</div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {repo.language}
                          </span>
                        )}
                        {repo.stargazersCount > 0 && (
                          <span>⭐ {repo.stargazersCount}</span>
                        )}
                        {repo.private && (
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">Private</span>
                        )}
                      </div> */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedRepos.size} repositories selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddRepositories}
                disabled={selectedRepos.size === 0 || adding}
              >
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  `Add ${selectedRepos.size} Repositories`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}