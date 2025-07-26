import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { CustomError } from '../middlewares/error.js';

export const validate = (schema: ZodObject<any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          message: `${issue.path.join('.')} is ${issue.message}`,
        }));
        return next(new CustomError(`Validation error: ${JSON.stringify(errorMessages)}`, 400));
      }
      return next(new CustomError('Internal server error', 500));
    }
  };