import os
import json
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any

import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.db import get_conn

app = FastAPI(title="BusyBee ML Service", version="1.1.0")


# ----------------------------
# API Models
# ----------------------------

class PredictRequest(BaseModel):
    userId: str = Field(..., min_length=1)
    horizonDays: int = Field(7, ge=1, le=7)


class ForecastPoint(BaseModel):
    date: str
    productiveMinutes: int
    lower: Optional[int] = None
    upper: Optional[int] = None


class PredictResponse(BaseModel):
    userId: str
    horizonDays: int
    generatedAt: str
    points: List[ForecastPoint]
    note: Optional[str] = None


# ----------------------------
# Model loading
# ----------------------------

MODEL = None
MODEL_META: Dict[str, Any] = {}

MODEL_PATH = os.path.join("models", "focus_xgb.joblib")
META_PATH = os.path.join("models", "focus_xgb_meta.json")


def load_model_once() -> None:
    global MODEL, MODEL_META

    if not os.path.exists(MODEL_PATH) or not os.path.exists(META_PATH):
        raise RuntimeError(
            "Model files not found.\n"
            "Run training first:\n"
            "  python train\\train_xgb_focus.py\n"
            "Expected:\n"
            "  models\\focus_xgb.joblib\n"
            "  models\\focus_xgb_meta.json"
        )

    MODEL = joblib.load(MODEL_PATH)
    with open(META_PATH, "r", encoding="utf-8") as f:
        MODEL_META = json.load(f)


@app.on_event("startup")
def on_startup():
    load_model_once()


@app.get("/health")
def health():
    return {
        "ok": True,
        "model_loaded": MODEL is not None,
        "model_type": MODEL_META.get("model_type"),
    }


# ----------------------------
# Helpers
# ----------------------------

def weighted_average(values: List[int]) -> float:
    total = 0.0
    weight_sum = 0.0
    for i, v in enumerate(values):
        w = float(i + 1)
        total += float(v) * w
        weight_sum += w
    return total / weight_sum if weight_sum else 0.0


