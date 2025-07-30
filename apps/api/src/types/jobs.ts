export interface ScanJobData {
  repoUrl: string;
  commitSha: string;
  autoApprove: boolean;
}

export interface FixJobData {
  repoUrl: string;
  issues: Array<{ filePath: string; line: number; message: string }>;
}
