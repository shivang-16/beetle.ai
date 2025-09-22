// Log levels (similar to Winston levels)
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  HTTP = 3,
  VERBOSE = 4,
  DEBUG = 5,
  SILLY = 6,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'error',
  [LogLevel.WARN]: 'warn',
  [LogLevel.INFO]: 'info',
  [LogLevel.HTTP]: 'http',
  [LogLevel.VERBOSE]: 'verbose',
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.SILLY]: 'silly',
};

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  environment: 'client' | 'server' | 'edge';
  url?: string;
  userAgent?: string;
}

class Logger {
  private currentLogLevel: LogLevel;
  private isProduction: boolean;
  private betterStackEnabled: boolean;
  private betterStackToken?: string;
  private betterStackUrl?: string;

  constructor() {
    // Determine environment and configuration
    this.isProduction = process.env.NODE_ENV === 'production';
    this.betterStackToken = process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN;
    
    // Ensure Better Stack URL has proper protocol
    const rawUrl = process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_URL;
    if (rawUrl) {
      this.betterStackUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    }
    
    this.betterStackEnabled = !!(this.betterStackToken && this.betterStackUrl);
    
    // Set log level from environment or default
    const envLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL?.toLowerCase();
    this.currentLogLevel = this.parseLogLevel(envLogLevel) ?? LogLevel.INFO;
  }

  private parseLogLevel(level?: string): LogLevel | null {
    if (!level) return null;
    
    const levelMap: Record<string, LogLevel> = {
      error: LogLevel.ERROR,
      warn: LogLevel.WARN,
      info: LogLevel.INFO,
      http: LogLevel.HTTP,
      verbose: LogLevel.VERBOSE,
      debug: LogLevel.DEBUG,
      silly: LogLevel.SILLY,
    };
    
    return levelMap[level] ?? null;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLogLevel;
  }

  private getEnvironment(): 'client' | 'server' | 'edge' {
    // Check if we're in the browser
    if (typeof window !== 'undefined') {
      return 'client';
    }
    
    // Check if we're in Edge Runtime
    if (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) {
      return 'edge';
    }
    
    // Default to server
    return 'server';
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level].toUpperCase();
    const env = this.getEnvironment();
    
    if (this.isProduction) {
      // JSON format for production
      const logEntry: LogEntry = {
        timestamp,
        level: levelName,
        message,
        environment: env,
        ...(meta && { meta }),
      };
      
      // Add browser-specific info if available
      if (typeof window !== 'undefined') {
        logEntry.url = window.location.href;
        logEntry.userAgent = navigator.userAgent;
      }
      
      return JSON.stringify(logEntry);
    } else {
      // Human-readable format for development
      const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
      return `[${timestamp}] ${levelName} [${env}]: ${message}${metaStr}`;
    }
  }

  private async sendToBetterStack(level: LogLevel, message: string, meta?: any): Promise<void> {
    if (!this.betterStackEnabled || !this.betterStackToken || !this.betterStackUrl) {
      return;
    }

    console.log('Sending log to Better Stack:', { level, message, meta });
    
    try {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LOG_LEVEL_NAMES[level],
        message,
        environment: this.getEnvironment(),
        ...(meta && { meta }),
      };

      // Add browser-specific info if available
      if (typeof window !== 'undefined') {
        logEntry.url = window.location.href;
        logEntry.userAgent = navigator.userAgent;
      }

      // Send to Better Stack
      await fetch(this.betterStackUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.betterStackToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // Silently fail to avoid logging loops
      console.error('Failed to send log to Better Stack:', error);
    }
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);
    const levelName = LOG_LEVEL_NAMES[level];

    // Log to console using appropriate method
    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.DEBUG:
      case LogLevel.VERBOSE:
      case LogLevel.SILLY:
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // Send to Better Stack asynchronously (don't await to avoid blocking)
    if (this.betterStackEnabled) {
      this.sendToBetterStack(level, message, meta).catch(() => {
        // Silently handle errors to avoid logging loops
      });
    }
  }

  // Public logging methods (matching your API logger interface)
  error(message: string, meta?: any): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  http(message: string, meta?: any): void {
    this.log(LogLevel.HTTP, message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.log(LogLevel.VERBOSE, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  silly(message: string, meta?: any): void {
    this.log(LogLevel.SILLY, message, meta);
  }

  // Generic log method
  logLevel(level: string, message: string, meta?: any): void {
    const logLevel = this.parseLogLevel(level);
    if (logLevel !== null) {
      this.log(logLevel, message, meta);
    }
  }

  // Utility methods for common use cases
  
  // Log API requests/responses
  apiRequest(method: string, url: string, meta?: any): void {
    this.http(`${method} ${url}`, meta);
  }

  apiResponse(method: string, url: string, status: number, meta?: any): void {
    this.http(`${method} ${url} - ${status}`, meta);
  }

  // Log user actions
  userAction(action: string, userId?: string, meta?: any): void {
    this.info(`User action: ${action}`, { userId, ...meta });
  }

  // Log performance metrics
  performance(metric: string, value: number, unit: string = 'ms', meta?: any): void {
    this.info(`Performance: ${metric}`, { value, unit, ...meta });
  }

  // Log errors with stack traces
  exception(error: Error, context?: string, meta?: any): void {
    this.error(`Exception${context ? ` in ${context}` : ''}: ${error.message}`, {
      stack: error.stack,
      name: error.name,
      ...meta,
    });
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for testing or custom instances
export { Logger };

// Export types for TypeScript users
export type { LogEntry };