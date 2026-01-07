import os
import json
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error
from xgboost import XGBRegressor
import joblib


# ==========================================
# 1) Synthetic Data Generator
# ==========================================

@dataclass
class UserProfile:
    user_id: str
    base_focus: float
    night_owl: bool
    error_prone: bool
    distractible: bool
    consistency: float  # 0..1 (higher = stable)


def make_user_profiles(n_users: int, seed: int = 42) -> List[UserProfile]:
    rng = np.random.default_rng(seed)
    profiles: List[UserProfile] = []
    for i in range(n_users):
        profiles.append(
            UserProfile(
                user_id=f"user_{i+1:04d}",
                base_focus=float(rng.uniform(60, 220)),
                night_owl=bool(rng.integers(0, 2)),
                error_prone=bool(rng.integers(0, 2)),
                distractible=bool(rng.integers(0, 2)),
                consistency=float(rng.uniform(0.3, 0.95)),
            )
        )
    return profiles


def weekday_factor(dow: int) -> float:
    # 0=Mon..6=Sun
    return 0.75 if dow in (5, 6) else 1.0


def generate_synthetic_daily_data(
    n_users: int = 250,
    n_days: int = 140,
    start_date: date = date(2025, 7, 1),
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    profiles = make_user_profiles(n_users, seed)

    rows: List[Dict] = []

    for p in profiles:
        # small lifestyle drift per user
        drift = rng.normal(0, 0.15)
        state = p.base_focus

        for day_idx in range(n_days):
            d = start_date + timedelta(days=day_idx)
            dow = d.weekday()
            wk = weekday_factor(dow)

            # stable users vary less
            noise_scale = (1.0 - p.consistency) * 25 + 5
            routine_noise = rng.normal(0, noise_scale)

            # errors (more for error_prone)
            base_errors = 2.0 if p.error_prone else 1.0
            error_count = int(max(0, rng.poisson(base_errors * wk)))
            avg_fix = float(rng.uniform(6, 16) if p.error_prone else rng.uniform(3, 10))
            error_fix_time = float(max(0.0, error_count * avg_fix + rng.normal(0, 3)))

            # idle sessions (more for distractible)
            idle_sessions = int(max(0, rng.poisson(3.0 if p.distractible else 1.5)))
            avg_idle_session = float(rng.uniform(5, 18) if p.distractible else rng.uniform(2, 10))
            idle_minutes = float(max(0.0, idle_sessions * avg_idle_session + rng.normal(0, 5)))

            # day/night focus preference
            if p.night_owl:
                night_ratio = float(rng.uniform(0.55, 0.85))
            else:
                night_ratio = float(rng.uniform(0.15, 0.45))

            # update user baseline state
            state = 0.95 * state + 0.05 * p.base_focus + drift + rng.normal(0, 0.5)

            # raw focus minutes
            raw_focus = state * wk + routine_noise

            # penalty: errors + idle reduce focus
            penalty = 0.18 * idle_minutes + 0.12 * error_fix_time
            focus_minutes = float(max(0.0, raw_focus - penalty))

            night_focus = focus_minutes * night_ratio
            day_focus = focus_minutes - night_focus

            rows.append(
                {
                    "user_id": p.user_id,
                    "date": d.isoformat(),
                    "dow": dow,
                    "is_weekend": 1 if dow in (5, 6) else 0,

                    # Inputs (your KPIs)
                    "focus_minutes": round(focus_minutes),
                    "day_focus_minutes": round(day_focus),
                    "night_focus_minutes": round(night_focus),

                    "error_count": error_count,
                    "error_fix_time_min": round(error_fix_time, 1),

                    "idle_minutes": round(idle_minutes, 1),
                    "idle_sessions": idle_sessions,
                    "avg_idle_session_min": round(avg_idle_session, 1),
                }
            )

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["user_id", "date"]).reset_index(drop=True)
    return df


# ==========================================
# 2) Feature Engineering
# ==========================================

