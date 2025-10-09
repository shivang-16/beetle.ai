// apps/api/src/services/prCommentService.ts
import { getInstallationOctokit } from '../../lib/githubApp.js';
import { PRComment } from '../../utils/responseParser.js';

export interface PRCommentContext {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha?: string;
}

export interface ParsedSuggestion {
  filePath: string;
  lineStart: number;
  lineEnd?: number;
  suggestionCode: string;
  originalComment: string;
  severity?: string;
  issueType?: string;
}

export class PRCommentService {
  private context: PRCommentContext;
  private octokit: ReturnType<typeof getInstallationOctokit>;
  private postedComments: Set<string> = new Set();

  constructor(context: PRCommentContext) {
    this.context = context;
    this.octokit = getInstallationOctokit(context.installationId);
  }

  /**
   * Remove line number annotations from code (e.g., "1|", "2|", etc.)
   */
  private removeLineNumberAnnotations(code: string): string {
    return code.replace(/^\s*\d+\|\s*/gm, '');
  }

  /**
   * Clean comment body by removing metadata fields and keeping only essential content
   */
  private cleanCommentBody(content: string): string {
    // Remove the header section with metadata (everything before "### Problem")
    const problemMatch = content.match(/(### Problem[\s\S]*)/);
    if (!problemMatch) {
      // If no "### Problem" section found, return the original content
      return content;
    }
    
    let cleanedContent = problemMatch[1];
    
    // Remove any remaining metadata lines that might appear after the sections
    cleanedContent = cleanedContent.replace(/^\*\*File\*\*:.*$/gm, '');
    cleanedContent = cleanedContent.replace(/^\*\*Line_Start\*\*:.*$/gm, '');
    cleanedContent = cleanedContent.replace(/^\*\*Line_End\*\*:.*$/gm, '');
    cleanedContent = cleanedContent.replace(/^\*\*Severity\*\*:.*$/gm, '');
    cleanedContent = cleanedContent.replace(/^##\s*\[.*?\]:.*$/gm, '');
    
    // Clean up any extra whitespace
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
    
    return cleanedContent;
  }

  /**
   * Parse PR comment format to extract suggestion data
   */
  private parseSuggestionComment(content: string): ParsedSuggestion | null {
    try {
      // Extract file path
      const fileMatch = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
      if (!fileMatch) return null;
      
      const filePath = fileMatch[1];
      
      // Extract line numbers
      const lineStartMatch = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
      const lineEndMatch = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
      
      if (!lineStartMatch) return null;
      
      const lineStart = parseInt(lineStartMatch[1]);
      const lineEnd = lineEndMatch ? parseInt(lineEndMatch[1]) : undefined;
      
      // Extract suggestion code
      const suggestionMatch = content.match(/```suggestion\s*\n([\s\S]*?)\n```/);
      if (!suggestionMatch) return null;
      
      const suggestionCode = this.removeLineNumberAnnotations(suggestionMatch[1]);
      
      // Extract optional fields
      const severityMatch = content.match(/\*\*Severity\*\*:\s*([^\n]+)/);
      const issueTypeMatch = content.match(/##\s*\[([^\]]+)\]:/);
      
      return {
        filePath,
        lineStart,
        lineEnd,
        suggestionCode,
        originalComment: content,
        severity: severityMatch ? severityMatch[1].trim() : undefined,
        issueType: issueTypeMatch ? issueTypeMatch[1].trim() : undefined
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

      // Create a cleaned comment body with only essential content
      let reviewBody = this.cleanCommentBody(suggestion.originalComment);
      
      // Ensure the suggestion code is clean (without line number annotations)
      reviewBody = reviewBody.replace(/```suggestion\s*\n([\s\S]*?)\n```/, '```suggestion\n' + suggestion.suggestionCode + '\n```');

      // Add line range information for multi-line suggestions
      if (suggestion.lineEnd && suggestion.lineEnd !== suggestion.lineStart) {
        const lineRangeInfo = `\n\n*📍 This suggestion applies to lines ${suggestion.lineStart}-${suggestion.lineEnd}*`;
        reviewBody = reviewBody + lineRangeInfo;
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
        console.log(`[PR-${this.context.pullNumber}] Creating multi-line comment from line ${suggestion.lineStart} to ${suggestion.lineEnd}`);
      } else {
        console.log(`[PR-${this.context.pullNumber}] Creating single-line comment at line ${suggestion.lineStart}`);
      }

      const response = await this.octokit.pulls.createReviewComment(reviewCommentParams);

      console.log(`[PR-${this.context.pullNumber}] ✅ Posted review comment with suggestion: ${response.data.html_url}`);
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post review comment:`, error);
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
        console.log(`[PR-${this.context.pullNumber}] Skipping duplicate comment`);
        return false;
      }

      // Check if this is a suggestion comment
      const suggestion = this.parseSuggestionComment(comment.content);
      
      if (suggestion) {
        // Try to post as a review comment with suggestion
        const reviewSuccess = await this.postReviewComment(suggestion);
        
        if (reviewSuccess) {
          this.postedComments.add(commentHash);
          return true;
        }
        
        // If review comment fails, fall back to regular comment
        console.log(`[PR-${this.context.pullNumber}] Review comment failed, falling back to regular comment`);
      }

      // Post as regular issue comment
      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body: comment.content
      });

      this.postedComments.add(commentHash);
      
      console.log(`[PR-${this.context.pullNumber}] ✅ Posted comment: ${response.data.html_url}`);
      return true;
    } catch (error) {
      console.error(`[PR-${this.context.pullNumber}] ❌ Failed to post comment:`, error);
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
        // Add a small delay between comments to avoid rate limiting
        await this.delay(1000);
      }
    }
    
    return successCount;
  }

  /**
   * Post an initial analysis started comment
   */
  // async postAnalysisStartedComment(): Promise<boolean> {
  //   const comment: PRComment = {
  //     content: "🔍 **CodeDetector Analysis Started**\n\nI'm analyzing this pull request for security vulnerabilities, code quality issues, and potential bugs. I'll post my findings as comments shortly.",
  //     timestamp: new Date().toISOString()
  //   };
    
  //   return this.postComment(comment);
  // }

  /**
   * Post an analysis completed comment
   */
  // async postAnalysisCompletedComment(analysisId?: string): Promise<boolean> {
  //   let content = "✅ **CodeDetector Analysis Completed**\n\nI've finished analyzing this pull request. Please review the comments above for any findings.";
    
  //   if (analysisId) {
  //     content += `\n\n*Analysis ID: ${analysisId}*`;
  //   }
    
  //   const comment: PRComment = {
  //     content,
  //     timestamp: new Date().toISOString()
  //   };
    
  //   return this.postComment(comment);
  // }

  /**
   * Post an analysis error comment
   */
  async postAnalysisErrorComment(error: string): Promise<boolean> {
    const comment: PRComment = {
      content: `❌ **CodeDetector Analysis Error**\n\nI encountered an error while analyzing this pull request:\n\n\`\`\`\n${error}\n\`\`\`\n\nPlease try again or contact support if the issue persists.`,
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
}