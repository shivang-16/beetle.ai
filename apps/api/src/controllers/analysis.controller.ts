import { NextFunction, Request, Response } from "express";
import { createSandbox } from "../config/sandbox.js";
import { CustomError } from "../middlewares/error.js";
import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation } from "../queries/github.queries.js";

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

    // Generate GitHub token for private repo access if user is authenticated
    let githubToken = null;
    if (userId) {
      try {
        console.log("🔑 Generating GitHub installation token...");
        const installation = await getUserGitHubInstallation(userId);
        githubToken = await generateInstallationToken(
          installation.installationId
        );
        console.log("✅ GitHub token generated successfully", githubToken);
      } catch (error) {
        console.log("⚠️ Could not generate GitHub token:", error);
        // Continue without token - will work for public repos
      }
    }

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Function to stream data to client
    const streamToClient = (data: string) => {
      console.log("[CLIENT STREAMING]", data); // Log to server console
      res.write(data + "\n"); // Stream to client
    };

    streamToClient("🧠 CodeDetector - Intelligent Code Analysis");
    streamToClient("=".repeat(50));
    streamToClient(`📁 Repository: ${repoUrl}`);
    streamToClient(`🤖 Model: ${model}`);
    streamToClient(`💭 Prompt: ${prompt}`);
    streamToClient("=".repeat(50));
    streamToClient("");

    // Test immediate streaming first
    streamToClient("🔄 Testing real-time streaming...");
    for (let i = 1; i <= 3; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      streamToClient(`⏳ Stream test ${i}/3 - Real-time output working!`);
    }
    streamToClient("✅ Streaming confirmed working, starting analysis...");
    streamToClient("");

    // Construct the analysis command with GitHub token embedded in repo URL
    let authenticatedRepoUrl = repoUrl;
    if (githubToken) {
      // Embed token directly in the repo URL for private repos
      if (repoUrl.startsWith("https://github.com/")) {
        authenticatedRepoUrl = repoUrl.replace(
          "https://github.com/",
          `https://x-access-token:${githubToken}@github.com/`
        );
        streamToClient("🔐 Using GitHub token for private repository access");
      }
    } else {
      streamToClient(
        "🌐 Accessing public repository (no authentication required)"
      );
    }

    // Now the Python script just needs to use the repo URL as-is
    const analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${authenticatedRepoUrl}" "${model}"`;
    streamToClient(
      `🔄 Executing command: ${analysisCommand.replace(githubToken || "", "[TOKEN_HIDDEN]")}`
    );
    streamToClient("");

    // Start the analysis command in the background with streaming
    const command = await sandbox.commands.run(analysisCommand, {
      background: true,
      onStdout: (data) => {
        // Strip ANSI color codes for cleaner client output
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");
        streamToClient(cleanData);
      },
      onStderr: (data) => {
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");
        streamToClient(`⚠️ ${cleanData}`);
      },
      timeoutMs: 3600000,
    });

    // Wait for the command to complete
    const result = await command.wait();

    streamToClient("");
    streamToClient("=".repeat(50));
    streamToClient(`✅ Analysis completed with exit code: ${result.exitCode}`);

    if (result.exitCode === 0) {
      streamToClient("🎉 Analysis finished successfully!");
    } else {
      streamToClient("⚠️ Analysis completed with warnings or errors");
    }

    streamToClient("=".repeat(50));

    // Close the sandbox
    await sandbox.kill();
    streamToClient("🔒 Sandbox closed");

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
