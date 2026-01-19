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
