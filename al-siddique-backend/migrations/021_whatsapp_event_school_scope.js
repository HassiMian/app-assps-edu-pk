/**
 * Migration 021: scope new WhatsApp inbound events to an explicit school.
 * Legacy rows remain nullable because their school identity cannot be safely inferred.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      ALTER TABLE whatsapp_inbound_events
        ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE;

      CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_events_school_created
        ON whatsapp_inbound_events(school_id, created_at DESC)
        WHERE school_id IS NOT NULL;

      ALTER TABLE whatsapp_inbound_events ENABLE ROW LEVEL SECURITY;
      ALTER TABLE whatsapp_inbound_events FORCE ROW LEVEL SECURITY;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'whatsapp_inbound_events'
            AND policyname = 'tenant_isolation_policy'
        ) THEN
          CREATE POLICY tenant_isolation_policy ON whatsapp_inbound_events
          USING (
            current_setting('app.rls_enabled', true) IS DISTINCT FROM 'true'
            OR current_setting('app.is_super_admin', true) = 'true'
            OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::integer
          )
          WITH CHECK (
            current_setting('app.rls_enabled', true) IS DISTINCT FROM 'true'
            OR current_setting('app.is_super_admin', true) = 'true'
            OR school_id = NULLIF(current_setting('app.tenant_id', true), '')::integer
          );
        END IF;
      END $$;
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
