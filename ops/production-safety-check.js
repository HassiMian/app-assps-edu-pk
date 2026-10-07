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

if (fs.existsSync(path.join(repoRoot, 'al-siddique-frontend/src/pages/Dashboard_clean.jsx'))) {
  fail('al-siddique-frontend/src/pages/Dashboard_clean.jsx: legacy duplicate dashboard with static attendance data must not exist in canonical source.')
}

assertNotContains(
  'al-siddique-backend/src/services/emailService.js',
  /rejectUnauthorized\s*:\s*false/,
  'SMTP transport must validate provider TLS certificates.'
)

assertNotContains(
  'al-siddique-backend/src/scripts/seedQuestionBankFromJson.js',
  /ssl:\s*isLocal\s*\?\s*false\s*:\s*\{\s*rejectUnauthorized:\s*false/,
  'remote database seeding must not disable TLS certificate verification by default.'
)

assertNotContains(
  'al-siddique-backend/src/scripts/importAsspsFees.js',
  /\b(?:ALTER|CREATE|DROP|TRUNCATE)\s+(?:TABLE|SCHEMA|INDEX)\b/i,
  'fee imports must validate migrated schema instead of mutating schema at runtime.'
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

assertNotContains(
  'al-siddique-backend/src/routes/opsRoutes.js',
  /catch\(\(\) => \(\{ rows: \[\{ count: 0 \}\] \}\)\)/,
  'operations diagnostics must not convert source failures into real zero counts.'
)

assertContains(
  'al-siddique-backend/src/routes/opsRoutes.js',
  'unavailableSources',
  'operations diagnostics must expose unavailable metric sources explicitly.'
)

assertContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  'Database unavailable. Dashboard is temporarily offline.',
  'dashboard must fail closed when critical source queries fail.'
)

assertContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  'LEFT JOIN attendance_today a\n      ON a.student_id = s.id AND a.school_id = s.school_id',
  'dashboard attendance aggregates must preserve tenant scope and avoid raw join multiplication.'
)

assertContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  'LEFT JOIN fee_totals f\n      ON f.student_id = s.id AND f.school_id = s.school_id',
  'dashboard fee aggregates must preserve tenant scope and avoid raw join multiplication.'
)

assertNotContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  /LEFT JOIN attendance a ON a\.student_id = s\.id\s*\n\s*LEFT JOIN fee_challans f ON f\.student_id = s\.id/,
  'dashboard must not raw-join attendance and fee facts because that multiplies aggregate rows.'
)

assertNotContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  /JOIN students s ON (?:s\.id = a\.student_id|a\.student_id = s\.id)(?![^\n]*school_id)/,
  'attendance/student joins must bind both student id and school id.'
)

assertNotContains(
  'al-siddique-backend/src/routes/globalSearchRoutes.js',
  /JOIN students s ON c\.student_id = s\.id(?![^\n]*school_id)/,
  'global fee search must not join a challan to a student outside its school.'
)

assertNotContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  /JOIN students s ON s\.id = (?:a|f)\.student_id(?![^\n]*school_id)/,
  'dashboard fact joins must bind both student id and school id.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  'const currentList = sourceRecipients',
  'notifications must use source-backed recipients in every environment.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /catch \{ setAccounts\(prev => \(\{ \.\.\.prev, \[emp\.id\]: null \}\)\) \}/,
  'staff login access must not convert a portal-account source failure into a confirmed not-linked state.'
)

assertContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  'const known = Object.prototype.hasOwnProperty.call(accounts, emp.id)',
  'staff login access must distinguish a server-confirmed null account from an unknown/unavailable state.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /SALARY_RECORDS|const records = SALARY_RECORDS/,
  'employee salary workflow must not use a hardcoded empty ledger that renders false zero financial metrics.'
)

assertContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  'Payroll payment ledger is not configured.',
  'salary workflow must explicitly distinguish configured salary data from unavailable payroll payment tracking.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /Employee attendance load failed[\s\S]{0,160}setRecords\(\[\]\)/,
  'employee attendance refresh failures must preserve prior rows and never imply an empty roster.'
)

assertContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  'if (!attendanceScopeMatches || !activeRecords.length || saving) return',
  'employee attendance writes must be blocked unless loaded rows belong to the selected date.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /Could not load employee portal account[\s\S]{0,180}setAccount\(null\)/,
  'staff permission account refresh failures must preserve loaded account data for its original employee.'
)

assertContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  'const activeAccount = accountScopeMatches ? account : null',
  'staff permission controls must only use account data loaded for the selected employee.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/StudentFeePanel.jsx',
  /Student fee panel load failed[\s\S]{0,180}setProfile\(null\)[\s\S]{0,120}setChallans\(\[\]\)/,
  'student fee panel refresh failures must preserve the last known-good fee state.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/StudentFeePanel.jsx',
  'const activeChallans = scopeMatches ? challans : []',
  'student fee rows must remain bound to the student they were actually loaded for.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/Analytics.jsx',
  /Failed to fetch attendance history:[\s\S]{0,180}setRecords\(\[\]\)/,
  'attendance analytics refresh failures must preserve the last known-good history instead of reporting an empty month.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/Analytics.jsx',
  'const activeRecords = loadedScope === currentScope ? records : []',
  'attendance analytics cached rows must remain bound to the class/section/date scope they were loaded for.'
)

assertNotContains(
  'al-siddique-frontend/src/components/dashboard/DashboardAnalyticsCards.jsx',
  /Failed to load unmarked attendance data:[\s\S]{0,180}setStudents\(\[\]\)[\s\S]{0,120}setMarkedToday\(\[\]\)/,
  'dashboard unmarked-attendance refresh failures must preserve the last known-good roster and marks.'
)

