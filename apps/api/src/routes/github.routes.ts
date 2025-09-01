import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getRepoTree, getRepoInfo } from "../controllers/github.controller.js";

const router: Router = express.Router();

// Public routes (no auth required)
router.get("/tree", getRepoTree);
router.post("/info", getRepoInfo);

// Protected routes
// router.use(checkAuth);

// router.get("/list/:installationId", listRepositories)
// router.post("/create", createGithubInstallation)
// router.get("/:installationId", getInstallation)

export default router;
