import { Router } from 'express';
import * as idleSessionsController from './idleSessions.controller';

const router = Router();

router.post('/', idleSessionsController.createSession);
router.get('/stats', idleSessionsController.getStats);

export default router;
