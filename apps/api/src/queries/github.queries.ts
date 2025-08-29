import { CreateInstallationInput, createInstallationSchema } from "../validations/github.validations.js";
import { Github_Installation } from "../models/github_installations.model.js";
import { CustomError } from "../middlewares/error.js";
import User from "../models/user.model.js";
import { Github_Repository } from "../models/github_repostries.model.js";

export const create_github_installation = async (payload: CreateInstallationInput) => {
    try {
      const validationResult = createInstallationSchema.safeParse(payload);
             
             if (!validationResult.success) {
               const errorMessages = validationResult.error.issues.map((issue) => ({
                 message: `${issue.path.join('.')} is ${issue.message}`,
               }));
                 return new CustomError(`Validation error: ${JSON.stringify(errorMessages)}`, 400);
             }
     
             const input: CreateInstallationInput = validationResult.data;
             
             // Check if installation already exists
             const existingInstallation = await Github_Installation.findOne({ installationId: input.installationId });
             
             if (existingInstallation) {
                 return new CustomError('Installation already exists', 409);
             }
            
             const user = await User.findOne({ username: input.sender.login });

             const installation_data = {
              installationId: input.installationId,
              userId: user ? user._id.toString() : null,
                 account: {
                     login: input.account.login,
                     id: input.account.id,
                     type: input.account.type,
                     avatarUrl: input.account.avatarUrl,
                     htmlUrl: input.account.htmlUrl
                 },
                 sender: {
                     login: input.sender.login,
                     id: input.sender.id,
                     type: input.sender.type,
                     avatarUrl: input.sender.avatarUrl,
                     htmlUrl: input.sender.htmlUrl
                 },
                 targetType: input.targetType,
                 repositorySelection: input.repositorySelection,
                 permissions: input.permissions,
                 events: input.events,
                 installedAt: input.installedAt || new Date()
             }

             // Create new installation
             const installation = new Github_Installation(installation_data);
     
             await installation.save();
     
      
             await Github_Repository.insertMany(
                 input.repositories?.map((repo) => ({
                     github_installationId: installation._id,
                     repositoryId: repo.id,
                     fullName: repo.fullName,
                     private: repo.private
                 })) || []
             );

             console.log("User updated")
             return installation;
    } catch (error) {
        console.log(error)
    }
}

export const delete_github_installation = async (installationId: number) => {
  try {
    const installation = await Github_Installation.findOne({ installationId });

    if (!installation) {
      throw new CustomError("Installation not found", 404);
    }

    // Step 1: Remove the installation from users' github_installations array
    await User.updateMany(
      { github_installations: installation._id },
      { $pull: { github_installations: installation._id } }
    );

    // Step 2: Delete the installation itself
    await installation.deleteOne();

    await Github_Repository.deleteMany({ github_installationId: installation._id });

    return { message: "Installation and references deleted successfully" };
  } catch (error) {
    console.error("Error deleting GitHub installation:", error);
    throw new CustomError("Failed to delete GitHub installation", 500);
  }
};

// Get user's GitHub installation for token generation
export const getUserGitHubInstallation = async (userId: string) => {
  try {
    const installation = await Github_Installation.findOne({ userId });
    
    if (!installation) {
      throw new CustomError("No GitHub installation found for this user. Please install the GitHub App first.", 404);
    }
    
    return installation;
  } catch (error) {
    console.error("Error getting user GitHub installation:", error);
    throw new CustomError("Failed to get GitHub installation", 500);
  }
};