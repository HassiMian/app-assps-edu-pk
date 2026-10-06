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
  "res.status(503).json({ success:false, message:'Analytics is temporarily unavailable.', source:'live_database' })",
  'AI analytics must fail closed instead of returning fallback facts.'
)

assertNotContains(
  'al-siddique-backend/src/routes/aiAnalyticsRoutes.js',
  /development_fallback|insight-m1|insight-m2|studentCount:\s*23|studentCount:\s*15/,
  'AI analytics must not contain synthetic fallback facts in any environment.'
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
  'const currentList = sourceRecipients',
  'notifications must use source-backed recipients in every environment.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /mockStudents|mockAttendance|productionHost/,
  'notification UI must not contain demo/mock recipient paths.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  '/history',
  'notification delivery log must use the durable backend history source.'
)


assertNotContains(
  'al-siddique-frontend/src/services/api.js',
  /DEMO_DATA|ALLOW_DEMO_FALLBACK|al_siddique_demo_|demo@assps\.edu\.pk/,
  'core API client must never synthesize demo business data.'
)

assertNotContains(
  'al-siddique-frontend/src/context/AuthContext.jsx',
  /local_|getUserByUsername|useUserStore/,
  'authentication must never accept browser-local credentials or local tokens.'
)

assertNotContains(
  'al-siddique-frontend/src/main.jsx',
  /demoSeeder|seedPaperStore/,
  'application startup must not seed demo academic or paper data.'
)

if (failures.length) {
  console.error('Production safety check FAILED:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Production safety check passed.')
