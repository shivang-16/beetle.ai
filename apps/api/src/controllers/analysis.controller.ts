import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import Analysis from "../models/analysis.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import Team from "../models/team.model.js";
import { getRedisBuffer } from "../utils/analysisStreamStore.js";
import redis from "../config/redis.js";
import Sandbox from "@e2b/code-interpreter";
import { connectSandbox } from "../config/sandbox.js";

export const createAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info("Creating analysis record", { 
      userId: req.user?._id, 
      github_repositoryId: req.body.github_repositoryId 
    });

    // Extract parameters from request body
    const {
      github_repositoryId,
      branch,
      teamId: bodyTeamId,
      model = "gemini-2.0-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
      analysis_type = "full_repo_analysis",
      status = "draft"
    } = req.body;
    
    // Use teamId from body or fallback to header context
    const teamId = req.team?.id;

    const github_repository = await Github_Repository.findById(github_repositoryId);

    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    if (github_repository.analysisRequired === false) {
      return next(
        new CustomError("You haven't enabled analysis for this repository", 400)
      );
    }

    const repoUrl = `https://github.com/${github_repository.fullName}`;
    let userId = req.user._id;

    // Handle team ownership
    if (teamId && teamId !== 'null') {
      const team = await Team.findById(teamId);
      if (!team) {
        return next(new CustomError("Team not found", 404));
      }
      userId = team.ownerId;
    }

    // Generate new MongoDB ObjectId for the analysis
    const analysisId = new mongoose.Types.ObjectId();

    // Create analysis record with 'running' status
    const analysis = await Analysis.create({
      _id: analysisId,
      analysis_type,
      userId,
      repoUrl,
      github_repositoryId,
      sandboxId: "", // Will be updated when sandbox is created
      model,
      prompt,
      status,
    });

    logger.info("Analysis record created successfully", { 
      analysisId: analysisId.toString(),
      github_repositoryId,
      userId 
    });

    res.json({
      success: true,
      data: {
        analysisId: analysisId.toString(),
        analysis: {
          _id: analysisId.toString(),
          analysis_type,
          userId,
          repoUrl,
          github_repositoryId,
          model,
          prompt,
          status,
          createdAt: analysis.createdAt
        }
      },
      message: "Analysis record created successfully"
    });

  } catch (error: any) {
    logger.error("Error creating analysis record", { 
      error: error instanceof Error ? error.message : error,
      userId: req.user?._id,
      github_repositoryId: req.body.github_repositoryId 
    });
    next(new CustomError(error.message || "Failed to create analysis record", 500));
  }
};

export const startAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logger.info("Starting code analysis", { 
      userId: req.user?._id, 
      github_repositoryId: req.body.github_repositoryId 
    });

    // Extract parameters from request body or use defaults
    const {
      github_repositoryId,
      branch,
      teamId: bodyTeamId,
      analysisId, // Optional pre-created analysis ID
      model = "gemini-2.0-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
    } = req.body;
    
    // Use teamId from body or fallback to header context
    const teamId = bodyTeamId || req.team?.id;

    const github_repository = await Github_Repository.findById(github_repositoryId);

    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    if (github_repository.analysisRequired === false) {
      return next(
        new CustomError("You haven't enabled analysis for this repository", 400)
      );
    }

    const branchForAnalysis = branch || github_repository.defaultBranch;
    const repoUrl = `https://github.com/${github_repository.fullName}`;
    const userId = req.user._id;

    logger.debug("Team ID for analysis", { teamId, userId });
    logger.info("Starting analysis execution", {
      github_repositoryId,
      repoUrl,
      branchForAnalysis,
      userId,
      model,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
      analysisType: "full_repo_analysis",
      userEmail: req.user?.email,
      teamId
    });

    // Start analysis without streaming callbacks (fire and forget)
    const result = await executeAnalysis(
      github_repositoryId,
      repoUrl,
      branchForAnalysis,
      userId,
      model,
      prompt,
      "full_repo_analysis", // analysisType
      undefined, // No streaming callbacks
      undefined, // data parameter
      req.user?.email, // userEmail parameter
      teamId,
      analysisId // Pass the optional pre-created analysis ID
    );

    logger.info("Analysis execution started", {
      analysisId: result._id,
      userId,
      github_repositoryId
    });

    // Return analysis ID immediately
    res.json({
      success: true,
      message: "Analysis started successfully",
      data: {
        analysisId: result._id,
        sandboxId: result.sandboxId
      }
    });

  } catch (error: any) {
    logger.error("Error starting analysis", { 
      error: error instanceof Error ? error.message : error, 
      userId: req.user?._id, 
      github_repositoryId: req.body.github_repositoryId
    });

    next(new CustomError(error.message || "Failed to start analysis", 500));
  } 
};

