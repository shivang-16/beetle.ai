import express, { Router } from "express";
import { baseAuth, checkAuth } from "../middlewares/checkAuth.js";
import { getUser, getUserRepositories, getUserInstallations, getUserDashboardInfo } from "../controllers/user.controller.js";

const router: Router = express.Router();

router.use(baseAuth)

router.get("/", getUser)
router.get("/repositories", getUserRepositories)
router.get("/installations", getUserInstallations)
router.get("/dashboard", getUserDashboardInfo)

export default router