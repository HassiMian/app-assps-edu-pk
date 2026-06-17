import axios from 'axios'
import { getTenantStorageItem, setTenantStorageItem } from './tenantStorage'

const api = axios.create({
 baseURL: '',
})

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

function isProductionHost() {
 try {
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  return ['app.assps.edu.pk', 'api.assps.edu.pk'].includes(host)
 } catch {
  return false
 }
}

const ALLOW_DEMO_FALLBACK = !isProductionHost() && (import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === 'true')

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

export function getAuthToken() {
 try {
 return getStorage()?.getItem('al_siddique_token') || null
 } catch {
 return null
 }
}

export function getRefreshToken() {
 try {
 return getStorage()?.getItem('al_siddique_refresh_token') || null
 } catch {
 return null
 }
}

export function getAuthUser() {
 try {
 const raw = getStorage()?.getItem('al_siddique_user')
 return raw ? JSON.parse(raw) : null
 } catch {
 return null
 }
}

export function setAuthSession(token, refreshToken, user) {
 const storage = getStorage()
 if (!storage) return
 try {
 if (token) storage.setItem('al_siddique_token', token)
 if (refreshToken) storage.setItem('al_siddique_refresh_token', refreshToken)
 if (user) storage.setItem('al_siddique_user', JSON.stringify(user))
 } catch {}
}

export function clearAuthSession() {
 const storage = getStorage()
 if (!storage) return
 try {
 storage.removeItem('al_siddique_token')
 storage.removeItem('al_siddique_refresh_token')
 storage.removeItem('al_siddique_user')
 } catch {}
}

// JWT interceptor — har request mein token lagao
api.interceptors.request.use((config) => {
 const token = localStorage.getItem('al_siddique_token')
 if (token) config.headers.Authorization = `Bearer ${token}`
 return config
})

function demoDateOffset(days) {
 const date = new Date()
 date.setHours(0, 0, 0, 0)
 date.setDate(date.getDate() + days)
 return date.toISOString().slice(0, 10)
}

