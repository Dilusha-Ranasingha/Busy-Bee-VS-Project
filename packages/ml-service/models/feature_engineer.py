import pandas as pd
from sqlalchemy import text
from config.database import get_session, close_session
from datetime import datetime, timedelta

class FeatureEngineer:
    """Feature engineering from daily_metrics JSONB columns"""
    
    def fetch_user_data(self, user_id: str, days: int = 90):
        """
        Fetch user's daily metrics from PostgreSQL
        
        Args:
            user_id: User identifier
            days: Number of days of historical data
            
        Returns:
            DataFrame with daily metrics
        """
        session = get_session()
        
        try:
            cutoff_date = datetime.now().date() - timedelta(days=days)
            
            query = text("""
                SELECT 
                    user_id,
                    date,
                    file_switch,
                    focus_streak,
                    edits_per_min,
                    saves_to_edit_ratio,
                    diagnostics_per_kloc,
                    error_fix,
                    tasks,
                    commits,
                    idle
                FROM daily_metrics
                WHERE user_id = :user_id
                    AND date >= :cutoff_date
                    AND is_synthetic = FALSE
                ORDER BY date ASC
            """)
            
            result = session.execute(query, {'user_id': user_id, 'cutoff_date': cutoff_date})
            rows = result.fetchall()
            
            if not rows:
                # Try including synthetic data if no real data
                query_with_synthetic = text("""
                    SELECT 
                        user_id,
                        date,
                        file_switch,
                        focus_streak,
                        edits_per_min,
                        saves_to_edit_ratio,
                        diagnostics_per_kloc,
                        error_fix,
                        tasks,
                        commits,
                        idle
                    FROM daily_metrics
                    WHERE user_id = :user_id
                        AND date >= :cutoff_date
                    ORDER BY date ASC
                """)
                result = session.execute(query_with_synthetic, {'user_id': user_id, 'cutoff_date': cutoff_date})
                rows = result.fetchall()
            
            # Convert to DataFrame - SQLAlchemy 2.x compatible
            if rows:
                df = pd.DataFrame([row._mapping for row in rows])
            else:
                df = pd.DataFrame()
            
            return df
        
        finally:
            close_session(session)
    
    def prepare_features(self, df: pd.DataFrame):
        """
        Extract features from JSONB columns and create lag features
        
        Args:
            df: DataFrame with daily_metrics
            
        Returns:
            tuple: (features_df, targets_df)
        """
        if df.empty:
            return pd.DataFrame(), pd.DataFrame()
        
        # Extract features from JSONB
        features = pd.DataFrame()
        features['date'] = pd.to_datetime(df['date'])
        
        # File switch features
        features['file_switch_avg_rate'] = df['file_switch'].apply(lambda x: x.get('avg_rate_per_min', 0) if x else 0)
        features['file_switch_p95'] = df['file_switch'].apply(lambda x: x.get('p95_rate_per_min', 0) if x else 0)
        features['file_switch_activations'] = df['file_switch'].apply(lambda x: x.get('total_activations', 0) if x else 0)
        
        # Focus streak features
        features['focus_streak_longest_global'] = df['focus_streak'].apply(lambda x: x.get('longest_global_min', 0) if x else 0)
        features['focus_streak_longest_file'] = df['focus_streak'].apply(lambda x: x.get('longest_per_file_min', 0) if x else 0)
        
        # Edits per minute features
        features['edits_avg_rate'] = df['edits_per_min'].apply(lambda x: x.get('avg_edits_per_min', 0) if x else 0)
        features['edits_p95_rate'] = df['edits_per_min'].apply(lambda x: x.get('p95_edits_per_min', 0) if x else 0)
        features['typing_burstiness'] = df['edits_per_min'].apply(lambda x: x.get('typing_burstiness_index', 0) if x else 0)
        features['total_paste_ops'] = df['edits_per_min'].apply(lambda x: x.get('total_paste_ops', 0) if x else 0)
        features['total_active_time'] = df['edits_per_min'].apply(lambda x: x.get('total_active_time_min', 0) if x else 0)
        
        # Save to edit ratio features
        features['saves_manual'] = df['saves_to_edit_ratio'].apply(lambda x: x.get('saves_manual', 0) if x else 0)
        features['save_efficiency'] = df['saves_to_edit_ratio'].apply(lambda x: x.get('overall_efficiency', 0) if x else 0)
        
        # Diagnostics features
        features['diagnostics_avg_density'] = df['diagnostics_per_kloc'].apply(lambda x: x.get('avg_density_per_kloc', 0) if x else 0)
        features['diagnostics_peak_density'] = df['diagnostics_per_kloc'].apply(lambda x: x.get('peak_density_per_kloc', 0) if x else 0)
        
        # Error fix features
        features['errors_resolved'] = df['error_fix'].apply(lambda x: x.get('errors_resolved', 0) if x else 0)
        features['error_fix_median_time'] = df['error_fix'].apply(lambda x: x.get('median_fix_time_sec', 0) if x else 0)
        
        # Task features
        features['test_runs'] = df['tasks'].apply(lambda x: x.get('test_runs', 0) if x else 0)
        features['build_runs'] = df['tasks'].apply(lambda x: x.get('build_runs', 0) if x else 0)
        features['task_success_rate'] = df['tasks'].apply(lambda x: x.get('success_rate', 0) if x else 0)
        
        # Commit features
        features['commits_count'] = df['commits'].apply(lambda x: x.get('commits_count', 0) if x else 0)
        features['commit_cadence'] = df['commits'].apply(lambda x: x.get('cadence_per_hour', 0) if x else 0)
        
        # Idle features
        features['idle_distraction_time'] = df['idle'].apply(lambda x: x.get('distraction_time_min', 0) if x else 0)
        features['idle_periods'] = df['idle'].apply(lambda x: x.get('idle_periods', 0) if x else 0)
        
        # Temporal features
        features['day_of_week'] = features['date'].dt.dayofweek
        features['is_weekend'] = (features['day_of_week'] >= 5).astype(int)
        features['week_of_month'] = features['date'].dt.day // 7 + 1
        
        # Lag features (previous 7 days)
        lag_columns = [
            'focus_streak_longest_global', 'file_switch_avg_rate', 'edits_avg_rate',
            'diagnostics_avg_density', 'errors_resolved', 'commits_count'
        ]
        
        for col in lag_columns:
            for lag in [1, 3, 7]:
                features[f'{col}_lag_{lag}'] = features[col].shift(lag)
        
        # Rolling statistics (7-day window)
        for col in lag_columns:
            features[f'{col}_rolling_mean_7'] = features[col].rolling(window=7, min_periods=1).mean()
            features[f'{col}_rolling_std_7'] = features[col].rolling(window=7, min_periods=1).std()
        
        # Fill NaN values
        features = features.fillna(0)
        
        # Target is next day's values (for forecasting)
        targets = features[lag_columns].shift(-1)
        
        # Drop last row (no target available)
        features = features[:-1]
        targets = targets[:-1]
        
        return features, targets
    
    def extract_feature_names(self):
        """Get list of feature names for model training"""
        # List all feature columns (exclude date and target columns)
        return [
            # File switch
            'file_switch_avg_rate', 'file_switch_p95', 'file_switch_activations',
            # Focus
            'focus_streak_longest_global', 'focus_streak_longest_file',
            # Edits
            'edits_avg_rate', 'edits_p95_rate', 'typing_burstiness', 'total_paste_ops', 'total_active_time',
            # Saves
            'saves_manual', 'save_efficiency',
            # Diagnostics
            'diagnostics_avg_density', 'diagnostics_peak_density',
            # Errors
            'errors_resolved', 'error_fix_median_time',
            # Tasks
            'test_runs', 'build_runs', 'task_success_rate',
            # Commits
            'commits_count', 'commit_cadence',
            # Idle
            'idle_distraction_time', 'idle_periods',
            # Temporal
            'day_of_week', 'is_weekend', 'week_of_month'
        ]
