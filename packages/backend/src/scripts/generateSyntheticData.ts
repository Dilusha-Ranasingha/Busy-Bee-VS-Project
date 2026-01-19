import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'productivity_db',
  user: process.env.DB_USER || 'productivity_user',
  password: process.env.DB_PASSWORD || 'productivity_pass'
});

async function generateSyntheticData() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting synthetic data generation...');
    
    // Delete existing synthetic data
    await client.query('DELETE FROM daily_metrics WHERE is_synthetic = true');
    console.log('✅ Cleared existing synthetic data');
    
    // Generate 90 days of data
    const days = 90;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    console.log(`📅 Generating ${days} days of data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const values = [];
    const placeholders = [];
    let paramCount = 1;
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Generate realistic productivity metrics
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
      const baseProductivity = isWeekend ? 0.3 : 0.7;
      const randomFactor = 0.2 + Math.random() * 0.3; // 0.2 to 0.5
      const productivity = baseProductivity + randomFactor;
      
      const focusTime = isWeekend ? 
        Math.floor(60 + Math.random() * 120) : // 1-3 hours on weekends
        Math.floor(180 + Math.random() * 240); // 3-7 hours on weekdays
      
      const totalTime = isWeekend ?
        Math.floor(120 + Math.random() * 180) : // 2-5 hours on weekends
        Math.floor(300 + Math.random() * 240); // 5-9 hours on weekdays
      
      const linesAdded = Math.floor(productivity * (50 + Math.random() * 200));
      const linesDeleted = Math.floor(linesAdded * (0.3 + Math.random() * 0.4));
      const commits = Math.floor(productivity * (1 + Math.random() * 5));
      const filesChanged = Math.floor(productivity * (2 + Math.random() * 8));
      
      const errorCount = Math.floor((1 - productivity) * (5 + Math.random() * 15));
      const errorFixTime = errorCount > 0 ? Math.floor(5 + Math.random() * 25) : 0;
      
      const diagnosticDensity = productivity > 0.6 ? 
        parseFloat((Math.random() * 0.3).toFixed(2)) : 
        parseFloat((0.3 + Math.random() * 0.5).toFixed(2));
      
      const taskCompletions = Math.floor(productivity * (1 + Math.random() * 4));
      const avgTaskDuration = taskCompletions > 0 ? Math.floor(30 + Math.random() * 90) : 0;
      
      const idleSessions = Math.floor((1 - productivity) * (2 + Math.random() * 6));
      const avgIdleDuration = idleSessions > 0 ? Math.floor(5 + Math.random() * 20) : 0;
      
      const fileSwitches = Math.floor(20 + Math.random() * 60);
      const avgFileSessionDuration = Math.floor(3 + Math.random() * 12);
      
      const editSessions = Math.floor(5 + Math.random() * 20);
      const avgEditDuration = Math.floor(10 + Math.random() * 30);
      
      const saveEditSessions = Math.floor(editSessions * (0.6 + Math.random() * 0.3));
      const avgSaveEditDuration = Math.floor(8 + Math.random() * 25);
      
      const commitEditSessions = commits;
      const avgCommitEditDuration = commits > 0 ? Math.floor(20 + Math.random() * 60) : 0;
      
      const focusStreakCount = Math.floor(productivity * (2 + Math.random() * 5));
      const avgFocusStreakDuration = focusStreakCount > 0 ? Math.floor(15 + Math.random() * 45) : 0;
      
      const codeRiskScore = parseFloat(((1 - productivity) * (30 + Math.random() * 40)).toFixed(2));
      
      placeholders.push(
        `($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, ` +
        `$${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, ` +
        `$${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, ` +
        `$${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, ` +
        `$${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`
      );
      
      values.push(
        dateStr, focusTime, totalTime, linesAdded, linesDeleted,
        commits, filesChanged, errorCount, errorFixTime, diagnosticDensity,
        taskCompletions, avgTaskDuration, idleSessions, avgIdleDuration, fileSwitches,
        avgFileSessionDuration, editSessions, avgEditDuration, saveEditSessions, avgSaveEditDuration,
        commitEditSessions, avgCommitEditDuration, focusStreakCount, avgFocusStreakDuration, codeRiskScore
      );
    }
    
    const query = `
      INSERT INTO daily_metrics (
        date, focus_time_minutes, total_time_minutes, lines_added, lines_deleted,
        commits, files_changed, error_count, avg_error_fix_time_minutes, diagnostic_density,
        task_completions, avg_task_duration_minutes, idle_sessions, avg_idle_duration_minutes,
        file_switches, avg_file_session_duration_minutes, edit_sessions, avg_edit_duration_minutes,
        save_edit_sessions, avg_save_edit_duration_minutes, commit_edit_sessions,
        avg_commit_edit_duration_minutes, focus_streak_count, avg_focus_streak_duration_minutes,
        code_risk_score
      )
      VALUES ${placeholders.join(', ')}
    `;
    
    await client.query(query, values);
    
    console.log(`✅ Generated ${days} days of synthetic data`);
    
    // Verify
    const result = await client.query(
      'SELECT COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date FROM daily_metrics WHERE is_synthetic = true'
    );
    
    console.log(`\n📊 Verification:`);
    console.log(`   Total records: ${result.rows[0].count}`);
    console.log(`   Date range: ${result.rows[0].min_date} to ${result.rows[0].max_date}`);
    console.log('\n✅ Synthetic data generation complete!');
    
  } catch (error) {
    console.error('❌ Error generating synthetic data:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

generateSyntheticData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
