import { Github_Installation } from "../models/github_installations.model.js";
import User from "../models/user.model.js";

export const createUser = async (data: any) => {
    try {
        const user = await User.create(data);

        const github_installations = await Github_Installation.find({ "sender.login": user.username });

        if (github_installations.length > 0) {
            user.github_installations = github_installations;
            await user.save();
        }
        return user;
    } catch (error) {
        throw error;
    }
    
}
