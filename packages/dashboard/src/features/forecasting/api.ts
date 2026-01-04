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

export type InsightsResponse = {
  userId: string;
  horizonDays: number;
  trend: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  bestWindow: 'day' | 'night' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  recentAvgFocus14: number;
  predictedAvg: number;
  latestIdleMinutes: number;
  latestErrorFixMinutes: number;
  modelVersion?: string;
  generatedAt?: string;
  summary: string;
};

export type ExplainResponse = {
  userId: string;
  explainedForDate: string;
  predictedProductiveMinutes: number;
  globalTopFeatures: Array<{ feature: string; importance: number }>;
  localApproxTop: Array<{ feature: string; value: number; importanceNorm: number; approxImpact: number }>;
  note?: string;
};

export type PlanRequest = {
  period: 'day' | 'week';
  targetHours: number;
};

export type PlanResponse = {
  userId: string;
  period: 'day' | 'week';
  horizonDays: number;
  targetHours: number;
  feasible: boolean;
  suggestedTargetHours: number;
  bestWindow: 'day' | 'night' | 'mixed';
  confidence: 'high' | 'medium' | 'low';
  bufferAppliedPercent: number;
  capacityHours: number;
  plan: Array<{ date: string; hours: number; window: 'day' | 'night' | 'mixed' }>;
  unallocatedMinutes: number;
  reason: string;
  recommendedSlots?: Array<{ label: string; start: string; end: string }>;
  chatMessage?: string;
  note?: string;
};

function hasData<T>(val: unknown): val is { data: T } {
  return typeof val === 'object' && val !== null && 'data' in val;
}

export async function getForecast(userId: string, days: number = 7): Promise<ForecastResponse> {
  const safeDays = Math.max(1, Math.min(7, days));
  const res = await apiClient.get<ForecastResponse>(`/api/forecasting/${userId}?days=${safeDays}`);
  if (hasData<ForecastResponse>(res)) return res.data;
  return res as unknown as ForecastResponse;
}

export async function getInsights(userId: string, days: number = 7): Promise<InsightsResponse> {
  const safeDays = Math.max(1, Math.min(7, days));
  const res = await apiClient.get<InsightsResponse>(`/api/forecasting/${userId}/insights?days=${safeDays}`);
  if (hasData<InsightsResponse>(res)) return res.data;
  return res as unknown as InsightsResponse;
}

export async function getExplain(userId: string, top: number = 8): Promise<ExplainResponse> {
  const safeTop = Math.max(3, Math.min(15, top));
  const res = await apiClient.get<ExplainResponse>(`/api/forecasting/${userId}/explain?top=${safeTop}`);
  if (hasData<ExplainResponse>(res)) return res.data;
  return res as unknown as ExplainResponse;
}

export async function createPlan(userId: string, payload: PlanRequest): Promise<PlanResponse> {
  const res = await apiClient.post<PlanResponse>(`/api/forecasting/${userId}/plan`, payload);
  if (hasData<PlanResponse>(res)) return res.data;
  return res as unknown as PlanResponse;
}
