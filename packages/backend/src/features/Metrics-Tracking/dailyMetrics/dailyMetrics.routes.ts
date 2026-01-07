import { Router } from 'express';
import * as dailyMetricsController from './dailyMetrics.controller';

const router = Router();

router.get('/', dailyMetricsController.getDailyMetrics);
router.get('/range', dailyMetricsController.getDailyMetricsRange);
router.post('/trigger', dailyMetricsController.triggerAggregation);

export default router;
