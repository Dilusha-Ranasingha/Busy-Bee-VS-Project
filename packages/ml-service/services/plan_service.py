from datetime import datetime, timedelta
from services.forecast_service import ForecastService

class PlanService:
    """Service for generating productivity plans"""
    
    def __init__(self):
        self.forecast_service = ForecastService()
    
    def generate_plan(self, user_id: str, start_date: str, end_date: str, target_hours: float):
        """
        Generate productivity plan based on forecast
        
        Args:
            user_id: User identifier
            start_date: Plan start date (YYYY-MM-DD)
            end_date: Plan end date (YYYY-MM-DD)
            target_hours: Target working hours for the period
            
        Returns:
            dict: Plan with feasibility analysis and schedule
        """
        try:
            # Parse dates
            start = datetime.fromisoformat(start_date).date()
            end = datetime.fromisoformat(end_date).date()
            days_count = (end - start).days + 1
            
            if days_count > 7:
                return {
                    'status': 'error',
                    'message': 'Maximum plan duration is 7 days'
                }
            
            if days_count <= 0:
                return {
                    'status': 'error',
                    'message': 'End date must be after start date'
                }
            
            # Get forecast for the period
            forecast = self.forecast_service.get_forecast(user_id, days_count)
            
            if forecast.get('status') == 'error':
                return forecast
            
            # Calculate available productive hours per day
            daily_availability = self._calculate_daily_availability(forecast['predictions'])
            
            # Feasibility analysis
            total_available = sum(daily_availability)
            is_feasible = total_available >= target_hours
            feasibility_score = min((total_available / target_hours) * 100, 100) if target_hours > 0 else 100
            
            # Generate schedule
            if is_feasible:
                schedule = self._allocate_hours(daily_availability, target_hours, forecast['predictions'])
            else:
                schedule = self._max_effort_schedule(daily_availability, forecast['predictions'])
            
            # Time-of-day recommendations
            best_hours = self._recommend_work_windows(forecast['predictions'])
            
            # Generate warnings
            warnings = self._generate_warnings(forecast['predictions'], target_hours, is_feasible)
            
            return {
                'status': 'success',
                'user_id': user_id,
                'plan_start_date': start_date,
                'plan_end_date': end_date,
                'target_hours': target_hours,
                'is_feasible': is_feasible,
                'feasibility_score': round(feasibility_score, 1),
                'total_available_hours': round(total_available, 1),
                'daily_schedule': schedule,
                'best_hours': best_hours,
                'warnings': warnings,
                'generated_at': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def _calculate_daily_availability(self, predictions):
        """Calculate available productive hours from predictions"""
        daily_hours = []
        
        for pred in predictions:
            # Extract focus time (assume focus_streak is in minutes)
            focus_time = pred.get('focus_streak_longest_global', 45)
            
            # Extract idle time (assume in minutes)
            idle_time = pred.get('idle_distraction_time', 30)
            
            # Estimate available hours (simple heuristic)
            # Assume 8-hour workday, subtract idle, use focus as productivity indicator
            available = max(0, (480 - idle_time) / 60 * (focus_time / 60))
            available = min(available, 10)  # Cap at 10 hours per day
            
            daily_hours.append(available)
        
        return daily_hours
    
    def _allocate_hours(self, daily_availability, target_hours, predictions):
        """Allocate target hours proportionally to predicted productivity"""
        schedule = []
        total_available = sum(daily_availability)
        
        if total_available == 0:
            return schedule
        
        for i, (available, pred) in enumerate(zip(daily_availability, predictions)):
            # Allocate proportionally
            allocated = (available / total_available) * target_hours
            allocated = min(allocated, available)  # Don't exceed availability
            
            schedule.append({
                'date': pred.get('date'),
                'allocated_hours': round(allocated, 1),
                'available_hours': round(available, 1),
                'productivity_level': self._classify_productivity(pred)
            })
        
        return schedule
    
    def _max_effort_schedule(self, daily_availability, predictions):
        """Generate maximum effort schedule when target is not feasible"""
        schedule = []
        
        for available, pred in zip(daily_availability, predictions):
            schedule.append({
                'date': pred.get('date'),
                'allocated_hours': round(available, 1),
                'available_hours': round(available, 1),
                'productivity_level': self._classify_productivity(pred),
                'note': 'Maximum capacity'
            })
        
        return schedule
    
    def _classify_productivity(self, prediction):
        """Classify day's productivity level"""
        focus = prediction.get('focus_streak_longest_global', 0)
        file_switch = prediction.get('file_switch_avg_rate', 0)
        
        if focus > 50 and file_switch < 1.5:
            return 'high'
        elif focus > 30 and file_switch < 2.0:
            return 'medium'
        else:
            return 'low'
    
    def _recommend_work_windows(self, predictions):
        """Recommend best time-of-day for work"""
        # Simplified recommendation based on average error density
        avg_errors = sum(p.get('diagnostics_avg_density', 5) for p in predictions) / len(predictions)
        
        if avg_errors < 3:
            return {
                'recommended_time': 'morning',
                'hours': '8AM - 12PM',
                'reason': 'Low error rate indicates good focus in typical morning hours'
            }
        elif avg_errors < 6:
            return {
                'recommended_time': 'afternoon',
                'hours': '1PM - 5PM',
                'reason': 'Moderate error rate, afternoon work recommended'
            }
        else:
            return {
                'recommended_time': 'flexible',
                'hours': 'Adjust based on your energy',
                'reason': 'Higher predicted error rate - take breaks and work when most alert'
            }
    
    def _generate_warnings(self, predictions, target_hours, is_feasible):
        """Generate early warnings based on predictions"""
        warnings = []
        
        if not is_feasible:
            warnings.append({
                'type': 'infeasible',
                'severity': 'high',
                'message': f'Target of {target_hours} hours is not feasible with predicted productivity'
            })
        
        # Check for high file-switching days
        for pred in predictions:
            file_switch = pred.get('file_switch_avg_rate', 0)
            if file_switch > 2.0:
                warnings.append({
                    'type': 'focus_risk',
                    'severity': 'medium',
                    'date': pred.get('date'),
                    'message': f'High file-switching predicted ({file_switch:.1f}/min) - focus risk on this day'
                })
        
        # Check for low focus streak days
        for pred in predictions:
            focus = pred.get('focus_streak_longest_global', 0)
            if focus < 25:
                warnings.append({
                    'type': 'low_focus',
                    'severity': 'medium',
                    'date': pred.get('date'),
                    'message': f'Low focus streak predicted ({focus:.0f} min) - consider lighter tasks'
                })
        
        # Check for high error density
        for pred in predictions:
            errors = pred.get('diagnostics_avg_density', 0)
            if errors > 8:
                warnings.append({
                    'type': 'high_errors',
                    'severity': 'low',
                    'date': pred.get('date'),
                    'message': f'High error density predicted ({errors:.1f}/KLOC) - allocate debugging time'
                })
        
        return warnings
