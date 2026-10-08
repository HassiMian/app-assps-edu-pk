'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
// NEVER run against the live database. This suite requires a dedicated,
// ephemeral PostgreSQL cluster on a loopback-only port.
assert.equal(process.env.DB_NAME, 'assps_core_rls_clone_20261008')
assert.equal(process.env.DB_HOST, '127.0.0.1')
assert.equal(process.env.DB_PORT, '55432')
assert.equal(process.env.DB_USER, 'assps_core_test_login')
assert.equal(process.env.DB_RUNTIME_ROLE, 'apex_app_runtime')
assert.equal(process.env.DB_ENFORCE_LEAST_PRIVILEGE_LOGIN,'true')
process.env.DB_STARTUP_PROBE='false'
const { pool,query,tenantContext } = require('../config/database')
test.after(async () => { await pool.end() })
const ctx = (id, fn) => tenantContext.run({rlsEnabled:true,tenantId:id,isSuperAdmin:false},fn)
test('non-BYPASS login cannot directly read student rows without a tenant context',async()=>{
 const role=await pool.query('SELECT current_user AS u,(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS b')
 assert.equal(role.rows[0].u,'assps_core_test_login')
 assert.equal(role.rows[0].b,false)
 await assert.rejects(pool.query('SELECT COUNT(*) FROM students'),/permission denied/)
})
test('tenant A can use only a non-BYPASS scoped role and sees only its records',async()=>{
 await ctx(900001,async()=>{
  const who=await pool.query('SELECT current_user AS u,(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user) AS b')
  assert.equal(who.rows[0].u,'apex_app_runtime')
  assert.equal(who.rows[0].b,false)
  const students=await query("SELECT school_id FROM students WHERE gr_number LIKE 'CORE-RLS-SYN-%' ORDER BY school_id")
  assert.deepEqual(students.rows.map(x=>x.school_id),[900001])
  const teachers=await query("SELECT school_id,role FROM users WHERE email LIKE 'core-security-%@example.invalid'")
  assert.deepEqual(teachers.rows,[{school_id:900001,role:'teacher'}])
  const cross=await query("UPDATE students SET name='BLOCKED' WHERE school_id=900002 AND gr_number='CORE-RLS-SYN-B'")
  assert.equal(cross.rowCount,0)
  await assert.rejects(query("INSERT INTO students(school_id,gr_number,name,class) VALUES(900002,'CORE-RLS-INVALID-INSERT','Nope','9')"),/row-level security|permission denied/)
 })
})
test('tenant B only receives its own student and teacher projections',async()=>{
 await ctx(900002,async()=>{
  const students=await query("SELECT school_id FROM students WHERE gr_number LIKE 'CORE-RLS-SYN-%'")
  assert.deepEqual(students.rows.map(x=>x.school_id),[900002])
  const users=await query("SELECT school_id FROM users WHERE email LIKE 'core-security-%@example.invalid'")
  assert.deepEqual(users.rows.map(x=>x.school_id),[900002])
 })
})
test('pooled connections do not retain a prior tenant or restricted session',async()=>{
 const u=await pool.query('SELECT current_user AS u')
 assert.equal(u.rows[0].u,'assps_core_test_login')
 await assert.rejects(pool.query('SELECT school_id FROM students'),/permission denied/)
})
