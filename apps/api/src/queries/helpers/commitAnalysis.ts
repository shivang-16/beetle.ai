/**
 * Commit Analysis Helpers
 * Common utilities for analyzing commits and determining what to review
 */

/**
 * Determine new commits since last review
 * Returns commits that appear after the lastStoredSha in the commits array
 */
export const getNewCommitsSinceLastReview = (
  commits: any[], 
  lastStoredSha: string | undefined
): any[] => {
  if (!lastStoredSha) {
    return commits; // No previous review, all commits are new
  }

  const lastIndex = commits.findIndex((c: any) => c.sha === lastStoredSha);
  return lastIndex >= 0 ? commits.slice(lastIndex + 1) : commits;
};

/**
 * Filter commits to only include analyzable commits (non-merge commits)
 * Merge commits have multiple parents and are typically not analyzed
 */
export const filterAnalyzableCommits = (commits: any[]): any[] => {
  return commits.filter((commit: any) => {
    return !commit.parents || commit.parents.length <= 1;
  });
};

/**
 * Generate a unique PR key for deduplication
 * Format: "owner/repo#prNumber"
 */
export const generatePrKey = (repositoryFullName: string, prNumber: number): string => {
  return `${repositoryFullName}#${prNumber}`;
};

/**
 * Get the latest commit SHA from a list of commits
 */
export const getLatestCommitSha = (commits: any[], fallbackSha?: string): string => {
  return commits[commits.length - 1]?.sha || fallbackSha || '';
};
