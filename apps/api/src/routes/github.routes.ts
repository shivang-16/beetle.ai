import express, { Router } from "express";
import { listInstallations, getInstallation, createGithubInstallation } from "../controllers/github.controller.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

router.use(checkAuth)

router.get("/", listInstallations)
router.post("/create", createGithubInstallation)
router.get("/:installationId", getInstallation)

export default router
