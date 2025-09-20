// apps/api/src/services/prCommentService.ts
import { getInstallationOctokit } from '../lib/githubApp.js';
import { PRComment } from '../lib/responseParser.js';

export interface PRCommentContext {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
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

      // Format the comment with CodeDetector branding
      const formattedComment = this.formatComment(comment.content);

      const response = await this.octokit.issues.createComment({
        owner: this.context.owner,
        repo: this.context.repo,
        issue_number: this.context.pullNumber,
        body: formattedComment
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

  private formatComment(content: string): string {
    // Add CodeDetector branding and formatting
    const header = "🤖 **CodeDetector Analysis**\n\n";
    const footer = "\n\n---\n*Powered by [CodeDetector](https://codetector.ai) - AI-powered code analysis*";
    
    return header + content + footer;
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