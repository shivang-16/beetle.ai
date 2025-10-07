import express, { Router } from "express";
import { baseAuth, checkAuth, teamAuth } from "../middlewares/checkAuth.js";
import { getRepoTree, getRepoInfo, openIssue, openPullRequest, getBranches, saveGithubIssue, savePatch, getGithubIssuesWithPullRequests, getIssueStates, syncRepositories } from "../controllers/github.controller.js";
import { getAllUserInstallations } from "../queries/github.queries.js";
import { updateRepoSettings, getRepoSettings } from "../controllers/repository.controller.js";

const router: Router = express.Router();

router.use(baseAuth)

// Public routes (no auth required)
router.get("/tree", teamAuth, getRepoTree);
router.get("/branches", teamAuth, getBranches);
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

// Protected routes
// router.use(checkAuth);

// router.get("/list/:installationId", listRepositories)
// router.post("/create", createGithubInstallation)
// router.get("/:installationId", getInstallation)

export default router;
