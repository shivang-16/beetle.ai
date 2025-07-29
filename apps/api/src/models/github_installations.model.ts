import mongoose, { Schema, Document } from 'mongoose';

export interface IGithub_Installation extends Document {
  installationId: number;
  account: {
    login: string,
    id: number,
    type: 'User' | 'Organization',
    avatarUrl: string,
    htmlUrl: string,
  },
  sender: {
    login: string,
    id: number,
    type: 'User' | 'Organization',
    avatarUrl: string,
    htmlUrl: string,
  },
  targetType: 'User' | 'Organization';
  repositorySelection: 'all' | 'selected';
  permissions: Record<string, string>;
  events: string[];
  installedAt: Date;
  updatedAt: Date;
  suspendedAt?: Date;
  suspendedBy?: string;
}

const InstallationSchema = new Schema<IGithub_Installation>({
  installationId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  account: {
    type: Object,
    required: true
  },
  sender: {
    type: Object,
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['User', 'Organization']
  },
  repositorySelection: {
    type: String,
    required: true,
    enum: ['all', 'selected']
  },
 
  permissions: {
    type: Map,
    of: String
  },
  events: [{
    type: String
  }],
  installedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  suspendedAt: {
    type: Date,
    required: false
  },
  suspendedBy: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

export const Github_Installation = mongoose.model<IGithub_Installation>('Github_Installation', InstallationSchema); 