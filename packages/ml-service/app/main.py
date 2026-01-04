import os
import json
from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.db import get_conn

app = FastAPI(title="BusyBee ML Service", version="1.2.0")


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

MODEL_VERSION = "xgb_synth_v1"


def load_model_once() -> None:
    global MODEL, MODEL_META

    if not os.path.exists(MODEL_PATH) or not os.path.exists(META_PATH):
        raise RuntimeError(
            "Model files not found.\n"
            "Train first:\n"
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
        "model_version": MODEL_VERSION,
    }


# ----------------------------
# DB fetch: joined history (focus + idle + error + time-of-day)
# ----------------------------

def fetch_recent_joined_history(user_id: str, limit_days: int = 90) -> List[Dict[str, Any]]:
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
          COALESCE(e.total_fix_time_min, 0) AS error_fix_time_min,

          COALESCE(t.day_focus_minutes, 0) AS day_focus_minutes,
          COALESCE(t.night_focus_minutes, 0) AS night_focus_minutes,
          COALESCE(t.day_sessions, 0) AS day_sessions,
          COALESCE(t.night_sessions, 0) AS night_sessions

        FROM daily_focus_summary f
        LEFT JOIN daily_idle_summary i
          ON i.user_id = f.user_id AND i.date = f.date
        LEFT JOIN daily_error_summary e
          ON e.user_id = f.user_id AND e.date = f.date
        LEFT JOIN daily_time_focus_summary t
          ON t.user_id = f.user_id AND t.date = f.date
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
                "date": r["date"],

                "focus_minutes": int(r["focus_minutes"]),

                "idle_minutes": float(r["idle_minutes"]),
                "idle_sessions": int(r["idle_sessions"]),
                "avg_idle_session_min": float(r["avg_idle_session_min"]),

                "error_count": int(r["error_count"]),
                "error_fix_time_min": float(r["error_fix_time_min"]),

                "day_focus_minutes": int(r["day_focus_minutes"]),
                "night_focus_minutes": int(r["night_focus_minutes"]),
                "day_sessions": int(r["day_sessions"]),
                "night_sessions": int(r["night_sessions"]),
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
    focus_today = float(hist[idx]["focus_minutes"])

    # Use REAL day/night values from table (if both 0, fallback to a split)
    day_focus = float(hist[idx]["day_focus_minutes"])
    night_focus = float(hist[idx]["night_focus_minutes"])
    if day_focus <= 0 and night_focus <= 0:
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

def get_global_feature_importance(top_n: int = 10):
    """
    Returns global importance as a sorted list:
    [{"feature": "...", "importance": 0.123}, ...]
    """
    booster = MODEL.get_booster()
    score = booster.get_score(importance_type="gain")  # gain is good default

    # Ensure every feature appears even if missing in dict
    feature_cols = MODEL_META.get("features", [])
    items = []
    for f in feature_cols:
        items.append({"feature": f, "importance": float(score.get(f, 0.0))})

    items.sort(key=lambda x: x["importance"], reverse=True)
    return items[:top_n]


def get_local_approx_impacts(feature_row: Dict[str, float], top_n: int = 10):
    """
    Simple, non-technical "impact" approximation:
    impact ~ normalized_importance * feature_value
    This is NOT SHAP, but it is explainable and good for UI/viva.
    """
    global_imp = get_global_feature_importance(top_n=9999)
    imp_map = {x["feature"]: x["importance"] for x in global_imp}

    # normalize importances to 0..1 (avoid division by 0)
    max_imp = max(imp_map.values()) if imp_map else 1.0
    if max_imp <= 0:
        max_imp = 1.0

    impacts = []
    for feat, value in feature_row.items():
        norm_imp = float(imp_map.get(feat, 0.0)) / max_imp
        impacts.append(
            {
                "feature": feat,
                "value": float(value),
                "importanceNorm": round(norm_imp, 4),
                "approxImpact": round(norm_imp * float(value), 4),
            }
        )

    # Sort by absolute approx impact
    impacts.sort(key=lambda x: abs(x["approxImpact"]), reverse=True)
    return impacts[:top_n]


# ----------------------------
# Save predictions to DB (forecast_daily_productivity)
# ----------------------------

def save_forecast_to_db(user_id: str, points: List[ForecastPoint], horizon_days: int) -> None:
    conn = get_conn()
    cur = conn.cursor()

    for p in points:
        target_date = p.date  # ISO string
        cur.execute(
            """
            INSERT INTO forecast_daily_productivity
              (user_id, target_date, predicted_focus_minutes, lower_bound, upper_bound, model_version, horizon_days)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (user_id, target_date, model_version, horizon_days)
            DO UPDATE SET
              predicted_focus_minutes = EXCLUDED.predicted_focus_minutes,
              lower_bound = EXCLUDED.lower_bound,
              upper_bound = EXCLUDED.upper_bound,
              created_at = CURRENT_TIMESTAMP
            """,
            (
                user_id,
                target_date,
                p.productiveMinutes,
                p.lower,
                p.upper,
                MODEL_VERSION,
                horizon_days,
            ),
        )

    conn.commit()
    cur.close()
    conn.close()


