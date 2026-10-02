// Phase 3G REAL disposable cluster, SHA-exact source vs independently restored synthetic data.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createHash}=require('node:crypto')
const opt=process.env.ASSPS_PHASE3G_REAL_PG==='DISPOSABLE_CLUSTER_PORT_55439'
function safeDsn(raw,name){
 if(!raw)throw new Error('Synthetic disposable DSN missing.')
 const u=new URL(raw)
 if(u.hostname!=='127.0.0.1'||u.port!=='55439'||u.pathname!=='/'+name||
  u.username!=='assps_p3g_admin'||!u.password)
  throw new Error('Refuse external, production or mismatched restore target.')
 return raw
}
if(!opt){
 test('real restore test SKIPPED outside opt-in disposable PG18 cluster',{
  skip:'Never access existing localhost PostgreSQL service or production.'},()=>{})
}else{
 const {Client}=require('pg')
 const sourceUrl=safeDsn(process.env.ASSPS_PHASE3G_ADMIN_URL,'assps_paper_phase3f_ci')
 const restoredUrl=safeDsn(process.env.ASSPS_PHASE3G_RESTORE_URL,'assps_paper_phase3g_restore_ci')
 const hash=s=>createHash('sha256').update(s,'utf8').digest('hex')
 test('REAL pg_dump custom archive restores exact ALL synthetic native JSON and immutable SHA audit into separate empty database',{timeout:15000},async()=>{
  const original=new Client({connectionString:sourceUrl,connectionTimeoutMillis:3000})
  const copy=new Client({connectionString:restoredUrl,connectionTimeoutMillis:3000})
  try{
   await original.connect();await copy.connect()
   const ident=await Promise.all([original.query('SELECT current_database() AS db'),
    copy.query('SELECT current_database() AS db')])
   assert.equal(ident[0].rows[0].db,'assps_paper_phase3f_ci')
   assert.equal(ident[1].rows[0].db,'assps_paper_phase3g_restore_ci')
   for(const [table,sort] of [
    ['schools','id'],['users','id'],
    ['paper_documents','school_id,id'],['paper_revisions','school_id,document_id,revision']
   ]){
    const sql='SELECT * FROM public.'+table+' ORDER BY '+sort
    const [a,b]=await Promise.all([original.query(sql),copy.query(sql)])
    assert.ok(a.rows.length>0,'source has nonempty synthetic '+table)
    assert.deepEqual(b.rows,a.rows,'backup/restore field-for-field mismatch for '+table)
    if(['paper_documents','paper_revisions'].includes(table)){
     for(const row of b.rows)
      assert.equal(row.native_sha256,hash(row.native_json_text),
       'Exact native UTF-8 JSON SHA must survive physical archive/restore.')
    }
   }
   const [sourcePolicy,restorePolicy]=await Promise.all([
    original.query("SELECT tablename,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions') ORDER BY tablename"),
    copy.query("SELECT tablename,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename IN ('paper_documents','paper_revisions') ORDER BY tablename")
   ])
   assert.deepEqual(restorePolicy.rows,sourcePolicy.rows)
   assert.equal(restorePolicy.rows.length,2)
   const trigger=await copy.query("SELECT COUNT(*)::integer AS n FROM pg_trigger WHERE tgrelid='public.paper_revisions'::regclass AND NOT tgisinternal")
   assert.equal(trigger.rows[0].n,2,'Immutable and valid-append triggers must restore.')
   const rls=await copy.query("SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname IN ('paper_documents','paper_revisions') ORDER BY relname")
   assert.equal(rls.rows.length,2)
   assert.ok(rls.rows.every(r=>r.relrowsecurity&&r.relforcerowsecurity))
   console.log('PHASE3G_REAL_RESTORE=EXACT_SYNTHETIC_DATA_SHA_POLICIES_AND_IMMUTABILITY')
  }finally{await original.end().catch(()=>{});await copy.end().catch(()=>{})}
 })
}
