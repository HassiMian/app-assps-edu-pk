// Core-owned session safety policy. Never infer session invalidity from an
// optional feature endpoint's 401 without consulting server-backed auth.
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000
export const isAuthHandshake = path => /^\/api\/auth\/(login|refresh|logout)(?:\/|$)/.test(String(path || '').split('?')[0])
export function sessionWindowValid(loginAt, now = Date.now()) {
  const at = Number(loginAt || 0)
  return !at || (Number.isFinite(at) && at > 0 && now >= at && now - at <= MAX_SESSION_MS)
}
export function sameAuthenticatedIdentity(previous, next) {
  if (!previous || !next || !Number.isSafeInteger(Number(previous.id)) ||
      Number(previous.id) <= 0 || Number(previous.id) !== Number(next.id)) return false
  const scope = v => v?.school_id ?? v?.schoolId ?? null
  const prevSchool=scope(previous), nextSchool=scope(next)
  if (prevSchool != null && String(prevSchool) !== String(nextSchool)) return false
  const tenant = v => v?.tenant_id ?? v?.tenantId ?? null
  if (tenant(previous) != null && String(tenant(previous)) !== String(tenant(next))) return false
  // A refresh operation must not silently switch teacher to principal/admin,
  // even when the server happens to return the same user ID.
  if (String(previous.role || '').toLowerCase() !== String(next.role || '').toLowerCase()) return false
  const schoolCode = v => v?.school_code ?? v?.schoolCode ?? null
  if (schoolCode(previous) != null && String(schoolCode(previous)).toLowerCase() !==
      String(schoolCode(next) || '').toLowerCase()) return false
  return true
}
export function mayAutoReplayAfterRefresh(method) {
  // Never replay writes: a server may have accepted a request before the 401
  // propagated. User must verify its current state and deliberately resubmit.
  return String(method || '').toLowerCase() === 'get'
}
