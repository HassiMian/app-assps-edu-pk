import api from '../../../../services/api.js'

const unwrap = response => response?.data?.data ?? response?.data ?? null

export async function fetchActivePrintRosterStudents() {
  const response = await api.get('/api/students', { params: { active: 'true' } })
  const payload = unwrap(response)
  return Array.isArray(payload) ? payload : []
}

export async function createAssessmentPrintJob({
  paperId,
  releaseId,
  roster,
  teacherBinding = {},
  renderSettings = {},
  personalized = false,
  reprintMode = 'NEW_JOB',
  parentPrintJobId = null,
  printJobId = null,
}) {
  if (!paperId) throw new Error('paperId is required for print job creation')
  const response = await api.post(
    '/api/assessment-studio/papers/' + encodeURIComponent(paperId) + '/print-jobs',
    {
      ...(printJobId ? { printJobId } : {}),
      releaseId,
      roster,
      teacherBinding,
      renderSettings,
      personalized,
      reprintMode,
      parentPrintJobId,
    },
  )
  return unwrap(response)
}

export async function getAssessmentPrintJob(printJobId) {
  return unwrap(await api.get('/api/assessment-studio/print-jobs/' + encodeURIComponent(printJobId)))
}

export async function transitionAssessmentPrintJob(printJobId, status, lastError = null) {
  return unwrap(await api.patch(
    '/api/assessment-studio/print-jobs/' + encodeURIComponent(printJobId) + '/status',
    { status, ...(lastError ? { lastError } : {}) },
  ))
}
