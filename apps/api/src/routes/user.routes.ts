import express, { Router } from "express";
import { checkAuth } from "../middlewares/checkAuth.js";
import { getUser } from "../controllers/user.controller.js";

const router: Router = express.Router();

router.use(checkAuth)

router.get("/", getUser)

export default router