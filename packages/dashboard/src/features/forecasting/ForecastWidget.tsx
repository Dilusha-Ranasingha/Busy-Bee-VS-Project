// src/features/forecasting/ForecastWidget.tsx

import { useEffect, useState } from "react";
import {
  fetchProductiveMinutesForecast,
  type ForecastResponse,
} from "./api";

export default function ForecastWidget() {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // TEMP: fixed userId just to verify everything works
  const userId = "testUser";

  useEffect(() => {
    fetchProductiveMinutesForecast(userId, 7)
      .then((data) => {
        setForecast(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Something went wrong");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border p-4">
        <p className="font-semibold">Productivity Forecast</p>
        <p className="mt-2 text-sm opacity-70">Loading forecast…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-4">
        <p className="font-semibold">Productivity Forecast</p>
        <p className="mt-2 text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!forecast) return null;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Productive Minutes Forecast</p>
        <span className="text-xs opacity-70">
          Next {forecast.horizonDays} days
        </span>
      </div>

      <p className="mt-1 text-xs opacity-70">
        User: <span className="font-medium">{forecast.userId}</span>
      </p>

      <div className="mt-4 space-y-2">
        {forecast.points.map((p) => (
          <div
            key={p.date}
            className="flex items-center justify-between rounded-lg bg-black/5 px-3 py-2"
          >
            <span className="text-sm">{p.date}</span>
            <span className="text-sm font-semibold">
              {p.productiveMinutes} min
              {p.lower !== undefined && p.upper !== undefined && (
                <span className="ml-2 text-xs opacity-60">
                  ({p.lower}–{p.upper})
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {forecast.note && (
        <p className="mt-3 text-xs opacity-60">{forecast.note}</p>
      )}
    </div>
  );
}