assertContains(
  'al-siddique-frontend/src/components/dashboard/DashboardAnalyticsCards.jsx',
  'Existing loaded attendance state was preserved.',
  'dashboard unmarked-attendance source failure must be explicit while preserving current state.'
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
  'al-siddique-backend/src/routes/notifyRoutes.js',
  /status:\s*'sent',\s*\.\.\.result/,
  'provider API acceptance must not be recorded as final message delivery.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /messages sent successfully|sent, \${failedCount} failed/,
  'notification UI must not present provider acceptance as final delivery.'
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
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  /catch\(err => \{ setResults\(\[\]\)/,
  'result-card source failures must not be reported as an authoritative empty result set.'
)

assertContains(
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  "const activeResults = String(loadedExamId) === String(selectedExam) ? results : []",
  'result-card rows must remain bound to the exam they were actually loaded for.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/families/FamilyModule.jsx',
  /catch\(err => \{ setStudents\(\[\]\)/,
  'family detection source failures must preserve the last known-good student list.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentReports.jsx',
  /catch\(err => \{ setStudents\(\[\]\)/,
  'student report source failures must preserve previously loaded rows.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /catch \(err\)[\s\S]{0,180}setSourceRecipients\(\[\]\)/,
  'notification source failures must preserve the last known-good recipient list.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /catch \(err\)[\s\S]{0,220}setLog\(\[\]\)/,
  'notification history failures must preserve the last known-good provider log.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  'const [sourceError, setSourceError] = useState',
  'notification source availability must be represented separately from empty recipient or history data.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/ParentsPortal.jsx',
  /Portal notification inbox load error:[\s\S]{0,140}setMessages\(\[\]\)/,
  'parent portal notification source failures must preserve the last known-good inbox.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/StudentPortal.jsx',
  /Portal notification inbox load error:[\s\S]{0,140}setMessages\(\[\]\)/,
  'student portal notification source failures must preserve the last known-good inbox.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Messages.jsx',
  /Failed to load message history[\s\S]{0,160}setMessages\(\[\]\)/,
  'message history failures must preserve the last known-good provider history.'
)

assertContains(
  'al-siddique-frontend/src/Modules/Messages.jsx',
  "recipientCount == null ? 'Verified recipient count is temporarily unavailable; send will verify live.'",
  'recipient-count source failure must be distinguished from a verified zero-recipient group.'
)

assertContains(
  'al-siddique-frontend/src/App.jsx',
  '<Route path="/fees/create" element={<W roles={ROLES.adminOffice} permKey="fees_create"><FeeModule /></W>} />',
  'the /fees/create route must use the canonical fee workspace instead of the duplicate protected legacy challan creator.'
)

assertNotContains(
  'al-siddique-frontend/src/App.jsx',
  /lazyRetry\(\(\) => import\('\.\/Modules\/fees\/CreateChallan'\)/,
  'the duplicate standalone challan creator must not remain mounted as a production route bundle.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/students/AdmissionsModule.jsx',
  /catch \{[\s\S]{0,140}setFeeAmounts\(prev => \(\{ \.\.\.prev, 'Monthly Fee': 0 \}\)\)/,
  'admission fee-settings source failures must not be converted into a zero monthly fee.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/AdmissionsModule.jsx',
  'if (!admitted || feeSettingsLoadError) return',
  'post-admission challan creation must fail closed while configured fee settings are unavailable.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  /catch \([^)]*\)[\s\S]{0,160}setMonthlyTrend\(\[\]\)[\s\S]{0,120}setMonthlyClassSummary\(\[\]\)/,
  'attendance analytics source failures must preserve the last known-good monthly analytics.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  'const [analyticsError, setAnalyticsError] = useState',
  'attendance analytics source availability must be represented separately from empty analytics data.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  /catch \([^)]*\)[\s\S]{0,140}setTeacherOptions\(\[\]\)/,
  'timetable teacher-source failures must preserve the last known-good teacher list.'
)

assertContains(
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  'const [teacherLoadError, setTeacherLoadError] = useState',
  'timetable teacher-source availability must be represented separately from an empty teacher list.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/MarksSheet.jsx',
  /catch \{[\s\S]{0,120}setExams\(\[\]\)/,
  'marks-sheet exam refresh failures must preserve the last known-good exam list.'
)

assertContains(
  'al-siddique-frontend/src/Modules/academic/AcademicSetupModule.jsx',
  "setSyncState('unavailable')",
  'academic setup must distinguish server unavailability from a healthy local-cache state.'
)

assertContains(
  'al-siddique-frontend/src/Modules/academic/AcademicSetupModule.jsx',
  'Server unavailable — showing local cache',
  'academic setup must tell the operator when cached academic data may be stale.'
)

assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  'exam_ids must contain between 1 and 100 valid exam IDs.',
  'exam result batching must bound and validate explicit exam IDs.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  /Promise\.all\(exams\.map[\s\S]{0,240}\/api\/exams\/results\//,
  'result-card all-exam printing must not fan out one HTTP request per exam.'
)

assertContains(
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  "api.get('/api/exams/results', { params: { exam_ids: examIds.join(',') } })",
  'result-card all-exam printing must use the tenant-scoped batch result endpoint.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
  /Fee settings could not be loaded from server[\s\S]{0,420}setDiscountPackages\(\[\]\)/,
  'fee settings source failure must not synthesize a blank editable configuration.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
  'disabled={saving || loading || !sourceReady}',
  'fee settings save must fail closed until current server configuration is loaded.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/SearchableStudentPicker.jsx',
  'Student search is temporarily unavailable.',
  'student picker must distinguish source failure from a verified empty search result.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/PromoteDemote.jsx',
  'Student roster could not be loaded for promotion/demotion.',
  'promotion/demotion must distinguish roster source failure from an empty school.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  /catch \(err\)[\s\S]{0,180}setFeeStatusByStudent\(\{\}\)/,
  'student fee-status refresh failure must preserve the last known-good map.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'fee: feeStatusError ? "Unavailable"',
  'student fee status source failure must not render as No challan.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'Attendance history is temporarily unavailable for this student.',
  'student profile must distinguish attendance source failure from no attendance records.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'Exam results are temporarily unavailable for this student.',
  'student profile must distinguish results source failure from no exam results.'
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
  'al-siddique-backend/src/server.js',
  "const exposeMessage = status < 500 || process.env.NODE_ENV !== 'production'",
  'production 5xx responses must not expose raw internal exception messages.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "AUTO_MIGRATE_ON_BOOT=false is required in production",
  'production runtime must never apply schema migrations implicitly on boot.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "if (process.env.NODE_ENV === 'production') throw e",
  'production startup must fail fast when any mounted route cannot be registered.'
)

assertNotContains(
  'al-siddique-backend/src/server.js',
  /\^https\?:\\\/\\\/.*assps/,
  'production ASSPS CORS origins must be HTTPS-only.'
)

assertNotContains(
  'al-siddique-backend/src/server.js',
  /env:\s*process\.env\.NODE_ENV|primary:\s*ai\.primaryModel|fallback:\s*ai\.fallbackModel/,
  'public health endpoints must not expose environment or AI model internals.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "/^data:image\\/(?:png|jpe?g|webp);base64,",
  'fee payment proof submissions must accept only trusted image data URLs.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /const \{ proof_image[^\n]+\n\s*if \(!proof_image\)[\s\S]{0,180}Buffer\.byteLength/,
  'fee proof validation must reject arbitrary strings before size-only validation.'
)

assertContains(
  'al-siddique-backend/src/server.js',
  "Payment proof files are not publicly accessible.",
  'financial payment proof files must be blocked from the public static upload tree.'
)

assertNotContains(
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  /paymentScreenshotUrl = file \? `\/uploads\//,
  'legacy subscription request uploads must not store public payment proof URLs.'
)

assertContains(
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'sendEmail: false',
  'subscription provisioning must defer credential email until after the database transaction commits.'
)

assertContains(
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'credentialDelivery',
  'subscription approval response must expose credential delivery truth separately from provisioning success.'
)

assertContains(
  'al-siddique-backend/src/services/apexCredentials.js',
  'return sendActivationEmail({',
  'credential email helper must return provider delivery truth to its caller.'
)

assertContains(
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  "router.get('/subscription/payment-screenshot/:fileName', protect, requireRoles('super_admin', 'admin')",
  'payment proof retrieval must require authenticated administrative access.'
)

assertNotContains(
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  /const url = `\/uploads\/payment-screenshots\//,
  'new payment proof uploads must never return a public static URL.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/subscriptions/SubscriptionRequests.jsx',
  /resolveAssetUrl\(selectedRequest\.payment_screenshot_url\)/,
  'subscription admin UI must fetch payment proof through the authenticated API instead of a public asset URL.'
)

assertNotContains(
  'al-siddique-backend/src/middleware/tenant.js',
  /Assuming false/,
  'tenant schema lookup failures must never be treated as missing tenant columns.'
)

assertContains(
  'al-siddique-backend/src/middleware/tenant.js',
  "lookupError.code = 'TENANT_SCHEMA_LOOKUP_FAILED'",
  'tenant schema lookup failures must propagate explicitly and fail closed.'
)

assertNotContains(
  'al-siddique-backend/src/services/teacherAssignmentService.js',
  /CREATE TABLE IF NOT EXISTS teacher_class_assignments|ALTER TABLE teacher_class_assignments/,
  'teacher assignment services must validate migrated schema instead of mutating schema at runtime.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'const currentPayable = storedGross > 0 || legacyAmount <= 0 ? storedGross : legacyAmount',
  'fee payment must honor stored challan payable totals for legacy rows with monthly_fee=0.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  'remainingBalance: Math.max(0, total - paid)',
  'fee UI must derive remaining balance from the normalized stored challan total.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'remaining_balance = GREATEST($5::numeric - $1::numeric, 0::numeric)',
  'fee payment SQL must type numeric bind arithmetic explicitly so PostgreSQL cannot reject payment writes as ambiguous.'
)

assertContains(
  'al-siddique-backend/src/config/database.js',
  'async function applyTenantContext(client)',
  'database transaction helpers must expose the canonical tenant/RLS context applicator.'
)

assertContains(
  'al-siddique-backend/src/config/database.js',
  'module.exports = { pool, query, tenantContext, applyTenantContext }',
  'routes using explicit transactions must be able to import applyTenantContext.'
)

assertContains(
  'al-siddique-backend/src/services/teacherAssignmentService.js',
  'TEACHER_ASSIGNMENT_SCHEMA_NOT_READY',
  'teacher assignment workflows must fail closed when migration 019 is unavailable.'
)

assertContains(
  'al-siddique-backend/src/config/migrate.js',
  "../../migrations/019_teacher_assignment_schema",
  'migration runner must own teacher assignment schema evolution.'
)

assertContains(
  'al-siddique-backend/src/package.json',
  '"seed": "node seed.js"',
  'backend seed command must target the guarded seed entrypoint that actually exists.'
)

assertContains(
  'al-siddique-backend/src/seed.js',
  "process.env.ALLOW_DUMMY_SEED !== 'true'",
  'dummy academic seed data must require an explicit non-production opt-in.'
)

assertNotContains(
  'al-siddique-frontend/src/services/useAcademicStore.js',
  /catch \(requestError\)[\s\S]{0,280}setData\(EMPTY_ACADEMIC\)/,
  'academic setup refresh failures must preserve the last known-good class configuration.'
)

assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  /router\.get\('\/portal-accounts'[\s\S]*router\.get\('\/:id'/,
  'employee portal batch route must be registered before the generic /:id route.'
)

assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  "router.get('/portal-accounts', protect, canManageStaff",
  'employee portal account hydration must use a tenant-scoped protected batch endpoint.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /Promise\.all\(employees\.map[\s\S]{0,260}\/portal-account/,
  'employee login access must not issue one portal-account request per employee.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  /setEmployeeLoadError\(message\)[\s\S]{0,100}setEmployees\(\[\]\)/,
  'employee list refresh failures must preserve the last known-good staff roster.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /api\.get\('\/api\/fees\/settings'\)\.catch\(\(\) => \(\{ data: \{ data: \{ classSettings: \[\] \} \} \}\)\)/,
  'fee settings source failure must not be converted into an authoritative empty fee configuration.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  'if (!student || !dueDate || feeSettingsLoadError) return',
  'challan creation must fail closed while configured fee settings are unavailable.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /Failed to load fee workspace[\s\S]{0,180}setStudents\(\[\]\)|Failed to load fee workspace[\s\S]{0,220}setChallans\(\[\]\)/,
  'fee workspace source failures must preserve already loaded students and challans.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeReporting.jsx',
  /catch\(err => \{ setChallans\(\[\]\)/,
  'fee reporting source failures must not turn unavailable data into an empty report.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/Analytics.jsx',
  /Unable to load student filters:[\s\S]{0,160}setStudents\(\[\]\)/,
  'attendance analytics filter source failures must preserve the last known-good student list.'
)

assertNotContains(
  'al-siddique-frontend/src/services/useStudentStore.js',
  /catch \(error\)[\s\S]{0,180}_cache = \[\][\s\S]{0,80}notify\(\)/,
  'student roster refresh failures must preserve the last known-good cache instead of reporting zero students.'
)

assertContains(
  'al-siddique-frontend/src/services/useAcademicStore.js',
  'const refreshAcademic = useCallback(async () => {',
  'academic setup refresh must expose a stable callback to avoid consumer render loops.'
)

assertContains(
  'al-siddique-frontend/src/services/useAcademicStore.js',
  'const sectionsForClass = useCallback((className) => {',
  'academic class helpers must keep stable function identity for dependent modules.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryFeature.jsx',
  /loadSavedDiaries\(\)\.catch\(\(\) => \[\]\)/,
  'daily diary list failures must not be converted into authoritative empty data.'
)

assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/DailyDiaryFeature.jsx',
  'Saved diary list is temporarily unavailable. Existing loaded entries were preserved.',
  'daily diary UI must surface list-source failure without erasing known state.'
)

assertContains(
  'al-siddique-backend/src/routes/eventsRoutes.js',
  'normalizeEventPayload',
  'event writes must use explicit domain validation instead of relying on database errors.'
)

assertContains(
  'al-siddique-backend/src/routes/eventsRoutes.js',
  "res.status(422).json({ success: false, message: 'Event validation failed.'",
  'invalid event writes must return a validation response.'
)

assertNotContains(
  'al-siddique-backend/src/config/migrate.js',
  /\.catch\(\(\) => \{\}\)/,
  'schema migration steps must fail closed instead of swallowing database errors.'
)

assertContains(
  'al-siddique-backend/migrations/018_notification_delivery_status_schema.js',
  "'pending','accepted','queued','sent','delivered','failed','undelivered'",
  'notification provider and final delivery states must be versioned distinctly.'
)

assertContains(
  'al-siddique-backend/src/config/migrate.js',
  "require('../../migrations/018_notification_delivery_status_schema')",
  'migration runner must apply notification delivery status migration 018.'
)

assertNotContains(
  'al-siddique-backend/src/config/migrate.js',
  /VARCHAR\(10\) DEFAULT 'sent' CHECK \(status IN \('sent','failed','pending'\)\)/,
  'fresh databases must not collapse provider acceptance into sent status.'
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
  'gradeBands = await loadGradeBandsForSchool(schoolId)',
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


assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /Date\.now\(\) \+ Math\.random\(\)|status:\s*['"]sent['"]\s*,\s*time:\s*now/,
  'notification UI must use provider delivery results instead of fabricating sent status.'
)

assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  'const deliveryResults = Array.isArray(res.data?.results)',
  'notification delivery UI must reflect the backend provider result set.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /Printing Family Single Voucher|Printing Family Double Voucher|Printing Family Triple Voucher|Generating Family Fee Report/,
  'fee actions must not present fake success alerts for unimplemented family outputs.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "router.get('/history/student/:student_id', protect",
  'fee history must be served from a tenant-safe backend endpoint.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  'monthlyFee: Number(item.monthly_fee ?? item.amount ?? 0)',
  'fee UI must distinguish monthly fee from gross challan total.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /One Student \(1 Copy\)|One Student \(1 Copy - Thermal\)|One Student \(2 Copies\)|One Student \(3 Copies\)/,
  'fee action menu must not advertise print variants that route to the same renderer.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/SMSReport.jsx',
  /\['sent','delivered','queued','accepted'\]\.includes\(normalized\).*Delivered/,
  'message report must not label sent/queued provider states as delivered.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/SMSReport.jsx',
  "const accepted = Number(response.data?.accepted || 0)",
  'message retry UI must inspect provider acceptance before reporting retry outcome.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/students/AdmissionsModule.jsx',
  /nextSections\[0\] \|\| ['"]Blue['"]/,
  'admissions must never invent a Blue section when a class has no configured section.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  /CLASSES\[0\] \|\| ['"]Starter['"]|SECTIONS\[0\] \|\| ['"]Blue['"]/,
  'examination filters must come from Academic Setup without invented class/section defaults.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/MarksSheet.jsx',
  /session:\s*['"]2026-2027['"]/,
  'marks sheet must use the configured academic session rather than a hardcoded year.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /String\(year \|\| ['"]2026['"]\).*2026-2027/,
  'fee discount/session logic must not special-case the 2026 academic year.'
)


assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /Math\.random\(|Muhammad Ali|Ayesha Khan|Summer Vacations Announcement|Generate a realistic sample timetable/,
  'portal dashboards and timetables must never synthesize school records.'
)

assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /\|\| ['"]A['"]\s*,/,
  'portal teaching options must not invent an A section.'
)

assertContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  'Recent attendance trend — exact aggregates from the last six recorded school dates.',
  'portal attendance trend must be based on real attendance aggregates.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  /attendance\[student\.id\] \|\| ['"]present['"]|attMap\[s\.id\] \|\| ['"]present['"]/,
  'attendance must never infer Present for unmarked students.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  "label: 'Unmarked'",
  'attendance UI must preserve an explicit unmarked state.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  /\|\| ['"]Starter['"]|\['A'\]|\['English'\]/,
  'timetable authoring must not invent class, section, or subject defaults.'
)


assertNotContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  /Math\.random\(\)/,
  'portal credential generation must not use Math.random.'
)

assertNotContains(
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  /Math\.random\(\)/,
  'subscription request identifiers and uploaded filenames must not use Math.random.'
)

assertNotContains(
  'al-siddique-backend/src/routes/uploadRoutes.js',
  /Math\.random\(\)/,
  'uploaded filename uniqueness must use a cryptographically secure random source.'
)


assertContains(
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  "/api/exams/grade-settings",
  'examination workspace must use the configured school grading policy.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  /Status: \{pct >= 50|total_marks:\s*100,\s*\n\s*\}\);/,
  'examination result UI must not hardcode pass thresholds or saved total marks.'
)


assertNotContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  /mockStudents|mockStudent|high-fidelity mock student/,
  'student APIs must never synthesize school records when storage is unavailable.'
)

assertNotContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  /mockAttendance|Mock Fallback/,
  'attendance APIs must never synthesize attendance records.'
)

assertNotContains(
  'al-siddique-backend/src/routes/noticesRoutes.js',
  /Mock Fallback|mockNotices|Simulating notice/,
  'notice APIs must fail explicitly rather than simulate CRUD success.'
)


assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /ALLOW_MOCK_FALLBACK|Mock Fallback|mockChallans|Simulating successful fee|Simulating payment update/,
  'fee APIs must never fabricate challans, proofs, or payments when storage is unavailable.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
  /student\.section \|\| ['"]A['"]/,
  'date sheet print must not invent a section for students with missing section data.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  /item\.subject \|\| ['"]English['"]|examYear \|\| ['"]2026-2027['"]/,
  'timetable print must not invent subject or academic session values.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
  /item\.session \|\| ['"]2026-2027['"]/,
  'fee settings must not display a hardcoded academic session.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/MarksSheet.jsx',
  /selectedExam\.session \|\| ['"]2026-2027['"]/,
  'marks sheet must not invent a session when an exam has no session.'
)


assertNotContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  /DB offline.*mock exam|Mid Term Examination.*2025-2026|total_marks \|\| 100|pass_marks \|\| 33/,
  'exam APIs must not fabricate exam lists or marks policy defaults.'
)

assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  'passing marks must be between zero and total marks',
  'exam creation must validate its marks policy explicitly.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ManageExams.jsx',
  /total_marks:\s*100|pass_marks:\s*33|SESSIONS\.map/,
  'exam management must collect marks policy and session from real configuration/user input.'
)


assertNotContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  /ALLOW_MOCK_FALLBACK|Mock Student|DB offline.*mock results/,
  'exam result APIs must never fabricate grades or student results.'
)


assertContains(
  'al-siddique-backend/src/routes/paperRoute.js',
  'PAPER_VAULT_SCHEMA_NOT_READY',
  'paper vault routes must fail closed when migration 020 is unavailable.'
)

assertContains(
  'al-siddique-backend/src/config/migrate.js',
  "../../migrations/020_paper_vault_schema",
  'migration runner must own Paper Vault schema evolution.'
)

assertNotContains(
  'al-siddique-backend/src/routes/paperRoute.js',
  /Math\.random\(\)/,
  'paper upload filenames must use a secure random source.'
)

assertNotContains(
  'al-siddique-backend/src/routes/questionBankRoutes.js',
  /Math\.random\(\)/,
  'question bank identifiers must use a secure random source.'
)


assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  "router.delete('/:id', protect, canManageExams",
  'exam deletion must be persisted through a protected backend workflow.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  /setExams\(prev => prev\.filter\(item => item\.id !== exam\.id\)\)\}\}\s*style/,
  'exam delete controls must not remove rows only from browser state.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  /new Date\(\)\.getFullYear\(\).*getFullYear|SECTIONS\.map/,
  'examination workspace must use configured session and class-specific sections.'
)


assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /item\.session \|\| ['"]2026-2027['"]|REAL_CLASS_NAMES|\['Starter', 2500\]|Triple Star Discount Package|session VARCHAR\(20\) DEFAULT ['"]2026-2027['"]/,
  'fee settings must use Academic Setup classes and session instead of hardcoded school defaults.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'const academicClasses = await resolveAcademicClassNames(schoolId)',
  'fee settings must validate classes against the active Academic Setup.'
)


assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'Schema bootstrap must never invent fee amounts, sessions, or discount packages.',
  'fee schema initialization must remain data-neutral.'
)


assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'INSERT INTO fee_payment_transactions',
  'fee payments must append to the durable payment ledger.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'if (cumulativePaid < previousPaid)',
  'fee payment workflow must prevent accidental rollback of recorded paid amounts.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  'paid_amount:Math.min(payable, alreadyPaid + receivedNow)',
  'fee payment UI must submit cumulative paid state, not overwrite prior partial payments.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/StudentFeePanel.jsx',
  /paid_amount:\s*challan\.amount/,
  'student fee quick-pay must use canonical payable totals rather than the legacy amount field.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  /\.catch\(\(\) => \(\{ data: \{ data: \[\] \} \}\)\)|Session 2026-2027|SECTION_LIST\.filter/,
  'attendance workspace must not disguise server errors as empty data or invent session/section context.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  "Attendance data could not be refreshed. Existing loaded attendance was preserved for its original class, section and date.",
  'attendance load failures must remain visible while preserving the last known-good scoped state.'
)


assertNotContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  /api\.get\(['"]\/api\/students['"]\)\.catch\(\(\) => \(\{ data: \{ data: \[\] \} \}\)\)|api\.get\(['"]\/api\/dashboard\/stats['"]\)\.catch/,
  'dashboard must not disguise core API failures as zero/empty school data.'
)

assertContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  "setDashboardError(err.response?.data?.message || 'Core dashboard data could not be loaded from the server.')",
  'dashboard core data failures must be visible and explicit.'
)


assertNotContains(
  'al-siddique-frontend/src/components/dashboard/DashboardAnalyticsCards.jsx',
  /api\.get\(['"]\/api\/students['"]\)\.catch\(\(\) => \(\{ data: \{ data: \[\] \} \}\)\)|api\.get\(`\/api\/attendance\?date=\$\{today\}`\)\.catch/,
  'dashboard attendance modal must not treat core API failures as an empty school.'
)

assertContains(
  'al-siddique-frontend/src/components/dashboard/DashboardAnalyticsCards.jsx',
  "setLoadError(err.response?.data?.message || 'Unmarked attendance data could not be refreshed. Existing loaded attendance state was preserved.')",
  'dashboard attendance load failures must remain explicit without erasing loaded state.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  /api\.get\(['"]\/api\/students['"].*\.catch\(\(\) => \(\{ data: \{ data: \[\] \} \}\)\)/s,
  'mark-attendance roster must not turn API failures into an empty class.'
)

assertContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  'Failed to load attendance roster:',
  'mark-attendance load failures must remain visible.'
)


assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /pool\.query\([^\n]+\)\.catch\(\(\) => \(\{ rows: \[\] \}\)\)/,
  'portal queries must not silently convert database failures into valid-looking empty datasets.'
)

assertContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  'partial: warnings.length > 0',
  'portal API must explicitly report partial-data responses.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/StudentPortal.jsx',
  /\/api\/notify\/inbox['"]\)\.catch|\/api\/exams\/grade-settings['"]\)\.catch/,
  'student portal must not silently replace notification or grading API failures with valid-looking defaults.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/ParentsPortal.jsx',
  /\/api\/notify\/inbox['"]\)\.catch|\/api\/exams\/grade-settings['"]\)\.catch/,
  'parent portal must not silently replace notification or grading API failures with valid-looking defaults.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/fees/StudentFeePanel.jsx',
  /fee-profile['"`]\)\.catch\(\(\) => \(\{ data: \{ data: null \} \}\)\)|alert\(['"]Parent WhatsApp/,
  'student fee panel must not hide server failures or use blocking alerts for missing contact data.'
)

assertContains(
  'al-siddique-frontend/src/Modules/fees/StudentFeePanel.jsx',
  "if (err.response?.status === 404) return { data: { data: null } }",
  'student fee profile may map only a real 404 to an absent profile.'
)


assertNotContains(
  'al-siddique-backend/src/routes/schoolRoutes.js',
  /admin@\$\{code \|\| ['"]school['"]\}\.apex\.com|req\.body\.address \|\| ['"]School Address['"]|req\.body\.principalName \|\| ['"]Principal['"]/,
  'school provisioning must not invent administrator email, address, or principal identity.'
)

assertContains(
  'al-siddique-backend/src/routes/schoolRoutes.js',
  'A valid school administrator email is required.',
  'school provisioning must require a real administrator email.'
)


assertNotContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  /currentSchoolId\(req\).*\|\| 1|req\.user\?\.school_id \|\| 1|Al Siddique Scholars Public School['"]\)|school_name VARCHAR\(255\) NOT NULL DEFAULT/,
  'daily diary storage must not invent school id 1 or a hardcoded school identity.'
)

assertContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  'payload.school_name = canonicalSchoolName',
  'daily diary documents must snapshot the canonical tenant school name.'
)


assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  'WHERE student_id = $1 AND school_id = $2',
  'student fee profile reads must be school scoped in the service layer.'
)

assertNotContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  /WHERE f\.student_id = \$1 AND f\.month = \$2 AND f\.year = \$3\s*\n\s*LIMIT 1/,
  'fee challan lookup must never retain an unscoped legacy fallback.'
)

assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  "error.code = 'FEE_SCHEMA_NOT_TENANT_SAFE'",
  'fee challan lookup must fail closed when tenant schema support is missing.'
)


assertContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  "error: 'ATTENDANCE_TENANT_SCHEMA_REQUIRED'",
  'attendance writes must fail closed when tenant-safe storage columns are unavailable.'
)

assertContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  "error: 'TENANT_CONTEXT_REQUIRED'",
  'attendance writes must require explicit tenant/school context for non-super-admin users.'
)

assertNotContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  /student\.school_id \|\| schoolId \|\| null|student\.tenant_id \|\| tenantId \|\| null/,
  'attendance persistence must never silently write null tenant ownership.'
)


assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  "code: 'RESULT_TENANT_SCHEMA_REQUIRED'",
  'exam result writes must fail closed unless student, exam, and result tables are tenant-safe.'
)

assertContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  "await client.query('BEGIN')",
  'exam result bulk writes must run transactionally.'
)

assertNotContains(
  'al-siddique-backend/src/routes/examRoutes.js',
  /INSERT INTO exams \(name, type, class, session/,
  'exam creation must never fall back to an unscoped legacy insert.'
)


assertContains(
  'al-siddique-backend/src/routes/cardsRoutes.js',
  "code: 'CARD_TENANT_SCHEMA_REQUIRED'",
  'card generation must fail closed when any required source is not tenant-safe.'
)

assertNotContains(
  'al-siddique-backend/src/routes/cardsRoutes.js',
  /INSERT INTO cards \(type, student_id|DELETE FROM cards WHERE id = \$1 \$\{/,
  'card writes and deletes must never use unscoped legacy paths.'
)

assertContains(
  'al-siddique-backend/src/routes/cardsRoutes.js',
  'WHERE er.student_id = $1 AND er.exam_id = $2 AND er.school_id = $3',
  'result-card generation must read results from the selected school only.'
)


assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  "code: 'EMPLOYEE_TENANT_SCHEMA_REQUIRED'",
  'employee writes must fail closed when school ownership is unavailable.'
)

assertNotContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  /UPDATE employees SET is_active = false WHERE id = \$1['"]|supportsTenant \? \['school_id'\] :/,
  'employee mutations must never fall back to unscoped legacy writes.'
)

assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'AND school_id = $3',
  'employee-linked user updates must remain school scoped.'
)


assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "code: 'FEE_TENANT_SCHEMA_REQUIRED'",
  'fee mutations must fail closed unless fee and student storage are tenant-safe.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /DELETE FROM fee_challans WHERE id = \$1 RETURNING|WHERE id = \$6\s*\n\s*RETURNING \*/,
  'fee mutation paths must stay explicitly school scoped.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'Approved submitted payment proof',
  'approved payment proofs must append an auditable payment ledger entry.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "status = CASE WHEN $1 >= $2 THEN 'paid' ELSE 'partial' END",
  'proof approval must preserve partial-payment state when a proof covers only part of the balance.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /Skipping column verification due to offline db/,
  'fee schema initialization failures must never be silently ignored.'
)


assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  'RETURNING *',
  'student fee profile upsert must return the persisted canonical profile.'
)

assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  'computer_fee = EXCLUDED.computer_fee',
  'student fee profile must preserve computer fee instead of silently dropping it.'
)

assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  'lab_fee = EXCLUDED.lab_fee',
  'student fee profile must preserve lab fee instead of silently dropping it.'
)


assertContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  "await client.query('BEGIN')",
  'student admission creation must be transactional.'
)

assertContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  'pg_advisory_xact_lock',
  'student roll-number assignment must be serialized inside the admission transaction.'
)

assertNotContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  /supportsTenantCh|INSERT INTO fee_challans \(challan_no, student_id/,
  'student admission must not create an unscoped first fee challan.'
)

assertContains(
  'al-siddique-backend/src/services/portalAccountService.js',
  'db = null',
  'portal account provisioning must support the caller transaction.'
)

assertContains(
  'al-siddique-backend/migrations/007_student_fee_profile_components.js',
  'CREATE TABLE IF NOT EXISTS student_fee_profiles',
  'fee profile migration must be safe on a fresh database.'
)


assertContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  "code: 'STUDENT_TENANT_SCHEMA_REQUIRED'",
  'student mutations must fail closed unless student storage is school scoped.'
)

assertNotContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  /UPDATE students SET is_active = false WHERE id = \$1['"]|DELETE FROM students WHERE id = \$1['"]/,
  'student update/delete mutations must never use unscoped legacy paths.'
)

assertContains(
  'al-siddique-backend/src/routes/studentRoutes.js',
  'SELECT id, student_user_id, parent_user_id FROM students WHERE id = $1 AND school_id = $2 FOR UPDATE',
  'permanent student deletion must lock and verify the school-scoped student transactionally.'
)


assertNotContains(
  'al-siddique-backend/src/routes/noticesRoutes.js',
  /Skipping notices table creation due to offline db|\|\| ['"]Administration['"]/,
  'notice workflows must not swallow schema failures or invent an Administration author.'
)

assertContains(
  'al-siddique-backend/src/routes/noticesRoutes.js',
  'const schoolId = requireNoticeSchoolContext(req, res)',
  'notice reads and mutations must require explicit school context.'
)


for (const routeFile of [
  'al-siddique-backend/src/routes/transportRoutes.js',
  'al-siddique-backend/src/routes/libraryRoutes.js',
  'al-siddique-backend/src/routes/dateSheetRoutes.js',
]) {
  assertNotContains(
    routeFile,
    /CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|ALTER TABLE/,
    `${routeFile} must not mutate database schema from request handlers; migrations own schema changes.`
  )
}

assertNotContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  /CREATE TABLE IF NOT EXISTS message_drafts|CREATE INDEX IF NOT EXISTS idx_message_drafts_school_user/,
  'message draft request handlers must not create their schema at runtime.'
)

assertContains(
  'al-siddique-backend/migrations/005_operational_domain_storage.js',
  'CREATE TABLE IF NOT EXISTS message_drafts',
  'message draft schema must remain versioned in migrations.'
)


assertNotContains(
  'al-siddique-backend/src/routes/academicRoutes.js',
  /ALTER TABLE|CREATE UNIQUE INDEX/,
  'academic request handlers must not mutate schema; migration 004 owns academic_setup storage.'
)

assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /CREATE TABLE IF NOT EXISTS online_classes|ALTER TABLE online_classes|CREATE INDEX IF NOT EXISTS idx_online_classes/,
  'portal request handlers must not create or alter online_classes schema.'
)

assertNotContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  /ALTER TABLE notification_log|CREATE INDEX IF NOT EXISTS idx_notification_log_school_role_sent/,
  'notification request handlers must not mutate notification schema.'
)

assertContains(
  'al-siddique-backend/migrations/008_portal_notification_schema.js',
  'CREATE TABLE IF NOT EXISTS online_classes',
  'online class schema must be versioned in migration 008.'
)


assertNotContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  /CREATE TABLE IF NOT EXISTS daily_diaries|ALTER TABLE daily_diaries|CREATE INDEX IF NOT EXISTS daily_diaries/,
  'Daily Diary request handlers must not mutate their database schema.'
)

assertContains(
  'al-siddique-backend/migrations/009_daily_diary_schema.js',
  'CREATE TABLE IF NOT EXISTS daily_diaries',
  'Daily Diary schema must be versioned in migration 009.'
)


assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /CREATE TABLE IF NOT EXISTS settings|CREATE TABLE IF NOT EXISTS organizations|CREATE TABLE IF NOT EXISTS campuses|CREATE TABLE IF NOT EXISTS tenant_branding|ALTER TABLE settings ADD COLUMN|ALTER TABLE users ADD COLUMN/,
  'settings request handlers must not mutate settings/identity schema.'
)

assertContains(
  'al-siddique-backend/migrations/010_settings_identity_schema.js',
  'CREATE TABLE IF NOT EXISTS tenant_branding',
  'settings and branding schema must be versioned in migration 010.'
)


for (const uiFile of [
  'al-siddique-frontend/src/Modules/attendance/QRAttendance.jsx',
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
]) {
  assertNotContains(
    uiFile,
    /#071e34|rgba\(11,44,77|rgba\(7,30,52/,
    `${uiFile} must use semantic APEX surfaces instead of the legacy heavy navy shell.`
  )
}


