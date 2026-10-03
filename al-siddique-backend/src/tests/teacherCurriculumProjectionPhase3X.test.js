const {test}=require('node:test')
const assert=require('node:assert/strict')
const {generateKeyPairSync,sign,createHash}=require('node:crypto')
const {pathToFileURL}=require('node:url')
const {join}=require('node:path')
const {createPhase3VApprovedProvider,canonicalPublicationPayload,recordsDigest,
 SCHEMA:SOURCE_SCHEMA,GATE_LABEL:SOURCE_GATE}
 =require('../services/papers/approvedCurriculumProviderPhase3V')
const {authoringBindingSha256}
 =require('../services/papers/newAuthoringRoleBoundRepositoryPhase3T')
const {createPhase3XTeacherProjection,GATE_LABEL}
 =require('../services/papers/teacherCurriculumProjectionPhase3X')
const copy=x=>JSON.parse(JSON.stringify(x))
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const TIME=1800000000
const {publicKey,privateKey}=generateKeyPairSync('ed25519')
const publicKeyPem=publicKey.export({type:'spki',format:'pem'})
const actor={id:20,school_id:51,tenant_id:'tenant-51',role:'teacher'}
const identity={authority:'PECTAA',grade:9,subjectId:'biology',
 textbookId:'ix-bio-pair',edition:'2025-26',syllabusVersion:'2025-26'}
const selection={syllabusMode:'full',examYear:null}
const sourceBookIds={en:'en-ix-bio',ur:'ur-ix-bio'}
const sourceChecksums={en:'a'.repeat(64),ur:'b'.repeat(64)}
const topic={chapterId:'chapter-1',topicId:'topic-1',chapterNumber:1,
 enChapterTitle:'The Science of Biology',urChapterTitle:'حیاتیات کی سائنس',
 enTopicTitle:'Biology and its Branches',urTopicTitle:'حیاتیات اور اس کی شاخیں',
 enSourceTopicId:'official-em-1.1',urSourceTopicId:'official-um-1.1',
 enPageStart:5,enPageEnd:16,urPageStart:7,urPageEnd:18}
const source=(id,lang,page)=>({pdfSha256:sourceChecksums[lang],
 topicId:topic[lang+'SourceTopicId'],page})
function record(id,type){
 const en={stem:'English '+id,answer:'Explanation '+id}
 const ur={stem:'اردو '+id,answer:'جواب '+id}
 let correctOptionId=null
 if(type==='mcq'){
  const ids=['A','B','C','D']
  en.options=ids.map(x=>({id:x,text:'English '+id+' '+x}))
  ur.options=ids.map(x=>({id:x,text:'اردو '+id+' '+x}))
  en.answer=en.options[1].text;ur.answer=ur.options[1].text
  correctOptionId='B'
 }
 return {id,type,marks:type==='mcq'?1:2,medium:'dual',
  curriculum:copy(identity),chapter:{id:'chapter-1',number:1},topicId:'topic-1',
  review:{status:'approved',reviewerId:22,evidenceId:'independent-qa-'+id},
  content:{en,ur},correctOptionId,
  source:{languages:{en:source(id,'en',8),ur:source(id,'ur',9)}}}
}
function fixture(){
 const records=[record('bio9-mcq1','mcq'),record('bio9-short1','short')]
 const payload={schema:SOURCE_SCHEMA,publicationId:'pub-ix-bio-v7',schoolId:51,
  tenantId:'tenant-51',revision:7,signingKeyId:'issuer-phase3x',
  curriculumIdentity:copy(identity),selection:copy(selection),
  sourceBookIds:copy(sourceBookIds),sourceChecksums:copy(sourceChecksums),
  bindingSha256:authoringBindingSha256({curriculumIdentity:identity,selection,
   sourceBookIds,sourceChecksums}),alpPolicy:null,publishedAt:TIME-500,validUntil:TIME+500,
  reviewer:{authorId:21,reviewerId:22,independentReviewComplete:true,
   evidenceId:'full-bilingual-review-2026'},
  topicRegistry:[copy(topic)],recordCount:records.length,recordsDigest:recordsDigest(records)}
 const f={records,row:{status:'PUBLISHED_APPROVED',payload},head:{
  status:'PUBLISHED_APPROVED',schoolId:51,tenantId:'tenant-51',
  publicationId:payload.publicationId,revision:payload.revision,payloadSha256:''}}
 return resign(f)
}
function resign(f){
 f.row.payload.recordCount=f.records.length
 f.row.payload.recordsDigest=recordsDigest(f.records)
 f.row.signature=sign(null,Buffer.from(canonicalPublicationPayload(f.row.payload),'utf8'),
  privateKey).toString('base64')
 f.head={status:'PUBLISHED_APPROVED',schoolId:f.row.payload.schoolId,
  tenantId:f.row.payload.tenantId,publicationId:f.row.payload.publicationId,
  revision:f.row.payload.revision,payloadSha256:sha(canonicalPublicationPayload(f.row.payload))}
 return f
}
const projectionGate={label:GATE_LABEL,confirmedNotProduction:true,
 verifiedPhase3VBackendPort:true,independentSchoolSubjectGrantReviewed:true}
