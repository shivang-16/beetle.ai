/**
 * PR Analysis Skip Criteria Helpers
 * Common utilities for determining when to skip PR analysis
 */

/**
 * Maximum number of files allowed in a PR for analysis
 */
export const MAX_FILES_FOR_ANALYSIS = 100;

/**
 * Skip reasons enum for consistent messaging
 */
export enum SkipReason {
  BOT_AUTHOR = 'PR author is a bot',
  ALL_BOT_COMMITS = 'All new commits are bot-authored/co-authored',
  DAILY_LIMIT_REACHED = 'Daily PR analysis limit reached',
  NO_NEW_COMMITS = 'No new commits detected since last review',
  NO_ANALYZABLE_FILES = 'No analyzable files changed in PR',
  TOO_MANY_FILES = 'PR has too many files changed',
}

/**
 * Check if PR should be skipped due to bot author
 */
export const shouldSkipBotAuthor = (
  authorLogin: string, 
  authorType: string, 
  skipBotCheck: boolean
): boolean => {
  if (skipBotCheck) return false;
  
  return (
    String(authorType).toLowerCase() === 'bot' ||
    /\[bot\]$/i.test(authorLogin) ||
    /^bot-/i.test(authorLogin) || 
    /-bot$/i.test(authorLogin)
  );
};

/**
 * Check if PR should be skipped due to no new commits
 */
export const shouldSkipNoNewCommits = (newCommits: any[]): boolean => {
  return newCommits.length === 0;
};

/**
 * Check if PR should be skipped due to all commits being from bots
 */
export const shouldSkipAllBotCommits = (
  commits: any[], 
  isBotCommitFn: (commit: any) => boolean,
  skipBotCheck: boolean
): boolean => {
  if (skipBotCheck) return false;
  return commits.every(isBotCommitFn);
};

/**
 * Check if PR should be skipped due to no analyzable files
 */
export const shouldSkipNoAnalyzableFiles = (analyzableFilesCount: number): boolean => {
  return analyzableFilesCount === 0;
};

/**
 * Check if PR should be skipped due to too many files
 */
export const shouldSkipTooManyFiles = (filesCount: number): boolean => {
  return filesCount > MAX_FILES_FOR_ANALYSIS;
};

/**
 * Build skip reason message for daily limit
 */
export const buildDailyLimitSkipReason = (
  planName: string,
  currentCount: number,
  maxAllowed: number
): string => {
  return `${SkipReason.DAILY_LIMIT_REACHED}. Plan: ${planName}, Current: ${currentCount}, Max: ${maxAllowed}`;
};

/**
 * Build skip reason message for too many files
 */
export const buildTooManyFilesSkipReason = (filesCount: number): string => {
  return `${SkipReason.TOO_MANY_FILES} (${filesCount} files, limit: ${MAX_FILES_FOR_ANALYSIS})`;
};
