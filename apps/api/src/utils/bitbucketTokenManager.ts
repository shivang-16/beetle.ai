/**
 * Bitbucket Token Management Utility
 * Handles access token validation, refresh, and retrieval
 */

import { logger } from '../utils/logger.js';
import { Bitbucket_Workspace, IBitbucket_Workspace } from '../models/bitbucket_workspace.model.js';

/**
 * Result of getting a valid access token
 */
export interface BitbucketAccessTokenResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  errorType?: 'NO_WORKSPACE' | 'NO_REFRESH_TOKEN' | 'REFRESH_FAILED' | 'UNKNOWN';
}

/**
 * Get a valid Bitbucket access token for a workspace
 * Automatically refreshes the token if it's expired
 * 
 * @param workspaceSlug - The Bitbucket workspace slug
 * @returns Access token result with success status and token or error
 */
export async function getBitbucketAccessToken(
  workspaceSlug: string
): Promise<BitbucketAccessTokenResult> {
  try {
    // Find workspace
    const workspace = await Bitbucket_Workspace.findOne({ workspaceSlug });
    
    if (!workspace) {
      logger.error('Bitbucket workspace not found', { workspaceSlug });
      return {
        success: false,
        error: 'Workspace not found',
        errorType: 'NO_WORKSPACE'
      };
    }

    // Check if token is expired (with 5 minute safety buffer)
    const now = new Date();
    const tokenExpiresAt = new Date(workspace.tokenExpiresAt);
    // Buffer of 5 minutes to prevent token expiring during an operation
    const safetyBuffer = 5 * 60 * 1000; 
    const isTokenExpired = now.getTime() + safetyBuffer >= tokenExpiresAt.getTime();

    // If token is still valid, return it
    if (!isTokenExpired) {
      logger.debug('Using existing valid Bitbucket access token', {
        workspaceSlug,
        expiresAt: tokenExpiresAt
      });
      return {
        success: true,
        accessToken: workspace.accessToken
      };
    }

    // Token is expired, need to refresh
    logger.info('Bitbucket access token expired, attempting refresh', {
      workspaceSlug,
      expiresAt: tokenExpiresAt,
      now,
      hasRefreshToken: !!workspace.refreshToken
    });

    if (!workspace.refreshToken) {
      logger.error('No refresh token available for expired access token', {
        workspaceSlug
      });
      return {
        success: false,
        error: 'Access token expired and no refresh token available - please reconnect your Bitbucket workspace',
        errorType: 'NO_REFRESH_TOKEN'
      };
    }

    // Refresh the access token
    const refreshResult = await refreshBitbucketAccessToken(workspace);
    
    if (!refreshResult.success) {
      return {
        success: false,
        error: refreshResult.error || 'Failed to refresh access token',
        errorType: 'REFRESH_FAILED'
      };
    }

    return {
      success: true,
      accessToken: refreshResult.accessToken
    };

  } catch (error) {
    logger.error('Error getting Bitbucket access token', {
      error: error instanceof Error ? error.message : error,
      workspaceSlug
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'UNKNOWN'
    };
  }
}

/**
 * Refresh a Bitbucket access token using the refresh token
 * Updates the workspace document with new tokens
 * 
 * @param workspace - The Bitbucket workspace document
 * @returns Refresh result with success status and new token or error
 */
async function refreshBitbucketAccessToken(
  workspace: IBitbucket_Workspace
): Promise<BitbucketAccessTokenResult> {
  try {
    const refreshResponse = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: workspace.refreshToken!,
        client_id: process.env.BITBUCKET_CLIENT_ID || '',
        client_secret: process.env.BITBUCKET_CLIENT_SECRET || '',
      }),
    });

    if (!refreshResponse.ok) {
      const errorText = await refreshResponse.text();
      logger.error('Failed to refresh Bitbucket access token', {
        status: refreshResponse.status,
        statusText: refreshResponse.statusText,
        error: errorText,
        workspaceSlug: workspace.workspaceSlug
      });
      return {
        success: false,
        error: `Failed to refresh token: ${refreshResponse.statusText}`,
        errorType: 'REFRESH_FAILED'
      };
    }

    const tokenData: any = await refreshResponse.json();
    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const newRefreshToken = tokenData.refresh_token || workspace.refreshToken; // Use new refresh token if provided

    // Update workspace with new tokens
    workspace.accessToken = newAccessToken;
    workspace.refreshToken = newRefreshToken;
    workspace.tokenExpiresAt = newExpiresAt;
    workspace.updatedAt = new Date();
    await workspace.save();

    logger.info('Successfully refreshed Bitbucket access token', {
      workspaceSlug: workspace.workspaceSlug,
      newExpiresAt,
      expiresIn
    });

    return {
      success: true,
      accessToken: newAccessToken
    };

  } catch (error) {
    logger.error('Error refreshing Bitbucket access token', {
      error: error instanceof Error ? error.message : error,
      workspaceSlug: workspace.workspaceSlug
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during token refresh',
      errorType: 'REFRESH_FAILED'
    };
  }
}

/**
 * Check if a Bitbucket workspace has a valid (non-expired) access token
 * 
 * @param workspaceSlug - The Bitbucket workspace slug
 * @returns True if token is valid, false otherwise
 */
export async function hasBitbucketValidToken(workspaceSlug: string): Promise<boolean> {
  try {
    const workspace = await Bitbucket_Workspace.findOne({ workspaceSlug });
    if (!workspace) return false;

    const now = new Date();
    const tokenExpiresAt = new Date(workspace.tokenExpiresAt);
    return now < tokenExpiresAt;
  } catch (error) {
    logger.error('Error checking Bitbucket token validity', {
      error: error instanceof Error ? error.message : error,
      workspaceSlug
    });
    return false;
  }
}
