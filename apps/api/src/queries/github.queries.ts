import { CreateInstallationInput, createInstallationSchema } from "../validations/github.validations.js";
import { Github_Installation } from "../models/github_Installation.js";
import { CustomError } from "../middlewares/error.js";
import userModel from "../models/user.model.js";

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
     
             // Create new installation
             const installation = new Github_Installation({
                 installationId: input.installationId,
                 account: {
                     login: input.account.login,
                     id: input.account.id,
                     type: input.account.type,
                     avatarUrl: input.account.avatarUrl,
                     htmlUrl: input.account.htmlUrl
                 },
                 targetType: input.targetType,
                 repositorySelection: input.repositorySelection,
                 repositories: input.repositories || [],
                 permissions: input.permissions,
                 events: input.events,
                 installedAt: input.installedAt || new Date()
             });
     
             await installation.save();
     
             // Update user with the new installation
            //  await userModel.updateOne(
            //      { _id: payload.userId }, 
            //      { $addToSet: { github_installations: installation._id } }
            //  );  
    } catch (error) {
        
    }
}
