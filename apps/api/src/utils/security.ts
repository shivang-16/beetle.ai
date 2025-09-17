// Security configuration and utilities
export const securityConfig = {
  // Input sanitization patterns
  DANGEROUS_CHARS: /[;&|`$(){}[\]\\<>]/g,
  
  // Allowed model names for analysis
  ALLOWED_MODELS: [
    "gemini-2.5-flash",
    "gemini-pro", 
    "gpt-4",
    "claude-3-sonnet"
  ],
  
  // Maximum lengths for various inputs
  MAX_PROMPT_LENGTH: 1000,
  MAX_REPO_URL_LENGTH: 500,
  MAX_USERNAME_LENGTH: 39, // GitHub limit
  MAX_REPO_NAME_LENGTH: 100, // GitHub limit
  
  // Rate limiting configuration
  RATE_LIMITS: {
    GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    ANALYSIS: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10
    },
    AUTH: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // Stricter for auth endpoints
    }
  },
  
  // Security headers configuration
  SECURITY_HEADERS: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.github.com"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }
};

/**
 * Sanitize input to prevent command injection
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(securityConfig.DANGEROUS_CHARS, '');
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Validate GitHub repository URL
 */
export function isValidGitHubUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > securityConfig.MAX_REPO_URL_LENGTH) return false;
  
  const pattern = /^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:\/.*)?$/;
  const match = url.match(pattern);
  
  if (!match) return false;
  
  const [, owner, repo] = match;
  return owner.length <= securityConfig.MAX_USERNAME_LENGTH && 
         repo.length <= securityConfig.MAX_REPO_NAME_LENGTH;
}

/**
 * Validate model name
 */
export function isValidModel(model: string): boolean {
  return securityConfig.ALLOWED_MODELS.includes(model);
}

/**
 * Sanitize data for logging (remove sensitive information)
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    // Remove tokens, keys, and other sensitive patterns
    return data
      .replace(/(?:token|key|password|secret)[":=]\s*"[^"]+"/gi, '$1": "[REDACTED]"')
      .replace(/(?:AIza|sk_|pk_|ghp_)[a-zA-Z0-9_-]+/g, '[REDACTED]')
      .replace(/x-access-token:[^@]+@/g, 'x-access-token:[REDACTED]@');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (/token|key|password|secret/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Generate secure error messages for production
 */
export function getSecureErrorMessage(error: any, isProduction: boolean = process.env.NODE_ENV === 'production'): string {
  if (!isProduction) {
    return error.message || 'An error occurred';
  }
  
  // Generic messages for production to prevent information disclosure
  if (error.name === 'ValidationError') return 'Invalid input provided';
  if (error.name === 'CastError') return 'Invalid request format';
  if (error.code === 11000) return 'Resource already exists';
  if (error.status === 404) return 'Resource not found';
  if (error.status === 401) return 'Authentication required';
  if (error.status === 403) return 'Access denied';
  
  return 'An unexpected error occurred. Please try again later.';
}