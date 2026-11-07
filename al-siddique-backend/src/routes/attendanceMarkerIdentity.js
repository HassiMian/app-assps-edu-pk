'use strict'

// Audit attribution must be derived only from the verified auth middleware identity.
// A client-controlled marked_by field must never override the acting account.
function resolveAuthenticatedAttendanceMarker(user) {
  const raw = user && user.id
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  if (typeof raw === 'string' && !/^[1-9][0-9]*$/.test(raw)) return null
  if (typeof raw === 'number' && !Number.isSafeInteger(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

module.exports = { resolveAuthenticatedAttendanceMarker }
