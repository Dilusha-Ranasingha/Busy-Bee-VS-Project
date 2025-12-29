export type FileSwitchSessionSummary = {
  session_id: string;
  session_start: string; // ISO
  session_end: string;   // ISO
  window_count: string;  // pg often returns as string
};

export type FileSwitchWindow = {
  id: string;
  session_id: string;
  window_start: string;
  window_end: string;
  activation_count: number;
  rate_per_min: string; // numeric from pg
  workspace_tag: string | null;
  created_at: string;
};
