import { Router } from 'express';
import { getForecast } from './forecasting.controller.js';

const router = Router();

// GET /api/forecasting/:userId?days=7
router.get('/:userId', getForecast);

export default router;
