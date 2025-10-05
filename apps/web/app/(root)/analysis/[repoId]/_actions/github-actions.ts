"use server";

import { apiPost } from "@/lib/api-client";
import { extractTitleAndDescription } from "@/lib/utils";

export interface CreateGithubIssueParams {
  repoId: string;
  analysisId?: string;
  title?: string;
  body?: string;
  labels?: string[];
  segmentIssueId?: string;
  content?: string; // For extracting title/description if not provided
}

export interface CreateGithubIssueResult {
  success: boolean;
  data?: {
    html_url: string;
    id: number;
    number: number;
  };
  error?: string;
}

export async function createGithubIssue(params: CreateGithubIssueParams): Promise<CreateGithubIssueResult> {
  try {
    const {
      repoId,
      analysisId,
      title: providedTitle,
      body: providedBody,
      labels = ["analysis", "automated"],
      segmentIssueId,
      content
    } = params;

    // Extract title and description from content if not provided
    let title = providedTitle;
    let body = providedBody;
    
    if (!title || !body) {
      if (content) {
        const extracted = extractTitleAndDescription(content);
        title = title || extracted.title || "Issue from Analysis";
        body = body || extracted.description || content;
      } else {
        title = title || "Issue from Analysis";
        body = body || "No description provided";
      }
    }

    const response = await apiPost("/api/github/issue", {
      github_repositoryId: repoId,
      analysisId,
      title,
      body,
      labels,
      segmentIssueId,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `HTTP error! status: ${response.status}`
      };
    }

    const data = await response.json();
    
    if (data.success && data.data?.html_url) {
      return {
        success: true,
        data: {
          html_url: data.data.html_url,
          id: data.data.id,
          number: data.data.number,
        }
      };
    } else {
      return {
        success: false,
        error: "Failed to create GitHub issue"
      };
    }
  } catch (error) {
    console.error("Error creating GitHub issue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create GitHub issue"
    };
  }
}

export interface CreateGithubPullRequestParams {
  repoId: string;
  analysisId?: string;
  title?: string;
  body?: string;
  filePath: string;
  before: string;
  after: string;
  branchName?: string;
  issueId?: string;
  patchId?: string;
}

export interface CreateGithubPullRequestResult {
  success: boolean;
  data?: {
    html_url: string;
    id: number;
    number: number;
  };
  error?: string;
}

export async function createGithubPullRequest(params: CreateGithubPullRequestParams): Promise<CreateGithubPullRequestResult> {
  try {
    const {
      repoId,
      analysisId,
      title,
      body,
      filePath,
      before,
      after,
      branchName,
      issueId,
      patchId,
    } = params;

   
    const response = await apiPost("/api/github/pull-request", {
      github_repositoryId: repoId,
      analysisId,
      title,
      body,
      filePath,
      before,
      after,
      branchName,
      issueId,
      patchId
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || `HTTP error! status: ${response.status}`
      };
    }

    const data = await response.json();
    
   return data
  } catch (error) {
    console.error("Error creating GitHub pull request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create GitHub pull request"
    };
  }
}