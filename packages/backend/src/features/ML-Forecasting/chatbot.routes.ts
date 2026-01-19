import { Router } from 'express';
import { handleChatMessage, getSuggestedPrompts } from './chatbot.controller';

const router = Router();

/**
 * POST /api/ml-forecasting/chat
 * Send a message to the chatbot
 */
router.post('/chat', handleChatMessage);

/**
 * GET /api/ml-forecasting/chat/prompts/:userId
 * Get suggested prompts for a user
 */
router.get('/chat/prompts/:userId', getSuggestedPrompts);

export default router;
