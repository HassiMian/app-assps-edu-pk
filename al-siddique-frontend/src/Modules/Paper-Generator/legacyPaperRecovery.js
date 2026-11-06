// A211: Principal-supervised, READ ONLY discovery and local encrypted export.
// Never auto-migrate an unscoped browser Paper Store into a school tenant.
import { getTenantScope, tenantStorageKey } from '../../services/tenantStorage.js'

const BASE = 'al_siddique_paper_store'
const FORMAT = 'ASSPS_LEGACY_PAPER_BACKUP_V1'
const ITERATIONS = 210000
const MAX_RAW_LENGTH = 16 * 1024 * 1024
const AUTHORITIES = new Set(['principal', 'admin', 'school_admin'])

export function recoveryActorScope(user) {
  if (!user || !AUTHORITIES.has(String(user.role || '').toLowerCase())) return null
  if (!Number.isSafeInteger(Number(user.school_id)) || Number(user.school_id) < 1) return null
  const scope = getTenantScope(user)
  if (!/^(?:tenant|school|code)-[a-z0-9_-]+$/.test(scope)) return null
  return scope
}

export function sameAuthorizedRecoveryActor(initial, verified) {
  if (!recoveryActorScope(initial) || !recoveryActorScope(verified)) return false
  const a = Number(initial?.id), b = Number(verified?.id)
  return Number.isSafeInteger(a) && a > 0 && a === b &&
    Number(initial.school_id) === Number(verified.school_id) &&
    recoveryActorScope(initial) === recoveryActorScope(verified)
}

export function recoverySourceKey(source, user) {
  const scope = recoveryActorScope(user)
  if (!scope) return null
  if (source === 'legacy-local' || source === 'legacy-session') return BASE
  if (source === 'current-local' || source === 'current-session') return tenantStorageKey(BASE, user)
  return null
}

function getStorage(source, { localStorage, sessionStorage }) {
  return source.endsWith('-local') ? localStorage : sessionStorage
}

function snapshot(raw) {
  if (raw === null || typeof raw !== 'string') return { available: false, count: 0, state: 'absent', bytes: 0 }
  const bytes = new TextEncoder().encode(raw).length
  if (raw.length > MAX_RAW_LENGTH) return { available: true, count: null, state: 'oversize', bytes }
  try {
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data) || !Array.isArray(data.savedPapers))
      return { available: true, count: null, state: 'not-paper-store', bytes }
    if (data.savedPapers.length > 10000 || data.savedPapers.some(p => !p || typeof p !== 'object' || Array.isArray(p)))
      return { available: true, count: null, state: 'invalid-papers', bytes }
    return { available: true, count: data.savedPapers.length, state: 'valid', bytes }
  } catch {
    return { available: true, count: null, state: 'unreadable-json', bytes }
  }
}

export function inspectPaperRecoverySources({ user, storage }) {
  const scope = recoveryActorScope(user)
  if (!scope) return { authorized: false, scope: null, sources: [] }
  const sources = ['legacy-local', 'legacy-session', 'current-local', 'current-session']
    .map(id => {
      const key = recoverySourceKey(id, user)
      try {
        const area = getStorage(id, storage)
        if (!area) return { id, ...snapshot(null), state: 'storage-unavailable' }
        return { id, ...snapshot(area.getItem(key)) }
      } catch {
        return { id, available: false, count: null, state: 'storage-denied', bytes: 0 }
      }
    })
  return { authorized: true, scope, sources, autoMigrated: false, originalKeysChanged: false }
}

function encode64(bytes) {
  // btoa is supported in modern browsers and in the isolated Node regression.
  let result = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    result += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(result)
}