// Demo Data Fallback for testing features when DB is offline
const DEMO_DATA = {
 '/api/students': {
 success: true,
 data: [
 { id: 1, gr_number: 'GR-1001', name: 'Zaid Ahmed', father_name: 'Ahmed Ali', class: '9', section: 'A', roll_number: '1', parent_phone: '03001234501', is_active: true, locality: 'Rayya Khas' },
 { id: 2, gr_number: 'GR-1002', name: 'Ayesha Noor', father_name: 'Noor Muhammad', class: '10', section: 'A', roll_number: '1', parent_phone: '03001234502', is_active: true, locality: 'Narowal' },
 { id: 3, gr_number: 'GR-1003', name: 'Bilal Hassan', father_name: 'Hassan Raza', class: '8', section: 'A', roll_number: '1', parent_phone: '03001234503', is_active: true, locality: 'Sharif Chowk' },
 { id: 4, gr_number: 'GR-1004', name: 'Fatima Ali', father_name: 'Muhammad Ali', class: '1', section: 'A', roll_number: '1', parent_phone: '03214455667', is_active: true, locality: 'Rayya Khas' },
 { id: 5, gr_number: 'GR-1005', name: 'Umer Khan', father_name: 'Khan Muhammad', class: '2', section: 'A', roll_number: '1', parent_phone: '03459988776', is_active: true, locality: 'Zafarwal' },
 { id: 6, gr_number: 'GR-1006', name: 'Zainab Bibi', father_name: 'Bibi Shah', class: '3', section: 'A', roll_number: '1', parent_phone: '03005544332', is_active: true, locality: 'Rayya Khas' },
 { id: 7, gr_number: 'GR-1007', name: 'Hamza Malik', father_name: 'Malik Khan', class: '4', section: 'A', roll_number: '1', parent_phone: '03123344556', is_active: true, locality: 'Narowal' },
 { id: 8, gr_number: 'GR-1008', name: 'Sara Qureshi', father_name: 'Qureshi Ali', class: '5', section: 'A', roll_number: '1', parent_phone: '03056677889', is_active: true, locality: 'Sharif Chowk' },
 { id: 9, gr_number: 'GR-1009', name: 'Ali Raza', father_name: 'Raza Khan', class: '6', section: 'A', roll_number: '1', parent_phone: '03009988776', is_active: true, locality: 'Rayya Khas' },
 { id: 10, gr_number: 'GR-1010', name: 'Maryum Javed', father_name: 'Javed Iqbal', class: '7', section: 'A', roll_number: '1', parent_phone: '03331122334', is_active: true, locality: 'Zafarwal' },
 { id: 11, gr_number: 'GR-1011', name: 'Abdullah Sheikh', father_name: 'Sheikh Rashid', class: '9', section: 'B', roll_number: '1', parent_phone: '03009988112', is_active: true, locality: 'Rayya Khas' },
 { id: 12, gr_number: 'GR-1012', name: 'Noor Fatima', father_name: 'Fatima Zahra', class: '1', section: 'B', roll_number: '1', parent_phone: '03217766554', is_active: true, locality: 'Narowal' },
 { id: 13, gr_number: 'GR-1013', name: 'Rayyan Malik', father_name: 'Malik Raza', class: '10', section: 'B', roll_number: '1', parent_phone: '03451122334', is_active: true, locality: 'Sharif Chowk' },
 { id: 14, gr_number: 'GR-1014', name: 'Hina Pervez', father_name: 'Pervez Iqbal', class: '9', section: 'A', roll_number: '3', parent_phone: '03004455667', is_active: true, locality: 'Zafarwal' },
 { id: 15, gr_number: 'GR-1015', name: 'Mustafa Kamal', father_name: 'Kamal Ataturk', class: '8', section: 'B', roll_number: '2', parent_phone: '03218877665', is_active: true, locality: 'Rayya Khas' },
 ]
 },
 '/api/attendance': {
 success: true,
 data: [
 { id: 1, student_id: 1, status: 'present', date: new Date().toISOString() },
 { id: 2, student_id: 2, status: 'absent', date: new Date().toISOString() },
 { id: 3, student_id: 3, status: 'present', date: new Date().toISOString() },
 { id: 4, student_id: 4, status: 'present', date: new Date().toISOString() },
 { id: 5, student_id: 5, status: 'present', date: new Date().toISOString() },
 { id: 6, student_id: 6, status: 'present', date: new Date().toISOString() },
 ]
 },
 '/api/fees': {
 success: true,
 data: [
 { id: 1, student_id: 1, challan_no: 'CH-1001', month: 'May', amount: 2500, status: 'paid' },
 { id: 2, student_id: 2, challan_no: 'CH-1002', month: 'May', amount: 3500, status: 'unpaid' },
 { id: 3, student_id: 3, challan_no: 'CH-1003', month: 'May', amount: 2800, status: 'paid' },
 { id: 4, student_id: 4, challan_no: 'CH-1004', month: 'May', amount: 2200, status: 'paid' },
 { id: 5, student_id: 5, challan_no: 'CH-1005', month: 'May', amount: 4000, status: 'unpaid' },
 ]
 },
 '/api/employees': {
 success: true,
 data: [
 { id: 1, emp_id: 'EMP-001', name: 'Kamran Akmal', designation: 'Senior Teacher', department: 'Science', salary: 45000 },
 { id: 2, emp_id: 'EMP-002', name: 'Nabeel Ahmed', designation: 'Accountant', department: 'Accounts', salary: 35000 },
 { id: 3, emp_id: 'EMP-003', name: 'Sajid Ali', designation: 'Teacher', department: 'Arts', salary: 30000 },
 ]
 },
 '/api/exams': {
 success: true,
 data: [
 { id: 1, name: 'First Term 2026', type: 'Term Exam', class: '9', session: '2026-2027', total_marks: 100, pass_marks: 33 },
 { id: 2, name: 'Monthly Test May', type: 'Assessment', class: '10', session: '2026-2027', total_marks: 50, pass_marks: 17 },
 ]
 },
 '/api/exams/1/results': {
 success: true,
 data: [
 { id: 1, student_id: 1, student_name: 'Zaid Ahmed', subject: 'Mathematics', marks_obtained: 85, total_marks: 100, grade: 'A+' },
 { id: 2, student_id: 1, student_name: 'Zaid Ahmed', subject: 'Physics', marks_obtained: 78, total_marks: 100, grade: 'A' },
 { id: 3, student_id: 2, student_name: 'Ayesha Noor', subject: 'Mathematics', marks_obtained: 92, total_marks: 100, grade: 'A+' },
 { id: 4, student_id: 2, student_name: 'Ayesha Noor', subject: 'Physics', marks_obtained: 88, total_marks: 100, grade: 'A+' },
 ]
 },
 '/api/exams/2/results': {
 success: true,
 data: [
 { id: 5, student_id: 4, student_name: 'Esha Fatima', subject: 'English', marks_obtained: 42, total_marks: 50, grade: 'A+' },
 ]
 },
 '/api/events': {
 success: true,
 data: [
 { id: 201, title: 'World Turtle Day', description: 'Environmental awareness and nature lesson', event_date: demoDateOffset(0), event_type: 'general', color: '#30D158' },
 { id: 202, title: 'Africa Day', description: 'Diversity and global citizenship activity', event_date: demoDateOffset(2), event_type: 'general', color: '#FF9F0A' },
 { id: 203, title: 'Youm-e-Takbeer', description: 'National pride and Pakistan science day', event_date: demoDateOffset(5), event_type: 'holiday', color: '#30D158' },
 { id: 204, title: 'World No Tobacco Day', description: 'Health and anti-tobacco awareness', event_date: demoDateOffset(7), event_type: 'general', color: '#0A84FF' },
 { id: 205, title: 'School Quiz Day', description: 'Monthly special activity and awards', event_date: demoDateOffset(9), event_type: 'sports', color: '#BF5AF2' },
 ]
 },
 '/api/events/upcoming': {
 success: true,
 data: [
 { id: 201, title: 'World Turtle Day', description: 'Environmental awareness and nature lesson', event_date: demoDateOffset(0), event_type: 'general', color: '#30D158' },
 { id: 202, title: 'Africa Day', description: 'Diversity and global citizenship activity', event_date: demoDateOffset(2), event_type: 'general', color: '#FF9F0A' },
 { id: 203, title: 'Youm-e-Takbeer', description: 'National pride and Pakistan science day', event_date: demoDateOffset(5), event_type: 'holiday', color: '#30D158' },
 { id: 204, title: 'World No Tobacco Day', description: 'Health and anti-tobacco awareness', event_date: demoDateOffset(7), event_type: 'general', color: '#0A84FF' },
 { id: 205, title: 'School Quiz Day', description: 'Monthly special activity and awards', event_date: demoDateOffset(9), event_type: 'sports', color: '#BF5AF2' },
 ]
 }
}

