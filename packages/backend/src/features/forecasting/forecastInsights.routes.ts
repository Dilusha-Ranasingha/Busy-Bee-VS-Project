import { Router } from "express";
import { query } from "../../config/db.js";

const router = Router();

function clampRisk(
  base: "low" | "medium" | "high",
  bumpToAtLeast: "low" | "medium" | "high"
) {
  const order = { low: 1, medium: 2, high: 3 } as const;
  return order[bumpToAtLeast] > order[base] ? bumpToAtLeast : base;
}

router.get("/:userId/insights", async (req, res) => {
  try {
    const userId = req.params.userId;
    const days = Math.min(Math.max(Number(req.query.days || 7), 1), 7);

    /**
     * ✅ IMPORTANT FIX:
     * Instead of trying to find ONE run timestamp (which differs per row),
     * we pick the latest record per target_date using DISTINCT ON.
     * This returns exactly `days` rows reliably.
     */
    const forecastRows = await query(
      `
      WITH latest_per_day AS (
        SELECT DISTINCT ON (target_date)
          target_date,
          predicted_focus_minutes,
          lower_bound,
          upper_bound,
          model_version,
          created_at
        FROM forecast_daily_productivity
        WHERE user_id = $1 AND horizon_days = $2
        ORDER BY target_date, created_at DESC
      )
      SELECT *
      FROM latest_per_day
      ORDER BY target_date ASC
      `,
      [userId, days]
    );

    if (forecastRows.rowCount === 0) {
      return res.status(404).json({
        message:
          "No saved forecast found. Call /api/forecasting/:userId?days=7 first to generate + save.",
        userId,
        horizonDays: days,
      });
    }

    const preds = forecastRows.rows.map((r: any) => Number(r.predicted_focus_minutes));
    const widths = forecastRows.rows.map((r: any) => {
      const lo = r.lower_bound == null ? null : Number(r.lower_bound);
      const up = r.upper_bound == null ? null : Number(r.upper_bound);
      if (lo == null || up == null) return null;
      return Math.max(0, up - lo);
    });

    // Generated-at = max created_at among returned rows
    const generatedAt = new Date(
      Math.max(...forecastRows.rows.map((r: any) => new Date(r.created_at).getTime()))
    ).toISOString();

    // 1) Trend (first vs last predicted)
    const first = preds[0];
    const last = preds[preds.length - 1];
    const delta = last - first;

    let trend: "improving" | "declining" | "stable" = "stable";
    if (delta >= 12) trend = "improving";
    else if (delta <= -12) trend = "declining";

    // 2) Recent actual baseline (last 14 days focus)
    const recentActual = await query(
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

    // 3) Best window (day vs night) from last 14 days
    const timeWindow = await query(
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
      Math.abs(daySum - nightSum) < 60 ? "mixed" : daySum > nightSum ? "day" : "night";

    // 4) Risk level (simple explainable rules)
    let riskLevel: "low" | "medium" | "high" = "low";

    if (avgFocus14 > 0) {
      const ratio = avgPred / avgFocus14;
      if (ratio < 0.8) riskLevel = "high";
      else if (ratio < 0.95) riskLevel = "medium";
      else riskLevel = "low";
    } else {
      if (avgPred < 75) riskLevel = "high";
      else if (avgPred < 110) riskLevel = "medium";
      else riskLevel = "low";
    }

    // 5) Bump risk if latest idle/errors are high (latest actual day)
    const latestKpis = await query(
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

    // 6) Confidence from interval width
    const validWidths = widths.filter((w) => w != null) as number[];
    let confidence: "high" | "medium" | "low" = "medium";

    if (validWidths.length > 0) {
      const avgWidth = validWidths.reduce((a, b) => a + b, 0) / validWidths.length;
      const rel = avgWidth / Math.max(1, avgPred);

      if (rel < 0.25) confidence = "high";
      else if (rel < 0.45) confidence = "medium";
      else confidence = "low";
    }

    const directionText =
      trend === "improving" ? "slightly higher" : trend === "declining" ? "slightly lower" : "about the same";

    const windowText =
      bestWindow === "day" ? "day-time" : bestWindow === "night" ? "night-time" : "both day and night";

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
      modelVersion: forecastRows.rows?.[0]?.model_version,
      generatedAt,
      summary,
    });
  } catch (err) {
    console.error("Forecast insights error:", err);
    return res.status(500).json({ message: "Failed to compute insights" });
  }
});

export default router;
