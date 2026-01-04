import { Router } from 'express';
import { commitEditSessionsController } from './commitEditSessions.controller';

const router = Router();

router.post('/', commitEditSessionsController.createSession);
router.get('/stats', commitEditSessionsController.getStats);

export default router;
