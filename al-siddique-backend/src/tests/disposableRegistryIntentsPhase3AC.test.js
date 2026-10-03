const {test,before,after}=require('node:test')
const assert=require('node:assert/strict')
const {readFileSync}=require('node:fs')
const {join,win32}=require('node:path')
const {createPhase3ACDisposablePorts,LABEL}=require(
 '../services/papers/disposableRegistryIntentPortsPhase3AC')
const {createPhase3ABSubjectGrantResolver,GATE_LABEL:AB_LABEL}=require(
 '../services/papers/independentSubjectGrantPhase3AB')
const {authoringBindingSha256,EXPECTED_LOGIN,ROLE_ID_SQL}=require(
 '../services/papers/newAuthoringRoleBoundRepositoryPhase3T')
const RUN=process.env.ASSPS_PHASE3AC_REAL_PG==='SELF_CREATED_PG18_127_0_0_1_55443'
const now=Date.now,clone=x=>JSON.parse(JSON.stringify(x))
const gate={label:LABEL,confirmedNotProduction:true,
 markerVerifiedSelfCreatedPg18:true,independentSchemaReviewPassed:true}
const grantGate={label:AB_LABEL,confirmedNotProduction:true,
 independentRosterReviewPassed:true,subjectAssignmentRegistryReviewed:true,
 curriculumBindingRegistryReviewed:true,noImplicitPrincipalAdminBypass:true}
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'synthetic-only-ix-bio',edition:'2025-26',syllabusVersion:'2025-26'}
const selection={syllabusMode:'full',examYear:null}
const pin={publicationId:'phase3ac-test-signed-stub',revision:9,
 recordsDigest:'d'.repeat(64),curriculumIdentity:clone(identity),
 selection:clone(selection),sourceBookIds:{en:'synthetic-en',ur:'synthetic-ur'},
 sourceChecksums:{en:'a'.repeat(64),ur:'b'.repeat(64)}}
