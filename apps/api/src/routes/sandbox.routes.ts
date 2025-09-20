import express, { Router } from "express";
import { getPrData } from "../controllers/sandbox.contorller.js";
import { checkSandboxAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

router.use(checkSandboxAuth);
router.get("/pr/:id", getPrData);

export default router;