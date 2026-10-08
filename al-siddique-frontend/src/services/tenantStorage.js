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
 const raw = getStorage()?.getItem('al_siddique_user') || getSessionStorage()?.getItem('al_siddique_user')
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

function isQuotaError(error) {
 return error?.name === 'QuotaExceededError'
   || error?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
   || Number(error?.code) === 22
   || Number(error?.code) === 1014
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

export function getTenantStorageItem(baseKey) {
 const key = tenantStorageKey(baseKey)
 const session = getSessionStorage()
 const emergency = session?.getItem(key)
 if (emergency !== null && emergency !== undefined) return emergency
 const storage = getStorage()
 if (!storage) return null
 return storage.getItem(key)
}

export function setTenantStorageItem(baseKey, value) {
 const key = tenantStorageKey(baseKey)
 const storage = getStorage()
 if (!storage) {
  const session = getSessionStorage()
  if (!session) return
  session.setItem(key, value)
  return 'session'
 }
 try {
  storage.setItem(key, value)
  getSessionStorage()?.removeItem(key)
  return 'local'
 } catch (error) {
  if (!isQuotaError(error)) throw error
  const session = getSessionStorage()
  if (!session) throw error
  session.setItem(key, value)
  return 'session'
 }
}

export function removeTenantStorageItem(baseKey) {
 const key = tenantStorageKey(baseKey)
 getSessionStorage()?.removeItem(key)
 const storage = getStorage()
 if (!storage) return
 storage.removeItem(key)
}
