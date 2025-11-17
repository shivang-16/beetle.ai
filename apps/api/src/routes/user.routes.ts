import express, { Router } from "express";
import { baseAuth, checkAuth } from "../middlewares/checkAuth.js";
import { getUser, getUserRepositories, getUserInstallations, getUserDashboardInfo, getUserSettings, updateUserSettings } from "../controllers/user.controller.js";
import { requestEarlyAccess } from "../controllers/early_access.controller.js";
import { requestUpgrade } from "../controllers/upgrade.controller.js";

const router: Router = express.Router();

router.use(baseAuth)

router.get("/", getUser)
router.get("/repositories", getUserRepositories)
router.get("/installations", getUserInstallations)
router.get("/dashboard", getUserDashboardInfo)
router.post("/request/early-access", baseAuth, requestEarlyAccess);
router.post("/request/upgrade", baseAuth, requestUpgrade);
router.get("/settings", baseAuth, getUserSettings);
router.put("/settings", baseAuth, updateUserSettings);


export default router