import mongoose, { Document, Schema } from 'mongoose';

export interface IGithubIssue extends Document {
  issueNumber: number;
  issueId: string;
  title: string;
  body?: string;
  state: 'draft' | 'open' | 'closed';
  githubUrl: string;
  githubId: number;
  labels?: string[];
  assignees?: string[];
  createdBy: string; // userId who created the issue
  github_repositoryId: Schema.Types.ObjectId;
  analysisId?: Schema.Types.ObjectId;
  repository: {
    owner: string;
    repo: string;
    fullName: string;
  };
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GithubIssueSchema = new Schema<IGithubIssue>(
  {
    issueNumber: {
      type: Number,
    //   required: true,
    },
    issueId: {
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
      enum: ['draft', 'open', 'closed'],
      required: true,
      default: 'open',
      index: true,
    },
    githubUrl: {
      type: String,
    //   required: true,
      trim: true,
    },
    githubId: {
      type: Number,
    //   required: true,
    //   unique: true,
    //   index: true,
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
    githubCreatedAt: {
      type: Date,
      required: true,
    },
    githubUpdatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
// GithubIssueSchema.index({ github_repositoryId: 1, issueNumber: 1 });
// GithubIssueSchema.index({ createdBy: 1, state: 1 });
// GithubIssueSchema.index({ 'repository.fullName': 1, issueNumber: 1 });

export default mongoose.models.GithubIssue || mongoose.model<IGithubIssue>('Github_Issue', GithubIssueSchema);