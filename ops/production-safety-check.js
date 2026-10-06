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


assertContains(
  'al-siddique-backend/src/server.js',
  "mount('/transport',  './routes/transportRoutes')",
  'transport must use the tenant-backed backend route.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "mount('/library',    './routes/libraryRoutes')",
  'library must use the tenant-backed backend route.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "mount('/date-sheets', './routes/dateSheetRoutes')",
  'date sheets must use the tenant-backed backend route.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Transport.jsx',
  /North Ridge|South Garden|Bus 101|Bus 207/,
  'transport must not ship seeded fake route records.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Library.jsx',
  /Mathematics Simplified|History of Pakistan|Stories for Young Minds/,
  'library must not ship seeded fake inventory.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /localStorage|getStorage\(\)/,
  'employee operational preferences must not use unscoped browser storage.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /localStorage|getStorage\(\)/,
  'fee operational preferences must not use unscoped browser storage.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  /demo@assps\.edu\.pk|isDemo/,
  'student operations must not branch on a browser-local demo identity.'
)

assertContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  'archived_at',
  'notification dismissal must be persisted server-side.'
)

assertContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  "router.put('/me/profile', protect",
  'self profile edits must use an authenticated server endpoint.'
)

assertNotContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  /section\s*:\s*section\s*\|\|\s*['"]Blue['"]/,
  'student writes must never invent a Blue section fallback.'
)


assertContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  "router.put('/message-draft', protect, canSendNotifications",
  'message drafts must persist through an authenticated server endpoint.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Messages.jsx',
  /Draft persistence is not enabled yet|Save Draft<\/button>\s*$/m,
  'message composer must not ship a knowingly disabled draft control.'
)


assertNotContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  /ALLOW_MOCK_FALLBACK|mockEmployees|mockEmployee|high-fidelity mock/,
  'employee APIs must fail closed instead of synthesizing staff data.'
)

assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  "router.put('/attendance/bulk', protect, canManageStaff",
  'employee attendance must persist through the tenant-backed bulk endpoint.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /Coming Soon — Employee attendance tracking system/,
  'employee attendance must not regress to a placeholder.'
)


assertContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  "router.get('/monthly-class-summary', protect, requireAttendanceAnalyticsAccess",
  'class-wise attendance analytics must come from a protected server aggregate.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  /Math\.random\(\)/,
  'attendance analytics must never fabricate percentages.'
)


assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  "['super_admin', 'admin', 'principal', 'teacher', 'parent', 'student'].includes(role)",
  'exam result reads must support legitimate staff and portal roles.'
)

assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  "const portalScope = portalStudentScope(req, 's', examTenant.nextIndex)",
  'portal result reads must be row-scoped to the linked student.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/StudentPortal.jsx',
  /local demo|not yet stored in SaaS backend/,
  'student portal must not describe live notification data as demo/local.'
)


assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  'const gradeBands = await loadGradeBandsForSchool(schoolId)',
  'saved exam grades must use the school grading policy.'
)

assertNotContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  /const grade = calcGrade\(/,
  'exam result writes must not bypass configured grade settings.'
)

assertContains(
  'al-siddique-frontend/src/Modules/StudentPortal.jsx',
  "/api/exams/grade-settings",
  'student portal aggregate grades must use the school grading policy.'
)

assertContains(
  'al-siddique-frontend/src/Modules/ParentsPortal.jsx',
  "/api/exams/grade-settings",
  'parent portal aggregate grades must use the school grading policy.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/StudentPortal.jsx',
  /\/api\/exams\/results\/\$\{exam\.id\}/,
  'student portal must avoid N+1 result requests and use the scoped result list endpoint.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/ParentsPortal.jsx',
  /\/api\/exams\/results\/\$\{exam\.id\}/,
  'parent portal must avoid N+1 result requests and use the scoped result list endpoint.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/SmartAttendance.jsx',
  /STAFF-BIOMETRIC|FACE-001|Face Matched: Muhammad Ali|Biometric Match Success/,
  'smart attendance must never simulate biometric or facial identities.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/SmartAttendance.jsx',
  'Requires a verified identity-provider integration before it can mark attendance',
  'unconfigured biometric/facial modes must be explicitly disabled instead of simulated.'
)

if (failures.length) {
  console.error('Production safety check FAILED:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Production safety check passed.')
