const { pool } = require('./al-siddique-backend/src/config/database');

async function migrate() {
  try {
    console.log('Adding new columns to students table...');
    await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS b_form_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10),
      ADD COLUMN IF NOT EXISTS religion VARCHAR(50),
      ADD COLUMN IF NOT EXISTS previous_school VARCHAR(150);
    `);
    console.log('Successfully added columns!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrate();
