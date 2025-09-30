import mongoose, { Document, Schema } from 'mongoose';

export interface IGithubPullRequest extends Document {
  pullRequestNumber?: number; // GitHub PR number (when actually created)
  patchId: string; // Unique identifier for the patch
  issueId: string;
  title: string;
  body?: string;
  state: 'draft' | 'open' | 'closed' | 'merged';
  githubUrl?: string; // GitHub PR URL (when actually created)
  githubId?: number; // GitHub PR ID (when actually created)
  labels?: string[];
  assignees?: string[];
  createdBy: string; // userId who created the patch
  github_repositoryId: Schema.Types.ObjectId;
  analysisId?: Schema.Types.ObjectId;
  repository: {
    owner: string;
    repo: string;
    fullName: string;
  };
  patch: {
    filePath: string;
    before: string;
    after: string;
    explanation?: string;
  };
  branchName?: string; // Target branch name for the PR
  baseBranch?: string; // Base branch (usually main/master)
  githubCreatedAt?: Date; // When actually created on GitHub
  githubUpdatedAt?: Date; // When last updated on GitHub
  createdAt: Date;
  updatedAt: Date;
}

const GithubPullRequestSchema = new Schema<IGithubPullRequest>(
  {
    pullRequestNumber: {
      type: Number,
      index: true,
    },
    issueId: {
      type: String
    },
    patchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      enum: ['draft', 'open', 'closed', 'merged'],
      required: true,
      default: 'draft',
      index: true,
    },
    githubUrl: {
      type: String,
      trim: true,
    },
    githubId: {
      type: Number,
      index: true,
    },
    labels: [{
      type: String,
      trim: true,
    }],
    assignees: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    github_repositoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Github_Repository',
      required: true,
      index: true,
    },
    analysisId: {
      type: Schema.Types.ObjectId,
      ref: 'Analysis',
      index: true,
    },
    repository: {
      owner: {
        type: String,
        required: true,
        trim: true,
      },
      repo: {
        type: String,
        required: true,
        trim: true,
      },
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
    },
    patch: {
      filePath: {
        type: String,
        required: true,
        trim: true,
      },
      before: {
        type: String,
        required: true,
      },
      after: {
        type: String,
        required: true,
      },
      explanation: {
        type: String,
        trim: true,
      },
    },
    branchName: {
      type: String,
      trim: true,
    },
    baseBranch: {
      type: String,
      trim: true,
      default: 'main',
    },
    githubCreatedAt: {
      type: Date,
    },
    githubUpdatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
// GithubPullRequestSchema.index({ github_repositoryId: 1, pullRequestNumber: 1 });
// GithubPullRequestSchema.index({ createdBy: 1, state: 1 });
// GithubPullRequestSchema.index({ 'repository.fullName': 1, pullRequestNumber: 1 });
// GithubPullRequestSchema.index({ patchId: 1, github_repositoryId: 1 });

export default mongoose.models.GithubPullRequest || mongoose.model<IGithubPullRequest>('Github_Pull_Request', GithubPullRequestSchema);