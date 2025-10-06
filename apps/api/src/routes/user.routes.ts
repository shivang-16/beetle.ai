import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getUser, getUserRepositories, getUserInstallations, getUserDashboardInfo, getTeamDashboardInfo } from "../controllers/user.controller.js";

const router: Router = express.Router();

router.use(checkAuth)

router.get("/", getUser)
router.get("/repositories", getUserRepositories)
router.get("/installations", getUserInstallations)
router.get("/dashboard", getUserDashboardInfo)
router.get("/team/dashboard", getTeamDashboardInfo)

export default router