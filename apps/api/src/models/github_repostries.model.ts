import mongoose, { Document, Schema } from 'mongoose';

export interface IGithub_Repository extends Document {
    source?: 'github' | 'bitbucket';  // NEW: platform source, defaults to 'github'
    repositoryId: number | string;  // GitHub uses numbers, Bitbucket uses UUID strings
    fullName: string;
    private: boolean;
    defaultBranch?: string;
    github_installationId: Schema.Types.ObjectId;
    teamId?: string;                // team ID this repo belongs to
    analysisType?: string;          // e.g., "security", "quality", "performance"
    analysisFrequency?: string;     // e.g., "on_push", "daily", "weekly", "custom"
    analysisIntervalDays?: number;  // if frequency == 'custom', run every N days
    analysisRequired?: boolean;     // whether analysis is mandatory before merge
    raiseIssues?: boolean;          // create GitHub issues automatically
    autoFixBugs?: boolean;          // attempt automatic PRs for simple fixes
    trackGithubIssues?: boolean;    // track GitHub issues
    trackGithubPullRequests?: boolean; // track GitHub pull requests
    customSettings?: Record<string, unknown>; // arbitrary JSON for further customization
}       

const RepositorySchema = new Schema<IGithub_Repository>({
    source: {
        type: String,
        enum: ['github', 'bitbucket'],
        default: 'github',
        required: false
    },
    github_installationId: {
        type: Schema.Types.ObjectId,
        ref: 'Github_Installation',
        required: true,
    },
    repositoryId: {
        type: Schema.Types.Mixed,  // GitHub: number, Bitbucket: UUID string
        required: true,
        index: true
    },
    fullName: {
        type: String,
        required: true
    },
    private: {
        type: Boolean,
        required: true
    },
    defaultBranch: {
        type: String,
        required: false,
        default: 'main'
    },
    teamId: {
        type: String,
        ref: 'Team',
        index: true
    },
    analysisRequired: {
        type: Boolean,
        default: true
    },
    analysisType: {
        type: String,
        enum: [
            'security',
            'quality',
            'performance',
            'style',
            'custom'
        ],
        default: 'quality'
    },
    analysisFrequency: {
        type: String,
        enum: ['on_push', 'daily', 'weekly', 'monthly', 'custom'],
        default: 'on_push'
    },
    analysisIntervalDays: {
        type: Number,
        min: 1,
        required: function () {
            // require interval if custom frequency selected
            // @ts-ignore - this refers to mongoose document
            return this.analysisFrequency === 'custom';
        },
        default: undefined
    },

    raiseIssues: {
        type: Boolean,
        default: false
    },
    autoFixBugs: {
        type: Boolean,
        default: false
    },

    trackGithubIssues: {
        type: Boolean,
        default: false
    },
    trackGithubPullRequests: {
        type: Boolean,
        default: true
    },
    customSettings: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

export const Github_Repository = mongoose.model<IGithub_Repository>('Github_Repository', RepositorySchema);