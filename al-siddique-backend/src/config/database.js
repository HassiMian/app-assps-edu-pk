// src/config/database.js
// Al Siddique Smart School OS — PostgreSQL Connection

require('dotenv').config({ path: __dirname + '/../.env' })
const { Pool } = require('pg')
const { AsyncLocalStorage } = require('async_hooks')
const crypto = require('node:crypto')

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

// Separate database LOGIN: unlike SET ROLE from a BYPASSRLS login, this
// connection cannot escape RLS by RESET ROLE. Feature-gated per request and
// deliberately not used by fees, attendance, authentication, or other SaaS.
const paperRestrictedMode = process.env.PAPER_RESTRICTED_DB_ENABLED === 'true'
const paperRestrictedRole = 'apex_paper_runtime'
const restrictedPaperPool = paperRestrictedMode ? (() => {
  const user = String(process.env.PAPER_RESTRICTED_DB_USER || '').trim()
  const password = String(process.env.PAPER_RESTRICTED_DB_PASSWORD || '')
  if (!user || !password || user === process.env.DB_USER || user === 'postgres') {
    throw new Error('PAPER_RESTRICTED_DB_CONFIG_REQUIRED: distinct unprivileged database login and password are mandatory')
  }
  return new Pool({
    host: process.env.PAPER_RESTRICTED_DB_HOST || envOrDev('DB_HOST', 'localhost'),
    port: Number(process.env.PAPER_RESTRICTED_DB_PORT || envOrDev('DB_PORT', 5432)),
    database: envOrDev('DB_NAME', 'alsiddique_db'), user, password,
    max: Math.min(5, Number(process.env.PAPER_RESTRICTED_DB_POOL_MAX || 4)),
    connectionTimeoutMillis: 2500, idleTimeoutMillis: 20000,
  })
})() : null

// Last-resort fail-closed protection for legacy consumers which have not yet
// been migrated to an authenticated Paper scope. This is a *defense in depth*
// application guard, NOT a substitute for database-enforced RLS.
const PROTECTED_PAPER_RELATIONS = /\b(?:paper_vault|paper_vault_revision_history|paper_documents|paper_revisions|saved_papers|question_bank|question_bank_imports|question_masters|question_revisions|question_capture_requests|question_mappings|assessment_papers|assessment_paper_revisions|assessment_releases|assessment_print_jobs|assessment_roster_snapshots|assessment_result_records|assessment_result_revisions|curriculum_profiles|curriculum_profile_versions|curriculum_migration_plans|subject_offerings|learning_scope_identities|learning_scope_versions|resource_scope_mappings|teacher_class_assignments)\b/i
function rejectUnscopedProtectedSql(input) {
  if (!paperRestrictedMode || isRestrictedPaperRequest()) return
  const sql = typeof input === 'string' ? input : (typeof input?.text === 'string' ? input.text : '')
  if (!PROTECTED_PAPER_RELATIONS.test(sql)) return
  const err = new Error('Protected Paper/Question/Curriculum table requires signed school context')
  err.code = 'PAPER_RESTRICTED_SCOPE_REQUIRED'
  err.status = 503
  throw err
}

function isRestrictedPaperRequest() {
  return Boolean(paperRestrictedMode && tenantContext.getStore()?.paperRestricted)
}

