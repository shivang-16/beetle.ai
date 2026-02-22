// apps/api/src/services/prCommentService.ts
import { getInstallationOctokit } from '../../lib/githubApp.js';
import { PRComment } from '../../utils/responseParser.js';
import { incrementAnalysisCommentCounter } from '../../utils/analysisStreamStore.js';
import { logger } from '../../utils/logger.js';

export interface PRCommentContext {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha?: string;
  filesChanged?: string[]; // optional list of filenames (and previous filenames) from PR
  // Optional analysis ID to persist total posted comments
  analysisId?: string;
  // Severity threshold for comment filtering: 0=all, 1=High+Critical, 2=Critical only
  severityThreshold?: number;
  // PR summary settings to control summary comment posting
  prSummarySettings?: { enabled: boolean };
}

export interface ParsedSuggestion {
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  suggestionCode?: string;
  originalComment: string;
  severity?: string;
  issueType?: string;
  confidence?: string;
}

export class PRCommentService {
  private context: PRCommentContext;
  private octokit: ReturnType<typeof getInstallationOctokit>;
  private postedComments: Set<string> = new Set();
  private filesInPR?: Set<string>;
  private statusCommentId?: number;
  private severityThreshold: number;
  private nonSummaryCommentsPosted: number = 0; // Track actual issue comments (not summary)
  private static STATUS_MARKER = '<!-- beetle:main-comment -->';

  // Severity level mapping - matches threshold values for simple comparison
  private static SEVERITY_LEVELS: Record<string, number> = {
    'medium': 0,
    'high': 1,
    'critical': 2,
  };

