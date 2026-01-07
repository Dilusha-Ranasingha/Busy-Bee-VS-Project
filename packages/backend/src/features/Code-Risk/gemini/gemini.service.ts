import axios from 'axios';
import { GeminiAPIRequest, GeminiAPIResponse } from '../geminiRiskResults/geminiRiskResults.types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBbV********pndLw7t8l0';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const SYSTEM_INSTRUCTION = `You are an AI assistant inside a VS Code extension for individual developers (students and freelancers).
Your job: analyze one file's risk using the given metrics + error messages and return a strict JSON response.

Rules:
- Use ONLY the provided input data. Do not assume project context.
- Keep explanations short and simple English.
- Risk levels must be exactly: "Low" or "Medium" or "High".
- Color codes must be exactly: "Green" or "Yellow" or "Red".
- If the error messages are unclear or insufficient, say "Not enough information" in error_explanation and give generic safe fix_steps.
- Output must be VALID JSON only. No extra text.`;

export class GeminiService {
  /**
   * Send error session data to Gemini and get risk analysis
   */
  static async analyzeCodeRisk(request: GeminiAPIRequest): Promise<GeminiAPIResponse> {
    try {
      const userPrompt = this.buildUserPrompt(request);
      
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `${SYSTEM_INSTRUCTION}\n\n${userPrompt}`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Extract the generated text from Gemini response
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Parse JSON from the response (Gemini sometimes wraps it in markdown code blocks)
      const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       generatedText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from Gemini response');
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const result: GeminiAPIResponse = JSON.parse(jsonText);

      // Validate the response
      this.validateGeminiResponse(result);

      return result;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      
      // Return a fallback response in case of API failure
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Build the user prompt for Gemini
   */
  private static buildUserPrompt(request: GeminiAPIRequest): string {
    return `Analyze code risk for this file session and return JSON only.

INPUT (one file session):
{
  "session_id": "${request.session_id}",
  "file_uri": "${request.file_uri}",
  "loc": ${request.loc},
  "error_count_session": ${request.error_count_session},
  "insertions_15m": ${request.insertions_15m},
  "deletions_15m": ${request.deletions_15m},
  "session_start_time": "${request.session_start_time}",
  "session_end_time": "${request.session_end_time}",
  "all_error_messages": ${JSON.stringify(request.all_error_messages, null, 2)}
}

TASK:
1) Decide risk_level (Low/Medium/High) using loc + error_count_session + recent edits + error messages.
2) Decide color_code (Green/Yellow/Red) matching risk_level.
3) Give simple risk_explanation (1–2 sentences).
4) Give simple error_explanation (what the error means + likely cause) (1–3 sentences).
5) Give fix_steps as 3–6 bullet-like steps (string array), focused on the error messages.

OUTPUT JSON SCHEMA (exact keys):
{
  "file_uri": "string",
  "risk_level": "Low|Medium|High",
  "color_code": "Green|Yellow|Red",
  "risk_explanation": "string",
  "error_explanation": "string",
  "fix_steps": ["string", "string", "string"],
  "created_at": "ISO_TIMESTAMP"
}`;
  }

  /**
   * Validate Gemini API response
   */
  private static validateGeminiResponse(response: any): void {
    if (!response.file_uri || typeof response.file_uri !== 'string') {
      throw new Error('Invalid file_uri in Gemini response');
    }

    if (!['Low', 'Medium', 'High'].includes(response.risk_level)) {
      throw new Error('Invalid risk_level in Gemini response');
    }

    if (!['Green', 'Yellow', 'Red'].includes(response.color_code)) {
      throw new Error('Invalid color_code in Gemini response');
    }

    if (!response.risk_explanation || typeof response.risk_explanation !== 'string') {
      throw new Error('Invalid risk_explanation in Gemini response');
    }

    if (!response.error_explanation || typeof response.error_explanation !== 'string') {
      throw new Error('Invalid error_explanation in Gemini response');
    }

    if (!Array.isArray(response.fix_steps)) {
      throw new Error('Invalid fix_steps in Gemini response');
    }
  }

  /**
   * Get fallback response when Gemini API fails
   */
  private static getFallbackResponse(request: GeminiAPIRequest): GeminiAPIResponse {
    // Simple heuristic-based risk assessment
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    let colorCode: 'Green' | 'Yellow' | 'Red' = 'Green';

    const totalEdits = request.insertions_15m + request.deletions_15m;
    
    // High risk: many errors + many edits + large file
    if (request.error_count_session >= 5 || (request.error_count_session >= 3 && totalEdits > 100) || request.loc > 500) {
      riskLevel = 'High';
      colorCode = 'Red';
    } 
    // Medium risk: moderate errors or moderate edits
    else if (request.error_count_session >= 3 || totalEdits > 50 || request.loc > 200) {
      riskLevel = 'Medium';
      colorCode = 'Yellow';
    }

    return {
      file_uri: request.file_uri,
      risk_level: riskLevel,
      color_code: colorCode,
      risk_explanation: `Risk assessed based on ${request.error_count_session} errors in session, ${totalEdits} recent edits, and ${request.loc} lines of code.`,
      error_explanation: `Multiple errors detected in this file. Review the error messages for specific issues.`,
      fix_steps: [
        'Review each error message carefully',
        'Fix syntax errors first',
        'Check type compatibility issues',
        'Test your changes incrementally',
        'Run build/lint to verify fixes'
      ],
      created_at: new Date().toISOString()
    };
  }
}