// One transaction per connection lease, all GUCs LOCAL. Caller-supplied SQL
// cannot make the pool silently fall back to the privileged SaaS login.
async function connectRestrictedPaper() {
  const context = normalizedRuntimeContext()
  if (!context || !context.tenantId || context.isSuperAdmin) {
    const err = new Error('Restricted paper database requires an authenticated, selected school')
    err.code = 'PAPER_TENANT_CONTEXT_REQUIRED'
    throw err
  }
  const signingKey = String(process.env.PAPER_RESTRICTED_SIGNING_KEY || '')
  if (signingKey.length < 32) throw new Error('PAPER_SIGNING_KEY_REQUIRED')
  const actorId = Number(tenantContext.getStore()?.paperActorId)
  const actorRole = String(tenantContext.getStore()?.paperActorRole || '')
  if (!Number.isSafeInteger(actorId) || actorId <= 0 ||
      !['teacher','principal','admin','school_admin','super_admin','result_entry'].includes(actorRole)) {
    throw new Error('PAPER_SIGNED_ACTOR_REQUIRED')
  }
  const raw = await restrictedPaperPool.connect()
  let open = false
  let released = false
  try {
    const identity = (await raw.query(`
      SELECT current_user AS db_login, rolbypassrls AS bypass,
             rolsuper AS privileged, rolinherit AS inherited,
             pg_has_role(current_user, 'apex_paper_runtime', 'SET') AS can_set_paper,
             pg_has_role(current_user, 'apex_app_runtime', 'SET') AS can_set_app,
             has_table_privilege(current_user, 'public.paper_vault', 'SELECT') AS direct_vault,
             has_table_privilege(current_user, 'public.question_bank', 'SELECT') AS direct_bank,
             (SELECT count(*)::int FROM pg_auth_members m
                WHERE m.member = (SELECT oid FROM pg_roles WHERE rolname=current_user)
                  AND m.roleid <> 'apex_paper_runtime'::regrole) AS other_memberships
      FROM pg_roles WHERE rolname=current_user
    `)).rows[0]
    if (!identity || identity.db_login !== process.env.PAPER_RESTRICTED_DB_USER ||
        identity.bypass || identity.privileged || identity.inherited ||
        !identity.can_set_paper || identity.can_set_app ||
        identity.direct_vault || identity.direct_bank || Number(identity.other_memberships)!==0) {
      throw new Error('PAPER_DB_LOGIN_HAS_UNSAFE_ROLE_OR_PRIVILEGES')
    }
    await raw.query('BEGIN')
    open = true
    await raw.query(`SET LOCAL ROLE "${paperRestrictedRole}"`)
    const expires = String(Math.floor(Date.now() / 1000) + 60)
    const nonce = crypto.randomBytes(16).toString('hex')
    const xid = String((await raw.query('SELECT txid_current()::text AS xid')).rows[0].xid)
    const signed = `${context.tenantId}|${process.env.PAPER_RESTRICTED_DB_USER}|${actorId}|${actorRole}|${expires}|${nonce}|${xid}`
    const signature = crypto.createHmac('sha256', signingKey).update(signed).digest('hex')
    await raw.query(
      "SELECT set_config('app.rls_enabled','true',true), set_config('app.is_super_admin','false',true), set_config('app.tenant_id',$1,true), set_config('app.tenant_key',$2,true), set_config('app.paper_rls_exp',$3,true), set_config('app.paper_rls_nonce',$4,true), set_config('app.paper_rls_sig',$5,true), set_config('app.paper_actor_id',$6,true), set_config('app.paper_actor_role',$7,true)",
      [context.tenantId, context.tenantKey, expires, nonce, signature, String(actorId), actorRole]
    )
    const state = (await raw.query("SELECT current_user AS active_role, row_security_active('public.question_bank'::regclass) AS rls_active")).rows[0]
    if (state?.active_role !== paperRestrictedRole || state?.rls_active !== true) {
      throw new Error('PAPER_RESTRICTED_ROLE_RLS_INACTIVE')
    }
  } catch (err) {
    if (open) await raw.query('ROLLBACK').catch(() => {})
    raw.release()
    throw err
  }
  // Several existing Paper Vault services explicitly BEGIN/COMMIT/ROLLBACK.
  // BEGIN is already issued by this boundary, and COMMIT/ROLLBACK remain real.
  return {
    async query(...args) {
      const command = typeof args[0] === 'string' ? args[0].trim().replace(/;$/, '').toUpperCase() : ''
      if (command === 'BEGIN') return { rows: [], rowCount: null, command: 'BEGIN' }
      if (!open) throw new Error('PAPER_DB_TRANSACTION_ALREADY_CLOSED')
      if (command === 'COMMIT' || command === 'ROLLBACK') {
        try { return await raw.query(command) } finally { open = false }
      }
      return raw.query(...args)
    },
    async release(releaseError) {
      if (released) return
      released = true
      if (open) await raw.query('ROLLBACK').catch(() => {})
      raw.release(releaseError)
    },
  }
}

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
  if (isRestrictedPaperRequest()) return connectRestrictedPaper()
  const client = await rawPool.connect()
  try {
    const prepared = await prepareRuntimeClient(client)
    if (paperRestrictedMode) {
      const queryRaw = prepared.query.bind(prepared)
      prepared.query = (sql, ...args) => {
        rejectUnscopedProtectedSql(sql)
        return queryRaw(sql, ...args)
      }
    }
    return prepared
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
    if (property === 'end') return async () => {
      if (restrictedPaperPool) await restrictedPaperPool.end()
      return target.end()
    }
    if (property === 'query') {
      return async (...args) => {
        rejectUnscopedProtectedSql(args[0])
        const client = await connectForContext()
        try {
          const result = await client.query(...args)
          if (isRestrictedPaperRequest()) await client.query('COMMIT')
          return result
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
  isRestrictedPaperRequest,
  rejectUnscopedProtectedSql,
  connectRestrictedPaper,
}
