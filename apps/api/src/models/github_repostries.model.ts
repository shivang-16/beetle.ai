import mongoose, { Document, Schema } from 'mongoose';

export interface IGithub_Repository extends Document {
    repositoryId: number;
    fullName: string;
    private: boolean;
    github_installationId: Schema.Types.ObjectId;
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
    }
}, {
    timestamps: true
});

export const Github_Repository = mongoose.model<IGithub_Repository>('Github_Repository', RepositorySchema);