import { NextFunction, Request, Response } from "express";
import { Github_Repository } from "../models/github_repostries.model.js";
import { CustomError } from "../middlewares/error.js";
import { logger } from "../utils/logger.js";

export const updateRepoSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { repoId } = req.params;
        const {
            analysisType,
            analysisFrequency,
            analysisIntervalDays,
            analysisRequired,
            raiseIssues,
            autoFixBugs,
            trackGithubIssues,
            trackGithubPullRequests,
            customSettings
        } = req.body;

        logger.debug("Updating repository settings", { 
            repoId, 
            userId: req.user?._id,
            settings: req.body 
        });

        // Find the repository
        const repository = await Github_Repository.findById(repoId);
        if (!repository) {
            return next(new CustomError("Repository not found", 404));
        }

        // Prepare update object with only provided fields
        const updateData: any = {};
        
        if (analysisType !== undefined) updateData.analysisType = analysisType;
        if (analysisFrequency !== undefined) updateData.analysisFrequency = analysisFrequency;
        if (analysisIntervalDays !== undefined) updateData.analysisIntervalDays = analysisIntervalDays;
        if (analysisRequired !== undefined) updateData.analysisRequired = analysisRequired;
        if (raiseIssues !== undefined) updateData.raiseIssues = raiseIssues;
        if (autoFixBugs !== undefined) updateData.autoFixBugs = autoFixBugs;
        if (trackGithubIssues !== undefined) updateData.trackGithubIssues = trackGithubIssues;
        if (trackGithubPullRequests !== undefined) updateData.trackGithubPullRequests = trackGithubPullRequests;
        if (customSettings !== undefined) updateData.customSettings = customSettings;

        // Validate analysisIntervalDays if frequency is custom
        if (updateData.analysisFrequency === 'custom' && !updateData.analysisIntervalDays) {
            return next(new CustomError("Analysis interval days is required when frequency is set to custom", 400));
        }

        // Update the repository
        const updatedRepository = await Github_Repository.findByIdAndUpdate(
            repoId,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedRepository) {
            return next(new CustomError("Failed to update repository settings", 500));
        }

        logger.info("Repository settings updated successfully", { 
            repoId, 
            userId: req.user?._id,
            updatedFields: Object.keys(updateData)
        });

        res.status(200).json({
            success: true,
            message: "Repository settings updated successfully",
            data: updatedRepository
        });

    } catch (error: any) {
        logger.error("Error updating repository settings", { 
            error: error instanceof Error ? error.message : error,
            repoId: req.params.repoId,
            userId: req.user?._id
        });
        next(new CustomError(error.message || "Failed to update repository settings", 500));
    }
};

export const getRepoSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { repoId } = req.params;

        logger.debug("Getting repository settings", { 
            repoId, 
            userId: req.user?._id 
        });

        // Find the repository
        const repository = await Github_Repository.findById(repoId);
        if (!repository) {
            return next(new CustomError("Repository not found", 404));
        }

        // Return only the settings fields
        const settings = {
            _id: repository._id,
            fullName: repository.fullName,
            analysisType: repository.analysisType,
            analysisFrequency: repository.analysisFrequency,
            analysisIntervalDays: repository.analysisIntervalDays,
            analysisRequired: repository.analysisRequired,
            raiseIssues: repository.raiseIssues,
            autoFixBugs: repository.autoFixBugs,
            trackGithubIssues: repository.trackGithubIssues,
            trackGithubPullRequests: repository.trackGithubPullRequests,
            customSettings: repository.customSettings
        };

        res.status(200).json({
            success: true,
            data: settings
        });

    } catch (error: any) {
        logger.error("Error getting repository settings", { 
            error: error instanceof Error ? error.message : error,
            repoId: req.params.repoId,
            userId: req.user?._id
        });
        next(new CustomError(error.message || "Failed to get repository settings", 500));
    }
};