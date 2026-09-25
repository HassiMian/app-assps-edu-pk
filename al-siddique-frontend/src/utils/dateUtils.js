/**
 * Timezone-aware date utilities for Pakistan Standard Time (PKT, Asia/Karachi, UTC+5)
 * Prevents UTC midnight rollover bugs between 12:00 AM and 5:00 AM PKT.
 */

export function getPakistanDateString(d = new Date()) {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj)
  } catch {
    return (d instanceof Date ? d : new Date()).toISOString().slice(0, 10)
  }
}

export function formatPakistanDateDisplay(d = new Date(), format = 'long') {
  try {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    if (format === 'long') {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Karachi',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(dateObj)
    }
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dateObj)
  } catch {
    return (d instanceof Date ? d : new Date()).toLocaleDateString()
  }
}

export function isTodayInPakistan(dateStr) {
  if (!dateStr) return false
  return dateStr === getPakistanDateString()
}
