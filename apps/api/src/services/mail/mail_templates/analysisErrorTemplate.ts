import { AnalysisCompleteOptions, AnalysisErrorOptions } from '../types.js';
import { baseTemplate } from './baseTemplate.js';

export const analysisErrorTemplate = (options: AnalysisErrorOptions) => {
  const { username, repositoryName, analysisId, errorMessage, errorCode } = options;

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return baseTemplate(`
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; border-radius: 8px; margin-bottom: 16px;">
        <span style="font-size: 20px; margin-right: 8px;">❌</span>
        <span style="font-size: 18px; font-weight: 600;">Analysis Failed</span>
      </div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937;">
        Analysis Error for ${repositoryName || 'Your Repository'}
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">
        ${username ? `Hi ${username}, we` : 'We'} encountered an issue while analyzing your code
      </p>
    </div>

    <!-- Error Details -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #dc2626;">
        🚨 Error Details
      </h2>
      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151;">Repository:</strong> 
          <span style="color: #6b7280;">${repositoryName || 'Unknown'}</span>
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151;">Analysis ID:</strong> 
          <span style="color: #6b7280; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;">${analysisId || 'N/A'}</span>
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151;">Error Code:</strong> 
          <span style="color: #dc2626; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;">${errorCode || 'UNKNOWN_ERROR'}</span>
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: #374151;">Time:</strong> 
          <span style="color: #6b7280;">${formatDate(new Date())}</span>
        </div>
      </div>
      
      ${errorMessage ? `
      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px;">
        <strong style="color: #374151;">Error Message:</strong>
        <p style="margin: 8px 0 0 0; color: #7f1d1d; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 14px; line-height: 1.5; background-color: #fef2f2; padding: 12px; border-radius: 4px;">
          ${errorMessage}
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Common Solutions -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #0369a1;">
        🔧 Common Solutions
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Check if the repository URL is correct and accessible</li>
        <li style="margin-bottom: 8px;">Ensure the repository is public or you have proper access permissions</li>
        <li style="margin-bottom: 8px;">Verify that the repository contains analyzable code files</li>
        <li style="margin-bottom: 8px;">Check if the repository size is within our limits</li>
        <li>Try running the analysis again after a few minutes</li>
      </ul>
    </div>

    <!-- Next Steps -->
    <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        🚀 What to Do Next
      </h3>
      <ol style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Review the error details above</li>
        <li style="margin-bottom: 8px;">Try the common solutions listed</li>
        <li style="margin-bottom: 8px;">If the issue persists, contact our support team</li>
        <li>You can retry the analysis from your dashboard</li>
      </ol>
    </div>

    <!-- Support Information -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        📞 Need Help?
      </h3>
      <p style="margin: 0 0 16px 0; color: #6b7280; line-height: 1.6;">
        If you continue to experience issues, our support team is here to help. When contacting support, please include:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.6;">
        <li style="margin-bottom: 4px;">Analysis ID: <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;">${analysisId || 'N/A'}</code></li>
        <li style="margin-bottom: 4px;">Error Code: <code style="background-color: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;">${errorCode || 'UNKNOWN_ERROR'}</code></li>
        <li>Repository URL and any relevant details</li>
      </ul>
    </div>
  `);
};