# ML Forecasting Service

Machine learning service for productivity forecasting using XGBoost. Provides 7-day short-term forecasts and productivity plan generation.

## Features

- **Training**: Train XGBoost models on user productivity data
- **Forecasting**: Predict next 7 days of productivity metrics
- **Plan Generation**: Generate feasible work schedules based on predictions
- **Confidence Intervals**: Provide prediction uncertainty estimates

## Tech Stack

- Flask (REST API)
- XGBoost (Time-series forecasting)
- SQLAlchemy (PostgreSQL integration)
- Pandas/NumPy (Data processing)
- scikit-learn (Preprocessing & evaluation)

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run the service:
```bash
python app.py
```

Service runs on `http://localhost:5001`

## API Endpoints

### Training
- `POST /api/ml/train` - Train model for a user
- `GET /api/ml/model-info/:userId` - Get model metadata

### Forecasting
- `GET /api/ml/forecast/:userId` - Get 7-day forecast
- `GET /api/ml/forecast/:userId/confidence` - Get confidence intervals

### Plan Generation
- `POST /api/ml/generate-plan` - Generate productivity plan

## Development

Generate synthetic data for testing:
```bash
python scripts/generate_synthetic_data.py
```
