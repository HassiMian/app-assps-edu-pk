// A215: Principal-only, read-only comparison of school-scoped browser snapshots.
// NEVER auto-merge, delete, import, or send papers to the server.
import { recoveryActorScope, recoverySourceKey } from './legacyPaperRecovery.js'

const MAX_SOURCE_BYTES = 16 * 1024 * 1024
const MAX_ITEMS = 10000
const idOf = paper => {
  const id = paper?.id
  if (typeof id === 'string' && id.trim() && id.length <= 256) return id
  if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) return String(id)
  throw new Error('PAPER_RECONCILE_INVALID_OR_MISSING_ID')
}
const canonicalize = (v, depth = 0) => {
  if (depth > 40) throw new Error('PAPER_RECONCILE_OVERDEEP_RECORD')
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(item => canonicalize(item, depth + 1)).join(',') + ']'
  return '{' + Object.keys(v).sort().map(key => JSON.stringify(key) + ':' + canonicalize(v[key], depth + 1)).join(',') + '}'
}
const sha256 = async (raw, crypto) => {
  if (!crypto?.subtle?.digest) throw new Error('SECURE_BROWSER_REQUIRED')
  const bytes = new TextEncoder().encode(raw)
  const result = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(result, x => x.toString(16).padStart(2, '0')).join('')
}

export async function comparePaperRecoverySources({ user, storage, cryptography, report }) {
  const scope = recoveryActorScope(user)
  if (!scope || !report?.authorized || report?.scope !== scope || !Array.isArray(report.sources) ||
      !Number.isSafeInteger(Number(report.sourceSchoolId)) || Number(report.sourceSchoolId) !== Number(user.school_id) ||
      !Number.isSafeInteger(Number(report.sourceActorId)) || Number(report.sourceActorId) !== Number(user.id))
    throw new Error('PAPER_RECONCILE_AUTHORIZED_SCOPE_REQUIRED')

  const records = []
  const keys = new Set()
  for (const entry of report.sources) {
    if (entry.state !== 'valid' || !(entry.count > 0)) continue
    if (!entry.rawSha256 || !/^[0-9a-f]{64}$/.test(entry.rawSha256)) throw new Error('PAPER_RECONCILE_ATTESTATION_REQUIRED')
    const key = recoverySourceKey(entry.id, user)
    const area = entry.id.endsWith('-local') ? storage?.localStorage : storage?.sessionStorage
    const compositeKey = (entry.id.endsWith('-local') ? 'local:' : 'session:') + key
    if (!key || !area || keys.has(compositeKey)) throw new Error('PAPER_RECONCILE_AMBIGUOUS_SOURCE')
    keys.add(compositeKey)

    const raw = area.getItem(key)
    if (typeof raw !== 'string' || raw.length > MAX_SOURCE_BYTES) throw new Error('PAPER_RECONCILE_SOURCE_CHANGED')
    const bytes = new TextEncoder().encode(raw).byteLength
    if (bytes !== entry.bytes || await sha256(raw, cryptography) !== entry.rawSha256)
      throw new Error('PAPER_RECONCILE_SOURCE_CHANGED')
    let parsed
    try { parsed = JSON.parse(raw) } catch { throw new Error('PAPER_RECONCILE_INVALID_JSON') }
    const papers = parsed?.savedPapers
    if (!Array.isArray(papers) || papers.length !== entry.count || papers.length > MAX_ITEMS)
      throw new Error('PAPER_RECONCILE_COUNT_CHANGED')
    const list = new Map()
    for (const paper of papers) {
      if (!paper || typeof paper !== 'object' || Array.isArray(paper))
        throw new Error('PAPER_RECONCILE_INVALID_RECORD')
      const id = idOf(paper)
      if (list.has(id)) throw new Error('PAPER_RECONCILE_DUPLICATE_ID')
      list.set(id, canonicalize(paper))
    }
    records.push({ source: entry.id, count: list.size, list })
  }
  const allIds = new Set(records.flatMap(r => [...r.list.keys()]))
  const pairwise = []
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i], b = records[j]
      const shared = [...a.list.keys()].filter(id => b.list.has(id))
      const identical = shared.filter(id => a.list.get(id) === b.list.get(id)).length
      pairwise.push({
        sourceA: a.source, sourceB: b.source,
        countA: a.count, countB: b.count,
        sharedIds: shared.length, matchingBodies: identical,
        differentBodies: shared.length - identical,
        onlyA: a.count - shared.length, onlyB: b.count - shared.length,
      })
    }
  }
  return {
    scope, readOnly: true, sourceCount: records.length, uniquePaperIds: allIds.size,
    sources: records.map(({source,count}) => ({source,count})), pairwise,
    conflictPairs: pairwise.filter(p => p.differentBodies > 0).length,
    requiresOwnerRevisionReview: pairwise.some(p => p.differentBodies > 0 || p.onlyA > 0 || p.onlyB > 0),
    autoMerged: false, deletedOriginals: false, uploadedToServer: false,
  }
}
