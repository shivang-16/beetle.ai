// Type definitions for MailService

export interface BaseMailOptions {
  to: string;
  from?: string;
  replyTo?: string;
  message?: string;
}

export interface AnalysisCompleteOptions extends BaseMailOptions {
  username: string;
  repositoryName: string;
  repositoryUrl: string;
  analysisId: string;
  analysisType: 'security' | 'quality' | 'performance' | 'full';
  analysisResults: {
    issuesFound: number;
    criticalIssues: number;
    suggestions: string[];
    summary: string;
  };
  dashboardLink: string;
}

export interface AnalysisErrorOptions extends BaseMailOptions {
  username: string;
  repositoryName: string;
  repositoryUrl: string;
  analysisId: string;
  errorMessage: string;
  errorCode?: string;
  supportLink: string;
}

export interface WelcomeOptions extends BaseMailOptions {
  username: string;
  dashboardLink: string;
}

export interface PasswordResetOptions extends BaseMailOptions {
  username: string;
  message: string;
}

export interface MarketingOptions extends BaseMailOptions {
  username: string;
  subject: string;
  content: string;
  unsubscribeLink: string;
  preferencesLink: string;
}

export interface CustomMailOptions extends BaseMailOptions {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// Mail service configuration
export interface MailServiceConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
  from?: string;
  rateLimitPerMinute?: number;
}