//  Master Permission Definitions 
// Each permission has: key (unique), label (display), route (for sidebar matching)

import { normalizeAppRole } from '../utils/role'

export const PERMISSION_GROUPS = [
 {
 group: 'Students',
 icon: '',
 perms: [
 { key: 'students_view', label: 'Students', route: '/students' },
 { key: 'students_add', label: 'Add Student', route: '/students' },
 { key: 'families', label: 'Families', route: '/families' },
 { key: 'admissions', label: 'Admissions', route: '/students/admissions' },
 { key: 'student_reports', label: 'Student Reports', route: '/students/reports' },
 { key: 'promote', label: 'Promote / Demote', route: '/students/promote' },
 ],
 },
 {
 group: 'Fee Collection',
 icon: '',
 perms: [
 { key: 'fees_create', label: 'Create Challan', route: '/fees/create' },
 { key: 'fees_view', label: 'Fee Records', route: '/fees/challans' },
 { key: 'fees_collect', label: 'Collect Fee', route: '/fees/challans' },
 { key: 'fees_reports', label: 'Fee Reports', route: '/fees/reports' },
 { key: 'fees_settings', label: 'Fee Settings', route: '/fees/settings' },
 ],
 },
 {
 group: 'Attendance',
 icon: '',
 perms: [
 { key: 'attendance_mark', label: 'Attendance', route: '/attendance/mark' },
 { key: 'attendance_view', label: 'Attendance View', route: '/attendance' },
 { key: 'attendance_analytics', label: 'Attendance Analytics', route: '/attendance/analytics' },
 { key: 'attendance_sms', label: 'SMS Reports', route: '/attendance/sms' },
 { key: 'attendance_qr', label: 'QR Attendance', route: '/attendance/qr-scan' },
 ],
 },
 {
 group: 'Examination',
 icon: '',
 perms: [
 { key: 'exams_manage', label: 'Examinations', route: '/exams' },
 { key: 'exams_marks', label: 'Marks Entry', route: '/exams/marks' },
 { key: 'exams_results', label: 'Result Cards', route: '/exams/results' },
 { key: 'exams_grades', label: 'Grade Setup', route: '/exams/grades' },
 ],
 },
 {
 group: 'Academics',
 icon: '',
 perms: [
 { key: 'paper_generator', label: 'Paper Generator', route: '/paper-generator' },
 { key: 'question_bank', label: 'Question Bank', route: '/question-bank' },
 { key: 'timetable', label: 'Timetable', route: '/timetable' },
 { key: 'datesheet', label: 'Datesheet', route: '/datesheet' },
 ],
 },
 {
 group: 'Operations',
 icon: '',
 perms: [
 { key: 'library', label: 'Library', route: '/library' },
 { key: 'transport', label: 'Transport', route: '/transport' },
 { key: 'expenses', label: 'Expenses', route: '/expenses' },
 { key: 'messages', label: 'Messages', route: '/messages' },
 { key: 'notifications', label: 'Notifications', route: '/notifications' },
 { key: 'cards', label: 'Identity Cards', route: '/cards' },
 ],
 },
 {
 group: 'Management (Admin)',
 icon: '',
 perms: [
 { key: 'employees', label: 'Employees', route: '/employees' },
 { key: 'academic_setup', label: 'Academic Setup', route: '/academic' },
 { key: 'ai_analytics', label: 'AI Analytics', route: '/ai-analytics' },
 { key: 'settings', label: 'System Settings', route: '/settings' },
 ],
 },
]

// Flat list for easy lookups
export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.perms)

// Roles that bypass permissions entirely (they see everything)
export const ADMIN_ROLES = ['super_admin', 'admin', 'principal', 'school_admin']

// Default permissions auto-assigned to teachers
export const DEFAULT_TEACHER_PERMISSIONS = [
 'students_view',
 'attendance_mark',
 'attendance_view',
 'exams_marks',
 'exams_results',
 'paper_generator',
 'timetable',
 'datesheet',
 'messages',
 'notifications',
]

// Check if a user has a specific permission
export function hasPermission(user, permKey) {
 if (!user) return false
 if (ADMIN_ROLES.includes(normalizeAppRole(user.role))) return true
 if (user.role === 'student') return false
 if (user.role === 'parent') return false
 const rawPerms = user.permissions || user.module_access || []
 const perms = Array.isArray(rawPerms)
  ? rawPerms
  : Object.entries(rawPerms).filter(([, enabled]) => Boolean(enabled)).map(([key]) => key)
 return perms.includes(permKey)
}
