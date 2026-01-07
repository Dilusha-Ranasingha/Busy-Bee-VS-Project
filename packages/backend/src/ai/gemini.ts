import { GoogleGenAI } from '@google/genai';
import { DailyMetricsRecord } from '../features/Metrics-Tracking/dailyMetrics/dailyMetrics.types';

interface ProductivityScoreResult {
  score: number;
  recommendations: string[];
}

export async function generateProductivityScore(
  metrics: DailyMetricsRecord
): Promise<ProductivityScoreResult> {
  try {
    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey.trim() === '') {
      console.warn('⚠️  [Gemini] GEMINI_API_KEY not configured - using fallback scoring');
      console.warn('⚠️  [Gemini] Add GEMINI_API_KEY to .env file to enable AI-powered scoring');
      return generateFallbackScore(metrics);
    }

    console.log('[Gemini] API Key found, initializing Gemini AI...');
    console.log(`[Gemini] API Key length: ${apiKey.length} characters`);
    
    const ai = new GoogleGenAI({ apiKey });
    
    console.log('[Gemini] Sending request to Gemini API...');

    const prompt = `You are a senior software engineering productivity coach. Analyze this developer's daily metrics and provide:
1. A productivity score (0-100)
2. 3-5 actionable recommendations

Scoring guidelines:
- File Switch Rate: Lower is better (≤1.5/min = good). High switching = context loss.
- Focus Streaks: Longer is better (≥30min = excellent). Shows deep work capacity.
- Edits per Minute: 10-20 = good pace. <5 = slow, >30 = rushed/paste-heavy.
- Save-to-Edit Ratio: 0.03-0.08 = balanced. Too low = risky, too high = over-cautious.
- Diagnostics per KLOC: ≤5 = clean code. >10 = quality issues.
- Error Fix Time: Faster is better (median <3min = good). Shows debugging skill.
- Task Runs: Pass rate ≥70% = good. <50% = serious issues.
- Commits: 3-8/day ideal. ≤50 edits/commit = good granularity. 1+ commits/hour peak = active.
- Idle Time: <60min/day = focused. >120min = distracted.

Daily Metrics:
${JSON.stringify(metrics, null, 2)}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "score": 78,
  "recommendations": [
    "Clear the diagnostics hotspot first; aim ≤5 problems/KLOC.",
    "Raise test pass rate to ≥70% by running focused tests.",
    "Commit smaller chunks: 1–3 commits/hour, ≤70 lines each."
  ]
}`;

    // Try models in order of preference
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    let lastError: any;
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini] Trying model: ${modelName}`);
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const text = res.text;
        console.log('[Gemini] Received AI response, parsing...');

        if (!text) {
          throw new Error('Empty response from AI model');
        }

        // Clean up response (remove markdown code blocks if present)
        const cleaned = text
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        // Validate response structure
        if (
          typeof parsed.score !== 'number' ||
          parsed.score < 0 ||
          parsed.score > 100 ||
          !Array.isArray(parsed.recommendations)
        ) {
          console.error('[Gemini] Invalid AI response structure:', parsed);
          throw new Error('Invalid AI response structure');
        }

        console.log(`✅ [Gemini] AI score generated: ${parsed.score}/100 with ${parsed.recommendations.length} recommendations`);

        return {
          score: Math.round(parsed.score),
          recommendations: parsed.recommendations.slice(0, 5), // Max 5 recommendations
        };
      } catch (error) {
        lastError = error;
        console.log(`[Gemini] Model ${modelName} failed, trying next...`);
      }
    }
    
    // If all models failed, throw the last error
    throw lastError;
  } catch (error) {
    console.error('❌ [Gemini] Error generating productivity score:');
    if (error instanceof Error) {
      console.error(`   Error name: ${error.name}`);
      console.error(`   Error message: ${error.message}`);
      
      // Specific error handling
      if (error.message.includes('API key not valid')) {
        console.error('\n   💡 Your GEMINI_API_KEY appears to be invalid or expired');
        console.error('   💡 Get a new API key at: https://aistudio.google.com/app/apikey');
        console.error('   💡 Update it in: packages/backend/.env\n');
      } else if (error.message.includes('404') || error.message.includes('not found')) {
        console.error('\n   💡 The Gemini model may not be accessible with your API key');
        console.error('   💡 This could mean:');
        console.error('      1. Your API key is expired or invalid');
        console.error('      2. The model name has changed');
        console.error('      3. Your API key doesn\'t have access to Gemini models');
        console.error('   💡 Get a fresh API key at: https://aistudio.google.com/app/apikey\n');
      } else if (error.message.includes('quota')) {
        console.error('\n   💡 API quota exceeded - try again later or upgrade your plan\n');
      }
      
      if (error.stack) {
        console.error(`   Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    } else {
      console.error('   Error:', error);
    }
    console.warn('⚠️  [Gemini] Using fallback heuristic scoring instead');
    
    // Fallback scoring based on simple heuristics
    return generateFallbackScore(metrics);
  }
}

