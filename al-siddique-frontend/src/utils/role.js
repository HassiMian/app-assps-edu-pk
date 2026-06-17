/** Normalize API/DB role strings for SaaS routing and permissions. */
export function normalizeAppRole(role) {
  const key = String(role || 'admin')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')

  if (key === 'school_admin' || key === 'schooladmin') return 'admin'
  if (key === 'superadmin') return 'super_admin'
  return key
}
