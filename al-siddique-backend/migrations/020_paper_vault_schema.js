/**
 * Migration 020: canonical Paper Vault schema.
 * Request handlers may validate readiness, but must never mutate schema.
 */
const { pool } = require('../src/config/database')
const fs = require('node:fs')
const path = require('node:path')

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
    await client.query('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE paper_vault TO apex_paper_runtime')
    await client.query('GRANT USAGE, SELECT ON SEQUENCE paper_vault_id_seq TO apex_paper_runtime')
    // Immutable V6-D audit journal is created and granted only at release migration.
    await client.query(fs.readFileSync(path.join(__dirname, '../src/migrations/20261005_paper_vault_revision_history.sql'), 'utf8'))
    // DB-level invariant: history school_id and referenced paper.school_id must match.
    // Fail migration rather than silently changing any existing mismatched audit rows.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS paper_vault_school_id_id_uidx
        ON paper_vault(school_id, id);
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
           WHERE conrelid='public.paper_vault_revision_history'::regclass
             AND conname='paper_vault_history_school_paper_fk'
        ) THEN
          ALTER TABLE paper_vault_revision_history
            ADD CONSTRAINT paper_vault_history_school_paper_fk
            FOREIGN KEY (school_id, paper_id)
            REFERENCES paper_vault(school_id, id) ON DELETE CASCADE;
        END IF;
      END $$;
    `)

    await client.query('GRANT SELECT, INSERT ON TABLE paper_vault_revision_history TO apex_paper_runtime')
    const teacherAssignments = await client.query("SELECT to_regclass('public.teacher_class_assignments') AS name")
    if (teacherAssignments.rows[0]?.name) {
      await client.query('GRANT SELECT ON TABLE teacher_class_assignments TO apex_paper_runtime')
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
