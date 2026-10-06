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