export const streamAnalysisLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { analysisId } = req.params;

    if (!analysisId) {
      return next(new CustomError("Analysis ID is required", 400));
    }

    // Verify analysis exists and user has access
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return next(new CustomError("Analysis not found", 404));
    }

    console.log(analysis.sandboxId, "sandboxId")

    // Check if user owns this analysis or is part of the team
    if (analysis.userId !== req.user._id) {
      const team = await Team.findOne({ ownerId: analysis.userId });
      if (!team || !team.members?.includes(req.user._id)) {
        return next(new CustomError("Unauthorized to access this analysis", 403));
      }
    }

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let clientAborted = false;
    let sandbox: any = null;

    // Detect client interruption
    req.on("aborted", () => {
      clientAborted = true;
    });
    res.on("close", () => {
      if (!res.writableEnded) clientAborted = true;
    });

    // Function to stream data to client
    const streamToClient = async (data: string) => {
      if (clientAborted) return;
      
      logger.debug("Streaming log data", { 
        analysisId,
        dataLength: data.length,
        userId: req.user._id
      });
      
      res.write(data + "\n");
    };

    // First, send any buffered logs from Redis
    try {
      const bufferedLogs = await getRedisBuffer(analysisId);
      if (bufferedLogs) {
        await streamToClient("=== Buffered Logs ===");
        await streamToClient(bufferedLogs);
        await streamToClient("=== Live Logs ===");
      }
    } catch (error) {
      logger.error("Error fetching buffered logs", { analysisId, error });
      await streamToClient("⚠️ Warning: Could not fetch buffered logs");
    }

    // If analysis is completed, send completion message and end
    if (analysis.status === "completed" || analysis.status === "error") {
      await streamToClient(`Analysis ${analysis.status}. No more logs expected.`);
      res.end();
      return;
    }

    // For running analyses, connect to the sandbox and stream logs directly
    if (!analysis.sandboxId) {
      await streamToClient("⚠️ Warning: No sandbox ID found for this analysis");
      res.end();
      return;
    }

    try {
      // Connect to the running sandbox to verify it's still active
      await streamToClient(`🔌 Attempting to connect to sandbox: ${analysis.sandboxId}`);
      logger.info("Connecting to sandbox", { 
        analysisId, 
        sandboxId: analysis.sandboxId,
        analysisStatus: analysis.status 
      });
      
      sandbox = await connectSandbox(analysis.sandboxId);
      await streamToClient("✅ Connected to running sandbox");
      logger.info("Successfully connected to sandbox", { analysisId, sandboxId: analysis.sandboxId });

      // Stream logs from Redis buffer where executeAnalysis.ts is storing them
      await streamToClient("📡 Starting live log streaming from Redis buffer...");
      
      const redisKey = `analysis:${analysisId}:buffer`;
      let lastPosition = 0;
      let noNewDataCount = 0;
      const maxNoDataIterations = 30; // 30 seconds of no new data before checking status
      
      // Poll Redis buffer for new log data
      const streamInterval = setInterval(async () => {
        try {
          if (clientAborted) {
            clearInterval(streamInterval);
            return;
          }
          
          // Get the current buffer content
          const currentBuffer = await redis.get(redisKey);
          
          if (currentBuffer && currentBuffer.length > lastPosition) {
            // New data available - extract only the new part
            const newData = currentBuffer.substring(lastPosition);
            lastPosition = currentBuffer.length;
            noNewDataCount = 0;
            
            // Stream the new data to client
            await streamToClient(newData);
          } else {
            noNewDataCount++;
            
            // If no new data for a while, check if analysis is still running
            if (noNewDataCount >= maxNoDataIterations) {
              const updatedAnalysis = await Analysis.findById(analysisId);
              if (updatedAnalysis && (updatedAnalysis.status === "completed" || updatedAnalysis.status === "error")) {
                await streamToClient(`\n🏁 Analysis ${updatedAnalysis.status}. Stream ending.`);
                clearInterval(streamInterval);
                res.end();
                return;
              }
              noNewDataCount = 0; // Reset counter
            }
          }
        } catch (error: any) {
          logger.error("Error during Redis streaming", { analysisId, error });
          clearInterval(streamInterval);
          if (!res.headersSent) {
            await streamToClient(`⚠️ Error during streaming: ${error.message}`);
          }
          res.end();
        }
      }, 1000); // Check every second
      
      // Clean up interval when client disconnects
      req.on('close', () => {
        clearInterval(streamInterval);
        clientAborted = true;
      });

    } catch (sandboxError: any) {
      logger.error("Error connecting to sandbox", { 
        analysisId, 
        sandboxId: analysis.sandboxId, 
        error: sandboxError.message,
        stack: sandboxError.stack,
        analysisStatus: analysis.status
      });
      
      await streamToClient(`❌ Failed to connect to sandbox: ${analysis.sandboxId}`);
      await streamToClient(`🔍 Error details: ${sandboxError.message}`);
      
      // Provide specific guidance based on error type
      if (sandboxError.message?.includes('not found') || sandboxError.message?.includes('404')) {
        await streamToClient("💡 This usually means the sandbox has expired or been terminated");
        await streamToClient("🔄 The analysis may need to be restarted with a new sandbox");
      } else if (sandboxError.message?.includes('unauthorized') || sandboxError.message?.includes('401')) {
        await streamToClient("🔑 Authentication issue - check E2B API key configuration");
      } else if (sandboxError.message?.includes('timeout')) {
        await streamToClient("⏱️ Connection timeout - the sandbox may be overloaded or unresponsive");
      }
      
      await streamToClient("📊 Falling back to status polling...");
      
      // Fallback: Just poll for status updates
      const statusCheckInterval = setInterval(async () => {
        if (clientAborted) {
          clearInterval(statusCheckInterval);
          return;
        }

        try {
          const updatedAnalysis = await Analysis.findById(analysisId);
          if (updatedAnalysis && (updatedAnalysis.status === "completed" || updatedAnalysis.status === "error")) {
            await streamToClient(`Analysis ${updatedAnalysis.status}.`);
            clearInterval(statusCheckInterval);
            res.end();
          }
        } catch (error) {
          logger.error("Error checking analysis status", { analysisId, error });
        }
      }, 5000);

      req.on("close", () => {
        clientAborted = true;
        clearInterval(statusCheckInterval);
      });
    }

  } catch (error: any) {
    logger.error("Error streaming analysis logs", { 
      error: error instanceof Error ? error.message : error, 
      analysisId: req.params.analysisId,
      userId: req.user?._id
    });

    if (!res.headersSent) {
      next(new CustomError(error.message || "Failed to stream analysis logs", 500));
    } else {
      res.write(`\n❌ Error: ${error.message || "Log streaming failed"}\n`);
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
    logger.error("Error checking analysis status", { 
      error: error instanceof Error ? error.message : error 
    });
    next(
      new CustomError(error.message || "Failed to check analysis status", 500)
    );
  }
};

