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
  "const sent = Number(response.data?.sent || 0)",
  'message retry UI must inspect the provider result before claiming success.'
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
  "setLoadError(err.response?.data?.message || 'Attendance data could not be loaded from the server.')",
  'attendance load failures must remain visible to the user.'
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
  "setLoadError(err.response?.data?.message || 'Unmarked attendance data could not be loaded from the server.')",
  'dashboard attendance load failures must remain explicit.'
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

if (failures.length) {
  console.error('Production safety check FAILED:')
  for (const item of failures) console.error(`- ${item}`)
  process.exit(1)
}

console.log('Production safety check passed.')
