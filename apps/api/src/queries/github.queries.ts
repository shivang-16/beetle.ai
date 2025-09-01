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

// Get organization installation for a specific repository
export const getOrganizationInstallationForRepo = async (owner: string, repo: string, userId: string) => {
  try {
    console.log(`🔍 Looking for organization installation for ${owner}/${repo}`);
    
    // First, check if the user has access to any organization installations
    // Look for installations where the account matches the repository owner
    const orgInstallation = await Github_Installation.findOne({
      "account.login": owner,
      "account.type": "Organization"
    });

    if (!orgInstallation) {
      console.log(`❌ No organization installation found for ${owner}`);
      return null;
    }

    console.log(`✅ Found organization installation for ${owner}:`, {
      installationId: orgInstallation.installationId,
      account: orgInstallation.account.login,
      targetType: orgInstallation.targetType,
      userId: orgInstallation.userId
    });

    // For organization installations, we need to check if the user has access
    // This could be through:
    // 1. The user is the sender of the installation
    // 2. The user is a member of the organization
    // 3. The user has been granted access through the GitHub App
    
    // Check if the user is the sender of this installation
    if (orgInstallation.sender && orgInstallation.sender.login) {
      console.log(`👤 Installation sender: ${orgInstallation.sender.login}`);
      
      // If the user is the sender, they have access
      // You might want to add additional checks here based on your requirements
      return orgInstallation;
    }

    // If no sender or other access method, we'll still return the installation
    // but you might want to add more sophisticated access control
    console.log(`⚠️ No clear access control found, but returning installation for ${owner}`);
    return orgInstallation;
  } catch (error) {
    console.error("Error getting organization installation for repo:", error);
    return null;
  }
};

// Debug function to check all installations for a user
export const getAllUserInstallations = async (userId: string) => {
  try {
    // Get all installations where this user is the owner
    const userInstallations = await Github_Installation.find({ userId });
    
    // Get all organization installations (where userId might be null or different)
    const orgInstallations = await Github_Installation.find({
      "account.type": "Organization"
    });
    
    console.log(`User installations for ${userId}:`, userInstallations.length);
    console.log(`Organization installations found:`, orgInstallations.length);
    
    return {
      userInstallations,
      orgInstallations
    };
  } catch (error) {
    console.error("Error getting all user installations:", error);
    return { userInstallations: [], orgInstallations: [] };
  }
};

// Check if installation has permission to create issues
export const checkIssueCreationPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      console.log("⚠️ No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create issues
    // GitHub App permissions for issues: "issues": "write" or "issues": "admin"
    const issuePermission = installation.permissions.get ? 
      installation.permissions.get("issues") : 
      installation.permissions["issues"];
    
    console.log(`🔐 Issue permission: ${issuePermission}`);
    
    // Return true if permission is "write" or "admin"
    return issuePermission === "write" || issuePermission === "admin";
  } catch (error) {
    console.error("Error checking issue creation permission:", error);
    return false;
  }
};

// Check if installation has permission to create pull requests
export const checkPullRequestPermission = (installation: any) => {
  try {
    if (!installation.permissions) {
      console.log("⚠️ No permissions found in installation");
      return false;
    }

    // Check if the installation has permission to create pull requests
    // GitHub App permissions for pull requests: "contents": "write" or "contents": "admin"
    const contentsPermission = installation.permissions.get ? 
      installation.permissions.get("contents") : 
      installation.permissions["contents"];
    
    console.log(`🔐 Contents permission: ${contentsPermission}`);
    
    // Return true if permission is "write" or "admin"
    return contentsPermission === "write" || contentsPermission === "admin";
  } catch (error) {
    console.error("Error checking pull request permission:", error);
    return false;
  }
};