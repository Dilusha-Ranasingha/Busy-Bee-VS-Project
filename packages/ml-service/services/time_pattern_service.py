import psycopg2
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import os

class TimePatternService:
    """Analyzes time-of-day productivity patterns from focus_streaks table"""
    
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '5432')),
            'database': os.getenv('DB_NAME', 'productivity_db'),
            'user': os.getenv('DB_USER', 'postgres'),
            'password': os.getenv('DB_PASSWORD', 'postgres')
        }
    
    def get_best_time_windows(self, user_id: str, days: int = 90) -> Dict[int, List[Dict]]:
        """
        Analyze focus_streaks to identify best time-of-day windows per weekday
        
        Args:
            user_id: User identifier
            days: Number of historical days to analyze (default 90)
            
        Returns:
            Dict mapping day_of_week (0-6) to list of optimal time windows
            Example: {
                0: [{'hour_start': 20, 'hour_end': 22, 'avg_focus': 68, 'sessions': 12}],
                5: [{'hour_start': 13, 'hour_end': 15, 'avg_focus': 42, 'sessions': 8}]
            }
        """
        conn = None
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Query to get hour-based focus patterns grouped by weekday
            query = """
                SELECT 
                    EXTRACT(DOW FROM start_ts)::INTEGER AS day_of_week,
                    EXTRACT(HOUR FROM start_ts)::INTEGER AS start_hour,
                    EXTRACT(HOUR FROM end_ts)::INTEGER AS end_hour,
                    AVG(duration_min) AS avg_focus_duration,
                    COUNT(*) AS session_count,
                    MAX(duration_min) AS max_focus
                FROM focus_streaks
                WHERE user_id = %s
                    AND type = 'global'
                    AND start_ts >= NOW() - INTERVAL '%s days'
                    AND duration_min >= 15  -- Only consider meaningful focus sessions
                GROUP BY day_of_week, start_hour, end_hour
                HAVING COUNT(*) >= 2  -- At least 2 sessions to establish pattern
                ORDER BY day_of_week, avg_focus_duration DESC
            """
            
            cursor.execute(query, (user_id, days))
            results = cursor.fetchall()
            
            # Organize by day of week
            patterns_by_day = {}
            for row in results:
                day_of_week, start_hour, end_hour, avg_focus, count, max_focus = row
                
                if day_of_week not in patterns_by_day:
                    patterns_by_day[day_of_week] = []
                
                patterns_by_day[day_of_week].append({
                    'hour_start': start_hour,
                    'hour_end': end_hour if end_hour > start_hour else start_hour + 1,
                    'avg_focus': round(float(avg_focus), 1),
                    'max_focus': round(float(max_focus), 1),
                    'sessions': int(count)
                })
            
            # Get top 2 time windows per day (best productivity times)
            best_windows = {}
            for day, windows in patterns_by_day.items():
                # Sort by average focus duration and take top 2
                sorted_windows = sorted(windows, key=lambda x: x['avg_focus'], reverse=True)
                best_windows[int(day)] = sorted_windows[:2]
            
            cursor.close()
            return best_windows
            
        except Exception as e:
            print(f"Error fetching time patterns: {str(e)}")
            return {}
        finally:
            if conn:
                conn.close()
    
    def format_time_window(self, hour_start: int, hour_end: int) -> str:
        """
        Format hour range into readable time window
        
        Args:
            hour_start: Starting hour (0-23)
            hour_end: Ending hour (0-23)
            
        Returns:
            Formatted string like "8-10am", "1-3pm", "8-10pm"
        """
        def format_hour(h: int) -> str:
            if h == 0:
                return "12am"
            elif h < 12:
                return f"{h}am"
            elif h == 12:
                return "12pm"
            else:
                return f"{h-12}pm"
        
        # Determine period
        if hour_start < 12 and hour_end <= 12:
            period = "morning"
        elif hour_start >= 12 and hour_end <= 17:
            period = "afternoon"
        elif hour_start >= 17 or hour_end >= 17:
            period = "evening/night"
        else:
            period = "day"
        
        # Format range
        start_str = format_hour(hour_start)
        end_str = format_hour(hour_end)
        
        return f"{start_str}-{end_str}", period
    
    def get_recommended_schedule_times(self, user_id: str, start_date: str, end_date: str) -> List[Dict]:
        """
        Get specific time recommendations for each day in the date range
        
        Args:
            user_id: User identifier
            start_date: Start date string
            end_date: End date string
            
        Returns:
            List of dicts with daily time recommendations
        """
        from datetime import datetime, timedelta
        
        # Parse dates
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get historical best windows per weekday
        best_windows = self.get_best_time_windows(user_id)
        
        daily_recommendations = []
        current_date = start
        
        while current_date <= end:
            day_of_week = current_date.weekday()  # 0=Monday, 6=Sunday
            day_name = current_date.strftime('%A')
            
            # Check if we have historical pattern for this weekday
            if day_of_week in best_windows and best_windows[day_of_week]:
                # Get the best window for this day
                best_window = best_windows[day_of_week][0]  # Top window
                time_str, period = self.format_time_window(
                    best_window['hour_start'], 
                    best_window['hour_end']
                )
                
                daily_recommendations.append({
                    'day': day_name,
                    'date': current_date.strftime('%Y-%m-%d'),
                    'time_window': time_str,
                    'period': period,
                    'avg_focus_duration': best_window['avg_focus'],
                    'session_count': best_window['sessions'],
                    'reasoning': f"Based on {best_window['sessions']} past sessions averaging {best_window['avg_focus']:.0f}min focus"
                })
            else:
                # No pattern for this day
                daily_recommendations.append({
                    'day': day_name,
                    'date': current_date.strftime('%Y-%m-%d'),
                    'time_window': 'No pattern',
                    'period': 'flexible',
                    'avg_focus_duration': 0,
                    'session_count': 0,
                    'reasoning': 'No historical data available for this weekday'
                })
            
            current_date += timedelta(days=1)
        
        return daily_recommendations
