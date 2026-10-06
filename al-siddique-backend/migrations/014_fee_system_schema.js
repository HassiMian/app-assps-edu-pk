/**
 * Migration 014: fee system schema authority.
 * Moves challan extensions, class fee settings, discount packages/applications,
 * and proof-payment columns out of request-time DDL.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE fee_challans
        ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_note TEXT,
        ADD COLUMN IF NOT EXISTS proof_image TEXT,
        ADD COLUMN IF NOT EXISTS proof_status VARCHAR(20) DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS proof_amount DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS proof_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS previous_arrears DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS gross_total DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS discount_package_id INTEGER,
        ADD COLUMN IF NOT EXISTS discount_label VARCHAR(150),
        ADD COLUMN IF NOT EXISTS fee_source VARCHAR(80),
        ADD COLUMN IF NOT EXISTS source_serial INTEGER,
        ADD COLUMN IF NOT EXISTS migration_batch VARCHAR(80);

      CREATE TABLE IF NOT EXISTS fee_class_settings (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        class_name VARCHAR(100) NOT NULL,
        session VARCHAR(20) NOT NULL,
        monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(school_id, class_name, session)
      );

      CREATE TABLE IF NOT EXISTS fee_discount_packages (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        name VARCHAR(150) NOT NULL,
        description TEXT,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
        discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        min_sibling_count INTEGER NOT NULL DEFAULT 1,
        applicable_classes JSONB DEFAULT '[]'::jsonb,
        applicable_sessions JSONB DEFAULT '[]'::jsonb,
        active BOOLEAN DEFAULT true,
        auto_apply BOOLEAN DEFAULT true,
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(school_id, name)
      );

      CREATE TABLE IF NOT EXISTS fee_discount_applications (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools(id),
        challan_id INTEGER REFERENCES fee_challans(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES fee_discount_packages(id),
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        reason TEXT,
        applied_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(challan_id, package_id)
      );

      CREATE INDEX IF NOT EXISTS idx_fee_class_settings_school ON fee_class_settings(school_id, class_name);
      CREATE INDEX IF NOT EXISTS idx_fee_discount_packages_school ON fee_discount_packages(school_id, active);
      CREATE INDEX IF NOT EXISTS idx_fee_challans_migration_batch ON fee_challans(migration_batch);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_challans_student_month_year ON fee_challans (student_id, LOWER(TRIM(month)), year);
    `)

    await client.query('ALTER TABLE fee_class_settings ALTER COLUMN session DROP DEFAULT').catch(() => {})
    for (const tableName of ['fee_class_settings', 'fee_discount_packages', 'fee_discount_applications']) {
      await client.query(`ALTER TABLE ${tableName} ALTER COLUMN school_id DROP DEFAULT`).catch(() => {})
    }

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
