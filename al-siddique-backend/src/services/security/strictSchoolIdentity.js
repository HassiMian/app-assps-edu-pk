'use strict'

// A school ID is an authoritative positive integer, never a numeric prefix.
// Keep this identical in authentication and tenant-scoped query generation.
function strictPositiveSchoolId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }
  if (typeof value === 'string' && /^[1-9][0-9]*$/.test(value.trim())) {
    const parsed = Number(value.trim())
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  return null
}

module.exports = { strictPositiveSchoolId }
