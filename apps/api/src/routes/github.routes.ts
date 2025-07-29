import express, { Router } from "express";
import { listUserInstallations, getInstallation, createGithubInstallation, listRepositories } from "../controllers/github.controller.js";
import { checkAuth } from "../middlewares/checkAuth.js";

const router: Router = express.Router();

router.get("/list/:installationId", listRepositories)

router.use(checkAuth)

router.get("/", listUserInstallations)
router.post("/create", createGithubInstallation)
router.get("/:installationId", getInstallation)

export default router
