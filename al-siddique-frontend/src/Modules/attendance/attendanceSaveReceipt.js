// Never report successful attendance merely because an HTTP request resolved.
// Backend confirms both saved and requested row counts after its transaction commit.
export function validateAttendanceSaveReceipt(data, expectedCount) {
  return Number.isSafeInteger(expectedCount) && expectedCount > 0 &&
    data?.success === true &&
    Number.isSafeInteger(data.savedCount) && data.savedCount === expectedCount &&
    Number.isSafeInteger(data.requestedCount) && data.requestedCount === expectedCount
}

// Provider-accepted is NOT delivered. Failed / not-configured / skipped are excluded.
export function countAcceptedAttendanceAlerts(summary) {
  if (!summary || typeof summary !== 'object') return 0
  return ['queued','accepted','sent'].reduce((sum,key) => {
    const value = summary[key]
    return sum + (Number.isSafeInteger(value) && value > 0 ? value : 0)
  },0)
}
