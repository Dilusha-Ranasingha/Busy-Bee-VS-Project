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
  created_at: Date;
}

export interface CreateGeminiRiskResultPayload {
  session_id: string;
  error_session_id: string;
  user_id: string;
  file_uri: string;
  risk_level: 'Low' | 'Medium' | 'High';
  color_code: 'Green' | 'Yellow' | 'Red';
  risk_explanation: string;
  error_explanation: string;
  fix_steps: string[];
}

export interface GeminiRiskResultDTO {
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

export interface GeminiAPIRequest {
  session_id: string;
  file_uri: string;
  loc: number;
  error_count_session: number;
  insertions_15m: number;
  deletions_15m: number;
  session_start_time: string;
  session_end_time: string;
  all_error_messages: string[];
}

export interface GeminiAPIResponse {
  file_uri: string;
  risk_level: 'Low' | 'Medium' | 'High';
  color_code: 'Green' | 'Yellow' | 'Red';
  risk_explanation: string;
  error_explanation: string;
  fix_steps: string[];
  created_at: string;
}
