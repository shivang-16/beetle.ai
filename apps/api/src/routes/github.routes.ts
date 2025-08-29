import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

// router.get("/list/:installationId", listRepositories)

router.use(checkAuth)

// router.post("/create", createGithubInstallation)
// router.get("/:installationId", getInstallation)

export default router
