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


// Composer-forwarded WhatsApp evidence is managed independently of ordinary
// teacher lesson documents. The server enforces identity, tenant and review state.
export async function previewComposerReview(reviewBatch) {
  return unwrap(await api.post('/api/lesson-plans/planner/composer-review-preview', {reviewBatch}))
}
export async function importComposerReview(reviewBatch) {
  return unwrap(await api.post('/api/lesson-plans/planner/composer-review-import', {reviewBatch}))
}
export async function listComposerReview() {
  return unwrap(await api.get('/api/lesson-plans/planner/composer-review-classes')) || []
}
export async function getComposerReviewSource(id) {
  if (!/^LPREVIEW-[A-Za-z0-9-]{8,95}$/.test(String(id||''))) throw new Error('Invalid source review identity')
  return unwrap(await api.get('/api/lesson-plans/planner/composer-review-source/' + encodeURIComponent(id)))
}
export async function appendComposerReviewCorrection(id,expectedRevision,change) {
  if (!Number.isInteger(Number(expectedRevision)) || Number(expectedRevision)<1) throw new Error('Current revision required')
  return unwrap(await api.post('/api/lesson-plans/planner/composer-review-correction/' + encodeURIComponent(id),{
    ...change,expectedRevision:Number(expectedRevision)
  }))
}


export async function getComposerTeacherEvidence(id) {
  return unwrap(await api.get('/api/lesson-plans/planner/composer-review-assignment-evidence/' + encodeURIComponent(id)))
}
export async function appendPrincipalSourceInspection(id,expectedRevision,sourceDigest) {
  if(!Number.isInteger(Number(expectedRevision))||Number(expectedRevision)<1)throw Error('Current server revision required')
  if(!/^[a-f0-9]{64}$/.test(String(sourceDigest)))throw Error('Original source hash required')
  const declaration='I reviewed the original lesson syllabus evidence and its correction flags.'
  return unwrap(await api.post('/api/lesson-plans/planner/composer-review-principal-inspection/'+encodeURIComponent(id),{
    expectedRevision:Number(expectedRevision),sourceDigest,declaration
  }))
}

export async function getComposerReviewReadiness() {
  return unwrap(await api.get('/api/lesson-plans/planner/composer-review-readiness'))
}