const providerGate={label:SOURCE_GATE,confirmedNotProduction:true,
 independentCurriculumPublisherReviewPassed:true,
 serverSidePublicationRegistryVerified:true,keyCustodySeparationVerified:true}
function instance(f=fixture(),overrides={}){
 const status={providerCalls:0,subjectCalls:0,authCalls:0}
 const verified=createPhase3VApprovedProvider({gate:providerGate,clock:()=>TIME*1000,
  publicKeyRegistry:{'issuer-phase3x':{publicKeyPem,authority:'PECTAA',
   notBefore:TIME-1000,notAfter:TIME+1000}},
  resolveCurrentHead:async()=>copy(f.head),
  readPublication:async()=>copy(f.row),readPublishedRecords:async()=>copy(f.records)})
 const get=createPhase3XTeacherProjection({gate:projectionGate,
  authenticate:async()=>{status.authCalls++;return copy(overrides.actor||actor)},
  resolveSubjectGrant:async a=>{status.subjectCalls++;return overrides.grant||{
   status:'AUTHORIZED',schoolId:a.schoolId,tenantId:a.tenantId,actorId:a.actorId,
   role:a.role,subject:{id:'biology9',classId:'nine',syllabusId:'ptb',
    curriculumBinding:copy(identity)}}},
  approvedProvider:async args=>{status.providerCalls++;return verified(args)}})
 return {get,status}
}
const request=()=>({authenticationContext:{sessionToken:'server-resolved-only'},
 curriculumIdentity:copy(identity),selection:copy(selection)})
