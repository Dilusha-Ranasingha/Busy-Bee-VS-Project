import { apiClient } from '../api.client';
import type {
  ForecastResponse,
  ProductivityPlan,
  TrainingResponse,
  ModelInfo,
  SavedPlan,
} from '../../types/ML-Forecasting/mlForecasting.types';

const ML_API_BASE = '/api/ml-forecasting';

export const mlForecastingService = {
  /**
   * Train ML model for a user
   */
  trainModel: async (userId: string, daysHistory: number = 90): Promise<TrainingResponse> => {
    const response = await apiClient.post<TrainingResponse>(`${ML_API_BASE}/train`, {
      user_id: userId,
      days_history: daysHistory,
    });
    return response;
  },

  /**
   * Get 7-day productivity forecast
   */
  getForecast: async (userId: string, days: number = 7): Promise<ForecastResponse> => {
    const response = await apiClient.get<ForecastResponse>(
      `${ML_API_BASE}/forecast/${userId}?days=${days}`
    );
    return response;
  },

  /**
   * Get forecast with confidence intervals
   */
  getForecastWithConfidence: async (userId: string, days: number = 7): Promise<ForecastResponse> => {
    const response = await apiClient.get<ForecastResponse>(
      `${ML_API_BASE}/forecast/${userId}/confidence?days=${days}`
    );
    return response;
  },

  /**
   * Generate productivity plan
   */
  generatePlan: async (
    userId: string,
    startDate: string,
    endDate: string,
    targetHours: number
  ): Promise<ProductivityPlan> => {
    const response = await apiClient.post<ProductivityPlan>(`${ML_API_BASE}/generate-plan`, {
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      target_hours: targetHours,
    });
    return response;
  },

  /**
   * Get user's saved plans
   */
  getUserPlans: async (userId: string, limit: number = 10): Promise<{ status: string; plans: SavedPlan[] }> => {
    const response = await apiClient.get<{ status: string; plans: SavedPlan[] }>(
      `${ML_API_BASE}/plans/${userId}?limit=${limit}`
    );
    return response;
  },

  /**
   * Get model information
   */
  getModelInfo: async (userId: string): Promise<ModelInfo> => {
    const response = await apiClient.get<ModelInfo>(`${ML_API_BASE}/model-info/${userId}`);
    return response;
  },

  /**
   * Check ML service health
   */
  checkHealth: async (): Promise<{ status: string; ml_service: string }> => {
    const response = await apiClient.get<{ status: string; ml_service: string }>(
      `${ML_API_BASE}/health`
    );
    return response;
  },
};
