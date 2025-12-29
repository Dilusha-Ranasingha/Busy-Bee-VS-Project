import { Router } from 'express';
import {
  postFileSwitchWindow,
  getFileSwitchWindows,
  getFileSwitchSessions,
} from './fileSwitch.controller.js';

const router = Router();

// Save one 5-min window record
router.post('/windows', postFileSwitchWindow);

// Get all windows for a session
router.get('/windows', getFileSwitchWindows);

// Optional: list sessions for a date
router.get('/sessions', getFileSwitchSessions);

export default router;
