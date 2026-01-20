from datetime import datetime, timedelta
from services.forecast_service import ForecastService
from services.time_pattern_service import TimePatternService

class PlanService:
    """Service for generating productivity plans"""
    
    def __init__(self):
        self.forecast_service = ForecastService()
        self.time_pattern_service = TimePatternService()
    
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
            
            # Get historical performance data to determine realistic stretch capacity
            historical_stats = self._get_historical_performance_stats(user_id, days_count)
            
            # Feasibility analysis with smart target adjustment
            total_available = sum(daily_availability)
            is_feasible = total_available >= target_hours
            feasibility_score = min((total_available / target_hours) * 100, 100) if target_hours > 0 else 100
            
            # Smart target handling based on user's own historical patterns
            adjusted_target = target_hours
            adjustment_suggestion = None
            actual_allocation_target = target_hours  # What we'll use for schedule allocation
            
            if target_hours > total_available:
                # User wants stretch goal - calculate based on their historical variance
                stretch_amount = target_hours - total_available
                stretch_percentage = (stretch_amount / total_available) * 100
                
                # Determine achievable stretch based on user's historical peak performance
                # If they've achieved higher in the past, they can do it again
                historical_max = historical_stats.get('max_weekly_hours', total_available * 1.1)
                historical_avg = historical_stats.get('avg_weekly_hours', total_available)
                
                # Suggest their historical peak, or 110% of predicted capacity (whichever is higher)
                # This makes it personalized - if they've done 45h before, we know they can do it
                achievable_stretch = max(
                    min(historical_max, total_available * 1.2),  # Cap at 20% above predicted
                    total_available * 1.05  # Minimum 5% stretch
                )
                achievable_stretch = round(achievable_stretch, 1)
                
                # Calculate how realistic this stretch is based on their history
                if target_hours <= achievable_stretch:
                    stretch_confidence = 'high'
                    stretch_message = f"You've achieved similar hours before (peak: {historical_max:.1f}h)"
                elif target_hours <= historical_max:
                    stretch_confidence = 'medium'
                    stretch_message = f"Possible but challenging - your peak was {historical_max:.1f}h"
                else:
                    stretch_confidence = 'low'
                    stretch_message = f"This exceeds your historical peak ({historical_max:.1f}h) - consider breaking into smaller periods"
                
                adjustment_suggestion = {
                    'original_target': target_hours,
                    'predicted_capacity': round(total_available, 1),
                    'suggested_target': achievable_stretch,
                    'stretch_required': round(stretch_amount, 1),
                    'stretch_percentage': round(stretch_percentage, 1),
                    'historical_peak': round(historical_max, 1),
                    'historical_average': round(historical_avg, 1),
                    'stretch_confidence': stretch_confidence,
                    'reason': f'Your target ({target_hours}h) is {stretch_percentage:.0f}% above predicted capacity ({total_available:.1f}h). {stretch_message}. Suggested: {achievable_stretch}h for focused effort, or {total_available:.1f}h for sustainable pace.',
                    'confidence': round(feasibility_score, 1),
                    'type': 'stretch_goal'
                }
                
                # Use suggested achievable stretch for allocation
                actual_allocation_target = min(achievable_stretch, target_hours)
                
            elif target_hours < total_available * 0.7:
                # User target is conservative - show they have more capacity
                historical_avg = historical_stats.get('avg_weekly_hours', total_available)
                suggested = round(min(total_available * 0.9, historical_avg * 1.1), 1)
                
                adjustment_suggestion = {
                    'original_target': target_hours,
                    'predicted_capacity': round(total_available, 1),
                    'suggested_target': suggested,
                    'historical_average': round(historical_avg, 1),
                    'reason': f'You have {total_available:.1f}h capacity available. Based on your average ({historical_avg:.1f}h), you could comfortably target {suggested}h.',
                    'confidence': round(feasibility_score, 1),
                    'type': 'conservative'
                }
                actual_allocation_target = target_hours  # Keep their conservative target
            
            # Generate schedule with actual allocation target
            schedule = self._allocate_hours_smart(
                daily_availability, 
                actual_allocation_target,
                forecast['predictions'],
                start
            )
            
            # Time-of-day recommendations from historical patterns
            best_hours = self._get_best_working_hours(user_id, start_date, end_date)
            
            # Generate warnings
            warnings = self._generate_warnings(forecast['predictions'], target_hours, is_feasible)
            
            return {
                'status': 'success',
                'user_id': user_id,
                'plan_start_date': start_date,
                'plan_end_date': end_date,
                'target_hours': target_hours,
                'adjusted_target': adjusted_target if adjustment_suggestion else None,
                'target_adjustment': adjustment_suggestion,
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
    
    def _get_historical_performance_stats(self, user_id: str, days_count: int):
        """
        Get user's historical performance statistics to determine realistic targets
        
        Returns:
            dict: Historical stats including max, avg, and variance of weekly hours
        """
        try:
            from config.database import get_session
            from sqlalchemy import text
            from datetime import datetime, timedelta
            
            session = get_session()
            
            # Get last 90 days of data to calculate historical patterns
            cutoff_date = datetime.now().date() - timedelta(days=90)
            
            # Query to calculate weekly working hours from historical data
            # We estimate working hours from focus time and idle time
            query = text("""
                WITH daily_hours AS (
                    SELECT 
                        date,
                        -- Estimate productive hours: (8hr workday - idle) * (focus/60 as productivity factor)
                        GREATEST(0, 
                            (480 - COALESCE((idle->>'idle_time_min_total')::numeric, 30)) / 60 
                            * (COALESCE((focus_streak->>'global_focus_streak_max_min')::numeric, 40) / 60)
                        ) as estimated_hours
                    FROM daily_metrics
                    WHERE user_id = :user_id
                        AND date >= :cutoff_date
                        AND is_synthetic = FALSE
                ),
                weekly_totals AS (
                    SELECT 
                        date_trunc('week', date) as week_start,
                        SUM(estimated_hours) as weekly_hours,
                        COUNT(*) as days_worked
                    FROM daily_hours
                    WHERE estimated_hours > 0
                    GROUP BY date_trunc('week', date)
                    HAVING COUNT(*) >= 3  -- Only count weeks with at least 3 working days
                )
                SELECT 
                    MAX(weekly_hours) as max_weekly,
                    AVG(weekly_hours) as avg_weekly,
                    STDDEV(weekly_hours) as stddev_weekly,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY weekly_hours) as p75_weekly,
                    COUNT(*) as weeks_count
                FROM weekly_totals
            """)
            
            result = session.execute(query, {
                'user_id': user_id,
                'cutoff_date': cutoff_date
            }).fetchone()
            
            session.close()
            
            if result and result[0] is not None:
                # Scale to the requested period (if not a full week)
                scale_factor = days_count / 7.0
                
                return {
                    'max_weekly_hours': float(result[0] or 0) * scale_factor,
                    'avg_weekly_hours': float(result[1] or 0) * scale_factor,
                    'stddev_weekly_hours': float(result[2] or 0) * scale_factor,
                    'p75_weekly_hours': float(result[3] or 0) * scale_factor,  # 75th percentile (good weeks)
                    'weeks_analyzed': int(result[4] or 0)
                }
            else:
                # No historical data - use conservative defaults based on predictions
                return {
                    'max_weekly_hours': 0,
                    'avg_weekly_hours': 0,
                    'stddev_weekly_hours': 0,
                    'p75_weekly_hours': 0,
                    'weeks_analyzed': 0
                }
                
        except Exception as e:
            # Fallback to safe defaults if query fails
            return {
                'max_weekly_hours': 0,
                'avg_weekly_hours': 0,
                'stddev_weekly_hours': 0,
                'p75_weekly_hours': 0,
                'weeks_analyzed': 0
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
    
    def _allocate_hours_smart(self, daily_availability, target_hours, predictions, start_date):
        """
        Smart allocation with task recommendations and time windows
        
        Args:
            daily_availability: List of available hours per day
            target_hours: Target hours to allocate
            predictions: ML predictions for each day
            start_date: Starting date object
        """
        schedule = []
        total_available = sum(daily_availability)
        
        if total_available == 0:
            return schedule
        
        for i, (available, pred) in enumerate(zip(daily_availability, predictions)):
            # Calculate date for this day
            current_date = start_date + timedelta(days=i)
            
            # Allocate proportionally
            allocated = (available / total_available) * target_hours
            allocated = min(allocated, available)  # Don't exceed availability
            
            # Get productivity classification
            productivity_level = self._classify_productivity(pred)
            
            # Get time-of-day recommendations from historical patterns for this single day
            current_date_str = current_date.isoformat()
            time_recommendation = self.time_pattern_service.get_recommended_schedule_times(
                pred.get('user_id', ''), 
                current_date_str,
                current_date_str  # Same day for single-day recommendation
            )
            
            # Extract the recommendation for this specific day
            day_time_info = None
            if time_recommendation and len(time_recommendation) > 0:
                day_time_info = time_recommendation[0]  # First (and only) day
            
            # Generate task recommendations based on predicted metrics
            task_recommendations = self._generate_task_recommendations(pred, productivity_level)
            
            # Format time windows
            time_windows = []
            if day_time_info and day_time_info.get('session_count', 0) > 0:
                # Has historical pattern data
                time_windows.append({
                    'time_range': day_time_info.get('time_window', 'Flexible'),
                    'period': day_time_info.get('period', 'flexible'),
                    'confidence': min(day_time_info.get('session_count', 0) * 10, 100),
                    'reason': day_time_info.get('reasoning', '')
                })
            
            day_info = {
                'date': pred.get('date'),
                'day_name': current_date.strftime('%A'),
                'allocated_hours': round(allocated, 1),
                'available_hours': round(available, 1),
                'productivity_level': productivity_level,
                'recommended_time_windows': time_windows,
                'task_recommendations': task_recommendations,
                'metrics_summary': {
                    'predicted_focus_min': round(pred.get('focus_streak_longest_global', 0), 1),
                    'predicted_file_switches_per_min': round(pred.get('file_switch_avg_rate', 0), 2),
                    'predicted_errors_per_kloc': round(pred.get('diagnostics_avg_density', 0), 1)
                }
            }
            
            schedule.append(day_info)
        
        return schedule
    
    def _generate_task_recommendations(self, prediction, productivity_level):
        """
        Generate intelligent task recommendations based on predictions
        
        Args:
            prediction: Day's ML predictions
            productivity_level: 'high', 'medium', or 'low'
            
        Returns:
            List of task recommendations with reasoning
        """
        recommendations = []
        
        focus = prediction.get('focus_streak_longest_global', 0)
        file_switch = prediction.get('file_switch_avg_rate', 0)
        errors = prediction.get('diagnostics_avg_density', 0)
        edits = prediction.get('edits_avg_rate', 0)
        commits = prediction.get('commits_count', 0)
        idle = prediction.get('idle_distraction_time', 0)
        
        # Deep work recommendation (high focus, low switching)
        if productivity_level == 'high':
            recommendations.append({
                'task_type': f'Complex Problem-Solving & Architecture Design',
                'priority': 'high',
                'description': f'Focus: {focus:.0f}min | Switch Rate: {file_switch:.2f}/min | Errors: {errors:.1f}/kloc | Edits: {edits:.1f}/min',
                'reason': f'High focus capability ({focus:.0f}min) with low context-switching ({file_switch:.2f}/min) creates optimal conditions for deep concentration. Low error rate ({errors:.1f}/kloc) indicates strong analytical state.',
                'time_allocation': '60-70% of allocated hours',
                'metrics': {'focus': focus, 'file_switch': file_switch, 'errors': errors, 'edits': edits}
            })
            recommendations.append({
                'task_type': f'Detailed Code Reviews & Refactoring',
                'priority': 'medium',
                'description': f'Error Rate: {errors:.1f}/kloc | Edit Rate: {edits:.1f}/min | Commits: {commits:.0f}',
                'reason': f'Low predicted error density ({errors:.1f}/kloc) and steady edit rate ({edits:.1f}/min) suggest good pattern recognition for code quality assessment.',
                'time_allocation': '20-30% of allocated hours',
                'metrics': {'errors': errors, 'edits': edits, 'commits': commits}
            })
        
        # Medium productivity - balanced tasks
        elif productivity_level == 'medium':
            recommendations.append({
                'task_type': f'Feature Implementation & Bug Fixes',
                'priority': 'high',
                'description': f'Focus: {focus:.0f}min | Switch Rate: {file_switch:.2f}/min | Edits: {edits:.1f}/min | Errors: {errors:.1f}/kloc',
                'reason': f'Moderate focus duration ({focus:.0f}min) with balanced switching rate ({file_switch:.2f}/min) suitable for standard development. Edit rate ({edits:.1f}/min) indicates steady coding pace.',
                'time_allocation': '50-60% of allocated hours',
                'metrics': {'focus': focus, 'file_switch': file_switch, 'edits': edits, 'errors': errors}
            })
            recommendations.append({
                'task_type': f'Code Documentation & Technical Writing',
                'priority': 'medium',
                'description': f'Focus: {focus:.0f}min | Idle Time: {idle:.0f}min | Edits: {edits:.1f}/min',
                'reason': f'Focus level ({focus:.0f}min) sufficient for writing tasks. Predicted idle time ({idle:.0f}min) suggests natural breaks for organizing thoughts.',
                'time_allocation': '20-30% of allocated hours',
                'metrics': {'focus': focus, 'idle': idle, 'edits': edits}
            })
            recommendations.append({
                'task_type': f'Team Collaboration & Pair Programming',
                'priority': 'medium',
                'description': f'Switch Rate: {file_switch:.2f}/min | Focus: {focus:.0f}min | Commits: {commits:.0f}',
                'reason': f'File-switching rate ({file_switch:.2f}/min) indicates comfort with context changes needed for collaboration. Focus duration ({focus:.0f}min) allows for productive pairing sessions.',
                'time_allocation': '10-20% of allocated hours',
                'metrics': {'file_switch': file_switch, 'focus': focus, 'commits': commits}
            })
        
        # Low productivity - light tasks
        else:
            recommendations.append({
                'task_type': f'Bug Triage & Code Cleanup',
                'priority': 'high',
                'description': f'Focus: {focus:.0f}min | Switch Rate: {file_switch:.2f}/min | Idle: {idle:.0f}min',
                'reason': f'Lower focus capacity ({focus:.0f}min) and higher switching rate ({file_switch:.2f}/min) favor shorter, less demanding tasks. Idle time ({idle:.0f}min) suggests frequent context breaks.',
                'time_allocation': '40-50% of allocated hours',
                'metrics': {'focus': focus, 'file_switch': file_switch, 'idle': idle}
            })
            recommendations.append({
                'task_type': f'Documentation Reading & Research',
                'priority': 'medium',
                'description': f'Focus: {focus:.0f}min | Edits: {edits:.1f}/min | Idle: {idle:.0f}min',
                'reason': f'Focus duration ({focus:.0f}min) suitable for learning without pressure. Low edit rate ({edits:.1f}/min) indicates more reading than coding - ideal for research.',
                'time_allocation': '30-40% of allocated hours',
                'metrics': {'focus': focus, 'edits': edits, 'idle': idle}
            })
            recommendations.append({
                'task_type': f'Sprint Planning & Task Organization',
                'priority': 'low',
                'description': f'Commits: {commits:.0f} | Switch Rate: {file_switch:.2f}/min',
                'reason': f'Organizational tasks that don\'t require peak focus. Switching rate ({file_switch:.2f}/min) shows you can handle task-switching during planning.',
                'time_allocation': '10-20% of allocated hours',
                'metrics': {'commits': commits, 'file_switch': file_switch}
            })
        
        # Special recommendations based on specific metrics
        if errors > 6:
            recommendations.insert(0, {
                'task_type': 'Debugging Time Buffer - Critical',
                'priority': 'critical',
                'description': f'Error Density: {errors:.1f}/kloc (Threshold: 6.0/kloc) | Focus: {focus:.0f}min',
                'reason': f'ALERT: High error density predicted ({errors:.1f}/KLOC exceeds 6.0 threshold). Historical data shows days with >6 errors/kloc require 30% additional time for debugging and troubleshooting.',
                'time_allocation': 'Add 30% buffer to all estimates',
                'metrics': {'errors': errors, 'focus': focus, 'threshold': 6.0}
            })
        
        if commits > 2:
            recommendations.append({
                'task_type': 'Git Commit Hygiene',
                'priority': 'low',
                'description': f'Expected Commits: {commits:.0f} | Edit Rate: {edits:.1f}/min',
                'reason': f'High commit activity predicted ({commits:.0f} commits). Ensure atomic commits with clear messages. Edit rate ({edits:.1f}/min) suggests steady development requiring frequent commits.',
                'time_allocation': '5-10 min per commit',
                'metrics': {'commits': commits, 'edits': edits}
            })
        
        return recommendations
    
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
    
    def _get_best_working_hours(self, user_id: str, start_date: str, end_date: str):
        """Get best working hours from historical patterns for each day"""
        try:
            # Get time windows from historical data for each day in the range
            daily_recommendations = self.time_pattern_service.get_recommended_schedule_times(
                user_id, start_date, end_date
            )
            
            if not daily_recommendations:
                # Fallback to general recommendation
                return {
                    'recommended_time': 'morning',
                    'hours': '9AM - 12PM',
                    'reason': 'No historical data available - general recommendation for morning focus',
                    'daily_windows': []
                }
            
            # Format daily windows for display
            daily_windows = []
            total_sessions = 0
            total_focus = 0
            
            for rec in daily_recommendations:
                if rec.get('session_count', 0) > 0:
                    daily_windows.append({
                        'day': rec.get('day', 'Unknown'),
                        'date': rec.get('date', ''),
                        'time_range': rec.get('time_window', 'No pattern'),
                        'avg_focus_min': rec.get('avg_focus_duration', 0),
                        'session_count': rec.get('session_count', 0),
                        'reasoning': rec.get('reasoning', '')
                    })
                    total_sessions += rec.get('session_count', 0)
                    total_focus += rec.get('avg_focus_duration', 0)
            
            # Determine overall best time recommendation
            if daily_windows:
                # Find the day with highest average focus
                most_productive = max(daily_windows, key=lambda x: x['avg_focus_min'])
                avg_focus_overall = total_focus / len(daily_windows) if daily_windows else 0
                
                return {
                    'recommended_time': most_productive['day'],
                    'hours': most_productive['time_range'],
                    'reason': f"Based on {total_sessions} historical sessions. {most_productive['day']} shows strongest focus pattern ({most_productive['avg_focus_min']:.0f}min avg)",
                    'daily_windows': daily_windows
                }
            
            return {
                'recommended_time': 'flexible',
                'hours': 'Adjust based on your energy',
                'reason': 'Limited historical pattern data available',
                'daily_windows': []
            }
            
        except Exception as e:
            print(f"Error in _get_best_working_hours: {str(e)}")
            # Fallback on error
            return {
                'recommended_time': 'morning',
                'hours': '9AM - 12PM',
                'reason': 'General recommendation (error retrieving historical data)',
                'daily_windows': []
            }
    
    def _recommend_work_windows(self, predictions):
        """Recommend best time-of-day for work (fallback method)"""
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
            total_available = sum(self._calculate_daily_availability(predictions))
            warnings.append({
                'type': 'target_adjustment',
                'severity': 'info',
                'message': f'Target adjusted: {target_hours}h requested → {round(total_available * 0.95, 1)}h recommended based on predictions. You can still aim for {target_hours}h but expect to stretch capacity.',
                'action': 'Consider reducing scope or extending timeline'
            })
        
        # Check for high file-switching days
        for pred in predictions:
            file_switch = pred.get('file_switch_avg_rate', 0)
            if file_switch > 2.0:
                warnings.append({
                    'type': 'focus_risk',
                    'severity': 'medium',
                    'date': pred.get('date'),
                    'message': f'High context-switching predicted ({file_switch:.1f} switches/min) - focus risk on this day',
                    'action': 'Block time for single-task focus, minimize distractions'
                })
        
        # Check for low focus streak days
        for pred in predictions:
            focus = pred.get('focus_streak_longest_global', 0)
            if focus < 25:
                warnings.append({
                    'type': 'low_focus',
                    'severity': 'medium',
                    'date': pred.get('date'),
                    'message': f'Low focus streak predicted ({focus:.0f} min) - consider lighter tasks or shorter work blocks',
                    'action': 'Schedule breaks every 25min (Pomodoro), avoid deep work'
                })
        
        # Check for high error density
        for pred in predictions:
            errors = pred.get('diagnostics_avg_density', 0)
            if errors > 8:
                warnings.append({
                    'type': 'high_errors',
                    'severity': 'low',
                    'date': pred.get('date'),
                    'message': f'High error density predicted ({errors:.1f}/KLOC) - allocate extra debugging time',
                    'action': 'Add 30% time buffer, consider pair programming'
                })
        
        return warnings
