// Pure catalog fixtures ONLY; NEVER imports config/database or connects to PostgreSQL.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {auditPaperStagingRls,diagnoseLegacyFailOpenRls}
 =require('../services/papers/paperStagingRlsAudit.js')
const copy=o=>JSON.parse(JSON.stringify(o))
const strict="(school_id = NULLIF(current_setting('app.paper_school_id', true), '')::integer)"
function fixture(){
 const docs=['school_id','id','revision','status','source_protected','native_json_text','native_sha256']
 const revisions=['school_id','document_id','revision','native_json_text','native_sha256','previous_native_sha256']
 const columns=[...docs.map(name=>({table_schema:'public',table_name:'paper_documents',column_name:name,
  is_nullable:'NO',udt_name:name==='native_json_text'?'text':name==='school_id'?'int4':'varchar'})),
 ...revisions.map(name=>({table_schema:'public',table_name:'paper_revisions',column_name:name,
  is_nullable:name==='previous_native_sha256'?'YES':'NO',
  udt_name:name==='native_json_text'?'text':name==='school_id'?'int4':'varchar'}))]
 return {relations:['paper_documents','paper_revisions'].map(table_name=>({
  schema_name:'public',table_name,rls_enabled:true,force_rls:true,relation_kind:'r'})),
 policies:['paper_documents','paper_revisions'].map(tablename=>({
  schemaname:'public',tablename,policyname:'paper_school_strict',cmd:'ALL',permissive:'PERMISSIVE',
  qual:strict,with_check:strict})),
 columns,
 constraints:[
 {table_name:'paper_documents',constraint_type:'p',definition:'PRIMARY KEY (school_id, id)'},
 {table_name:'paper_revisions',constraint_type:'p',definition:'PRIMARY KEY (school_id, document_id, revision)'},
 {table_name:'paper_revisions',constraint_type:'f',
  definition:'FOREIGN KEY (school_id, document_id) REFERENCES paper_documents(school_id, id)'}
 ],roleFlags:{rolsuper:false,rolbypassrls:false,revisionsCanUpdate:false,revisionsCanDelete:false}}
}
test('missing real inventory ALWAYS blocks, no synthesized DB facts',()=>{
 const state=auditPaperStagingRls()
 assert.equal(state.approved,false)
 assert.equal(state.authorizesSqlExecution,false)
 assert.equal(state.status,'BLOCKED_MISSING_VERIFIED_CATALOG')
})
test('synthetic strict metadata is a human-review CANDIDATE ONLY: cannot approve/migrate or bypass actual backup+visual',()=>{
 const state=auditPaperStagingRls(fixture())
 assert.deepEqual(state.findings,[])
 assert.equal(state.schemaEligibleForManualReview,true)
 assert.equal(state.status,'STRUCTURE_CANDIDATE_REQUIRES_INDEPENDENT_SIGNOFF')
 assert.equal(state.approved,false)
 assert.equal(state.authorizesSqlExecution,false)
 assert.ok(state.remainingMandatoryGates.some(s=>s.includes('backup')))
 assert.ok(state.remainingMandatoryGates.some(s=>s.includes('original')))
})
test('RLS ENABLE and FORCE both required on each paper table, and relation must be a real base table',()=>{
 for(const mutation of [
  f=>{f.relations[0].rls_enabled=false},
  f=>{f.relations[1].force_rls=false},
  f=>{f.relations[0].relation_kind='v'},
  f=>{f.relations=f.relations.filter(r=>r.table_name!=='paper_revisions')},
 ]){
  const input=fixture();mutation(input)
  const result=auditPaperStagingRls(input)
  assert.equal(result.schemaEligibleForManualReview,false)
  assert.ok(result.findings.some(s=>/RLS_NOT_FORCED|MISSING_OR_AMBIGUOUS_RELATION/u.test(s.code)))
 }
})
test('fail-open legacy app.rls_enabled disabled OR superadmin policy branches are NOT accepted',()=>{
 for(const sql of [
  strict+" OR current_setting('app.rls_enabled',true) IS DISTINCT FROM 'true'",
  strict+" OR current_setting('app.is_super_admin',true) = 'true'",
  "TRUE",
  strict+" OR school_id > 0",
  "(school_id = COALESCE(NULLIF(current_setting('app.paper_school_id',true), '')::int,school_id))",
 ]){
  const input=fixture()
  input.policies[0].qual=sql
  const found=auditPaperStagingRls(input)
  assert.ok(found.findings.some(f=>f.code==='FAIL_OPEN_POLICY'),sql)
  assert.equal(found.authorizesSqlExecution,false)
 }
})
test('a second permissive policy creates an OR-bypass even if strict policy exists; deny',()=>{
 const input=fixture()
 input.policies.push({...input.policies[0],policyname:'allow_all',qual:'true',with_check:'true'})
 const out=auditPaperStagingRls(input)
 assert.ok(out.findings.some(f=>f.code==='POLICY_CARDINALITY'))
})
test('missing WITH CHECK/ALL, unsafe role or audit revision UPDATE/DELETE privilege blocks',()=>{
 for(const mutation of [
  f=>{f.policies[0].with_check=null},
  f=>{f.policies[1].cmd='SELECT'},
  f=>{f.roleFlags.rolsuper=true},
  f=>{f.roleFlags.rolbypassrls=true},
  f=>{f.roleFlags.revisionsCanUpdate=true},
  f=>{f.roleFlags.revisionsCanDelete=true},
 ]){
  const input=fixture();mutation(input)
  assert.equal(auditPaperStagingRls(input).schemaEligibleForManualReview,false)
 }
})
test('lossless TEXT, non-null source columns and composite same-school PK/FK cannot be weakened',()=>{
 for(const mutation of [
  f=>{f.columns.find(c=>c.table_name==='paper_documents'&&c.column_name==='native_json_text').udt_name='jsonb'},
  f=>{f.columns.find(c=>c.table_name==='paper_revisions'&&c.column_name==='school_id').is_nullable='YES'},
  f=>{f.constraints=f.constraints.filter(c=>c.constraint_type!=='f')},
  f=>{f.constraints[0].definition='PRIMARY KEY (id)'},
  f=>{f.constraints[1].definition='PRIMARY KEY (document_id, revision)'},
 ]){
  const input=fixture();mutation(input)
  const state=auditPaperStagingRls(input)
  assert.equal(state.schemaEligibleForManualReview,false)
  assert.ok(state.findings.length>0)
 }
})
test('existing legacy migration fail-open pattern is DETECTED as a risk but original file remains untouched',()=>{
 const legacy=fs.readFileSync(path.join(__dirname,'../config/migrations/005_rls_policies.js'),'utf8')
 const status=diagnoseLegacyFailOpenRls(legacy)
 assert.equal(status.legacyRlsEnabledFlagBypass,true)
 assert.equal(status.legacySuperAdminBranch,true)
 assert.equal(status.safeToCopyIntoPaperTables,false)
})