for (const uiFile of [
  'al-siddique-frontend/src/Modules/employees/EmployeesModule.jsx',
  'al-siddique-frontend/src/Modules/families/FamilyModule.jsx',
]) {
  assertNotContains(
    uiFile,
    /rgba\(11,44,77|rgba\(7,30,52|#071e34/,
    `${uiFile} operational chrome must use semantic APEX surfaces.`
  )
}


assertNotContains(
  'al-siddique-backend/src/routes/noticesRoutes.js',
  /CREATE TABLE IF NOT EXISTS notices|ALTER TABLE notices|CREATE INDEX IF NOT EXISTS notices_/,
  'notice request handlers must not mutate notice schema.'
)

assertContains(
  'al-siddique-backend/migrations/011_notices_schema.js',
  'CREATE TABLE IF NOT EXISTS notices',
  'notice schema must be versioned in migration 011.'
)


for (const routeFile of [
  'al-siddique-backend/src/routes/expenseRoutes.js',
  'al-siddique-backend/src/routes/eventsRoutes.js',
  'al-siddique-backend/src/routes/demoRequestRoutes.js',
]) {
  assertNotContains(
    routeFile,
    /CREATE TABLE IF NOT EXISTS|ALTER TABLE .*ADD COLUMN|CREATE INDEX IF NOT EXISTS/,
    `${routeFile} must not mutate schema from request handlers.`
  )
}

assertNotContains(
  'al-siddique-backend/src/routes/eventsRoutes.js',
  /hasColumn\('events'|SELECT \* FROM events ORDER BY event_date|DELETE FROM events WHERE id = \$1 RETURNING/,
  'event reads and mutations must never fall back to cross-tenant unscoped SQL.'
)

assertContains(
  'al-siddique-backend/migrations/012_auxiliary_operations_schema.js',
  'CREATE TABLE IF NOT EXISTS expenses',
  'auxiliary operational schema must be versioned in migration 012.'
)


for (const routeFile of [
  'al-siddique-backend/src/routes/schoolRoutes.js',
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'al-siddique-backend/src/routes/familyRoutes.js',
  'al-siddique-backend/src/routes/examRoutes.js',
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
]) {
  assertNotContains(
    routeFile,
    /CREATE TABLE IF NOT EXISTS|ALTER TABLE .*ADD COLUMN IF NOT EXISTS|CREATE INDEX IF NOT EXISTS/,
    `${routeFile} must not mutate schema from request handlers.`
  )
}

assertContains(
  'al-siddique-backend/migrations/013_core_adjunct_schema.js',
  'CREATE TABLE IF NOT EXISTS employee_attendance',
  'core adjunct schema must be versioned in migration 013.'
)


assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /CREATE TABLE IF NOT EXISTS fee_|ALTER TABLE fee_challans\s*\n?\s*ADD COLUMN IF NOT EXISTS|CREATE INDEX IF NOT EXISTS idx_fee_|CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_challans/,
  'fee request handlers must not mutate fee schema at runtime.'
)

assertContains(
  'al-siddique-backend/migrations/014_fee_system_schema.js',
  'CREATE TABLE IF NOT EXISTS fee_discount_packages',
  'fee schema must be versioned in migration 014.'
)


assertNotContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  /UPDATE admissions SET status = \$1 WHERE id = \$2/,
  'admission status mutations must be scoped by school_id.'
)

assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'WHERE id = $2 AND school_id = $3',
  'admission status mutations must bind the target school in SQL.'
)

assertNotContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  /DELETE FROM daily_diaries WHERE id = \$1['"]|WHERE id = \$13\n\s*RETURNING/,
  'Daily Diary updates and deletes must be scoped by school_id in SQL.'
)


for (const routeFile of [
  'al-siddique-backend/src/routes/admissionRoutes.js',
]) {
  assertNotContains(
    routeFile,
    /const\s+pool\s*=\s*require\(['"]\.\.\/config\/database['"]\)/,
    `${routeFile} must import the actual pg Pool instance instead of the database module object.`
  )
  assertContains(
    routeFile,
    /const\s+\{[^}]*\bpool\b[^}]*\}\s*=\s*require\(['"]\.\.\/config\/database['"]\)/,
    `${routeFile} must use the shared pg Pool export.`
  )
}


assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  "await client.query('BEGIN')",
  'admission approval must create student/accounts and update application status atomically.'
)
assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'SELECT pg_advisory_xact_lock($1)',
  'admission approval must serialize school-scoped GR allocation.'
)
assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'student_user_id = $',
  'admission approval must link generated student portal accounts back to the student row.'
)
assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'parent_user_id = $',
  'admission approval must link generated parent portal accounts back to the student row.'
)
assertNotContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  /Credentials Dispatched|dispatched:\s*!!send_credentials|Parent@\$\{cleanPhone\.slice/,
  'admission approval must not claim unsent credentials were dispatched or generate predictable phone-derived passwords.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx',
  /['"]Demo Student['"]|['"]GR-0001['"]|2026-2027|Sharif Chowk, Rayya Khas|totalSchoolDays \|\| 220|Promoted as per school assessment policy/,
  'protected result-card templates must never fabricate student, school, session, attendance, or promotion facts.'
)
assertContains(
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  "/api/exams/grade-settings",
  'result-card workflow must consume the configured grading policy.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  /2026-2027|Position<\/div>|Al Siddique Scholars Public School/,
  'result-card workflow must not keep legacy hardcoded session, position, or tenant identity output.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  /classNames\?\.length \? classNames : \['Starter'\]|setCls\(classOptions\[0\] \|\| 'Starter'\)/,
  'card generation must not invent Starter as an academic class.'
)


// Route handlers are runtime request code, not a migration engine.
// Any future domain schema evolution must be added under al-siddique-backend/migrations.
const routeDir = path.join(repoRoot, 'al-siddique-backend/src/routes')
for (const fileName of fs.readdirSync(routeDir).filter(name => name.endsWith('.js'))) {
  const relativePath = `al-siddique-backend/src/routes/${fileName}`
  assertNotContains(
    relativePath,
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|ALTER\s+TABLE\s+[A-Za-z0-9_]+\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS|CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS/i,
    'request routes must not perform runtime schema DDL; use a versioned migration.'
  )
}

if (fs.existsSync(path.join(routeDir, 'admissionsRoutes.js'))) {
  fail('al-siddique-backend/src/routes/admissionsRoutes.js: duplicate legacy admission router must not coexist with canonical admissionRoutes.js.')
}
assertContains(
  'al-siddique-backend/src/server.js',
  "mount('/admissions', './routes/admissionRoutes')",
  'the canonical admissions API must mount admissionRoutes.js exactly once.'
)


assertNotContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  /Al Siddique Scholars Public School|\.messages\.create\([\s\S]{0,300}\)\.catch\(\(\) => \{\}\)/,
  'attendance alerts must use canonical tenant identity and must not silently swallow provider failures.'
)
assertContains(
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  'notificationSummary',
  'attendance marking must report provider notification outcomes instead of fire-and-forget success.'
)


assertContains(
  'al-siddique-backend/migrations/015_school_branding_schema.js',
  'ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT',
  'school branding mirror columns must be versioned in migration 015.'
)
assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /UPDATE schools[\s\S]{0,300}\.catch\(\(\) => \{\}\)/,
  'settings branding must not report success when its school mirror update fails.'
)
assertContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  "await client.query('BEGIN')",
  'tenant branding and school branding mirror updates must be atomic.'
)
assertNotContains(
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  /UPDATE schools SET logo_url[\s\S]{0,180}\.catch\(\(\) => undefined\)/,
  'branding upload must not silently ignore school mirror failures.'
)
assertNotContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  /schoolName:[^\n]*\|\| ['"]APEX['"]|academicYear:[^\n]*new Date\(\)\.getFullYear\(\)|#071e34/,
  'branding read model must not invent tenant identity, academic year, or legacy heavy-navy defaults.'
)


assertNotContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  /safeDefaultSettings|success:\s*true[^\n]*temporarily unavailable|schoolName:\s*['"]APEX['"]/,
  'school branding/settings reads must fail closed instead of returning invented tenant identity.'
)
assertContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  "return res.status(503).json({ success: false, message: 'School branding is temporarily unavailable.' })",
  'branding read failures must be explicit to the client.'
)


assertContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  'keep schools + tenant_branding synchronized atomically',
  'school branding writes must keep both branding sources synchronized.'
)
assertContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  'ON CONFLICT (tenant_id)',
  'school branding writes must mirror changes into tenant_branding.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  /2026-2027/,
  'student management and student documents must use Academic Setup session dates rather than a hardcoded session.'
)
assertContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'const academicSession = academicSessionLabel(sessionStart, sessionEnd);',
  'student management must derive its visible academic session from Academic Setup.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  /Al Siddique Scholars Public School|Sharif Chowk, Rayya Khas, Narowal|0300-1291959/,
  'student reports and certificates must not fabricate ASSPS identity for other tenants.'
)

assertNotContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  /returning development mock school|Al Siddique Scholars Public School|feature_flags:\s*\['paper_generator'/,
  'authentication must fail closed instead of inventing a school when storage is unavailable.'
)
assertNotContains(
  'al-siddique-backend/src/middleware/auth.js',
  /returning development mock active school|Al Siddique Scholars Public School/,
  'auth middleware must not invent an active school on database failure.'
)
assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /school_name:\s*'Al Siddique Scholars Public School'|school_address:\s*'Sharif Chowk, Rayya Khas, Narowal'|req\.body\?\.school_name \|\| 'Al Siddique Smart School'/,
  'public/settings identity endpoints must not fabricate tenant identity.'
)
assertContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  "return res.status(404).json({ success: false, message: 'School not found.' })",
  'explicit unknown school references must fail instead of falling back to school 1.'
)


assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /['"]Al Siddique Smart School['"]|['"]Your School Address['"]|['"]\+92-XXX-XXXXXXX['"]|['"]info@alsiddique\.edu\.pk['"]|['"]Principal Name['"]/,
  'settings endpoints must not return fabricated school identity or contact placeholders.'
)
assertContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  'configured: false',
  'unconfigured settings must be represented explicitly instead of with fabricated defaults.'
)
assertNotContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  /feature_flags:\s*\['paper_generator', 'ai_analytics', 'attendance_qr', 'fees_view', 'employees'\]/,
  'virtual branches must inherit canonical school feature policy instead of a hardcoded feature set.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
  /2026-2027|Triple Star Discount Package|monthly_fee:\s*2500|monthly_fee:\s*2800|monthly_fee:\s*3000/,
  'fee settings must not invent academic session, class fees, or discount policy.'
)
assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeSettings.jsx',
  'const activeSession = sessionLabel(sessionStart, sessionEnd)',
  'fee settings must derive their session from Academic Setup.'
)
assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /getClassMonthlyFee\(schoolId, className, session = ['"]2026-2027['"]\)/,
  'fee lookup must not fall back to a hardcoded academic session.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  /const SCHOOL_NAME = ['"]Al Siddique Scholars Public School['"]/,
  'notification templates must use authenticated tenant identity rather than a hardcoded school name.'
)
assertContains(
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
  "api.get('/api/settings')",
  'notification center must load the current tenant school identity.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
  /Al Siddique Scholars Public School|Sharif Chowk, Rayya Khas, Narowal|useState\([^\n]*FINAL_EXAM_SESSION/,
  'date sheet authoring/printing must use live tenant identity and Academic Setup session.'
)
assertContains(
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
  'const activeAcademicSession = academicSessionLabel(sessionStart, sessionEnd)',
  'date sheet default session must come from Academic Setup.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /Al Siddique Scholars Public School|Sharif Chowk, Rayya Khas, Narowal|0300-1291959/,
  'fee operational output must not fabricate ASSPS identity for other tenants.'
)


assertNotContains(
  'al-siddique-backend/src/services/ai/paperAiQueue.js',
  /CREATE TABLE IF NOT EXISTS|CREATE INDEX IF NOT EXISTS|Math\.random\(/,
  'AI queue runtime service must use versioned migrations and secure identifiers.'
)
assertContains(
  'al-siddique-backend/migrations/016_ai_job_queue_schema.js',
  'CREATE TABLE IF NOT EXISTS ai_jobs',
  'AI queue schema must be versioned in migration 016.'
)
assertContains(
  'al-siddique-backend/src/services/ai/paperAiPipeline.js',
  'const ALLOW_AI_MOCK_FALLBACK = false',
  'paper AI pipeline must never fabricate scanner/question output when the AI provider is unavailable.'
)
assertNotContains(
  'al-siddique-backend/src/services/ai/paperAiPipeline.js',
  /Math\.random\(/,
  'paper AI generated identifiers must use a secure random source.'
)


assertNotContains(
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  /Al Siddique Scholars Public School|\.replaceAll\('&', '&'\)/,
  'timetable output must use tenant identity and correctly escape ampersands.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/settings/SettingsModule.jsx',
  /Al Siddique Scholars Public School|Sharif Chowk, Rayya Khas, Narowal|2026-2027|EST\. 2026/,
  'settings previews must not display ASSPS-specific identity, session, or establishment facts for every tenant.'
)


assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /ALLOW_MOCK_FALLBACK/,
  'portal routes must fail closed directly and must not reference an undefined mock-fallback flag.'
)
assertNotContains(
  'al-siddique-backend/src/routes/dashboardRoutes.js',
  /ALLOW_MOCK_FALLBACK/,
  'dashboard routes must not keep obsolete mock-fallback configuration.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/feeConstants.js',
  /defaultFeeAmounts\(monthly = 2500\)/,
  'fee helper defaults must not invent a monthly fee amount.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeSetupFields.jsx',
  /initFeeSetup\(monthlyFee = 2500\)/,
  'student/admission fee setup must start from zero until a canonical fee is loaded.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  /api\.get\(["']\/api\/fees\/settings["']\)[\s\S]{0,500}\.catch\(\(\) => \{\}\)/,
  'student fee setup must surface fee-source failures instead of silently swallowing them.'
)
assertContains(
  'al-siddique-frontend/src/Modules/settings/SettingsModule.jsx',
  'Messaging Settings Unavailable',
  'settings UI must distinguish a load failure from an unverified messaging account.'
)


for (const uiFile of [
  'al-siddique-frontend/src/Modules/families/FamilyModule.jsx',
  'al-siddique-frontend/src/Modules/fees/FeeReporting.jsx',
  'al-siddique-frontend/src/Modules/students/StudentReports.jsx',
]) {
  assertNotContains(
    uiFile,
    /\.catch\(\(\) => set(?:Students|Challans)\(\[\]\)\)/,
    `${uiFile} must not turn API failures into a misleading empty-state dataset.`
  )
}
assertNotContains(
  'al-siddique-frontend/src/Modules/students/StudentReports.jsx',
  /background:\s*['"]#071e34['"]|rgba\(11,44,77,0\.2\)/,
  'student reporting UI must use semantic APEX surfaces.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  /2026-2027|classNames\?\.length \? classNames : \['Starter'\]/,
  'fee operations must use Academic Setup session/classes without hardcoded fallbacks.'
)
assertContains(
  'al-siddique-frontend/src/Modules/fees/FeeModule.jsx',
  'const academicSession = academicSessionLabel(sessionStart, sessionEnd)',
  'fee report printing must derive its session from Academic Setup.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/students/AdmissionsModule.jsx',
  /selectedSections\.length \? selectedSections : \['Blue'\]/,
  'admissions must not invent a Blue section when none is configured.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/fees/CreateChallan.jsx',
  /monthly_fee \|\| 2500|\['Blue'\]|catch\(\(\) => setFeeSettings\(\[\]\)\)/,
  'challan creation must not invent fee amounts/sections or hide fee-settings failures.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/fees/ViewChallans.jsx',
  /useState\(['"]September['"]\)|useState\(['"]2026['"]\)|\['Starter'\]|AL SIDDIQUE SCHOLARS PUBLIC SCHOOL|Sharif Chowk, Rayya Khas, Narowal|03001291959/,
  'challan viewing must use live calendar/class/tenant data rather than protected-file legacy defaults.'
)
assertContains(
  'al-siddique-frontend/src/Modules/fees/ViewChallans.jsx',
  'const [loadError, setLoadError] = useState',
  'challan viewing must expose source failures instead of converting them to empty data.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  /\['Session','2026-2027'/,
  'result-card variants in Cards Generator must use the selected exam session rather than a hardcoded year.'
)
assertContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  "setLoadError(err.response?.data?.message || 'Employee data could not be loaded.')",
  'employee card generation must surface employee-source failures.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  /\.catch\(\(\) => setEmployees\(\[\]\)\)/,
  'employee card generation must not turn API failures into an empty employee dataset.'
)

for (const uiFile of [
  'al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx',
  'al-siddique-frontend/src/pages/ForcePasswordChangePage.jsx',
  'al-siddique-frontend/src/Modules/subscriptions/SubscriptionRequests.jsx',
  'al-siddique-frontend/src/Modules/settings/SettingsModule.jsx',
  'al-siddique-frontend/src/Modules/notifications/NotificationModule.jsx',
]) {
  assertNotContains(
    uiFile,
    /rgba\(11,44,77|rgba\(7,30,52|#071e34|#0B2C4D/,
    `${uiFile} operational chrome must use semantic APEX visual tokens.`
  )
}


for (const uiFile of [
  'al-siddique-frontend/src/context/TenantBrandingContext.jsx',
  'al-siddique-frontend/src/App.jsx',
  'al-siddique-frontend/src/components/PremiumLogo.jsx',
  'al-siddique-frontend/src/components/PremiumProgressLoader.jsx',
  'al-siddique-frontend/src/components/PhotoProfessionalizer.jsx',
  'al-siddique-frontend/src/components/PhotoUploadAI.jsx',
  'al-siddique-frontend/src/Modules/examination/ResultCards.jsx',
  'al-siddique-frontend/src/Modules/fees/SearchableStudentPicker.jsx',
]) {
  assertNotContains(
    uiFile,
    /rgba\(11,44,77|rgba\(7,30,52|#071e34|#0B2C4D/,
    `${uiFile} must use semantic APEX visual surfaces instead of the legacy navy shell.`
  )
}


for (const uiFile of [
  'al-siddique-frontend/src/Modules/examination/MarksSheet.jsx',
  'al-siddique-frontend/src/Modules/examination/ManageExams.jsx',
  'al-siddique-frontend/src/Modules/attendance/SmartAttendance.jsx',
  'al-siddique-frontend/src/Modules/attendance/Analytics.jsx',
]) {
  assertNotContains(
    uiFile,
    /rgba\(11,44,77|rgba\(7,30,52|#071e34|#0B2C4D/i,
    `${uiFile} operational chrome must not reintroduce the legacy heavy navy palette.`
  )
}

// Print/document renderers may retain their approved document palette, but their no-print toolbars use the current app accent colors.
for (const documentHostFile of [
  'al-siddique-frontend/src/Modules/timetable/TimetableModule.jsx',
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'al-siddique-frontend/src/Modules/examination/ExaminationModule.jsx',
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
]) {
  assertContains(
    documentHostFile,
    '#256FE8',
    `${documentHostFile} no-print/document controls should use the current app primary accent without rewriting approved document styling.`
  )
}


assertContains(
  'al-siddique-frontend/src/index.css',
  '--app-bg: var(--apex-bg-canvas);',
  'legacy application aliases must resolve through semantic APEX background tokens.'
)
assertContains(
  'al-siddique-frontend/src/index.css',
  ':root[data-theme="dark"] { color-scheme: dark; }',
  'browser native controls must follow the explicit dark theme mode.'
)
assertNotContains(
  'al-siddique-frontend/src/index.css',
  /--app-bg:\s*#071e34|--app-surface-strong:\s*rgba\(11,44,77|--app-input:\s*rgba\(7,30,52/,
  'root application theme aliases must not fall back to the legacy heavy navy palette.'
)


assertContains(
  'al-siddique-backend/migrations/016_employee_portal_schema.js',
  'ALTER TABLE employees ADD COLUMN IF NOT EXISTS portal_active BOOLEAN DEFAULT TRUE',
  'employee portal linkage schema must be versioned in migration 016.'
)
assertNotContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  /hasColumn\('employees', '(?:user_id|portal_username|portal_role|portal_active|portal_password)'\)\.catch\(\(\) => false\)/,
  'employee portal writes must not silently degrade when required portal columns are missing.'
)
assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'await ensureEmployeePortalSchema()',
  'employee portal workflows must explicitly require their versioned schema.'
)
assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /const tenantFilter = supportsTenant \? 'AND f\.school_id = \$1' : ''/,
  'fee summary must never fall back to a cross-tenant aggregate.'
)
assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "code: 'FEE_TENANT_SCHEMA_REQUIRED'",
  'fee summary must fail closed if its tenant-safe schema is unavailable.'
)


assertContains(
  '.github/workflows/verify.yml',
  'run: npm run production:safety',
  'CI must execute the production safety gate on every verified branch/PR.'
)
assertContains(
  '.github/workflows/verify.yml',
  'run: npm run verify:local',
  'CI must execute the complete local verification pipeline.'
)
assertContains(
  '.github/workflows/verify.yml',
  'run: npm run verify:templates',
  'CI must enforce protected template integrity.'
)



assertNotContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  /\b(?:CREATE|ALTER|DROP|TRUNCATE)\s+(?:TABLE|SCHEMA|INDEX)\b/i,
  'fee challan services must validate migrated schema instead of running request-time DDL.'
)

assertContains(
  'al-siddique-backend/src/services/feeChallanService.js',
  'STUDENT_FEE_PROFILE_SCHEMA_REQUIRED',
  'student fee profile operations must fail closed when migration 007 is missing.'
)


assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'ON CONFLICT DO NOTHING',
  'fee challan creation must handle duplicate races atomically at the database boundary.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  "code: 'CHALLAN_EXISTS'",
  'single challan duplicate conflicts must return an explicit conflict contract.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /CH-\$\{Date\.now\(\)\.toString\(\)\.slice/,
  'challan numbers must not rely on timestamp-only uniqueness.'
)


assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /DEFAULT_ACADEMIC_SETUP|fall through to canonical defaults|fall through to the requested year/,
  'fee workflows must not turn missing or failed academic setup reads into guessed classes or sessions.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  "window.fetch('/api/settings/public',",
  'authenticated Paper Store hydration must never issue an unscoped public settings request (single quotes).'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  'window.fetch("/api/settings/public",',
  'authenticated Paper Store hydration must never issue an unscoped public settings request (double quotes).'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  '/api/settings/public?school_id=',
  'Paper Store public settings fallback must carry an explicit school id.'
)

assertContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  'const classNamesKey = classNames.join(',
  'dashboard academic hydration must keep a stable class-name signature to prevent render/fetch loops.'
)
assertContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  'const stableClassNames = useMemo(',
  'dashboard must derive a stable class list from the class-name signature.'
)
assertContains(
  'al-siddique-frontend/src/Modules/attendance/Analytics.jsx',
  'Existing loaded filters were preserved.',
  'attendance analytics must preserve last known-good student filters when refresh fails.'
)
assertContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  'const { classNames: CLASSES, sectionsForClass } = useAcademicStore()',
  'mark attendance must hydrate classes and sections from the academic store.'
)
assertContains(
  'al-siddique-frontend/src/Modules/attendance/MarkAttendance.jsx',
  'if (!selectedClass || !CLASSES.includes(selectedClass))',
  'mark attendance must reconcile selected class after academic hydration.'
)

