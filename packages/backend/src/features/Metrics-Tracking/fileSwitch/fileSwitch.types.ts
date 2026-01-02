export type CreateFileSwitchWindowInput = {
  userId: string;              // GitHub user ID
  sessionId: string;
  windowStart: string; // ISO string
  windowEnd: string;   // ISO string
  activationCount: number;
  ratePerMin: number;
  workspaceTag?: string;
};

export type FileSwitchWindowRow = {
  id: string;
  user_id: string;             // GitHub user ID
  session_id: string;
  window_start: string;
  window_end: string;
  activation_count: number;
  rate_per_min: string; // pg returns numeric as string
  workspace_tag: string | null;
  created_at: string;
};
