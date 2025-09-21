// Core templates for codetector.ai
export { baseTemplate } from './baseTemplate.js';
export { defaultTemplate } from './defaultTemplate.js';

// Analysis-related templates
export { analysisCompleteTemplate } from './analysisCompleteTemplate.js';
export { analysisErrorTemplate } from './analysisErrorTemplate.js';

// User management templates
export { welcomeTemplate } from './welcomeTemplate.js';

// Template type mapping for easy access
export const templates = {
  default: 'defaultTemplate',
  analysisComplete: 'analysisCompleteTemplate',
  analysisError: 'analysisErrorTemplate',
  welcome: 'welcomeTemplate',
} as const;

export type TemplateType = keyof typeof templates;