assertContains(
  'al-siddique-frontend/src/App.jsx',
  '<Route path="/paper-generator/unified" element={<Navigate to="/paper-generator?tab=build" replace />} />',
  'legacy unified Paper Generator route must continue to open the Paper Workspace build tab.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/PaperGenerator.jsx',
  "{ id:'build', label:'Paper Workspace' }",
  'Paper Generator must keep Paper Workspace as the build tab.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/PaperGenerator.jsx',
  "{ id:'saved', label:'Saved Papers' }",
  'Paper Generator must keep Saved Papers available.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/PaperGenerator.jsx',
  "{ id:'bank', label:'Question Bank' }",
  'Paper Generator must keep Question Bank available.'
)
assertContains(
  'al-siddique-frontend/src/components/Layout/topbar.jsx',
  "<Bell size={18} color={isLight ? '#061A3A' : '#f8fafc'} />",
  'notification bell must remain visible in both light and dark themes.'
)

assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/resolvePaperRoute.js',
  "const isOfficialV13 = paper.documentFormat === 'pts-native-v13'",
  'official V13 papers must remain explicitly classified for Paper Workspace routing.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/resolvePaperRoute.js',
  "const isOfficialV12 = paper.documentFormat === 'official-v12'",
  'official V12 papers must remain explicitly classified for Paper Workspace routing.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/resolvePaperRoute.js',
  "const isOfficialFirstTerm = id.startsWith('official-first-term-') || id.includes('first-term-2026')",
  'First Term papers must remain explicitly classified for Paper Workspace routing.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/resolvePaperRoute.js',
  /if \(isOfficialV13 \|\| isOfficialV12 \|\| isOfficialFirstTerm\) \{[\s\S]{0,80}return 'build'/,
  'official and First Term papers must always route to the Paper Workspace build flow.'
)

assertNotContains(
  'al-siddique-frontend/src/components/Layout/topbar.jsx',
  /catch[^\{]*\{[\s\S]{0,120}setNotifs\(\[\]\)/,
  'topbar notification refresh failures must preserve the last known-good inbox instead of clearing it.'
)
assertContains(
  'al-siddique-frontend/src/components/Layout/topbar.jsx',
  'Topbar notification inbox refresh failed; preserving existing notifications:',
  'topbar notification refresh failure must be explicit while preserving current inbox state.'
)

assertContains(
  'al-siddique-frontend/src/Modules/academic/AcademicSetupModule.jsx',
  "setSyncState('unavailable')",
  'academic setup hydration failures must expose server-unavailable state while preserving cached classes.'
)
assertContains(
  'al-siddique-frontend/src/Modules/academic/AcademicSetupModule.jsx',
  'Server unavailable — showing local cache',
  'academic setup must tell users when the local cache is shown because server hydration failed.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/academic/AcademicSetupModule.jsx',
  /hydrateFromServer[\s\S]{0,500}catch \{[\s\S]{0,100}setSyncState\('local'\)/,
  'academic setup server hydration failure must not be mislabeled as a normal local-cache state.'
)

assertNotContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  /Dashboard events fetch error:[\s\S]{0,120}setUpcomingEvents\(\[\]\)/,
  'dashboard event refresh failures must preserve the last known-good upcoming events.'
)
assertContains(
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  'Existing loaded events were preserved.',
  'dashboard must explicitly report that loaded events were preserved when refresh fails.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/attendance/SMSReport.jsx',
  /Notification history load failed[\s\S]{0,120}setLogs\(\[\]\)/,
  'attendance SMS delivery-history refresh failures must preserve the last known-good log.'
)
assertContains(
  'al-siddique-frontend/src/Modules/attendance/SMSReport.jsx',
  'Existing loaded delivery history was preserved.',
  'attendance SMS delivery-history refresh failure must be explicit while preserving current rows.'
)

assertContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  "superapp_modules: result.rows[0]?.superapp_modules || {},",
  'authenticated settings responses must preserve superapp module configuration for authorized clients.'
)
assertContains(
  'al-siddique-backend/src/tests/public-settings-surface.test.js',
  'assert.doesNotMatch(publicRoute, /superapp_modules/)',
  'public settings must retain regression coverage that blocks internal superapp entitlement metadata.'
)

if (failures.length) {
  console.error('Production safety check FAILED:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Production safety check passed.')

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /hasColumn\('fee_challans', 'school_id'\)\.catch\(\(\) => false\)/,
  'fee routes must not convert tenant-schema lookup failures into unscoped reads.'
)

assertContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  'JOIN students s ON s.id = f.student_id AND s.school_id = f.school_id',
  'fee history must bind challans to students within the same school.'
)

assertNotContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  /hasColumn\('users', 'tenant_id'\)\.catch\(\(\) => false\)/,
  'account creation must not turn tenant-schema lookup failures into tenantless users.'
)

assertContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  'USER_TENANT_SCHEMA_REQUIRED',
  'account creation must fail closed when users.tenant_id is unavailable.'
)

assertContains(
  'al-siddique-backend/src/routes/authRoutes.js',
  'TENANT_CONTEXT_REQUIRED',
  'account creation must require a resolvable tenant context.'
)

assertNotContains(
  'al-siddique-backend/src/services/portalAccountService.js',
  /hasColumn\('users', 'tenant_id'\)\.catch\(\(\) => false\)/,
  'portal account provisioning must not fail open when tenant schema lookup fails.'
)

assertContains(
  'al-siddique-backend/src/services/portalAccountService.js',
  "error.code = 'USER_TENANT_SCHEMA_REQUIRED'",
  'portal account provisioning must require tenant-safe user storage.'
)

assertContains(
  'al-siddique-backend/src/services/portalAccountService.js',
  "error.code = 'TENANT_CONTEXT_REQUIRED'",
  'portal account provisioning must require an explicit tenant context.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  /api\.get\(`\/api\/exams\/results\/\$\{selectedExam\}`\)[\s\S]{0,320}\.catch\(\(\)=>setResults\(\[\]\)\)/,
  'result-card data loads must not convert API failures into an indistinguishable empty result set.'
)

assertContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  'Exam results could not be loaded.',
  'result-card data failures must be visible to the operator.'
)

assertContains(
  'al-siddique-frontend/src/Modules/cards/CardsGeneratorModule.jsx',
  'Exams could not be loaded.',
  'exam-list failures must be visible to the operator.'
)

assertNotContains(
  'al-siddique-backend/src/routes/feeRoutes.js',
  /res\.status\(500\)\.json\(\{ success: false, message: err\.message \}\)/,
  'fee endpoints must not expose raw internal error messages to clients.'
)

for (const routeFile of [
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'al-siddique-backend/src/routes/examRoutes.js',
  'al-siddique-backend/src/routes/opsRoutes.js',
  'al-siddique-backend/src/routes/paperRoute.js',
  'al-siddique-backend/src/routes/studentRoutes.js',
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'al-siddique-backend/src/routes/timetableRoutes.js',
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
]) {
  assertNotContains(
    routeFile,
    /res\.status\(500\)\.json\(\{ success: false, message: err\.message(?: \|\| '[^']*')? \}\)/,
    '500 responses must not expose raw internal error messages to clients.'
  )
}

assertNotContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  /res\.status\(500\)\.json\(\{ success: false, message: err\.message \}\)/,
  'notification endpoints must not expose provider or internal errors to clients.'
)

assertContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  'Notification provider is not available.',
  'notification provider configuration failures must be explicit without leaking provider internals.'
)

assertContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'ADMISSION_TENANT_SCHEMA_REQUIRED',
  'admission reads must fail closed when tenant schema support is unavailable.'
)

assertNotContains(
  'al-siddique-backend/src/routes/admissionRoutes.js',
  /const result = supportsTenant && req\.user\?\.role !== 'super_admin'/,
  'admission reads must never fall back to an unscoped query when tenant support is missing.'
)

assertContains(
  'al-siddique-backend/migrations/017_user_permissions_schema.js',
  "ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb",
  'authoritative user permissions storage must be versioned in migration 017.'
)

assertContains(
  'al-siddique-backend/src/config/migrate.js',
  "require('../../migrations/017_user_permissions_schema')",
  'migration runner must apply user permissions schema migration 017.'
)

assertContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'USER_PERMISSIONS_SCHEMA_REQUIRED',
  'staff permission writes must fail closed when authoritative permission storage is unavailable.'
)

assertNotContains(
  'al-siddique-backend/src/routes/employeeRoutes.js',
  /hasColumn\('users', 'permissions'\)\.catch\(\(\) => false\)/,
  'staff permission writes must not silently degrade when users.permissions lookup fails.'
)

assertNotContains(
  'al-siddique-backend/src/services/portalAccountService.js',
  /hasColumn\('users', 'permissions'\)\.catch\(\(\) => false\)/,
  'portal account provisioning must not silently omit authoritative permissions on schema lookup failure.'
)

