import {
  appendToRedisBuffer,
  initRedisBuffer,
  finalizeAnalysisAndPersist,
} from "../../utils/analysisStreamStore.js";
import { connectSandbox, createSandbox } from "../../config/sandbox.js";
import { authenticateGithubRepo } from "../../utils/authenticateGithubUrl.js";
import Analysis from "../../models/analysis.model.js";
import mongoose from "mongoose";
import { mailService } from "../mail/mail_service.js";
import Team from "../../models/team.model.js";

export interface StreamingCallbacks {
  onStdout?: (data: string) => Promise<void>;
  onStderr?: (data: string) => Promise<void>;
  onProgress?: (message: string) => Promise<void>;
}

export interface AnalysisResult {
  success: boolean;
  exitCode: number;
  sandboxId: string | null;
  _id: string;
  error?: string;
}

export const executeAnalysis = async (
  github_repositoryId: string,
  repoUrl: string,
  branch: string,
  userId: string,
  model = "gemini-2.0-flash",
  prompt = "Analyze this codebase for security vulnerabilities and code quality",
  analysisType: string,
  callbacks?: StreamingCallbacks,
  data?: any, // Optional data parameter for PR analysis or other structured data
  userEmail?: string, // Optional email parameter to send analysis results
  teamId?: string,
  preCreatedAnalysisId?: string // Optional pre-created analysis ID
): Promise<AnalysisResult> => {
  // Hoisted context for streaming persistence
  let sandboxRef: any | undefined;
  let runExitCode: number | undefined;
  let sandboxId: string = "";
  let _id: mongoose.Types.ObjectId = preCreatedAnalysisId 
    ? new mongoose.Types.ObjectId(preCreatedAnalysisId)
    : new mongoose.Types.ObjectId();

  try {
    const latestAnalysis = await Analysis.findOne({
      github_repositoryId: new mongoose.Types.ObjectId(github_repositoryId),
    }).sort({ createdAt: -1 });

    let owner = userId;
    if (teamId && teamId !== 'null') {
      const team = await Team.findById(teamId);
      if (!team) {
        return {
        success: false,
        exitCode: -1,
        sandboxId: null,
        _id: new mongoose.Types.ObjectId().toString(),
        error: "Team not found",
      };;
      }
      owner = team.ownerId;
      console.log("setting owner form team")
    }
    // Authenticate GitHub repository
    const authResult = await authenticateGithubRepo(repoUrl, owner);
    if (!authResult.success) {
      return {
        success: false,
        exitCode: -1,
        sandboxId: null,
        _id: new mongoose.Types.ObjectId().toString(),
        error: authResult.message,
      };
    }

    const repoUrlForAnalysis = authResult.repoUrl;

    // Create analysis record upfront with 'running' status (only if not pre-created)
    if (!preCreatedAnalysisId) {
      try {
        await Analysis.create({
          _id,
          analysis_type: analysisType,
          userId,
          repoUrl,
          github_repositoryId,
          sandboxId: "", // Will be updated once sandbox is created
          model,
          prompt,
          status: "running",
        });
        console.log(`📝 Analysis record created with ID: ${_id}`);
      } catch (createError) {
        console.error("❌ Failed to create analysis record:", createError);
        return {
          success: false,
          exitCode: -1,
          sandboxId: null,
          _id: _id.toString(),
          error: "Failed to create analysis record",
        };
      }
    } else {
      console.log(`📝 Using pre-created analysis record with ID: ${_id}`);
    }

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

    let sandbox;
    if(latestAnalysis?.sandboxId) {
      try {
        sandbox = await connectSandbox(latestAnalysis.sandboxId);
      } catch (error: any) {
        // If sandbox connection fails (e.g., NotFoundError after 30 days), create a new one
        console.log(`⚠️ Failed to connect to existing sandbox ${latestAnalysis.sandboxId}: ${error.message}`);
        console.log("🔧 Creating new sandbox...");
        if (callbacks?.onProgress) {
          await callbacks.onProgress("⚠️ Existing sandbox unavailable, creating new one...");
        }
        sandbox = await createSandbox();
      }
    } else {
      sandbox = await createSandbox();
    }
    sandboxRef = sandbox;
    sandboxId = sandbox.sandboxId;
    console.log("✅ Sandbox created successfully");

    // Update analysis record with sandboxId
    try {
      await Analysis.findOneAndUpdate(
        { _id },
        { sandboxId },
        { new: true }
      );
      console.log(`📝 Analysis record updated with sandboxId: ${sandboxId}`);
    } catch (updateError) {
      console.error("⚠️ Failed to update analysis record with sandboxId:", updateError);
      // Continue execution as this is not critical
    }

    if (callbacks?.onProgress) {
      await callbacks.onProgress("✅ Sandbox created successfully");
    }

    await initRedisBuffer(_id.toString());
    
    // Debug: Log the data being passed
    // console.log("📊 Data parameter being passed to sandbox:", JSON.stringify(data, null, 2));
    
    // Properly format the data parameter for shell command
    const dataParam = data ? JSON.stringify(data) : '{}';
    console.log("🔧 Formatted data parameter length:", dataParam.length);
    
    const analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --user-id "${userId}" --github-repository-id ${github_repositoryId} --analysis-id "${_id.toString()}" --model "${model}" --mode ${analysisType} --api-key ${process.env.GOOGLE_API_KEY} --data '${dataParam.replace(/'/g, "'\"'\"'")}'`;

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
          await appendToRedisBuffer(_id.toString(), cleanData);
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
          await appendToRedisBuffer(_id.toString(), `⚠️ ${cleanData}`);
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

    // If analysis has already been marked as interrupted, skip finalization
    try {
      const current = await Analysis.findById(_id).lean();
      if (current && !Array.isArray(current) && current.status === "interrupted") {
        if (callbacks?.onProgress) {
          await callbacks.onProgress("⛔ Analysis was interrupted. Skipping finalize.");
        }
        return {
          success: false,
          exitCode: result.exitCode,
          sandboxId: sandboxId,
          _id: _id.toString(),
        };
      }
    } catch (_) {}

    // Puase the sandbox
    await sandbox.betaPause();
    // console.log(sameSandbox.sandboxId)

    if (callbacks?.onProgress) {
      await callbacks.onProgress("🔒 Sandbox closed");
    }

    // Auto-persist analysis results if persistence parameters are provided
    if (userId && repoUrl && github_repositoryId) {
      try {
        const status: "completed" | "error" =
          result.exitCode === 0 ? "completed" : "error";
        await finalizeAnalysisAndPersist({
          _id: _id.toString(),
          analysis_type: analysisType,
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

        // Send email notification if userEmail is provided
        if (userEmail && result.exitCode === 0) {
          console.log(userEmail, "here is email")
          console.log("📧 Attempting to send email notification...")
          try {
            const repositoryName = repoUrl.split('/').pop() || 'Unknown Repository';
            console.log("📧 Calling mailService.analysisComplete with:", { to: userEmail, repositoryName });
            await mailService.analysisComplete({
              to: userEmail,
              username: 'User', // You can get this from user data if available
              repositoryName: repositoryName,
              repositoryUrl: repoUrl,
              analysisId: _id.toString(),
              analysisType: 'full',
              analysisResults: {
                issuesFound: 12, // Dummy data for testing
                criticalIssues: 3, // Dummy data for testing
                suggestions: [
                  'Fix SQL injection vulnerabilities',
                  'Update outdated dependencies',
                  'Implement proper error handling'
                ],
                summary: 'Analysis completed successfully with security and quality recommendations'
              },
              dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/analysis/${_id.toString()}`
            });
            console.log("✅ Mail service call completed successfully");

            if (callbacks?.onProgress) {
              await callbacks.onProgress(`📧 Analysis report sent to ${userEmail}`);
            }
          } catch (emailError) {
            console.error(`❌ Failed to send analysis email:`, emailError);
            if (callbacks?.onProgress) {
              await callbacks.onProgress(`⚠️ Warning: Failed to send email notification`);
            }
          }
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
      _id: _id.toString(),
    };
  } catch (error: any) {
    console.error("❌ Error executing analysis:", error);

    if (callbacks?.onProgress) {
      await callbacks.onProgress(`❌ Error: ${error.message}`);
    }

    // If analysis has already been marked as interrupted, skip error finalization
    try {
      const current = await Analysis.findById(_id).lean();
      if (current && !Array.isArray(current) && current.status === "interrupted") {
        if (callbacks?.onProgress) {
          await callbacks.onProgress("⛔ Analysis was interrupted. Skipping error finalize.");
        }
        return {
          success: false,
          exitCode: runExitCode || -1,
          sandboxId: sandboxId,
          _id: _id.toString(),
          error: error.message,
        };
      }
    } catch (_) {}

    // Auto-persist analysis results even on error if persistence parameters are provided
    if (userId && repoUrl && github_repositoryId) {
      try {
        await finalizeAnalysisAndPersist({
          _id: _id.toString(),
          analysis_type: analysisType,
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

        // Send error email notification if userEmail is provided
        if (userEmail) {
          try {
            const repositoryName = repoUrl.split('/').pop() || 'Unknown Repository';
            await mailService.analysisError({
              to: userEmail,
              username: 'User', // You can get this from user data if available
              repositoryName: repositoryName,
              repositoryUrl: repoUrl,
              analysisId: _id.toString(),
              errorMessage: error.message || 'An unexpected error occurred during analysis',
              errorCode: `EXIT_${runExitCode || -1}`,
              supportLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`
            });

            if (callbacks?.onProgress) {
              await callbacks.onProgress(`📧 Error notification sent to ${userEmail}`);
            }
          } catch (emailError) {
            console.error(`❌ Failed to send error email:`, emailError);
            if (callbacks?.onProgress) {
              await callbacks.onProgress(`⚠️ Warning: Failed to send error email notification`);
            }
          }
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
      _id: _id.toString(),
      error: error.message,
    };
  } finally {
    try {
      if (sandboxRef) await sandboxRef.kill();
    } catch (_) {}
  }
};
