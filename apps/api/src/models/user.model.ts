import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarUrl: string;
  email: string;
  organizationId?: string;
  teams?: Array<{
    _id: string;
    role: 'admin' | 'member';
  }>;
  password?: string;
  subscriptionPlanId: mongoose.Schema.Types.ObjectId;
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'free';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
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
    teams: [{
      _id: {
        type: String,
        index: true,
      },
      role: {
        type: String,
        enum: [ 'admin', 'member'],
      },
    }],
    organizationId: {
      type: String,
      index: true,
    },
    password: {
      type: String,
    },
    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
      index: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'free'],
      default: 'free',
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
