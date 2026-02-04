import { PRComment } from '../../utils/responseParser.js';
import { incrementAnalysisCommentCounter } from '../../utils/analysisStreamStore.js';
import { logger } from '../../utils/logger.js';

import { getBitbucketAccessToken } from '../../utils/bitbucketTokenManager.js';

export interface BitbucketPRCommentContext {
  workspaceSlug: string;
  repoSlug: string;
  pullRequestId: number;
  // Removed accessToken from context as we will fetch it dynamically
  commitSha?: string;
  filesChanged?: string[]; // optional list of filenames for validation
  analysisId?: string;
  severityThreshold?: number;
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

export class BitbucketPRCommentService {
  private context: BitbucketPRCommentContext;
  private postedComments: Set<string> = new Set();
  private filesInPR?: Set<string>;
  private severityThreshold: number;
  private nonSummaryCommentsPosted: number = 0;

  // Severity level mapping
  private static SEVERITY_LEVELS: Record<string, number> = {
    'medium': 0,
    'high': 1,
    'critical': 2,
  };

  constructor(context: BitbucketPRCommentContext) {
    this.context = context;
    this.severityThreshold = context.severityThreshold ?? 1;
    if (Array.isArray(context.filesChanged) && context.filesChanged.length > 0) {
      this.filesInPR = new Set(
        context.filesChanged
          .filter(Boolean)
          .map((p) => p.trim().replace(/^\.\//, ''))
      );
    }
  }

  private shouldPostBySeverity(severity?: string): boolean {
    if (!severity) return this.severityThreshold <= 1;
    const normalizedSeverity = severity.toLowerCase().trim();
    const severityLevel = BitbucketPRCommentService.SEVERITY_LEVELS[normalizedSeverity] ?? 1;
    return severityLevel >= this.severityThreshold;
  }

  private isFileInPR(filePath: string): boolean {
    if (!this.filesInPR) return true; // If no files list provided, assume true (or fetch?)
    const normalizedPath = filePath.trim().replace(/^\.\//, '');
    const exists = this.filesInPR.has(normalizedPath);
    
    if (!exists) {
        // Try to match ignoring leading slash if present
        if (filePath.startsWith('/') && this.filesInPR.has(filePath.substring(1))) return true;
    }
    return exists;
  }

  private processCommentForBitbucket(content: string, suggestionCode?: string): string {
    // Step 1: Remove the header section with metadata (everything before "### Problem")
    const problemMatch = content.match(/(### Problem[\s\S]*)/);
    let processedContent = problemMatch ? problemMatch[1] : content;
    
    // Step 2: Remove any remaining metadata lines that might appear anywhere
    processedContent = processedContent.replace(/^(\*\*(File|Line_Start|Line_End|Severity|Confidence)\*\*:.*|##\s*\[.*?\]:.*)$/gm, '');
    
    // Step 3: Remove line number annotations from ALL code blocks (not just suggestion blocks)
    processedContent = processedContent.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/^\s*\d+\|\s*/gm, '');
    });
    
    // Step 4: Remove Mermaid diagrams (Bitbucket doesn't support them)
    processedContent = processedContent.replace(/```mermaid[\s\S]*?```/g, '');
    
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

    // Step 5: If we have suggestion code, clean it and replace the suggestion block content
    if (suggestionCode) {
      const cleanSuggestionCode = suggestionCode.replace(/^\s*\d+\|\s*/gm, '').trim();
      processedContent = processedContent.replace(
        /```suggestion\s*\n([\s\S]*?)\n```/,
        '```suggestion\n' + cleanSuggestionCode + '\n```'
      );
    }

    // Step 6: Convert HTML details blocks to plain markdown sections for Bitbucket
    processedContent = processedContent.replace(
      /<details>[\s\S]*?<\/details>/g,
      (detailsBlock) => {
        // Extract summary content
        const summaryMatch = detailsBlock.match(/<summary>(.*?)<\/summary>/);
        const summaryText = summaryMatch ? summaryMatch[1].trim() : 'Details';
        
        // Extract content between summary and /details
        const contentMatch = detailsBlock.match(/<\/summary>\s*([\s\S]*?)\s*<\/details>/);
        const content = contentMatch ? contentMatch[1].trim() : '';
        
        // Return as plain markdown section
        return `\n\n**${summaryText}**\n\n${content}\n`;
      }
    );

    // Step 7: Clean up any extra whitespace
    processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return processedContent;
  }

  private parseSuggestionComment(content: string): ParsedSuggestion | null {
    try {
      const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
      if (!fileMatch) return null;
      
      const filePath = fileMatch[1].trim();
      const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
      const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
      
      if (!lineStartMatch) return null;
      
      const lineStart = parseInt(lineStartMatch[1]);
      const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;
      
      const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
      const suggestionCode = suggestionMatch ? suggestionMatch[1].trim() : undefined;
      
      const confidenceMatch = content.match(/\*\*Confidence\*\*:\s*(.+)/);
      const confidence = confidenceMatch ? confidenceMatch[1].trim() : undefined;
      
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

  private async makeBitbucketRequest(method: string, path: string, body?: any) {
    // Get a valid access token (automatically refreshes if expired)
    const tokenResult = await getBitbucketAccessToken(this.context.workspaceSlug);
    if (!tokenResult.success || !tokenResult.accessToken) {
      throw new Error(`Failed to get valid Bitbucket access token: ${tokenResult.error}`);
    }

    const url = `https://api.bitbucket.org/2.0/repositories/${this.context.workspaceSlug}/${this.context.repoSlug}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bitbucket API error: ${response.status} ${response.statusText} - ${text}`);
    }

    return response.json();
  }

  async postInlineComment(suggestion: ParsedSuggestion): Promise<boolean> {
    try {
      if (!this.isFileInPR(suggestion.filePath)) {
        logger.warn(`[BB-PR-${this.context.pullRequestId}] File not in PR: ${suggestion.filePath}`);
        return false;
      }

      let reviewBody = this.processCommentForBitbucket(suggestion.originalComment, suggestion.suggestionCode);

      if (suggestion.confidence) {
        reviewBody += `\n\n**Confidence**: ${suggestion.confidence}`;
      }

      // Bitbucket doesn't support ranges in the same way as GitHub 'line'/'start_line'
      // It anchors to a single line. We'll mention the range in the body if needed.
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        reviewBody = `*Applies to lines ${suggestion.lineStart}-${suggestion.lineEnd}*\n\n` + reviewBody;
      }

      // Bitbucket inline comment payload
      const payload: any = {
        content: {
          raw: reviewBody
        },
        inline: {
          path: suggestion.filePath,
          to: suggestion.lineStart // Bitbucket uses 'to' for new file lines
        }
      };

      logger.debug(`[BB-PR-${this.context.pullRequestId}] Posting inline comment to ${suggestion.filePath}:${suggestion.lineStart}`, { 
        payload,
        originalComment: suggestion.originalComment.slice(0, 200),
        processedBody: reviewBody.slice(0, 200)
      });
      
      const result = await this.makeBitbucketRequest('POST', `/pullrequests/${this.context.pullRequestId}/comments`, payload);
      logger.debug(`[BB-PR-${this.context.pullRequestId}] Inline comment posted successfully: ${(result as any).id}`);
      
      return true;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] Failed to post inline comment for ${suggestion.filePath}:${suggestion.lineStart}`, error);
      return false;
    }
  }

  async postComment(comment: PRComment): Promise<boolean> {
    try {
      const commentHash = this.createCommentHash(comment.content);
      if (this.postedComments.has(commentHash)) return false;

      // Check for summary comment
      const trimmed = comment.content.trim();
      if (trimmed.startsWith('## Summary by Beetle')) {
        if (this.context.prSummarySettings?.enabled === false) return false;
        
        // Update PR description with summary content
        const updated = await this.updatePRDescriptionWithSummary(comment.content);
        if (updated) {
          this.postedComments.add(commentHash);
          return true;
        }
        return false;
      }

      const suggestion = this.parseSuggestionComment(comment.content);
      if (suggestion) {
        if (!this.shouldPostBySeverity(suggestion.severity)) return false;

        const success = await this.postInlineComment(suggestion);
        if (success) {
          this.postedComments.add(commentHash);
          this.nonSummaryCommentsPosted++;
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] Failed to post comment`, error);
      return false;
    }
  }

  async postComments(comments: PRComment[]): Promise<number> {
    let successCount = 0;
    for (const comment of comments) {
      if (await this.postComment(comment)) {
        successCount++;
        await this.delay(1000);
      }
    }
    
    if (successCount > 0 && this.context.analysisId) {
      try {
        await incrementAnalysisCommentCounter(this.context.analysisId, successCount);
      } catch (err) {
        logger.warn(`Failed to increment Redis comment counter`, err);
      }
    }
    return successCount;
  }

  async postAnalysisStartedComment(commits?: any[], files?: any[], ignoredFiles?: any[]): Promise<boolean> {
    try {
      // Simple one-line comment to indicate analysis has started
      const body = [
        'Beetle is analyzing your PR...',
        '',
        this.generateUserGuideFooter(),
      ].join('\n');

      await this.makeBitbucketRequest('POST', `/pullrequests/${this.context.pullRequestId}/comments`, {
        content: { raw: body }
      });

      return true;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] Failed to post analysis started comment`, error);
      return false;
    }
  }

  async postSkippedComment(reason: string): Promise<boolean> {
    try {
        const body = [
            'Review skipped',
            '',
            reason,
            '',
            '---',
            this.generateUserGuideFooter()
        ].join('\n');

        await this.makeBitbucketRequest('POST', `/pullrequests/${this.context.pullRequestId}/comments`, {
            content: { raw: body }
        });
        return true;
    } catch (error) {
        logger.error(`[BB-PR-${this.context.pullRequestId}] Failed to post skipped comment`, error);
        return false;
    }
  }

  /**
   * Post the summary as a regular comment.
   */
  async postSummaryComment(summaryContent: string): Promise<boolean> {
    try {
      // Clean summary for Bitbucket rendering
      const processed = this.processCommentForBitbucket(summaryContent);
      
      // Append user guide and severity info to the summary
      const footerContent = this.generateUserGuideFooter();
      const linksSection = '\n\n---\nFollow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)';
      
      const commentBody = `${processed}\n${footerContent}${linksSection}`;

      await this.makeBitbucketRequest('POST', `/pullrequests/${this.context.pullRequestId}/comments`, {
        content: { raw: commentBody }
      });
      
      logger.debug(`[BB-PR-${this.context.pullRequestId}] ✅ Posted summary comment`);
      return true;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] ❌ Failed to post summary comment:`, error);
      return false;
    }
  }

