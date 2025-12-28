import { NextFunction, Request, Response } from 'express';
import CustomContext, { ICustomContext, DEFAULT_REVIEW_PROMPTS } from '../models/custom_context.model.js';
import { sanitizePrompt, optimizeCustomRules } from '../utils/gemini.helper.js';

export const getCustomContexts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    // const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    // const limit = parseInt(req.query.limit as string) || 10;
    const query = (req.query.query as string) || '';
    const skip = (page - 1) * limit;

    // const filter: Record<string, unknown> = {
    //   createdBy: userId,
    //   team: teamId || userId,
    // };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { customPrompt: { $regex: query, $options: 'i' } },
      ];
    }

    const [contexts, total] = await Promise.all([
      CustomContext.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CustomContext.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 'success',
      data: contexts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomContextById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const context = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!context) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const createCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const {
      name,
      customPrompt,
      repositories,
      styleReviews,
      securityReviews,
      performanceReviews,
      codeQualityReviews,
      documentationReviews,
      accessibilityReviews,
      bestPracticesReviews,
      isActive,
      isDefault,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    // Helper to create review config - only uses 'enabled' from request, always uses defaults for description/prompt
    const createReviewConfig = (
      requestConfig: { enabled?: boolean } | undefined,
      defaultConfig: { description: string; prompt: string },
      defaultEnabled: boolean
    ) => ({
      enabled: requestConfig?.enabled ?? defaultEnabled,
      description: defaultConfig.description,
      prompt: defaultConfig.prompt,
    });

    const contextData: Partial<ICustomContext> = {
      name: name.trim(),
      createdBy: userId,
      team: teamId || userId,
      customPrompt: sanitizePrompt(customPrompt || ''),
      repositories: repositories || [],
      styleReviews: createReviewConfig(styleReviews, DEFAULT_REVIEW_PROMPTS.styleReviews, false),
      securityReviews: createReviewConfig(securityReviews, DEFAULT_REVIEW_PROMPTS.securityReviews, true),
      performanceReviews: createReviewConfig(performanceReviews, DEFAULT_REVIEW_PROMPTS.performanceReviews, true),
      codeQualityReviews: createReviewConfig(codeQualityReviews, DEFAULT_REVIEW_PROMPTS.codeQualityReviews, true),
      documentationReviews: createReviewConfig(documentationReviews, DEFAULT_REVIEW_PROMPTS.documentationReviews, false),
      accessibilityReviews: createReviewConfig(accessibilityReviews, DEFAULT_REVIEW_PROMPTS.accessibilityReviews, false),
      bestPracticesReviews: createReviewConfig(bestPracticesReviews, DEFAULT_REVIEW_PROMPTS.bestPracticesReviews, true),
      isActive: isActive ?? true,
      isDefault: isDefault ?? false,
    };

    if (isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true },
        { isDefault: false }
      );
    }

    const context = await CustomContext.create(contextData);

    res.status(201).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const updateCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const existingContext = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!existingContext) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    const {
      name,
      customPrompt,
      repositories,
      styleReviews,
      securityReviews,
      performanceReviews,
      codeQualityReviews,
      documentationReviews,
      accessibilityReviews,
      bestPracticesReviews,
      isActive,
      isDefault,
    } = req.body;

    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ status: 'error', message: 'Name cannot be empty' });
    }

    if (isDefault && !existingContext.isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    // Helper to update review config - only uses 'enabled' from request, always uses defaults for description/prompt
    const updateReviewConfig = (
      requestConfig: { enabled?: boolean } | undefined,
      existingConfig: { enabled: boolean },
      defaultConfig: { description: string; prompt: string }
    ) => {
      if (requestConfig === undefined) return undefined;
      return {
        enabled: requestConfig.enabled ?? existingConfig.enabled,
        description: defaultConfig.description,
        prompt: defaultConfig.prompt,
      };
    };

    const updateData: Partial<ICustomContext> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (customPrompt !== undefined) updateData.customPrompt = sanitizePrompt(customPrompt);
    if (repositories !== undefined) updateData.repositories = repositories;
    
    // For review types, only update enabled status and always use default prompts
    const styleUpdate = updateReviewConfig(styleReviews, existingContext.styleReviews, DEFAULT_REVIEW_PROMPTS.styleReviews);
    if (styleUpdate) updateData.styleReviews = styleUpdate;
    
    const securityUpdate = updateReviewConfig(securityReviews, existingContext.securityReviews, DEFAULT_REVIEW_PROMPTS.securityReviews);
    if (securityUpdate) updateData.securityReviews = securityUpdate;
    
    const performanceUpdate = updateReviewConfig(performanceReviews, existingContext.performanceReviews, DEFAULT_REVIEW_PROMPTS.performanceReviews);
    if (performanceUpdate) updateData.performanceReviews = performanceUpdate;
    
    const codeQualityUpdate = updateReviewConfig(codeQualityReviews, existingContext.codeQualityReviews, DEFAULT_REVIEW_PROMPTS.codeQualityReviews);
    if (codeQualityUpdate) updateData.codeQualityReviews = codeQualityUpdate;
    
    const documentationUpdate = updateReviewConfig(documentationReviews, existingContext.documentationReviews, DEFAULT_REVIEW_PROMPTS.documentationReviews);
    if (documentationUpdate) updateData.documentationReviews = documentationUpdate;
    
    const accessibilityUpdate = updateReviewConfig(accessibilityReviews, existingContext.accessibilityReviews, DEFAULT_REVIEW_PROMPTS.accessibilityReviews);
    if (accessibilityUpdate) updateData.accessibilityReviews = accessibilityUpdate;
    
    const bestPracticesUpdate = updateReviewConfig(bestPracticesReviews, existingContext.bestPracticesReviews, DEFAULT_REVIEW_PROMPTS.bestPracticesReviews);
    if (bestPracticesUpdate) updateData.bestPracticesReviews = bestPracticesUpdate;
    
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const context = await CustomContext.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const patchCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const teamId = req.headers['x-team-id'] as string || req.team?.id || req.org?.id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const existingContext = await CustomContext.findOne({ _id: id, createdBy: userId });

    if (!existingContext) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    const { isActive, isDefault } = req.body;

    if (isDefault && !existingContext.isDefault) {
      await CustomContext.updateMany(
        { team: teamId || userId, isDefault: true, _id: { $ne: id } },
        { isDefault: false }
      );
    }

    const updateData: Partial<ICustomContext> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const context = await CustomContext.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({ status: 'success', data: context });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const context = await CustomContext.findOneAndDelete({ _id: id, createdBy: userId });

    if (!context) {
      return res.status(404).json({ status: 'error', message: 'Custom context not found' });
    }

    res.status(200).json({ status: 'success', message: 'Custom context deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getDefaultPrompts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ status: 'success', data: DEFAULT_REVIEW_PROMPTS });
  } catch (error) {
    next(error);
  }
};

export const optimizePrompt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ status: 'error', message: 'Prompt is required' });
    }

    const optimized = await optimizeCustomRules(prompt);

    res.status(200).json({ status: 'success', data: { optimizedPrompt: optimized } });
  } catch (error) {
    next(error);
  }
};
