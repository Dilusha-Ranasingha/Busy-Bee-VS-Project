import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from models.feature_engineer import FeatureEngineer

class Forecaster:
    """Generate predictions using trained XGBoost models"""
    
    def __init__(self):
        self.feature_engineer = FeatureEngineer()
    
    def predict(self, model_package, recent_data: pd.DataFrame, days: int = 7, user_id: str = None):
        """
        Generate multi-day ahead predictions
        
        Args:
            model_package: Trained model package with models and metadata
            recent_data: Recent historical data for context
            days: Number of days to forecast
            user_id: User identifier to include in predictions
            
        Returns:
            list: Predictions for each day
        """
        if recent_data.empty:
            raise ValueError("Recent data is required for forecasting")
        
        models = model_package['models']
        feature_names = model_package['feature_names']
        user_id = user_id or model_package.get('user_id', 'unknown')
        
        # Prepare features from recent data
        features, _ = self.feature_engineer.prepare_features(recent_data)
        
        if features.empty:
            raise ValueError("Could not extract features from recent data")
        
        predictions = []
        current_features = features.iloc[-1:].copy()  # Start with most recent data
        
        for day in range(days):
            forecast_date = datetime.now().date() + timedelta(days=day+1)
            
            # Prepare feature vector
            X = current_features[feature_names].values
            
            # Predict each target metric
            day_prediction = {
                'date': forecast_date.isoformat(),
                'user_id': user_id
            }
            
            for target_name, model in models.items():
                pred_value = model.predict(X)[0]
                pred_value = max(0, pred_value)  # Ensure non-negative predictions
                day_prediction[target_name] = float(round(pred_value, 2))
            
            # Calculate idle_distraction_time based on predicted productivity
            # Lower focus = more idle time, higher focus = less idle time
            if 'idle_distraction_time' in current_features.columns:
                base_idle = float(current_features['idle_distraction_time'].values[0])
                predicted_focus = day_prediction.get('focus_streak_longest_global', 40)
                
                # Inverse relationship: low focus (20 min) -> more idle, high focus (60 min) -> less idle
                # Normalize focus to 0-1 range (assuming 20-60 min range)
                focus_factor = max(0, min(1, (predicted_focus - 20) / 40))
                
                # Higher focus -> less idle (0.6-1.0x of base), lower focus -> more idle (1.0-1.4x of base)
                idle_multiplier = 1.4 - (focus_factor * 0.8)
                
                day_prediction['idle_distraction_time'] = float(round(base_idle * idle_multiplier, 2))
            
            # Add other important metrics from features for comprehensive predictions
            additional_metrics = [
                'commit_velocity', 'save_frequency', 'autosave_count', 
                'test_duration', 'edits_per_commit', 'task_success_rate'
            ]
            for metric in additional_metrics:
                if metric in current_features.columns and metric not in day_prediction:
                    day_prediction[metric] = float(current_features[metric].values[0])
            
            predictions.append(day_prediction)
            
            # Update features for next iteration (rolling forecast)
            # This is simplified - in production, would update lag features properly
            current_features = self._update_features_for_next_day(
                current_features, day_prediction, forecast_date
            )
        
        return predictions
    
    def _update_features_for_next_day(self, features, prediction, forecast_date):
        """
        Update features for next day's prediction
        
        This creates a rolling forecast by using previous predictions as inputs
        """
        next_features = features.copy()
        
        # Update temporal features
        next_features['day_of_week'] = forecast_date.weekday()
        next_features['is_weekend'] = 1 if forecast_date.weekday() >= 5 else 0
        next_features['week_of_month'] = forecast_date.day // 7 + 1
        
        # Update direct features with predictions
        for key, value in prediction.items():
            if key in next_features.columns and key != 'date':
                next_features[key] = value
        
        # Update lag features (simplified - shift values)
        lag_columns = [col for col in next_features.columns if 'lag_' in col or 'rolling_' in col]
        # In production, implement proper lag feature updating
        
        return next_features
