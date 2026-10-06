/**
 * Migration 006: durable fee payment ledger.
 *
 * fee_challans stores the current aggregate payment state; this ledger records each
 * positive payment increment so partial payments remain auditable instead of being overwritten.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS fee_payment_transactions (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id),
        challan_id INTEGER NOT NULL REFERENCES fee_challans(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        cumulative_paid DECIMAL(10,2) NOT NULL CHECK (cumulative_paid >= 0),
        payment_mode VARCHAR(32) NOT NULL,
        discount_snapshot DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_note TEXT,
        recorded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_fee_payment_transactions_school_challan
        ON fee_payment_transactions (school_id, challan_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_fee_payment_transactions_student
        ON fee_payment_transactions (school_id, student_id, created_at DESC);
    `)
    await client.query('COMMIT')
    return { success: true }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

async function down() {
  return { success: true, message: 'NO_OP_DATA_PRESERVED' }
}

module.exports = { up, down }

if (require.main === module) {
  up().then(() => process.exit(0)).catch(err => {
    console.error(err.message)
    process.exit(1)
  })
}