test('authenticated staff receives exact original signed bilingual teacher projection',async()=>{
 const f=fixture(),{get,status}=instance(f)
 const result=await get(request()),p=result.projection
 assert.equal(result.status,'TEACHER_ONLY_UNSAVED_PROJECTION')
 assert.equal(result.schoolId,51);assert.equal(result.studentAccessible,false)
 assert.equal(result.authorizesPersistence,false);assert.equal(result.printApproved,false)
 assert.equal(p.schema,'assps-phase3p-curriculum-projection-v1')
 assert.equal(p.status,'READ_ONLY_APPROVED_PROJECTION')
 assert.equal(p.revision,7)
 assert.equal(p.publicationLineage.publicationId,'pub-ix-bio-v7')
 assert.equal(p.publicationLineage.recordsDigest,f.row.payload.recordsDigest)
 assert.equal(p.publicationLineage.clientAuthorizationState,'UNVERIFIED_CLIENT_ONLY')
 assert.equal(p.chapters[0].en,topic.enChapterTitle)
 assert.equal(p.chapters[0].ur,topic.urChapterTitle)
 assert.equal(p.chapters[0].topics[0].ur,topic.urTopicTitle)
 assert.deepEqual(p.questions[0].academicRecord,f.records[0])
 assert.deepEqual(p.questions[0].options.map(x=>x.label),['A','B','C','D'])
 assert.equal(p.questions[0].correctOptionId,'B')
 assert.equal(p.questions[1].answerUrdu,'جواب bio9-short1')
 assert.deepEqual(p.sourceBookIds,sourceBookIds)
 assert.deepEqual(p.sourceChecksums,sourceChecksums)
 assert.equal(status.providerCalls,1);assert.equal(status.subjectCalls,1)
 assert.equal(f.records[0].content.en.stem,'English bio9-mcq1')
})
test('signed teacher projection continues into Phase3Q selection, Phase3P handoff and Phase3R',async()=>{
 const {get}=instance(),bundle=await get(request()),p=bundle.projection
 const dir=join(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2')
 const url=name=>pathToFileURL(join(dir,name)).href
 const q=await import(url('curriculumPreparationPhase3Q.js'))
 const r=await import(url('newAuthoringPaperDocumentPhase3R.js'))
 let w=q.createPhase3QWorkspace(p)
 w=q.phase3QToggleQuestion(w,p,'bio9-mcq1')
 w=q.phase3QSwitchType(w,p,'short')
 w=q.phase3QToggleQuestion(w,p,'bio9-short1')
 w=q.phase3QSetMedium(w,p,'ur')
 const handoff=q.phase3QPreview(w,p)
 const doc=r.createNewAuthoringPaperDocument({handoff,draftId:'draft-3x-001'})
 assert.equal(doc.totalMarks,3)
 assert.equal(doc.sourceIdentity.approvedSnapshotRevision,7)
 assert.equal(doc.sourceIdentity.publicationId,'pub-ix-bio-v7')
 assert.deepEqual(doc.sourceLedger.map(x=>x.academicRecord.id),
  ['bio9-mcq1','bio9-short1'])
 assert.equal(r.validateNewAuthoringPaperDocument(doc).valid,true)
 const preview=r.projectNewAuthoringStudentPreview(doc)
 assert.equal(preview.metadata.language,'urdu')
 const studentText=JSON.stringify(preview)
 for(const forbidden of ['sourceLedger','answerUrdu','correctOptionId',
  'approvedSnapshotRevision','recordsDigest','جواب bio9-short1'])
  assert.equal(studentText.includes(forbidden),false,forbidden+' leaked')
 assert.equal(doc.printApproved,false)
})
test('student, parent, service and unscoped staff cannot access academic answer projection',async()=>{
 for(const actorOverride of [{...actor,role:'student'},
  {...actor,role:'parent'}, {...actor,role:'platform_admin'},
  {...actor,account_type:'service'}, {...actor,school_id:null},
  {...actor,tenant_id:''}]){
  const {get,status}=instance(fixture(),{actor:actorOverride})
  await assert.rejects(get(request()),/independent school staff authentication/)
  assert.equal(status.providerCalls,0);assert.equal(status.subjectCalls,0)
 }
})
test('school scope and subject enrolment must come from independently resolved server grant',async()=>{
 for(const change of [x=>{x.schoolId=52},x=>{x.tenantId='tenant-52'},
  x=>{x.actorId=88},x=>{x.status='PENDING'},
  x=>{x.subject.curriculumBinding.edition='2026-27'},
  x=>{x.subject.syllabusId=''},x=>{x.role='student'}]){
  const grant={status:'AUTHORIZED',schoolId:51,tenantId:'tenant-51',
   actorId:20,role:'teacher',subject:{id:'biology9',classId:'nine',
    syllabusId:'ptb',curriculumBinding:copy(identity)}}
  change(grant)
  const {get,status}=instance(fixture(),{grant})
  await assert.rejects(get(request()),/trusted school subject enrolment/)
  assert.equal(status.providerCalls,0)
 }
})
test('fully re-signed but incomplete bilingual display taxonomy is rejected, never invented',async()=>{
 for(const change of [f=>{delete f.row.payload.topicRegistry[0].urTopicTitle},
  f=>{f.row.payload.topicRegistry[0].enPageStart=9},
  f=>{f.row.payload.topicRegistry[0].urPageEnd=8},
  f=>{f.row.payload.topicRegistry[0].chapterNumber=2},
  f=>{f.row.payload.topicRegistry[0].enChapterTitle=''},
 ]){
  const f=fixture();change(f);resign(f)
  const {get}=instance(f)
  await assert.rejects(get(request()),/Phase3X refused/)
 }
})
test('even correctly signed MCQ must agree with both full-language answer texts',async()=>{
 for(const language of ['en','ur']){
  const f=fixture();f.records[0].content[language].answer='incorrect answer text'
  resign(f)
  await assert.rejects(instance(f).get(request()),/correct MCQ answer text/)
 }
})
test('no registry, missing question chapter, unknown type and duplicate signed ID fail closed',async()=>{
 for(const change of [f=>{f.row.payload.topicRegistry=[]},
  f=>{f.records[0].chapter.id='chapter-other'},
  f=>{f.records[1].type='invented-question-type'},
  f=>{f.records[1].id=f.records[0].id},
 ]){const f=fixture();change(f);resign(f)
  await assert.rejects(instance(f).get(request()),/Phase3V refused|Phase3X refused/)
 }
})
test('request cannot choose a different curriculum year, school or unofficial subject',async()=>{
 const {get,status}=instance()
 await assert.rejects(get({...request(),curriculumIdentity:{...identity,grade:10}}),
  /trusted school subject enrolment/)
 assert.equal(status.providerCalls,0)
 const crossSchool=instance(fixture(),{actor:{...actor,school_id:52,tenant_id:'tenant-52'},
  grant:{status:'AUTHORIZED',schoolId:52,tenantId:'tenant-52',actorId:20,
   role:'teacher',subject:{id:'biology9',classId:'nine',syllabusId:'ptb',
    curriculumBinding:copy(identity)}}})
 await assert.rejects(crossSchool.get(request()),/Phase3V refused|Phase3X refused/)
 await assert.rejects(get({...request(),selection:{syllabusMode:'alp',examYear:2026}}),
  /Phase3V refused|Phase3X refused/)
})
test('new signed publication revision invalidates an earlier open teacher selection',async()=>{
 const one=await instance().get(request())
 const f=fixture();f.row.payload.revision=8;f.row.payload.publicationId='pub-ix-bio-v8'
 resign(f)
 const two=await instance(f).get(request())
 const dir=join(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/editorV2')
 const q=await import(pathToFileURL(join(dir,'curriculumPreparationPhase3Q.js')).href)
 const old=q.createPhase3QWorkspace(one.projection)
 assert.throws(()=>q.phase3QPreview(old,two.projection),/stale or unapproved/)
 assert.equal(one.projection.publicationLineage.snapshotRevision,7)
 assert.equal(two.projection.publicationLineage.snapshotRevision,8)
})
test('staging construction and module stay dormant without Express, DB, browser or production wiring',()=>{
 const {readFileSync}=require('node:fs')
 const file=join(__dirname,'../services/papers/teacherCurriculumProjectionPhase3X.js')
 const src=readFileSync(file,'utf8')
 assert.doesNotMatch(src,/require\(['"][^'"]*(?:express|database|questionBankRoutes)/)
 assert.doesNotMatch(src,/fetch\(|localStorage|app\.use\(|INSERT INTO|DELETE FROM|UPDATE public\./)
 assert.throws(()=>createPhase3XTeacherProjection(),/gates required/)
 const previous=process.env.NODE_ENV
 try{process.env.NODE_ENV='production';
  assert.throws(()=>createPhase3XTeacherProjection({gate:projectionGate}),/gates required/)
 }finally{
  if(previous===undefined)delete process.env.NODE_ENV
  else process.env.NODE_ENV=previous
 }
})
