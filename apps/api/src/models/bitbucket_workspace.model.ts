import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto.js';

export interface IBitbucket_Workspace extends Document {
  workspaceUuid: string;      
  workspaceSlug: string;      
  userId: string;             
  teamId?: string;            
  
  accessToken: string;        
  refreshToken?: string;      
  tokenExpiresAt: Date;       
  
  account: {
    displayName: string;      
    uuid: string;             
    type: 'workspace' | 'user'; 
    avatarUrl?: string;       
    websiteUrl?: string;      
  };
  
  scopes: string[];           
  
  webhookId?: string;         
  webhookSecret?: string;     
  
  connectedAt: Date;          
  lastSyncedAt?: Date;        
  updatedAt: Date;
  status: 'connected' | 'disconnected';
}

const BitbucketWorkspaceSchema = new Schema<IBitbucket_Workspace>({
  workspaceUuid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  workspaceSlug: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  teamId: {
    type: String,
    required: false,
    index: true
  },
  accessToken: {
    type: String,
    required: true,
    set: (v: string) => encrypt(v),
    get: (v: string) => decrypt(v)
  },
  refreshToken: {
    type: String,
    required: false,
    set: (v: string) => encrypt(v),
    get: (v: string) => decrypt(v)
  },
  tokenExpiresAt: {
    type: Date,
    required: true
  },
  account: {
    type: Object,
    required: true
  },
  scopes: [{
    type: String
  }],
  webhookId: {
    type: String,
    required: false,
    index: true
  },
  webhookSecret: {
    type: String,
    required: false,
    set: (v: string) => encrypt(v),
    get: (v: string) => decrypt(v)
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncedAt: {
    type: Date,
    required: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected'],
    default: 'connected'
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

export const Bitbucket_Workspace = mongoose.model<IBitbucket_Workspace>('Bitbucket_Workspace', BitbucketWorkspaceSchema);
