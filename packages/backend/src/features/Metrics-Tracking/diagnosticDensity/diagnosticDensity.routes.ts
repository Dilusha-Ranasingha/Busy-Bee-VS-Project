import { Router } from 'express';
import { diagnosticDensityController } from './diagnosticDensity.controller';

const router = Router();

// POST /api/diagnostic-density - Create a new diagnostic density session
router.post('/', diagnosticDensityController.createSession);

// GET /api/diagnostic-density/best - Get highest and lowest peak density sessions
router.get('/best', diagnosticDensityController.getBestSessions);

export default router;
