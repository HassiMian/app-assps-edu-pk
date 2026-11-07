const { tenantContext } = require('../config/database')
const { query } = require('../config/database')
const { strictPositiveSchoolId } = require('../services/security/strictSchoolIdentity')

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
    const lookupError = new Error(`Tenant schema lookup failed for ${key}`)
    lookupError.code = 'TENANT_SCHEMA_LOOKUP_FAILED'
    lookupError.cause = err
    throw lookupError
  }
}

function resolveSchoolId(...values) {
  for (const value of values) {
    const parsed = strictPositiveSchoolId(value)
    if (parsed !== null) return parsed
  }
  return null
}

function currentSchoolId(req) {
  const role = req?.user?.role
  const isPlatform = role === 'super_admin' || role === 'platform_owner'
  if (req?.user && !isPlatform) {
    // Signed user claims win over mutable request fields. Scoped roles cannot
    // select another school through query parameters or proxy headers.
    const explicitClaims = [req.user.school_id, req.user.schoolId]
      .filter(value => value !== null && value !== undefined)
    if (explicitClaims.length) {
      const validated = explicitClaims.map(strictPositiveSchoolId)
      if (validated.some(value => value === null) ||
          validated.some(value => value !== validated[0])) return null
      return validated[0]
    }
    return resolveSchoolId(req.school_id, req.tenantSchoolId)
  }
  if (!req?.user) {
    // Unauthenticated query strings and headers are never school authority.
    return resolveSchoolId(req?.school_id, req?.tenantSchoolId)
  }
  // Platform actors may explicitly select a school only after authentication;
  // authorization for the requested operation remains the route's responsibility.
  return resolveSchoolId(req.school_id, req.tenantSchoolId,
    req.user.school_id, req.user.schoolId,
    req.query?.school_id, req.query?.schoolId, req.headers?.['x-school-id'])
}

function currentTenantId(req) {
  const user = req?.user
  if (!user) return null
  const isPlatform = user.role === 'super_admin' || user.role === 'platform_owner'
  const raw = isPlatform
    ? (user.tenant_id || user.tenantId || req?.school?.tenant_id ||
       req?.tenant_id || req?.tenantId || req?.query?.tenant_id ||
       req?.query?.tenantId || req?.headers?.['x-tenant-id'])
    : (user.tenant_id || user.tenantId || req?.school?.tenant_id ||
       req?.school?.tenantId || req?.tenant_id || req?.tenantId)
  if (!raw || raw === 'default' || raw === 'null') return null
  return String(raw).trim() || null
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

  const schoolId = currentSchoolId(req)
  if (!schoolId) {
    const error = new Error('Authenticated school scope is required for tenant queries')
    error.code = 'TENANT_SCHOOL_CONTEXT_REQUIRED'
    throw error
  }

  if (!table) {
    return { clause: '', params: [], nextIndex: paramIndex }
  }

  const tenantId = currentTenantId(req)
  const hasSchool = await hasColumn(table, 'school_id')
  const hasTenant = await hasColumn(table, 'tenant_id')
  const params = []
  let nextIndex = paramIndex
  const predicates = []

  if (hasSchool) {
    predicates.push(`${qualifiedColumn(alias, 'school_id')} = $${nextIndex++}`)
    params.push(schoolId)
  }
  if (hasTenant && tenantId) {
    // An OR between independent school_id / tenant_id predicates could return
    // another school's row if either identifier is stale or duplicated.
    // Bind both where available. Preserve legacy rows whose tenant_id is NULL
    // only when their school_id is already proven to match.
    const tenantColumn = qualifiedColumn(alias, 'tenant_id')
    predicates.push(hasSchool
      ? `(${tenantColumn} = $${nextIndex++} OR ${tenantColumn} IS NULL)`
      : `${tenantColumn} = $${nextIndex++}`)
    params.push(tenantId)
  }
  if (!predicates.length) {
    const error = new Error(`Tenant scope columns missing for ${table}`)
    error.code = 'TENANT_SCOPE_COLUMNS_MISSING'
    throw error
  }
  return {
    clause: ` AND (${predicates.join(' AND ')})`,
    params,
    nextIndex,
  }
}

module.exports = { tenantClause, currentSchoolId, currentTenantId, hasColumn }
