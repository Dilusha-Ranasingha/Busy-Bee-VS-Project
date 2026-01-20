from flask import Blueprint, request, jsonify
from services.forecast_service import ForecastService

forecast_bp = Blueprint('forecast', __name__)
forecast_service = ForecastService()

@forecast_bp.route('/train', methods=['POST'])
def train_model():
    """Train XGBoost model for a user"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        days_history = data.get('days_history', 90)
        
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400
        
        result = forecast_service.train_model(user_id, days_history)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecast_bp.route('/retrain-all', methods=['POST'])
def retrain_all_users():
    """
    Retrain models for all users (used by weekly cron job)
    
    Request body: {
        "user_ids": ["user1", "user2", ...],  // optional, if omitted trains for all users with existing models
        "days_history": 90  // optional, defaults to 90
    }
    """
    try:
        data = request.get_json() or {}
        user_ids = data.get('user_ids', [])
        days_history = data.get('days_history', 90)
        
        # If no user_ids provided, find all existing models
        if not user_ids:
            import os
            from pathlib import Path
            models_dir = 'saved_models'
            if os.path.exists(models_dir):
                model_files = Path(models_dir).glob('*_model.joblib')
                user_ids = [f.stem.replace('_model', '') for f in model_files]
        
        if not user_ids:
            return jsonify({
                'status': 'success',
                'message': 'No users found for retraining',
                'retrained_count': 0
            }), 200
        
        # Retrain each user
        results = []
        success_count = 0
        
        for user_id in user_ids:
            result = forecast_service.train_model(user_id, days_history)
            if result.get('status') == 'success':
                success_count += 1
            results.append({
                'user_id': user_id,
                'status': result.get('status'),
                'message': result.get('message', 'Training completed')
            })
        
        return jsonify({
            'status': 'success',
            'retrained_count': success_count,
            'total_users': len(user_ids),
            'results': results,
            'timestamp': forecast_service.forecaster.__dict__.get('timestamp', '')
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecast_bp.route('/forecast/<user_id>', methods=['GET'])
def get_forecast(user_id):
    """Get 7-day forecast for a user"""
    try:
        days = int(request.args.get('days', 7))
        
        result = forecast_service.get_forecast(user_id, days)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecast_bp.route('/forecast/<user_id>/confidence', methods=['GET'])
def get_confidence_intervals(user_id):
    """Get forecast with confidence intervals"""
    try:
        days = int(request.args.get('days', 7))
        
        result = forecast_service.get_confidence_intervals(user_id, days)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecast_bp.route('/model-info/<user_id>', methods=['GET'])
def get_model_info(user_id):
    """Get model metadata and performance metrics"""
    try:
        result = forecast_service.get_model_info(user_id)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecast_bp.route('/predict-custom/<user_id>', methods=['POST'])
def predict_custom_metrics(user_id):
    """
    Get predictions for custom/additional metrics beyond the 8 standard ones
    
    Request body: {
        "metrics": ["commit_velocity", "save_frequency", "test_success_rate"],
        "days": 7
    }
    """
    try:
        data = request.get_json()
        requested_metrics = data.get('metrics', ['commit_velocity', 'save_frequency', 'task_success_rate'])
        days = data.get('days', 7)
        
        # Get standard forecast first
        result = forecast_service.get_forecast(user_id, days)
        
        if result.get('status') == 'error':
            return jsonify(result), 400
        
        # Extract requested custom metrics from predictions
        custom_predictions = []
        for pred in result['predictions']:
            custom_pred = {'date': pred.get('date')}
            
            for metric in requested_metrics:
                if metric in pred:
                    custom_pred[metric] = pred[metric]
            
            custom_predictions.append(custom_pred)
        
        return jsonify({
            'status': 'success',
            'user_id': user_id,
            'requested_metrics': requested_metrics,
            'predictions': custom_predictions,
            'generated_at': result['generated_at']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
