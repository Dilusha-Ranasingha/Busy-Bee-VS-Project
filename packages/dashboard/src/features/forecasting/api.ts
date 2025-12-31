// src/features/forecasting/api.ts

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

// Backend base URL
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

/**
 * Fetch productive-minutes forecast for a user
 */
export async function fetchProductiveMinutesForecast(
  userId: string,
  days: number = 7
): Promise<ForecastResponse> {
  const res = await fetch(
    `${API_BASE}/api/forecasting/${encodeURIComponent(userId)}?days=${days}`
  );

  if (!res.ok) {
    throw new Error("Failed to fetch forecast");
  }

  return res.json();
}
