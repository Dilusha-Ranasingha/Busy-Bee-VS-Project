// Error Session Types
export interface ErrorSession {
  id: string;
  session_id: string;
  user_id: string;
  workspace_id: string | null;
  file_uri: string;
  file_hash: string | null;
  language: string | null;
  loc: number;
  error_count_session: number;
  insertions_15m: number;
  deletions_15m: number;
  all_error_messages: string[];
  session_start_time: string;
  session_end_time: string;
  sent_to_gemini: boolean;
  gemini_requested_at: string | null;
  created_at: string;
}

// Gemini Risk Result Types
export interface GeminiRiskResult {
  id: string;
  session_id: string;
  error_session_id: string;
  user_id: string;
  file_uri: string;
  risk_level: 'Low' | 'Medium' | 'High';
  color_code: 'Green' | 'Yellow' | 'Red';
  risk_explanation: string;
  error_explanation: string;
  fix_steps: string[];
  is_active: boolean;
  created_at: string;
}

// UI Display Types
export interface CodeRiskItem {
  id: string;
  fileName: string;
  fileUri: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  colorCode: 'Green' | 'Yellow' | 'Red';
  riskExplanation: string;
  errorExplanation: string;
  fixSteps: string[];
  errorCount: number;
  loc: number;
  recentEdits: number;
  createdAt: string;
}
