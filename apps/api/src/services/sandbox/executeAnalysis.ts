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
import User from "../../models/user.model.js";
import AIModel, { IAIModel } from "../../models/ai_model.model.js";

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
  prompt = "Analyze this codebase for security vulnerabilities and code quality",
  analysisType: string,
  callbacks?: StreamingCallbacks,
  data?: any,
  userEmail?: string,
  teamId?: string,
  preCreatedAnalysisId?: string
): Promise<AnalysisResult> => {
  // Hoisted context for streaming persistence
  let sandboxRef: any | undefined;
  let runExitCode: number | undefined;
  let sandboxId: string = "";
  let _id: mongoose.Types.ObjectId = preCreatedAnalysisId
    ? new mongoose.Types.ObjectId(preCreatedAnalysisId)
    : new mongoose.Types.ObjectId();

  // Ensure model/provider are available across try/catch
  let model: string;
  let provider: string;
  let modelDoc: IAIModel | null = null;

  try {
    let teamDoc: any = null;
    let modelId: mongoose.Types.ObjectId | string | undefined;

    if (teamId && teamId !== "null") {
      teamDoc = await Team.findById(teamId);
      if (!teamDoc) {
        return {
          success: false,
          exitCode: -1,
          sandboxId: null,
          _id: new mongoose.Types.ObjectId().toString(),
          error: "Team not found",
        };
      }
      const ts: any = teamDoc.settings || {};
      if (analysisType === "full_repo_analysis") {
        modelId = ts.defaultModelRepo;
      } else {
        modelId = ts.defaultModelPr;
      }
    } else {
      const userDoc = await User.findById(userId);
      if (!userDoc) {
        return {
          success: false,
          exitCode: -1,
          sandboxId: null,
          _id: new mongoose.Types.ObjectId().toString(),
          error: "User not found",
        };
      }
      const us: any = userDoc.settings || {};
      if (analysisType === "full_repo_analysis") {
        modelId = us.defaultModelRepo;
      } else {
        modelId = us.defaultModelPr;
      }
    }

    // Fetch model document using ObjectId
    if (modelId) {
      const modelObjectId =
        typeof modelId === "string"
          ? new mongoose.Types.ObjectId(modelId)
          : modelId;
      modelDoc = (await AIModel.findById(
        modelObjectId
      ).lean()) as IAIModel | null;
      if (!modelDoc) {
        return {
          success: false,
          exitCode: -1,
          sandboxId: null,
          _id: new mongoose.Types.ObjectId().toString(),
          error: "Model not found",
        };
      }
      model = modelDoc.modelId;
      provider = modelDoc.provider;
    } else {
      return {
        success: false,
        exitCode: -1,
        sandboxId: null,
        _id: new mongoose.Types.ObjectId().toString(),
        error: "Model ID not found in settings",
      };
    }
    const latestAnalysis = await Analysis.findOne({
      github_repositoryId: new mongoose.Types.ObjectId(github_repositoryId),
    }).sort({ createdAt: -1 });

    let owner = userId;
    if (teamDoc) {
      owner = teamDoc.ownerId;
      console.log("setting owner form team");
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
        // Base payload for analysis record
        const createPayload: any = {
          _id,
          analysis_type: analysisType,
          userId,
          repoUrl,
          github_repositoryId,
          sandboxId: "", // Will be updated once sandbox is created
          model,
          prompt,
          status: "running",
        };

        // For PR analysis, include PR-specific fields
        if (analysisType === "pr_analysis") {
          // Use provided pr_number if available in data
          if (data && typeof data.pr_number === "number") {
            createPayload.pr_number = data.pr_number;
          }
          // Prefer provided pr_url, else construct from repoUrl + pr_number
          if (
            data &&
            typeof data.pr_url === "string" &&
            data.pr_url.length > 0
          ) {
            createPayload.pr_url = data.pr_url;
          } else if (createPayload.pr_number && repoUrl) {
            createPayload.pr_url = `${repoUrl}/pull/${createPayload.pr_number}`;
          }
          // Store PR title if provided
          if (
            data &&
            typeof data.pr_title === "string" &&
            data.pr_title.length > 0
          ) {
            createPayload.pr_title = data.pr_title;
          }
          // Options field should only be present for PR review context
          if (data && typeof data.options === "object") {
            createPayload.options = data.options;
          }
        }

        await Analysis.create(createPayload);
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
    if (latestAnalysis?.sandboxId) {
      try {
        sandbox = await connectSandbox(latestAnalysis.sandboxId);
      } catch (error: any) {
        // If sandbox connection fails (e.g., NotFoundError after 30 days), create a new one
        console.log(
          `⚠️ Failed to connect to existing sandbox ${latestAnalysis.sandboxId}: ${error.message}`
        );
        console.log("🔧 Creating new sandbox...");
        if (callbacks?.onProgress) {
          await callbacks.onProgress(
            "⚠️ Existing sandbox unavailable, creating new one..."
          );
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
      await Analysis.findOneAndUpdate({ _id }, { sandboxId }, { new: true });
      console.log(`📝 Analysis record updated with sandboxId: ${sandboxId}`);
    } catch (updateError) {
      console.error(
        "⚠️ Failed to update analysis record with sandboxId:",
        updateError
      );
      // Continue execution as this is not critical
    }

    if (callbacks?.onProgress) {
      await callbacks.onProgress("✅ Sandbox created successfully");
    }

    await initRedisBuffer(_id.toString());

    // Debug: Log the data being passed
    // console.log("📊 Data parameter being passed to sandbox:", JSON.stringify(data, null, 2));

    // Properly format the data parameter for shell command
    const dataParam = data ? JSON.stringify(data) : "{}";
    console.log("🔧 Formatted data parameter length:", dataParam.length);

    // Build command based on provider
    let analysisCommand: string;
    if (provider === "vertex") {
      // Vertex provider: use Google credentials
      analysisCommand = `if [ -n "$GOOGLE_CREDENTIALS_JSON_BASE64" ]; then echo "$GOOGLE_CREDENTIALS_JSON_BASE64" | base64 -d > /workspace/google-credentials.json; export GOOGLE_APPLICATION_CREDENTIALS=/workspace/google-credentials.json; fi; cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --user-id "${userId}" --github-repository-id ${github_repositoryId} --analysis-id "${_id.toString()}" --model "${model}" --provider "${provider}" --mode ${analysisType} --api-key ${"$GOOGLE_APPLICATION_CREDENTIALS"} --data '${dataParam.replace(/'/g, "'\"'\"'")}'`;
    } else if (provider === "bedrock") {
      // Bedrock provider: use AWS Bedrock API key (no --provider flag for bedrock)
      analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --user-id "${userId}" --github-repository-id ${github_repositoryId} --analysis-id "${_id.toString()}" --model "${model}" --provider "${provider}" --mode ${analysisType} --api-key ${process.env.AWS_BEDROCK_API_KEY} --data '${dataParam.replace(/'/g, "'\"'\"'")}'`;
    } else if (provider === "google") {
      // Google provider: use Google API key
      analysisCommand = `cd /workspace && stdbuf -oL -eL python -u main.py "${repoUrlForAnalysis}" --user-id "${userId}" --github-repository-id ${github_repositoryId} --analysis-id "${_id.toString()}" --model "${model}" --provider "${provider}" --mode ${analysisType} --api-key ${process.env.GOOGLE_API_KEY} --data '${dataParam.replace(/'/g, "'\"'\"'")}'`;
    } else {
      return {
        success: false,
        exitCode: -1,
        sandboxId: null,
        _id: _id.toString(),
        error: `Unsupported provider: ${provider}`,
      };
    }

    if (callbacks?.onProgress) {
      await callbacks.onProgress("🚀 Starting workflow execution...");
    }

    // Start the analysis command in the background with streaming
    const command = await sandbox.commands.run(analysisCommand, {
      background: true,
      onStdout: async (data) => {
        const redact = (input: string) => {
          let s = input;
          s = s.replace(/\x1b\[[0-9;]*m/g, "");
          s = s.replace(
            /x-access-token:[^@]+@github\.com/gi,
            "x-access-token:***@github.com"
          );
          s = s.replace(
            /(Authorization:\s*(?:Bearer|token)\s*)([A-Za-z0-9._-]+)/gi,
            "$1***"
          );
          s = s.replace(/(GITHUB_TOKEN[=:\s]+)([A-Za-z0-9._-]+)/gi, "$1***");
          s = s.replace(
            /(AWS_SECRET_ACCESS_KEY[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(
            /(AWS_ACCESS_KEY_ID[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(
            /(GOOGLE_CREDENTIALS_JSON_BASE64[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(/ghp_[A-Za-z0-9]{20,}/gi, "ghp_***");
          return s;
        };
        const cleanData = redact(data);

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
        const redact = (input: string) => {
          let s = input;
          s = s.replace(/\x1b\[[0-9;]*m/g, "");
          s = s.replace(
            /x-access-token:[^@]+@github\.com/gi,
            "x-access-token:***@github.com"
          );
          s = s.replace(
            /(Authorization:\s*(?:Bearer|token)\s*)([A-Za-z0-9._-]+)/gi,
            "$1***"
          );
          s = s.replace(/(GITHUB_TOKEN[=:\s]+)([A-Za-z0-9._-]+)/gi, "$1***");
          s = s.replace(
            /(AWS_SECRET_ACCESS_KEY[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(
            /(AWS_ACCESS_KEY_ID[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(
            /(GOOGLE_CREDENTIALS_JSON_BASE64[=:\s]+)([A-Za-z0-9/+_=.-]+)/gi,
            "$1***"
          );
          s = s.replace(/ghp_[A-Za-z0-9]{20,}/gi, "ghp_***");
          return s;
        };
        const cleanData = redact(data);

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
      if (
        current &&
        !Array.isArray(current) &&
        current.status === "interrupted"
      ) {
        if (callbacks?.onProgress) {
          await callbacks.onProgress(
            "⛔ Analysis was interrupted. Skipping finalize."
          );
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
        // if (userEmail && result.exitCode === 0) {
        //   console.log(userEmail, "here is email")
        //   console.log("📧 Attempting to send email notification...")
        //   try {
        //     const repositoryName = repoUrl.split('/').pop() || 'Unknown Repository';
        //     console.log("📧 Calling mailService.analysisComplete with:", { to: userEmail, repositoryName });
        //     await mailService.analysisComplete({
        //       to: userEmail,
        //       username: 'User', // You can get this from user data if available
        //       repositoryName: repositoryName,
        //       repositoryUrl: repoUrl,
        //       analysisId: _id.toString(),
        //       analysisType: 'full',
        //       analysisResults: {
        //         issuesFound: 12, // Dummy data for testing
        //         criticalIssues: 3, // Dummy data for testing
        //         suggestions: [
        //           'Fix SQL injection vulnerabilities',
        //           'Update outdated dependencies',
        //           'Implement proper error handling'
        //         ],
        //         summary: 'Analysis completed successfully with security and quality recommendations'
        //       },
        //       dashboardLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/analysis/${_id.toString()}`
        //     });
        //     console.log("✅ Mail service call completed successfully");

        //     if (callbacks?.onProgress) {
        //       await callbacks.onProgress(`📧 Analysis report sent to ${userEmail}`);
        //     }
        //   } catch (emailError) {
        //     console.error(`❌ Failed to send analysis email:`, emailError);
        //     if (callbacks?.onProgress) {
        //       await callbacks.onProgress(`⚠️ Warning: Failed to send email notification`);
        //     }
        //   }
        // }
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
      if (
        current &&
        !Array.isArray(current) &&
        current.status === "interrupted"
      ) {
        if (callbacks?.onProgress) {
          await callbacks.onProgress(
            "⛔ Analysis was interrupted. Skipping error finalize."
          );
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
          model: "",
          prompt,
          status: "error",
          exitCode: runExitCode || -1,
        });

        if (callbacks?.onProgress) {
          await callbacks.onProgress(`💾 Error analysis results persisted`);
        }

        // Send error email notification if userEmail is provided
        // if (userEmail) {
        //   try {
        //     const repositoryName = repoUrl.split('/').pop() || 'Unknown Repository';
        //     await mailService.analysisError({
        //       to: userEmail,
        //       username: 'User', // You can get this from user data if available
        //       repositoryName: repositoryName,
        //       repositoryUrl: repoUrl,
        //       analysisId: _id.toString(),
        //       errorMessage: error.message || 'An unexpected error occurred during analysis',
        //       errorCode: `EXIT_${runExitCode || -1}`,
        //       supportLink: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`
        //     });

        //     if (callbacks?.onProgress) {
        //       await callbacks.onProgress(`📧 Error notification sent to ${userEmail}`);
        //     }
        //   } catch (emailError) {
        //     console.error(`❌ Failed to send error email:`, emailError);
        //     if (callbacks?.onProgress) {
        //       await callbacks.onProgress(`⚠️ Warning: Failed to send error email notification`);
        //     }
        //   }
        // }
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
