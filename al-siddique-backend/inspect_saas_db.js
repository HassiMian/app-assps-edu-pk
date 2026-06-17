const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src/.env') });

const { pool } = require('./src/config/database');

async function main() {
  try {
    console.log("=== SCHOOLS ===");
    const schoolsRes = await pool.query("SELECT * FROM schools");
    console.log(schoolsRes.rows);

    console.log("\n=== USERS ===");
    const usersRes = await pool.query("SELECT id, school_id, name, email, role, designation, is_active FROM users");
    console.log(usersRes.rows);

    console.log("\n=== SETTINGS ===");
    const settingsRes = await pool.query("SELECT id, school_id, school_name FROM settings");
    console.log(settingsRes.rows);

    const tables = ['students', 'attendance', 'fee_challans', 'exams', 'exam_results', 'employees', 'notification_log', 'online_classes', 'timetable', 'events', 'cards'];
    console.log("\n=== TABLE ROW COUNTS BY SCHOOL_ID ===");
    for (const t of tables) {
      try {
        const res = await pool.query(`SELECT school_id, COUNT(*) as cnt FROM ${t} GROUP BY school_id`);
        console.log(`Table: ${t}`);
        console.log(res.rows);
      } catch (err) {
        console.log(`Table: ${t} - ERROR: ${err.message}`);
      }
    }
  } catch (err) {
    console.error("Database connection or query failed:", err.message);
  } finally {
    await pool.end();
  }
}

main();
