require('dotenv').config({ path: __dirname + '/../../.env' })
const { pool } = require('./database')

async function migrateExamPassingPercentageV1() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Additive, idempotent: existing enrolled subjects, totals, pass marks and results remain untouched.
    await client.query('ALTER TABLE exam_subjects ADD COLUMN IF NOT EXISTS pass_percentage NUMERIC(5,2)')
    await client.query('COMMIT')
    console.log('EXAM_PASS_PERCENTAGE_V1_MIGRATION_OK')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

if (require.main === module) {
  migrateExamPassingPercentageV1().then(() => pool.end()).catch(error => {
    console.error('EXAM_PASS_PERCENTAGE_V1_MIGRATION_FAILED=' + error.message)
    pool.end().finally(() => process.exit(1))
  })
}

module.exports = { migrateExamPassingPercentageV1 }
