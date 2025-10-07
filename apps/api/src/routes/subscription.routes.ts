import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getSubscriptionFeatures, checkProjectCreationLimit } from "../controllers/subscription.controller.js";

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(checkAuth);

// Test endpoint to get subscription features
router.get("/features", getSubscriptionFeatures);

// Test endpoint to check project creation limits
router.post("/check-project-limit", checkProjectCreationLimit);

export default router;