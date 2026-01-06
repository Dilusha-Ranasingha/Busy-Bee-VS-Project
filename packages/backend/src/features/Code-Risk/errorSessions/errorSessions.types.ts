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
  session_start_time: Date;
  session_end_time: Date;
  sent_to_gemini: boolean;
  gemini_requested_at: Date | null;
  created_at: Date;
}

export interface CreateErrorSessionPayload {
  session_id: string;
  user_id: string;
  workspace_id?: string;
  file_uri: string;
  file_hash?: string;
  language?: string;
  loc: number;
  error_count_session: number;
  insertions_15m: number;
  deletions_15m: number;
  all_error_messages: string[];
  session_start_time: string | Date;
  session_end_time: string | Date;
}

export interface ErrorSessionDTO {
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
