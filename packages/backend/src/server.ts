import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from './config/db.js';
import app from './api/app.js';
import { setupDailyMetricsCron } from './jobs/dailyMetricsCron.js';
import { setupWeeklyMLTrainingCron } from './jobs/weeklyMLTraining.js';

const port = process.env.PORT;

connectDB()
  .then(() => {
    app.listen(port, () => console.log(`✅ API listening on http://localhost:${port}`));
    
    // Start daily metrics cron job
    setupDailyMetricsCron();
    
    // Start weekly ML model retraining cron job
    setupWeeklyMLTrainingCron();
  })
  .catch((err) => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
