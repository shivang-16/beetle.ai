import mongoose, { Schema } from 'mongoose';

export interface IAnalysis {
  analysisId: string;
  userId: string;
  repoUrl: string;
  github_repositoryId: string;
  model: string;
  prompt: string;
  status: 'completed' | 'interrupted' | 'error';
  exitCode?: number | null;
  logsCompressed: Buffer;
  compression: {
    algorithm: 'gzip';
    originalBytes: number;
    compressedBytes: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    analysisId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    repoUrl: { type: String, required: true },
    github_repositoryId: { type: String, required: true, index: true },
    model: { type: String, required: true },
    prompt: { type: String, required: true },
    status: {
      type: String,
      enum: ['completed', 'interrupted', 'error'],
      required: true,
    },
    exitCode: { type: Number },
    logsCompressed: { type: Buffer, required: true },
    compression: {
      algorithm: { type: String, enum: ['gzip'], required: true },
      originalBytes: { type: Number, required: true },
      compressedBytes: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
