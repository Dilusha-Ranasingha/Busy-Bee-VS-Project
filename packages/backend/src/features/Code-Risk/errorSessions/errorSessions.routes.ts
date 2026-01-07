import { Router } from 'express';
import { ErrorSessionsController } from './errorSessions.controller';

const router = Router();

// Create a new error session
router.post('/', ErrorSessionsController.createSession);

// Get error sessions by user
router.get('/user/:userId', ErrorSessionsController.getSessionsByUser);

// Get error sessions by file
router.get('/file', ErrorSessionsController.getSessionsByFile);

// Get recent sessions (last 24 hours)
router.get('/user/:userId/recent', ErrorSessionsController.getRecentSessions);

// Get pending sessions (not sent to Gemini)
router.get('/pending', ErrorSessionsController.getPendingSessions);

export default router;