  /**
   * Update the PR description with the provided summary content.
   * Appends the Beetle summary to the existing PR description.
   */
  private async updatePRDescriptionWithSummary(summaryContent: string): Promise<boolean> {
    try {
      // Clean summary for Bitbucket rendering
      const processed = this.processCommentForBitbucket(summaryContent);
      
      // Append user guide and severity info to the summary
      const footerContent = this.generateUserGuideFooter();
      const linksSection = '\n\n---\nFollow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)';
      
      const beetleMarker = '<!-- beetle-summary -->';
      const beetleSummary = `\n\n---\n\n${beetleMarker}\n${processed}\n${footerContent}${linksSection}`;

      // Fetch the current PR to get its description
      const prData = await this.makeBitbucketRequest('GET', `/pullrequests/${this.context.pullRequestId}`);
      const currentDescription = (prData as any).description || '';
      
      // Check if we already have a Beetle summary in the description
      let updatedDescription: string;
      if (currentDescription.includes(beetleMarker)) {
        // Replace existing Beetle summary
        const markerIndex = currentDescription.indexOf(beetleMarker);
        // Find the start of the Beetle section (look for the --- separator before the marker)
        let sectionStart = currentDescription.lastIndexOf('\n---\n', markerIndex);
        if (sectionStart === -1) {
          sectionStart = markerIndex;
        }
        
        updatedDescription = currentDescription.substring(0, sectionStart) + beetleSummary;
        logger.debug(`[BB-PR-${this.context.pullRequestId}] Replacing existing Beetle summary in PR description`);
      } else {
        // Append new Beetle summary to existing description
        updatedDescription = currentDescription + beetleSummary;
        logger.debug(`[BB-PR-${this.context.pullRequestId}] Appending Beetle summary to PR description`);
      }

      // Update the PR description
      await this.makeBitbucketRequest('PUT', `/pullrequests/${this.context.pullRequestId}`, {
        description: updatedDescription
      });
      
      logger.debug(`[BB-PR-${this.context.pullRequestId}] ✅ Updated PR description with summary`);
      return true;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] ❌ Failed to update PR description with summary:`, error);
      return false;
    }
  }

  private generateUserGuideFooter(): string {
    const severityLabel = this.getSeverityLabel().split('—')[0].trim(); // Keep it short
    return [
      '',
      '>',
      `> **Severity**: \`${severityLabel}\` · [Change](https://beetleai.dev/settings) · **Custom Rules**: [Define](https://beetleai.dev/custom-context) · **PR Summary**: [Config](https://beetleai.dev/settings)`,
      '>',
      '> **Tips**: [See how to interact with Beetle](https://beetleai.dev/interact)',
    ].join('\n');
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

  getNonSummaryCommentsPosted(): number {
    return this.nonSummaryCommentsPosted;
  }

  async postNoIssuesFoundComment(): Promise<boolean> {
    try {
      const footerContent = this.generateUserGuideFooter();
      const linksSection = '\n\n---\nFollow us: [Beetle](https://beetleai.dev) · [X](https://x.com/beetleai_dev) · [LinkedIn](https://www.linkedin.com/company/beetle-ai)';
      
      const body = [
        '✅ **No issues found**',
        '',
        'You\'re good to merge this PR! Great job!'
      ].join('\n');

      await this.makeBitbucketRequest('POST', `/pullrequests/${this.context.pullRequestId}/comments`, {
        content: { raw: body }
      });
      return true;
    } catch (error) {
      logger.error(`[BB-PR-${this.context.pullRequestId}] Failed to post no issues found comment`, error);
      return false;
    }
  }

  private createCommentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}