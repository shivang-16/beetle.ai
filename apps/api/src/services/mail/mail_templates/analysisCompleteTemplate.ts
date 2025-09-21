import { baseTemplate } from './baseTemplate.js';
import { AnalysisCompleteOptions } from '../mail_service.js';

export const analysisCompleteTemplate = (options: AnalysisCompleteOptions) => {
  const { username, repositoryName, analysisType, analysisResults, dashboardLink, analysisId } = options;

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

  // Get severity badge color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  return baseTemplate(`
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; border-radius: 8px; margin-bottom: 16px;">
        <span style="font-size: 20px; margin-right: 8px;">✅</span>
        <span style="font-size: 18px; font-weight: 600;">Analysis Complete</span>
      </div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937;">
        ${repositoryName || 'Your Repository'} Analysis Results
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">
        ${username ? `Hi ${username}, your` : 'Your'} ${analysisType || 'code'} analysis is ready
      </p>
    </div>

    <!-- Analysis Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1f2937;">
        📊 Analysis Summary
      </h2>
      <p style="margin: 0 0 20px 0; color: #6b7280; line-height: 1.6;">
        ${analysisResults?.summary || 'Analysis completed successfully'}
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 20px 0;">
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #1f2937;">${analysisResults?.issuesFound || 0}</div>
          <div style="font-size: 14px; color: #6b7280;">Issues Found</div>
        </div>
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #dc2626;">${analysisResults?.criticalIssues || 0}</div>
          <div style="font-size: 14px; color: #6b7280;">Critical Issues</div>
        </div>
        <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #10b981;">${analysisType || 'Full'}</div>
          <div style="font-size: 14px; color: #6b7280;">Analysis Type</div>
        </div>
      </div>
    </div>

    <!-- Analysis Details -->
    <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        🔍 Analysis Details
      </h3>
      <div style="margin-bottom: 16px;">
        <strong style="color: #374151;">Repository:</strong> 
        <span style="color: #6b7280;">${repositoryName || 'Unknown'}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <strong style="color: #374151;">Analysis ID:</strong> 
        <span style="color: #6b7280; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;">${analysisId || 'N/A'}</span>
      </div>
      <div style="margin-bottom: 16px;">
        <strong style="color: #374151;">Completed:</strong> 
        <span style="color: #6b7280;">${formatDate(new Date())}</span>
      </div>
    </div>

    ${analysisResults?.issuesFound && analysisResults.issuesFound > 0 ? `
    <!-- Issues Found -->
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #dc2626;">
        ⚠️ Issues Detected (${analysisResults.issuesFound})
      </h3>
      <p style="margin: 0 0 16px 0; color: #7f1d1d; line-height: 1.6;">
        We found ${analysisResults.issuesFound} issue${analysisResults.issuesFound === 1 ? '' : 's'} that ${analysisResults.issuesFound === 1 ? 'needs' : 'need'} your attention.
        ${analysisResults.criticalIssues > 0 ? `${analysisResults.criticalIssues} of these ${analysisResults.criticalIssues === 1 ? 'is' : 'are'} marked as critical.` : ''}
      </p>
      <div style="background-color: white; border: 1px solid #f3f4f6; border-radius: 6px; padding: 16px;">
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          View the detailed analysis report in your dashboard to see specific issues, affected files, and recommended fixes.
        </p>
      </div>
    </div>
    ` : ''}

    ${analysisResults?.suggestions && analysisResults.suggestions.length > 0 ? `
    <!-- Recommendations -->
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #0369a1;">
        💡 Recommendations (${analysisResults.suggestions.length})
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #0c4a6e; line-height: 1.6;">
        ${analysisResults.suggestions.map((suggestion: string) => `
          <li style="margin-bottom: 8px;">${suggestion}</li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- Action Buttons -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${dashboardLink || 'https://codetector.ai/dashboard'}" style="display: inline-block; padding: 16px 32px; background-color: #667eea; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin-right: 16px;">
        View Full Report
      </a>
      ${analysisResults?.issuesFound && analysisResults.issuesFound > 0 ? `
      <a href="${dashboardLink || 'https://codetector.ai/dashboard'}/issues" style="display: inline-block; padding: 16px 32px; background-color: transparent; color: #667eea; text-decoration: none; border: 2px solid #667eea; border-radius: 8px; font-size: 16px; font-weight: 600;">
        Fix Issues
      </a>
      ` : ''}
    </div>

    <!-- Next Steps -->
    <div style="background-color: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
        🚀 What's Next?
      </h3>
      <ul style="margin: 0; padding-left: 20px; color: #6b7280; line-height: 1.6;">
        <li style="margin-bottom: 8px;">Review the detailed analysis report in your dashboard</li>
        ${analysisResults?.issuesFound && analysisResults.issuesFound > 0 ? `
        <li style="margin-bottom: 8px;">Address critical and high-priority issues first</li>
        <li style="margin-bottom: 8px;">Use our automated fix suggestions where available</li>
        ` : ''}
        <li style="margin-bottom: 8px;">Set up continuous monitoring for future commits</li>
        <li>Share results with your team for collaborative improvement</li>
      </ul>
    </div>
  `);
};