assertNotContains(
  'al-siddique-backend/src/config/migrate.js',
  /RLS Migration Error:[\s\S]{0,160}Non-fatal/,
  'RLS migration failures must never be treated as non-fatal.'
)

assertContains(
  'al-siddique-backend/src/config/migrate.js',
  "console.error('RLS Migration Error:', err.message)\n      throw err",
  'migration runner must fail closed when RLS policy application fails.'
)

assertContains(
  'al-siddique-backend/src/middleware/auth.js',
  'function activateRequestRlsContext(req)',
  'authenticated requests must centrally activate the RLS request context.'
)

assertContains(
  'al-siddique-backend/src/middleware/auth.js',
  'ctx.rlsEnabled = true',
  'successful authentication must enable RLS for downstream query-wrapper calls.'
)

assertContains(
  'al-siddique-backend/src/middleware/auth.js',
  "ctx.tenantId = isSuperAdmin ? null : normalizeSchoolId(req.school_id || req.user?.school_id)",
  'non-super-admin authenticated requests must bind RLS context to their school.'
)

assertNotContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  /pool\.query/,
  'portal routes must use the RLS-aware query wrapper instead of direct pool queries.'
)

assertContains(
  'al-siddique-backend/src/routes/portalRoutes.js',
  "const { query } = require('../config/database')",
  'portal routes must execute through the RLS-aware database wrapper.'
)

assertNotContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  /pool\.query/,
  'daily diary routes must use the RLS-aware query wrapper instead of direct pool queries.'
)

assertContains(
  'al-siddique-backend/src/routes/dailyDiaryRoutes.js',
  "const { query } = require('../config/database')",
  'daily diary routes must execute through the RLS-aware database wrapper.'
)

assertNotContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  /pool\.query/,
  'notification routes must use the RLS-aware query wrapper instead of direct pool queries.'
)

assertContains(
  'al-siddique-backend/src/routes/notifyRoutes.js',
  "const { query } = require('../config/database')",
  'notification routes must execute through the RLS-aware database wrapper.'
)

for (const routePath of [
  'al-siddique-backend/src/routes/familyRoutes.js',
  'al-siddique-backend/src/routes/employeeRoutes.js',
  'al-siddique-backend/src/routes/attendanceRoutes.js',
  'al-siddique-backend/src/routes/dateSheetRoutes.js',
]) {
  assertContains(
    routePath,
    'applyTenantContext(client)',
    'tenant-bound transactions must apply the active request RLS context before data access.'
  )
}

for (const routePath of [
  'al-siddique-backend/src/routes/feeRoutes.js',
  'al-siddique-backend/src/routes/examRoutes.js',
  'al-siddique-backend/src/routes/studentRoutes.js',
  'al-siddique-backend/src/routes/questionBankRoutes.js',
]) {
  assertContains(
    routePath,
    'applyTenantContext(client)',
    'high-risk tenant transactions must apply the active request RLS context before data access.'
  )
}

for (const routePath of [
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'al-siddique-backend/src/routes/brandingRoutes.js',
  'al-siddique-backend/src/routes/settingsRoutes.js',
  'al-siddique-backend/src/routes/schoolRoutes.js',
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
]) {
  assertContains(
    routePath,
    'applyTenantContext(client)',
    'protected provisioning/settings transactions must apply tenant or super-admin RLS context.'
  )
}

for (const routePath of [
  'al-siddique-backend/src/routes/admissionRoutes.js',
  'al-siddique-backend/src/routes/brandingRoutes.js',
  'al-siddique-backend/src/routes/demoRequestRoutes.js',
  'al-siddique-backend/src/routes/noticesRoutes.js',
  'al-siddique-backend/src/routes/paperRoute.js',
  'al-siddique-backend/src/routes/schoolRoutes.js',
  'al-siddique-backend/src/routes/settingsRoutes.js',
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  'al-siddique-backend/src/services/twilioSettings.js',
]) {
  assertNotContains(
    routePath,
    /pool\.query/,
    'request/service database access must flow through the RLS-aware query wrapper.'
  )
}

assertNotContains(
  'al-siddique-frontend/src/context/TenantBrandingContext.jsx',
  /schoolName:\s*["']AL SIDDIQUE SCHOLARS PUBLIC SCHOOL["']|migrateLegacy:\s*true|String\(new Date\(\)\.getFullYear\(\)\)/,
  'tenant branding must not guess ASSPS identity, migrate unscoped branding across tenants, or guess the academic year.'
)

for (const shellFile of [
  'al-siddique-frontend/src/components/BrandHeadSync.jsx',
  'al-siddique-frontend/src/components/Layout/sidebar.jsx',
  'al-siddique-frontend/src/pages/Dashboard.jsx',
  'al-siddique-frontend/src/pages/LoginPage.jsx',
]) {
  assertNotContains(
    shellFile,
    /AL SIDDIQUE SCHOLARS PUBLIC SCHOOL/,
    'shared SaaS shell must not impersonate the ASSPS tenant when branding data is missing.'
  )
}

assertNotContains(
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
  /dateSheetFinalExam2026|FINAL_EXAM_|mergeFinalExamRows|validateFinalExamRows|getTenantStorageItem|setTenantStorageItem|writeSheets\(|readSheets\(/,
  'date sheet UI must use server truth and must not seed, migrate, or substitute browser-local timetable data.'
)
assertContains(
  'al-siddique-frontend/src/Modules/DateSheet.jsx',
  'No cached timetable was substituted for live data.',
  'date sheet source failures must be explicit instead of silently falling back to cached business data.'
)

assertNotContains(
  'al-siddique-frontend/src/services/useAcademicStore.js',
  /tenantStorage|localStorage|DEFAULT_ACADEMIC|api\.get\(['"]\/api\/students|Transitional fallback|setData\(localData\)/,
  'academic store must use confirmed academic API data instead of browser, student-derived, or hardcoded live fallbacks.'
)
assertContains(
  'al-siddique-frontend/src/services/useAcademicStore.js',
  "const [data, setData] = useState(EMPTY_ACADEMIC)",
  'academic data must begin empty until the server confirms the tenant setup.'
)

assertNotContains(
  'al-siddique-frontend/src/services/useFamilyStore.js',
  /tenantStorage|loadCache|saveCache|getTenantStorageItem|setTenantStorageItem/,
  'family membership must come from the tenant backend, not browser cache.'
)
assertContains(
  'al-siddique-frontend/src/services/useFamilyStore.js',
  'setFamilies([])',
  'family source failures must clear stale family data instead of preserving it as live truth.'
)

assertNotContains(
  'al-siddique-frontend/src/services/tenantStorage.js',
  /legacyValue|migrateLegacy|removeLegacyOnMigrate|storage\.getItem\(baseKey\)/,
  'tenant storage must never import an unscoped legacy key into an authenticated tenant scope.'
)

assertContains(
  'al-siddique-frontend/src/services/api.js',
  'scopedRequestCacheKey(config.url)',
  'frontend GET cache must be scoped by the authenticated tenant/user context.'
)
assertContains(
  'al-siddique-frontend/src/services/api.js',
  'requestCache.clear()',
  'auth session transitions must clear in-memory API cache state.'
)
assertNotContains(
  'al-siddique-frontend/src/services/api.js',
  /requestCache\.get\(config\.url\)|requestCache\.set\(res\.config\.url/,
  'frontend API cache must never be keyed by URL alone.'
)

assertContains(
  'al-siddique-frontend/src/services/useStudentStore.js',
  'resetForScope(scope)',
  'student in-memory cache must reset when the authenticated tenant/user scope changes.'
)
assertNotContains(
  'al-siddique-frontend/src/services/useStudentStore.js',
  /Keep the last known cache|_cache\s*=\s*_cache\.map|_cache\s*=\s*_cache\.filter|res\.data\?\.data \|\| res\.data \|\| data/,
  'student store must not preserve stale source data, optimistically mutate business truth, or substitute request payloads for confirmed records.'
)

assertContains(
  'al-siddique-frontend/src/Modules/students/StudentModule.jsx',
  'Student update could not be saved.',
  'student edit UI must surface backend write failures instead of closing as if the mutation succeeded.'
)

for (const draftFile of [
  'al-siddique-frontend/src/Modules/Paper-Generator/LessonPlanTab.jsx',
  'al-siddique-frontend/src/Modules/Paper-Generator/UnifiedPaperGenerator.jsx',
]) {
  assertNotContains(
    draftFile,
    /localStorage\.(?:getItem|setItem)/,
    'paper/lesson draft persistence must use tenant-scoped storage instead of global browser keys.'
  )
}
assertContains(
  'al-siddique-frontend/src/Modules/fees/ViewChallans.jsx',
  'Challan status could not be updated.',
  'fee status mutation failures must be visible instead of being silently swallowed.'
)

assertNotContains(
  'al-siddique-backend/src/routes/brandingRoutes.js',
  /svg\+xml|\|svg/,
  'public branding uploads must not accept active SVG content.'
)
assertContains(
  'al-siddique-backend/src/server.js',
  "res.setHeader('X-Content-Type-Options', 'nosniff')",
  'public upload responses must disable MIME sniffing.'
)
assertContains(
  'al-siddique-backend/src/routes/subscriptionRoutes.js',
  'UPLOAD_EXTENSION_BY_MIME[file.mimetype]',
  'subscription uploads must choose stored extensions from the accepted MIME type.'
)
assertContains(
  'al-siddique-backend/src/routes/uploadStorageRoutes.js',
  'IMAGE_EXTENSION_BY_MIME[file.mimetype]',
  'generic image uploads must choose stored extensions from the accepted MIME type.'
)

assertContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  "school_id or school_code is required.",
  'public school settings must require explicit tenant/school context.'
)
assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /branchSchoolId \|\| 1|requestedSchoolId : 1/,
  'public settings must never fall open to school 1.'
)

assertNotContains(
  'al-siddique-backend/src/routes/settingsRoutes.js',
  /Failed to save base64 image:[\s\S]{0,100}return base64Str/,
  'branding image persistence failures must fail closed instead of storing the original data URI.'
)

assertNotContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  /starter:\s*33|mover:\s*42|printsRequired:\s*prints|students:\s*prints/,
  'paper save notifications must not invent class strength or print quantities.'
)
assertContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  'setTenantStorageItem(NOTIFICATIONS_KEY',
  'paper save notifications must be tenant scoped.'
)
assertNotContains(
  'al-siddique-frontend/src/Modules/Paper-Generator/usePaperStore.js',
  /storage\?\.setItem\(NOTIFICATIONS_KEY/,
  'paper save notifications must not use an unscoped browser key.'
)
