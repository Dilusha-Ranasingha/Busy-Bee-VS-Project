import { apiClient } from '../../services/api.client';

export type ForecastPoint = {
  date: string;
  productiveMinutes: number;
  lower?: number;
  upper?: number;
};

export type ForecastResponse = {
  userId: string;
  horizonDays: number;
  generatedAt: string;
  points: ForecastPoint[];
  note?: string;
};

function hasData<T>(val: unknown): val is { data: T } {
  return typeof val === 'object' && val !== null && 'data' in val;
}

/**
 * Backend route:
 * GET /api/forecasting/:userId?days=7
 */
export async function getForecast(userId: string, days: number = 7): Promise<ForecastResponse> {
  const safeDays = Math.max(1, Math.min(7, days));

  const res = await apiClient.get<ForecastResponse>(`/api/forecasting/${userId}?days=${safeDays}`);

  if (hasData<ForecastResponse>(res)) return res.data;
  return res as unknown as ForecastResponse;
}
