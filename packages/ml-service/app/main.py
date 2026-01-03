from fastapi import FastAPI
from pydantic import BaseModel, Field
from datetime import date, datetime, timedelta
from typing import List, Optional

app = FastAPI(title="BusyBee ML Service", version="0.1.0")


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


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    # Dummy response for now (same idea as baseline)
    # Next step we will pull last 7 days from Postgres and compute baseline here.
    today = date.today()
    points = []
    base = 120

    for i in range(1, req.horizonDays + 1):
        d = today + timedelta(days=i)
        predicted = base

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
        note="Dummy ML-service forecast (will be replaced with DB baseline next).",
    )
