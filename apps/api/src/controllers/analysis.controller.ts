import { NextFunction, Request, Response } from "express";
import { createSandbox } from "../config/sandbox.js";
import { CustomError } from "../middlewares/error.js";
import { authenticateGithubRepo } from "../utils/authenticateGithubUrl.js";
import { randomUUID } from "crypto";
import {
  initRedisBuffer,
  appendToRedisBuffer,
  finalizeAnalysisAndPersist,
} from "../utils/analysisStreamStore.js";
import Analysis from "../models/analysis.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";

export const executeAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Hoisted context for streaming persistence
  let analysisId: string = randomUUID();
  let sandboxRef: any | undefined;
  let runExitCode: number | undefined;
  let clientAborted = false;
  let userId!: string;
  let repoUrl: string = "";
  let modelParam: string = "gemini-2.5-flash";
  let promptParam: string =
    "Analyze this codebase for security vulnerabilities and code quality";
  let githubRepositoryId: string = "";
  let sandboxId: string = "";
  try {
    console.log("🚀 Starting code analysis...");

    // Extract parameters from request body or use defaults
    const {
      // repoUrl,
      github_repositoryId,
      branch,
      model = "gemini-2.5-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
    } = req.body;

    const github_repository =
      await Github_Repository.findById(github_repositoryId);

    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    if (github_repository.analysisRequired === false) {
      return next(
        new CustomError("You haven't enabled analysis for this repository", 400)
      );
    }

    const branchForAnalysis = branch || github_repository.defaultBranch;
    // Persist the resolved repo id for finalize
    githubRepositoryId = String(github_repository._id);
    repoUrl = `https://github.com/${github_repository.fullName}`;

    userId = req.user._id;
    // repoUrlParam = repoUrl;
    modelParam = model;
    promptParam = prompt;

    console.log(`📊 Analysis Configuration:
        Repository: ${repoUrl}
        Model: ${model}
        Prompt: ${prompt}`);

    // Create sandbox instance
    console.log("🔧 Creating E2B sandbox...");
    const sandbox = await createSandbox();
    sandboxRef = sandbox;
    console.log("✅ Sandbox created successfully");

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Detect client interruption and init Redis buffer
    req.on("aborted", () => {
      clientAborted = true;
    });
    res.on("close", () => {
      if (!res.writableEnded) clientAborted = true;
    });
    await initRedisBuffer(analysisId);

    // Phase tracking variables
    let isWorkflowRunning = false;
    let phase1Logs: string[] = [];
    let phase2Logs: string[] = [];

    // Function to categorize and stream data to client
    const streamToClient = async (data: string, isWorkflowLog = false) => {
      console.log("[CLIENT STREAMING]", data);
      try {
        await appendToRedisBuffer(analysisId, data);
      } catch (e) {
        console.error("Redis append error:", e);
      }

      if (isWorkflowLog) {
        // Phase 2: Stream ALL workflow logs so the frontend parser receives
        // full LLM blocks and markers like [LLM RESPONSE START],
        // [GITHUB_ISSUE_START], and [PATCH_START].
        phase2Logs.push(data);
        res.write(data + "\n");
      } else {
        // Phase 1: Before workflow starts - send all logs
        phase1Logs.push(data);
        res.write(data + "\n");
      }
    };

    // Phase 1: Initial setup and configuration logs
    await streamToClient("🧠 CodeDetector - Intelligent Code Analysis");
    await streamToClient("=".repeat(50));
    await streamToClient(`📁 Repository: ${repoUrl}\n`);
    await streamToClient(`🤖 Model: ${model}\n`);
    await streamToClient(`💭 Prompt: ${prompt}\n`);
    await streamToClient("=".repeat(50));
    await streamToClient("");

    // Test immediate streaming first
    await streamToClient("🔄 Testing real-time streaming...\n");
    for (let i = 1; i <= 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await streamToClient(
        `⏳ Stream test ${i}/3 - Real-time output working!\n`
      );
    }
    await streamToClient(
      "✅ Streaming confirmed working, starting analysis...\n"
    );
    await streamToClient("");

    // Construct the analysis command with GitHub token embedded in repo URL

    const authResult = await authenticateGithubRepo(repoUrl, userId);
    if (!authResult.success) {
      return next(new CustomError(authResult.message, 500));
    }

    const repoUrlForAnalysis = authResult.repoUrl;
    console.log("🔄 Repo URL for analysis: ", repoUrlForAnalysis);

    // Now the Python script just needs to use the repo URL as-is

    const analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --branch "${branchForAnalysis}" --model "${model}" --mode=full_repo_analysis --api-key ${process.env.GOOGLE_API_KEY}`;
    const maskedCommand = authResult.usedToken
      ? analysisCommand.replace(repoUrlForAnalysis, "[TOKEN_HIDDEN]")
      : analysisCommand;
    await streamToClient(`🔄 Executing command: ${maskedCommand}`);
    await streamToClient("");

    // Phase 2: Workflow execution begins
    await streamToClient("🚀 Starting workflow execution...");
    await streamToClient(
      "📋 Phase 2: Workflow logs (filtered for tool calls and LLM responses)"
    );
    await streamToClient("=".repeat(50));
    isWorkflowRunning = true;

    // Start the analysis command in the background with streaming
    const command = await sandbox.commands.run(analysisCommand, {
      background: true,
      onStdout: async (data) => {
        // Strip ANSI color codes for cleaner client output
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");

        await streamToClient(cleanData, true); // Mark as workflow log
      },
      onStderr: async (data) => {
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");
        await streamToClient(`⚠️ ${cleanData}`, true); // Mark as workflow log
      },
      timeoutMs: 3600000,
    });

    // Wait for the command to complete
    const result = await command.wait();
    runExitCode = result.exitCode;

    await streamToClient("", true);
    await streamToClient("=".repeat(50), true);
    await streamToClient(
      `✅ Analysis completed with exit code: ${result.exitCode}`,
      true
    );

    if (result.exitCode === 0) {
      await streamToClient("🎉 Analysis finished successfully!", true);
    } else {
      await streamToClient(
        "⚠️ Analysis completed with warnings or errors",
        true
      );
    }

    await streamToClient("=".repeat(50), true);

    // Close the sandbox
    await sandbox.kill();
    await sandbox.betaPause();
    sandboxId = sandbox.sandboxId;
    await streamToClient("🔒 Sandbox closed", true);

    // End the response
    res.end();
  } catch (error: any) {
    console.error("❌ Error executing analysis:", error);

    // If response hasn't been sent yet, send error response
    if (!res.headersSent) {
      next(new CustomError(error.message || "Failed to execute analysis", 500));
    } else {
      // If streaming has started, write error to stream
      res.write(`\n❌ Error: ${error.message || "Analysis failed"}\n`);
      res.end();
    }
  } finally {
    try {
      if (sandboxRef) await sandboxRef.kill();
    } catch (_) {}

    try {
      if (analysisId && userId && repoUrl) {
        const status: "completed" | "interrupted" | "error" = clientAborted
          ? "interrupted"
          : typeof runExitCode === "number" && runExitCode === 0
            ? "completed"
            : "error";

        await finalizeAnalysisAndPersist({
          analysisId,
          userId,
          repoUrl: repoUrl,
          github_repositoryId: githubRepositoryId,
          sandboxId: sandboxId,
          model: modelParam,
          prompt: promptParam,
          status,
          exitCode: typeof runExitCode === "number" ? runExitCode : null,
        });
      }
    } catch (persistErr) {
      console.error("Failed to persist analysis:", persistErr);
    }
  }
};

export const getAnalysisStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // This can be extended later to check analysis status
    res.json({
      success: true,
      message: "Analysis service is running",
      templateId: process.env.E2B_SANDBOX_TEMPLATE || "gh622yvblp3exdpk9tya",
    });
  } catch (error: any) {
    console.error("Error checking analysis status:", error);
    next(
      new CustomError(error.message || "Failed to check analysis status", 500)
    );
  }
};

export const getRepositoryAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { github_repositoryId } = req.params as {
      github_repositoryId: string;
    };
    console.log("🔄 Getting analysis: ", github_repositoryId);

    let doc = null as any;
    try {
      doc = await Analysis.find({
        github_repositoryId: github_repositoryId,
      }).sort({ createdAt: -1 });
      // console.log("🔄 Doc: ", doc);
    } catch (_) {
      // ignore cast errors
    }

    if (!doc) {
      return next(new CustomError("Analysis not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: doc.map((d: any) => ({
        _id: d._id,
        analysisId: d.analysisId,
        userId: d.userId,
        repoUrl: d.repoUrl,
        model: d.model,
        prompt: d.prompt,
        status: d.status,
        exitCode: d.exitCode,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching analysis:", error);
    next(new CustomError(error.message || "Failed to fetch analysis", 500));
  }
};

export const getRepositoryAnalysisLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params as { id: string };
    console.log("🔄 Getting analysis: ", id);

    let doc = null as any;
    try {
      doc = await Analysis.findById(id).lean();
      // console.log("🔄 Doc: ", doc);
    } catch (_) {
      // ignore cast errors
    }

    if (!doc) {
      return next(new CustomError("Analysis not found", 404));
    }

    return res.status(200).json({
      success: true,
      data: doc,
    });
  } catch (error: any) {
    console.error("Error fetching analysis:", error);
    next(new CustomError(error.message || "Failed to fetch analysis", 500));
  }
};
