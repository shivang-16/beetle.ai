import express, { Router } from "express";
import {
  createAnalysis,
  startAnalysis,
  getAnalysisStatus,
  getRepositoryAnalysis,
  getRepositoryAnalysisLogs,
  updateAnalysisStatus,
} from "../controllers/analysis.controller.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

// Public status endpoint
router.get("/status", getAnalysisStatus);

// Protected analysis endpoint
router.use(checkAuth);
router.post("/create", createAnalysis);
router.post("/execute", startAnalysis);
router.put("/:id/status", updateAnalysisStatus);
router.get("/:id/logs", getRepositoryAnalysisLogs);
router.get("/:github_repositoryId", getRepositoryAnalysis);

export default router;
