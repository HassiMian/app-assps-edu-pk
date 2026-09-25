/**
 * Reactive Event Bus for Cross-Module Attendance Synchronization
 * Automatically notifies Dashboard and Analytics cards when attendance is marked anywhere.
 */

const EVENT_NAME = 'saas:attendance-updated'

export function emitAttendanceUpdated(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }))
  }
}

export function onAttendanceUpdated(callback) {
  if (typeof window === 'undefined') return () => {}

  const handler = (event) => {
    try {
      callback(event.detail)
    } catch (err) {
      console.error('Error handling attendance update event:', err)
    }
  }

  window.addEventListener(EVENT_NAME, handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
  }
}