export const getIndividualAnalysisStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { analysisId } = req.params;

    if (!analysisId) {
      return next(new CustomError("Analysis ID is required", 400));
    }

    // Find the analysis
    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return next(new CustomError("Analysis not found", 404));
    }

    // Check if user owns this analysis or is part of the team
    if (analysis.userId !== req.user._id) {
      const team = await Team.findOne({ ownerId: analysis.userId });
      if (!team || !team.members?.includes(req.user._id)) {
        return next(new CustomError("Unauthorized to access this analysis", 403));
      }
    }

    logger.debug("Fetching analysis status", { analysisId, status: analysis.status });

    res.json({
      success: true,
      data: {
        analysisId: analysis._id,
        status: analysis.status,
        sandboxId: analysis.sandboxId,
        exitCode: analysis.exitCode,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt,
        model: analysis.model,
        prompt: analysis.prompt
      },
      message: "Analysis status retrieved successfully"
    });
  } catch (error: any) {
    logger.error("Error fetching individual analysis status", { 
      error: error instanceof Error ? error.message : error,
      analysisId: req.params.analysisId 
    });
    next(
      new CustomError(error.message || "Failed to fetch analysis status", 500)
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
    logger.debug("Getting repository analysis", { github_repositoryId });

    let doc = null as any;
    try {
      doc = await Analysis.find({
        github_repositoryId: github_repositoryId,
      }).sort({ createdAt: -1 });
      // logger.debug("Analysis documents found", { docCount: doc?.length });
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
    logger.error("Error fetching analysis", { 
      error: error instanceof Error ? error.message : error,
      github_repositoryId: req.params.github_repositoryId 
    });
    next(new CustomError(error.message || "Failed to fetch analysis", 500));
  }
};

export const updateAnalysisStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['draft', 'running', 'completed', 'interrupted', 'error'];
    if (!validStatuses.includes(status)) {
      return next(new CustomError("Invalid status value", 400));
    }

    // Find and update the analysis
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return next(new CustomError("Analysis not found", 404));
    }

    // Check if user owns this analysis or is part of the team
    if (analysis.userId !== req.user._id) {
      // Check if it's a team analysis and user is part of the team
      if (analysis.userId) {
        const team = await Team.findOne({ ownerId: analysis.userId });
        if (!team || !team.members?.includes(req.user._id)) {
          return next(new CustomError("Unauthorized to update this analysis", 403));
        }
      } else {
        return next(new CustomError("Unauthorized to update this analysis", 403));
      }
    }

    // Update the status
    analysis.status = status;
    await analysis.save();

    logger.info("Analysis status updated", { 
      analysisId: id, 
      newStatus: status, 
      userId: req.user._id 
    });

    res.json({
      success: true,
      message: "Analysis status updated successfully",
      data: {
        id: analysis._id,
        status: analysis.status,
        updatedAt: analysis.updatedAt
      }
    });
  } catch (error: any) {
    logger.error("Failed to update analysis status", { 
      analysisId: req.params.id, 
      error: error.message 
    });
    next(new CustomError(error.message || "Failed to update analysis status", 500));
  }
};

export const getRepositoryAnalysisLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params as { id: string };
    logger.debug("Getting analysis logs", { analysisId: id });

    let doc = null as any;
    try {
      doc = await Analysis.findById(id).lean();
      // logger.debug("Analysis document found", { analysisId: id, found: !!doc });
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
    logger.error("Error fetching analysis logs", { 
      error: error instanceof Error ? error.message : error,
      analysisId: req.params.id 
    });
    next(new CustomError(error.message || "Failed to fetch analysis", 500));
  }
};