export async function encryptedLegacyPaperBackup({ user, source, passphrase, confirmedOwner, storage, cryptography, now }) {
  const scope = recoveryActorScope(user)
  if (!scope || confirmedOwner !== true) throw new Error('SCHOOL_OWNERSHIP_CONFIRMATION_REQUIRED')
  if (typeof passphrase !== 'string' || passphrase.length < 14 || passphrase.length > 256)
    throw new Error('BACKUP_PASSPHRASE_AT_LEAST_14_CHARACTERS')
  const key = recoverySourceKey(source, user)
  const area = getStorage(source, storage)
  if (!key || !area) throw new Error('PAPER_SOURCE_UNAVAILABLE')
  const original = area.getItem(key)
  const metadata = snapshot(original)
  if (metadata.state !== 'valid' || metadata.count === 0) throw new Error('NO_VALID_SOURCE_PAPERS')
  const parsed = JSON.parse(original)
  const payload = JSON.stringify({ papers: parsed.savedPapers, originalSourceKey: key, sourceType: source, capturedAt: now, schoolScope: scope, originalCount: metadata.count })
  const encoder = new TextEncoder()
  const bytes = encoder.encode(payload)
  const crypto = cryptography
  if (!crypto?.subtle || !crypto?.getRandomValues) throw new Error('SECURE_BROWSER_REQUIRED')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const contentHash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const encryptionKey = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },material,{ name:'AES-GCM', length:256 },false,['encrypt'])
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name:'AES-GCM', iv }, encryptionKey, bytes))
  return {
    format: FORMAT, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: ITERATIONS,
    saltBase64: encode64(salt), ivBase64: encode64(iv), ciphertextBase64: encode64(cipher),
    plaintextSha256: Array.from(contentHash,x=>x.toString(16).padStart(2,'0')).join(''),
    count: metadata.count, source, schoolScope: scope, capturedAt: now,
    serverUploaded: false, browserStorageMutated: false,
  }
}

function decodeBackupBase64(value, maxChars) {
  if (typeof value !== 'string' || !value.length || value.length > maxChars || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw new Error('INVALID_ENCRYPTED_BACKUP')
  try { return Uint8Array.from(atob(value), ch => ch.charCodeAt(0)) }
  catch { throw new Error('INVALID_ENCRYPTED_BACKUP') }
}

export async function verifyEncryptedLegacyPaperBackup({ user, backup, passphrase, cryptography }) {
  const scope = recoveryActorScope(user)
  if (!scope || !backup || typeof backup !== 'object' || backup.schoolScope !== scope)
    throw new Error('BACKUP_SCHOOL_SCOPE_MISMATCH')
  if (backup.format !== FORMAT || backup.cipher !== 'AES-256-GCM' || backup.kdf !== 'PBKDF2-SHA256' || backup.iterations !== ITERATIONS)
    throw new Error('UNSUPPORTED_ENCRYPTED_BACKUP')
  if (typeof passphrase !== 'string' || passphrase.length < 14 || passphrase.length > 256)
    throw new Error('BACKUP_PASSPHRASE_AT_LEAST_14_CHARACTERS')
  const sourceKey = recoverySourceKey(backup.source, user)
  if (!sourceKey) throw new Error('UNKNOWN_ENCRYPTED_PAPER_SOURCE')
  const salt = decodeBackupBase64(backup.saltBase64, 64)
  const iv = decodeBackupBase64(backup.ivBase64, 64)
  const cipher = decodeBackupBase64(backup.ciphertextBase64, MAX_RAW_LENGTH * 2)
  if (salt.length !== 16 || iv.length !== 12 || cipher.length < 20) throw new Error('INVALID_ENCRYPTED_BACKUP')
  const crypto = cryptography
  if (!crypto?.subtle) throw new Error('SECURE_BROWSER_REQUIRED')
  let clear
  try {
    const encoder = new TextEncoder()
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    const derived = await crypto.subtle.deriveKey({ name:'PBKDF2', salt, iterations:ITERATIONS, hash:'SHA-256' },material,{ name:'AES-GCM', length:256 },false,['decrypt'])
    clear = new Uint8Array(await crypto.subtle.decrypt({ name:'AES-GCM', iv },derived,cipher))
  } catch { throw new Error('BACKUP_PASSPHRASE_OR_INTEGRITY_INVALID') }
  const hash = await crypto.subtle.digest("SHA-256", clear)
  const calculated = Array.from(new Uint8Array(hash),x => x.toString(16).padStart(2,'0')).join('')
  if (backup.plaintextSha256 !== calculated) throw new Error('BACKUP_INTEGRITY_FAILED')
  let payload
  try { payload = JSON.parse(new TextDecoder().decode(clear)) }
  catch { throw new Error('INVALID_ENCRYPTED_BACKUP') }
  if (payload.schoolScope !== scope || payload.originalSourceKey !== sourceKey || payload.sourceType !== backup.source ||
      !Array.isArray(payload.papers) || payload.papers.length !== Number(backup.count) || payload.originalCount !== Number(backup.count))
    throw new Error('BACKUP_CONTENT_SCOPE_OR_COUNT_MISMATCH')
  return { verified:true, paperCount:payload.papers.length, schoolScope:scope, source:backup.source, integrityHash:calculated,
    fileWasUploaded:false, papersWereImported:false }
}
