import { useState, useEffect } from 'react';
import { mlForecastingService } from '../services/ML-Forecasting/mlForecasting.service';
import type {
  ForecastResponse,
  ProductivityPlan,
  TrainingResponse,
  ModelInfo,
  SavedPlan,
} from '../types/ML-Forecasting/mlForecasting.types';

/**
 * Hook to get productivity forecast
 */
export const useForecast = (userId: string | null, days: number = 7) => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await mlForecastingService.getForecast(userId, days);
      if (data.status === 'error') {
        setError(data.message || 'Failed to fetch forecast');
      } else {
        setForecast(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [userId, days]);

  return { forecast, isLoading, error, refetch: fetchForecast };
};

/**
 * Hook to generate productivity plan
 */
export const useGeneratePlan = () => {
  const [plan, setPlan] = useState<ProductivityPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async (
    userId: string,
    startDate: string,
    endDate: string,
    targetHours: number
  ) => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await mlForecastingService.generatePlan(userId, startDate, endDate, targetHours);
      if (data.status === 'error') {
        setError(data.message || 'Failed to generate plan');
      } else {
        setPlan(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const reset = () => {
    setPlan(null);
    setError(null);
  };

  return { plan, isGenerating, error, generatePlan, reset };
};

/**
 * Hook to train ML model
 */
export const useTrainModel = () => {
  const [trainingResult, setTrainingResult] = useState<TrainingResponse | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trainModel = async (userId: string, daysHistory: number = 90) => {
    setIsTraining(true);
    setError(null);
    try {
      const data = await mlForecastingService.trainModel(userId, daysHistory);
      if (data.status === 'error') {
        setError(data.message || 'Failed to train model');
      } else {
        setTrainingResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsTraining(false);
    }
  };

  return { trainingResult, isTraining, error, trainModel };
};

/**
 * Hook to get model info
 */
export const useModelInfo = (userId: string | null) => {
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModelInfo = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await mlForecastingService.getModelInfo(userId);
      setModelInfo(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();
  }, [userId]);

  return { modelInfo, isLoading, error, refetch: fetchModelInfo };
};

/**
 * Hook to get user's saved plans
 */
export const useSavedPlans = (userId: string | null, limit: number = 10) => {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await mlForecastingService.getUserPlans(userId, limit);
      setPlans(data.plans);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [userId, limit]);

  return { plans, isLoading, error, refetch: fetchPlans };
};
