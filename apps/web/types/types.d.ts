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
