import cron from 'node-cron';
import { getPool } from '../config/db';

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

        await pool.query('SELECT make_daily_metrics_all($1)', [today]);

        console.log(`[DailyMetrics] Daily aggregation completed for ${today}`);
      } catch (error) {
        console.error('[DailyMetrics] Error running daily aggregation:', error);
      }
    },
    {
      timezone: 'Asia/Colombo',
    }
  );

  console.log('[DailyMetrics] Cron job scheduled: Daily aggregation at 23:59 Asia/Colombo');
}
