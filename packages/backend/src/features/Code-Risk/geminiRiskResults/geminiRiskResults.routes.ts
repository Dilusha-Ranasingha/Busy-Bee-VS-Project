import { Router } from 'express';
import { GeminiRiskResultsController } from './geminiRiskResults.controller';

const router = Router();

// Create risk result from error session (triggers Gemini API)
router.post('/from-session/:errorSessionId', GeminiRiskResultsController.createFromErrorSession);

// Get active risk results for a user
router.get('/user/:userId/active', GeminiRiskResultsController.getActiveResultsByUser);

// Get active risk result for a specific file
router.get('/user/:userId/file', GeminiRiskResultsController.getActiveResultByFile);

// Get all risk results for a user
router.get('/user/:userId', GeminiRiskResultsController.getAllResultsByUser);

// Deactivate risk results for a specific file
router.post('/user/:userId/deactivate-file', GeminiRiskResultsController.deactivateResultsForFile);

// Deactivate a specific result
router.post('/:id/deactivate', GeminiRiskResultsController.deactivateResult);

export default router;
