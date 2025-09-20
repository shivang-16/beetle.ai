import {
  appendToRedisBuffer,
  initRedisBuffer,
  finalizeAnalysisAndPersist,
} from "../../utils/analysisStreamStore.js";
import { createSandbox } from "../../config/sandbox.js";
import { Github_Repository } from "../../models/github_repostries.model.js";
import { authenticateGithubRepo } from "../../utils/authenticateGithubUrl.js";
import { randomUUID } from "crypto";

export interface StreamingCallbacks {
  onStdout?: (data: string) => Promise<void>;
  onStderr?: (data: string) => Promise<void>;
  onProgress?: (message: string) => Promise<void>;
}

export interface AnalysisResult {
  success: boolean;
  exitCode: number;
  sandboxId: string | null;
  error?: string;
}

export const executeAnalysis = async (
  github_repositoryId: string,
  repoUrl: string,
  branch: string,
  userId: string,
  model = "gemini-2.5-flash",
  prompt = "Analyze this codebase for security vulnerabilities and code quality",
  analysisType: string,
  callbacks?: StreamingCallbacks,
  data?: any // Optional data parameter for PR analysis or other structured data
): Promise<AnalysisResult> => {
  // Hoisted context for streaming persistence
  let sandboxRef: any | undefined;
  let runExitCode: number | undefined;
  let sandboxId: string = "";
  let analysisId: string = randomUUID();

  try {
    // Authenticate GitHub repository
    const authResult = await authenticateGithubRepo(repoUrl, userId);
    if (!authResult.success) {
      return {
        success: false,
        exitCode: -1,
        sandboxId: null,
        error: authResult.message,
      };
    }

    const repoUrlForAnalysis = authResult.repoUrl;

    console.log("🚀 Starting code analysis...");

    // Notify progress if callback provided
    if (callbacks?.onProgress) {
      await callbacks.onProgress("🚀 Starting code analysis...");
    }

    console.log(`📊 Analysis Configuration:
        Repository: ${repoUrl}
        Model: ${model}
        Prompt: ${prompt}`);

    // Create sandbox instance
    console.log("🔧 Creating E2B sandbox...");
    if (callbacks?.onProgress) {
      await callbacks.onProgress("🔧 Creating E2B sandbox...");
    }

    const sandbox = await createSandbox();
    sandboxRef = sandbox;
    sandboxId = sandbox.sandboxId;
    console.log("✅ Sandbox created successfully");

    if (callbacks?.onProgress) {
      await callbacks.onProgress("✅ Sandbox created successfully");
    }

    await initRedisBuffer(analysisId);
    
    // Debug: Log the data being passed
    // console.log("📊 Data parameter being passed to sandbox:", JSON.stringify(data, null, 2));
    
    // Properly format the data parameter for shell command
    const dataParam = data ? JSON.stringify(data) : '{}';
    console.log("🔧 Formatted data parameter length:", dataParam.length);
    
    const analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --model "${model}" --mode ${analysisType} --api-key ${process.env.GOOGLE_API_KEY} --data '${dataParam.replace(/'/g, "'\"'\"'")}'`;

    if (callbacks?.onProgress) {
      await callbacks.onProgress("🚀 Starting workflow execution...");
    }

    // Start the analysis command in the background with streaming
    const command = await sandbox.commands.run(analysisCommand, {
      background: true,
      onStdout: async (data) => {
        // Strip ANSI color codes for cleaner client output
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");

        // Buffer to Redis
        try {
          await appendToRedisBuffer(analysisId, cleanData);
        } catch (e) {
          console.error("Redis append error:", e);
        }

        // Call streaming callback if provided
        if (callbacks?.onStdout) {
          await callbacks.onStdout(cleanData);
        }
      },
      onStderr: async (data) => {
        const cleanData = data.replace(/\x1b\[[0-9;]*m/g, "");

        // Buffer to Redis
        try {
          await appendToRedisBuffer(analysisId, `⚠️ ${cleanData}`);
        } catch (e) {
          console.error("Redis append error:", e);
        }

        // Call streaming callback if provided
        if (callbacks?.onStderr) {
          await callbacks.onStderr(`⚠️ ${cleanData}`);
        }
      },
      timeoutMs: 3600000,
    });

    // Wait for the command to complete
    const result = await command.wait();
    runExitCode = result.exitCode;

    if (callbacks?.onProgress) {
      await callbacks.onProgress(
        `✅ Analysis completed with exit code: ${result.exitCode}`
      );
    }

    // Close the sandbox
    await sandbox.kill();
    // await sandbox.betaPause();

    if (callbacks?.onProgress) {
      await callbacks.onProgress("🔒 Sandbox closed");
    }

    // Auto-persist analysis results if persistence parameters are provided
    if (userId && repoUrl && github_repositoryId) {
      try {
        const status: "completed" | "error" =
          result.exitCode === 0 ? "completed" : "error";
        await finalizeAnalysisAndPersist({
          analysisId,
          userId,
          repoUrl,
          github_repositoryId,
          sandboxId,
          model,
          prompt,
          status,
          exitCode: result.exitCode,
        });

        if (callbacks?.onProgress) {
          await callbacks.onProgress(
            `💾 Analysis results persisted successfully`
          );
        }
      } catch (persistError) {
        console.error(`❌ Failed to persist analysis results:`, persistError);
        if (callbacks?.onProgress) {
          await callbacks.onProgress(
            `⚠️ Warning: Failed to persist analysis results`
          );
        }
      }
    }

    return {
      success: result.exitCode === 0,
      exitCode: result.exitCode,
      sandboxId: sandboxId,
    };
  } catch (error: any) {
    console.error("❌ Error executing analysis:", error);

    if (callbacks?.onProgress) {
      await callbacks.onProgress(`❌ Error: ${error.message}`);
    }

    // Auto-persist analysis results even on error if persistence parameters are provided
    if (userId && repoUrl && github_repositoryId) {
      try {
        await finalizeAnalysisAndPersist({
          analysisId,
          userId,
          repoUrl,
          github_repositoryId,
          sandboxId,
          model,
          prompt,
          status: "error",
          exitCode: runExitCode || -1,
        });

        if (callbacks?.onProgress) {
          await callbacks.onProgress(`💾 Error analysis results persisted`);
        }
      } catch (persistError) {
        console.error(
          `❌ Failed to persist error analysis results:`,
          persistError
        );
      }
    }

    return {
      success: false,
      exitCode: runExitCode || -1,
      sandboxId: sandboxId,
      error: error.message,
    };
  } finally {
    try {
      if (sandboxRef) await sandboxRef.kill();
    } catch (_) {}
  }
};
