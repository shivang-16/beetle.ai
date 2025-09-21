import { NextFunction, Request, Response } from "express";
import { CustomError } from "../middlewares/error.js";
import Analysis from "../models/analysis.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";
import { executeAnalysis, StreamingCallbacks } from "../services/sandbox/executeAnalysis.js";

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
    console.log("🚀 Starting code analysis...");

    // Extract parameters from request body or use defaults
    const {
      github_repositoryId,
      branch,
      teamId,
      model = "gemini-2.5-flash",
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

    console.log(teamId, "here is the team id")
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
      teamId
    );

    exitCode = result.exitCode;

    if (result.success) {
      await streamToClient("🎉 Analysis finished successfully!");
    } else {
      await streamToClient("⚠️ Analysis completed with warnings or errors");
      if (result.error) {
        await streamToClient(`Error: ${result.error}`);
      }
    }

    await streamToClient("=".repeat(50));
    res.end();

  } catch (error: any) {
    console.error("❌ Error executing analysis:", error);

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

