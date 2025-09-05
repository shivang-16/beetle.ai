import { NextFunction, Request, Response } from "express";
import { createSandbox } from "../config/sandbox.js";
import { CustomError } from "../middlewares/error.js";
import { authenticateGithubRepo } from "../utils/authenticateGithubUrl.js";

export const executeAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("🚀 Starting code analysis...");

    // Extract parameters from request body or use defaults
    const {
      repoUrl,
      model = "gemini-2.0-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
    } = req.body;

    const userId = req.user._id;

    console.log(`📊 Analysis Configuration:
        Repository: ${repoUrl}
        Model: ${model}
        Prompt: ${prompt}`);

    // Create sandbox instance
    console.log("🔧 Creating E2B sandbox...");
    const sandbox = await createSandbox();
    console.log("✅ Sandbox created successfully");

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Phase tracking variables
    let isWorkflowRunning = false;
    let phase1Logs: string[] = [];
    let phase2Logs: string[] = [];

    // Function to categorize and stream data to client
    const streamToClient = (data: string, isWorkflowLog = false) => {
      console.log("[CLIENT STREAMING]", data); // Log to server console
      
      if (isWorkflowLog) {
        // Phase 2: Workflow is running - filter for tool_calls and LLM responses
        if (data.includes("TOOL_CALL") || data.includes("LLM_RESPONSE")) {
          phase2Logs.push(data);
          res.write(data + "\n"); // Stream filtered logs to client
        }
      } else {
        // Phase 1: Before workflow starts - send all logs
        phase1Logs.push(data);
        res.write(data + "\n"); // Stream all logs to client
      }

    };

    // Phase 1: Initial setup and configuration logs
    streamToClient("🧠 CodeDetector - Intelligent Code Analysis");
    streamToClient("=".repeat(50));
    streamToClient(`📁 Repository: ${repoUrl}\n`);
    streamToClient(`🤖 Model: ${model}\n`);
    streamToClient(`💭 Prompt: ${prompt}\n`);
    streamToClient("=".repeat(50));
    streamToClient("");

    // Test immediate streaming first
    streamToClient("🔄 Testing real-time streaming...\n");
    for (let i = 1; i <= 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      streamToClient(`⏳ Stream test ${i}/3 - Real-time output working!\n`);
    }
    streamToClient("✅ Streaming confirmed working, starting analysis...\n");
    streamToClient("");

    // Construct the analysis command with GitHub token embedded in repo URL

    const authResult = await authenticateGithubRepo(repoUrl, userId);
    if (!authResult.success) {
      return next(new CustomError(authResult.message, 500));
    }

    const repoUrlForAnalysis = authResult.repoUrl;
    console.log("🔄 Repo URL for analysis: ", repoUrlForAnalysis);

    // Now the Python script just needs to use the repo URL as-is

    const analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" "${model}"`;
    const maskedCommand = authResult.usedToken
      ? analysisCommand.replace(repoUrlForAnalysis, "[TOKEN_HIDDEN]")
      : analysisCommand;
    streamToClient(`🔄 Executing command: ${maskedCommand}`);
    streamToClient("");

    // Phase 2: Workflow execution begins
    streamToClient("🚀 Starting workflow execution...");
    streamToClient("📋 Phase 2: Workflow logs (filtered for tool calls and LLM responses)");
    streamToClient("=".repeat(50));
    isWorkflowRunning = true;

    // Start the analysis command in the background with streaming
    const command = await sandbox.commands.run(analysisCommand, {
      background: true,
      onStdout: (data) => {
        // Strip ANSI color codes for cleaner client output
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");

        streamToClient(cleanData, true); // Mark as workflow log
      },
      onStderr: (data) => {
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");
        streamToClient(`⚠️ ${cleanData}`, true); // Mark as workflow log
      },
      timeoutMs: 3600000,
    });

    // Wait for the command to complete
    const result = await command.wait();


    streamToClient("", true);
    streamToClient("=".repeat(50), true);
    streamToClient(`✅ Analysis completed with exit code: ${result.exitCode}`, true);

    if (result.exitCode === 0) {
      streamToClient("🎉 Analysis finished successfully!", true);
    } else {
      streamToClient("⚠️ Analysis completed with warnings or errors", true);
    }

    streamToClient("=".repeat(50), true);

    // Close the sandbox
    await sandbox.kill();
    streamToClient("🔒 Sandbox closed", true);

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
