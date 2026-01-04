import express from "express";
import { Pool } from "pg";

const router = express.Router();

/**
 * Robust PG connection:
 * - uses DATABASE_URL if available
 * - otherwise builds from POSTGRES_* env vars (same ones used in docker-compose/.env)
 */
const pool =
  process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5432),
        database: process.env.POSTGRES_DB || "postgres",
        user: process.env.POSTGRES_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || "postgres",
      });

function clampRisk(base: "low" | "medium" | "high", bumpToAtLeast: "low" | "medium" | "high") {
  const order = { low: 1, medium: 2, high: 3 } as const;
  return order[bumpToAtLeast] > order[base] ? bumpToAtLeast : base;
}

router.get("/:userId/insights", async (req, res) => {
  try {
    const userId = req.params.userId;
    const days = Math.min(Math.max(Number(req.query.days || 7), 1), 7);

    // 1) Get the latest saved forecast run for this user + horizon
    const latestRun = await pool.query(
      `
      SELECT MAX(created_at) AS latest_created_at
      FROM forecast_daily_productivity
      WHERE user_id = $1 AND horizon_days = $2
      `,
      [userId, days]
    );

    const latestCreatedAt = latestRun.rows?.[0]?.latest_created_at;
    if (!latestCreatedAt) {
      return res.status(404).json({
        message: "No saved forecast found. Call /api/forecasting/:userId?days=7 first to generate + save.",
        userId,
        horizonDays: days,
      });
    }

    const forecastRows = await pool.query(
      `
      SELECT target_date, predicted_focus_minutes, lower_bound, upper_bound, model_version, created_at
      FROM forecast_daily_productivity
      WHERE user_id = $1 AND horizon_days = $2 AND created_at = $3
      ORDER BY target_date ASC
      `,
      [userId, days, latestCreatedAt]
    );

    if (forecastRows.rowCount === 0) {
      return res.status(404).json({
        message: "Forecast run timestamp found but no rows returned.",
        userId,
        horizonDays: days,
      });
    }

    const preds = forecastRows.rows.map((r) => Number(r.predicted_focus_minutes));
    const widths = forecastRows.rows.map((r) => {
      const lo = r.lower_bound == null ? null : Number(r.lower_bound);
      const up = r.upper_bound == null ? null : Number(r.upper_bound);
      if (lo == null || up == null) return null;
      return Math.max(0, up - lo);
    });

    // 2) Trend (based on first vs last predicted value)
    const first = preds[0];
    const last = preds[preds.length - 1];
    const delta = last - first;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (delta >= 12) trend = "improving";
    else if (delta <= -12) trend = "declining";

    // 3) Recent actual baseline (last 14 days focus)
    const recentActual = await pool.query(
      `
      SELECT AVG(total_focus_minutes)::float AS avg_focus_14
      FROM (
        SELECT total_focus_minutes
        FROM daily_focus_summary
        WHERE user_id = $1
        ORDER BY date DESC
        LIMIT 14
      ) x
      `,
      [userId]
    );
    const avgFocus14 = Number(recentActual.rows?.[0]?.avg_focus_14 || 0);

    const avgPred = preds.reduce((a, b) => a + b, 0) / Math.max(1, preds.length);

    // 4) Best window (day vs night) from last 14 days
    const timeWindow = await pool.query(
      `
      SELECT
        COALESCE(SUM(day_focus_minutes),0)::float AS day_sum,
        COALESCE(SUM(night_focus_minutes),0)::float AS night_sum
      FROM (
        SELECT day_focus_minutes, night_focus_minutes
        FROM daily_time_focus_summary
        WHERE user_id = $1
        ORDER BY date DESC
        LIMIT 14
      ) t
      `,
      [userId]
    );

    const daySum = Number(timeWindow.rows?.[0]?.day_sum || 0);
    const nightSum = Number(timeWindow.rows?.[0]?.night_sum || 0);

    const bestWindow: "day" | "night" | "mixed" =
      Math.abs(daySum - nightSum) < 60 ? "mixed" : (daySum > nightSum ? "day" : "night");

    // 5) Risk level (simple, explainable logic)
    // Compare predicted average vs recent average.
    // - If predicted is much lower than recent, risk is higher.
    let riskLevel: "low" | "medium" | "high" = "low";

    if (avgFocus14 > 0) {
      const ratio = avgPred / avgFocus14; // < 1 means predicted lower than normal
      if (ratio < 0.80) riskLevel = "high";
      else if (ratio < 0.95) riskLevel = "medium";
      else riskLevel = "low";
    } else {
      // if no baseline, use absolute minutes
      if (avgPred < 75) riskLevel = "high";
      else if (avgPred < 110) riskLevel = "medium";
      else riskLevel = "low";
    }

    // bump risk if latest idle/errors are high (last day in the daily tables)
    const latestKpis = await pool.query(
      `
      SELECT
        COALESCE(i.idle_minutes,0)::float AS idle_minutes,
        COALESCE(e.total_fix_time_min,0)::float AS error_fix_time
      FROM daily_focus_summary f
      LEFT JOIN daily_idle_summary i
        ON i.user_id=f.user_id AND i.date=f.date
      LEFT JOIN daily_error_summary e
        ON e.user_id=f.user_id AND e.date=f.date
      WHERE f.user_id=$1
      ORDER BY f.date DESC
      LIMIT 1
      `,
      [userId]
    );

    const idleMinutes = Number(latestKpis.rows?.[0]?.idle_minutes || 0);
    const errorFixTime = Number(latestKpis.rows?.[0]?.error_fix_time || 0);

    if (idleMinutes >= 120) riskLevel = clampRisk(riskLevel, "high");
    else if (idleMinutes >= 80) riskLevel = clampRisk(riskLevel, "medium");

    if (errorFixTime >= 90) riskLevel = clampRisk(riskLevel, "high");
    else if (errorFixTime >= 45) riskLevel = clampRisk(riskLevel, "medium");

    // 6) Confidence (based on average interval width vs predicted minutes)
    // Smaller range => higher confidence
    const validWidths = widths.filter((w) => w != null) as number[];
    let confidence: "high" | "medium" | "low" = "medium";

    if (validWidths.length > 0) {
      const avgWidth = validWidths.reduce((a, b) => a + b, 0) / validWidths.length;
      const rel = avgWidth / Math.max(1, avgPred);

      if (rel < 0.25) confidence = "high";
      else if (rel < 0.45) confidence = "medium";
      else confidence = "low";
    }

    // 7) Friendly summary line
    const directionText =
      trend === "improving" ? "slightly higher" :
      trend === "declining" ? "slightly lower" : "about the same";

    const windowText =
      bestWindow === "day" ? "day-time" :
      bestWindow === "night" ? "night-time" : "both day and night";

    const summary =
      `Next ${days} days look ${directionText} than your recent pattern. ` +
      `Best focus window is ${windowText}. Confidence is ${confidence}.`;

    return res.json({
      userId,
      horizonDays: days,
      trend,
      riskLevel,
      bestWindow,
      confidence,
      recentAvgFocus14: Math.round(avgFocus14),
      predictedAvg: Math.round(avgPred),
      latestIdleMinutes: Math.round(idleMinutes),
      latestErrorFixMinutes: Math.round(errorFixTime),
      modelVersion: forecastRows.rows[0].model_version,
      generatedAt: new Date(forecastRows.rows[0].created_at).toISOString(),
      summary,
    });
  } catch (err: any) {
    console.error("Forecast insights error:", err);
    return res.status(500).json({ message: "Failed to compute insights" });
  }
});

export default router;
