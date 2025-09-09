import mongoose, { Document, Schema } from 'mongoose';

export interface IGithub_Repository extends Document {
    repositoryId: number;
    fullName: string;
    private: boolean;
    github_installationId: Schema.Types.ObjectId;
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
    github_installationId: {
        type: Schema.Types.ObjectId,
        ref: 'Github_Installation',
        required: true,
    },
    repositoryId: {
        type: Number,
        required: true,
        unique: true,
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
        default: false
    },
    customSettings: {
        type: Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

export const Github_Repository = mongoose.model<IGithub_Repository>('Github_Repository', RepositorySchema);