const { pool } = require('./al-siddique-backend/src/config/database');

async function migrate() {
  try {
    const tables = ['users', 'students', 'attendance', 'fees', 'exams', 'admissions'];
    for (const table of tables) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id)`);
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS campus_id INTEGER REFERENCES campuses(id)`);
        console.log(`Added org_id and campus_id to ${table} successfully (or they already existed).`);
      } catch (e) {
        console.warn(`Could not alter table ${table}: ${e.message}`);
      }
    }
    
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 4`);
      console.log('Added role_level to users.');
    } catch(e) {
      console.warn(e.message);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
