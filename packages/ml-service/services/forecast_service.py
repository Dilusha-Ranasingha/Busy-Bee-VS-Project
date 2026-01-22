from datetime import datetime, timedelta
from models.feature_engineer import FeatureEngineer
from models.xgboost_trainer import XGBoostTrainer
from models.forecaster import Forecaster
import os

class ForecastService:
    """Service for managing ML forecasting operations"""
    
    def __init__(self):
        self.feature_engineer = FeatureEngineer()
        self.trainer = XGBoostTrainer()
        self.forecaster = Forecaster()
        self.models_dir = 'saved_models'
        
        # Create models directory if it doesn't exist
        os.makedirs(self.models_dir, exist_ok=True)
    
    def train_model(self, user_id: str, days_history: int = 90):
        """
        Train XGBoost model for a user
        
        Args:
            user_id: User identifier
            days_history: Number of days of historical data to use
            
        Returns:
            dict: Training results with metrics
        """
        try:
            # Fetch historical data
            data = self.feature_engineer.fetch_user_data(user_id, days_history)
            
            if data.empty or len(data) < 30:
                return {
                    'status': 'error',
                    'message': f'Insufficient data. Need at least 30 days, got {len(data)} days'
                }
            
            # Engineer features
            features, targets = self.feature_engineer.prepare_features(data)
            
            # Train model
            model, metrics = self.trainer.train(features, targets, user_id)
            
            # Save model
            model_path = os.path.join(self.models_dir, f'{user_id}_model.joblib')
            self.trainer.save_model(model, model_path)
            
            return {
                'status': 'success',
                'user_id': user_id,
                'training_samples': len(data),
                'metrics': metrics,
                'model_version': datetime.now().strftime('%Y%m%d_%H%M%S'),
                'model_path': model_path
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_forecast(self, user_id: str, days: int = 7):
        """
        Get productivity forecast for next N days
        
        Args:
            user_id: User identifier
            days: Number of days to forecast (max 7)
            
        Returns:
            dict: Forecast results
        """
        try:
            if days > 7:
                return {
                    'status': 'error',
                    'message': 'Maximum forecast horizon is 7 days'
                }
            
            # Load model
            model_path = os.path.join(self.models_dir, f'{user_id}_model.joblib')
            
            if not os.path.exists(model_path):
                return {
                    'status': 'error',
                    'message': 'Model not found. Please train the model first.'
                }
            
            model = self.trainer.load_model(model_path)
            
            # Get recent data for context
            recent_data = self.feature_engineer.fetch_user_data(user_id, days=30)
            
            # Generate predictions with user_id
            predictions = self.forecaster.predict(model, recent_data, days, user_id=user_id)
            
            # Calculate prediction confidence
            confidence_info = self._calculate_prediction_confidence(
                user_id, 
                len(recent_data),
                predictions
            )
            
            forecast_start = datetime.now().date() + timedelta(days=1)
            forecast_dates = [(forecast_start + timedelta(days=i)).isoformat() for i in range(days)]
            
            return {
                'status': 'success',
                'user_id': user_id,
                'forecast_start_date': forecast_dates[0],
                'forecast_end_date': forecast_dates[-1],
                'predictions': predictions,
                'confidence': confidence_info,  # NEW: Confidence metadata
                'generated_at': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_confidence_intervals(self, user_id: str, days: int = 7):
        """
        Get forecast with confidence intervals
        
        Args:
            user_id: User identifier
            days: Number of days to forecast
            
        Returns:
            dict: Forecast with confidence bounds
        """
        try:
            # Get base forecast
            forecast = self.get_forecast(user_id, days)
            
            if forecast.get('status') == 'error':
                return forecast
            
            # Add confidence intervals (placeholder for now)
            # TODO: Implement quantile regression or bootstrap for confidence intervals
            predictions_with_ci = []
            for pred in forecast['predictions']:
                predictions_with_ci.append({
                    **pred,
                    'confidence_lower': {k: v * 0.85 for k, v in pred.items() if k != 'date'},
                    'confidence_upper': {k: v * 1.15 for k, v in pred.items() if k != 'date'}
                })
            
            forecast['predictions'] = predictions_with_ci
            return forecast
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def get_model_info(self, user_id: str):
        """
        Get model metadata and performance
        
        Args:
            user_id: User identifier
            
        Returns:
            dict: Model information
        """
        try:
            model_path = os.path.join(self.models_dir, f'{user_id}_model.joblib')
            
            if not os.path.exists(model_path):
                return {
                    'status': 'error',
                    'message': 'Model not found'
                }
            
            # Get file modification time as training date
            model_mtime = os.path.getmtime(model_path)
            training_date = datetime.fromtimestamp(model_mtime)
            
            return {
                'status': 'success',
                'user_id': user_id,
                'model_exists': True,
                'last_trained': training_date.isoformat(),
                'model_path': model_path
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _calculate_prediction_confidence(self, user_id: str, data_days: int, predictions: list) -> dict:
        """
        Calculate confidence metrics for predictions
        
        Args:
            user_id: User identifier
            data_days: Number of days of historical data used
            predictions: List of predictions
            
        Returns:
            dict: Confidence information with scores and explanations
        """
        try:
            from config.database import get_session
            from sqlalchemy import text
            
            session = get_session()
            
            # Query to calculate data quality metrics
            query = text("""
                WITH recent_data AS (
                    SELECT 
                        date,
                        COALESCE((focus_streak->>'global_focus_streak_max_min')::numeric, 0) as focus,
                        COALESCE((file_switch->>'file_switch_rate_avg')::numeric, 0) as switches,
                        COALESCE((diagnostics_per_kloc->>'diagnostics_density_avg_per_kloc')::numeric, 0) as errors
                    FROM daily_metrics
                    WHERE user_id = :user_id
                        AND date >= NOW() - INTERVAL '90 days'
                        AND is_synthetic = FALSE
                    ORDER BY date DESC
                )
                SELECT 
                    COUNT(*) as data_points,
                    STDDEV(focus) as focus_stddev,
                    STDDEV(switches) as switches_stddev,
                    STDDEV(errors) as errors_stddev,
                    AVG(focus) as focus_avg,
                    AVG(switches) as switches_avg,
                    AVG(errors) as errors_avg
                FROM recent_data
            """)
            
            result = session.execute(query, {'user_id': user_id}).fetchone()
            session.close()
            
            if not result or result[0] == 0:
                return {
                    'overall_confidence': 0.3,
                    'confidence_level': 'low',
                    'data_quality': 'insufficient',
                    'explanation': 'Insufficient historical data for reliable predictions',
                    'factors': {
                        'data_points': 0,
                        'pattern_stability': 0.0,
                        'data_recency': 0.0
                    }
                }
            
            data_points = int(result[0])
            focus_stddev = float(result[1] or 0)
            switches_stddev = float(result[2] or 0)
            errors_stddev = float(result[3] or 0)
            focus_avg = float(result[4] or 0)
            
            # Calculate confidence factors
            
            # 1. Data quantity score (0-1)
            data_quantity_score = min(data_points / 60, 1.0)  # Ideal: 60+ days
            
            # 2. Pattern stability score (0-1) - lower variance = higher confidence
            # Coefficient of variation (CV) = stddev / mean
            focus_cv = (focus_stddev / focus_avg) if focus_avg > 0 else 1.0
            pattern_stability_score = max(0, 1.0 - (focus_cv / 2))  # CV > 2 = very unstable
            
            # 3. Data recency score (0-1) - how recent is the data
            days_since_last = data_days
            data_recency_score = max(0, 1.0 - (days_since_last / 30))  # Decay over 30 days
            
            # Overall confidence (weighted average)
            overall_confidence = (
                data_quantity_score * 0.4 +
                pattern_stability_score * 0.4 +
                data_recency_score * 0.2
            )
            
            # Classify confidence level
            if overall_confidence >= 0.75:
                confidence_level = 'high'
                quality = 'excellent'
                explanation = f'Strong confidence based on {data_points} days of stable patterns'
            elif overall_confidence >= 0.55:
                confidence_level = 'medium'
                quality = 'good'
                explanation = f'Moderate confidence with {data_points} days of data'
            elif overall_confidence >= 0.35:
                confidence_level = 'fair'
                quality = 'acceptable'
                explanation = f'Fair confidence - predictions may vary ({data_points} days analyzed)'
            else:
                confidence_level = 'low'
                quality = 'limited'
                explanation = f'Low confidence due to limited or unstable data ({data_points} days)'
            
            return {
                'overall_confidence': round(overall_confidence, 3),
                'confidence_level': confidence_level,
                'data_quality': quality,
                'explanation': explanation,
                'factors': {
                    'data_points': data_points,
                    'data_quantity_score': round(data_quantity_score, 2),
                    'pattern_stability': round(pattern_stability_score, 2),
                    'data_recency': round(data_recency_score, 2)
                },
                'metrics_variance': {
                    'focus_cv': round(focus_cv, 2),
                    'switches_stddev': round(switches_stddev, 2),
                    'errors_stddev': round(errors_stddev, 2)
                }
            }
            
        except Exception as e:
            return {
                'overall_confidence': 0.5,
                'confidence_level': 'unknown',
                'data_quality': 'unknown',
                'explanation': f'Could not calculate confidence: {str(e)}',
                'factors': {}
            }
