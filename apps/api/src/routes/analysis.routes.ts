import express, { Router } from "express";
import {
  createAnalysis,
  startAnalysis,
  getAnalysisStatus,
  getRepositoryAnalysis,
  getRepositoryAnalysisLogs,
  updateAnalysisStatus,
} from "../controllers/analysis.controller.js";
import { baseAuth, checkAuth, teamAuth } from "../middlewares/checkAuth.js";
import { checkAnalysisAccess } from "../middlewares/checkFeatureAccess.js";

const router: Router = express.Router();

// Public status endpoint
router.get("/status", getAnalysisStatus);

// Routes that need full auth (user + subscription + team)
router.post("/create", 
  checkAuth,
  checkAnalysisAccess,
  createAnalysis
);

router.post("/execute", 
  checkAuth,
  checkAnalysisAccess,
  startAnalysis
);


// Routes that only need basic auth (user authentication)
router.put("/:id/status", baseAuth, updateAnalysisStatus);
router.get("/:id/logs", baseAuth, getRepositoryAnalysisLogs);
router.get("/:github_repositoryId", baseAuth, getRepositoryAnalysis);


export default router;
