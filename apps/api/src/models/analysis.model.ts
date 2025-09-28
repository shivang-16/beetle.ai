import mongoose, { Schema } from 'mongoose';

export interface IAnalysis {
  _id: mongoose.Types.ObjectId;
  analysis_type: string;
  userId: string;
  repoUrl: string;
  github_repositoryId: Schema.Types.ObjectId;
  sandboxId: string;
  model: string;
  prompt: string;
  status: 'running' | 'completed' | 'interrupted' | 'error';
  exitCode?: number | null;
  logsCompressed?: Buffer;
  compression?: {
    algorithm: 'gzip';
    originalBytes: number;
    compressedBytes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    analysis_type: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    repoUrl: { type: String, required: true },
    github_repositoryId: { type: Schema.Types.ObjectId, ref: 'Github_Repository', required: true, index: true },
    sandboxId: { type: String },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'interrupted', 'error'],
      required: true,
    },
    exitCode: { type: Number },
    logsCompressed: { type: Buffer },
    compression: {
      algorithm: { type: String, enum: ['gzip'] },
      originalBytes: { type: Number },
      compressedBytes: { type: Number },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
