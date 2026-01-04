import { Router } from 'express';
import saveEditSessionsController from './saveEditSessions.controller';

const router = Router();

// Create save-edit session
router.post('/', saveEditSessionsController.createSession.bind(saveEditSessionsController));

// Get best sessions
router.get('/best', saveEditSessionsController.getBestSessions.bind(saveEditSessionsController));
router.get('/best/single', saveEditSessionsController.getBestSession.bind(saveEditSessionsController));

export default router;
