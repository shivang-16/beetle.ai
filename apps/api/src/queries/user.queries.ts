import { Github_Installation } from "../models/github_installations.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export interface CreateUserData {
  _id: string;
  email?: string;
  firstName: string;
  lastName?: string;
  username: string;
  avatarUrl?: string;
  subscriptionPlanId?: mongoose.Schema.Types.ObjectId | string;
  subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'free';
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
}

export const createUser = async (data: CreateUserData) => {
    try {
        const user = await User.create(data);

        const github_installations = await Github_Installation.find({ "sender.login": user.username });

        if (github_installations.length > 0) {
            await Github_Installation.updateMany({ "sender.login": user.username }, { userId: user._id });
        }
        
        return user;
    } catch (error) {
        throw error;
    }
    
}
