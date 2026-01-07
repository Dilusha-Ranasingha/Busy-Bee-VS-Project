import { getPool } from '../config/db';
import * as dailyMetricsService from '../features/Metrics-Tracking/dailyMetrics/dailyMetrics.service';
import * as productivityScoreService from '../features/Metrics-Tracking/productivityScore/productivityScore.service';
import { generateProductivityScore } from '../ai/gemini';

export async function runDailyScoringForAllUsers(date: string): Promise<void> {
  try {
    const pool = getPool();

    // Get all users who have daily metrics for this date
    const result = await pool.query(
      'SELECT DISTINCT user_id FROM daily_metrics WHERE date = $1',
      [date]
    );

    const users = result.rows;

    console.log(`[DailyScoring] Found ${users.length} users to score for ${date}`);

    for (const { user_id } of users) {
      try {
        await runDailyScoringForUser(user_id, date);
      } catch (error) {
        console.error(`[DailyScoring] Error scoring user ${user_id}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log(`[DailyScoring] Completed scoring for ${users.length} users on ${date}`);
  } catch (error) {
    console.error('[DailyScoring] Error running daily scoring:', error);
    throw error;
  }
}

export async function runDailyScoringForUser(userId: string, date: string): Promise<void> {
  try {
    // Get daily metrics for this user and date
    const metrics = await dailyMetricsService.getDailyMetrics(userId, date);

    if (!metrics) {
      console.log(`[DailyScoring] No metrics found for user ${userId} on ${date}`);
      return;
    }

    console.log(`[DailyScoring] Generating score for user ${userId} on ${date}...`);

    // Generate productivity score using Gemini AI
    const scoreResult = await generateProductivityScore(metrics);

    // Save to database
    await productivityScoreService.createScore({
      userId,
      date,
      score: scoreResult.score,
      recommendations: scoreResult.recommendations,
    });

    console.log(
      `[DailyScoring] Score saved for user ${userId}: ${scoreResult.score}/100 with ${scoreResult.recommendations.length} recommendations`
    );
  } catch (error) {
    console.error(`[DailyScoring] Error scoring user ${userId}:`, error);
    throw error;
  }
}
