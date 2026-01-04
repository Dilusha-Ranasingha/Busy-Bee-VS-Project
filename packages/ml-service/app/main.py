import os
import json
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any

import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.db import get_conn

app = FastAPI(title="BusyBee ML Service", version="1.0.0")


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
        w = float(i + 1)  # newer gets higher weight when values are chronological
        total += float(v) * w
        weight_sum += w
    return total / weight_sum if weight_sum else 0.0


def fetch_recent_focus_history(user_id: str, limit_days: int = 30) -> List[Dict[str, Any]]:
    """
    Fetch most recent days from daily_focus_summary.
    Returns chronological list of dicts with keys: date (date), focus_minutes (int)
    """
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT date, total_focus_minutes
        FROM daily_focus_summary
        WHERE user_id = %s
        ORDER BY date DESC
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
                "date": r["date"],  # should be a Python date object
                "focus_minutes": int(r["total_focus_minutes"]),
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


def build_feature_row(hist: List[Dict[str, Any]], idx: int, dow: int, is_weekend: int) -> Dict[str, float]:
    """
    Build one feature row for predicting "next-day focus" using day idx as the 'current day'.
    NOTE: We don't have KPI2/KPI3 real values yet, so we fill them with 0 placeholders.
    When your team merges, you will replace these placeholders with real table joins.
    """
    focus_today = float(hist[idx]["focus_minutes"])

    # Placeholder day/night split until real day/night tables exist
    day_focus = 0.7 * focus_today
    night_focus = 0.3 * focus_today

    # Placeholder KPIs (until merge)
    error_count = 0.0
    error_fix_time_min = 0.0
    idle_minutes = 0.0
    idle_sessions = 0.0
    avg_idle_session_min = 0.0

    # ratios
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
        "idle_rollmean_7": float("nan"),
        "errorfix_rollmean_7": float("nan"),
    }

    for l in range(1, 8):
        row[f"focus_lag_{l}"] = lag(hist, idx, "focus_minutes", l)
        row[f"idle_lag_{l}"] = float("nan")
        row[f"errorfix_lag_{l}"] = float("nan")

    return row


# ----------------------------
# Predict endpoint (XGBoost + safe fallback)
# ----------------------------

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if MODEL is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    hist = fetch_recent_focus_history(req.userId, limit_days=30)

    if len(hist) < 10:
        raise HTTPException(
            status_code=400,
            detail="Not enough history in daily_focus_summary. Add more days for this user.",
        )

    feature_cols = MODEL_META.get("features", [])
    p90 = float(MODEL_META.get("p90_abs_residual", 25.0))

    points: List[ForecastPoint] = []

    # rolling forecast: predict day+1 using latest day, append prediction, repeat
    for _step in range(req.horizonDays):
        idx = len(hist) - 1
        current_date = hist[idx]["date"]
        next_date = current_date + timedelta(days=1)

        dow = next_date.weekday()
        is_weekend = 1 if dow in (5, 6) else 0

        feat = build_feature_row(hist, idx, dow, is_weekend)
        X = np.array([[feat.get(c, float("nan")) for c in feature_cols]], dtype=float)

        # If missing values exist (because we don't have KPI2/KPI3 yet),
        # use fallback baseline for stability.
        if np.isnan(X).any():
            recent = [h["focus_minutes"] for h in hist[-7:]]
            yhat = weighted_average(recent) if recent else 120.0
        else:
            yhat = float(MODEL.predict(X)[0])

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

        # Append predicted next day for rolling forward
        hist.append({"date": next_date, "focus_minutes": yhat_int})

    return PredictResponse(
        userId=req.userId,
        horizonDays=req.horizonDays,
        generatedAt=datetime.utcnow().isoformat() + "Z",
        points=points,
        note="Advanced XGBoost forecast (trained on synthetic data). KPI2/KPI3 placeholders until merge.",
    )
