/**
 * Migration 020: Paper Vault base schema.
 * Request routes must never create or mutate this schema on demand.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      CREATE TABLE IF NOT EXISTS paper_vault (
        id BIGSERIAL PRIMARY KEY,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(220) NOT NULL,
        class_name VARCHAR(120),
        section VARCHAR(60),
        subject_name VARCHAR(160),
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        revision INTEGER NOT NULL DEFAULT 1,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_paper_vault_school_updated
        ON paper_vault(school_id, updated_at DESC)
        WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_paper_vault_owner_updated
        ON paper_vault(school_id, owner_user_id, updated_at DESC)
        WHERE deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_paper_vault_class_subject
        ON paper_vault(school_id, LOWER(COALESCE(class_name,'')), LOWER(COALESCE(subject_name,'')))
        WHERE deleted_at IS NULL;
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
