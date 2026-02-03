"use client";

import { useGitHubInstallationCallback } from "@/hooks/useGitHubInstallationCallback";

/**
 * Client component wrapper for GitHub installation callback
 * This must be a separate component to avoid Next.js serialization errors
 */
export function GitHubInstallationHandler() {
  useGitHubInstallationCallback();
  return null;
}
