/**
 * Do not destroy a valid or newer session because of an unrelated 401.
 * A server-issued Bearer token on the failing request must match the currently
 * stored token. Login failures and local-only sessions are not server logout events.
 */
export function shouldClearSessionOn401({ status, requestUrl, sentAuthorization, currentToken }) {
  if (status !== 401) return false
  const rawPath = String(requestUrl || '').split('?')[0]
  const path = rawPath.replace(/^https?:\/\/[^/]+/i, '')
  if (/^\/api\/(?:admin\/)?auth\/(?:login|refresh)\/?$/i.test(path)) return false
  if (typeof sentAuthorization !== 'string') return false
  const bearer = /^Bearer\s+(\S+)$/i.exec(sentAuthorization.trim())
  if (!bearer) return false
  const sentToken = bearer[1]
  if (sentToken.startsWith('local_')) return false
  return Boolean(currentToken && sentToken === currentToken)
}