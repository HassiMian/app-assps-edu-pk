const { tenantContext } = require('../config/database')
const { query } = require('../config/database')

const columnCache = new Map()

async function hasColumn(tableName, columnName) {
  const key = `${tableName}.${columnName}`
  if (columnCache.has(key)) return columnCache.get(key)

  try {
    const result = await query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `, [tableName, columnName])

    const exists = result.rowCount > 0
    columnCache.set(key, exists)
    return exists
  } catch (err) {
    console.warn(`Database offline during hasColumn check for ${key}. Assuming false. Error: ${err.message}`)
    return false
  }
}

function resolveSchoolId(...values) {
  for (const value of values) {
    const numeric = Number.parseInt(value, 10)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric
    }
  }
  return null
}

function currentSchoolId(req) {
  return resolveSchoolId(
    req?.school_id,
    req?.tenantSchoolId,
    req?.user?.school_id,
    req?.user?.schoolId,
    req?.query?.school_id,
    req?.query?.schoolId,
    req?.headers?.['x-school-id']
  )
}

function currentTenantId(req) {
  const isScopedUser = req?.user && req.user.role !== 'super_admin' && req.user.role !== 'platform_owner'
  const raw = (
    req?.tenant_id ||
    req?.tenantId ||
    req?.user?.tenant_id ||
    req?.user?.tenantId ||
    req?.school?.tenant_id ||
    req?.school?.tenantId ||
    (isScopedUser ? null : (
    req?.query?.tenant_id ||
    req?.query?.tenantId ||
    req?.headers?.['x-tenant-id']
    )) ||
    null
  );
  if (!raw || raw === 'default' || raw === 'null') return null;
  return String(raw).trim() || null;
}

function qualifiedColumn(alias, column) {
  return `${alias ? `${alias}.` : ''}${column}`
}

async function tenantClause(req, { table, alias = '', paramIndex = 1 } = {}) {
  const role = req.user?.role || ''
  const isSuperAdmin = role === 'super_admin' || role === 'platform_owner'
  
  const ctx = tenantContext.getStore()
  if (ctx) {
    ctx.rlsEnabled = true
    if (isSuperAdmin) {
      ctx.isSuperAdmin = true
    } else {
      ctx.isSuperAdmin = false
      ctx.tenantId = currentSchoolId(req)
    }
  }

  if (isSuperAdmin) {
    return { clause: '', params: [], nextIndex: paramIndex }
  }

  if (!table) {
    return { clause: '', params: [], nextIndex: paramIndex }
  }

  const predicates = []
  const params = []
  let nextIndex = paramIndex
  const schoolId = currentSchoolId(req)
  const tenantId = currentTenantId(req)

  if (schoolId && await hasColumn(table, 'school_id')) {
    predicates.push(`${qualifiedColumn(alias, 'school_id')} = $${nextIndex++}`)
    params.push(schoolId)
  }

  if (tenantId && await hasColumn(table, 'tenant_id')) {
    predicates.push(`${qualifiedColumn(alias, 'tenant_id')} = $${nextIndex++}`)
    params.push(tenantId)
  }

  if (predicates.length === 0) {
    throw new Error(`Tenant scope columns missing for ${table}`)
  }

  return {
    clause: ` AND (${predicates.join(' OR ')})`,
    params,
    nextIndex,
  }
}

module.exports = { tenantClause, currentSchoolId, currentTenantId, hasColumn }
