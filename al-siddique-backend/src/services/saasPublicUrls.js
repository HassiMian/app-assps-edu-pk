const DEFAULT_SAAS_LOGIN_URL = 'https://app.assps.edu.pk/login/saas'

function resolveSaasLoginUrl(env = process.env) {
  const configured = String(
    env.SAAS_LOGIN_URL
      || env.NEXT_PUBLIC_SAAS_LOGIN_URL
      || DEFAULT_SAAS_LOGIN_URL
  ).trim()

  let parsed
  try {
    parsed = new URL(configured)
  } catch {
    const error = new Error('Configured SaaS login URL is invalid.')
    error.code = 'SAAS_LOGIN_URL_INVALID'
    throw error
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    const error = new Error('Configured SaaS login URL uses an unsupported origin.')
    error.code = 'SAAS_LOGIN_URL_INVALID'
    throw error
  }

  if (String(env.NODE_ENV || '').toLowerCase() === 'production' && parsed.protocol !== 'https:') {
    const error = new Error('Production SaaS login URL must use HTTPS.')
    error.code = 'SAAS_LOGIN_URL_INVALID'
    throw error
  }

  parsed.hash = ''
  return parsed.toString()
}

module.exports = {
  DEFAULT_SAAS_LOGIN_URL,
  resolveSaasLoginUrl,
}