def add_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["user_id", "date"]).reset_index(drop=True)
    g = df.groupby("user_id", group_keys=False)

    # lags (1..7)
    for lag in range(1, 8):
        df[f"focus_lag_{lag}"] = g["focus_minutes"].shift(lag)
        df[f"idle_lag_{lag}"] = g["idle_minutes"].shift(lag)
        df[f"errorfix_lag_{lag}"] = g["error_fix_time_min"].shift(lag)

    # rolling means (past 7 days, excluding today)
    df["focus_rollmean_7"] = g["focus_minutes"].shift(1).rolling(7).mean()
    df["idle_rollmean_7"] = g["idle_minutes"].shift(1).rolling(7).mean()
    df["errorfix_rollmean_7"] = g["error_fix_time_min"].shift(1).rolling(7).mean()

    # ratios
    df["night_ratio"] = df["night_focus_minutes"] / (df["focus_minutes"] + 1.0)
    df["error_pressure"] = df["error_fix_time_min"] / (df["focus_minutes"] + 1.0)

    return df


def make_next_day_target(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["user_id", "date"]).reset_index(drop=True)
    g = df.groupby("user_id", group_keys=False)

    # target = focus at next day
    df["target_next_focus"] = g["focus_minutes"].shift(-1)
    df = df.dropna(subset=["target_next_focus"])
    return df


# ==========================================
# 3) Train XGBoost
# ==========================================

def train_xgb(df: pd.DataFrame) -> Tuple[XGBRegressor, List[str], dict]:
    feature_cols = [
        "dow", "is_weekend",
        "day_focus_minutes", "night_focus_minutes",
        "error_count", "error_fix_time_min",
        "idle_minutes", "idle_sessions", "avg_idle_session_min",
        "night_ratio", "error_pressure",
        "focus_rollmean_7", "idle_rollmean_7", "errorfix_rollmean_7",
    ]
    for lag in range(1, 8):
        feature_cols += [f"focus_lag_{lag}", f"idle_lag_{lag}", f"errorfix_lag_{lag}"]

    df_train = df.dropna(subset=feature_cols).copy()

    # time-based split: early 80% train, later 20% test
    cutoff = df_train["date"].quantile(0.8)
    train_mask = df_train["date"] <= cutoff

    X_train = df_train.loc[train_mask, feature_cols].astype(float)
    y_train = df_train.loc[train_mask, "target_next_focus"].astype(float)

    X_test = df_train.loc[~train_mask, feature_cols].astype(float)
    y_test = df_train.loc[~train_mask, "target_next_focus"].astype(float)

    model = XGBRegressor(
        n_estimators=600,
        learning_rate=0.05,
        max_depth=5,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        random_state=42,
        objective="reg:squarederror",
    )

    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, pred))

    # simple uncertainty via residual percentiles
    abs_residual = np.abs(y_test.values - pred)
    p90 = float(np.percentile(abs_residual, 90))

    meta = {
        "model_type": "XGBoost next-day regressor",
        "features": feature_cols,
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "cutoff_date": str(pd.to_datetime(cutoff).date()),
        "mae_test": mae,
        "p90_abs_residual": p90,
    }

    return model, feature_cols, meta


def main():
    print("1) Generate synthetic dataset...")
    df = generate_synthetic_daily_data()

    print("2) Create features...")
    df = add_features(df)

    print("3) Create next-day target...")
    df = make_next_day_target(df)

    print("4) Train XGBoost model...")
    model, feature_cols, meta = train_xgb(df)

    os.makedirs("models", exist_ok=True)

    model_path = os.path.join("models", "focus_xgb.joblib")
    meta_path = os.path.join("models", "focus_xgb_meta.json")

    joblib.dump(model, model_path)
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print("\n✅ Training complete!")
    print(f"Model saved: {model_path}")
    print(f"Meta saved : {meta_path}")
    print(f"Test MAE   : {meta['mae_test']:.2f} minutes")
    print(f"P90 error  : {meta['p90_abs_residual']:.2f} minutes")


if __name__ == "__main__":
    main()
