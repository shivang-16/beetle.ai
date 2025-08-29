import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import { CustomError } from "../middlewares/error.js";
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return next(new CustomError("User not found", 404));
        }
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        return next(new CustomError("User not found", 404));
    }
}

export const getUserRepositories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { account } = req.query;
      
      // Find all installations for the user
      let installations;
      if (account === 'all' || !account) {
        // Get all installations for the user
        installations = await Github_Installation.find({userId: req.user._id}).sort({ installedAt: -1 });
      } else {
        // Get specific installation by account name
        installations = await Github_Installation.find({
          userId: req.user._id,
          'account.login': account
        }).sort({ installedAt: -1 });
      }
  
      if (!installations || installations.length === 0) {
        return next(new CustomError('No installations found', 404));
      }
  
      // Group repositories by account name
      const repositoriesByAccount: Record<string, any[]> = {};
  
      for (const installation of installations) {
        const accountName = installation.account.login;
        
        // Get repositories for this installation
        const repositories = await Github_Repository.find({
          github_installationId: installation._id
        });
  
        if (!repositoriesByAccount[accountName]) {
          repositoriesByAccount[accountName] = [];
        }
        
        repositoriesByAccount[accountName].push(...repositories);
      }
  
      res.status(200).json({
        success: true,
        data: repositoriesByAccount
      });
      
    } catch (error) {
      console.error('Error getting user repositories:', error);
      next(new CustomError('Failed to get user repositories', 500));
    }
  }