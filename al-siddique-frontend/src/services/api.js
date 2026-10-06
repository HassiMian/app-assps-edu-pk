import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 20000,
})

const CACHE_CONFIG = {
  '/api/settings/public': 60000,
  '/api/academic/setup': 60000,
}
const requestCache = new Map()

export function clearApiCache(endpoint) {
  if (!endpoint) {
    requestCache.clear()
    return
  }
  const target = String(endpoint).split('?')[0]
  for (const key of requestCache.keys()) {
    const scopedUrl = String(key).split('::').slice(1).join('::')
    if (scopedUrl.split('?')[0] === target) requestCache.delete(key)
  }
}

export function resolveAssetUrl(value) {
  try {
    if (!value || typeof value !== 'string') return value || null
    const trimmed = value.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
    if (/^(data:image\/|https?:\/\/|blob:)/i.test(trimmed)) return trimmed
    if (trimmed.startsWith('/api/uploads/')) return trimmed
    if (trimmed.startsWith('/uploads/')) return `/api${trimmed}`
    if (trimmed.startsWith('uploads/')) return `/api/${trimmed}`
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  } catch {
    return value || null
  }
}

function getStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function getAuthToken() {
  try { return getStorage()?.getItem('al_siddique_token') || null } catch { return null }
}

export function getRefreshToken() {
  try { return getStorage()?.getItem('al_siddique_refresh_token') || null } catch { return null }
}

export function getAuthUser() {
  try {
    const raw = getStorage()?.getItem('al_siddique_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function requestCacheScope() {
  const user = getAuthUser() || {}
  const raw = user.tenant_id || user.tenantId || user.school_id || user.schoolId || user.school_code || user.schoolCode || user.email || 'public'
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'public'
}

function scopedRequestCacheKey(url) {
  return `${requestCacheScope()}::${String(url || '')}`
}

export function setAuthSession(token, refreshToken, user) {
  requestCache.clear()
  const storage = getStorage()
  if (!storage) return
  try {
    if (token) storage.setItem('al_siddique_token', token)
    if (refreshToken) storage.setItem('al_siddique_refresh_token', refreshToken)
    if (user) storage.setItem('al_siddique_user', JSON.stringify(user))
  } catch { /* auth persistence is best-effort */ }
}

export function clearAuthSession() {
  requestCache.clear()
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem('al_siddique_token')
    storage.removeItem('al_siddique_refresh_token')
    storage.removeItem('al_siddique_user')
  } catch { /* storage can be unavailable in hardened browsers */ }
}

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const method = (config.method || 'get').toLowerCase()
  if (method === 'get' && !config.skipCache) {
    const urlKey = config.url?.split('?')[0]
    const ttl = CACHE_CONFIG[urlKey]
    if (ttl) {
      const cached = requestCache.get(scopedRequestCacheKey(config.url))
      if (cached && Date.now() - cached.timestamp < ttl) {
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK (Cached)',
          headers: cached.headers || {},
          config,
          request: {},
        })
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => {
    const method = (res.config?.method || 'get').toLowerCase()
    if (method === 'get' && !res.config?.skipCache && res.status === 200) {
      const urlKey = res.config?.url?.split('?')[0]
      if (CACHE_CONFIG[urlKey]) {
        requestCache.set(scopedRequestCacheKey(res.config.url), {
          data: res.data,
          headers: res.headers,
          timestamp: Date.now(),
        })
      }
    } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const urlKey = res.config?.url?.split('?')[0]
      if (urlKey && CACHE_CONFIG[urlKey]) clearApiCache(urlKey)
    }
    return res
  },
  async (err) => {
    const config = err.config || {}
    const method = (config.method || 'get').toLowerCase()

    if (err.response?.status === 401) {
      clearAuthSession()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') window.location.href = '/login'
      return Promise.reject(err)
    }

    const status = err.response?.status
    const isNetworkOrTimeout = !err.response || err.code === 'ECONNABORTED' || status === 408 || (status >= 502 && status <= 504)
    let retryAfterDelay = null
    if (status === 429) {
      const retryAfterHeader = err.response?.headers?.['retry-after']
      if (retryAfterHeader) {
        const parsed = Number.parseInt(retryAfterHeader, 10)
        if (Number.isInteger(parsed) && parsed > 0 && parsed <= 5) retryAfterDelay = parsed * 1000
      }
    }

    const canRetry = isNetworkOrTimeout || retryAfterDelay !== null
    if (method === 'get' && canRetry && (config._retryCount || 0) < 2) {
      config._retryCount = (config._retryCount || 0) + 1
      const jitter = Math.floor(Math.random() * 400)
      const delayMs = retryAfterDelay !== null ? retryAfterDelay + jitter : config._retryCount * 1000 + jitter
      await new Promise(resolve => setTimeout(resolve, delayMs))
      return api(config)
    }

    // Operational APIs never synthesize business data. Callers must render an explicit error/empty state.
    return Promise.reject(err)
  },
)

export default api
