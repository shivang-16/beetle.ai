import { NextFunction, Request, Response } from "express";
import { getAuth } from '@clerk/express';
import { CustomError } from "../middlewares/error.js";
import Analysis from "../models/analysis.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";
import { connectSandbox } from "../config/sandbox.js";
import { Sandbox } from '@e2b/code-interpreter';
import { appendToRedisBuffer, finalizeAnalysisAndPersist } from "../utils/analysisStreamStore.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import Team from "../models/team.model.js";
import User from "../models/user.model.js";

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

    // if (github_repository.analysisRequired === false) {
    //   return next(
    //     new CustomError("You haven't enabled analysis for this repository", 400)
    //   );
    // }

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

    // Resolve model from team/user settings
    let selectedModel: string | undefined;
    if (teamId && teamId !== 'null') {
      try {
        const teamDoc = await Team.findById(teamId);
        const ts: any = teamDoc?.settings || {};
        selectedModel = analysis_type === 'full_repo_analysis' ? ts.defaultModelRepo : ts.defaultModelPr;
      } catch (_) {}
    }
    if (!selectedModel) {
      try {
        const userDoc = await User.findById(userId);
        const us: any = userDoc?.settings || {};
        selectedModel = analysis_type === 'full_repo_analysis' ? us.defaultModelRepo : us.defaultModelPr;
      } catch (_) {}
    }
    if (!selectedModel || typeof selectedModel !== 'string' || selectedModel.length === 0) {
      selectedModel = 'gemini-2.5-pro';
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
      model: selectedModel,
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
          model: selectedModel,
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
   // Hoisted context for streaming persistence
  let clientAborted = false;
  let userId!: string;
  let repoUrl: string = "";
  let exitCode: number | null = null;

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
      analysisId,
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
    } = req.body;
    
    // Use teamId from body or fallback to header context
    const teamId = bodyTeamId || req.team?.id;

    const github_repository = await Github_Repository.findById(github_repositoryId);

    if (!github_repository) {
      return next(new CustomError("Github repository not found", 404));
    }

    // if (github_repository.analysisRequired === false) {
    //   return next(
    //     new CustomError("You haven't enabled analysis for this repository", 400)
    //   );
    // }

    const branchForAnalysis = branch || github_repository.defaultBranch;
    repoUrl = `https://github.com/${github_repository.fullName}`;
    userId = req.user._id;

    // Set response headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Detect client interruption
    req.on("aborted", () => {
      clientAborted = true;
    });
    res.on("close", () => {
      if (!res.writableEnded) clientAborted = true;
    });

    // Function to stream data to client
    const streamToClient = async (data: string) => {
      console.log("[CLIENT STREAMING]", data);
      
      // Create a preview for Better Stack while keeping full data for local logs
      const dataPreview = data.length > 100 ? data.substring(0, 100) + "..." : data;
      
      logger.debug(dataPreview, { 
        dataPreview,
        fullDataLength: data.length,
        userId,
        dataType: typeof data,
        timestamp: new Date().toISOString(),
        isLongContent: data.length > 100
      });
      
      res.write(data + "\n");
    };
  

    // Initial streaming messages
    await streamToClient("🧠 CodeDetector - Intelligent Code Analysis");
    await streamToClient("=".repeat(50));
    await streamToClient(`📁 Repository: ${repoUrl}`);
    
    await streamToClient(`💭 Prompt: ${prompt}`);
    await streamToClient("=".repeat(50));

    // Define streaming callbacks
    const callbacks: StreamingCallbacks = {
      onStdout: async (data: string) => {
        await streamToClient(data);
      },
      onStderr: async (data: string) => {
        await streamToClient(data);
      },
      onProgress: async (message: string) => {
        await streamToClient(message);
      },
    };

    logger.debug("Team ID for analysis", { teamId, userId });
    logger.info("Starting analysis execution", {
      github_repositoryId,
      repoUrl,
      branchForAnalysis,
      userId,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? "..." : ""),
      analysisType: "full_repo_analysis",
      userEmail: req.user?.email,
      teamId
    });

    // Call the refactored service function
    const result = await executeAnalysis(
      github_repositoryId,
      repoUrl,
      branchForAnalysis,
      userId,
      prompt,
      "full_repo_analysis",
      callbacks,
      undefined,
      req.user?.email,
      teamId,
      analysisId
    );

    exitCode = result.exitCode;

    logger.info("Analysis execution completed", {
      success: result.success,
      exitCode: result.exitCode,
      userId,
      github_repositoryId,
      duration: Date.now() - Date.now() // This would need proper timing implementation
    });

    if (result.success) {
      await streamToClient("🎉 Analysis finished successfully!");
      logger.info("Analysis finished successfully", { userId, github_repositoryId });
    } else {
      await streamToClient("⚠️ Analysis completed with warnings or errors");
      logger.warn("Analysis completed with warnings or errors", { 
        userId, 
        github_repositoryId, 
        exitCode: result.exitCode 
      });
      if (result.error) {
        await streamToClient(`Error: ${result.error}`);
      }
    }

    await streamToClient("=".repeat(50));
    res.end();

  } catch (error: any) {
    logger.error("Error executing analysis", { 
      error: error instanceof Error ? error.message : error, 
      userId, 
      repoUrl, 
      exitCode 
    });

    if (!res.headersSent) {
      next(new CustomError(error.message || "Failed to execute analysis", 500));
    } else {
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
    logger.error("Error checking analysis status", { 
      error: error instanceof Error ? error.message : error 
    });
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
    logger.debug("Getting repository analysis", { github_repositoryId });

    let doc = null as any;
    try {
      doc = await Analysis.find({
        github_repositoryId: github_repositoryId,
        analysis_type: "full_repo_analysis",
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

// Get PR analyses for the authenticated user
export const getPrAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId) {
      return next(new CustomError("Unauthorized", 401));
    }
    // Pagination defaults
    const pageParam = (req.query.page as string) || "1";
    const limitParam = (req.query.limit as string) || "10";
    const page = Math.max(parseInt(pageParam, 10) || 1, 1);
    const limit = Math.max(parseInt(limitParam, 10) || 10, 1);

    // Search support (query, q, or search)
    const rawSearch = ((req.query.query || req.query.q || req.query.search) as string) || "";
    const search = rawSearch.trim();

    // Determine team context: prefer explicit header, then attached context, then Clerk orgId
    const headerTeamId = (req.headers['x-team-id'] as string) || undefined;
    const attachedTeamId = req.team?.id || undefined;
    const { orgId } = getAuth(req);
    const resolvedTeamId = headerTeamId || attachedTeamId || orgId || undefined;

    // Base filter always starts with analysis_type
    const filter: any = {
      analysis_type: "pr_analysis",
    };

    if (resolvedTeamId) {
      // Team context: restrict to repositories accessible to the team and use team owner's analyses
      const team = await Team.findById(resolvedTeamId);
      if (!team) {
        return next(new CustomError("Team not found", 404));
      }
      const isMember = team.members?.some((m: any) => m.userId === currentUserId);
      if (!isMember) {
        return next(new CustomError("Forbidden: not a team member", 403));
      }
      const repos = await Github_Repository.find({ teams: resolvedTeamId }).select('_id').lean();
      const repoIds = repos.map((r: any) => r._id);

      // If no accessible repositories, return empty result with pagination
      if (repoIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }

      filter.github_repositoryId = { $in: repoIds };
      filter.userId = team.ownerId;
    } else {
      // Personal context: filter by current user
      filter.userId = currentUserId;
    }

    // Build search filter across pr_title, repoUrl, and pr_number
    if (search.length > 0) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const or: any[] = [
        { pr_title: { $regex: regex } },
        { repoUrl: { $regex: regex } },
      ];
      const num = parseInt(search, 10);
      if (!isNaN(num)) {
        or.push({ pr_number: num });
      }
      filter.$or = or;
    }

    const total = await Analysis.countDocuments(filter);
    const docs = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("repoUrl model status pr_number pr_url pr_title createdAt");

    return res.status(200).json({
      success: true,
      data: docs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: any) {
    logger.error("Error fetching PR analyses", {
      error: error instanceof Error ? error.message : error,
      userId: req.user?._id,
    });
    next(new CustomError(error.message || "Failed to fetch PR analyses", 500));
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

export const stopAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Find the analysis
    const analysis = await Analysis.findById(id);
    if (!analysis) {
      return next(new CustomError("Analysis not found", 404));
    }

    // Authorization: user must be owner or part of the team owned by analysis.userId
    if (analysis.userId !== req.user._id) {
      const team = await Team.findOne({ ownerId: analysis.userId });
      const isMember = team && Array.isArray((team as any).members)
        ? (team as any).members.includes(req.user._id)
        : false;
      if (!isMember) {
        return next(new CustomError("Unauthorized to stop this analysis", 403));
      }
    }

    // Only allow stopping if currently running
    if (analysis.status !== "running") {
      return res.status(200).json({
        success: true,
        message: "Analysis is not running; no action taken",
        data: { id: analysis._id, status: analysis.status }
      });
    }

    // Attempt to connect and kill the sandbox
    try {
      if (analysis.sandboxId) {
        // Append interruption message to buffer so it's captured in logs
        await appendToRedisBuffer(String(analysis._id), "⛔ Analysis interrupted by user");
        await Sandbox.kill(analysis.sandboxId);
        logger.info("Sandbox killed for analysis", { analysisId: id, sandboxId: analysis.sandboxId });
      }
    } catch (killErr: any) {
      logger.warn("Failed to kill sandbox; proceeding to finalize as interrupted", {
        analysisId: id,
        error: killErr?.message || killErr
      });
    }

    // Finalize and persist as interrupted
    try {
      await finalizeAnalysisAndPersist({
        _id: String(analysis._id),
        analysis_type: analysis.analysis_type,
        userId: analysis.userId,
        repoUrl: analysis.repoUrl,
        github_repositoryId: String(analysis.github_repositoryId),
        sandboxId: analysis.sandboxId,
        model: analysis.model,
        prompt: analysis.prompt,
        status: "interrupted",
        exitCode: null,
      });
    } catch (persistErr: any) {
      logger.error("Failed to finalize interrupted analysis", {
        analysisId: id,
        error: persistErr?.message || persistErr,
      });
      // Even if finalize fails, respond with success but include warning
    }

    res.json({
      success: true,
      message: "Analysis stopped successfully",
      data: { id: analysis._id, status: "interrupted" }
    });
  } catch (error: any) {
    logger.error("Error stopping analysis", { analysisId: req.params.id, error: error?.message || error });
    next(new CustomError(error.message || "Failed to stop analysis", 500));
  }
};