  constructor(context: PRCommentContext) {
    this.context = context;
    this.octokit = getInstallationOctokit(context.installationId);
    // Default to 1 if not specified - show High+Critical
    this.severityThreshold = context.severityThreshold ?? 1;
    if (Array.isArray(context.filesChanged) && context.filesChanged.length > 0) {
      // Normalize and store filenames for quick membership checks
      this.filesInPR = new Set(
        context.filesChanged
          .filter(Boolean)
          .map((p) => p.trim().replace(/^\.\//, ''))
      );
    }
  }

  /**
   * Check if a comment should be posted based on its severity and the threshold setting.
   * @param severity The severity string from the comment (Critical/High/Medium)
   * @returns true if should post, false if should skip
   */
  private shouldPostBySeverity(severity?: string): boolean {
    if (!severity) {
      // If no severity, treat as high (level 1) - post for threshold 0 (all) and 1 (high+), skip for 2 (critical only)
      return this.severityThreshold <= 1;
    }

    const normalizedSeverity = severity.toLowerCase().trim();
    const severityLevel = PRCommentService.SEVERITY_LEVELS[normalizedSeverity] ?? 1;

    // Simple comparison: post if severityLevel >= threshold
    // threshold 0 = post all (medium+), threshold 1 = high+, threshold 2 = critical only
    return severityLevel >= this.severityThreshold;
  }

  /**
   * Check if a given file path is part of the current PR changes
   * Includes support for renamed files via previous_filename
   */
  private async isFileInPR(filePath: string): Promise<boolean> {
    try {
      const normalizedPath = filePath.trim().replace(/^\.\//, '');

      // Prefer provided files list if available
      const isFileInPR = this.filesInPR?.has(normalizedPath) || false;
      
      // Additional debug: check if there's a partial match
      if (!isFileInPR && this.filesInPR) {
        const matchingFiles = Array.from(this.filesInPR).filter(f => f.includes(normalizedPath) || normalizedPath.includes(f));
        if (matchingFiles.length > 0) {
          logger.debug(`[PR-${this.context.pullNumber}] ⚠️ Found similar files:`, matchingFiles);
        }
      }
      
      return isFileInPR;
   
    } catch (e) {
      logger.error(`[PR-${this.context.pullNumber}] Failed to list PR files for validation:`, e);
      return false;
    }
  }

  /**
   * Comprehensive method to process comment content for GitHub posting
   * Handles both metadata removal and line number annotation cleaning
   */
  private processCommentForGitHub(content: string, suggestionCode?: string): string {
    // Step 1: Remove the header section with metadata (everything before "### Problem")
    const problemMatch = content.match(/(### Problem[\s\S]*)/);
    let processedContent = problemMatch ? problemMatch[1] : content;
    
    // Step 2: Remove any remaining metadata lines that might appear anywhere
    processedContent = processedContent.replace(/^(\*\*(File|Line_Start|Line_End|Severity|Confidence)\*\*:.*|##\s*\[.*?\]:.*)$/gm, '');
    
    // Step 3: Remove line number annotations from ALL code blocks (not just suggestion blocks)
    processedContent = processedContent.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/^\s*\d+\|\s*/gm, '');
    });
    
    // Insert spacing before & after File Changes table
// Add one blank line BEFORE the File Changes Summary heading
processedContent = processedContent.replace(
  /\s*\*\*File Changes Summary/,
  "\n\n**File Changes Summary"
);

// Add one blank line AFTER the entire table block
processedContent = processedContent.replace(
  /(\n\|.*?\|\s*\n(?:\|.*?\|\s*\n)+)(?=\S)/,
  (match) => match.trimEnd() + "\n\n"
);

// Ensure one blank line after table (after last row)
  processedContent = processedContent.replace(
    /\n*\s*\*\*Walkthrough\*\*:/,
    "\n\n**Walkthrough**:"
  );

    // Step 4: If we have suggestion code, clean it and replace the suggestion block content
    if (suggestionCode) {
      const cleanSuggestionCode = suggestionCode.replace(/^\s*\d+\|\s*/gm, '').trim();
      processedContent = processedContent.replace(
        /```suggestion\s*\n([\s\S]*?)\n```/,
        '```suggestion\n' + cleanSuggestionCode + '\n```'
      );
    }

    // Step 4.5: Clean up Mermaid blocks to ensure GitHub compatibility
    processedContent = processedContent.replace(/```mermaid\s*\n([\s\S]*?)\n```/g, (match, mermaidContent) => {
      let cleanMermaid = mermaidContent
        .replace(/^[ \t]*%%.*$/gm, '') // Remove full-line %% comments (safe)
        .replace(/`/g, '') // Remove stray backticks
        .replace(/\*\*/g, '') // Remove markdown bold asterisks (safe)
        .replace(/<br\s*\/?>/gi, ' ') // Replace HTML breaks with space
        .trim();
        
      return '```mermaid\n' + cleanMermaid + '\n```';
    });

    processedContent = processedContent.replace(
  /<details>[\s\S]*?<\/details>/g,
  (detailsBlock) => {
    // 1. Add exactly one blank line after <summary>...</summary>
    let block = detailsBlock.replace(
      /(<summary>[\s\S]*?<\/summary>)[ \t\r]*\n*/g,
      '$1\n\n'
    );

    const lines = block.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 2. Detect code fences ``` and enforce exactly one blank line before it
      if (line.trim().startsWith('```')) {
        // Walk backwards to find first non-empty line
        let j = out.length - 1;

        // Remove only EMPTY lines (not indentation lines)
        while (j >= 0 && out[j].trim() === '') {
          out.pop();
          j--;
        }

        // Add exactly ONE blank line before ```
        out.push('');
        out.push(line);
      } else {
        out.push(line);
      }
    }

    return out.join('\n');
  }
);

    
    // Step 5: Clean up any extra whitespace
    processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    // Step 6: Normalize Markdown tables only (disable mermaid/HTML/code-fence auto-fixes)
    // processedContent = this.fixMarkdownTables(processedContent);

    return processedContent;
  }



  /**
   * Parse PR comment format to extract suggestion data
   */
  private parseSuggestionComment(content: string): ParsedSuggestion | null {
    try {
      // Extract file path
      const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
      if (!fileMatch) return null;
      
      const filePath = fileMatch[1].trim();
      
      // Extract line numbers
      const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
      const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
      
      if (!lineStartMatch) return null;
      
      const lineStart = parseInt(lineStartMatch[1]);
      const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;
      
      // Extract suggestion code if present (raw - will be cleaned later by processCommentForGitHub)
      const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
      const suggestionCode = suggestionMatch ? suggestionMatch[1].trim() : undefined;
      
      const confidenceMatch = content.match(/\*\*Confidence\*\*:\s*(.+)/);
      const confidence = confidenceMatch ? confidenceMatch[1].trim() : undefined;
      
      // Extract severity (Critical/High/Medium)
      const severityMatch = content.match(/\*\*Severity\*\*:\s*(Critical|High|Medium)/i);
      const severity = severityMatch ? severityMatch[1].trim() : undefined;

      
      return {
        filePath,
        lineStart,
        lineEnd,
        suggestionCode,
        originalComment: content,
        confidence,
        severity,
      };
    } catch (error) {
      console.error('Error parsing suggestion comment:', error);
      return null;
    }
  }

  /**
   * Post a review comment with suggestion on the PR
   */
  async postReviewComment(suggestion: ParsedSuggestion): Promise<boolean> {
    try {
      if (!this.context.commitSha) {
        console.error(`[PR-${this.context.pullNumber}] ❌ No commit SHA provided for review comment`);
        return false;
      }

      // Validate that the path exists in the PR; otherwise the API returns 422
      const pathInPR = await this.isFileInPR(suggestion.filePath);
      if (!pathInPR) {
        console.warn(
          `[PR-${this.context.pullNumber}] ⚠️ File path not found in PR changes: ${suggestion.filePath}. Falling back to regular comment.`
        );
        return false;
      }

      // Process the comment comprehensively for GitHub posting
      let reviewBody = this.processCommentForGitHub(suggestion.originalComment, suggestion.suggestionCode);

      // Add line range information for multi-line suggestions
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        const lineRangeInfo = `\n\n*📍 This suggestion applies to lines ${suggestion.lineStart}-${suggestion.lineEnd}*`;
        reviewBody = reviewBody + lineRangeInfo;
      }

      if (suggestion.confidence) {
        const confidenceLine = `\n\n**Confidence**: ${suggestion.confidence}\n\n`;
        if (reviewBody.includes('<details>')) {
          reviewBody = reviewBody.replace('<details>', confidenceLine + '<details>');
        } else if (reviewBody.includes('```suggestion')) {
          reviewBody = reviewBody.replace('```suggestion', confidenceLine + '```suggestion');
        } else {
          reviewBody = reviewBody + confidenceLine;
        }
      }


      // Prepare the review comment parameters
      const reviewCommentParams: any = {
        owner: this.context.owner,
        repo: this.context.repo,
        pull_number: this.context.pullNumber,
        body: reviewBody,
        commit_id: this.context.commitSha,
        path: suggestion.filePath,
        side: 'RIGHT',
        line: suggestion.lineEnd || suggestion.lineStart
      };

      // If we have both lineStart and lineEnd, and they're different, use multi-line comment
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        reviewCommentParams.start_line = suggestion.lineStart;
        reviewCommentParams.start_side = 'RIGHT';
        logger.debug(`[PR-${this.context.pullNumber}] Creating multi-line comment from line ${suggestion.lineStart} to ${suggestion.lineEnd}`);
      } else {
        logger.debug(`[PR-${this.context.pullNumber}] Creating single-line comment at line ${suggestion.lineStart}`);
      }

      const response = await this.octokit.pulls.createReviewComment(reviewCommentParams);

      return true;
    } catch (error) {
      logger.error(`[PR-${this.context.pullNumber}] ❌ Failed to post review comment:`, error);
      // Fallback to regular comment if review comment fails
      return false;
    }
  }

  /**
   * Post a comment on the PR
   */
  async postComment(comment: PRComment): Promise<boolean> {
    try {
      // Create a hash of the comment content to avoid duplicates
      const commentHash = this.createCommentHash(comment.content);
      
      if (this.postedComments.has(commentHash)) {
        logger.debug(`[PR-${this.context.pullNumber}] Skipping duplicate comment`);
        return false;
      }

      // Summary comments: update the initial Beetle status comment instead of posting a new one
      const trimmed = comment.content.trim();
      if (trimmed.startsWith('## Summary by Beetle')) {
        // Check if PR summary is disabled in user settings
        if (this.context.prSummarySettings?.enabled === false) {
          logger.info(`[PR-${this.context.pullNumber}] ⏭️ Skipping summary comment - PR summary disabled in user settings`);
          return false;
        }
        
        const updated = await this.updateStatusCommentWithSummary(comment.content);
        if (updated) {
          this.postedComments.add(commentHash);
          return true;
        }
        logger.debug(`[PR-${this.context.pullNumber}] ❌ Failed to update status comment; not posting duplicate summary`);
        return false;
      }

      // Check if this is a suggestion comment
      const suggestion = this.parseSuggestionComment(comment.content);
      
      if (suggestion) {
        // Check severity threshold before posting
        if (!this.shouldPostBySeverity(suggestion.severity)) {
          logger.info(`[PR-${this.context.pullNumber}] ⏭️ Comment skipped - severity: ${suggestion.severity || 'unknown'}, threshold: ${this.severityThreshold} (0=all, 1=high+, 2=critical only), file: ${suggestion.filePath}, lines: ${suggestion.lineStart}-${suggestion.lineEnd || suggestion.lineStart}`);
          return false;
        }

        // Try to post as a review comment with suggestion
        const reviewSuccess = await this.postReviewComment(suggestion);
        
        if (reviewSuccess) {
          this.postedComments.add(commentHash);
          this.nonSummaryCommentsPosted++; // Track non-summary comments
          return true;
        }
        
        logger.error(`[PR-${this.context.pullNumber}] ❌ Review comment failed`);
        return false;
      }

      logger.error(`[PR-${this.context.pullNumber}] ❌ No valid suggestion found in comment; not posting regular comment`);
      return false;
    } catch (error) {
      logger.error(`[PR-${this.context.pullNumber}] ❌ Failed to post comment:`, error);
      return false;
    }
  }

  /**
   * Post multiple comments in sequence
   */
  async postComments(comments: PRComment[]): Promise<number> {
    let successCount = 0;
    
    for (const comment of comments) {
      const success = await this.postComment(comment);
      if (success) {
        successCount++;
        logger.info(`[PR-${this.context.pullNumber}] ✅ Posted comment: ${comment.content}`);
        // Add a small delay between comments to avoid rate limiting
        await this.delay(1000);
      }
    }
    // Persist the count to Redis for finalization if available
    try {
      if (successCount > 0 && this.context.analysisId) {
        await incrementAnalysisCommentCounter(this.context.analysisId, successCount);
      }
    } catch (err) {
      logger.warn(`[PR-${this.context.pullNumber}] ⚠️ Failed to increment Redis comment counter`, err);
    }
    
    return successCount;
  }



  /**
   * Post an analysis error comment
   */
  async postAnalysisErrorComment(error: string): Promise<boolean> {
    const comment: PRComment = {
      content: `❌ **Beetle Analysis Error**\n\nI encountered an error while analyzing this pull request:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease try again or contact support if the issue persists.`,
      timestamp: new Date().toISOString()
    };
    
    return this.postComment(comment);
  }

  private createCommentHash(content: string): string {
    // Simple hash function to detect duplicate comments
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the posted comments cache (useful for testing)
   */
  clearCache(): void {
    this.postedComments.clear();
  }

  /**
   * Get the count of non-summary comments posted (actual issue/suggestion comments)
   */
  getNonSummaryCommentsPosted(): number {
    return this.nonSummaryCommentsPosted;
  }

  /**
   * Attempt to normalize Markdown tables: ensure header separator, consistent column counts, and pipe boundaries.
   */
  private fixMarkdownTables(content: string): string {
    const lines = content.split('\n');
    let inCode = false;
    const result: string[] = [];
    let tableBuffer: string[] = [];

    const isFence = (l: string) => l.trim().startsWith('```');
    const isTableRow = (l: string) => {
      const s = l.trim();
      if (!s.includes('|')) return false;
      if (s.startsWith('<details>') || s.startsWith('</details>')) return false;
      return true;
    };
    const splitRow = (row: string) => {
      let r = row.trim();
      if (r.startsWith('|')) r = r.slice(1);
      if (r.endsWith('|')) r = r.slice(0, -1);
      return r.split('|');
    };
    const separatorForCols = (n: number) => '|' + new Array(n).fill(' --- ').join('|') + '|';
    const isSeparatorRow = (l: string) => {
      const s = l.trim();
      if (!s.includes('|')) return false;
      return s.replace(/[|:\-\s]/g, '').length === 0;
    };
    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      const header = tableBuffer[0];
      const colCount = Math.max(...tableBuffer.map((r) => splitRow(r).length));
      // Ensure we have a separator row
      if (tableBuffer.length < 2 || !isSeparatorRow(tableBuffer[1])) {
        tableBuffer.splice(1, 0, separatorForCols(colCount));
      } else {
        tableBuffer[1] = separatorForCols(colCount);
      }
      const fixed = tableBuffer.map((row, idx) => {
        if (idx === 1) return separatorForCols(colCount);
        const cells = splitRow(row).map((c) => c.trim());
        const padded = cells.slice(0, colCount);
        while (padded.length < colCount) padded.push('');
        return '| ' + padded.join(' | ') + ' |';
      });
      result.push(...fixed);
      tableBuffer = [];
    };

    for (const line of lines) {
      if (isFence(line)) {
        if (!inCode) flushTable();
        inCode = !inCode;
        result.push(line);
        continue;
      }
      if (inCode) {
        result.push(line);
        continue;
      }
      if (isTableRow(line)) {
        tableBuffer.push(line);
      } else {
        flushTable();
        result.push(line);
      }
    }
    flushTable();
    return result.join('\n');
  }

  /**
   * Generate the severity setting label based on threshold value
   */
  private getSeverityLabel(): string {
    switch (this.severityThreshold) {
      case 0: return 'Low — All comments including minor suggestions. May be noisy on large PRs.';
      case 1: return 'Medium — Balanced feedback — medium and high severity issues only.';
      case 2: return 'High — Critical issues only — may miss less severe but still valuable suggestions.';
      default: return 'Medium — Balanced feedback — medium and high severity issues only.';
    }
  }

  /**
   * Generate the common user guide and settings footer for PR comments
   */
  private generateUserGuideFooter(): string {
    const severityLabel = this.getSeverityLabel();
    return [
      '',
      '<details>',
      '<summary>⚙️ Settings</summary>',
      '',
      `**Severity Threshold**: \`${severityLabel}\` — [Change in Settings](https://beetleai.dev/settings)`,
      `**Custom Rules**: Define your own review rules — [Set Custom Rules](https://beetleai.dev/custom-context)`,
      `**PR Summary**: Configure PR summary — [Change in Settings](https://beetleai.dev/settings)`,
      '',
      '</details>',
      '',
      '<details>',
      '<summary>📖 User Guide</summary>',
      '',
      '- Once repos are connected, PR analysis is automatically enabled. You can disable analysis for this repo from [beetleai.dev/analysis](https://beetleai.dev/analysis)',
      '- Comment `@beetle` on any PR to start analysis manually',
      '- Comment `@beetle stop` to stop any ongoing analysis',
      '',
      '</details>',
    ].join('\n');
  }

  /**
   * Post a "no issues found" comment when analysis completes with only a summary and no other comments.
   */
  async postNoIssuesFoundComment(): Promise<boolean> {
    try {
      const footerContent = this.generateUserGuideFooter();
      
      // This is a SEPARATE comment from the status/summary comment
      const body = [
        '✅ You\'re good to merge this PR! **No issues found**. Great job!',
        '',
        '<details>',
        '<summary>Settings</summary>',
        '',
        footerContent,
        '',
        '</details>',
      ].join('\n');

      // Always create a new comment (don't update status comment)
      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body,
      });
      logger.debug(`[PR-${this.context.pullNumber}] ✅ Posted no issues found comment: ${response.data.html_url}`);
      return true;
    } catch (error) {
      logger.error(`[PR-${this.context.pullNumber}] ❌ Failed to post no issues found comment:`, error);
      return false;
    }
  }