# ----------------------------
# Predict endpoint (XGBoost + store predictions)
# ----------------------------

@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if MODEL is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    hist = fetch_recent_joined_history(req.userId, limit_days=120)

    if len(hist) < 20:
        raise HTTPException(
            status_code=400,
            detail="Not enough history. Need ~20+ days for full XGBoost features.",
        )

    feature_cols = MODEL_META.get("features", [])
    p90 = float(MODEL_META.get("p90_abs_residual", 25.0))

    points: List[ForecastPoint] = []

    # Rolling forecast: predict next day, append, repeat
    for _ in range(req.horizonDays):
        idx = len(hist) - 1
        current_date = hist[idx]["date"]
        next_date = current_date + timedelta(days=1)

        feat = build_feature_row(hist, idx, next_date)
        X = np.array([[feat.get(c, float("nan")) for c in feature_cols]], dtype=float)

        # If NaN still exists, fallback to weighted average
        if np.isnan(X).any():
            recent = [h["focus_minutes"] for h in hist[-7:]]
            yhat = sum((i + 1) * v for i, v in enumerate(recent)) / sum(range(1, len(recent) + 1))
        else:
            yhat = float(MODEL.predict(X)[0])

        yhat_int = int(max(0, round(yhat)))
        lower = int(max(0, round(yhat_int - p90)))
        upper = int(max(0, round(yhat_int + p90)))

        fp = ForecastPoint(
            date=next_date.isoformat(),
            productiveMinutes=yhat_int,
            lower=lower,
            upper=upper,
        )
        points.append(fp)

        # roll forward
        # (carry idle/errors/time-of-day from last day for now; later you can forecast them too)
        hist.append(
            {
                "date": next_date,
                "focus_minutes": yhat_int,

                "idle_minutes": hist[idx]["idle_minutes"],
                "idle_sessions": hist[idx]["idle_sessions"],
                "avg_idle_session_min": hist[idx]["avg_idle_session_min"],

                "error_count": hist[idx]["error_count"],
                "error_fix_time_min": hist[idx]["error_fix_time_min"],

                # keep same day/night ratio style
                "day_focus_minutes": hist[idx]["day_focus_minutes"],
                "night_focus_minutes": hist[idx]["night_focus_minutes"],
                "day_sessions": hist[idx]["day_sessions"],
                "night_sessions": hist[idx]["night_sessions"],
            }
        )

    # ✅ Store into DB
    save_forecast_to_db(req.userId, points, req.horizonDays)

    return PredictResponse(
        userId=req.userId,
        horizonDays=req.horizonDays,
        generatedAt=datetime.utcnow().isoformat() + "Z",
        points=points,
        note="Advanced XGBoost forecast saved to DB (focus + idle + error + day/night).",
    )

@app.get("/explain/{userId}")
def explain(userId: str, days: int = 7, top: int = 8):
    """
    Explainability endpoint (XGBoost):
    - Global top features (gain importance)
    - Local approximation for next-day prediction based on latest available day
    """
    if MODEL is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    days = max(1, min(int(days), 7))
    top = max(3, min(int(top), 15))

    hist = fetch_recent_joined_history(userId, limit_days=120)
    if len(hist) < 20:
        raise HTTPException(status_code=400, detail="Not enough history to explain (need ~20+ days).")

    # Explain for "next day after latest actual"
    idx = len(hist) - 1
    current_date = hist[idx]["date"]
    next_date = current_date + timedelta(days=1)

    feature_cols = MODEL_META.get("features", [])
    feat_row = build_feature_row(hist, idx, next_date)

    X = np.array([[feat_row.get(c, float("nan")) for c in feature_cols]], dtype=float)
    if np.isnan(X).any():
        raise HTTPException(
            status_code=400,
            detail="Cannot explain because some model features are missing/NaN.",
        )

    yhat = float(MODEL.predict(X)[0])

    global_top = get_global_feature_importance(top_n=top)
    local_top = get_local_approx_impacts(feat_row, top_n=top)

    return {
        "userId": userId,
        "explainedForDate": next_date.isoformat(),
        "predictedProductiveMinutes": int(max(0, round(yhat))),
        "globalTopFeatures": global_top,
        "localApproxTop": local_top,
        "note": "Global importance uses XGBoost gain. LocalApprox is a simple importance×value approximation (not SHAP).",
    }
