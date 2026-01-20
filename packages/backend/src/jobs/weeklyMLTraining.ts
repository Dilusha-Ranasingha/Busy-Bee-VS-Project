import cron from 'node-cron';
import fetch from 'node-fetch';

/**
 * Weekly ML Model Retraining Cron Job
 * Runs every Sunday at 2:00 AM Sri Lankan time
 */
export function setupWeeklyMLTrainingCron() {
  // Schedule: '0 2 * * 0' = minute 0, hour 2, every day of month, every month, day 0 (Sunday)
  cron.schedule(
    '0 2 * * 0',
    async () => {
      const timestamp = new Date().toISOString();
      console.log(`[WeeklyMLTraining] Starting weekly model retraining at ${timestamp}`);

      try {
        // Call ML service to retrain all users
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
        const response = await fetch(`${mlServiceUrl}/api/ml/retrain-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            days_history: 90, // Use last 90 days of data
          }),
        });

        const result: any = await response.json();

        if (response.ok) {
          console.log('[WeeklyMLTraining] Retraining completed successfully:');
          console.log(`  - Total users: ${result.retrained_count}/${result.total_users}`);
          console.log(`  - Timestamp: ${result.timestamp || timestamp}`);

          // Log individual results
          if (result.results && result.results.length > 0) {
            result.results.forEach((userResult: any) => {
              const status = userResult.status === 'success' ? '✓' : '✗';
              console.log(`  ${status} ${userResult.user_id}: ${userResult.message || userResult.status}`);
            });
          }
        } else {
          console.error('[WeeklyMLTraining] Retraining failed:', result.error || result.message);
        }
      } catch (error: any) {
        console.error('[WeeklyMLTraining] Error during retraining:', error.message);
        console.error(error.stack);
      }
    },
    {
      timezone: 'Asia/Colombo', // Sri Lankan timezone
    }
  );

  console.log('[WeeklyMLTraining] Cron job registered: Every Sunday at 2:00 AM (Asia/Colombo)');
}

/**
 * Manual trigger for testing purposes
 * Call this function to immediately run the retraining process
 */
export async function triggerManualRetraining() {
  console.log('[WeeklyMLTraining] Manual retraining triggered');

  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
    const response = await fetch(`${mlServiceUrl}/api/ml/retrain-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        days_history: 90,
      }),
    });

    const result: any = await response.json();

    if (response.ok) {
      console.log('[WeeklyMLTraining] Manual retraining completed:');
      console.log(`  - Total users: ${result.retrained_count}/${result.total_users}`);
      return { success: true, result };
    } else {
      console.error('[WeeklyMLTraining] Manual retraining failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error: any) {
    console.error('[WeeklyMLTraining] Error during manual retraining:', error.message);
    return { success: false, error: error.message };
  }
}
