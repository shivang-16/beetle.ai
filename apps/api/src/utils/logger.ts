import winston from "winston";

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

// Define custom colors for levels
winston.addColors({
  fatal: "bold redBG white",
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
  trace: "grey",
});

// Create the logger
export const logger = winston.createLogger({
  levels: logLevels,
  level: "trace", // allow all levels
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// Helper log functions
export const logFatal = (message: string) => logger.log("fatal", message);
export const logError = (message: string) => logger.log("error", message);
export const logWarn = (message: string) => logger.log("warn", message);
export const logInfo = (message: string) => logger.log("info", message);
export const logDebug = (message: string) => logger.log("debug", message);
export const logTrace = (message: string) => logger.log("trace", message);
