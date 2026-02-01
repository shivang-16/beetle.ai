import express, { Router } from "express";
import { baseAuth } from "../middlewares/checkAuth.js";
import { getRepoTree, getRepoInfo, openIssue, openPullRequest, getBranches, saveGithubIssue, savePatch, getGithubIssuesWithPullRequests, getIssueStates, syncRepositories } from "../controllers/github.controller.js";
import { getAllUserInstallations } from "../queries/github.queries.js";
import { updateRepoSettings, getRepoSettings, bulkUpdateRepoSettings } from "../controllers/repository.controller.js";
import { handleInstallationCallback, linkInstallationToUser } from "../controllers/github.installation.controller.js";

const router: Router = express.Router();

// Installation callback - NO AUTH (public redirect from GitHub)
router.get("/installation/callback", handleInstallationCallback);


router.use(baseAuth)

router.get("/tree", getRepoTree);
router.get("/branches", getBranches);
router.post("/info", getRepoInfo);
router.get("/issues", getGithubIssuesWithPullRequests);
router.post("/issue-states", getIssueStates);

// Protected routes (auth required)
router.post("/issue", openIssue);
router.post("/pull-request", openPullRequest);

// Save routes for streaming (auth required)
router.post("/save-issue", saveGithubIssue);
router.post("/save-patch", savePatch);

// Repository settings routes (auth required)
router.get("/repository/:repoId/settings", getRepoSettings);
router.put("/repository/:repoId/settings", updateRepoSettings);
router.put("/repository/settings/bulk", bulkUpdateRepoSettings);

// Sync repositories route (auth required) - syncs all user installations
router.post("/sync", syncRepositories);

// Debug endpoint to check installations
router.get("/installations", async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }
    
    const installations = await getAllUserInstallations(userId);
    res.json({ success: true, data: installations });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get installations" });
  }
});

// Link installation to user - REQUIRES AUTH
router.post("/installation/link", linkInstallationToUser);


// Protected routes
// router.use(checkAuth);

// router.get("/list/:installationId", listRepositories)
// router.post("/create", createGithubInstallation)
// router.get("/:installationId", getInstallation)

export default router;
