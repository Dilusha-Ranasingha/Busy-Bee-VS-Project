from flask import Blueprint, request, jsonify
from services.plan_service import PlanService

plan_bp = Blueprint('plan', __name__)
plan_service = PlanService()

@plan_bp.route('/generate-plan', methods=['POST'])
def generate_plan():
    """Generate productivity plan based on forecast"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        target_hours = data.get('target_hours')
        
        if not all([user_id, start_date, end_date, target_hours]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        result = plan_service.generate_plan(user_id, start_date, end_date, target_hours)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
