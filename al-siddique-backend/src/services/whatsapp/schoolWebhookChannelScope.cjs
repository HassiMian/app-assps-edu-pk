'use strict'
/** Preflight ALL inbound Meta change objects before any event is stored.
 * HMAC authenticates an app, not which of the app's phone numbers the event
 * represents. A school gateway must never ingest another number's events.
 * No providers, brokers, credentials, database or network involved here.
 */
function inspectSchoolWebhookChanges(payload, expectedPhoneId) {
  const values = []
  const entries = Array.isArray(payload?.entry) ? payload.entry : []
  for (const entry of entries) {
    for (const change of (Array.isArray(entry?.changes) ? entry.changes : [])) {
      const value = change?.value
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue
      values.push(value)
    }
  }
  const hasEvents = values.some(value =>
    (Array.isArray(value.messages) && value.messages.length > 0) ||
    (Array.isArray(value.statuses) && value.statuses.length > 0))
  if (!hasEvents) return {ok:true, values, reason:null}
  const approved = String(expectedPhoneId || '').trim()
  if (!approved) return {ok:false, values:[], reason:'SCHOOL_PHONE_SCOPE_NOT_CONFIGURED'}
  const invalid = values.some(value => {
    const hasRecords=(Array.isArray(value.messages) && value.messages.length > 0) ||
                     (Array.isArray(value.statuses) && value.statuses.length > 0)
    return hasRecords && String(value.metadata?.phone_number_id || '').trim() !== approved
  })
  if (invalid) return {ok:false,values:[],reason:'SCHOOL_PHONE_SCOPE_MISMATCH'}
  return {ok:true, values, reason:null}
}
module.exports = {inspectSchoolWebhookChanges}
