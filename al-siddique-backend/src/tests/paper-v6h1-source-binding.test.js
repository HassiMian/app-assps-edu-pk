require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env'})
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { pool } = require('../config/database')
const { verifyCanonicalCanaryBinding } = require('../services/papers/paperCanonicalCanaryBindingV6H1')

async function expectSqlState(fn, state) {
  try { await fn(); throw new Error(`expected SQLSTATE ${state}`) }
  catch (e) { if (e.code !== state) throw e }
}

;(async()=>{
  const evidence = await verifyCanonicalCanaryBinding()
  assert.equal(evidence.valid,true,JSON.stringify(evidence))
  console.log('PASS H1 binding schema verifier')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const suffix=crypto.randomBytes(5).toString('hex')
    const school=(await client.query("insert into schools(name,code,status,tenant_id) values('V6H1 Binding Test',$1,'active',$1) returning id",[`h1${suffix}`])).rows[0]
    const user=(await client.query("insert into users(school_id,tenant_id,name,email,password,role,is_active) values($1,$2,'H1 Admin',$3,'unused','admin',true) returning id",[school.id,`h1${suffix}`,`h1-${suffix}@invalid.example`])).rows[0]
    await client.query('SET LOCAL ROLE apex_paper_runtime')
    await client.query("select set_config('app.tenant_id',$1,true)",[String(school.id)])
    await client.query("select set_config('app.paper_canonical_write_enabled','true',true)")
    const hash='c'.repeat(64), snapshot='a'.repeat(64), payload={format:'assps-new-authoring-paper',documentModel:'PaperDocumentNewAuthoring',schemaVersion:1,qa:'v6h1'}
    await client.query(`insert into paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,title,status,current_revision,payload_hash,payload,created_by,updated_by,source_repository,source_paper_id,source_revision,source_snapshot_hash,canary_imported_at) values($1,$2,'approved-curriculum-authoring','assps-new-authoring-paper',1,'H1 Canary','draft',1,$3,$4::jsonb,$2,$2,'paper_vault',991,7,$5,now())`,[school.id,user.id,hash,JSON.stringify(payload),snapshot])
    console.log('PASS complete source binding accepted')

    await client.query('SAVEPOINT duplicate_binding')
    await expectSqlState(()=>client.query(`insert into paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,title,status,current_revision,payload_hash,payload,created_by,updated_by,source_repository,source_paper_id,source_revision,source_snapshot_hash,canary_imported_at) values($1,$2,'approved-curriculum-authoring','assps-new-authoring-paper',1,'Duplicate','draft',1,$3,$4::jsonb,$2,$2,'paper_vault',991,7,$5,now())`,[school.id,user.id,hash,JSON.stringify(payload),snapshot]),'23505')
    await client.query('ROLLBACK TO SAVEPOINT duplicate_binding')
    console.log('PASS duplicate source binding rejected')

    await client.query('SAVEPOINT incomplete_binding')
    await expectSqlState(()=>client.query(`insert into paper_documents(school_id,owner_user_id,document_family,document_format,schema_version,title,status,current_revision,payload_hash,payload,created_by,updated_by,source_repository,source_paper_id,source_revision) values($1,$2,'approved-curriculum-authoring','assps-new-authoring-paper',1,'Incomplete','draft',1,$3,$4::jsonb,$2,$2,'paper_vault',992,1)`,[school.id,user.id,hash,JSON.stringify(payload)]),'23514')
    await client.query('ROLLBACK TO SAVEPOINT incomplete_binding')
    console.log('PASS incomplete source binding rejected')

    const count=(await client.query('select count(*)::int n from paper_documents where school_id=$1',[school.id])).rows[0].n
    assert.equal(count,1)
    console.log('V6H1_SOURCE_BINDING 4/4 PASS — TRANSACTION WILL ROLLBACK')
    await client.query('ROLLBACK')
  } catch(e) {
    try{await client.query('ROLLBACK')}catch{}
    throw e
  } finally {
    client.release(); await pool.end()
  }
})().catch(e=>{console.error('V6H1_BINDING_FAIL',e.stack||e.message);process.exit(1)})
