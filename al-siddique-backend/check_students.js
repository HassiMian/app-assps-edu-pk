require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const active = await pool.query('SELECT class, section FROM students WHERE is_active = true GROUP BY class, section');
    console.log("Active classes:", active.rows);
    const all = await pool.query('SELECT class, section FROM students GROUP BY class, section');
    console.log("All classes:", all.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
check();
