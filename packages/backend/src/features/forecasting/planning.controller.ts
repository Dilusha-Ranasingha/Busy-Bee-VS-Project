import { Request, Response } from "express";
import { query } from "../../config/db.js";

type Period = "day" | "week";

function roundToHalfHours(hours: number): number {
  return Math.round(hours * 2) / 2;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function computeConfidenceFromIntervals(preds: number[], widths: (number | null)[]): "high" | "medium" | "low" {
  const validWidths = widths.filter((w) => w != null) as number[];
  if (validWidths.length === 0) return "medium";

  const avgPred = preds.reduce((a, b) => a + b, 0) / Math.max(1, preds.length);
  const avgWidth = validWidths.reduce((a, b) => a + b, 0) / validWidths.length;

  const rel = avgWidth / Math.max(1, avgPred);
  if (rel < 0.25) return "high";
  if (rel < 0.45) return "medium";
  return "low";
}

function bufferByConfidence(conf: "high" | "medium" | "low"): number {
  // buffer % of capacity we keep as safety
  if (conf === "high") return 0.05;
  if (conf === "medium") return 0.10;
  return 0.15;
}

async function getBestWindow(userId: string): Promise<"day" | "night" | "mixed"> {
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

  if (Math.abs(daySum - nightSum) < 60) return "mixed";
  return daySum > nightSum ? "day" : "night";
}

async function getLatestForecast(userId: string, horizonDays: number) {
  // ✅ Important: because created_at can differ per row, we pick latest per target_date
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
    [userId, horizonDays]
  );

  return forecastRows.rows.map((r: any) => ({
    date: String(r.target_date),
    predicted: Number(r.predicted_focus_minutes),
    lower: r.lower_bound == null ? null : Number(r.lower_bound),
    upper: r.upper_bound == null ? null : Number(r.upper_bound),
    modelVersion: String(r.model_version || ""),
    createdAt: new Date(r.created_at).toISOString(),
  }));
}

function allocateWeekPlan(
  dates: string[],
  capacityMinutes: number[],
  targetMinutes: number,
  maxHoursPerDay: number,
  bestWindow: "day" | "night" | "mixed"
) {
  const n = dates.length;
  const maxPerDayMin = maxHoursPerDay * 60;

  const totalCap = capacityMinutes.reduce((a, b) => a + b, 0);
  if (totalCap <= 0) {
    return {
      plan: dates.map((d) => ({ date: d, hours: 0, window: bestWindow })),
      unallocatedMinutes: targetMinutes,
    };
  }

  // Initial proportional allocation (then cap)
  let alloc = capacityMinutes.map((cap) => Math.round((cap / totalCap) * targetMinutes));
  alloc = alloc.map((m) => clamp(m, 0, maxPerDayMin));

  let allocated = alloc.reduce((a, b) => a + b, 0);
  let remaining = targetMinutes - allocated;

  // Distribute remaining minutes (greedy) to days that still have room
  // priority: higher capacity days first
  const order = capacityMinutes
    .map((cap, i) => ({ cap, i }))
    .sort((a, b) => b.cap - a.cap)
    .map((x) => x.i);

  while (remaining > 0) {
    let progressed = false;

    for (const i of order) {
      const room = maxPerDayMin - alloc[i];
      if (room <= 0) continue;

      const add = Math.min(room, remaining, 30); // add in 30-min chunks
      alloc[i] += add;
      remaining -= add;
      progressed = true;

      if (remaining <= 0) break;
    }

    if (!progressed) break; // no room anywhere
  }

  const plan = dates.map((d, i) => ({
    date: d,
    hours: roundToHalfHours(alloc[i] / 60),
    window: bestWindow,
  }));

  return { plan, unallocatedMinutes: remaining };
}

