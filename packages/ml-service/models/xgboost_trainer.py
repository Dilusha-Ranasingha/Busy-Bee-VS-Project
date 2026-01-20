import xgboost as xgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import numpy as np
import joblib

class XGBoostTrainer:
    """XGBoost model training for time-series forecasting"""
    
    def __init__(self):
        self.params = {
            'objective': 'reg:squarederror',
            'max_depth': 6,
            'learning_rate': 0.1,
            'n_estimators': 100,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'random_state': 42
        }
    
    def train(self, features, targets, user_id: str):
        """
        Train XGBoost models for each target metric with recency weighting
        
        Args:
            features: Feature DataFrame
            targets: Target DataFrame
            user_id: User identifier
            
        Returns:
            tuple: (trained_models_dict, metrics_dict)
        """
        if features.empty or targets.empty:
            raise ValueError("Features and targets cannot be empty")
        
        # Remove date column from features
        feature_cols = [col for col in features.columns if col != 'date']
        X = features[feature_cols].values
        
        # Calculate exponential recency weights (recent data gets 2-3x more importance)
        # Last 7-14 days get significantly higher weights
        n_samples = len(X)
        days_offset = np.arange(n_samples)  # 0, 1, 2, ..., n-1
        # Exponential decay: weights increase from ~0.37 (oldest) to 1.0 (most recent)
        sample_weights = np.exp(days_offset / n_samples)
        # Normalize so last 14 days get ~2.5x more weight than first 14 days
        sample_weights = sample_weights / np.mean(sample_weights)
        
        models = {}
        metrics = {}
        
        # Train separate model for each target variable
        for target_col in targets.columns:
            y = targets[target_col].values
            
            # Time series cross-validation
            tscv = TimeSeriesSplit(n_splits=3)
            cv_scores = []
            
            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X[train_idx], X[val_idx]
                y_train, y_val = y[train_idx], y[val_idx]
                weights_train = sample_weights[train_idx]
                
                model = xgb.XGBRegressor(**self.params)
                model.fit(
                    X_train, y_train,
                    sample_weight=weights_train,  # Apply recency weighting
                    eval_set=[(X_val, y_val)],
                    verbose=False
                )
                
                y_pred = model.predict(X_val)
                mae = mean_absolute_error(y_val, y_pred)
                cv_scores.append(mae)
            
            # Train final model on all data with recency weights
            final_model = xgb.XGBRegressor(**self.params)
            final_model.fit(X, y, sample_weight=sample_weights, verbose=False)
            
            models[target_col] = final_model
            
            # Calculate metrics
            y_pred_all = final_model.predict(X)
            metrics[target_col] = {
                'mae': float(mean_absolute_error(y, y_pred_all)),
                'rmse': float(np.sqrt(mean_squared_error(y, y_pred_all))),
                'r2': float(r2_score(y, y_pred_all)),
                'cv_mae_mean': float(np.mean(cv_scores)),
                'cv_mae_std': float(np.std(cv_scores))
            }
        
        # Combine models and feature names
        model_package = {
            'models': models,
            'feature_names': feature_cols,
            'target_names': list(targets.columns),
            'user_id': user_id
        }
        
        return model_package, metrics
    
    def save_model(self, model_package, path: str):
        """Save trained model to disk"""
        joblib.dump(model_package, path)
    
    def load_model(self, path: str):
        """Load trained model from disk"""
        return joblib.load(path)