def fetch_recent_joined_history(user_id: str, limit_days: int = 60) -> List[Dict[str, Any]]:
    """
    Fetch most recent days from:
      daily_focus_summary
      daily_idle_summary
      daily_error_summary
    joined by (user_id, date)
    Returns chronological list of dicts.
    """
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT
          f.date AS date,
          f.total_focus_minutes AS focus_minutes,

          COALESCE(i.idle_minutes, 0) AS idle_minutes,
          COALESCE(i.idle_sessions, 0) AS idle_sessions,
          COALESCE(i.avg_idle_session_min, 0) AS avg_idle_session_min,

          COALESCE(e.error_count, 0) AS error_count,
          COALESCE(e.total_fix_time_min, 0) AS error_fix_time_min

        FROM daily_focus_summary f
        LEFT JOIN daily_idle_summary i
          ON i.user_id = f.user_id AND i.date = f.date
        LEFT JOIN daily_error_summary e
          ON e.user_id = f.user_id AND e.date = f.date
        WHERE f.user_id = %s
        ORDER BY f.date DESC
        LIMIT %s
        """,
        (user_id, limit_days),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    rows = list(reversed(rows))  # chronological

    hist: List[Dict[str, Any]] = []
    for r in rows:
        hist.append(
            {
                "date": r["date"],  # python date
                "focus_minutes": int(r["focus_minutes"]),
                "idle_minutes": float(r["idle_minutes"]),
                "idle_sessions": int(r["idle_sessions"]),
                "avg_idle_session_min": float(r["avg_idle_session_min"]),
                "error_count": int(r["error_count"]),
                "error_fix_time_min": float(r["error_fix_time_min"]),
            }
        )
    return hist


def rollmean(hist: List[Dict[str, Any]], idx: int, key: str, window: int = 7) -> float:
    start = idx - window
    end = idx
    if start < 0:
        return float("nan")
    vals = [float(hist[i][key]) for i in range(start, end)]
    return float(np.mean(vals))


def lag(hist: List[Dict[str, Any]], idx: int, key: str, lag_n: int) -> float:
    j = idx - lag_n
    if j < 0:
        return float("nan")
    return float(hist[j][key])


def build_feature_row(hist: List[Dict[str, Any]], idx: int, next_day: date) -> Dict[str, float]:
    """
    Build feature row (day t -> predict day t+1).
    Uses real idle/errors from joined history.
    Day/night focus still placeholder split until member 01 provides real splits.
    """
    focus_today = float(hist[idx]["focus_minutes"])

    # Placeholder day/night split (upgrade later when you add real time-window focus)
    day_focus = 0.7 * focus_today
    night_focus = 0.3 * focus_today

    dow = next_day.weekday()
    is_weekend = 1 if dow in (5, 6) else 0

    idle_minutes = float(hist[idx]["idle_minutes"])
    idle_sessions = float(hist[idx]["idle_sessions"])
    avg_idle_session_min = float(hist[idx]["avg_idle_session_min"])

    error_count = float(hist[idx]["error_count"])
    error_fix_time_min = float(hist[idx]["error_fix_time_min"])

    night_ratio = night_focus / (focus_today + 1.0)
    error_pressure = error_fix_time_min / (focus_today + 1.0)

    row: Dict[str, float] = {
        "dow": float(dow),
        "is_weekend": float(is_weekend),

        "day_focus_minutes": float(day_focus),
        "night_focus_minutes": float(night_focus),

        "error_count": float(error_count),
        "error_fix_time_min": float(error_fix_time_min),

        "idle_minutes": float(idle_minutes),
        "idle_sessions": float(idle_sessions),
        "avg_idle_session_min": float(avg_idle_session_min),

        "night_ratio": float(night_ratio),
        "error_pressure": float(error_pressure),

        "focus_rollmean_7": rollmean(hist, idx, "focus_minutes", 7),
        "idle_rollmean_7": rollmean(hist, idx, "idle_minutes", 7),
        "errorfix_rollmean_7": rollmean(hist, idx, "error_fix_time_min", 7),
    }

    for l in range(1, 8):
        row[f"focus_lag_{l}"] = lag(hist, idx, "focus_minutes", l)
        row[f"idle_lag_{l}"] = lag(hist, idx, "idle_minutes", l)
        row[f"errorfix_lag_{l}"] = lag(hist, idx, "error_fix_time_min", l)

    return row


# ----------------------------
# Predict endpoint (XGBoost, fully-featured)
# ----------------------------

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if MODEL is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    hist = fetch_recent_joined_history(req.userId, limit_days=90)

    # Need enough history for lag(1..7) and rolling(7)
    if len(hist) < 20:
        raise HTTPException(
            status_code=400,
            detail="Not enough history. Need ~20+ days for full XGBoost features.",
        )

    feature_cols = MODEL_META.get("features", [])
    p90 = float(MODEL_META.get("p90_abs_residual", 25.0))

    points: List[ForecastPoint] = []

    for _ in range(req.horizonDays):
        idx = len(hist) - 1
        current_date = hist[idx]["date"]
        next_date = current_date + timedelta(days=1)

        feat = build_feature_row(hist, idx, next_date)
        X = np.array([[feat.get(c, float("nan")) for c in feature_cols]], dtype=float)

        # If still NaN (very early history), fallback to baseline
        if np.isnan(X).any():
            recent = [h["focus_minutes"] for h in hist[-7:]]
            yhat = weighted_average(recent) if recent else 120.0
            used = "baseline_fallback"
        else:
            yhat = float(MODEL.predict(X)[0])
            used = "xgboost"

        yhat_int = int(max(0, round(yhat)))
        lower = int(max(0, round(yhat_int - p90)))
        upper = int(max(0, round(yhat_int + p90)))

        points.append(
            ForecastPoint(
                date=next_date.isoformat(),
                productiveMinutes=yhat_int,
                lower=lower,
                upper=upper,
            )
        )

        # Roll forward: append predicted focus.
        # For other KPIs we keep them flat (last known) for now.
        # Later you can forecast idle/errors too or use separate models.
        hist.append(
            {
                "date": next_date,
                "focus_minutes": yhat_int,
                "idle_minutes": hist[idx]["idle_minutes"],
                "idle_sessions": hist[idx]["idle_sessions"],
                "avg_idle_session_min": hist[idx]["avg_idle_session_min"],
                "error_count": hist[idx]["error_count"],
                "error_fix_time_min": hist[idx]["error_fix_time_min"],
            }
        )

    return PredictResponse(
        userId=req.userId,
        horizonDays=req.horizonDays,
        generatedAt=datetime.utcnow().isoformat() + "Z",
        points=points,
        note="Advanced XGBoost forecast using focus + idle + error daily summaries (synthetic-trained).",
    )
