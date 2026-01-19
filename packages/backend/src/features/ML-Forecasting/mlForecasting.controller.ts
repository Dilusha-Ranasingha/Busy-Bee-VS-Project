import { Request, Response } from 'express';
import { MLForecastingService } from './mlForecasting.service';
import { Pool } from 'pg';

export class MLForecastingController {
  private service: MLForecastingService;

  constructor(pool: Pool) {
    this.service = new MLForecastingService(pool);
  }

  /**
   * POST /api/ml-forecasting/train
   * Train ML model for a user
   */
  trainModel = async (req: Request, res: Response) => {
    try {
      const { user_id, days_history } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required' });
      }

      const result = await this.service.trainModel(user_id, days_history || 90);

      if (result.status === 'error') {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Train model error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ml-forecasting/forecast/:userId
   * Get productivity forecast for a user
   */
  getForecast = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      if (days > 7 || days < 1) {
        return res.status(400).json({ error: 'days must be between 1 and 7' });
      }

      const result = await this.service.getForecast(userId, days);

      if (result.status === 'error') {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Get forecast error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ml-forecasting/forecast/:userId/confidence
   * Get forecast with confidence intervals
   */
  getForecastWithConfidence = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await this.service.getForecastWithConfidence(userId, days);

      if (result.status === 'error') {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Get confidence forecast error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * POST /api/ml-forecasting/generate-plan
   * Generate productivity plan
   */
  generatePlan = async (req: Request, res: Response) => {
    try {
      const { user_id, start_date, end_date, target_hours } = req.body;

      if (!user_id || !start_date || !end_date || !target_hours) {
        return res.status(400).json({
          error: 'user_id, start_date, end_date, and target_hours are required',
        });
      }

      const result = await this.service.generatePlan(
        user_id,
        start_date,
        end_date,
        target_hours
      );

      if (result.status === 'error') {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Generate plan error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ml-forecasting/plans/:userId
   * Get user's saved plans
   */
  getUserPlans = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const plans = await this.service.getUserPlans(userId, limit);

      return res.status(200).json({
        status: 'success',
        user_id: userId,
        plans,
      });
    } catch (error: any) {
      console.error('Get user plans error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ml-forecasting/model-info/:userId
   * Get model information
   */
  getModelInfo = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const result = await this.service.getModelInfo(userId);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Get model info error:', error);
      return res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /api/ml-forecasting/health
   * Check ML service health
   */
  checkHealth = async (req: Request, res: Response) => {
    try {
      const isHealthy = await this.service.checkMLServiceHealth();

      return res.status(200).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        ml_service: isHealthy ? 'connected' : 'disconnected',
      });
    } catch (error: any) {
      console.error('Health check error:', error);
      return res.status(500).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  };
}
