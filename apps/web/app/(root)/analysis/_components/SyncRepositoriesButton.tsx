"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon, CheckIcon, AlertCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { syncRepositories, SyncRepositoriesResult } from "../_actions/syncRepositories";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SyncRepositoriesButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<"success" | "error" | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsLoading(true);
    setLastSyncStatus(null);

    try {
      const result: SyncRepositoriesResult = await syncRepositories();
      
      if (result.success) {
        setLastSyncStatus("success");
        toast.success(result.message);
        
        // Show additional details if available
        if (result.details && result.details.totalInstallations > 0) {
          const { updated, created, totalRepositories, totalInstallations } = result.details;
          
          if (updated > 0 || created > 0) {
            toast.success(`Synced ${totalRepositories} repositories across ${totalInstallations} installation(s). Updated: ${updated}, Created: ${created}`);
          }
        }
        
        router.refresh();
      } else {
        setLastSyncStatus("error");
        toast.error(result.message);
        
        // Show specific errors if available
        if (result.details && result.details.errors.length > 0) {
          const errorCount = result.details.errors.length;
          if (errorCount <= 3) {
            // Show individual errors for small numbers
            result.details.errors.forEach(error => {
              toast.error(error, { duration: 5000 });
            });
          } else {
            // Show summary for many errors
            toast.error(`${errorCount} sync errors occurred. Check console for details.`);
            console.error("Sync errors:", result.details.errors);
          }
        }
      }
    } catch (error) {
      setLastSyncStatus("error");
      const errorMessage = error instanceof Error ? error.message : "Failed to sync repositories";
      toast.error(errorMessage);
      console.error("Sync error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={isLoading} variant="outline" size="sm">
      {isLoading ? (
        <RefreshCwIcon className="animate-spin" />
      ) : lastSyncStatus === "success" ? (
        <CheckIcon className="text-green-600" />
      ) : lastSyncStatus === "error" ? (
        <AlertCircleIcon className="text-red-600" />
      ) : (
        <RefreshCwIcon />
      )}
      <span className={cn("ml-1", isLoading && "opacity-50")}>
        {isLoading ? "Syncing..." : "Sync Repositories"}
      </span>
    </Button>
  );
};

export default SyncRepositoriesButton;
