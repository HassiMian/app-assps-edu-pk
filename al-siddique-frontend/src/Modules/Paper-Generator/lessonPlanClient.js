import api from '../../services/api'

// Do not treat HTTP 200, a missing body, or { success:false } as persistence.
const confirmedBody = (response, operation = 'Lesson Planning') => {
  const body = response?.data
  if (!body || body.success !== true) {
    throw new Error(body?.message || `${operation} was not confirmed by the server.`)
  }
  return body
}
const unwrap = response => confirmedBody(response).data

const confirmedPlan = (data, requestedId, previousRevision = 0) => {
  if (!data?.id || !Number.isInteger(Number(data.serverRevision))
    || Number(data.serverRevision) <= previousRevision
    || (requestedId && String(data.id) !== String(requestedId))) {
    throw new Error('Server did not confirm this lesson plan identity and revision.')
  }
  return data
}

export async function listLessonPlans(params = {}) {
  const data = unwrap(await api.get('/api/lesson-plans', { params }))
  if (!Array.isArray(data)) throw new Error('Lesson plan list was not confirmed by the server.')
  return data
}

export async function createLessonPlan(plan) {
  return confirmedPlan(unwrap(await api.post('/api/lesson-plans', plan)), plan?.id)
}

export async function updateLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  return confirmedPlan(unwrap(await api.put('/api/lesson-plans/' + encodeURIComponent(plan.id), {
    ...plan,
    expectedRevision,
  })), plan.id, expectedRevision)
}

export async function deleteLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  const body = confirmedBody(await api.delete('/api/lesson-plans/' + encodeURIComponent(plan.id), {
    params: { expectedRevision },
  }), 'Lesson deletion')
  if (body.deleted !== true || String(body.id) !== String(plan.id)) {
    throw new Error('Lesson deletion was not confirmed by the server.')
  }
  return { deleted:true, id:body.id }
}

export async function shareLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  const response = await api.post('/api/lesson-plans/' + encodeURIComponent(plan.id) + '/share', {
    expectedRevision,
  })
  const body = confirmedBody(response, 'Portal delivery')
  const shared = confirmedPlan(body.data, plan.id, expectedRevision)
  const delivery = body.delivery
  if (shared.sentToPortal !== true
    || !Number.isInteger(delivery?.students) || delivery.students < 0
    || !Number.isInteger(delivery?.notifications) || delivery.notifications < 0) {
    throw new Error('Portal publication or delivery receipt was not verified.')
  }
  return { plan: shared, delivery }
}

export async function getLessonPlanningContext(params = {}) {
  return unwrap(await api.get('/api/lesson-plans/planner/context', { params })) || {}
}

export async function parseLessonPlanningText(text, knownSubjects = []) {
  return unwrap(await api.post('/api/lesson-plans/planner/parse', { text, knownSubjects })) || { subjects:[], unclassified:[] }
}

export async function generateLessonPlanDraft(input) {
  const body = confirmedBody(await api.post('/api/lesson-plans/planner/generate', input))
  return {
    plan: body.data || {},
    analysis: body.analysis || {},
    ai: body.ai || {},
    context: body.context || {},
  }
}
