import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getRepoTree, getRepoInfo, createIssue, createPullRequest } from "../controllers/github.controller.js";
import { getAllUserInstallations } from "../queries/github.queries.js";

const router: Router = express.Router();

// Public routes (no auth required)
router.get("/tree", checkAuth, getRepoTree);
router.post("/info", checkAuth, getRepoInfo);

// Protected routes (auth required)
router.post("/issue", checkAuth, createIssue);
router.post("/pull-request", checkAuth, createPullRequest);

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
