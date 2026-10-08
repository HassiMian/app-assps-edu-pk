// src/config/database.js
// Al Siddique Smart School OS — PostgreSQL Connection

require('dotenv').config({ path: __dirname + '/../.env' })
const { Pool } = require('pg')
const { AsyncLocalStorage } = require('async_hooks')

function envOrDev(name, fallback) {
  const value = process.env[name]
  if (value && String(value).trim()) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`)
  }
  return fallback
}

const rawPool = new Pool({
  host:     envOrDev('DB_HOST', 'localhost'),
  port:     Number(envOrDev('DB_PORT', 5432)),
  database: envOrDev('DB_NAME', 'alsiddique_db'),
  user:     envOrDev('DB_USER', 'postgres'),
  password: envOrDev('DB_PASSWORD', ''),
  max:      Number(envOrDev('DB_POOL_MAX', 20)),
  idleTimeoutMillis:    Number(envOrDev('DB_POOL_IDLE_TIMEOUT', 30000)),
  connectionTimeoutMillis: Number(envOrDev('DB_POOL_CONNECTION_TIMEOUT', 2000)),
})

// Test the login role before request-scoped role switching is introduced.
if (process.env.DB_STARTUP_PROBE !== 'false') rawPool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL Connection Failed:', err.message || err)
    console.error('   Check: DB_HOST, DB_USER, DB_PASSWORD in .env and ensure PostgreSQL is running on port 5432')
  } else {
    console.log('✅ PostgreSQL Connected — alsiddique_db')
    release()
  }
})

const tenantContext = new AsyncLocalStorage()
const ROLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function configuredRuntimeRole() {
  const value = String(process.env.DB_RUNTIME_ROLE || '').trim()
  if (!value) return null
  if (!ROLE_NAME_PATTERN.test(value)) {
    const error = new Error('DB_RUNTIME_ROLE contains an invalid PostgreSQL role identifier.')
    error.code = 'DB_RUNTIME_ROLE_INVALID'
    throw error
  }
  return value
}

function normalizedRuntimeContext(context = tenantContext.getStore()) {
  if (!context || !context.rlsEnabled) return null
  const isSuperAdmin = Boolean(context.isSuperAdmin)
  const tenantId = Number.parseInt(context.tenantId, 10)
  if (!isSuperAdmin && (!Number.isInteger(tenantId) || tenantId <= 0)) {
    const error = new Error('Authenticated database access requires an explicit school context.')
    error.code = 'TENANT_CONTEXT_REQUIRED'
    throw error
  }
  return {
    isSuperAdmin,
    tenantId: isSuperAdmin ? '' : String(tenantId),
    tenantKey: isSuperAdmin ? '' : String(context.tenantKey || '').trim(),
  }
}

async function resetRuntimeSession(client) {
  try {
    await client.query(
      "SELECT set_config('app.rls_enabled', 'false', false), set_config('app.is_super_admin', 'false', false), set_config('app.tenant_id', '', false), set_config('app.tenant_key', '', false)"
    )
  } catch (_) {}
  try {
    await client.query('RESET ROLE')
  } catch (_) {}
}

async function prepareRuntimeClient(client) {
  const role = configuredRuntimeRole()
  const context = normalizedRuntimeContext()
  if (!role || !context) return client

  try {
    await client.query(`SET ROLE "${role}"`)
    await client.query(
      "SELECT set_config('app.rls_enabled', 'true', false), set_config('app.is_super_admin', $1, false), set_config('app.tenant_id', $2, false), set_config('app.tenant_key', $3, false)",
      [context.isSuperAdmin ? 'true' : 'false', context.tenantId, context.tenantKey]
    )
  } catch (error) {
    await resetRuntimeSession(client)
    throw error
  }

  const releaseRaw = client.release.bind(client)
  let released = false
  client.release = async (releaseError) => {
    if (released) return
    released = true
    await resetRuntimeSession(client)
    releaseRaw(releaseError)
  }
  return client
}

async function connectForContext() {
  const client = await rawPool.connect()
  try {
    // Independent non-BYPASS LOGIN requirement. Opt-in until all bootstrap,
    // service, super-admin and legacy paths pass isolated acceptance.
    // SET ROLE alone is insufficient when the underlying LOGIN can RESET ROLE
    // to BYPASSRLS. There is NO fallback to privileged mode on failure.
    if (process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN === 'true') {
      if (!configuredRuntimeRole()) {
        const error = new Error('Restricted runtime role required by database security gate')
        error.code = 'DB_RUNTIME_ROLE_REQUIRED'
        throw error
      }
      const login = await client.query(
        'SELECT current_user AS login_name, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user'
      )
      if (login.rows.length !== 1 || login.rows[0].rolsuper || login.rows[0].rolbypassrls) {
        const error = new Error('Privileged database login rejected by security gate')
        error.code = 'DB_PRIVILEGED_LOGIN_REJECTED'
        throw error
      }
    }
    return await prepareRuntimeClient(client)
  } catch (error) {
    client.release()
    throw error
  }
}

// Expose a pool-compatible facade. All authenticated callers pass through the
// restricted runtime role while unauthenticated bootstrap/auth lookups keep the
// login role. Callback-style pool usage is intentionally unsupported in src.
const pool = new Proxy(rawPool, {
  get(target, property) {
    if (property === 'connect') return connectForContext
    if (property === 'query') {
      return async (...args) => {
        const client = await connectForContext()
        try {
          return await client.query(...args)
        } finally {
          await client.release()
        }
      }
    }
    const value = Reflect.get(target, property, target)
    return typeof value === 'function' ? value.bind(target) : value
  },
})

async function applyTenantContext(client) {
  const context = normalizedRuntimeContext()
  if (!context) return false

  await client.query(`SELECT set_config('app.rls_enabled', 'true', true)`)
  await client.query(`SELECT set_config('app.is_super_admin', $1, true)`, [context.isSuperAdmin ? 'true' : 'false'])
  await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [context.tenantId])
  await client.query(`SELECT set_config('app.tenant_key', $1, true)`, [context.tenantKey])
  return true
}

// Helper: simple query
async function query(text, params) {
  const start = Date.now()
  const context = tenantContext.getStore()

  if (context && context.rlsEnabled) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await applyTenantContext(client)

      const res = await client.query(text, params)
      await client.query('COMMIT')

      const duration = Date.now() - start
      if (process.env.NODE_ENV === 'development') {
        console.log('DB Query (RLS):', { text: text.slice(0, 60), duration: `${duration}ms`, rows: res.rowCount })
      }
      return res
    } catch (err) {
      try { await client.query('ROLLBACK') } catch (_) {}
      console.error('DB Query Error (RLS):', err.message)
      throw err
    } finally {
      await client.release()
    }
  }

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

module.exports = {
  pool,
  query,
  tenantContext,
  applyTenantContext,
  configuredRuntimeRole,
  normalizedRuntimeContext,
}
