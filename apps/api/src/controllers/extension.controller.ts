import { Request, Response } from 'express';
import ExtensionData from '../models/extension.data.model.js';
import ExtensionComment from '../models/extension.comment.model.js';
import Analysis from '../models/analysis.model.js';
import { executeAnalysis } from '../services/sandbox/executeAnalysis.js';
import { Github_Repository, IGithub_Repository } from '../models/github_repostries.model.js';
import { createParserState, parseStreamingResponse, finalizeParsing, PRComment } from '../utils/responseParser.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { gunzipSync } from 'zlib';
import { initAnalysisCommentCounter, incrementAnalysisCommentCounter } from '../utils/analysisStreamStore.js';
import { Sandbox } from '@e2b/code-interpreter';

export const createExtensionReview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { repository, branches, changes, feedback, analysis_type } = req.body;

      if (!repository || !branches || !changes) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
      }

      // Determine analysis type (default to extension_analysis)
      const effectiveAnalysisType = analysis_type || 'extension_analysis';

      // Decompress large fields in each file change if they were compressed
      // Note: changes is an object with { summary, commits, files, fullDiff }
      const decompressedFiles = changes.files.map((change: any) => {
        if (change._compressed) {
          const decompressed: any = { ...change };
          let totalCompressedSize = 0;
          let totalDecompressedSize = 0;
          
          // Decompress patch if present
          if (change.patch_compressed) {
            const buffer = Buffer.from(change.patch_compressed, 'base64');
            const unzipped = gunzipSync(buffer);
            decompressed.patch = unzipped.toString('utf-8');
            delete decompressed.patch_compressed;
            
            totalCompressedSize += buffer.length;
            totalDecompressedSize += unzipped.length;
          }
          
          // Decompress content if present
          if (change.content_compressed) {
            const buffer = Buffer.from(change.content_compressed, 'base64');
            const unzipped = gunzipSync(buffer);
            decompressed.content = unzipped.toString('utf-8');
            delete decompressed.content_compressed;
            
            totalCompressedSize += buffer.length;
            totalDecompressedSize += unzipped.length;
          }
          
          // Log decompression metrics
          if (totalCompressedSize > 0) {
            const ratio = ((1 - totalCompressedSize / totalDecompressedSize) * 100).toFixed(1);
            logger.info(`Decompressed fields in ${change.filename}: ${(totalCompressedSize / 1024).toFixed(1)}KB → ${(totalDecompressedSize / 1024).toFixed(1)}KB (${ratio}% was saved)`);
          }
          
          delete decompressed._compressed;
          return decompressed;
        }
        return change;
      });

      // Reconstruct changes object with decompressed files
      const decompressedChanges = {
        ...changes,
        files: decompressedFiles
      };

      // @ts-ignore
      const userId = req.user?._id?.toString();
      
      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Calculate total lines of code reviewed (additions + deletions)
      let reviewedLinesOfCode = 0;
      if (decompressedChanges.files && Array.isArray(decompressedChanges.files)) {
        reviewedLinesOfCode = decompressedChanges.files.reduce((total: number, file: any) => {
          const additions = file.additions || 0;
          const deletions = file.deletions || 0;
          return total + additions + deletions;
        }, 0);
      }
      logger.info(`Extension analysis - Total lines of code to review: ${reviewedLinesOfCode}`);

      const extensionData = new ExtensionData({
        repository,
        branches,
        changes: decompressedChanges,  // Use decompressed changes
        feedback,
        user_id: userId,
      });

      await extensionData.save();

      // Find repository by fullName
      const githubRepo: IGithub_Repository | null = await Github_Repository.findOne({ fullName: repository.fullName });
      const githubRepoId = githubRepo?._id?.toString() ?? null;

      // Pre-create Analysis record to get the Analysis ID for comment counter tracking
      const analysisId = new mongoose.Types.ObjectId();
      const analysisRecord = new Analysis({
        _id: analysisId,
        analysis_type: effectiveAnalysisType,
        userId,
        repoUrl: repository.url,
        github_repositoryId: githubRepoId ? new mongoose.Types.ObjectId(githubRepoId) : undefined,
        extension_data_id: extensionData._id,
        sandboxId: '', // Will be updated by executeAnalysis
        model: "gemini-2.5-pro",
        prompt: `Analyze this code changes for security vulnerabilities, code quality issues, and potential bugs. Provide inline comments and suggestions.`,
        status: 'running',
        reviewedLinesOfCode
      });
      await analysisRecord.save();
      logger.info(`Pre-created Analysis record with ID: ${analysisId}`);

      // Helper function to save comments and increment counter
      const saveCommentsAndIncrementCounter = async (prComments: PRComment[], source: 'stdout' | 'stderr') => {
        try {
          const commentDocs = prComments.map(comment => ({
            extension_data_id: extensionData._id,
            user_id: userId,
            file_path: extractFilePath(comment.content),
            line_start: extractLineStart(comment.content),
            line_end: extractLineEnd(comment.content),
            severity: extractSeverity(comment.content),
            confidence: extractConfidence(comment.content),
            title: extractTitle(comment.content),
            content: comment.content,
            fetched: false
          }));

          await ExtensionComment.insertMany(commentDocs);
          logger.info(`Saved ${commentDocs.length} comments from ${source} to database`);
          
          // Increment the comment counter using the Analysis ID
          try {
            await incrementAnalysisCommentCounter(analysisId.toString(), commentDocs.length);
          } catch (counterError) {
            logger.error('Failed to increment comment counter', counterError);
          }
        } catch (dbError) {
          logger.error(`Failed to save ${source} comments to DB`, dbError);
        }
      };

      // Execute Analysis
      const prompt = `Analyze this code changes for security vulnerabilities, code quality issues, and potential bugs. Provide inline comments and suggestions.`;
      const parserState = createParserState();
      const comments: PRComment[] = [];


      const callbacks = {
        onStdout: async (data: string) => {
          logger.debug("Extension analysis stdout", { data });
          
          const { prComments, state } = parseStreamingResponse(data, parserState);
          Object.assign(parserState, state);
          if (prComments.length > 0) {
            comments.push(...prComments);
            await saveCommentsAndIncrementCounter(prComments, 'stdout');
          }
        },
        onStderr: async (data: string) => {
          console.error('Analysis stderr:', data);
          const { prComments, state } = parseStreamingResponse(data, parserState);
          Object.assign(parserState, state);
          if (prComments.length > 0) {
            comments.push(...prComments);
            await saveCommentsAndIncrementCounter(prComments, 'stderr');
          }
        },
        onProgress: async (message: string) => {
          console.log('Analysis progress:', message);
        }
      };




      // ═══════════════════════════════════════════════════════════
      // IMPORTANT: Return response immediately to prevent timeout
      // Analysis runs in background, comments saved to DB for polling
      // ═══════════════════════════════════════════════════════════
      
      res.status(201).json({
        message: 'Review started',
        data: extensionData,
        extension_data_id: extensionData._id.toString(),
        comments: []  // Will be fetched via polling
      });

      // Run analysis in background (don't await)
      // Analysis status will be tracked in Analysis model by executeAnalysis
      executeAnalysis(
        githubRepoId, // githubRepoId (can be null)
        repository.url, // repoUrl
        branches.head.ref, // branch
        userId, // userId
        prompt,
        effectiveAnalysisType, // analysisType
        "extension",
        callbacks,
        {
          extension_data_id: extensionData._id,
          repo_url: repository.url,
          reviewedLinesOfCode, // Pass lines of code reviewed
        },
        // @ts-ignore
        req.user?.email,
        undefined, // teamId  
        analysisId.toString() // preCreatedAnalysisId - use the Analysis ID we created above
      ).then(async () => {
        logger.info('Background analysis completed', { extension_data_id: extensionData._id, analysis_id: analysisId });
      }).catch(async (error) => {
        logger.error('Background analysis failed', { extension_data_id: extensionData._id, analysis_id: analysisId, error });
      });

      // Don't wait for analysis - it runs in background
      // Comments will be fetched via polling
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({ message: 'Internal server error', error });
    }
  };