export async function createPlan(req: Request, res: Response) {
  try {
    const userId = req.params.userId;

    const period = String(req.body?.period || "").toLowerCase() as Period;
    const targetHoursRaw = Number(req.body?.targetHours);

    if (period !== "day" && period !== "week") {
      return res.status(400).json({ message: "period must be 'day' or 'week'." });
    }
    if (!Number.isFinite(targetHoursRaw) || targetHoursRaw <= 0) {
      return res.status(400).json({ message: "targetHours must be a positive number." });
    }

    const horizonDays = period === "day" ? 1 : 7;

    // Pull latest forecast (must exist)
    const forecast = await getLatestForecast(userId, horizonDays);
    if (forecast.length === 0) {
      return res.status(404).json({
        message: "No saved forecast found. Generate forecast first using GET /api/forecasting/:userId?days=7",
        userId,
        period,
        horizonDays,
      });
    }

    // Use all returned rows (1 or 7)
    const dates = forecast.map((f) => f.date);
    const preds = forecast.map((f) => f.predicted);

    const widths = forecast.map((f) => {
      if (f.lower == null || f.upper == null) return null;
      return Math.max(0, f.upper - f.lower);
    });

    const confidence = computeConfidenceFromIntervals(preds, widths);
    const buffer = bufferByConfidence(confidence); // e.g. 0.15
    const bestWindow = await getBestWindow(userId);

    // Capacity (buffered) based on predicted minutes
    const capacityMinutesRaw = preds;
    const capacityMinutesBuffered = capacityMinutesRaw.map((m) => Math.max(0, Math.floor(m * (1 - buffer))));

    const totalCapacity = capacityMinutesBuffered.reduce((a, b) => a + b, 0);
    const targetMinutes = Math.round(targetHoursRaw * 60);

    // Set max hours/day (research-friendly constraint)
    const maxHoursPerDay = period === "day" ? 6 : 6;

    const maxPossibleMinutes = Math.min(
      totalCapacity,
      horizonDays * maxHoursPerDay * 60
    );

    const feasible = targetMinutes <= maxPossibleMinutes;

    // Suggested target if not feasible
    const suggestedTargetHours = roundToHalfHours(maxPossibleMinutes / 60);

    // Build plan
    let plan: Array<{ date: string; hours: number; window: "day" | "night" | "mixed" }>;
    let unallocatedMinutes = 0;

    if (period === "day") {
      const hours = roundTo_toggle(roundToHalfHours(Math.min(targetMinutes, maxPossibleMinutes) / 60));
      plan = [{ date: dates[0], hours, window: bestWindow }];
    } else {
      const alloc = allocateWeekPlan(
        dates,
        capacityMinutesBuffered,
        Math.min(targetMinutes, maxPossibleMinutes),
        maxHoursPerDay,
        bestWindow
      );
      plan = alloc.plan;
      unallocatedMinutes = alloc.unallocatedMinutes;
    }

    // Reason text (non-technical)
    const capacityHours = roundToHalfHours(totalCapacity / 60);
    const reason =
      feasible
        ? `Your forecast capacity for this ${period} is about ${capacityHours} hours (with a safety buffer because confidence is ${confidence}).`
        : `Your target is higher than your forecast capacity for this ${period}. With a safety buffer (confidence: ${confidence}), a realistic target is about ${suggestedTargetHours} hours.`;

    return res.json({
      userId,
      period,
      horizonDays,
      targetHours: roundToHalfHours(targetHoursRaw),
      feasible,
      suggestedTargetHours: suggestedTargetHours,
      bestWindow,
      confidence,
      bufferAppliedPercent: Math.round(buffer * 100),
      capacityHours,
      plan,
      unallocatedMinutes,
      reason,
      note: "Planning engine uses saved forecast + confidence-based buffer + max hours/day cap.",
    });
  } catch (err) {
    console.error("Planning error:", err);
    return res.status(500).json({ message: "Failed to create plan" });
  }
}

// small helper to avoid TS lint complaining in day plan
function roundTo_toggle(v: number) {
  return v;
}
