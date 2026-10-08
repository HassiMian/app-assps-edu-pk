const { pool } = require('../al-siddique-backend/src/config/database')

const runtimeRole = String(process.env.DB_RUNTIME_ROLE || 'apex_app_runtime').trim()
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(runtimeRole)) {
  throw new Error('Invalid DB_RUNTIME_ROLE')
}

function qIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

async function main() {
  const findings = []
  const role = (await pool.query(
    'SELECT rolname,rolsuper,rolbypassrls,rolinherit,rolcanlogin FROM pg_roles WHERE rolname=$1',
    [runtimeRole],
  )).rows[0]
  if (!role) findings.push('RUNTIME_ROLE_MISSING')
  else {
    if (role.rolsuper) findings.push('RUNTIME_ROLE_SUPERUSER')
    if (role.rolbypassrls) findings.push('RUNTIME_ROLE_BYPASSES_RLS')
    if (role.rolcanlogin) findings.push('RUNTIME_ROLE_CAN_LOGIN')
  }

  const membership = (await pool.query(`
    SELECT m.inherit_option,m.set_option,m.admin_option
    FROM pg_auth_members m
    JOIN pg_roles r ON r.oid=m.roleid
    JOIN pg_roles u ON u.oid=m.member
    WHERE r.rolname=$1 AND u.rolname=current_user
  `, [runtimeRole])).rows[0]
  if (!membership) findings.push('LOGIN_ROLE_RUNTIME_MEMBERSHIP_MISSING')
  else {
    if (membership.inherit_option) findings.push('RUNTIME_ROLE_MUST_NOT_BE_INHERITED')
    if (!membership.set_option) findings.push('RUNTIME_ROLE_SET_PERMISSION_MISSING')
    if (membership.admin_option) findings.push('RUNTIME_ROLE_ADMIN_OPTION_FORBIDDEN')
  }

  const tenantTables = (await pool.query(`
    WITH tt AS (
      SELECT table_name,
             bool_or(column_name='school_id') has_school_id,
             bool_or(column_name='tenant_id') has_tenant_id
      FROM information_schema.columns
      WHERE table_schema='public' AND column_name IN ('school_id','tenant_id')
      GROUP BY table_name
    )
    SELECT tt.table_name,tt.has_school_id,tt.has_tenant_id,
           c.relrowsecurity,c.relforcerowsecurity
    FROM tt
    JOIN pg_class c ON c.relname=tt.table_name
      AND c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p')
    ORDER BY tt.table_name
  `)).rows

  for (const table of tenantTables) {
    if (!table.relrowsecurity) findings.push(`RLS_DISABLED:${table.table_name}`)
    if (!table.relforcerowsecurity) findings.push(`RLS_NOT_FORCED:${table.table_name}`)
    const expected = table.has_school_id || table.table_name === 'schools'
      ? ['app_runtime_school_access', 'app_runtime_school_guard']
      : ['app_runtime_tenant_access', 'app_runtime_tenant_guard']
    const policies = (await pool.query(
      'SELECT policyname,permissive,roles FROM pg_policies WHERE schemaname=\'public\' AND tablename=$1 AND policyname=ANY($2::text[])',
      [table.table_name, expected],
    )).rows
    for (const name of expected) {
      const policy = policies.find(item => item.policyname === name)
      if (!policy) findings.push(`RUNTIME_POLICY_MISSING:${table.table_name}:${name}`)
      else if (!String(policy.roles).includes(runtimeRole)) findings.push(`RUNTIME_POLICY_ROLE_MISMATCH:${table.table_name}:${name}`)
    }
  }

  const fixture = (await pool.query(`
    SELECT s.id,s.tenant_id,COUNT(st.id)::int student_count
    FROM schools s
    LEFT JOIN students st ON st.school_id=s.id
    GROUP BY s.id,s.tenant_id
    ORDER BY COUNT(st.id) DESC,s.id
    LIMIT 1
  `)).rows[0]
  if (!fixture?.id) findings.push('NO_SCHOOL_FIXTURE_FOR_RLS_PROBE')

  if (role && membership && fixture?.id) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`SET LOCAL ROLE ${qIdent(runtimeRole)}`)
      const effective = (await client.query('SELECT current_user username,(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) bypass')).rows[0]
      if (effective.username !== runtimeRole || effective.bypass) findings.push('RUNTIME_ROLE_NOT_EFFECTIVE')

      await client.query("SELECT set_config('app.rls_enabled','true',true),set_config('app.is_super_admin','false',true),set_config('app.tenant_id','',true),set_config('app.tenant_key','',true)")
      const blankCount = Number((await client.query('SELECT COUNT(*)::int n FROM students')).rows[0]?.n || 0)
      if (blankCount !== 0) findings.push(`BLANK_TENANT_CAN_READ_STUDENTS:${blankCount}`)

      await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.tenant_key',$2,true)", [String(fixture.id), String(fixture.tenant_id || '')])
      const scoped = (await client.query('SELECT COUNT(*)::int total,COUNT(*) FILTER (WHERE school_id<>$1)::int cross_school FROM students', [fixture.id])).rows[0]
      if (Number(scoped.cross_school || 0) !== 0) findings.push(`CROSS_SCHOOL_STUDENT_VISIBILITY:${scoped.cross_school}`)
      if (Number(scoped.total || 0) !== Number(fixture.student_count || 0)) findings.push(`SCOPED_STUDENT_COUNT_MISMATCH:${scoped.total}:${fixture.student_count}`)

      const schoolRows = (await client.query('SELECT id FROM schools ORDER BY id')).rows.map(r => Number(r.id))
      if (schoolRows.length !== 1 || schoolRows[0] !== Number(fixture.id)) findings.push(`SCHOOL_TABLE_SCOPE_MISMATCH:${schoolRows.join(',')}`)

      await client.query("SELECT set_config('app.is_super_admin','true',true),set_config('app.tenant_id','',true),set_config('app.tenant_key','',true)")
      const allSchools = Number((await client.query('SELECT COUNT(*)::int n FROM schools')).rows[0]?.n || 0)
      if (allSchools < 1) findings.push('SUPERADMIN_RUNTIME_CANNOT_READ_SCHOOLS')
      await client.query('ROLLBACK')
    } catch (error) {
      try { await client.query('ROLLBACK') } catch (_) {}
      findings.push(`RUNTIME_PROBE_ERROR:${error.code || error.message}`)
    } finally {
      await client.release()
    }
  }

  const result = {
    runtimeRole,
    role,
    membership,
    tenantTableCount: tenantTables.length,
    findings,
    safe: findings.length === 0,
  }
  console.log(JSON.stringify(result, null, 2))
  if (!result.safe) process.exitCode = 1
}

main().finally(() => pool.end())
