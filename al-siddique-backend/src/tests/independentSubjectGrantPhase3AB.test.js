const {test}=require('node:test')
const assert=require('node:assert/strict')
const {createPhase3ABSubjectGrantResolver,GATE_LABEL}=require(
 '../services/papers/independentSubjectGrantPhase3AB')
const {auditPhase3ABReadiness,requiredReviews}=require(
 '../services/papers/curriculumReadinessPreflightPhase3AB')
const {createPhase3XTeacherProjection,GATE_LABEL:TEACHER_GATE}=require(
 '../services/papers/teacherCurriculumProjectionPhase3X')
const {createPhase3YAuthoringSession,GATE_LABEL:SESSION_GATE}=require(
 '../services/papers/teacherAuthoringSessionPhase3Y')
const clone=x=>JSON.parse(JSON.stringify(x))
const NOW=1800000000000
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-biology-dual',edition:'2025-26',syllabusVersion:'2025-26'}
const request=()=>({schoolId:51,tenantId:'tenant-51',actorId:110,role:'teacher',
 curriculumIdentity:clone(identity),selection:{syllabusMode:'full',examYear:null}})
const gate={label:GATE_LABEL,confirmedNotProduction:true,
 independentRosterReviewPassed:true,subjectAssignmentRegistryReviewed:true,
 curriculumBindingRegistryReviewed:true,noImplicitPrincipalAdminBypass:true}
