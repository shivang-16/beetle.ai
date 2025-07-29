import { NextFunction, Request, Response } from "express";
import User from "../models/user.model.js";
import { CustomError } from "../middlewares/error.js";

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