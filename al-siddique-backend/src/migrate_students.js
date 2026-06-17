// migrate_students.js
require('dotenv').config()
const { pool } = require('./config/database')

async function migrate() {
  console.log('Running migration on students table...')
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    await client.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS father_cnic VARCHAR(20),
      ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(100),
      ADD COLUMN IF NOT EXISTS locality VARCHAR(150);
    `)
    
    await client.query('COMMIT')
    console.log('Migration successful: Added father_cnic, father_occupation, locality.')
    process.exit(0)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Migration Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
  }
}

migrate()
