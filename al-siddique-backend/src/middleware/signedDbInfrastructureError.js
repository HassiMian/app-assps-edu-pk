'use strict'
// An authenticated request can reach a fail-closed database gate and be denied
// *without* an invalid JWT. Do not mutate credentials or claim the user logged out.
// The error is a transient SERVICE failure, not an auth challenge.
const SERVER_INFRASTRUCTURE_ERRORS = new Set([
  'DB_SIGNED_RLS_CATALOG_INCOMPLETE',
  'DB_RUNTIME_ROLE_REQUIRED',
  'DB_RUNTIME_ROLE_UNSAFE',
  'DB_PRIVILEGED_LOGIN_REJECTED',
])
const isSignedDatabaseInfrastructureError = (err) =>
  !!err && typeof err.code === 'string' && SERVER_INFRASTRUCTURE_ERRORS.has(err.code)
module.exports = { isSignedDatabaseInfrastructureError }
