export interface GithubRepository {
  _id: string;
  github_installationId: string;
  repositoryId: number;
  fullName: string;
  private: boolean;
  analysisRequired: boolean;
  analysisType: string;
  analysisFrequency: string;
  raiseIssues: boolean;
  autoFixBugs: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RepoInfo {
  name: string;
  full_name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  size: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  private: false;
  url: string;
  clone_url: string;
  ssh_url: string;
}

export interface TreeProps {
  path: string;
  type: string;
  size: number;
  sha: string;
  url: string;
}

export interface RepoTree {
  repository: {
    owner: string;
    repo: string;
    url: string;
  };
  tree: TreeProps[];
  statistics: {
    total_files: number;
    total_folders: number;
    total_items: number;
    file_extensions: {
      gitignore: number;
      md: number;
      png: number;
      svg: number;
      jpg: number;
      html: number;
      css: number;
    };
  };
  commit: {
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    date: string;
  };
}

export interface ITreeNode {
  id: string;
  name: string;
  path: string;
  type: string;
  children?: TreeNode[];
  level: number;
  isLast?: boolean;
  parentPath?: boolean[];
  sha?: string;
  size?: number;
}

type LogType = "INFO" | "TOOL_CALL" | "LLM_RESPONSE" | "DEFAULT";

export type LogType = "INFO" | "TOOL_CALL" | "LLM_RESPONSE" | "GENERIC";

export interface TextSegment {
  kind: "text";
  content: string;
}

export interface GitHubIssueSegment {
  kind: "githubIssue";
  content: string;
}

export interface PatchSegment {
  kind: "patch";
  content: string;
}

export type LLMResponseSegment =
  | TextSegment
  | GitHubIssueSegment
  | PatchSegment;

export interface LogItem {
  type: LogType;
  messages: string[];
  segments?: LLMResponseSegment[]; // only used for LLM_RESPONSE
}

/** Parser state */
export interface ParserState {
  isCapturingLLM: boolean;
  currentLLMResponse: string[];
}

type ParsedPatch = {
  file?: string;
  line_range?: string;
  issue?: string;
  language?: string;
  before?: string;
  after?: string;
  explanation?: string;
};
