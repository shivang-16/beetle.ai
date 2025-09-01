import express, { Router } from "express";
import {
  executeAnalysis,
  getAnalysisStatus,
} from "../controllers/analysis.controller.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

// Public status endpoint
router.get("/status", getAnalysisStatus);

// Protected analysis endpoint
router.use(checkAuth);
router.post("/execute", executeAnalysis);

export default router;
