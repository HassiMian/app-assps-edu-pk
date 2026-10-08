const ROLE_LABELS = Object.freeze({
  super_admin: 'Super Admin',
  school_admin: 'School Administrator',
  admin: 'Administrator',
  principal: 'Principal',
  teacher: 'Teacher',
  accountant: 'Accountant',
  parent: 'Parent',
  student: 'Student',
})

export function userRoleLabel(user) {
  const designation = typeof user?.designation === 'string' ? user.designation.trim() : ''
  if (designation) return designation
  const role = String(user?.role || '').trim().toLowerCase().replaceAll('-', '_')
  return ROLE_LABELS[role] || 'School Staff'
}