  /**
   * Create a friendly, immediately visible status comment indicating analysis started.
   * Includes collapsible sections for commits and files.
   */
  async postAnalysisStartedComment(commits?: any[], files?: any[], ignoredFiles?: any[]): Promise<boolean> {
    try {
      // Always create a fresh status comment for each analysis run

      const commitItems = (commits || []).slice(0, 20).map((c: any) => {
        const shortSha = (c?.sha || '').slice(0, 7);
        const msg = (c?.message || '').split('\n')[0];
        const author = c?.author?.name || c?.author?.login || '';
        const url = c?.url || `https://github.com/${this.context.owner}/${this.context.repo}/commit/${c?.sha}`;
        return `- [\`${shortSha}\`](${url}) — ${msg}${author ? ` (${author})` : ''}`;
      }).join('\n');

      const fileItems = (files || []).slice(0, 30).map((f: any) => {
        const name = f?.filename || f;
        const status = f?.status ? ` — ${f.status}` : '';
        const stats = (f?.additions || f?.deletions) ? ` (+${f?.additions || 0}/−${f?.deletions || 0})` : '';
        return `- \`${name}\`${status}${stats}`;
      }).join('\n');

      const ignoredItems = (ignoredFiles || []).slice(0, 50).map((f: any) => {
        const name = f?.filename || f;
        return `- \`${name}\``;
      }).join('\n');

      const commitsCount = (commits || []).length;
      const filesCount = (files || []).length;
      const ignoredCount = (ignoredFiles || []).length;

      const body = [
        PRCommentService.STATUS_MARKER,
        `### Beetle is reviewing the changes — Let’s see what you’ve done!`,
        `🔍 Under Review`,
        `<details>\n<summary>Commits (${commitsCount})</summary>\n\n${commitItems || '- No commits found'}\n\n</details>`,
        '',
        `<details>\n<summary>Files Changed (${filesCount})</summary>\n\n${fileItems || '- No files found'}\n\n</details>`,
        '',
        ignoredCount > 0 ? `<details>\n<summary>Ignored Files (${ignoredCount})</summary>\n\n${ignoredItems}\n\n</details>` : '',
        '',
        '---',
        '',
        this.generateUserGuideFooter(),
        '',
        '---',
        `Follow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)`,
      ].join('\n');

      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body,
      });

