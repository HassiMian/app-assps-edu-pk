import api, { getAuthUser } from '../../../../services/api.js'
import { getTenantStorageItem, setTenantStorageItem, tenantStorageKey } from '../../../../services/tenantStorage.js'

const QUEUE_KEY = 'assps_assessment_studio_offline_queue_v1'
const clone = value => JSON.parse(JSON.stringify(value))

export class AssessmentRevisionConflictError extends Error {
  constructor(currentRevision, message = 'Assessment changed elsewhere.') {
    super(message); this.name = 'AssessmentRevisionConflictError'; this.code = 'REVISION_CONFLICT'; this.currentRevision = Number(currentRevision || 0)
  }
}

function responseData(response) { return response?.data?.data ?? response?.data ?? null }
function isNetworkOrRetryable(error) { return !error?.response || error.response.status === 408 || error.response.status === 429 || error.response.status >= 500 }
function queue() {
  try { const parsed=JSON.parse(getTenantStorageItem(QUEUE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
function writeQueue(items) { setTenantStorageItem(QUEUE_KEY, JSON.stringify(items)) }
function enqueue(operation) {
  const authUser = getAuthUser()
  const items=queue(); const entry={ id:`assessment-op-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, queuedAt:new Date().toISOString(), attempts:0, ownerUserId:authUser?.id != null ? String(authUser.id) : null, ...clone(operation) }
  items.push(entry); writeQueue(items); return entry
}

export function getAssessmentOfflineQueue() { return queue() }

export function bindQueuedAssessmentSave(queueId, localPaperId) {
  if (!queueId || !localPaperId) return false
  const items=queue(); let changed=false
  const next=items.map(item=>{
    if (item.id!==queueId) return item
    changed=true
    return { ...item, localPaperId:String(localPaperId) }
  })
  if (changed) writeQueue(next)
  return changed
}

export async function saveAssessmentRevision({ paperId, expectedRevision = 0, title = '', document, allowQueue = true }) {
  try {
    const response = await api.post(`/api/assessment-studio/papers/${encodeURIComponent(paperId)}/revisions`, { expectedRevision, title, document })
    return { mode:'SERVER', degraded:false, queued:false, data:responseData(response) }
  } catch (error) {
    if (error?.response?.status === 409 && error.response?.data?.code === 'REVISION_CONFLICT') {
      throw new AssessmentRevisionConflictError(error.response.data.currentRevision, error.response.data.message)
    }
    if (allowQueue && isNetworkOrRetryable(error)) {
      const queued = enqueue({ kind:'SAVE_REVISION', paperId, expectedRevision, title, document })
      return { mode:'LOCAL_RECOVERY', degraded:true, queued:true, queueId:queued.id, data:{ currentRevision:expectedRevision } }
    }
    throw error
  }
}

export async function loadAssessmentPaper(paperId) {
  const response = await api.get(`/api/assessment-studio/papers/${encodeURIComponent(paperId)}`)
  return responseData(response)
}

export async function finalizeAssessmentRelease({ paperId, expectedRevision, release }) {
  const response = await api.post(`/api/assessment-studio/papers/${encodeURIComponent(paperId)}/releases`, { expectedRevision, release })
  return responseData(response)
}

// At most one replay per tenant may be active within this browser tab. A retry
// can overlap another retry or an interactive Save Draft; replay must never
// overwrite revisions queued after it took its initial snapshot.
const inFlightFlushes = new Map()

async function replayAssessmentQueueForScope(scopeKey) {
  const initial = queue()
  if (!initial.length) return { flushed:0, remaining:0, conflicts:0, synced:[] }
  const initialUserId=String(getAuthUser()?.id ?? '')
  const sameIdentity=() => tenantStorageKey(QUEUE_KEY) === scopeKey && String(getAuthUser()?.id ?? '') === initialUserId

  const outcomes = new Map()
  const blockedPaperIds = new Set()
  const synced = []
  let conflicts = 0
  let authRequired = 0
  for (const item of initial) {
    // Changing accounts during a request must not replay the old school's
    // queued documents using the newly authenticated school's credentials.
    if (!sameIdentity()) {
      return { flushed:0, remaining:initial.length, conflicts:0, synced:[], scopeChanged:true }
    }
    if (item.kind !== 'SAVE_REVISION' || blockedPaperIds.has(String(item.paperId))) continue
    // A shared school computer must not upload another staff member's drafts
    // under the current user's audit identity. Legacy unbound queue records
    // remain readable for recovery, never deleted by this compatibility path.
    if (item.ownerUserId && item.ownerUserId !== initialUserId) { authRequired += 1; continue }
    try {
      const result = await saveAssessmentRevision({
        paperId:item.paperId, expectedRevision:item.expectedRevision,
        title:item.title, document:item.document, allowQueue:false,
      })
      if (!sameIdentity()) {
        return { flushed:0, remaining:initial.length, conflicts:0, synced:[], scopeChanged:true }
      }
      outcomes.set(item.id, { success:true })
      // A local paper may be bound to the queue *during* the HTTP request.
      const latest = queue().find(entry => entry.id === item.id)
      synced.push({ paperId:item.paperId, localPaperId:latest?.localPaperId || item.localPaperId || null, data:result.data })
    } catch (error) {
      if (!sameIdentity()) {
        return { flushed:0, remaining:initial.length, conflicts:0, synced:[], scopeChanged:true }
      }
      if (error?.code === 'REVISION_CONFLICT') conflicts += 1
      // Never silently rebase a subsequent queued edit over another revision.
      // Leave all later edits for this paper in order until this edit resolves.
      blockedPaperIds.add(String(item.paperId))
      outcomes.set(item.id, {
        failure:true,
        patch:{
          attempts:Number(item.attempts || 0) + 1,
          lastAttemptAt:new Date().toISOString(),
          lastError:error?.code || error?.message || 'RETRY_FAILED',
        },
      })
    }
  }

  if (!sameIdentity()) {
    return { flushed:0, remaining:initial.length, conflicts:0, synced:[], scopeChanged:true }
  }
  // Re-read the live queue before committing replay results. New edits and
  // localPaperId bindings added while requests were in flight must survive.
  const remaining = queue().flatMap(item => {
    const outcome = outcomes.get(item.id)
    if (outcome?.success) return []
    if (outcome?.failure) return [{ ...item, ...outcome.patch }]
    return [item]
  })
  writeQueue(remaining)
  return { flushed:synced.length, remaining:remaining.length, conflicts, authRequired, synced }
}

export function flushAssessmentOfflineQueue() {
  const scopeKey = tenantStorageKey(QUEUE_KEY)
  if (inFlightFlushes.has(scopeKey)) return inFlightFlushes.get(scopeKey)
  const running = replayAssessmentQueueForScope(scopeKey)
  inFlightFlushes.set(scopeKey, running)
  // Catch the auxiliary finally promise to avoid an unhandled rejection if
  // a storage failure propagates to callers handling the original promise.
  running.finally(() => {
    if (inFlightFlushes.get(scopeKey) === running) inFlightFlushes.delete(scopeKey)
  }).catch(() => {})
  return running
}
