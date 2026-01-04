import { Router } from 'express';
import { errorFixTimeController } from './errorFixTime.controller';

const router = Router();

// POST /api/error-fix-time - Create a new error fix session
router.post('/', errorFixTimeController.createSession);

// GET /api/error-fix-time/stats - Get stats (longest, shortest, average)
router.get('/stats', errorFixTimeController.getStats);

export default router;