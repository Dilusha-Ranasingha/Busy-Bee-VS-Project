"""
Synthetic Data Generator for ML Training

Generates realistic daily_metrics data with patterns for testing XGBoost forecasting.
Creates data for 2-4 test users over 180-365 days with:
- Weekly cycles (weekday vs weekend productivity)
- Monthly trends (burnout, recovery, stable periods)
- Random noise and anomalies (10-15% anomaly days)
"""

import psycopg2
from psycopg2.extras import Json
from datetime import datetime, timedelta
import numpy as np
import os
from dotenv import load_dotenv

# Load environment
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/busy_bee')

class SyntheticDataGenerator:
    """Generate realistic productivity data for ML training"""
    
    def __init__(self):
        self.conn = None
        self.test_users = [
            'test_user_high_performer',
            'test_user_variable',
            'test_user_improving',
            'test_user_declining'
        ]
    
    def connect(self):
        """Connect to PostgreSQL"""
        self.conn = psycopg2.connect(DATABASE_URL)
        print(f"✓ Connected to database")
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
    
    def generate_data(self, days=270, anomaly_rate=0.12):
        """
        Generate synthetic data for all test users
        
        Args:
            days: Number of days to generate (default 270 for ~9 months)
            anomaly_rate: Percentage of anomaly days (default 0.12 = 12%)
        """
        self.connect()
        
        try:
            for user_id in self.test_users:
                print(f"\n Generating data for {user_id}...")
                self._generate_user_data(user_id, days, anomaly_rate)
                print(f"  ✓ Generated {days} days of data")
            
            self.conn.commit()
            print(f"\n✓ Successfully generated data for {len(self.test_users)} users")
        
        except Exception as e:
            self.conn.rollback()
            print(f"✗ Error: {e}")
            raise
        
        finally:
            self.close()
    
    def _generate_user_data(self, user_id, days, anomaly_rate):
        """Generate data for a single user"""
        cursor = self.conn.cursor()
        
        # User personality patterns
        patterns = self._get_user_pattern(user_id)
        
        start_date = datetime.now().date() - timedelta(days=days)
        
        for day_num in range(days):
            current_date = start_date + timedelta(days=day_num)
            
            # Determine if this is an anomaly day
            is_anomaly = np.random.random() < anomaly_rate
            
            # Generate metrics for this day
            metrics = self._generate_day_metrics(
                user_id, current_date, day_num, days, patterns, is_anomaly
            )
            
            # Insert into database
            cursor.execute("""
                INSERT INTO daily_metrics (
                    user_id, date, 
                    file_switch, focus_streak, edits_per_min, 
                    saves_to_edit_ratio, diagnostics_per_kloc, error_fix,
                    tasks, commits, idle,
                    is_synthetic
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (user_id, date) DO UPDATE SET
                    file_switch = EXCLUDED.file_switch,
                    focus_streak = EXCLUDED.focus_streak,
                    edits_per_min = EXCLUDED.edits_per_min,
                    saves_to_edit_ratio = EXCLUDED.saves_to_edit_ratio,
                    diagnostics_per_kloc = EXCLUDED.diagnostics_per_kloc,
                    error_fix = EXCLUDED.error_fix,
                    tasks = EXCLUDED.tasks,
                    commits = EXCLUDED.commits,
                    idle = EXCLUDED.idle,
                    is_synthetic = TRUE
            """, (
                user_id, current_date,
                Json(metrics['file_switch']),
                Json(metrics['focus_streak']),
                Json(metrics['edits_per_min']),
                Json(metrics['saves_to_edit_ratio']),
                Json(metrics['diagnostics_per_kloc']),
                Json(metrics['error_fix']),
                Json(metrics['tasks']),
                Json(metrics['commits']),
                Json(metrics['idle']),
                True  # is_synthetic
            ))
    
    def _get_user_pattern(self, user_id):
        """Get personality pattern for user type"""
        patterns = {
            'test_user_high_performer': {
                'base_focus': 55,
                'base_file_switch': 1.2,
                'base_edits': 18,
                'base_errors': 3,
                'trend': 'stable',
                'variability': 0.15
            },
            'test_user_variable': {
                'base_focus': 35,
                'base_file_switch': 2.0,
                'base_edits': 12,
                'base_errors': 6,
                'trend': 'variable',
                'variability': 0.35
            },
            'test_user_improving': {
                'base_focus': 25,
                'base_file_switch': 2.5,
                'base_edits': 10,
                'base_errors': 8,
                'trend': 'improving',
                'variability': 0.20
            },
            'test_user_declining': {
                'base_focus': 45,
                'base_file_switch': 1.5,
                'base_edits': 16,
                'base_errors': 4,
                'trend': 'declining',
                'variability': 0.18
            }
        }
        return patterns.get(user_id, patterns['test_user_variable'])
    
    def _generate_day_metrics(self, user_id, date, day_num, total_days, patterns, is_anomaly):
        """Generate all KPI metrics for a single day"""
        
        # Day of week effect
        day_of_week = date.weekday()
        is_weekend = day_of_week >= 5
        weekend_factor = 0.6 if is_weekend else 1.0
        
        # Weekly cycle (energy dips mid-week)
        weekly_cycle = 1.0 - 0.15 * np.sin(2 * np.pi * day_of_week / 7)
        
        # Monthly trend (simulate burnout/recovery cycles)
        monthly_cycle = 1.0 + 0.2 * np.sin(2 * np.pi * day_num / 30)
        
        # Long-term trend based on user pattern
        if patterns['trend'] == 'improving':
            trend_factor = 0.7 + 0.6 * (day_num / total_days)  # Improve over time
        elif patterns['trend'] == 'declining':
            trend_factor = 1.3 - 0.6 * (day_num / total_days)  # Decline over time
        else:
            trend_factor = 1.0  # Stable or variable
        
        # Anomaly effect
        if is_anomaly:
            anomaly_factor = np.random.uniform(0.3, 0.7)  # Significant drop
        else:
            anomaly_factor = 1.0
        
        # Combined factor
        combined_factor = weekend_factor * weekly_cycle * monthly_cycle * trend_factor * anomaly_factor
        
        # Random noise
        noise = lambda base, var: max(0, np.random.normal(base * combined_factor, base * var))
        
        # Generate each KPI category
        metrics = {}
        
        # 1. File Switch
        avg_rate = noise(patterns['base_file_switch'], patterns['variability'])
        metrics['file_switch'] = {
            'avg_rate_per_min': round(avg_rate, 2),
            'p95_rate_per_min': round(avg_rate * 1.5, 2),
            'total_activations': int(noise(avg_rate * 240, 0.2))  # Assume 4-hour sessions
        }
        
        # 2. Focus Streak
        base_focus = patterns['base_focus']
        longest_global = noise(base_focus, patterns['variability'])
        metrics['focus_streak'] = {
            'longest_global_min': round(longest_global, 1),
            'longest_per_file_min': round(longest_global * 0.8, 1)
        }
        
        # 3. Edits per minute
        base_edits = patterns['base_edits']
        avg_edits = noise(base_edits, patterns['variability'])
        metrics['edits_per_min'] = {
            'avg_edits_per_min': round(avg_edits, 2),
            'p95_edits_per_min': round(avg_edits * 1.8, 2),
            'typing_burstiness_index': round(np.random.uniform(0.5, 0.9), 2),
            'total_paste_ops': int(noise(20, 0.5)),
            'total_active_time_min': round(noise(240, 0.3), 1)
        }
        
        # 4. Save to edit ratio
        metrics['saves_to_edit_ratio'] = {
            'saves_manual': int(noise(30, 0.4)),
            'overall_efficiency': round(np.random.uniform(0.03, 0.08), 3)
        }
        
        # 5. Diagnostics per KLOC
        base_errors = patterns['base_errors']
        avg_density = noise(base_errors, patterns['variability'])
        metrics['diagnostics_per_kloc'] = {
            'avg_density_per_kloc': round(avg_density, 2),
            'peak_density_per_kloc': round(avg_density * 1.5, 2)
        }
        
        # 6. Error fix
        errors_resolved = int(noise(base_errors * 2, 0.4))
        metrics['error_fix'] = {
            'errors_resolved': errors_resolved,
            'median_fix_time_sec': int(noise(180, 0.5))  # ~3 minutes base
        }
        
        # 7. Tasks (tests/builds)
        total_runs = int(noise(15, 0.5))
        success_rate = np.random.uniform(0.65, 0.95) * combined_factor
        metrics['tasks'] = {
            'test_runs': int(total_runs * 0.6),
            'build_runs': int(total_runs * 0.4),
            'success_rate': round(min(success_rate, 1.0), 2)
        }
        
        # 8. Commits
        commits = int(noise(4, 0.6))
        metrics['commits'] = {
            'commits_count': commits,
            'cadence_per_hour': round(commits / 8.0, 2) if not is_weekend else 0
        }
        
        # 9. Idle time
        base_idle = 45 / combined_factor  # Inverse relationship
        metrics['idle'] = {
            'distraction_time_min': round(noise(base_idle, 0.4), 1),
            'idle_periods': int(noise(8, 0.5))
        }
        
        return metrics
    
    def clear_synthetic_data(self):
        """Remove all synthetic data from database"""
        self.connect()
        
        try:
            cursor = self.conn.cursor()
            cursor.execute("DELETE FROM daily_metrics WHERE is_synthetic = TRUE")
            deleted = cursor.rowcount
            self.conn.commit()
            print(f"✓ Deleted {deleted} synthetic records")
        
        except Exception as e:
            self.conn.rollback()
            print(f"✗ Error: {e}")
            raise
        
        finally:
            self.close()


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate synthetic productivity data')
    parser.add_argument('--days', type=int, default=270, help='Number of days to generate (default: 270)')
    parser.add_argument('--anomaly-rate', type=float, default=0.12, help='Anomaly rate 0-1 (default: 0.12)')
    parser.add_argument('--clear', action='store_true', help='Clear existing synthetic data first')
    parser.add_argument('--user-id', type=str, help='Generate data for a specific user ID (e.g., your GitHub user ID)')
    
    args = parser.parse_args()
    
    generator = SyntheticDataGenerator()
    
    if args.clear:
        print("Clearing existing synthetic data...")
        generator.clear_synthetic_data()
        print()
    
    # If user_id is provided, generate only for that user
    if args.user_id:
        print(f"Generating {args.days} days of synthetic data for user: {args.user_id}...")
        print(f"Anomaly rate: {args.anomaly_rate * 100:.1f}%\n")
        generator.connect()
        try:
            generator._generate_user_data(args.user_id, args.days, args.anomaly_rate)
            generator.conn.commit()
            print(f"\n✓ Generated {args.days} days of data for {args.user_id}")
        except Exception as e:
            generator.conn.rollback()
            print(f"✗ Error: {e}")
            raise
        finally:
            generator.close()
    else:
        print(f"Generating {args.days} days of synthetic data...")
        print(f"Anomaly rate: {args.anomaly_rate * 100:.1f}%")
        print(f"Test users: {len(generator.test_users)}\n")
        generator.generate_data(days=args.days, anomaly_rate=args.anomaly_rate)
    
    print(f"\n✅ Data generation complete!")
    print(f"\nNext steps:")
    print(f"1. Train ML models: POST http://localhost:5001/api/ml/train")
    print(f"2. Get forecast: GET http://localhost:5001/api/ml/forecast/<user_id>")


if __name__ == '__main__':
    main()
