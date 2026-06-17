// src/config/database.js
// Al Siddique Smart School OS — PostgreSQL Connection

require('dotenv').config({ path: __dirname + '/../.env' })
const { Pool } = require('pg')

function envOrDev(name, fallback) {
  const value = process.env[name]
  if (value && String(value).trim()) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`)
  }
  return fallback
}

const pool = new Pool({
  host:     envOrDev('DB_HOST', 'localhost'),
  port:     Number(envOrDev('DB_PORT', 5432)),
  database: envOrDev('DB_NAME', 'alsiddique_db'),
  user:     envOrDev('DB_USER', 'postgres'),
  password: envOrDev('DB_PASSWORD', 'admin123'),
  max:      Number(envOrDev('DB_POOL_MAX', 20)),
  idleTimeoutMillis:    Number(envOrDev('DB_POOL_IDLE_TIMEOUT', 30000)),
  connectionTimeoutMillis: Number(envOrDev('DB_POOL_CONNECTION_TIMEOUT', 2000)),
})

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL Connection Failed:', err.message || err)
    console.error('   Check: DB_HOST, DB_USER, DB_PASSWORD in .env and ensure PostgreSQL is running on port 5432')

  } else {
    console.log('✅ PostgreSQL Connected — alsiddique_db')
    release()
  }
})

const { AsyncLocalStorage } = require('async_hooks');
const tenantContext = new AsyncLocalStorage();

// Helper: simple query
async function query(text, params) {
  const start = Date.now()
  const context = tenantContext.getStore()

  if (context && context.rlsEnabled) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`SELECT set_config('app.rls_enabled', 'true', true)`)
      
      if (context.isSuperAdmin) {
        await client.query(`SELECT set_config('app.is_super_admin', 'true', true)`)
      } else if (context.tenantId) {
        await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [context.tenantId])
        await client.query(`SELECT set_config('app.is_super_admin', 'false', true)`)
      }

      const res = await client.query(text, params)
      await client.query('COMMIT')
      
      const duration = Date.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.log('DB Query (RLS):', { text: text.slice(0, 60), duration: `${duration}ms`, rows: res.rowCount })
      }
      return res
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('DB Query Error (RLS):', err.message)
      throw err
    } finally {
      client.release()
    }
  } else {
    try {
      const res = await pool.query(text, params)
      const duration = Date.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.log('DB Query:', { text: text.slice(0, 60), duration: `${duration}ms`, rows: res.rowCount })
      }
      return res
    } catch (err) {
      console.error('DB Query Error:', err.message)
      throw err
    }
  }
}

module.exports = { pool, query, tenantContext }
