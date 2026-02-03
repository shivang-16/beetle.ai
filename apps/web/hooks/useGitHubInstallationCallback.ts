"use client";

import { useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { linkGitHubInstallationAction } from "@/_actions/integrations";

/**
 * Hook to handle GitHub installation callback
 * Checks URL params for installation_id and links it to the current user
 */
export function useGitHubInstallationCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const linkInstallation = useCallback(async (installationId: string) => {
    try {
      toast.loading("Linking GitHub installation...", { id: "github-install" });

      console.log("Linking GitHub installation...", installationId);
      const data = await linkGitHubInstallationAction(installationId);
      
      console.log("Response data:", data);

      if (data.success) {
        toast.success("GitHub connected successfully!", { id: "github-install" });
        
        // Clean up URL and refresh
        router.replace("/dashboard");
        
        // Refresh the page to show new repositories
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(data.message || "Failed to link GitHub installation", { id: "github-install" });
        router.replace("/dashboard");
      }
    } catch (error) {
      console.error("Error linking installation:", error);
      toast.error("Failed to link GitHub installation", { id: "github-install" });
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const installationId = searchParams.get("installation_id");
    const error = searchParams.get("error");

    // Handle errors from callback
    if (error) {
      if (error === "missing_installation_id") {
        toast.error("Installation ID missing from GitHub callback");
      } else if (error === "callback_failed") {
        toast.error("Failed to process GitHub installation");
      }
      // Clean up URL
      router.replace("/dashboard");
      return;
    }

    // If we have an installation_id, link it to the user
    if (installationId) {
      linkInstallation(installationId);
    }
  }, [searchParams, router, linkInstallation]);
}
