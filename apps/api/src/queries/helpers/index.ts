/**
 * PR Analysis Helpers
 * Centralized utilities for PR data processing and analysis
 * 
 * This module exports common helper functions used by both GitHub and Bitbucket PR processing
 */

// Bot Detection
export {
  isPrAuthorBot,
  isBotCommit,
  areAllCommitsFromBots
} from './botDetection.js';

// Skipped Analysis
export {
  createSkippedAnalysis,
  type SkippedAnalysisParams
} from './skippedAnalysis.js';

// Subscription Checking
export {
  getUserSubscriptionPlan,
  buildSubscriptionObject,
  checkDailyPrAnalysisLimit,
  type SubscriptionCheckResult
} from './subscriptionCheck.js';

// Commit Analysis
export {
  getNewCommitsSinceLastReview,
  filterAnalyzableCommits,
  generatePrKey,
  getLatestCommitSha
} from './commitAnalysis.js';

// File Analysis
export {
  IGNORED_FILE_EXTENSIONS,
  isFileAnalyzable,
  filterAnalyzableFiles,
  getAnalyzableFilenames,
  getIgnoredFilenames
} from './fileAnalysis.js';

// Skip Criteria
export {
  MAX_FILES_FOR_ANALYSIS,
  SkipReason,
  shouldSkipBotAuthor,
  shouldSkipNoNewCommits,
  shouldSkipAllBotCommits,
  shouldSkipNoAnalyzableFiles,
  shouldSkipTooManyFiles,
  buildDailyLimitSkipReason,
  buildTooManyFilesSkipReason
} from './skipCriteria.js';
