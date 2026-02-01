import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
  email: string;
  password?: string;
  ssoProvider?: 'github' | 'bitbucket' | 'google' | 'email' | 'extension';  // SSO provider used for signup
  activeTeamId?: mongoose.Types.ObjectId;
  subscriptionPlanId: mongoose.Schema.Types.ObjectId;
  subscriptionStatus?: "active" | "inactive" | "cancelled" | "free";
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  earlyAccess?: boolean;
  earlyAccessRequestedAt?: Date;
  requestedUpgrade?: boolean;
  isOnboarded?: boolean;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: {
      type: String,
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
    },
    ssoProvider: {
      type: String,
      enum: ['github', 'bitbucket', 'google', 'email', 'extension'],
      required: false,
      index: true,
    },
    activeTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      index: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "cancelled", "free"],
      default: "free",
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    earlyAccess: {
      type: Boolean,
      default: false,
    },
    earlyAccessRequestedAt: {
      type: Date,
    },
    requestedUpgrade: {
      type: Schema.Types.Mixed,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {
        commentSeverity: 1,
        defaultModelRepo: new mongoose.Types.ObjectId('6916caa7984764bbefcf67d9'),
        defaultModelPr: new mongoose.Types.ObjectId('6916caa7984764bbefcf67dc'),
        defaultModelExtension: new mongoose.Types.ObjectId('6916caa7984764bbefcf67dc'),
        prSummarySettings: {
          enabled: true,
          sequenceDiagram: true,
          issueTables: true,
          impactAsessment: true,
          vibeCheckRap: false,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User ||
  mongoose.model<IUser>("User", userSchema);
