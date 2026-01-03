from fastapi import FastAPI
from pydantic import BaseModel, Field
from datetime import date, datetime, timedelta
from typing import List, Optional
from app.db import get_conn

app = FastAPI(title="BusyBee ML Service", version="0.2.0")


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


def weighted_average(values: List[int]) -> float:
    total = 0
    weight_sum = 0
    for i, v in enumerate(values):
        w = i + 1  # older → newer
        total += v * w
        weight_sum += w
    return total / weight_sum if weight_sum else 0


def avg(values: List[int]) -> float:
    return sum(values) / len(values) if values else 0


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # 1) fetch last 7 days focus minutes
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT total_focus_minutes
        FROM daily_focus_summary
        WHERE user_id = %s
        ORDER BY date ASC
        LIMIT 7
        """,
        (req.userId,),
    )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    focus_values = [int(r["total_focus_minutes"]) for r in rows]

    # 2) base level
    base = weighted_average(focus_values) if focus_values else 120

    # 3) trend
    trend = 0
    if len(focus_values) >= 6:
        last3 = focus_values[-3:]
        prev3 = focus_values[-6:-3]
        trend = avg(last3) - avg(prev3)

    # clamp trend
    trend = max(min(trend, 60), -60)

    # 4) forecast
    today = date.today()
    points = []

    for i in range(1, req.horizonDays + 1):
        d = today + timedelta(days=i)
        predicted = max(0, round(base + i * 0.2 * trend))

        points.append(
            ForecastPoint(
                date=d.isoformat(),
                productiveMinutes=predicted,
                lower=max(0, predicted - 15),
                upper=predicted + 15,
            )
        )

    return PredictResponse(
        userId=req.userId,
        horizonDays=req.horizonDays,
        generatedAt=datetime.utcnow().isoformat() + "Z",
        points=points,
        note="Baseline forecast from daily_focus_summary (Python ML service).",
    )
