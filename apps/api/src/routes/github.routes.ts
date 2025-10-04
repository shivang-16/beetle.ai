import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getRepoTree, getRepoInfo, openIssue, openPullRequest, getBranches, saveGithubIssue, savePatch, getGithubIssuesWithPullRequests, getIssueStates, syncRepositories } from "../controllers/github.controller.js";
import { getAllUserInstallations } from "../queries/github.queries.js";
import { updateRepoSettings, getRepoSettings } from "../controllers/repository.controller.js";

const router: Router = express.Router();

// Public routes (no auth required)
router.get("/tree", checkAuth, getRepoTree);
router.get("/branches", checkAuth, getBranches);
router.post("/info", checkAuth, getRepoInfo);
router.get("/issues", checkAuth, getGithubIssuesWithPullRequests);
router.post("/issue-states", checkAuth, getIssueStates);

// Protected routes (auth required)
router.post("/issue", checkAuth, openIssue);
router.post("/pull-request", checkAuth, openPullRequest);

// Save routes for streaming (auth required)
router.post("/save-issue", checkAuth, saveGithubIssue);
router.post("/save-patch", checkAuth, savePatch);

// Repository settings routes (auth required)
router.get("/repository/:repoId/settings", checkAuth, getRepoSettings);
router.put("/repository/:repoId/settings", checkAuth, updateRepoSettings);

// Sync repositories route (auth required) - syncs all user installations
router.post("/sync", checkAuth, syncRepositories);

// Debug endpoint to check installations
router.get("/installations", checkAuth, async (req, res) => {
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

// Protected routes
// router.use(checkAuth);

// router.get("/list/:installationId", listRepositories)
// router.post("/create", createGithubInstallation)
// router.get("/:installationId", getInstallation)

export default router;
