import cron from 'node-cron';
import { getPool } from '../config/db';
import { runDailyScoringForAllUsers } from './dailyScoring';

export function setupDailyMetricsCron() {
  // Run at 23:59 Asia/Colombo time every day
  cron.schedule(
    '59 23 * * *',
    async () => {
      try {
        const pool = getPool();
        
        // Get today's date in Asia/Colombo timezone (YYYY-MM-DD)
        const today = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Colombo',
        });

        console.log(`[DailyMetrics] Running daily aggregation for ${today}...`);

        // Step 1: Aggregate metrics
        await pool.query('SELECT make_daily_metrics_all($1)', [today]);

        console.log(`[DailyMetrics] Daily aggregation completed for ${today}`);

        // Step 2: Generate AI productivity scores
        console.log(`[DailyMetrics] Starting productivity scoring for ${today}...`);
        
        await runDailyScoringForAllUsers(today);

        console.log(`[DailyMetrics] ✅ All daily processing completed for ${today}`);
      } catch (error) {
        console.error('[DailyMetrics] Error running daily aggregation:', error);
      }
    },
    {
      timezone: 'Asia/Colombo',
    }
  );

  console.log('[DailyMetrics] Cron job scheduled: Daily aggregation + AI scoring at 23:59 Asia/Colombo');
}
