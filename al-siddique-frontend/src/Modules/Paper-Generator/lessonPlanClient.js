import api from '../../services/api'

const unwrap = response => response?.data?.data ?? response?.data

export async function listLessonPlans(params = {}) {
  return unwrap(await api.get('/api/lesson-plans', { params })) || []
}

export async function createLessonPlan(plan) {
  return unwrap(await api.post('/api/lesson-plans', plan))
}

export async function updateLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  return unwrap(await api.put('/api/lesson-plans/' + encodeURIComponent(plan.id), {
    ...plan,
    expectedRevision,
  }))
}

export async function deleteLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  return unwrap(await api.delete('/api/lesson-plans/' + encodeURIComponent(plan.id), {
    params: { expectedRevision },
  }))
}

export async function shareLessonPlan(plan) {
  if (!plan?.id) throw new Error('Lesson plan id is required')
  const expectedRevision = Number(plan.serverRevision || plan.revision || 0)
  if (!expectedRevision) throw new Error('Lesson plan server revision is required')
  const response = await api.post('/api/lesson-plans/' + encodeURIComponent(plan.id) + '/share', {
    expectedRevision,
  })
  return {
    plan: response?.data?.data,
    delivery: response?.data?.delivery || { students:0, notifications:0 },
  }
}

export async function getLessonPlanningContext(params = {}) {
  return unwrap(await api.get('/api/lesson-plans/planner/context', { params })) || {}
}

export async function parseLessonPlanningText(text, knownSubjects = []) {
  return unwrap(await api.post('/api/lesson-plans/planner/parse', { text, knownSubjects })) || { subjects:[], unclassified:[] }
}

export async function generateLessonPlanDraft(input) {
  const response = await api.post('/api/lesson-plans/planner/generate', input)
  return {
    plan: response?.data?.data || {},
    analysis: response?.data?.analysis || {},
    ai: response?.data?.ai || {},
    context: response?.data?.context || {},
  }
}
