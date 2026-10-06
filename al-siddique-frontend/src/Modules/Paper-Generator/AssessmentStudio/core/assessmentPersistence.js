import api from '../../../../services/api.js'
import { getTenantStorageItem, setTenantStorageItem } from '../../../../services/tenantStorage.js'

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
  const items=queue(); const entry={ id:`assessment-op-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, queuedAt:new Date().toISOString(), attempts:0, ...clone(operation) }
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

export async function flushAssessmentOfflineQueue() {
  const items=queue(); if (!items.length) return { flushed:0, remaining:0, conflicts:0, synced:[] }
  const remaining=[]; const synced=[]; let flushed=0; let conflicts=0
  for (const item of items) {
    if (item.kind !== 'SAVE_REVISION') { remaining.push(item); continue }
    try {
      const result = await saveAssessmentRevision({ paperId:item.paperId, expectedRevision:item.expectedRevision, title:item.title, document:item.document, allowQueue:false })
      flushed += 1
      synced.push({ paperId:item.paperId, localPaperId:item.localPaperId || null, data:result.data })
    } catch (error) {
      if (error?.code === 'REVISION_CONFLICT') conflicts += 1
      remaining.push({ ...item, attempts:Number(item.attempts||0)+1, lastAttemptAt:new Date().toISOString(), lastError:error?.code || error?.message || 'RETRY_FAILED' })
    }
  }
  writeQueue(remaining)
  return { flushed, remaining:remaining.length, conflicts, synced }
}
