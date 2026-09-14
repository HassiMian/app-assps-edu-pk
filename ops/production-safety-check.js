const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function fail(message) {
  failures.push(message)
}

function assertContains(relativePath, pattern, message) {
  const source = read(relativePath)
  const ok = typeof pattern === 'string' ? source.includes(pattern) : pattern.test(source)
  if (!ok) fail(`${relativePath}: ${message}`)
}

function assertNotContains(relativePath, pattern, message) {
  const source = read(relativePath)
  const ok = typeof pattern === 'string' ? !source.includes(pattern) : !pattern.test(source)
  if (!ok) fail(`${relativePath}: ${message}`)
}

const failures = []

assertContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  "process.env.ALLOW_MOCK_FALLBACK === 'true' && process.env.NODE_ENV !== 'production'",
  'dashboard mock fallback must be explicitly opt-in and disabled in production.'
)

assertNotContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  /const\s+ALLOW_MOCK_FALLBACK\s*=\s*true\b/,
  'hardcoded dashboard mock fallback is forbidden.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "mount('/ai-analytics', './routes/aiAnalyticsRoutes')",
  'AI analytics must use the protected route module.'
)

assertNotContains(
  'al-siddique-backend/src/server.js',
  /router\.use\('\/ai-analytics',\s*\(req,\s*res\)/,
  'inline AI analytics route is forbidden because it bypasses route-level auth and source authority.'
)

assertContains(
  'al-siddique-backend/src/routes/aiAnalyticsRoutes.js',
  "process.env.NODE_ENV === 'production'",
  'AI analytics must fail closed in production instead of returning fallback facts.'
)

assertContains(
  'al-siddique-backend/src/middleware/auth.js',
  "process.env.NODE_ENV !== 'production' && process.env.DEMO_LOGIN_ENABLED === 'true' && token === 'mock-jwt-token'",
  'mock JWT must remain development-only and explicitly gated.'
)

assertContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  "process.env.NODE_ENV !== 'production' && process.env.DEMO_LOGIN_ENABLED === 'true'",
  'demo login must remain development-only and explicitly gated.'
)

assertNotContains(
  'al-siddique-backend/src/middleware/auth.js',
  /if\s*\(\s*token\s*===\s*['"]mock-jwt-token['"]/,
  'unguarded mock JWT token acceptance is forbidden.'
)

assertContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  'Database unavailable. Dashboard is temporarily offline.',
  'dashboard must fail closed when critical source queries fail.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  'productionHost ? sourceRecipients',
  'production notifications must use source-backed recipients.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  'Production par mock recipients disabled',
  'production notification UI must clearly block mock recipients.'
)

if (failures.length) {
  console.error('Production safety check FAILED:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Production safety check passed.')
