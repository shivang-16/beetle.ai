import { NextFunction, Request, Response } from "express";
import { CustomError } from "./error.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/user.model.js";

declare global {
  namespace Express {
    interface Request {
      user?: any; 
      isServerRequest?: boolean;
    }
  }
}
export const checkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { token } = req.cookies;
  if (!token) return next(new CustomError("Authentication required", 401));

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new CustomError("JWT Secret not defined", 400));

  const decoded = jwt.verify(token, secret) as JwtPayload;
  req.user = await User.findById(decoded.id);

  next();
};

