const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')

test('database facade switches authenticated requests into a restricted runtime role', () => {
  const source = read('al-siddique-backend/src/config/database.js')
  assert.match(source, /DB_RUNTIME_ROLE/)
  assert.match(source, /SET ROLE/)
  assert.match(source, /RESET ROLE/)
  assert.match(source, /TENANT_CONTEXT_REQUIRED/)
  assert.match(source, /app\.tenant_key/)
  assert.match(source, /new Proxy\(rawPool/)
  assert.match(source, /await client\.release\(\)/)
})

test('auth binds both numeric school identity and tenant key before protected handlers execute', () => {
  const source = read('al-siddique-backend/src/middleware/auth.js')
  assert.match(source, /ctx\.rlsEnabled = true/)
  assert.match(source, /ctx\.tenantId = isSuperAdmin \? null : normalizeSchoolId/)
  assert.match(source, /ctx\.tenantKey = isSuperAdmin \? null : String\(req\.tenant_id/)
})

test('DBA migration provisions a SET-only NOBYPASSRLS application role without weakening paper ownership', () => {
  const source = read('al-siddique-backend/src/migrations/20261008_app_runtime_rls_v1.sql')
  assert.match(source, /CREATE ROLE apex_app_runtime NOLOGIN NOBYPASSRLS/)
  assert.match(source, /GRANT apex_app_runtime TO apexos_user WITH INHERIT FALSE, SET TRUE/)
  assert.match(source, /pg_get_userbyid\(c\.relowner\)='apexos_user'/)
  assert.match(source, /app_runtime_school_access/)
  assert.match(source, /app_runtime_school_guard/)
  assert.match(source, /AS RESTRICTIVE FOR ALL TO apex_app_runtime/)
  assert.match(source, /app_runtime_tenant_access/)
  assert.match(source, /app_runtime_tenant_guard/)
  assert.match(source, /ALTER TABLE public\.schools FORCE ROW LEVEL SECURITY/)
  assert.match(source, /id::text = NULLIF\(current_setting\('app\.tenant_id'/)
  assert.match(source, /tenant_id::text = NULLIF\(current_setting\(''app\.tenant_key''/)
  assert.doesNotMatch(source, /GRANT\s+ALL\s+ON\s+ALL\s+TABLES/i)
})

test('production environment contract names the restricted runtime role explicitly', () => {
  const source = read('al-siddique-backend/src/.env.example')
  assert.match(source, /^DB_RUNTIME_ROLE=apex_app_runtime$/m)
})

test('read-only runtime RLS gate checks role, policies, blank tenant denial, and cross-school isolation', () => {
  const source = read('ops/check-app-runtime-rls.cjs')
  assert.match(source, /RUNTIME_ROLE_BYPASSES_RLS/)
  assert.match(source, /BLANK_TENANT_CAN_READ_STUDENTS/)
  assert.match(source, /CROSS_SCHOOL_STUDENT_VISIBILITY/)
  assert.match(source, /SCHOOL_TABLE_SCOPE_MISMATCH/)
  assert.match(source, /RUNTIME_POLICY_MISSING/)
})
