// Scoped PostgreSQL client for the ASSPS AI worker.
// Strictly restricted to ai_jobs, ai_queue_events, ai_queue_state; never
// inherits AI queue/global directory/audit tables from apex_app_runtime.
// Blue/legacy behaviour stays unchanged unless signed Green is explicitly on.
const { Pool } = require('pg')
// Lazy legacy import: signed worker must not load the broad tenant DB pool.
const legacyQuery = (...args) => require('../../config/database').query(...args)

const signedGreen = process.env.DB_SIGNED_TENANT_RLS_ENABLED === 'true'
let aiPool = null

function validatedConfig(env = process.env) {
  const host = env.DB_AI_WORKER_HOST || env.DB_HOST || '127.0.0.1'
  const port = Number(env.DB_AI_WORKER_PORT || env.DB_PORT || 5432)
  const database = env.DB_AI_WORKER_NAME || env.DB_NAME || 'apexos'
  const user = env.DB_AI_WORKER_USER || 'assps_ai_worker_login'
  const password = env.DB_AI_WORKER_PASSWORD || env.DB_PASSWORD
  const workerRole = env.DB_AI_WORKER_ROLE || 'assps_core_ai_worker'

  if (!password) {
    throw new Error('AI_WORKER_PASSWORD_REQUIRED: Dedicated SCRAM password missing')
  }

  return {
    host,
    port,
    database,
    user,
    password,
    workerRole,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 3000,
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
    await client.query('BEGIN')
    await client.query(`SET LOCAL ROLE "${config.workerRole}"`)
    const result = await client.query(statement, parameters)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

module.exports = {
  query: workerQuery,
  validatedConfig,
  __resetPoolForTesting: async () => {
    if (aiPool) {
      await aiPool.end().catch(() => {})
      aiPool = null
    }
  },
}