function fixture(){
 const school={source:'INDEPENDENT_SCHOOL_REGISTRY',
  id:51,tenant_id:'tenant-51',status:'active',
  paperAuthoringStagingApproved:true,isDemo:false}
 const staff={source:'INDEPENDENT_SCHOOL_STAFF_ROSTER',
  id:110,school_id:51,tenant_id:'tenant-51',role:'teacher',
  status:'active',account_type:'human',paperAuthoringEligible:true}
 const assignment={source:'SCHOOL_APPROVED_STAFF_ASSIGNMENT',status:'ACTIVE',
  assignmentId:'assps-51-bio9-teacher110',schoolId:51,tenantId:'tenant-51',
  actorId:110,role:'teacher',grade:9,subjectId:'biology',subjectRef:'biology9',
  classId:'nine',syllabusId:'ptb',validFromMs:NOW-10000,validUntilMs:NOW+10000,
  review:{approvedByStaffId:22,evidenceId:'assignment-audit-51',approvedAtMs:NOW-20000}}
 const binding={source:'INDEPENDENT_CURRICULUM_BINDING',status:'ACTIVE',
  assignmentId:assignment.assignmentId,schoolId:51,tenantId:'tenant-51',
  subjectRef:'biology9',classId:'nine',syllabusId:'ptb',
  curriculumIdentity:clone(identity),approvalEvidenceId:'edition-binding-verified',
  approvedByStaffId:23,fullTextbookApproved:true,alpApprovals:[]}
 const counts={school:0,staff:0,assignment:0,binding:0}
 const data={school,staff,assignment,binding,counts,
  onSchool:null,onStaff:null,onAssignment:null,onBinding:null}
 const ports={gate,clock:()=>NOW,
  readSchool:async()=>{counts.school++;return clone(data.onSchool?.(counts.school)||school)},
  readStaff:async()=>{counts.staff++;return clone(data.onStaff?.(counts.staff)||staff)},
  readAssignment:async()=>{counts.assignment++;
   return clone(data.onAssignment?.(counts.assignment)||assignment)},
  readCurriculumBinding:async()=>{counts.binding++;
   return clone(data.onBinding?.(counts.binding)||binding)}}
 return {data,ports,make:()=>createPhase3ABSubjectGrantResolver(ports)}
}
test('Phase3X exact subject-grant shape is issued only after two independent reads',async()=>{
 const e=fixture(),grant=await e.make()(request())
 assert.deepEqual(grant,{status:'AUTHORIZED',schoolId:51,tenantId:'tenant-51',
  actorId:110,role:'teacher',subject:{id:'biology9',classId:'nine',
   syllabusId:'ptb',curriculumBinding:identity}})
 assert.deepEqual(e.data.counts,{school:2,staff:2,assignment:2,binding:2})
 grant.subject.curriculumBinding.edition='forged'
 assert.equal(e.data.binding.curriculumIdentity.edition,'2025-26')
})
test('principal/admin privilege never substitutes a separately reviewed subject assignment',async()=>{
 for(const role of ['principal','admin']){
  const e=fixture(),r=request();r.role=role;e.data.staff.role=role
  await assert.rejects(e.make()(r),/staff\/class\/subject assignment/)
  e.data.assignment.role=role
  const grant=await e.make()(r);assert.equal(grant.role,role)
  assert.equal(grant.subject.id,'biology9')
 }
})
test('active school, exact tenant, and non-demo feature approval are mandatory',async()=>{
 for(const change of [e=>{e.school.status='trial'},
  e=>{e.school.tenant_id='tenant-52'},
  e=>{e.school.paperAuthoringStagingApproved=false},
  e=>{e.school.isDemo=true},
  e=>{e.school.id=52}]){
  const e=fixture();change(e.data)
  await assert.rejects(e.make()(request()),/active independently enabled school/)
  assert.equal(e.data.counts.assignment,0)
 }
})
test('service, inactive, wrong role, school, tenant or ineligible staff cannot receive grant',async()=>{
 for(const change of [x=>{x.account_type='service'},
  x=>{x.status='disabled'},x=>{x.role='parent'},
  x=>{x.school_id=52},x=>{x.tenant_id='tenant-52'},
  x=>{x.paperAuthoringEligible=false},x=>{x.id=111}]){
  const e=fixture();change(e.data.staff)
  await assert.rejects(e.make()(request()),/active, human, same-school/)
  assert.equal(e.data.counts.assignment,0)
 }
})
test('expired/future/forged class assignment or teacher self-review always fails',async()=>{
 for(const change of [x=>{x.status='REVOKED'},
  x=>{x.source='CLIENT_CLAIM'},x=>{x.actorId=111},
  x=>{x.role='admin'},x=>{x.grade=10},x=>{x.subjectId='physics'},
  x=>{x.classId=''},x=>{x.validUntilMs=NOW},
  x=>{x.validFromMs=NOW+1},x=>{x.review.approvedByStaffId=110},
  x=>{x.review.evidenceId=''},x=>{x.review.approvedAtMs=NOW+1}]){
  const e=fixture();change(e.data.assignment)
  await assert.rejects(e.make()(request()),/assignment and nonself review/)
  assert.equal(e.data.counts.binding,0)
 }
})
test('Full and exam-year ALP are independent explicit Curriculum bindings',async()=>{
 const absent=fixture();absent.data.binding.fullTextbookApproved=false
 await assert.rejects(absent.make()(request()),/Full textbook binding/)
 const alp=fixture(),r=request();r.selection={syllabusMode:'alp',examYear:2026}
 await assert.rejects(alp.make()(r),/ALP requires separately verified/)
 alp.data.binding.alpApprovals.push({examYear:2026,
  status:'INDEPENDENTLY_VERIFIED',evidenceId:'alp-pectaa-2026-review'})
 assert.equal((await alp.make()(r)).status,'AUTHORIZED')
 r.selection.examYear=2027
 await assert.rejects(alp.make()(r),/ALP requires separately verified/)
})
test('binding must equal reviewer-approved subject, class, edition and syllabus version',async()=>{
 for(const change of [x=>{x.source='FRONTEND_FLAG'},
  x=>{x.status='DRAFT'},x=>{x.subjectRef='physics9'},
  x=>{x.assignmentId='other-assignment'},x=>{x.classId='ten'},
  x=>{x.curriculumIdentity.edition='2026-27'},
  x=>{x.curriculumIdentity.syllabusVersion='other'},
  x=>{x.approvedByStaffId=110},x=>{x.approvalEvidenceId=''}]){
  const e=fixture();change(e.data.binding)
  await assert.rejects(e.make()(request()),/exact textbook edition and classroom/)
 }
})
test('a revoked assignment or changed binding during a second read is rejected',async()=>{
 for(const where of ['school','staff','assignment','binding']){
  const e=fixture();e.data['on'+where[0].toUpperCase()+where.slice(1)]=n=>{
   if(n!==2)return null
   const copy=clone(e.data[where]);
   if(where==='school')copy.status='suspended'
   if(where==='staff')copy.status='inactive'
   if(where==='assignment')copy.status='REVOKED'
   if(where==='binding')copy.curriculumIdentity.edition='2026-27'
   return copy
  }
  await assert.rejects(e.make()(request()),/Phase3AB refused/)
 }
})
test('even valid rechecked rows with changed evidential content cause TOCTOU refusal',async()=>{
 const e=fixture();e.data.onAssignment=n=>{if(n!==2)return null;
  const a=clone(e.data.assignment);a.review.evidenceId='silently-swapped';return a}
 await assert.rejects(e.make()(request()),/changed during grant read/)
})
test('client-forged scope and invalid Full/ALP values are refused before registry reads',async()=>{
 for(const changed of [r=>{r.schoolId='51'},r=>{r.actorId=0},
  r=>{r.role='student'},r=>{r.tenantId=''},
  r=>{r.curriculumIdentity.grade=0},r=>{r.selection.syllabusMode='klp'},
  r=>{r.selection={syllabusMode:'full',examYear:2026}},
  r=>{r.selection={syllabusMode:'alp',examYear:null}}]){
  const e=fixture(),r=request();changed(r)
  await assert.rejects(e.make()(r),/server-resolved actor/)
  assert.equal(e.data.counts.school,0)
 }
})
test('production or incomplete trust gates never construct / execute grant resolver',async()=>{
 const e=fixture()
 assert.throws(()=>createPhase3ABSubjectGrantResolver(),/registry ports required/)
 assert.throws(()=>createPhase3ABSubjectGrantResolver({...e.ports,
  gate:{...gate,noImplicitPrincipalAdminBypass:false}}),/registry ports required/)
 const fn=e.make(),original=process.env.NODE_ENV
 try{process.env.NODE_ENV='production';
  assert.throws(()=>createPhase3ABSubjectGrantResolver(e.ports),/registry ports required/)
  await assert.rejects(fn(request()),/production grant resolver disabled/)
 }finally{if(original===undefined)delete process.env.NODE_ENV;
  else process.env.NODE_ENV=original}
})
test('actual Phase3X consumes independent Phase3AB grant, not browser-provided role',async()=>{
 const e=fixture(),resolveSubjectGrant=e.make(),fakeHash='a'.repeat(64)
 const one={id:'biology-short1',type:'short',marks:2,
  curriculum:clone(identity),chapter:{id:'c1',number:1},topicId:'t1',
  content:{en:{stem:'Biology?',answer:'Life science'},
   ur:{stem:'حیاتیات؟',answer:'زندگی کا علم'}},review:{status:'approved'},
  source:{languages:{en:{pdfSha256:fakeHash,topicId:'en-1.1',page:4},
   ur:{pdfSha256:fakeHash,topicId:'ur-1.1',page:6}}}}
 const snapshot={status:'PUBLISHED_APPROVED',trustOrigin:'SERVER_INDEPENDENT_AUDIT',
  signatureVerification:'PINNED_ED25519_VERIFIED',
  schoolId:51,tenantId:'tenant-51',publicationId:'synthetic-only-pub',revision:7,
  recordsDigest:'b'.repeat(64),curriculumIdentity:clone(identity),
  sourceBookIds:{en:'synthetic-en',ur:'synthetic-ur'},
  sourceChecksums:{en:fakeHash,ur:fakeHash},selection:request().selection,
  records:[one],topicRegistry:[{chapterId:'c1',topicId:'t1',chapterNumber:1,
   enChapterTitle:'Biology',urChapterTitle:'حیاتیات',
   enTopicTitle:'Life Science',urTopicTitle:'زندگی کا علم',
   enSourceTopicId:'en-1.1',urSourceTopicId:'ur-1.1',
   enPageStart:1,enPageEnd:10,urPageStart:1,urPageEnd:10}]}
 const load=createPhase3XTeacherProjection({gate:{
  label:TEACHER_GATE,confirmedNotProduction:true,
  verifiedPhase3VBackendPort:true,independentSchoolSubjectGrantReviewed:true},
  authenticate:async()=>({id:110,school_id:51,tenant_id:'tenant-51',role:'teacher'}),
  resolveSubjectGrant,approvedProvider:async()=>clone(snapshot)})
 const bundle=await load({authenticationContext:{serverSession:'synthetic'},
  curriculumIdentity:clone(identity),selection:request().selection})
 assert.equal(bundle.projection.subjects[0].id,'biology9')
 assert.equal(bundle.projection.questions[0].academicRecord.id,'biology-short1')
 assert.equal(bundle.authorizesPersistence,false)
 const trustedAuth=async()=>({id:110,school_id:51,tenant_id:'tenant-51',role:'teacher'})
 const never=async()=>{throw Error('No staging save is authorized by Phase3AB')}
 const session=createPhase3YAuthoringSession({gate:{label:SESSION_GATE,
  confirmedNotProduction:true,trustedAuthContextStable:true,
  independentProjectionAndGatewayReviewed:true},authenticate:trustedAuth,
  teacherProjection:load,draftGateway:{create:never,read:never,revise:never},clock:()=>NOW})
 const prepared=await session.prepare({authenticationContext:{serverSession:'synthetic'},
  curriculumIdentity:clone(identity),selection:request().selection})
 assert.equal(prepared.status,'TEACHER_ONLY_AUTHORING_PREPARED')
 assert.equal(prepared.projection.questions[0].id,'biology-short1')
 assert.equal(prepared.authorizesPersistence,false)
 e.data.assignment.status='REVOKED'
 await assert.rejects(session.prepare({authenticationContext:{serverSession:'synthetic'},
  curriculumIdentity:clone(identity),selection:request().selection}),
  /assignment and nonself review/)
 await assert.rejects(load({authenticationContext:{serverSession:'synthetic'},
  curriculumIdentity:clone(identity),selection:request().selection}),
  /assignment and nonself review/)
})
test('official source preflight explicitly blocks current Biology IX PECTAA pending status',()=>{
 const h='a'.repeat(64),k='b'.repeat(64)
 const manifest={schemaVersion:'assps-official-manifest-v1',liveSeedCount:0,entries:[
  {grade:9,subject:'Biology',medium:'English',edition:'2025-26',
   pdfUrl:'https://official.invalid/en',pdfSha256:h,
   downloadStatus:'PDF_BYTES_VERIFIED_EDITION_UNREVIEWED',
   chapterIndexStatus:'PENDING',exerciseIndexStatus:'PENDING',
   questionGenerationStatus:'BLOCKED_PENDING_EDITION_CHAPTER_AND_EXERCISE_VALIDATION'},
  {grade:9,subject:'Biology',medium:'Urdu',edition:'VERIFY',
   pdfUrl:'https://official.invalid/ur',pdfSha256:k,
   downloadStatus:'PDF_BYTES_VERIFIED_EDITION_UNREVIEWED',
   chapterIndexStatus:'PENDING',exerciseIndexStatus:'PENDING',
   questionGenerationStatus:'BLOCKED_PENDING_EDITION_CHAPTER_AND_EXERCISE_VALIDATION'}]}
 const state=auditPhase3ABReadiness({manifest,grade:9,subject:'Biology'})
 assert.equal(state.status,'BLOCKED')
 for(const key of ['NO_APPROVED_LIVE_ACADEMIC_RECORDS','UR_EDITION_NOT_APPROVED',
  'EN_CHAPTER_INDEX_PENDING','UR_EXERCISE_INDEX_PENDING',
  'BILINGUAL_EDITION_EQUIVALENCE_NOT_APPROVED',
  'GENUINE_SIGNED_CURRICULUM_PUBLICATION_MISSING'])
  assert.ok(state.blockers.includes(key),key)
 assert.equal(state.authorizesPublication,false)
 assert.equal(state.authorizesStagingActivation,false)
 assert.equal(state.authorizesProduction,false)
})
test('even a complete evidence checklist cannot itself grant publishing or deployment',()=>{
 const h='a'.repeat(64),k='b'.repeat(64)
 const entry=(medium,digest)=>({grade:9,subject:'Biology',medium,edition:'2025-26',
  pdfUrl:'https://official.invalid/source',pdfSha256:digest,
  downloadStatus:'PDF_BYTES_VERIFIED_EDITION_REVIEWED',
  chapterIndexStatus:'INDEPENDENTLY_VERIFIED',
  exerciseIndexStatus:'INDEPENDENTLY_VERIFIED',questionGenerationStatus:'PUBLISHED_APPROVED'})
 const reviews=Object.fromEntries(requiredReviews.map((name,i)=>[name,{
  status:'INDEPENDENTLY_APPROVED',evidenceId:'separate-review-'+i,reviewerId:i+22}]))
 const args={manifest:{schemaVersion:'assps-official-manifest-v1',liveSeedCount:2,
  entries:[entry('English',h),entry('Urdu',k)]},grade:9,subject:'Biology',
  editionEvidence:{status:'INDEPENDENTLY_APPROVED',
   evidenceId:'signed-en-ur-equivalence',reviewerId:21,
   enPdfSha256:h,urPdfSha256:k},
  signedPublication:{status:'PUBLISHED_APPROVED',
   trustOrigin:'SERVER_INDEPENDENT_AUDIT',
   signatureVerification:'PINNED_ED25519_VERIFIED',
   publicationId:'example-not-authorized',revision:1,recordsDigest:'c'.repeat(64),
   recordCount:2,syntheticFixture:false},operationalReviews:reviews}
 const audit=auditPhase3ABReadiness(args)
 assert.equal(audit.status,'EVIDENCE_COMPLETE_NOT_AUTHORIZED')
 assert.deepEqual(audit.blockers,[])
 for(const key of ['authorizesPublication','authorizesStagingActivation',
  'authorizesPrinting','authorizesProduction'])assert.equal(audit[key],false)
 args.operationalReviews.multiInstanceIntentSafety.status='PENDING'
 const blocked=auditPhase3ABReadiness(args)
 assert.equal(blocked.status,'BLOCKED')
 assert.ok(blocked.blockers.includes('STAGING_REVIEW_MULTIINSTANCEINTENTSAFETY_PENDING'))
})
test('unproven roster provenance and unknown account type are not human staff grants',async()=>{
 for(const change of [e=>{e.school.source='REQUEST_HEADER'},
  e=>{e.staff.source='FRONTEND_USER'},
  e=>{e.staff.account_type=undefined},
  e=>{e.staff.account_type='machine'},
 ]){const f=fixture();change(f.data)
  await assert.rejects(f.make()(request()),/Phase3AB refused/)}
})
test('registry connection failure cannot become an implicit allow result',async()=>{
 for(const where of ['readSchool','readStaff','readAssignment','readCurriculumBinding']){
  const f=fixture(),broken={...f.ports,[where]:async()=>{throw Error('read source unavailable')}}
  await assert.rejects(createPhase3ABSubjectGrantResolver(broken)(request()),
   /read source unavailable/)
 }
})
test('Phase3AB has no route, implicit SQL or historical paper import dependencies',()=>{
 const {readFileSync}=require('node:fs')
 const {join}=require('node:path')
 for(const name of ['independentSubjectGrantPhase3AB.js',
  'curriculumReadinessPreflightPhase3AB.js']){
  const src=readFileSync(join(__dirname,'../services/papers',name),'utf8')
  assert.doesNotMatch(src,/require\(['"][^'"]*(?:express|config\/database|paperRoutes)/)
  assert.doesNotMatch(src,/app\.use\(|INSERT INTO|UPDATE public\.|DELETE FROM/)
  assert.doesNotMatch(src,/DATABASE_URL|localStorage|window\.fetch/)
 }
})
