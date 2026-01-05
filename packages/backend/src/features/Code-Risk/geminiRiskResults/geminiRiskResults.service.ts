import pool from '../../../config/db';
import { 
  GeminiRiskResult, 
  CreateGeminiRiskResultPayload, 
  GeminiRiskResultDTO,
  GeminiAPIRequest,
  GeminiAPIResponse
} from './geminiRiskResults.types';
import { GeminiService } from '../gemini/gemini.service';
import { ErrorSessionsService } from '../errorSessions/errorSessions.service';

export class GeminiRiskResultsService {
  /**
   * Create a new risk result from error session
   * This also calls Gemini API
   */
  static async createFromErrorSession(errorSessionId: string): Promise<GeminiRiskResultDTO> {
    // Get error session
    const errorSession = await ErrorSessionsService.getSessionById(errorSessionId);
    
    if (!errorSession) {
      throw new Error(`Error session not found: ${errorSessionId}`);
    }

    // Prepare Gemini API request
    const geminiRequest: GeminiAPIRequest = {
      session_id: errorSession.session_id,
      file_uri: errorSession.file_uri,
      loc: errorSession.loc,
      error_count_session: errorSession.error_count_session,
      insertions_15m: errorSession.insertions_15m,
      deletions_15m: errorSession.deletions_15m,
      session_start_time: errorSession.session_start_time,
      session_end_time: errorSession.session_end_time,
      all_error_messages: errorSession.all_error_messages
    };

    // Call Gemini API
    const geminiResponse = await GeminiService.analyzeCodeRisk(geminiRequest);

    // Deactivate previous results for this file
    await this.deactivateResultsForFile(errorSession.user_id, errorSession.file_uri);

    // Create new result
    const payload: CreateGeminiRiskResultPayload = {
      session_id: errorSession.session_id,
      error_session_id: errorSessionId,
      user_id: errorSession.user_id,
      file_uri: geminiResponse.file_uri,
      risk_level: geminiResponse.risk_level,
      color_code: geminiResponse.color_code,
      risk_explanation: geminiResponse.risk_explanation,
      error_explanation: geminiResponse.error_explanation,
      fix_steps: geminiResponse.fix_steps
    };

    const result = await this.createResult(payload);

    // Mark error session as sent to Gemini
    await ErrorSessionsService.markAsSentToGemini(errorSessionId);

    return result;
  }

  /**
   * Create a new risk result (internal method)
   */
  private static async createResult(payload: CreateGeminiRiskResultPayload): Promise<GeminiRiskResultDTO> {
    const query = `
      INSERT INTO gemini_risk_results (
        session_id, error_session_id, user_id, file_uri,
        risk_level, color_code, risk_explanation, error_explanation, fix_steps
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      payload.session_id,
      payload.error_session_id,
      payload.user_id,
      payload.file_uri,
      payload.risk_level,
      payload.color_code,
      payload.risk_explanation,
      payload.error_explanation,
      JSON.stringify(payload.fix_steps)
    ];

    const result = await pool.query(query, values);
    return this.mapToDTO(result.rows[0]);
  }

  /**
   * Get active risk results for a user
   */
  static async getActiveResultsByUser(userId: string): Promise<GeminiRiskResultDTO[]> {
    const query = `
      SELECT * FROM gemini_risk_results
      WHERE user_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Get active risk result for a specific file
   */
  static async getActiveResultByFile(userId: string, fileUri: string): Promise<GeminiRiskResultDTO | null> {
    const query = `
      SELECT * FROM gemini_risk_results
      WHERE user_id = $1 AND file_uri = $2 AND is_active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [userId, fileUri]);
    return result.rows.length > 0 ? this.mapToDTO(result.rows[0]) : null;
  }

  /**
   * Get all risk results for a user (including inactive)
   */
  static async getAllResultsByUser(userId: string, limit = 100): Promise<GeminiRiskResultDTO[]> {
    const query = `
      SELECT * FROM gemini_risk_results
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows.map(this.mapToDTO);
  }

  /**
   * Deactivate risk results for a specific file
   */
  static async deactivateResultsForFile(userId: string, fileUri: string): Promise<void> {
    const query = `
      UPDATE gemini_risk_results
      SET is_active = FALSE
      WHERE user_id = $1 AND file_uri = $2 AND is_active = TRUE
    `;

    await pool.query(query, [userId, fileUri]);
  }

  /**
   * Deactivate a specific result
   */
  static async deactivateResult(id: string): Promise<void> {
    const query = `
      UPDATE gemini_risk_results
      SET is_active = FALSE
      WHERE id = $1
    `;

    await pool.query(query, [id]);
  }

  /**
   * Get result by ID
   */
  static async getResultById(id: string): Promise<GeminiRiskResultDTO | null> {
    const query = `
      SELECT * FROM gemini_risk_results
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? this.mapToDTO(result.rows[0]) : null;
  }

  /**
   * Map database row to DTO
   */
  private static mapToDTO(row: any): GeminiRiskResultDTO {
    return {
      id: row.id,
      session_id: row.session_id,
      error_session_id: row.error_session_id,
      user_id: row.user_id,
      file_uri: row.file_uri,
      risk_level: row.risk_level,
      color_code: row.color_code,
      risk_explanation: row.risk_explanation,
      error_explanation: row.error_explanation,
      fix_steps: row.fix_steps || [],
      is_active: row.is_active,
      created_at: row.created_at.toISOString()
    };
  }
}
