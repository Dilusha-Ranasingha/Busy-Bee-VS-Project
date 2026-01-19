// ML Forecasting Types

export interface ForecastPrediction {
  date: string;
  focus_streak_longest_global?: number;
  focus_streak_longest_file?: number;
  file_switch_avg_rate?: number;
  edits_avg_rate?: number;
  diagnostics_avg_density?: number;
  errors_resolved?: number;
  commits_count?: number;
  idle_distraction_time?: number;
  [key: string]: any;
}

export interface ForecastResponse {
  status: 'success' | 'error';
  user_id?: string;
  forecast_start_date?: string;
  forecast_end_date?: string;
  predictions?: ForecastPrediction[];
  generated_at?: string;
  message?: string;
}

export interface DailySchedule {
  date: string;
  allocated_hours: number;
  available_hours: number;
  productivity_level: 'high' | 'medium' | 'low';
  note?: string;
}

export interface BestHours {
  recommended_time: 'morning' | 'afternoon' | 'evening' | 'flexible';
  hours: string;
  reason: string;
}

export interface Warning {
  type: 'infeasible' | 'focus_risk' | 'low_focus' | 'high_errors';
  severity: 'high' | 'medium' | 'low';
  date?: string;
  message: string;
}

export interface ProductivityPlan {
  status: 'success' | 'error';
  user_id?: string;
  plan_start_date?: string;
  plan_end_date?: string;
  target_hours?: number;
  is_feasible?: boolean;
  feasibility_score?: number;
  total_available_hours?: number;
  daily_schedule?: DailySchedule[];
  best_hours?: BestHours;
  warnings?: Warning[];
  generated_at?: string;
  message?: string;
}

export interface TrainingResponse {
  status: 'success' | 'error';
  user_id?: string;
  training_samples?: number;
  metrics?: Record<string, any>;
  model_version?: string;
  message?: string;
}

export interface ModelInfo {
  status: 'success' | 'error';
  user_id?: string;
  model_exists?: boolean;
  last_trained?: string;
  model_path?: string;
  message?: string;
}

export interface SavedPlan {
  id: number;
  user_id: string;
  plan_start_date: string;
  plan_end_date: string;
  target_hours: number;
  is_feasible: boolean;
  feasibility_score: number;
  recommended_schedule: DailySchedule[];
  best_hours: BestHours;
  warnings: Warning[];
  created_at: string;
}