function generateFallbackScore(metrics: DailyMetricsRecord): ProductivityScoreResult {
  console.log('📊 [Gemini] Using fallback heuristic scoring algorithm...');
  
  let score = 50; // Base score
  const recommendations: string[] = [];

  // File switch rate (max +10)
  const switchRate = metrics.fileSwitch?.file_switch_rate_avg || 0;
  if (switchRate <= 1.5) {
    score += 10;
  } else if (switchRate > 3) {
    score -= 5;
    recommendations.push('Reduce file switching to improve focus (target ≤1.5 switches/min).');
  }

  // Focus streaks (max +15)
  const globalFocus = metrics.focusStreak?.global_focus_streak_max_min || 0;
  if (globalFocus >= 30) {
    score += 15;
  } else if (globalFocus < 10) {
    score -= 5;
    recommendations.push('Build longer focus sessions (aim for 30+ minute streaks).');
  } else {
    score += 5;
  }

  // Diagnostics (max +15)
  const diagnostics = metrics.diagnosticsPerKloc?.diagnostics_density_avg_per_kloc || 0;
  if (diagnostics <= 5) {
    score += 15;
  } else if (diagnostics > 10) {
    score -= 10;
    recommendations.push(`Clear diagnostics hotspot (currently ${diagnostics.toFixed(1)}/KLOC, aim ≤5).`);
  }

  // Task pass rate (max +10)
  const passRate = metrics.tasks?.overall_pass_rate || 0;
  if (passRate >= 0.7) {
    score += 10;
  } else if (passRate < 0.5) {
    score -= 5;
    recommendations.push(`Improve test pass rate (currently ${(passRate * 100).toFixed(0)}%, aim ≥70%).`);
  }

  // Commits (max +10)
  const commits = metrics.commits?.commits_total || 0;
  const editsPerCommit = metrics.commits?.avg_edits_per_commit || 0;
  if (commits >= 3 && commits <= 8 && editsPerCommit <= 70) {
    score += 10;
  } else if (commits < 2) {
    recommendations.push('Commit more frequently (aim for 3-8 commits/day).');
  } else if (editsPerCommit > 100) {
    recommendations.push(`Commit smaller chunks (currently ${editsPerCommit.toFixed(0)} edits/commit, aim ≤70).`);
  }

  // Idle time (max -10)
  const idleTime = metrics.idle?.idle_time_min_total || 0;
  if (idleTime > 120) {
    score -= 10;
    recommendations.push(`Reduce idle time (${idleTime.toFixed(0)} min today, aim <60 min).`);
  }

  // Ensure recommendations exist
  if (recommendations.length === 0) {
    recommendations.push('Keep up the good work! Maintain your current productivity habits.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    recommendations: recommendations.slice(0, 5),
  };
}