const RESULT_STORE_KEY = 'al_siddique_demo_exam_results'
const EXAM_STORE_KEY = 'al_siddique_demo_exams'
const EMPLOYEE_STORE_KEY = 'al_siddique_demo_employees'
const FEE_STORE_KEY = 'al_siddique_demo_fees'

function safeParseStorage(key, fallback) {
 try {
 return JSON.parse(getTenantStorageItem(key, { migrateLegacy: true }) || JSON.stringify(fallback))
 } catch {
 return fallback
 }
}

function normalizeClassValue(value) {
 if (!value || value === 'All Classes') return 'All Classes'
 return String(value).replace(/^Class\s+/i, '')
}

function normalizeExam(exam = {}) {
 return {
 id: exam.id || Date.now(),
 name: exam.name || 'Untitled Exam',
 type: exam.type || exam.exam_type || 'Term Exam',
 class: normalizeClassValue(exam.class || exam.class_name || 'All Classes'),
 session: exam.session || '2026-2027',
 total_marks: Number(exam.total_marks || 100),
 pass_marks: Number(exam.pass_marks || 33),
 start_date: exam.start_date || null,
 end_date: exam.end_date || null,
 }
}

function getStoredExams() {
 const seed = DEMO_DATA['/api/exams'].data.map(normalizeExam)
 const stored = safeParseStorage(EXAM_STORE_KEY, null)
 if (!Array.isArray(stored)) {
 setStoredExams(seed)
 return seed
 }
 const byId = new Map(seed.map(item => [String(item.id), item]))
 stored.map(normalizeExam).forEach(item => byId.set(String(item.id), item))
 return Array.from(byId.values())
}

