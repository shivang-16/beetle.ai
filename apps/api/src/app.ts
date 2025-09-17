// apps/api/src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import expressWinston from "express-winston";
import winston from "winston";
import { createNodeMiddleware } from "@octokit/webhooks";
import errorMiddleware from "./middlewares/error.js";
import { webhooks } from "./webooks/github.webooks.js";
import { clerkMiddleware } from "@clerk/express";
import GithubRoutes from "./routes/github.routes.js";
import UserRoutes from "./routes/user.routes.js";
import AnalysisRoutes from "./routes/analysis.routes.js";
import TeamRoutes from "./routes/team.routes.js";
import { config } from "dotenv";
// SECURITY FIX: Add security middleware imports
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export function createApp(): Application {
  const app = express();

  config({
    path: "./.env",
  });

  app.use(
    expressWinston.logger({
      transports: [new winston.transports.Console()],
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.cli()
      ),
      meta: true,
      expressFormat: true,
      colorize: true,
    })
  );

  // SECURITY FIX: Add security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // SECURITY FIX: Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  // SECURITY FIX: Stricter rate limiting for analysis endpoint
  const analysisLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 analysis requests per hour
    message: "Too many analysis requests, please try again later.",
  });
  // SECURITY FIX: Environment-specific CORS configuration
  const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS || '').split(',')
    : ["http://localhost:3000", "http://localhost:3001"];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
    })
  );
  app.use(clerkMiddleware());

  // We need express.json() for non-webhook routes, but webhooks need raw body
  app.use((req, res, next) => {
    if (req.path === "/api/webhooks") {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // Root route
  app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
      message: "CodeTector API is running",
    });
  });

  // Apply webhook middleware
  const webhookMiddleware = createNodeMiddleware(webhooks, {
    path: "/api/webhooks",
  });
  app.use(webhookMiddleware);

  // API Routes
  app.use("/api/github", GithubRoutes);
  app.use("/api/user", UserRoutes);
  app.use("/api/analysis", analysisLimiter, AnalysisRoutes); // SECURITY FIX: Apply analysis rate limiter
  app.use("/api/team", TeamRoutes);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: "error",
      message: "Not Found",
      path: req.path,
    });
  });

  app.use(errorMiddleware);

  return app;
}
