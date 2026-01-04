import { Router } from 'express';
import focusStreakController from './focusStreak.controller';

const router = Router();

// Create single or multiple streaks
router.post('/', focusStreakController.createFocusStreak.bind(focusStreakController));
router.post('/batch', focusStreakController.createMany.bind(focusStreakController));

// Get best streaks
router.get('/best', focusStreakController.getBestStreaks.bind(focusStreakController));
router.get('/best/global', focusStreakController.getBestGlobalStreak.bind(focusStreakController));
router.get('/best/per-file', focusStreakController.getBestPerFileStreaks.bind(focusStreakController));

export default router;
