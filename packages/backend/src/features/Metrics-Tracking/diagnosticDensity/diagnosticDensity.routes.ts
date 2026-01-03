import { Router } from 'express';
import { diagnosticDensityController } from './diagnosticDensity.controller';

const router = Router();

// POST /api/diagnostic-density - Create a new diagnostic density event
router.post('/', diagnosticDensityController.createEvent);

// GET /api/diagnostic-density/extremes - Get highest, lowest non-zero, and latest zero density events
router.get('/extremes', diagnosticDensityController.getExtremes);

export default router;
