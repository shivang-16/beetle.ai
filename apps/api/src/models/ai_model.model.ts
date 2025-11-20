import mongoose, { Document, Schema } from 'mongoose';

export interface IAIModel extends Document {
  name: string;
  modelId: string;
  provider: 'bedrock' | 'google';
  allowedPlans: mongoose.Types.ObjectId[];
  isActive: boolean;
  allowedModes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const aiModelSchema = new Schema<IAIModel>(
  {
    name: { type: String, required: true, trim: true },
    modelId: { type: String, required: true, unique: true, trim: true },
    provider: { type: String, required: true, enum: ['bedrock', 'google'] },
    allowedPlans: [{ type: Schema.Types.ObjectId, ref: 'Subscription_Plan', index: true }],
    isActive: { type: Boolean, required: true, default: true },
    allowedModes: [{ type: String, enum: ['pr_analysis', 'full_repo_analysis'], default: ['pr_analysis', 'full_repo_analysis'] }],
  },
  { timestamps: true }
);

aiModelSchema.index({ isActive: 1 });

export default mongoose.models.AI_Model || mongoose.model<IAIModel>('AI_Model', aiModelSchema);