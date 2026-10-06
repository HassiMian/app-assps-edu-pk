import api from '../../../../services/api.js'

const data = response => response?.data?.data ?? response?.data ?? null

export async function createRosterSnapshot(payload) {
  return data(await api.post('/api/assessment-print/roster-snapshots', payload))
}

export async function createTeacherBindingSnapshot(payload) {
  return data(await api.post('/api/assessment-print/teacher-bindings', payload))
}

export async function createPersonalizedPrintJob(payload) {
  return data(await api.post('/api/assessment-print/jobs', payload))
}

export async function freezeBookletPlan(printJobPublicId, pageCounts) {
  return data(await api.post('/api/assessment-print/jobs/' + encodeURIComponent(printJobPublicId) + '/booklets', { pageCounts }))
}

export async function recordPrintAttempt(printJobPublicId, { operatorConfirmed=false, note='' } = {}) {
  return data(await api.post('/api/assessment-print/jobs/' + encodeURIComponent(printJobPublicId) + '/attempts', { operatorConfirmed, note }))
}
