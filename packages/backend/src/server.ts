import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { connectDB, query } from './config/db.js';
import app from './api/app.js';
import { setupDailyMetricsCron } from './jobs/dailyMetricsCron.js';

const port = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`✅ API listening on http://localhost:${port}`));
    
    // Start daily metrics cron job
    setupDailyMetricsCron();

    // Schedule daily aggregation at 11:59 PM every day
    cron.schedule('59 23 * * *', async () => {
      try {
        console.log('🕐 Running daily aggregation at', new Date().toISOString());
        const result = await query('SELECT * FROM aggregate_all_daily_summaries()');
        console.log(`✅ Daily aggregation completed: ${result.rows[0]?.users_processed || 0} users processed for ${result.rows[0]?.target_date || 'N/A'}`);
      } catch (err) {
        console.error('❌ Daily aggregation failed:', err);
      }
    });

    console.log('⏰ Scheduled job: Daily aggregation at 11:59 PM');
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
