import type { ForecastResponse } from './forecasting.types.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

type MlPredictResponse = ForecastResponse;

export async function getProductiveMinutesForecast(
  userId: string,
  horizonDays: number
): Promise<ForecastResponse> {
  const days = Math.max(1, Math.min(7, horizonDays));

  const res = await fetch(`${ML_SERVICE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, horizonDays: days }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ML service /predict failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as MlPredictResponse;
  return data;
}
