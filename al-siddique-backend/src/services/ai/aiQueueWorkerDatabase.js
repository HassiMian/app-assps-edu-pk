'use strict'
// Dedicated least-privilege database identity for GLOBAL AI queue storage.
// Only paperAiQueue may call this module; generic tenant request SQL never
// inherits AI queue/global directory/audit tables from apex_app_runtime.
// Blue/legacy behaviour stays unchanged unless signed Green is explicitly on.
const { Pool } = require('pg')
// Lazy legacy import: signed worker must not load the broad tenant DB pool.
const legacyQuery = (...args) => require('../../config/database').query(...args)

const signedGreen = process.env.DB_SIGNED_TENANT_RLS_ENABLED === 'true'
let aiPool = null
function validatedConfig(env = process.env) {
  const qa = env.ASSPS_ISOLATED_QA === 'yes' &&
    env.DB_AI_WORKER_PORT === '55477' &&
    env.DB_AI_WORKER_ROLE === 'assps_core_qa_ai_worker'
  const workerRole = qa ? 'assps_core_qa_ai_worker' : 'assps_core_ai_worker'
  const keys = ['DB_AI_WORKER_HOST','DB_AI_WORKER_PORT','DB_AI_WORKER_NAME',
    'DB_AI_WORKER_USER','DB_AI_WORKER_PASSWORD']
  if (keys.some(k => !String(env[k] || '').trim())) {
    throw new Error('AI_QUEUE_WORKER_SEPARATE_IDENTITY_REQUIRED')
  }
  const port = Number(env.DB_AI_WORKER_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('AI_QUEUE_WORKER_PORT_INVALID')
  }
  if (env.DB_AI_WORKER_USER === env.DB_USER ||
      ['postgres','apexos_user','assps_core_green_login'].includes(env.DB_AI_WORKER_USER)) {
    throw new Error('AI_QUEUE_WORKER_IDENTITY_MUST_BE_SEPARATE')
  }
  if (!qa && env.DB_AI_WORKER_ROLE && env.DB_AI_WORKER_ROLE !== workerRole) {
    throw new Error('AI_QUEUE_WORKER_ROLE_NOT_PINNED')
  }
  if (!qa && port === 5432 && env.ASSPS_ISOLATED_QA === 'yes') {
    throw new Error('QA_CANNOT_TOUCH_PRODUCTION')
  }
  return {
    host: env.DB_AI_WORKER_HOST, port, database:env.DB_AI_WORKER_NAME,
    user:env.DB_AI_WORKER_USER, password:env.DB_AI_WORKER_PASSWORD,
    max:3, idleTimeoutMillis:15000, connectionTimeoutMillis:2500,
    statement_timeout:15000, workerRole,
  }
}

async function workerQuery(statement, parameters) {
  if (!signedGreen) return legacyQuery(statement, parameters)
  const config = validatedConfig()
  if (!aiPool) {
    const { workerRole, ...options } = config
    aiPool = new Pool(options)
  }
  const client = await aiPool.connect()
  try {
    // Check the REAL database user and capabilities, never trust an env label.
    // Verify before EVERY queue command to prevent unsafe pool session drift.
    const check = await client.query(
      `SELECT current_user AS actor,
       rolcanlogin AS can_login, rolbypassrls AS bypass, rolsuper AS super,
       pg_has_role(current_user, $1, 'USAGE') AS worker_member,
       has_table_privilege(current_user,'public.ai_jobs','SELECT') AS can_queue,
       has_table_privilege(current_user,'public.organizations','SELECT') AS can_org,
       has_table_privilege(current_user,'public.campuses','SELECT') AS can_campus,
       has_table_privilege(current_user,'public.admin_block_audit_log','SELECT') AS can_audit
       FROM pg_roles WHERE rolname=current_user`, [config.workerRole])
    const identity=check.rows[0]
    if (!identity || identity.actor!==config.user ||
        identity.bypass || identity.super || !identity.can_login ||
        !identity.worker_member || !identity.can_queue ||
        identity.can_org || identity.can_campus || identity.can_audit) {
      throw new Error('AI_QUEUE_WORKER_DATABASE_PRIVILEGES_NOT_ISOLATED')
    }
    return await client.query(statement, parameters)
  } finally {
    client.release()
  }
}

module.exports = {
  query:workerQuery,
  ...(process.env.NODE_ENV === 'test' ? {__test:{validatedConfig}} : {}),
}
