// apps/api/src/controllers/github.controller.ts
import { NextFunction, Request, Response } from 'express';
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';
import { CustomError } from '../middlewares/error.js';

