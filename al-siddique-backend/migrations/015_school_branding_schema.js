/**
 * Migration 015: canonical school branding mirror columns.
 * Keeps tenant_branding and schools in sync without runtime schema assumptions.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_name VARCHAR(255);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS primary_color VARCHAR(40);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(40);
      CREATE UNIQUE INDEX IF NOT EXISTS schools_tenant_id_unique ON schools(tenant_id) WHERE tenant_id IS NOT NULL;
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
