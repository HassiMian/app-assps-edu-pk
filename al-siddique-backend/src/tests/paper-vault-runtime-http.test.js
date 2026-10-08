const test = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')
const path = require('node:path')
const { spawn } = require('node:child_process')
const bcrypt = require('bcryptjs')
const { pool } = require('../config/database')

const PORT = Number(process.env.TEST_VAULT_RLS_PORT || 5037)
const DB = String(process.env.DB_NAME || '')
const ALLOW = DB === String(process.env.ASSPS_DISPOSABLE_DB_NAME || '') &&
  /^assps_[a-z0-9_]+$/.test(DB) && DB !== 'apexos' &&
  process.env.NODE_ENV === 'test' && PORT >= 5020 && PORT <= 5999

function req(url, method = 'GET', body = null, cookie = '') {
  return new Promise((resolve, reject) => {
    const raw = body ? JSON.stringify(body) : ''
    const request = http.request({
      hostname: '127.0.0.1', port: PORT, path: url, method,
      timeout: 12000,
      headers: { Host: 'api.assps.edu.pk', 'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(raw ? { 'Content-Length': Buffer.byteLength(raw) } : {}) }
    }, response => {
      let data = ''
      response.on('data', chunk => { data += chunk })
      response.on('end', () => {
        let obj = {}
        try { obj = JSON.parse(data) } catch {}
        resolve({ status: response.statusCode, obj, headers: response.headers, data })
      })
    })
    request.on('error', reject)
    if (raw) request.write(raw)
    request.end()
  })
}
async function login(email, password, role, code) {
  const r = await req('/api/auth/login', 'POST', {
    email, password, role, school_code: code
  })
  assert.equal(r.status, 200, 'test login: ' + r.data.slice(0, 250))
  return (r.headers['set-cookie'] || []).map(s => s.split(';')[0]).join('; ')
}
async function waitReady() {
  for (let i = 0; i < 50; i++) {
    try { if ((await req('/health')).status === 200) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw Error('Alternate-port test backend not healthy')
}
test('Paper Vault runtime enforces no-context, tenant and owner boundaries via HTTP',
  { timeout: 60000 }, async () => {
    assert.ok(ALLOW, 'Refusing synthetic writes except explicit disposable DB and alternate port')
    const probe = await pool.query('SELECT current_database() AS db')
    assert.equal(probe.rows[0].db, DB)
    const token = crypto.randomBytes(6).toString('hex')
    const secret = crypto.randomBytes(18).toString('base64url')
    const pw = await bcrypt.hash(secret, 10)
    const codeA = 'vra' + token, codeB = 'vrb' + token
    const users = []
    const schools = []
    let server = null
    let stderr = ''
    try {
      for (const [name, code] of [['Vault RLS A', codeA], ['Vault RLS B', codeB]]) {
        const r = await pool.query(
          "INSERT INTO schools(name,code,status,tenant_id) VALUES($1,$2,'active',$2) RETURNING id",
          [name,code])
        schools.push(r.rows[0].id)
      }
      const createUser = async (school, code, role, prefix) => {
        const email = prefix + '-' + token + '@invalid.example'
        const r = await pool.query(
          "INSERT INTO users(school_id,tenant_id,name,email,role,password,is_active) VALUES($1,$2,$3,$4,$5,$6,true) RETURNING id",
          [school,code,prefix,email,role,pw])
        users.push(r.rows[0].id)
        return { id:r.rows[0].id, email, code, role }
      }
      const adminA = await createUser(schools[0],codeA,'admin','VaultAdminA')
      const adminB = await createUser(schools[1],codeB,'admin','VaultAdminB')
      const teacherA = await createUser(schools[0],codeA,'teacher','VaultTeacherA')
      const teacherPaper = {name:'Teacher Fixture',config:{classLevel:'7',subject:'Science'}}
      await pool.query(
        "INSERT INTO paper_vault(school_id,owner_user_id,name,payload) VALUES($1,$2,'Teacher Fixture',$3::jsonb)",
        [schools[0],teacherA.id,JSON.stringify(teacherPaper)])
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query('SET LOCAL ROLE apex_paper_runtime')
        const row = await client.query('SELECT count(*)::int AS count FROM paper_vault')
        assert.equal(row.rows[0].count, 0, 'Missing context must see no papers')
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [String(schools[0])])
        let deniedForeignInsert = false
        try {
          await client.query(
            "INSERT INTO paper_vault(school_id,owner_user_id,name,payload) VALUES($1,$2,'Forbidden foreign insert','{}'::jsonb)",
            [schools[1],adminB.id])
        } catch (error) {
          deniedForeignInsert = error.code === '42501' && /row-level security/i.test(error.message)
        }
        assert.equal(deniedForeignInsert, true, 'Runtime role must reject foreign INSERT via RLS WITH CHECK')
        await client.query('ROLLBACK')
      } finally { client.release() }
      server = spawn(process.execPath, ['server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: {...process.env, NODE_ENV:'production', PORT:String(PORT),
          AUTO_MIGRATE_ON_BOOT:'false'},
        stdio:['ignore','pipe','pipe'],
      })
      server.stderr.on('data', chunk => { stderr += String(chunk).slice(-2000) })
      await waitReady()
      let r = await req('/api/paper/vault')
      assert.equal(r.status,401)
      const a = await login(adminA.email,secret,'admin',codeA)
      const b = await login(adminB.email,secret,'admin',codeB)
      const teacher = await login(teacherA.email,secret,'teacher',codeA)
      r = await req('/api/paper/vault','GET',null,a)
      assert.equal(r.status,200,'school A list: '+r.data.slice(0,300))
      assert.equal(r.obj.papers.length,1)
      r = await req('/api/paper/vault','GET',null,b)
      assert.equal(r.status,200)
      assert.equal(r.obj.papers.length,0)
      r = await req('/api/paper/vault','GET',null,teacher)
      assert.equal(r.status,200)
      assert.equal(r.obj.papers.length,1)
      const paper = {name:'Admin Test Paper',config:{classLevel:'7',subject:'Math'}}
      r = await req('/api/paper/vault','POST',{school_id:schools[1],paper},a)
      assert.equal(r.status,201,'admin create: '+r.data.slice(0,300))
      const id = Number(r.obj.paper.id)
      assert.ok(id > 0)
      const stored = await pool.query('SELECT school_id,revision FROM paper_vault WHERE id=$1',[id])
      assert.equal(stored.rows[0].school_id,schools[0],'body school_id must be ignored')
      r = await req('/api/paper/vault','GET',null,b)
      assert.equal(r.status,200)
      assert.equal(r.obj.papers.length,0)
      r = await req('/api/paper/vault/' + id,'PATCH',{expectedRevision:1,name:'Cross tenant'},b)
      assert.equal(r.status,404)
      r = await req('/api/paper/vault','GET',null,teacher)
      assert.equal(r.status,200)
      assert.equal(r.obj.papers.length,1,'teacher cannot see admin-owned paper')
      r = await req('/api/paper/vault/'+id,'PATCH',{expectedRevision:0,name:'Stale'},a)
      assert.equal(r.status,409)
      r = await req('/api/paper/vault/'+id,'PATCH',{expectedRevision:1,name:'Updated'},a)
      assert.equal(r.status,200,'revision-bound update: '+r.data.slice(0,300))
      r = await req('/api/paper/vault/'+id,'DELETE',{expectedRevision:1},a)
      assert.equal(r.status,409)
      r = await req('/api/paper/vault/'+id,'DELETE',{expectedRevision:2},a)
      assert.equal(r.status,200,'soft delete: '+r.data.slice(0,300))
      console.log('PAPER_VAULT_RUNTIME_HTTP 15/15 PASS')
    } catch (error) {
      error.message += ' SERVER_STDERR=' + stderr.slice(-800)
      throw error
    } finally {
      if (server) {
        server.kill('SIGTERM')
        await new Promise(resolve => setTimeout(resolve, 350))
      }
      for (const sid of schools) {
        await pool.query('DELETE FROM paper_vault WHERE school_id=$1',[sid]).catch(()=>{})
        await pool.query('DELETE FROM users WHERE school_id=$1',[sid]).catch(()=>{})
        await pool.query('DELETE FROM schools WHERE id=$1',[sid]).catch(()=>{})
      }
      await pool.end()
    }
  })
