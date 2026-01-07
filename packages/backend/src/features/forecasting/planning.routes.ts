import { Router } from "express";
import { createPlan } from "./planning.controller.js";

const router = Router();

// POST /api/forecasting/:userId/plan
router.post("/:userId/plan", createPlan);

export default router;