      this.statusCommentId = response.data.id;
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post analysis started comment:`, error);
      return false;
    }
  }

  /**
   * Post a daily PR analysis limit reached status comment.
   * Keeps the same links section used in the main status comment.
   */

  /**
   * Post a comment when PR author is a bot and automatic review is skipped.
   * Informs user how to trigger a manual review.
   */
  /**
   * Post a generalized "review skipped" comment with a specified reason.
   * Can be used for: bot author, too many files, no changes, etc.
   * @param reason The reason why the review was skipped (e.g., "Bot user detected", "PR has more than 100 files")
   * @param showTriggerHint Whether to show the manual trigger hint (default: true)
   */
  async postSkippedComment(reason: string, showTriggerHint: boolean = true): Promise<boolean> {
    try {
      const bodyParts = [
        PRCommentService.STATUS_MARKER,
        '> [!IMPORTANT]',
        '> **Review skipped**',
        '>',
        `> ${reason}`,
      ];

      if (showTriggerHint) {
        bodyParts.push('>');
        bodyParts.push('> To trigger a single review, invoke the `@beetle` command.');
      }

      const footerContent = this.generateUserGuideFooter();

      bodyParts.push('');
      bodyParts.push(footerContent);
      bodyParts.push('');
      bodyParts.push('---');
      bodyParts.push(`Follow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)`);

      const body = bodyParts.join('\n');

      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body,
      });

      this.statusCommentId = response.data.id;
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post skipped comment:`, error);
      return false;
    }
  }

  /**
   * Post a comment when PR author is a bot and automatic review is skipped.
   * Convenience wrapper around postSkippedComment.
   */
  async postBotAuthorSkippedComment(): Promise<boolean> {
    return this.postSkippedComment('Bot user detected.');
  }

  /**
   * Post a comment when PR has too many files (>100) and review is skipped.
   */
  async postTooManyFilesSkippedComment(fileCount: number): Promise<boolean> {
    return this.postSkippedComment(`This PR has more than 100 files changed, which exceeds our limit for automatic review.`);
  }

  /**
   * Post a comment when PR has no analyzable changes.
   */
  async postNoChangesSkippedComment(): Promise<boolean> {
    return this.postSkippedComment('No new changes detected since last review.', false);
  }

  /**
   * Post a comment when daily PR analysis limit is reached.
   * Uses the generalized skip comment format.
  */
  async postDailyLimitReachedComment(): Promise<boolean> {
    return this.postSkippedComment("You've hit the daily PR analysis limit on your current plan. Consider upgrading: [Upgrade](https://beetleai.dev/upgrade)", false);
  }

  /**
   * Find the existing Beetle status/main comment on the PR by hidden marker.
   */
  private async findExistingStatusCommentId(): Promise<number | undefined> {
    try {
      const res = await this.octokit.issues.listComments({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        per_page: 100,
      });
      const found = res.data.find((c: any) => typeof c?.body === 'string' && c.body.includes(PRCommentService.STATUS_MARKER));
      return found?.id;
    } catch (err) {
      console.warn(`[PR-${this.context.pullNumber}] ⚠️ Failed to list comments to find status comment`, err);
      return undefined;
    }
  }

  /**
   * Update the Beetle status comment with the provided summary content.
   * If the status comment is not found, falls back to posting a new summary comment.
   */
  private async updateStatusCommentWithSummary(summaryContent: string): Promise<boolean> {
    try {
      // Clean summary for GitHub rendering
      const processed = this.processCommentForGitHub(summaryContent);
      
      // Append user guide and severity info to the summary
      const footerContent = this.generateUserGuideFooter();
      const linksSection = '\n\n---\nFollow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)';
      
      const updatedBody = `${PRCommentService.STATUS_MARKER}\n${processed}\n${footerContent}${linksSection}`;

      const commentId = this.statusCommentId;
      if (!commentId) {
        // Fallback – create as new comment
        const response = await this.octokit.issues.createComment({
          owner: this.context.owner,
          repo: this.context.repo,
          issue_number: this.context.pullNumber,
          body: updatedBody,
        });
        this.statusCommentId = response.data.id;
        logger.debug(`[PR-${this.context.pullNumber}] ✅ Posted new summary comment (no prior status found): ${response.data.html_url}`);
        return true;
      }

      const response = await this.octokit.issues.updateComment({
        owner: this.context.owner,
        repo: this.context.repo,
        comment_id: commentId,
        body: updatedBody,
      });
      logger.debug(`[PR-${this.context.pullNumber}] ✅ Updated status comment with summary: ${response.data.html_url}`);
      return true;
    } catch (error) {
      logger.error(`[PR-${this.context.pullNumber}] ❌ Failed to update status comment with summary:`, error);
      return false;
    }
  }
}