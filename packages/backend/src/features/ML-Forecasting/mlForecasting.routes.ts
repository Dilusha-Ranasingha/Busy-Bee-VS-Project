import { Router } from 'express';
import { MLForecastingController } from './mlForecasting.controller';
import { handleChatMessage, getSuggestedPrompts } from './chatbot.controller';
import { Pool } from 'pg';

export function createMLForecastingRouter(pool: Pool): Router {
  const router = Router();
  const controller = new MLForecastingController(pool);

  // Training
  router.post('/train', controller.trainModel);

  // Forecasting
  router.get('/forecast/:userId', controller.getForecast);
  router.get('/forecast/:userId/confidence', controller.getForecastWithConfidence);

  // Plan Generation
  router.post('/generate-plan', controller.generatePlan);
  router.get('/plans/:userId', controller.getUserPlans);

  // Model Info
  router.get('/model-info/:userId', controller.getModelInfo);

  // Health Check
  router.get('/health', controller.checkHealth);

  // Chatbot routes
  router.post('/chat', handleChatMessage);
  router.get('/chat/prompts/:userId', getSuggestedPrompts);

  return router;
}