function setStoredExams(exams) {
 setTenantStorageItem(EXAM_STORE_KEY, JSON.stringify(exams.map(normalizeExam)))
}

function normalizeEmployee(employee = {}) {
 return {
 ...employee,
 id: employee.id || Date.now(),
 emp_id: employee.emp_id || `EMP-${String(employee.id || Date.now()).slice(-3)}`,
 name: employee.name || 'Employee Name',
 designation: employee.designation || '',
 department: employee.department || '',
 salary: Number(employee.salary || 0),
 photo: employee.photo || employee.image || employee.profile_photo || employee.profilePhoto || employee.profileImage || employee.profile_image || employee.photo_url || employee.photoUrl || employee.image_url || employee.imageUrl || employee.employee_photo || employee.employeePhoto || employee.staff_photo || employee.staffPhoto || '',
 is_active: employee.is_active !== undefined ? employee.is_active : employee.status !== 'Inactive',
 }
}

function getStoredEmployees() {
 const seed = DEMO_DATA['/api/employees'].data.map(normalizeEmployee)
 const stored = safeParseStorage(EMPLOYEE_STORE_KEY, null)
 if (!Array.isArray(stored)) {
 setStoredEmployees(seed)
 return seed
 }
 const byId = new Map(seed.map(item => [String(item.id), item]))
 stored.map(normalizeEmployee).forEach(item => byId.set(String(item.id), item))
 return Array.from(byId.values())
}

function setStoredEmployees(employees) {
 setTenantStorageItem(EMPLOYEE_STORE_KEY, JSON.stringify(employees.map(normalizeEmployee)))
}

function normalizeFeeChallan(challan = {}) {
 return {
 ...challan,
 id: challan.id || Date.now(),
 challan_no: challan.challan_no || `CH-${String(challan.id || Date.now()).slice(-4)}`,
 amount: Number(challan.amount || 0),
 paid_amount: Number(challan.paid_amount || 0),
 discount: Number(challan.discount || 0),
 payment_mode: challan.payment_mode || null,
 payment_note: challan.payment_note || '',
 status: challan.status || 'unpaid',
 }
}

function getStoredFees() {
 const seed = DEMO_DATA['/api/fees'].data.map(normalizeFeeChallan)
 const stored = safeParseStorage(FEE_STORE_KEY, null)
 if (!Array.isArray(stored)) {
 setStoredFees(seed)
 return seed
 }
 const byId = new Map(seed.map(item => [String(item.id), item]))
 stored.map(normalizeFeeChallan).forEach(item => byId.set(String(item.id), item))
 return Array.from(byId.values())
}

function setStoredFees(fees) {
 setTenantStorageItem(FEE_STORE_KEY, JSON.stringify(fees.map(normalizeFeeChallan)))
}

function readRequestPayload(config) {
 try {
 return typeof config?.data === 'string' ? JSON.parse(config.data) : (config?.data || {})
 } catch {
 return {}
 }
}

function getStoredExamResults() {
 return safeParseStorage(RESULT_STORE_KEY, {})
}

function setStoredExamResults(data) {
 setTenantStorageItem(RESULT_STORE_KEY, JSON.stringify(data))
}

function getDemoExamResults(examId) {
 const stored = getStoredExamResults()
 if (stored[examId]) return stored[examId]
 const seedKey = examId === '1' ? '/api/exams/1/results' : '/api/exams/2/results'
 return DEMO_DATA[seedKey]?.data || []
}

