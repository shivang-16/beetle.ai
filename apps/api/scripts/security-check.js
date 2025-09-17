#!/usr/bin/env node

/**
 * Security Check Script for codetector.ai
 * Performs automated security checks on the codebase
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔒 Running Security Checks for codetector.ai...\n');

const issues = [];
const warnings = [];
const srcDir = path.join(__dirname, '..', 'src');

// 1. Check for hardcoded secrets
function checkHardcodedSecrets() {
  console.log('1. Checking for hardcoded secrets...');
  
  const secretPatterns = [
    /AIza[0-9A-Za-z_-]{35}/g, // Google API keys
    /sk_[a-zA-Z0-9]{20,}/g,   // Secret keys
    /pk_[a-zA-Z0-9]{20,}/g,   // Public keys  
    /ghp_[a-zA-Z0-9]{36}/g,   // GitHub tokens
    /password\s*[:=]\s*["'][^"']+["']/gi,
    /secret\s*[:=]\s*["'][^"']+["']/gi,
    /token\s*[:=]\s*["'][^"']+["']/gi,
  ];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      secretPatterns.forEach((pattern, idx) => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push(`CRITICAL: Potential hardcoded secret found in ${filePath}: ${matches[0].substring(0, 20)}...`);
        }
      });
    } catch (err) {
      // File might not exist or be readable
    }
  }
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && /\.(ts|js|json)$/.test(item)) {
          scanFile(fullPath);
        }
      });
    } catch (err) {
      // Directory might not exist
    }
  }
  
  scanDirectory(srcDir);
  console.log('   ✓ Hardcoded secrets check completed\n');
}

// 2. Check environment configuration
function checkEnvironmentConfig() {
  console.log('2. Checking environment configuration...');
  
  const envTemplate = path.join(__dirname, '..', '..', '.env.template');
  const envFile = path.join(__dirname, '..', '..', '.env');
  
  if (!fs.existsSync(envTemplate)) {
    warnings.push('WARNING: .env.template file not found');
  }
  
  if (!fs.existsSync(envFile)) {
    warnings.push('WARNING: .env file not found - copy from .env.template');
  }
  
  console.log('   ✓ Environment configuration check completed\n');
}

// 3. Check security middleware
function checkSecurityMiddleware() {
  console.log('3. Checking security middleware...');
  
  const appFile = path.join(srcDir, 'app.ts');
  if (fs.existsSync(appFile)) {
    const content = fs.readFileSync(appFile, 'utf8');
    
    if (!content.includes('helmet')) {
      issues.push('HIGH: Helmet security middleware not found in app.ts');
    }
    
    if (!content.includes('rate-limit') && !content.includes('rateLimit')) {
      issues.push('HIGH: Rate limiting middleware not found in app.ts');
    }
    
    if (content.includes("origin: '*'")) {
      issues.push('HIGH: Overly permissive CORS configuration found');
    }
  } else {
    issues.push('CRITICAL: app.ts file not found');
  }
  
  console.log('   ✓ Security middleware check completed\n');
}

// 4. Check for SQL/NoSQL injection vulnerabilities
function checkInjectionVulnerabilities() {
  console.log('4. Checking for injection vulnerabilities...');
  
  const vulnerablePatterns = [
    /find\s*\(\s*req\.(body|params|query)/g,
    /findById\s*\(\s*req\.(body|params|query)/g,
    /exec\s*\(\s*["'].*\$\{.*\}.*["']\s*\)/g,
    /system\s*\(\s*["'].*\$\{.*\}.*["']\s*\)/g,
  ];
  
  function scanForInjection(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      vulnerablePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          issues.push(`HIGH: Potential injection vulnerability in ${filePath}: ${matches[0]}`);
        }
      });
    } catch (err) {
      // File might not exist
    }
  }
  
  function scanDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.')) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && /\.(ts|js)$/.test(item)) {
          scanForInjection(fullPath);
        }
      });
    } catch (err) {
      // Directory might not exist
    }
  }
  
  scanDirectory(srcDir);
  console.log('   ✓ Injection vulnerability check completed\n');
}

// 5. Check dependencies for vulnerabilities
function checkDependencies() {
  console.log('5. Checking dependencies for vulnerabilities...');
  
  try {
    execSync('npm audit --audit-level=moderate', { stdio: 'pipe' });
    console.log('   ✓ No high/critical dependency vulnerabilities found');
  } catch (error) {
    issues.push('HIGH: Dependency vulnerabilities found - run "npm audit" for details');
  }
  
  console.log('   ✓ Dependency vulnerability check completed\n');
}

// Run all checks
checkHardcodedSecrets();
checkEnvironmentConfig();
checkSecurityMiddleware();
checkInjectionVulnerabilities();
checkDependencies();

// Report results
console.log('📊 Security Check Results:');
console.log('=' .repeat(50));

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ No security issues found!');
} else {
  if (issues.length > 0) {
    console.log(`\n🚨 ${issues.length} Security Issues Found:`);
    issues.forEach((issue, idx) => {
      console.log(`${idx + 1}. ${issue}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} Warnings:`);
    warnings.forEach((warning, idx) => {
      console.log(`${idx + 1}. ${warning}`);
    });
  }
  
  console.log('\n📋 Recommended Actions:');
  console.log('1. Address all CRITICAL and HIGH severity issues immediately');
  console.log('2. Review and fix warnings when possible');
  console.log('3. Run regular security audits');
  console.log('4. Keep dependencies updated');
  console.log('5. Follow secure coding practices');
}

console.log('\n🔒 Security check completed.');

// Exit with error code if critical issues found
const criticalIssues = issues.filter(issue => issue.includes('CRITICAL'));
if (criticalIssues.length > 0) {
  process.exit(1);
}