/**
 * Get unfetched comments for polling
 * GET /api/extension/comments/:dataId
 */
export const getExtensionComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataId } = req.params;
    // @ts-ignore
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      res.status(400).json({ message: 'Invalid data ID' });
      return;
    }

    // Fetch only unfetched comments for this user
    const comments = await ExtensionComment.find({
      extension_data_id: new mongoose.Types.ObjectId(dataId),
      user_id: userId,
      fetched: false
    })
    .sort({ createdAt: 1 })
    .lean();

    if (comments.length === 0) {
      res.json({ comments: [], count: 0 });
      return;
    }

    // Mark these comments as fetched
    const commentIds = comments.map(c => c._id);
    await ExtensionComment.updateMany(
      { _id: { $in: commentIds } },
      { 
        $set: { 
          fetched: true,
          fetched_at: new Date()
        } 
      }
    );

    // logger.info(`Returned ${comments.length} unfetched comments for dataId: ${dataId}`);

    res.json({
      comments: comments.map(c => ({
        id: c._id,
        file_path: c.file_path,
        line_start: c.line_start,
        line_end: c.line_end,
        severity: c.severity,
        confidence: c.confidence,
        title: c.title,
        content: c.content,
        created_at: c.createdAt
      })),
      count: comments.length
    });

  } catch (error) {
    // logger.error('Error fetching extension comments', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get ALL comments for restoration
 * GET /api/extension/comments/all/:dataId
 */
export const getAllExtensionComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataId } = req.params;
    // @ts-ignore
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      res.status(400).json({ message: 'Invalid data ID' });
      return;
    }

    // Fetch ALL comments (fetched or not)
    const comments = await ExtensionComment.find({
      extension_data_id: new mongoose.Types.ObjectId(dataId),
      user_id: userId
    })
    .sort({ createdAt: 1 })
    .lean();

    res.json({
      comments: comments.map(c => ({
        id: c._id,
        file_path: c.file_path,
        line_start: c.line_start,
        line_end: c.line_end,
        severity: c.severity,
        confidence: c.confidence,
        title: c.title,
        content: c.content,
        created_at: c.createdAt
      })),
      count: comments.length
    });

  } catch (error) {
    logger.error('Error fetching all extension comments', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get analysis status to know when to stop polling
 * GET /api/extension/status/:dataId
 */
export const getAnalysisStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataId } = req.params;
    // @ts-ignore
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      res.status(400).json({ message: 'Invalid data ID' });
      return;
    }

    // Query Analysis model by extension_data_id
    const analysis = await Analysis.findOne({ 
      extension_data_id: new mongoose.Types.ObjectId(dataId) 
    }).select('status').lean() as any;

    if (!analysis) {
      res.status(404).json({ message: 'Analysis not found' });
      return;
    }

    res.json({
      analysis_status: analysis.status || 'running',
      data_id: dataId
    });

  } catch (error) {
    logger.error('Error fetching analysis status', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ═══════════════════════════════════════════
// Helper functions to extract metadata from comments
// ═══════════════════════════════════════════

function extractFilePath(content: string): string {
  const match = content.match(/\*\*File\*\*:\s*`([^`]+)`/);
  return match ? match[1] : 'unknown';
}

function extractLineStart(content: string): number {
  const match = content.match(/\*\*Line_Start\*\*:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function extractLineEnd(content: string): number {
  const match = content.match(/\*\*Line_End\*\*:\s*(\d+)/);
  return match ? parseInt(match[1], 10) : extractLineStart(content);
}

function extractSeverity(content: string): string {
  const match = content.match(/\*\*Severity\*\*:\s*([^\n]+)/);
  return match ? match[1].trim() : 'Medium';
}

function extractConfidence(content: string): string {
  const match = content.match(/\*\*Confidence\*\*:\s*([^\n]+)/);
  return match ? match[1].trim() : '3/5';
}

function extractTitle(content: string): string {
  const match = content.match(/\*\*Title\*\*:\s*([^\n]+)/);
  return match ? match[1].trim() : 'unknown';
}

/**
 * Stop a running extension analysis
 * POST /api/extension/stop/:dataId
 */
export const stopExtensionAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataId } = req.params;
    // @ts-ignore
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(dataId)) {
      res.status(400).json({ message: 'Invalid data ID' });
      return;
    }

    // First, verify ownership through ExtensionData
    const extensionData = await ExtensionData.findById(dataId).lean();

    if (!extensionData) {
      res.status(404).json({ message: 'Extension analysis not found' });
      return;
    }

    // Verify ownership - CRITICAL SECURITY CHECK
    if ((extensionData as any).user_id.toString() !== userId) {
      res.status(403).json({ message: 'Forbidden: You do not own this extension analysis' });
      return;
    }

    // Find the Analysis record by extension_data_id
    const analysis = await Analysis.findOne({ 
      extension_data_id: new mongoose.Types.ObjectId(dataId) 
    });

    if (!analysis) {
      res.status(404).json({ message: 'Analysis record not found' });
      return;
    }

    // Only allow stopping if currently running
    if (analysis.status !== 'running') {
      res.status(200).json({
        message: 'Analysis is not running; no action taken',
        data: {
          data_id: dataId,
          analysis_status: analysis.status
        }
      });
      return;
    }

    // Attempt to kill the sandbox if it exists
    if (analysis.sandboxId) {
      try {
        await Sandbox.kill(analysis.sandboxId);
        logger.info(`Sandbox killed for extension analysis`, { dataId, sandboxId: analysis.sandboxId });
      } catch (killErr: any) {
        logger.warn(`Failed to kill sandbox; proceeding to mark as interrupted`, {
          dataId,
          sandboxId: analysis.sandboxId,
          error: killErr?.message || killErr
        });
      }
    }

    // Update Analysis status to interrupted
    analysis.status = 'interrupted';
    await analysis.save();

    logger.info(`Extension analysis stopped`, { dataId, analysisId: analysis._id, userId });

    res.json({
      message: 'Extension analysis stopped successfully',
      data: {
        data_id: dataId,
        analysis_status: 'interrupted'
      }
    });

  } catch (error) {
    logger.error('Error stopping extension analysis', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
