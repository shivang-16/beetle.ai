import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation } from "../queries/github.queries.js";

type AuthenticateGithubUrlResult = {
    success: boolean;
    message: string;
    repoUrl: string;
    usedToken: boolean;
};

export const authenticateGithubRepo = async (repoUrl: string, userId: string): Promise<AuthenticateGithubUrlResult> => {
    // If it's not a GitHub HTTPS URL, return as-is
    if (!repoUrl || !repoUrl.startsWith("https://github.com/")) {
        return {
            success: true,
            message: "Non-GitHub or unsupported URL. Leaving as-is.",
            repoUrl,
            usedToken: false
        };
    }

    // Extract owner and repo from URL
    const match = decodeURIComponent(repoUrl).match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (!match) {
        return {
            success: false,
            message: "Invalid GitHub repository URL",
            repoUrl,
            usedToken: false
        };
    }
    const [, owner, repo] = match;
    console.log(owner, repo,"owner, repo");


    try {
     

        // Private or internal repository: require user context to mint token
        if (!userId) {
            return {
                success: false,
                message: "Private repository requires authenticated user context.",
                repoUrl,
                usedToken: false
            };
        }

        const installation = await getUserGitHubInstallation(userId);
        console.log("🔑 Generating GitHub installation token for private repository access...");
        const githubToken = await generateInstallationToken(installation.installationId);
        console.log("✅ GitHub token generated successfully");

        const authenticatedRepoUrl = repoUrl.replace(
            "https://github.com/",
            `https://x-access-token:${githubToken}@github.com/`
        );

        console.log("🔐 Using GitHub token for private repository access");

        return {
            success: true,
            message: "GitHub token generated successfully",
            repoUrl: authenticatedRepoUrl,
            usedToken: true
        };
    } catch (error) {
        console.log("⚠️ Failed to authenticate repository URL:", error);
        return {
            success: false,
            message: "Failed to authenticate repository URL for private repository.",
            repoUrl,
            usedToken: false
        };
    }
};