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
import { checkAnalysisAccess, checkFeatureAccess, extractAnalysisData } from "../middlewares/checkFeatureAccess.js";

const router: Router = express.Router();

// Public status endpoint
router.get("/status", getAnalysisStatus);

// Protected analysis endpoint
router.use(checkAuth);

// Analysis creation and execution with feature access checks
router.post("/create", 
  checkFeatureAccess('maxAnalysisPerMonth', {
    additionalDataExtractor: extractAnalysisData,
    customErrorMessage: "You've reached your monthly analysis limit. Please upgrade your plan to create more analyses."
  }),
  createAnalysis
);

router.post("/execute", 
  checkAnalysisAccess,
  startAnalysis
);

// Other analysis endpoints (no feature checks needed for viewing)
router.put("/:id/status", updateAnalysisStatus);
router.get("/:id/logs", getRepositoryAnalysisLogs);
router.get("/:github_repositoryId", getRepositoryAnalysis);

export default router;
