import { generateInstallationToken } from "../lib/githubApp.js";
import { getUserGitHubInstallation } from "../queries/github.queries.js";

type AuthenticateGithubUrlResult = {
    success: boolean;
    message: string;
    repoUrl: string;
    usedToken: boolean;
};

export const authenticateGithubRepo = async (repoUrl: string, userId: string): Promise<AuthenticateGithubUrlResult> => {
    // SECURITY FIX: Enhanced input validation
    if (!repoUrl || typeof repoUrl !== 'string') {
        return {
            success: false,
            message: "Invalid repository URL provided",
            repoUrl: "",
            usedToken: false
        };
    }

    // SECURITY FIX: Strict GitHub URL validation
    if (!repoUrl.startsWith("https://github.com/")) {
        return {
            success: false,
            message: "Only GitHub HTTPS URLs are supported",
            repoUrl,
            usedToken: false
        };
    }

    // SECURITY FIX: Enhanced URL pattern matching with stricter validation
    const match = repoUrl.match(/^https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?(?:\/.*)?$/);
    if (!match) {
        return {
            success: false,
            message: "Invalid GitHub repository URL format",
            repoUrl,
            usedToken: false
        };
    }
    const [, owner, repo] = match;
    
    // SECURITY FIX: Validate owner and repo names
    if (!owner || !repo || owner.length > 39 || repo.length > 100) {
        return {
            success: false,
            message: "Invalid repository owner or name",
            repoUrl,
            usedToken: false
        };
    }

    // SECURITY FIX: Sanitize console output to prevent log injection
    console.log(`Processing repo: ${owner}/${repo}`);

    try {
        // SECURITY FIX: Validate userId before processing
        if (!userId || typeof userId !== 'string') {
            return {
                success: false,
                message: "Valid user authentication required for repository access",
                repoUrl,
                usedToken: false
            };
        }
     

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