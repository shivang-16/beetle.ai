import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getUser, getUserRepositories } from "../controllers/user.controller.js";

const router: Router = express.Router();

router.use(checkAuth)

router.get("/", getUser)
router.get("/repositories", getUserRepositories)

export default router