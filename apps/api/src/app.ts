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

export function createApp(): Application {
  const app = express();

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

  // Middleware
  app.use(
    cors({
      origin: "http://localhost:3000", // Specific origin instead of '*'
      credentials: true,
    })
  );
  app.use(clerkMiddleware());

  // We need express.json() for non-webhook routes, but webhooks need raw body
  app.use((req, res, next) => {
    if (req.path === "/api/webhooks") {
      console.log("Webhook received", req.body);
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
  app.use("/api/analysis", AnalysisRoutes);

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
