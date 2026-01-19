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
            
            # Generate predictions
            predictions = self.forecaster.predict(model, recent_data, days)
            
            forecast_start = datetime.now().date() + timedelta(days=1)
            forecast_dates = [(forecast_start + timedelta(days=i)).isoformat() for i in range(days)]
            
            return {
                'status': 'success',
                'user_id': user_id,
                'forecast_start_date': forecast_dates[0],
                'forecast_end_date': forecast_dates[-1],
                'predictions': predictions,
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
