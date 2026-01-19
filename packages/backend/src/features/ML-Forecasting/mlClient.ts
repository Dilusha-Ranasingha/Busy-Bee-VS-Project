import axios, { AxiosInstance } from 'axios';
import {
  MLTrainingRequest,
  MLTrainingResponse,
  MLForecastResponse,
  PlanGeneratorRequest,
  PlanGeneratorResponse,
  ModelInfoResponse
} from './mlForecasting.types';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

class MLClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 60000, // 60 seconds for ML operations
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Train ML model for a user
   */
  async trainModel(data: MLTrainingRequest): Promise<MLTrainingResponse> {
    try {
      const response = await this.client.post<MLTrainingResponse>('/api/ml/train', data);
      return response.data;
    } catch (error: any) {
      console.error('ML Training Error:', error.response?.data || error.message);
      return {
        status: 'error',
        message: error.response?.data?.error || 'Failed to train model',
      };
    }
  }

  /**
   * Get productivity forecast for a user
   */
  async getForecast(userId: string, days: number = 7): Promise<MLForecastResponse> {
    try {
      const response = await this.client.get<MLForecastResponse>(
        `/api/ml/forecast/${userId}`,
        { params: { days } }
      );
      return response.data;
    } catch (error: any) {
      console.error('ML Forecast Error:', error.response?.data || error.message);
      return {
        status: 'error',
        message: error.response?.data?.error || 'Failed to get forecast',
      };
    }
  }

  /**
   * Get forecast with confidence intervals
   */
  async getForecastWithConfidence(userId: string, days: number = 7): Promise<MLForecastResponse> {
    try {
      const response = await this.client.get<MLForecastResponse>(
        `/api/ml/forecast/${userId}/confidence`,
        { params: { days } }
      );
      return response.data;
    } catch (error: any) {
      console.error('ML Confidence Forecast Error:', error.response?.data || error.message);
      return {
        status: 'error',
        message: error.response?.data?.error || 'Failed to get confidence intervals',
      };
    }
  }

  /**
   * Generate productivity plan
   */
  async generatePlan(data: PlanGeneratorRequest): Promise<PlanGeneratorResponse> {
    try {
      const response = await this.client.post<PlanGeneratorResponse>(
        '/api/ml/generate-plan',
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('ML Plan Generation Error:', error.response?.data || error.message);
      return {
        status: 'error',
        message: error.response?.data?.error || 'Failed to generate plan',
      };
    }
  }

  /**
   * Get model information
   */
  async getModelInfo(userId: string): Promise<ModelInfoResponse> {
    try {
      const response = await this.client.get<ModelInfoResponse>(
        `/api/ml/model-info/${userId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('ML Model Info Error:', error.response?.data || error.message);
      return {
        status: 'error',
        message: error.response?.data?.error || 'Failed to get model info',
      };
    }
  }

  /**
   * Health check for ML service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

export const mlClient = new MLClient();
