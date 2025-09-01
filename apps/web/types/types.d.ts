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