const binding=authoringBindingSha256(pin)
const fingerprint='f'.repeat(64)
const actor={schoolId:51,tenantId:'tenant-51',actorId:110,role:'teacher'}
const req=()=>({...actor,curriculumIdentity:clone(identity),selection:clone(selection)})
if(!RUN){test('Phase3AC requires explicitly owned synthetic PG18',{skip:true},()=>{})}
else{
 const {Pool}=require('pg')
 if(process.env.PGHOST!=='127.0.0.1'||process.env.PGPORT!=='55443'||
    process.env.PGUSER!=='assps_p3u_admin'||process.env.NODE_ENV==='production'||
    !process.env.ASSPS_PHASE3AC_OWNED_CLUSTER_MARKER||
    !['ASSPS_PHASE3U_ADMIN_PASSWORD','ASSPS_PHASE3U_51_PASSWORD',
      'ASSPS_PHASE3U_52_PASSWORD'].every(k=>process.env[k]?.length>=32))
  throw Error('Phase3AC refused: unowned or unverified PG18 fixture')
 const cfg={host:'127.0.0.1',port:55443,database:'assps_paper_phase3u_ci',
  max:4,connectionTimeoutMillis:3000,idleTimeoutMillis:2000,ssl:false}
 const admin=new Pool({...cfg,user:'assps_p3u_admin',
  password:process.env.ASSPS_PHASE3U_ADMIN_PASSWORD})
 const p51a=new Pool({...cfg,user:EXPECTED_LOGIN(51),
  password:process.env.ASSPS_PHASE3U_51_PASSWORD})
 const p51b=new Pool({...cfg,user:EXPECTED_LOGIN(51),
  password:process.env.ASSPS_PHASE3U_51_PASSWORD})
 const p52=new Pool({...cfg,user:EXPECTED_LOGIN(52),
  password:process.env.ASSPS_PHASE3U_52_PASSWORD})
 const ports=(schoolId,tenantId,pool)=>createPhase3ACDisposablePorts({gate,
  schoolId,tenantId,connect:()=>pool.connect()})
 let a,b,other
 const staff={source:'INDEPENDENT_SCHOOL_STAFF_ROSTER',
  id:110,school_id:51,tenant_id:'tenant-51',role:'teacher',
  status:'active',account_type:'human',paperAuthoringEligible:true}
 const assignment={source:'SCHOOL_APPROVED_STAFF_ASSIGNMENT',status:'ACTIVE',
  assignmentId:'synthetic-bio9-assignment',schoolId:51,tenantId:'tenant-51',
  actorId:110,role:'teacher',grade:9,subjectId:'biology',subjectRef:'biology9',
  classId:'nine',syllabusId:'ptb',validFromMs:now()-3600000,
  validUntilMs:now()+3600000,review:{approvedByStaffId:22,
  evidenceId:'synthetic-independent-assignment',approvedAtMs:now()-7200000}}
 const bindingRow={source:'INDEPENDENT_CURRICULUM_BINDING',status:'ACTIVE',
  assignmentId:assignment.assignmentId,schoolId:51,tenantId:'tenant-51',
  subjectRef:'biology9',classId:'nine',syllabusId:'ptb',
  curriculumIdentity:clone(identity),approvalEvidenceId:'synthetic-edition-docket',
  approvedByStaffId:23,fullTextbookApproved:true,alpApprovals:[]}
 before(async()=>{
  const marker=process.env.ASSPS_PHASE3AC_OWNED_CLUSTER_MARKER
  const prefix=win32.normalize(join(process.env.TEMP,'assps-phase3ac-ephemeral-')).toLowerCase()
  if(win32.basename(marker)!=='.ASSPS_PHASE3AC_SELF_CREATED'||
     !win32.normalize(marker).toLowerCase().startsWith(prefix)||
     readFileSync(marker,'utf8').trim()!=='SELF-CREATED SYNTHETIC-ONLY PHASE3AC')
   throw Error('Phase3AC refused: invalid disposable DB marker')
  const live=await admin.query("SELECT current_database() db,current_setting('port') port,"+
   "current_setting('listen_addresses') host,current_setting('data_directory') data,session_user login")
  assert.deepEqual({db:live.rows[0].db,port:live.rows[0].port,
    host:live.rows[0].host,login:live.rows[0].login},
   {db:'assps_paper_phase3u_ci',port:'55443',
    host:'127.0.0.1',login:'assps_p3u_admin'})
  assert.equal(win32.normalize(live.rows[0].data).toLowerCase(),
   win32.normalize(join(win32.dirname(marker),'data')).toLowerCase())
  const school={source:'INDEPENDENT_SCHOOL_REGISTRY',id:51,tenant_id:'tenant-51',
   status:'active',paperAuthoringStagingApproved:true,isDemo:false}
  await admin.query('INSERT INTO public.phase3ac_school_registry VALUES($1,$2,$3::jsonb)',
   [51,'tenant-51',JSON.stringify(school)])
  await admin.query('INSERT INTO public.phase3ac_school_registry VALUES($1,$2,$3::jsonb)',
   [52,'tenant-52',JSON.stringify({...school,id:52,tenant_id:'tenant-52'})])
  await admin.query('INSERT INTO public.phase3ac_staff_registry VALUES($1,$2,$3,$4::jsonb)',
   [51,'tenant-51',110,JSON.stringify(staff)])
  await admin.query('INSERT INTO public.phase3ac_staff_registry VALUES($1,$2,$3,$4::jsonb)',
   [52,'tenant-52',120,JSON.stringify({...staff,id:120,school_id:52,
    tenant_id:'tenant-52'})])
  await admin.query('INSERT INTO public.phase3ac_assignment_registry '+
   '(school_id,tenant_id,actor_id,grade,subject_id,assignment_id,payload) '+
   'VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)',
   [51,'tenant-51',110,9,'biology',assignment.assignmentId,JSON.stringify(assignment)])
  await admin.query('INSERT INTO public.phase3ac_curriculum_registry '+
   '(school_id,tenant_id,assignment_id,identity,payload) '+
   'VALUES($1,$2,$3,$4::jsonb,$5::jsonb)',
   [51,'tenant-51',assignment.assignmentId,JSON.stringify(identity),
    JSON.stringify(bindingRow)])
  await admin.query('INSERT INTO public.new_authoring_approved_snapshots_staging '+
   '(school_id,tenant_id,binding_sha256,revision,status) VALUES($1,$2,$3,$4,$5)',
   [51,'tenant-51',binding,9,'PUBLISHED_APPROVED'])
  a=ports(51,'tenant-51',p51a);b=ports(51,'tenant-51',p51b)
  other=ports(52,'tenant-52',p52)
 })
 after(async()=>{await Promise.allSettled([
  admin.end(),p51a.end(),p51b.end(),p52.end()])})
 const resolver=ad=>createPhase3ABSubjectGrantResolver({...ad,gate:grantGate,clock:now})
 const claimInput=(reservation)=>({...actor,intentId:reservation.intentId,
  fingerprint,recordsDigest:pin.recordsDigest})
 test('PG18 registry functions are purpose-limited and scope by true session_user',async()=>{
  const r1=await p51a.query(ROLE_ID_SQL),r2=await p52.query(ROLE_ID_SQL)
  assert.equal(r1.rows[0].verified_school_id,51)
  assert.equal(r2.rows[0].verified_school_id,52)
  const hidden=await p52.query('SELECT public.phase3ac_read_school(51) AS v')
  assert.equal(hidden.rows[0].v,null)
  for(const table of ['phase3ac_school_registry','phase3ac_staff_registry',
    'phase3ac_assignment_registry','phase3ac_curriculum_registry','phase3ac_intents_staging']){
   await assert.rejects(p51a.query('SELECT * FROM public.'+table),
    e=>e.code==='42501')
   await assert.rejects(p51a.query('DELETE FROM public.'+table),
    e=>e.code==='42501')
  }
  const row=await admin.query("SELECT relname,relrowsecurity,relforcerowsecurity "+
   "FROM pg_class WHERE relname LIKE 'phase3ac_%_registry' OR relname='phase3ac_intents_staging'")
  assert.equal(row.rowCount,5)
  assert.ok(row.rows.every(x=>x.relrowsecurity===true&&x.relforcerowsecurity===true))
 })
 test('independent authenticated PG read ports feed actual Phase3AB grant resolver',async()=>{
  const grant=await resolver(a)(req())
  assert.equal(grant.status,'AUTHORIZED')
  assert.equal(grant.subject.id,'biology9')
  assert.deepEqual(grant.subject.curriculumBinding,identity)
  await assert.rejects(resolver(other)(req()),/caller scope differs|untrusted school input/)
  await assert.rejects(a.readStaff({schoolId:52,tenantId:'tenant-52',actorId:110}),
   /caller scope differs/)
 })
 test('separate Node clients can reserve but only one atomically claims same persistent intent',async()=>{
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:pin,fingerprint})
  assert.ok(intent.expiresAt>now())
  assert.equal(intent.approvedForPrint,false)
  const values=await Promise.allSettled([a.claim(claimInput(intent)),
   b.claim(claimInput(intent))])
  assert.equal(values.filter(x=>x.status==='fulfilled').length,1)
  assert.equal(values.filter(x=>x.status==='rejected').length,1)
  const claimed=values.find(x=>x.status==='fulfilled').value
  assert.equal(claimed.intentId,intent.intentId)
  assert.equal(claimed.projectionFingerprint,fingerprint)
  assert.deepEqual(claimed.sourcePin,pin)
  const db=await admin.query('SELECT state,claimed_at FROM '+
   'public.phase3ac_intents_staging WHERE intent_id=$1',[intent.intentId])
  assert.equal(db.rows[0].state,'CLAIMED')
  assert.ok(db.rows[0].claimed_at)
  assert.equal(await b.finish({...actor,intentId:intent.intentId}),true)
  assert.equal(await a.finish({...actor,intentId:intent.intentId}),false)
  await assert.rejects(a.claim(claimInput(intent)),/already claimed intent/)
  const saved=await admin.query('SELECT state FROM public.phase3ac_intents_staging '+
   'WHERE intent_id=$1',[intent.intentId])
  assert.equal(saved.rows[0].state,'SPENT')
 })
 test('fingerprint, digest, actor and school mismatch never consume READY intent',async()=>{
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:pin,fingerprint})
  for(const change of [x=>{x.fingerprint='e'.repeat(64)},
    x=>{x.recordsDigest='e'.repeat(64)},x=>{x.actorId=111}]){
   const claim=claimInput(intent);change(claim)
   await assert.rejects(b.claim(claim),/already claimed intent/)
  }
  await assert.rejects(other.claim({schoolId:52,tenantId:'tenant-52',
   actorId:120,role:'teacher',intentId:intent.intentId,
   fingerprint,recordsDigest:pin.recordsDigest}),/already claimed intent/)
  const unspent=await admin.query('SELECT state FROM public.phase3ac_intents_staging '+
   'WHERE intent_id=$1',[intent.intentId])
  assert.equal(unspent.rows[0].state,'READY')
  assert.equal(await a.cancel({...actor,intentId:intent.intentId}),true)
  assert.equal(await b.cancel({...actor,intentId:intent.intentId}),false)
  await assert.rejects(b.claim(claimInput(intent)),/already claimed intent/)
 })
 test('publisher and independent staff registry revoke prevent reservation or claim',async()=>{
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:pin,fingerprint})
  await admin.query('UPDATE public.phase3ac_assignment_registry SET '+
   "payload=jsonb_set(payload,'{status}','\"REVOKED\"'::jsonb) "+
   'WHERE assignment_id=$1',[assignment.assignmentId])
  await assert.rejects(resolver(a)(req()),/assignment and nonself review/)
  await assert.rejects(b.claim(claimInput(intent)),/already claimed intent/)
  await assert.rejects(a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:pin,fingerprint}),/assignment not currently approved/)
  await admin.query('UPDATE public.phase3ac_assignment_registry SET '+
   "payload=jsonb_set(payload,'{status}','\"ACTIVE\"'::jsonb) "+
   'WHERE assignment_id=$1',[assignment.assignmentId])
  const r=await admin.query('UPDATE public.new_authoring_approved_snapshots_staging '+
   "SET status='REVOKED' WHERE school_id=51 AND binding_sha256=$1 AND revision=9 "+
   'RETURNING status',[binding])
  assert.equal(r.rows[0].status,'REVOKED')
  await assert.rejects(b.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:pin,fingerprint}),/publisher revoked or not published/)
  await assert.rejects(a.claim(claimInput(intent)),/already claimed intent/)
  assert.equal(await a.cancel({...actor,intentId:intent.intentId}),true)
 })
 test('expired and cancelled intents cannot be resurrected across instances',async()=>{
  // Start separate synthetic publisher revision 10 for later checks.
  const later={...pin,publicationId:'phase3ac-test-signed-stub-v10',revision:10}
  const bindingLater=authoringBindingSha256(later)
  await admin.query('INSERT INTO public.new_authoring_approved_snapshots_staging '+
   '(school_id,tenant_id,binding_sha256,revision,status) VALUES($1,$2,$3,$4,$5)',
   [51,'tenant-51',bindingLater,10,'PUBLISHED_APPROVED'])
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint})
  await admin.query('UPDATE public.phase3ac_intents_staging SET '+
   "expires_at=clock_timestamp()-interval '1 second' WHERE intent_id=$1",
   [intent.intentId])
  await assert.rejects(b.claim({...claimInput(intent),recordsDigest:later.recordsDigest}),
   /already claimed intent/)
  const fresh=await b.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint})
  assert.equal(await a.cancel({...actor,intentId:fresh.intentId}),true)
  await assert.rejects(b.claim(claimInput(fresh)),/already claimed intent/)
 })
 test('school or textbook grant downgraded after reserve cannot be claimed',async()=>{
  const later={...pin,publicationId:'phase3ac-test-signed-stub-v10',revision:10}
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint})
  await admin.query('UPDATE public.phase3ac_school_registry SET '+
   "payload=jsonb_set(payload,'{paperAuthoringStagingApproved}','false'::jsonb) "+
   'WHERE school_id=51')
  await assert.rejects(resolver(a)(req()),/active independently enabled school/)
  await assert.rejects(a.claim(claimInput(intent)),/already claimed intent/)
  await assert.rejects(b.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint}),/assignment not currently approved/)
  await admin.query('UPDATE public.phase3ac_school_registry SET '+
   "payload=jsonb_set(payload,'{paperAuthoringStagingApproved}','true'::jsonb) "+
   'WHERE school_id=51')
  await admin.query('UPDATE public.phase3ac_curriculum_registry SET '+
   "payload=jsonb_set(payload,'{fullTextbookApproved}','false'::jsonb) "+
   'WHERE school_id=51')
  await assert.rejects(a.claim(claimInput(intent)),/already claimed intent/)
  await assert.rejects(b.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint}),/assignment not currently approved/)
  await admin.query('UPDATE public.phase3ac_curriculum_registry SET '+
   "payload=jsonb_set(payload,'{fullTextbookApproved}','true'::jsonb) "+
   'WHERE school_id=51')
  assert.equal(await a.cancel({...actor,intentId:intent.intentId}),true)
 })
 test('database-advisory capacity lock limits concurrent actor reservations across workers',async()=>{
  const later={...pin,publicationId:'phase3ac-test-signed-stub-v10',revision:10}
  const attempts=await Promise.allSettled([a,b,a,b].map(worker=>
   worker.reserve({...actor,assignmentId:assignment.assignmentId,
    sourcePin:later,fingerprint})))
  assert.equal(attempts.filter(v=>v.status==='fulfilled').length,3)
  assert.equal(attempts.filter(v=>v.status==='rejected').length,1)
  assert.match(attempts.find(v=>v.status==='rejected').reason.message,/capacity exhausted/)
  for(const r of attempts.filter(v=>v.status==='fulfilled'))
   assert.equal(await a.cancel({...actor,intentId:r.value.intentId}),true)
  const ready=await admin.query('SELECT count(*)::int AS n FROM '+
   "public.phase3ac_intents_staging WHERE state='READY' AND expires_at>clock_timestamp()")
  assert.equal(ready.rows[0].n,0)
 })
 test('CLAIMED intent is not reusable after a lost worker: no automatic reset',async()=>{
  const later={...pin,publicationId:'phase3ac-test-signed-stub-v10',revision:10}
  const intent=await a.reserve({...actor,assignmentId:assignment.assignmentId,
   sourcePin:later,fingerprint})
  const claimed=await a.claim(claimInput(intent))
  assert.equal(claimed.intentId,intent.intentId)
  await assert.rejects(b.claim(claimInput(intent)),/already claimed intent/)
  const status=await admin.query('SELECT state FROM public.phase3ac_intents_staging '+
   'WHERE intent_id=$1',[intent.intentId])
  assert.equal(status.rows[0].state,'CLAIMED')
  assert.equal(await b.finish({...actor,intentId:intent.intentId}),true)
  assert.equal(await a.finish({...actor,intentId:intent.intentId}),false)
 })
 test('signed publisher revocation leaves no read or write escalation at registry boundary',async()=>{
  const absent=await admin.query('SELECT count(*)::int AS n FROM '+
   "public.new_authoring_approved_snapshots_staging WHERE status='REVOKED' "+
   'AND binding_sha256=$1 AND revision=9',[binding])
  assert.equal(absent.rows[0].n,1)
  const counts=await admin.query('SELECT state,count(*)::int AS n FROM '+
   'public.phase3ac_intents_staging GROUP BY state')
  const state=Object.fromEntries(counts.rows.map(r=>[r.state,r.n]))
  assert.ok((state.SPENT??0)>=2)
  assert.ok((state.CANCELLED??0)>=4)
  assert.equal(state.READY??0,1,'only deliberately expired test row remains READY')
  assert.equal(state.CLAIMED??0,0)
 })
}
