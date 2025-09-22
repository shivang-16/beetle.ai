// apps/api/src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import expressWinston from "express-winston";
import { createNodeMiddleware } from "@octokit/webhooks";
import errorMiddleware from "./middlewares/error.js";
import { webhooks } from "./webooks/github.webooks.js";
import { clerkMiddleware } from "@clerk/express";
import GithubRoutes from "./routes/github.routes.js";
import UserRoutes from "./routes/user.routes.js";
import AnalysisRoutes from "./routes/analysis.routes.js";
import TeamRoutes from "./routes/team.routes.js";
import SandboxRoutes from "./routes/sandbox.routes.js";
import { config } from "dotenv";
import { logger, winstonLogger } from "./utils/logger.js";

export function createApp(): Application {
  const app = express();

  config({
    path: "./.env",
  });

  app.use(
    expressWinston.logger({
      winstonInstance: winstonLogger,
      meta: true,
      expressFormat: true,
      colorize: true,
    })
  );

  // Middleware
  app.use(
    cors({
      origin: [process.env.FRONTEND_URL!, "http://localhost:3000", "https://codetector-ai-web.vercel.app"], // Specific origin instead of '*'
      credentials: true,
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

  // Health check endpoint for Docker/ECS
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
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
  app.use("/api/analysis", AnalysisRoutes);
  app.use("/api/team", TeamRoutes);
  app.use("/api/sandbox", SandboxRoutes);

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
