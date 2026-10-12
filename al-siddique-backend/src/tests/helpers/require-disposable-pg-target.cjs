'use strict'
/**
 * Fail closed BEFORE loading a PostgreSQL Pool or contacting an HTTP server.
 * Applies to old high-risk attendance/admissions/fee QA that modifies fixtures.
 * Production data copies are NOT acceptable targets for these suites.
 */
function validateDisposableTarget(expectedDatabase, {httpVariable = null} = {}, env = process.env) {
  const fail = () => {
    const error = new Error('MUTATING_SCHOOL_QA_REFUSED: isolated disposable target and explicit operator signoff required')
    error.code = 'ASSPS_MUTATING_QA_NOT_AUTHORIZED'
    throw error
  }
  if (env.NODE_ENV !== 'test' || env.ASSPS_ISOLATED_TEST_AUTHORIZED !== 'YES_DISPOSABLE_CLONE') fail()
  if (!/^[a-z0-9_]+$/.test(expectedDatabase) || !expectedDatabase.startsWith('assps_')) fail()
  if (env.DB_NAME !== expectedDatabase || String(env.DB_PORT) !== '55432') fail()
  if (!['127.0.0.1', 'localhost'].includes(String(env.DB_HOST))) fail()
  if (env.DATABASE_URL || env.PGHOST || env.PGPORT || env.PGDATABASE) fail()
  if (httpVariable) {
    const value=env[httpVariable]
    if (!value || !/^http:\/\/127\.0\.0\.1:5[4-5][0-9]{2}(?:\/$)?$/.test(value)) fail()
    if (value.includes(':5000') || value.includes(':5091')) fail()
  }
  return {authorized:true, database:expectedDatabase, port:55432}
}
module.exports = {validateDisposableTarget}
