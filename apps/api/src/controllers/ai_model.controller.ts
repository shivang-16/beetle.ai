import { Request, Response } from 'express';
import mongoose from 'mongoose';
import AIModel from '../models/ai_model.model.js';
import { logger } from '../utils/logger.js';

export const getAvailableModels = async (req: Request, res: Response) => {
  try {
    const planId = req.sub?.planId;
    console.log(planId?.toString(), "here is the planId", req.query.mode)
    if (!planId) {
      return res.status(200).json({ success: true, data: [] });
    }

    const planObjectId = typeof planId === 'string' ? new mongoose.Types.ObjectId(planId) : planId;
    const modeParam = typeof req.query.mode === 'string' ? req.query.mode.toLowerCase() : undefined;
    const mode = modeParam === 'pr_analysis' || modeParam === 'full_repo_analysis' ? modeParam : undefined;
    const filter: any = { isActive: true, allowedPlans: { $in: planObjectId } };
    if (mode) filter.allowedModes = { $in: mode };
    const models = await AIModel.find(filter)
      .select('_id name provider')
      .sort({ name: 1 })
      .lean();

      console.log(models, "here are the allowd models for the user", req.query.mode)
    return res.status(200).json({ success: true, data: models || [] });
  } catch (error) {
    logger.error(`getAvailableModels error: ${error}`);
    return res.status(500).json({ success: false, message: 'Failed to fetch models' });
  }
};