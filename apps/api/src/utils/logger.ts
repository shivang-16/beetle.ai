import winston from "winston";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";
import { config } from "dotenv";

config();

/**
 * Logger Configuration
 * 
 * This logger is designed to work in multiple environments:
 * 
 * 1. Development (without BetterStack):
 *    - Only console transport with colorized output
 *    - No external logging service required
 * 
 * 2. Development/Production (with BetterStack):
 *    - Console transport + BetterStack transport
 *    - Requires BETTERSTACK_SOURCE_TOKEN and BETTERSTACK_INGESTING_HOST
 * 
 * 3. Production (without BetterStack):
 *    - Console transport with JSON format
 *    - Suitable for container logs or other log aggregation
 * 
 * Environment Variables:
 * - BETTERSTACK_SOURCE_TOKEN: Optional, enables BetterStack logging
 * - BETTERSTACK_INGESTING_HOST: Optional, BetterStack endpoint
 * - NODE_ENV: Affects console log formatting
 * - LOG_LEVEL: Controls log verbosity (default: silly)
 */

// Use standard Winston log levels for better BetterStack filtering
// These levels are: error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
const logLevels = winston.config.npm.levels;

// Define colors for standard Winston levels
winston.addColors({
  error: "red",
  warn: "yellow", 
  info: "green",
  http: "magenta",
  verbose: "cyan",
  debug: "blue",
  silly: "grey",
});

class Logger {
  private winstonLogger: winston.Logger;

  constructor() {
    // Create transports array
    const transports: winston.transport[] = [];
    
    // Only add BetterStack transport if environment variables are provided
    if (process.env.BETTERSTACK_SOURCE_TOKEN && process.env.BETTERSTACK_INGESTING_HOST) {
      console.log("BetterStack logging enabled");
      const logtail = new Logtail(process.env.BETTERSTACK_SOURCE_TOKEN, {
        endpoint: `https://${process.env.BETTERSTACK_INGESTING_HOST}`,
      });
      transports.push(new LogtailTransport(logtail));
    }
    
    // Always add console transport, but with different formatting for production vs development
    if (process.env.NODE_ENV === "production") {
      // Simple JSON format for production console logs
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.json()
          ),
        })
      );
    } else {
      // Colorized and formatted for development
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
              return `[${timestamp}] ${level}: ${message}`;
            })
          ),
        })
      );
    }

    // Ensure we have at least one transport (fallback to console if none configured)
    if (transports.length === 0) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.simple()
          ),
        })
      );
    }

    this.winstonLogger = winston.createLogger({
      levels: logLevels,
      level: process.env.LOG_LEVEL || "silly", // allow all levels by default
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
    });
  }

  // Standard Winston log level methods
  error(message: string, meta?: any): void {
    this.winstonLogger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.winstonLogger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.winstonLogger.info(message, meta);
  }

  http(message: string, meta?: any): void {
    this.winstonLogger.http(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.winstonLogger.verbose(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.winstonLogger.debug(message, meta);
  }

  silly(message: string, meta?: any): void {
    this.winstonLogger.silly(message, meta);
  }

  // Generic log method
  log(level: string, message: string, meta?: any): void {
    this.winstonLogger.log(level, message, meta);
  }

  // Get the underlying Winston logger instance for express-winston
  getWinstonInstance(): winston.Logger {
    return this.winstonLogger;
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export the Winston instance for express-winston compatibility
export const winstonLogger = logger.getWinstonInstance();
