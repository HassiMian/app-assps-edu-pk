/**
 * Migration 010: settings, branding, and organization/campus identity hierarchy.
 * Centralizes schema ownership that previously lived inside request handlers.
 */
const { pool } = require('../src/config/database')

async function up(options = {}) {
  const dbPool = options.pool || pool
  const client = await dbPool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        school_id INTEGER,
        school_name VARCHAR(255) NOT NULL,
        school_address TEXT,
        school_phone VARCHAR(50),
        school_email VARCHAR(255),
        principal_name VARCHAR(255),
        academic_year VARCHAR(10),
        fee_due_date VARCHAR(10),
        attendance_threshold VARCHAR(10),
        school_logo TEXT,
        twilio_config JSONB DEFAULT '{}'::jsonb,
        school_urdu TEXT,
        show_urdu_on_login BOOLEAN DEFAULT FALSE,
        module_access JSONB DEFAULT '{}'::jsonb,
        school_access JSONB DEFAULT '[]'::jsonb,
        superapp_modules JSONB DEFAULT '{}'::jsonb,
        branding_config JSONB DEFAULT '{}'::jsonb,
        academic_setup JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE settings ALTER COLUMN school_id DROP DEFAULT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS school_logo TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS twilio_config JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS school_urdu TEXT;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS show_urdu_on_login BOOLEAN DEFAULT FALSE;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS module_access JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS school_access JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS superapp_modules JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS academic_setup JSONB DEFAULT '{}'::jsonb;
      CREATE UNIQUE INDEX IF NOT EXISTS settings_school_id_unique ON settings (school_id);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER,
        name VARCHAR(255) NOT NULL DEFAULT 'Default Organization',
        branding_payload JSONB DEFAULT '{}'::jsonb,
        ai_settings JSONB DEFAULT '{}'::jsonb,
        subscription_tier VARCHAR(50) DEFAULT 'enterprise',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS campuses (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) UNIQUE,
        principal_id INTEGER,
        campus_branding JSONB DEFAULT '{}'::jsonb,
        module_access JSONB DEFAULT '{}'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id INTEGER REFERENCES organizations(id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_id INTEGER REFERENCES campuses(id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 4;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_branding (
        id TEXT PRIMARY KEY,
        tenant_id VARCHAR(120) UNIQUE NOT NULL,
        logo_url TEXT,
        primary_color VARCHAR(40),
        secondary_color VARCHAR(40),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS tenant_branding_tenant_id_idx ON tenant_branding (tenant_id);
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
