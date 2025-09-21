// Main export for CodeDetector.ai Mail Service
export { MailService, mailService } from './mail_service.js';

// Export all types for convenience
export type {
  MailServiceConfig,
  BaseMailOptions,
  AnalysisCompleteOptions,
  AnalysisErrorOptions,
  WelcomeOptions,
  PasswordResetOptions,
  MarketingOptions,
  CustomMailOptions
} from './types.js';

// Export individual templates if needed
export {
  analysisCompleteTemplate,
  analysisErrorTemplate,
  welcomeTemplate,
  baseTemplate
} from './mail_templates/index.js';