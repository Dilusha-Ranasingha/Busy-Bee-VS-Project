// Types for daily metrics

export interface DailyMetricsRecord {
  userId: string;
  date: string; // YYYY-MM-DD
  fileSwitch: FileSwitchMetrics;
  focusStreak: FocusStreakMetrics;
  editsPerMin: EditsPerMinMetrics;
  savesToEditRatio: SavesToEditRatioMetrics;
  diagnosticsPerKloc: DiagnosticsPerKlocMetrics;
  errorFix: ErrorFixMetrics;
  tasks: TasksMetrics;
  commits: CommitsMetrics;
  idle: IdleMetrics;
  createdAt: string;
}

export interface FileSwitchMetrics {
  file_switch_rate_avg: number;
  file_switch_rate_p95: number;
  file_switch_count_total: number;
  file_switch_sessions: number;
}

export interface FocusStreakMetrics {
  global_focus_streak_max_min: number | null;
  per_file_focus_streak_max_min: number | null;
}

export interface EditsPerMinMetrics {
  edits_per_min_avg: number;
  edits_per_min_p95: number;
  typing_burstiness_index_avg: number;
  paste_events_total: number;
  active_time_min_from_edits: number;
}

export interface SavesToEditRatioMetrics {
  save_to_edit_ratio_manual_avg: number;
  effective_save_to_edit_ratio_avg: number;
  median_secs_between_saves: number;
  checkpoint_autosave_count_total: number;
}

export interface DiagnosticsPerKlocMetrics {
  diagnostics_density_avg_per_kloc: number;
  diagnostics_hotspot_max_per_kloc: number;
}

export interface ErrorFixMetrics {
  fixes_count: number;
  median_active_fix_time_min: number;
  min_active_fix_time_min: number;
}

export interface TasksMetrics {
  test_runs: number;
  build_runs: number;
  overall_pass_rate: number;
  avg_test_duration_sec: number;
}

export interface CommitsMetrics {
  commits_total: number;
  median_mins_between_commits: number;
  best_commits_in_any_hour: number;
  avg_edits_per_commit: number;
}

export interface IdleMetrics {
  idle_time_min_total: number;
  idle_sessions_count: number;
}
