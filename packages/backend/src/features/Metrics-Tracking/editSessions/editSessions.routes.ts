import { Router } from 'express';
import editSessionsController from './editSessions.controller';

const router = Router();

// Create edit session
router.post('/', editSessionsController.createEditSession.bind(editSessionsController));

// Get best sessions
router.get('/best', editSessionsController.getBestSessions.bind(editSessionsController));
router.get('/best/single', editSessionsController.getBestSession.bind(editSessionsController));
router.get('/best/top3', editSessionsController.getTop3Sessions.bind(editSessionsController));

export default router;
