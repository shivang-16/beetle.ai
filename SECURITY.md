# Security Implementation Guide

## Overview
This document outlines the security measures implemented in codetector.ai and provides guidance for maintaining a secure application.

## Critical Security Fixes Implemented

### 1. API Key Security
**Issue**: Hardcoded Google AI API key in source code  
**Fix**: Moved to environment variables  
**Implementation**:
```typescript
// Before (VULNERABLE):
const apiKey = "AIzaSyBQxCwkF42OaoCq2M4EMyuzp7N6MM2zZWE";

// After (SECURE):
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new Error("API key not configured");
}
```

### 2. Command Injection Prevention
**Issue**: Unsanitized user input in shell commands  
**Fix**: Input sanitization and validation  
**Implementation**:
```typescript
// Before (VULNERABLE):
const command = `python script.py "${userInput}"`;

// After (SECURE):
const sanitizedInput = sanitizeInput(userInput);
const command = `python script.py "${sanitizedInput}"`;
```

### 3. Security Middleware
**Issue**: Missing security headers and rate limiting  
**Fix**: Added helmet and rate limiting  
**Implementation**:
```typescript
app.use(helmet({
  contentSecurityPolicy: { /* CSP config */ },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### 4. Input Validation
**Issue**: NoSQL injection vulnerabilities  
**Fix**: Comprehensive input validation  
**Implementation**:
```typescript
// Validate MongoDB ObjectIds
if (!isValidObjectId(id)) {
  throw new Error("Invalid ID format");
}

// Validate model names
if (!isValidModel(model)) {
  throw new Error("Invalid model specified");
}
```

### 5. CORS Configuration
**Issue**: Overly permissive CORS settings  
**Fix**: Environment-specific CORS  
**Implementation**:
```typescript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ["http://localhost:3000"];

app.use(cors({ origin: allowedOrigins }));
```

## Security Utilities

### Input Sanitization
```typescript
import { sanitizeInput } from './utils/security.js';

// Remove dangerous characters
const clean = sanitizeInput(userInput);
```

### Validation Functions
```typescript
import { 
  isValidObjectId, 
  isValidModel, 
  isValidGitHubUrl 
} from './utils/security.js';

// Validate inputs before processing
if (!isValidObjectId(id)) return error;
if (!isValidModel(model)) return error;
if (!isValidGitHubUrl(url)) return error;
```

### Secure Logging
```typescript
import { sanitizeForLogging } from './utils/security.js';

// Remove sensitive data from logs
console.log(sanitizeForLogging(data));
```

## Environment Configuration

### Required Environment Variables
Create a `.env` file based on `.env.template`:

```bash
# Critical - API Keys (NEVER commit these)
GOOGLE_AI_API_KEY=your_api_key_here
GITHUB_PRIVATE_KEY_BASE64=your_private_key_here

# Security Configuration
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
SESSION_SECRET=long_random_string_here

# Database
MONGODB_URI=mongodb://localhost:27017/codetector

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Security Best Practices

### 1. Authentication & Authorization
- ✅ Use Clerk for authentication
- ✅ Validate user ownership of resources
- ✅ Implement proper session management
- ✅ Use secure JWT handling

### 2. Input Validation
- ✅ Validate all user inputs
- ✅ Sanitize data for shell commands
- ✅ Use parameterized queries
- ✅ Implement length limits

### 3. Security Headers
- ✅ Content Security Policy (CSP)
- ✅ HTTP Strict Transport Security (HSTS)
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Referrer-Policy

### 4. Rate Limiting
- ✅ General API rate limiting (100 req/15min)
- ✅ Analysis endpoint limiting (10 req/hour)
- ✅ Authentication endpoint limiting (5 req/15min)

### 5. Error Handling
- ✅ Generic error messages in production
- ✅ Detailed logging for debugging
- ✅ No sensitive data in error responses

### 6. Data Protection
- ✅ Encrypt sensitive data at rest
- ✅ Use HTTPS in production
- ✅ Sanitize logs to remove secrets
- ✅ Implement proper data retention

## Security Testing

### Automated Security Checks
Run the security check script:
```bash
npm run security:check
```

### Dependency Auditing
Check for vulnerable dependencies:
```bash
npm audit --audit-level=moderate
```

### Manual Security Testing
1. Test input validation with malicious payloads
2. Verify rate limiting behavior
3. Check error message information disclosure
4. Test authentication bypass attempts
5. Verify CORS configuration

## Incident Response

### If a Security Issue is Discovered:
1. **Immediate**: Stop the affected service if critical
2. **Assess**: Determine scope and impact
3. **Contain**: Limit further damage
4. **Fix**: Implement patches
5. **Verify**: Test the fix thoroughly
6. **Monitor**: Watch for ongoing issues
7. **Document**: Record lessons learned

### Security Contact
- Report security issues to: security@yourdomain.com
- Use responsible disclosure practices
- Provide detailed reproduction steps

## Compliance Considerations

### GDPR Compliance
- User data encryption
- Right to deletion
- Data processing consent
- Privacy by design

### SOC 2 Requirements
- Access controls
- Security monitoring
- Incident response procedures
- Regular security assessments

## Monitoring & Alerting

### Security Events to Monitor
- Failed authentication attempts
- Rate limit violations
- Suspicious input patterns
- Error rate spikes
- Unusual access patterns

### Recommended Tools
- Application monitoring: Datadog, New Relic
- Security monitoring: Snyk, OWASP ZAP
- Log management: ELK Stack, Splunk
- Vulnerability scanning: Qualys, Rapid7

## Regular Security Tasks

### Daily
- Monitor security logs
- Check system alerts
- Review failed login attempts

### Weekly
- Run automated security scans
- Review dependency updates
- Check security metrics

### Monthly
- Conduct security reviews
- Update security documentation
- Review access permissions
- Run penetration tests

### Quarterly
- Security architecture review
- Compliance assessment
- Security training updates
- Incident response drills

## Resources

### Security Standards
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)

### Security Tools
- [ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Snyk](https://snyk.io/)
- [OWASP ZAP](https://www.zaproxy.org/)

---

**Last Updated**: 2024-09-17  
**Version**: 1.0  
**Maintainer**: Security Team