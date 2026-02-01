/**
 * Bot Detection Helpers
 * Common utilities for detecting bot authors and bot commits in PRs
 */

/**
 * Check if a PR author is a bot based on login and type
 */
export const isPrAuthorBot = (authorLogin: string, authorType: string): boolean => {
  return (
    String(authorType).toLowerCase() === 'bot' ||
    /\[bot\]$/i.test(authorLogin) ||
    /^bot-/i.test(authorLogin) || 
    /-bot$/i.test(authorLogin)
  );
};

/**
 * Check if a commit is authored or co-authored by a bot
 */
export const isBotCommit = (commit: any): boolean => {
  const authorLogin = commit?.author?.login || '';
  const committerLogin = commit?.committer?.login || '';
  const message = commit?.message || '';

  // Check if author or committer is a bot
  const isAuthorBot = /\[bot\]$/i.test(authorLogin) || /^bot-/i.test(authorLogin) || /-bot$/i.test(authorLogin);
  const isCommitterBot = /\[bot\]$/i.test(committerLogin) || /^bot-/i.test(committerLogin) || /-bot$/i.test(committerLogin);

  // Check for Co-authored-by trailer in commit message (Beetle suggestions)
  const hasBotCoAuthor = /Co-authored-by:.*\[bot\]/i.test(message) || 
                         /Co-authored-by:.*beetle/i.test(message);

  return isAuthorBot || isCommitterBot || hasBotCoAuthor;
};

/**
 * Check if all commits in an array are bot commits
 */
export const areAllCommitsFromBots = (commits: any[]): boolean => {
  return commits.every((commit: any) => isBotCommit(commit));
};
