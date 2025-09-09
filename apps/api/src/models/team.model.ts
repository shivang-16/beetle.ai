// apps/api/src/models/team.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export type TeamRole = 'admin' | 'member';

export interface ITeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: Date;
}

export interface ITeam extends Document {
  _id: string;
  name: string;
  description?: string;
  slug?: string;
  ownerId: string;
  members: ITeamMember[];
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['admin', 'member'],
      required: true,
      default: 'member',
    },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TeamSchema = new Schema<ITeam>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },
    ownerId: { type: String, required: true, index: true },
    members: {
      type: [TeamMemberSchema],
      default: [],
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Helpful compound index to quickly find teams by member
TeamSchema.index({ 'members.userId': 1, slug: 1 });

export default mongoose.models.Team || mongoose.model<ITeam>('Team', TeamSchema);
