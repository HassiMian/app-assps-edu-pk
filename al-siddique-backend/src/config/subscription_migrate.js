// src/config/subscription_migrate.js
// APEX Gateway + Onboarding DB Schema Migration

const { pool } = require('./database')

async function migrateSubscriptionSchema() {
  console.log('\nRunning APEX Subscription database migration...\n')
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_requests (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(50) UNIQUE NOT NULL,
        tenant_id VARCHAR(80),
        owner_name VARCHAR(100) NOT NULL,
        school_name VARCHAR(150) NOT NULL,
        school_address TEXT,
        contact_number VARCHAR(20),
        email VARCHAR(100) NOT NULL,
        city VARCHAR(50),
        plan_id VARCHAR(80),
        plan_name VARCHAR(100),
        plan_price INTEGER,
        selected_plan VARCHAR(30) NOT NULL,
        billing_cycle VARCHAR(20) NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        transaction_id VARCHAR(80),
        payment_screenshot_url TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (LOWER(status) IN ('pending','approved','rejected')),
        rejection_reason TEXT,
        approved_at TIMESTAMP,
        created_school_id INTEGER,
        created_admin_user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS created_school_id INTEGER;
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS created_admin_user_id INTEGER;
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_id VARCHAR(80);
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100);
      ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS plan_price INTEGER;
      CREATE INDEX IF NOT EXISTS idx_subscription_requests_status ON subscription_requests(status);
      CREATE INDEX IF NOT EXISTS idx_subscription_requests_email ON subscription_requests(email);
    `)
    console.log('Subscription requests table verified.')

    await client.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80) UNIQUE;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS school_name VARCHAR(150);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS email VARCHAR(100);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS city VARCHAR(80);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20);
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'pending';
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP;
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_schools_tenant_id ON schools(tenant_id);
    `)

    await client.query(`
      UPDATE schools
      SET tenant_id = COALESCE(tenant_id, code, 'school-' || id),
          school_name = COALESCE(school_name, name),
          subscription_status = COALESCE(subscription_status, 'pending')
      WHERE tenant_id IS NULL OR school_name IS NULL OR subscription_status IS NULL;
    `)
    console.log('Schools table tenant/subscription columns verified.')

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `)

    await client.query(`
      UPDATE users u
      SET tenant_id = COALESCE(u.tenant_id, (SELECT s.tenant_id FROM schools s WHERE s.id = u.school_id), 'default')
      WHERE u.tenant_id IS NULL;
    `)

    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
        role IN ('super_admin','school_admin','admin','principal','teacher','accountant','parent','student')
      );
    `).catch((err) => {
      console.warn('Could not update users_role_check constraint:', err.message)
    })
    console.log('Users table tenant columns verified.')

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(80) NOT NULL,
        invoice_number VARCHAR(80) UNIQUE NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        plan VARCHAR(30) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(80),
        request_id VARCHAR(80),
        transaction_id VARCHAR(80),
        payment_method VARCHAR(30) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        screenshot_url TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
    `)
    console.log('Invoices and payments tables verified.')

    const tenantTables = [
      'students', 'parents', 'employees', 'fee_challans', 'fees', 'exams', 'exam_results',
      'daily_diary', 'homework', 'transport', 'question_bank', 'questions', 'paper_jobs',
      'attendance', 'notices', 'events', 'admissions'
    ]

    for (const table of tenantTables) {
      const exists = await client.query('SELECT to_regclass($1) AS table_name', [`public.${table}`])
      if (!exists.rows[0]?.table_name) continue

      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(80);`)
      const hasSchoolId = await client.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'school_id'
        LIMIT 1
      `, [table])
      if (hasSchoolId.rowCount > 0) {
        await client.query(`
          UPDATE ${table} t
          SET tenant_id = s.tenant_id
          FROM schools s
          WHERE t.tenant_id IS NULL
            AND t.school_id = s.id
        `)
      }
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${table}_tenant_id ON ${table}(tenant_id);`)
    }
    console.log('Tenant columns verified on school operation tables.')

    await client.query('COMMIT')
    console.log('\nSubscription schema migration successfully applied.\n')
    return true
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Subscription migration failed:', err.message)
    throw err
  } finally {
    client.release()
  }
}

module.exports = { migrateSubscriptionSchema }