test('Phase3F catalog SQL stays READ ONLY and cannot query any actual school/paper content',()=>{
 const sql=fs.readFileSync(path.join(__dirname,'../../../ops/paper-staging-review/phase3f-strict-paper-rls-READ-ONLY.sql'),'utf8')
 const stripped=sql.replace(/--[^\r\n]*/gu,'').trim()
 const parts=stripped.split(';').map(s=>s.trim()).filter(Boolean)
 assert.equal(parts[0],'BEGIN TRANSACTION READ ONLY')
 assert.equal(parts.at(-1),'ROLLBACK')
 assert.ok(parts.every(s=>/^(BEGIN TRANSACTION READ ONLY|SET LOCAL|SELECT\s|ROLLBACK$)/iu.test(s)))
 assert.doesNotMatch(stripped,/\b(CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE\s+\w|DELETE\s+FROM|COPY|DO|CALL|EXECUTE|GRANT|REVOKE)\b/iu)
 assert.match(stripped,/pg_catalog\.pg_policies/u)
 assert.match(stripped,/rolbypassrls/u)
 assert.match(stripped,/has_table_privilege/u)
 assert.doesNotMatch(stripped,/\bFROM\s+(students|paper_documents|paper_revisions|users|schools)\b/iu)
})
test('opt-in real PG harness does not import active database.js, cannot create/migrate and skips absent opt-in',()=>{
 const harness=fs.readFileSync(path.join(__dirname,'paperStagingReadOnlyPostgresPhase3F.test.js'),'utf8')
 assert.match(harness,/ASSPS_PHASE3F_READONLY_PG/u)
 assert.match(harness,/assps_paper_phase3f_ci/u)
 assert.match(harness,/BEGIN TRANSACTION READ ONLY/u)
 assert.match(harness,/client\.query\('ROLLBACK'\)/u)
 assert.doesNotMatch(harness,/require\(['"]\.\.\/config\/database/u)
 assert.doesNotMatch(harness,/\bclient\.query\(['"](?:CREATE|INSERT|UPDATE|DELETE|DROP)/iu)
})
