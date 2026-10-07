function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

function getSessionStorage() {
 try {
 return typeof window !== 'undefined' ? window.sessionStorage : null
 } catch {
 return null
 }
}

function readAuthUser() {
 try {
 const raw = getStorage()?.getItem('al_siddique_user')
 return raw ? JSON.parse(raw) : null
 } catch {
 return null
 }
}

function normalizeScopePart(value) {
 return String(value || '')
 .trim()
 .toLowerCase()
 .replace(/[^a-z0-9_-]+/g, '-')
 .replace(/^-+|-+$/g, '')
}

export function getTenantScope(user = readAuthUser()) {
 const tenant = normalizeScopePart(user?.tenant_id || user?.tenantId)
 if (tenant) return `tenant-${tenant}`

 const school = normalizeScopePart(user?.school_id || user?.schoolId)
 if (school) return `school-${school}`

 const code = normalizeScopePart(user?.school_code || user?.schoolCode)
 if (code) return `code-${code}`

 const email = normalizeScopePart(user?.email)
 if (email) return `user-${email}`

 return 'public'
}

export function tenantStorageKey(baseKey, user) {
 const scope = getTenantScope(user)
 return scope === 'public' ? baseKey : `${baseKey}__${scope}`
}

export function getTenantStorageItem(baseKey, { migrateLegacy = false } = {}) {
 const storage = getStorage()
 const session = getSessionStorage()
 const scopedKey = tenantStorageKey(baseKey)
 const emergencyValue = session?.getItem(scopedKey)
 if (emergencyValue !== null && emergencyValue !== undefined) return emergencyValue
 const scopedValue = storage?.getItem(scopedKey)
 if (scopedValue !== null && scopedValue !== undefined) return scopedValue

 if (!migrateLegacy || scopedKey === baseKey) return null
 const legacyValue = storage?.getItem(baseKey) ?? session?.getItem(baseKey)
 if (legacyValue !== null && legacyValue !== undefined) {
  try { storage?.setItem(scopedKey, legacyValue) } catch { try { session?.setItem(scopedKey, legacyValue) } catch {} }
  return legacyValue
 }

 return null
}

export function setTenantStorageItem(baseKey, value) {
 const storage = getStorage()
 const session = getSessionStorage()
 const key = tenantStorageKey(baseKey)
 if (!storage) {
  if (!session) return null
  session.setItem(key, value)
  return 'session'
 }
 try {
  storage.setItem(key, value)
  try { session?.removeItem(key) } catch {}
  return 'local'
 } catch (error) {
  const quota = error?.name === 'QuotaExceededError' || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error?.code === 22 || error?.code === 1014
  if (!quota || !session) throw error
  session.setItem(key, value)
  return 'session'
 }
}

export function removeTenantStorageItem(baseKey) {
 const key = tenantStorageKey(baseKey)
 try { getStorage()?.removeItem(key) } catch {}
 try { getSessionStorage()?.removeItem(key) } catch {}
}
