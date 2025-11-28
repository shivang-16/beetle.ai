import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  userId: string;
  teamId?: string;
  repoOwner: string;
  repoName: string;
  repoUrl: string;
  prNumber: number;
  commentId: number;
  feedbackType: "positive" | "negative";
  feedbackContent?: string;
  replyType?: "reaction" | "text-reply"; // Distinguish between reaction-based and text reply feedback
  originalCommentContext: {
    body: string;
    path?: string;
    line?: number;
    diffHunk?: string;
  };
  timestamp: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: String, index: true },
    repoOwner: { type: String, required: true },
    repoName: { type: String, required: true },
    repoUrl: { type: String, required: true },
    prNumber: { type: Number, required: true },
    commentId: { type: Number, required: true },
    feedbackType: {
      type: String,
      enum: ["positive", "negative"],
      required: true,
    },
    feedbackContent: { type: String },
    replyType: {
      type: String,
      enum: ["reaction", "text-reply"],
    },
    originalCommentContext: {
      body: { type: String, required: true },
      path: { type: String },
      line: { type: Number },
      diffHunk: { type: String },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for efficient retrieval of feedback by repo or team
FeedbackSchema.index({ repoOwner: 1, repoName: 1, feedbackType: 1 });
FeedbackSchema.index({ teamId: 1, feedbackType: 1 });

export default mongoose.models.Feedback ||
  mongoose.model<IFeedback>("Feedback", FeedbackSchema);