function normalizeResultPayload(config) {
 const raw = config?.data
 if (!raw) return []
 try {
 const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
 return Array.isArray(parsed?.results) ? parsed.results : []
 } catch {
 return []
 }
}

// Auto-logout on 401 & Demo Fallback
api.interceptors.response.use(
 (res) => res,
 (err) => {
 const url = err.config?.url || '';
 const method = (err.config?.method || 'get').toLowerCase();

 if (err.response?.status === 401) {
 localStorage.removeItem('al_siddique_token');
 localStorage.removeItem('al_siddique_user');
 window.location.href = '/login';
 return Promise.reject(err);
 }

  const authUser = getAuthUser()
  const isRealSession = authUser && authUser.email && authUser.email !== 'demo@assps.edu.pk'
  if (isRealSession || !ALLOW_DEMO_FALLBACK) {
    return Promise.reject(err);
  }
 
 // Extract relative path if baseURL is present and strip query params
 let match = url.replace('http://localhost:3001', '').replace(window.location.origin, '').split('?')[0];
 
 // Handle parameterized URLs like /api/exams/results/1
 if (match.match(/\/api\/exams\/results\/\d+/)) {
 const examId = match.split('/').pop()
 return Promise.resolve({
 data: { success: true, data: getDemoExamResults(examId) },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/attendance/mark' && method === 'post') {
 const incoming = readRequestPayload(err.config);
 const records = incoming.records || [];
 const stored = safeParseStorage('al_siddique_demo_attendance', DEMO_DATA['/api/attendance']?.data || []);
 records.forEach(r => {
 const found = stored.findIndex(s => String(s.student_id) === String(r.student_id) && s.date === r.date);
 if (found >= 0) stored[found] = { ...stored[found], status: r.status };
 else stored.push({ id: Date.now(), ...r });
 });
 setTenantStorageItem('al_siddique_demo_attendance', JSON.stringify(stored));
 return Promise.resolve({
 data: { success: true, message: 'Attendance saved in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/exams/results' && method === 'post') {
 const incoming = normalizeResultPayload(err.config)
 const stored = getStoredExamResults()
 incoming.forEach((row, index) => {
 const examId = String(row.exam_id)
 const existing = stored[examId] || getDemoExamResults(examId)
 const nextRow = {
 id: row.id || Date.now() + index,
 student_id: row.student_id,
 student_name: row.student_name,
 subject: row.subject,
 marks_obtained: row.marks_obtained,
 total_marks: row.total_marks,
 grade: row.grade,
 }
 const found = existing.findIndex(item => String(item.student_id) === String(row.student_id) && item.subject === row.subject)
 if (found >= 0) existing[found] = { ...existing[found], ...nextRow }
 else existing.push(nextRow)
 stored[examId] = existing
 })
 setStoredExamResults(stored)
 return Promise.resolve({
 data: { success: true, data: incoming, message: 'Marks saved in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/exams' && method === 'post') {
 let incoming
 try {
 incoming = typeof err.config?.data === 'string' ? JSON.parse(err.config.data) : err.config?.data
 } catch {
 incoming = null
 }
 incoming = incoming || {}
 const exams = getStoredExams()
 const nextExam = normalizeExam({ ...incoming, id: incoming.id || Date.now() })
 exams.push(nextExam)
 setStoredExams(exams)
 return Promise.resolve({
 data: { success: true, data: nextExam, message: 'Exam saved in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/exams' && method === 'get') {
 return Promise.resolve({
 data: { success: true, data: getStoredExams() },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/employees' && method === 'get') {
 return Promise.resolve({
 data: { success: true, data: getStoredEmployees() },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/employees' && method === 'post') {
 const employees = getStoredEmployees()
 const nextEmployee = normalizeEmployee({ ...readRequestPayload(err.config), id: Date.now() })
 employees.unshift(nextEmployee)
 setStoredEmployees(employees)
 return Promise.resolve({
 data: { success: true, data: nextEmployee, message: 'Employee saved in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/fees' && method === 'get') {
 let fees = getStoredFees()
 const params = err.config?.params || {}
 if (params.status) fees = fees.filter(item => item.status === params.status)
 if (params.month) fees = fees.filter(item => item.month === params.month)
 if (params.class) fees = fees.filter(item => String(item.class) === normalizeClassValue(params.class))
 if (params.student_id) fees = fees.filter(item => String(item.student_id) === String(params.student_id))
 return Promise.resolve({
 data: { success: true, count: fees.length, data: fees },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match.match(/\/api\/fees\/[^/]+\/pay$/) && method === 'put') {
 const id = match.split('/').slice(-2)[0]
 const fees = getStoredFees()
 const incoming = readRequestPayload(err.config)
 const found = fees.findIndex(item => String(item.id) === String(id))
 if (found < 0) return Promise.reject(err)
 const paid = Math.max(0, Number(incoming.paid_amount || 0))
 const discount = Math.max(0, Number(incoming.discount || 0))
 const net = Math.max(0, Number(fees[found].amount || 0) - discount)
 const status = paid <= 0 ? 'unpaid' : paid < net ? 'partial' : 'paid'
 fees[found] = normalizeFeeChallan({
 ...fees[found],
 paid_amount: paid,
 discount,
 payment_mode: incoming.payment_mode || 'cash',
 payment_note: incoming.payment_note || '',
 paid_date: paid > 0 ? new Date().toISOString().slice(0, 10) : null,
 status,
 })
 setStoredFees(fees)
 return Promise.resolve({
 data: { success: true, data: fees[found], message: status === 'paid' ? 'Fee paid in demo storage.' : 'Partial fee saved in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match.match(/\/api\/employees\/[^/]+$/) && method === 'put') {
 const id = match.split('/').pop()
 const employees = getStoredEmployees()
 const incoming = readRequestPayload(err.config)
 const found = employees.findIndex(item => String(item.id) === String(id))
 const nextEmployee = normalizeEmployee({ ...(found >= 0 ? employees[found] : {}), ...incoming, id })
 if (found >= 0) employees[found] = nextEmployee
 else employees.unshift(nextEmployee)
 setStoredEmployees(employees)
 return Promise.resolve({
 data: { success: true, data: nextEmployee, message: 'Employee updated in demo storage.' },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (match === '/api/auth/me') {
 const saved = localStorage.getItem('al_siddique_user');
 let user = { id: 1, name: 'Siddique Admin', email: 'admin@demo.local', role: 'admin' };
 try {
 if (saved) user = JSON.parse(saved);
 } catch {
 localStorage.setItem('al_siddique_user', JSON.stringify(user));
 }
 return Promise.resolve({
 data: { success: true, user },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 if (DEMO_DATA[match]) {
 console.warn(` Serving Demo Data for: ${url}`);
 let payload = DEMO_DATA[match]
 if (match === '/api/students' && err.config?.params?.class) {
 payload = {
 ...payload,
 data: payload.data.filter(s => String(s.class) === normalizeClassValue(err.config.params.class))
 }
 }
 return Promise.resolve({ data: payload, status: 200, statusText: 'OK', headers: {}, config: err.config });
 }

 // Mock Login Fallback
 if (match === '/api/auth/login' && err.config.method === 'post') {
 const { email } = JSON.parse(err.config.data);
 console.warn(` Using Mock Login for: ${email}`);
 return Promise.resolve({
 data: {
 success: true,
 token: 'mock-jwt-token',
 user: { 
 id: 1, 
 name: email.includes('admin') ? 'Siddique Admin' : 'Senior Teacher', 
 email, 
 role: email.includes('admin') ? 'admin' : 'teacher' 
 },
 message: 'Welcome to Demo Mode!'
 },
 status: 200,
 statusText: 'OK',
 headers: {},
 config: err.config
 });
 }

 return Promise.reject(err);
 }
);

export default api;
