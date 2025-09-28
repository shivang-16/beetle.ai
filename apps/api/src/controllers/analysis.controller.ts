import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import Analysis from "../models/analysis.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";
import Team from "../models/team.model.js";

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
      teamId,
      model = "gemini-2.0-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
      analysis_type = "full_repo_analysis",
      status = "running"
    } = req.body;

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
      teamId,
      analysisId, // Optional pre-created analysis ID
      model = "gemini-2.0-flash",
      prompt = "Analyze this codebase for security vulnerabilities and code quality",
    } = req.body;

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
    await streamToClient(`🤖 Model: ${model}`);
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
      model,
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
      model,
      prompt,
      "full_repo_analysis", // analysisType
      callbacks,
      undefined, // data parameter
      req.user?.email, // userEmail parameter
      teamId,
      analysisId // Pass the optional pre-created analysis ID
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

