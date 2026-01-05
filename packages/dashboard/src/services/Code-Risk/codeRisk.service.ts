import { apiClient } from '../api.client';
import type { GeminiRiskResult, CodeRiskItem } from '../../types/Code-Risk/codeRisk.types';

/**
 * Get active risk results for current user
 */
export async function getActiveRiskResults(userId: string): Promise<GeminiRiskResult[]> {
  return apiClient.get<GeminiRiskResult[]>(
    `/api/code-risk/risk-results/user/${userId}/active`
  );
}

/**
 * Get all risk results for current user
 */
export async function getAllRiskResults(userId: string, limit?: number): Promise<GeminiRiskResult[]> {
  const queryParams = limit ? `?limit=${limit}` : '';
  return apiClient.get<GeminiRiskResult[]>(
    `/api/code-risk/risk-results/user/${userId}${queryParams}`
  );
}

/**
 * Get active risk result for a specific file
 */
export async function getActiveRiskResultByFile(
  userId: string,
  fileUri: string
): Promise<GeminiRiskResult | null> {
  try {
    const encodedUri = encodeURIComponent(fileUri);
    return await apiClient.get<GeminiRiskResult>(
      `/api/code-risk/risk-results/user/${userId}/file?fileUri=${encodedUri}`
    );
  } catch (error: any) {
    // Return null if not found
    if (error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

/**
 * Deactivate risk results for a specific file
 */
export async function deactivateRiskResultsForFile(
  userId: string,
  fileUri: string
): Promise<void> {
  await apiClient.post(`/api/code-risk/risk-results/user/${userId}/deactivate-file`, {
    fileUri
  });
}

/**
 * Deactivate a specific risk result
 */
export async function deactivateRiskResult(resultId: string): Promise<void> {
  await apiClient.post(`/api/code-risk/risk-results/${resultId}/deactivate`, {});
}

/**
 * Transform GeminiRiskResult to CodeRiskItem for UI display
 */
export function transformToCodeRiskItem(
  result: GeminiRiskResult,
  errorSession?: {
    error_count_session: number;
    loc: number;
    insertions_15m: number;
    deletions_15m: number;
  }
): CodeRiskItem {
  // Extract filename from URI
  const fileName = result.file_uri.split('/').pop() || result.file_uri;
  
  return {
    id: result.id,
    fileName,
    fileUri: result.file_uri,
    riskLevel: result.risk_level,
    colorCode: result.color_code,
    riskExplanation: result.risk_explanation,
    errorExplanation: result.error_explanation,
    fixSteps: result.fix_steps,
    errorCount: errorSession?.error_count_session || 0,
    loc: errorSession?.loc || 0,
    recentEdits: (errorSession?.insertions_15m || 0) + (errorSession?.deletions_15m || 0),
    createdAt: result.created_at
  };
}
