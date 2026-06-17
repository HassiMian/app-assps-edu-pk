function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
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
 if (!storage) return null
 const scopedKey = tenantStorageKey(baseKey)
 const scopedValue = storage.getItem(scopedKey)
 if (scopedValue !== null) return scopedValue

 if (!migrateLegacy || scopedKey === baseKey) return null
 const legacyValue = storage.getItem(baseKey)
 if (legacyValue !== null) {
 try { storage.setItem(scopedKey, legacyValue) } catch {}
 return legacyValue
 }

 return null
}

export function setTenantStorageItem(baseKey, value) {
 const storage = getStorage()
 if (!storage) return
 storage.setItem(tenantStorageKey(baseKey), value)
}

export function removeTenantStorageItem(baseKey) {
 const storage = getStorage()
 if (!storage) return
 storage.removeItem(tenantStorageKey(baseKey))
}
