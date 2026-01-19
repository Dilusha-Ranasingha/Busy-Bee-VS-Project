import { Pool } from 'pg';
import {
  MLTrainingResponse,
  MLForecastResponse,
  PlanGeneratorResponse,
  ForecastPrediction,
  DailySchedule,
  Warning,
} from './mlForecasting.types';
import { mlClient } from './mlClient';

export class MLForecastingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Train ML model for a user
   */
  async trainModel(userId: string, daysHistory: number = 90): Promise<MLTrainingResponse> {
    // Check if user has sufficient data
    const dataCheck = await this.pool.query(
      `SELECT COUNT(*) as count FROM daily_metrics 
       WHERE user_id = $1 AND is_synthetic = FALSE`,
      [userId]
    );

    const realDataCount = parseInt(dataCheck.rows[0].count);

    if (realDataCount < 30) {
      // Use synthetic data if not enough real data
      const syntheticCheck = await this.pool.query(
        `SELECT COUNT(*) as count FROM daily_metrics WHERE user_id = $1`,
        [userId]
      );
      const totalCount = parseInt(syntheticCheck.rows[0].count);

      if (totalCount < 30) {
        return {
          status: 'error',
          message: `Insufficient data. Need at least 30 days, found ${totalCount} days.`,
        };
      }
    }

    // Call Python ML service to train
    const result = await mlClient.trainModel({
      user_id: userId,
      days_history: daysHistory,
    });

    return result;
  }

  /**
   * Get forecast for a user (cached or fresh)
   */
  async getForecast(userId: string, days: number = 7): Promise<MLForecastResponse> {
    // Check for cached forecast from today
    const today = new Date().toISOString().split('T')[0];
    const cached = await this.pool.query(
      `SELECT DISTINCT target_date, kpi_category, predicted_value, confidence_lower, confidence_upper
       FROM forecast_results
       WHERE user_id = $1 
         AND forecast_date = $2
         AND target_date >= $2
       ORDER BY target_date ASC
       LIMIT $3`,
      [userId, today, days * 9] // 9 KPI categories per day
    );

    // If we have fresh cached forecast, return it
    if (cached.rows.length >= days * 5) { // At least 5 KPIs per day
      return this.formatCachedForecast(userId, cached.rows, days);
    }

    // Otherwise, get fresh forecast from ML service
    const forecast = await mlClient.getForecast(userId, days);

    // Cache the results if successful
    if (forecast.status === 'success' && forecast.predictions) {
      await this.cacheForecast(userId, forecast.predictions);
    }

    return forecast;
  }

  /**
   * Get forecast with confidence intervals
   */
  async getForecastWithConfidence(userId: string, days: number = 7): Promise<MLForecastResponse> {
    const forecast = await mlClient.getForecastWithConfidence(userId, days);

    // Cache results
    if (forecast.status === 'success' && forecast.predictions) {
      await this.cacheForecast(userId, forecast.predictions);
    }

    return forecast;
  }

  /**
   * Generate productivity plan
   */
  async generatePlan(
    userId: string,
    startDate: string,
    endDate: string,
    targetHours: number
  ): Promise<PlanGeneratorResponse> {
    const plan = await mlClient.generatePlan({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      target_hours: targetHours,
    });

    // Save plan to database if successful
    if (plan.status === 'success') {
      await this.savePlan(userId, plan);
    }

    return plan;
  }

  /**
   * Get user's saved plans
   */
  async getUserPlans(userId: string, limit: number = 10) {
    const result = await this.pool.query(
      `SELECT * FROM productivity_plans
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Get model information
   */
  async getModelInfo(userId: string) {
    return await mlClient.getModelInfo(userId);
  }

  /**
   * Check ML service health
   */
  async checkMLServiceHealth(): Promise<boolean> {
    return await mlClient.healthCheck();
  }

  // ===== Private Helper Methods =====

  private async cacheForecast(userId: string, predictions: ForecastPrediction[]) {
    const today = new Date().toISOString().split('T')[0];

    for (const pred of predictions) {
      // Extract each KPI and store separately
      const kpiCategories = [
        'focus_streak',
        'file_switch',
        'edits',
        'diagnostics',
        'errors',
        'commits',
        'idle',
      ];

      for (const category of kpiCategories) {
        const relevantFields = Object.keys(pred).filter((key) =>
          key.toLowerCase().includes(category)
        );

        if (relevantFields.length > 0) {
          const predictedValue: any = {};
          const confidenceLower: any = {};
          const confidenceUpper: any = {};

          relevantFields.forEach((field) => {
            predictedValue[field] = pred[field];
            if (pred.confidence_lower) {
              confidenceLower[field] = (pred as any).confidence_lower[field];
            }
            if (pred.confidence_upper) {
              confidenceUpper[field] = (pred as any).confidence_upper[field];
            }
          });

          await this.pool.query(
            `INSERT INTO forecast_results 
             (user_id, forecast_date, target_date, kpi_category, predicted_value, confidence_lower, confidence_upper)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id, forecast_date, target_date, kpi_category) 
             DO UPDATE SET 
               predicted_value = EXCLUDED.predicted_value,
               confidence_lower = EXCLUDED.confidence_lower,
               confidence_upper = EXCLUDED.confidence_upper`,
            [
              userId,
              today,
              pred.date,
              category,
              JSON.stringify(predictedValue),
              JSON.stringify(confidenceLower),
              JSON.stringify(confidenceUpper),
            ]
          );
        }
      }
    }
  }

  private formatCachedForecast(userId: string, rows: any[], days: number): MLForecastResponse {
    const predictionMap = new Map<string, any>();

    rows.forEach((row) => {
      const date = row.target_date.toISOString().split('T')[0];
      if (!predictionMap.has(date)) {
        predictionMap.set(date, { date });
      }

      const prediction = predictionMap.get(date);
      const values = row.predicted_value;

      Object.keys(values).forEach((key) => {
        prediction[key] = values[key];
      });
    });

    const predictions = Array.from(predictionMap.values()).slice(0, days);

    return {
      status: 'success',
      user_id: userId,
      forecast_start_date: predictions[0]?.date,
      forecast_end_date: predictions[predictions.length - 1]?.date,
      predictions,
      generated_at: new Date().toISOString(),
    };
  }

  private async savePlan(userId: string, plan: PlanGeneratorResponse) {
    await this.pool.query(
      `INSERT INTO productivity_plans 
       (user_id, plan_start_date, plan_end_date, target_hours, is_feasible, 
        feasibility_score, recommended_schedule, best_hours, warnings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        plan.plan_start_date,
        plan.plan_end_date,
        plan.target_hours,
        plan.is_feasible,
        plan.feasibility_score,
        JSON.stringify(plan.daily_schedule),
        JSON.stringify(plan.best_hours),
        JSON.stringify(plan.warnings),
      ]
    );
  }
}
