// Phase 3X: dormant, server-only teacher projection of a signed Curriculum publication.
// No HTTP route, legacy Question Bank write, student response or print authority.
const GATE_LABEL='PHASE3X_AUTHENTICATED_TEACHER_PROJECTION_ONLY'
const SCHEMA='assps-phase3p-curriculum-projection-v1'
const LINEAGE='assps-phase3w-source-lineage-v1'
const roles=new Set(['teacher','principal','admin'])
const kinds=new Set(['mcq','short','long'])
const fields=['authority','grade','subjectId','textbookId','edition','syllabusVersion']
const yes=x=>typeof x==='string'&&x.trim().length>0
const good=x=>Number.isSafeInteger(x)&&x>0
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const clone=x=>JSON.parse(JSON.stringify(x))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const refuse=x=>{throw Error('Phase3X refused: '+x)}
function checkActor(a){
 if(!obj(a)||!good(a.id)||!good(a.school_id)||!yes(a.tenant_id)||
    a.tenant_id.length>128||!roles.has(a.role)||a.account_type==='service')
  refuse('independent school staff authentication required: no parent/student/platform access')
 return {schoolId:a.school_id,tenantId:a.tenant_id,actorId:a.id,role:a.role}
}
function checkedSubject(grant,actor,identity){
 const subject=grant?.subject
 if(grant?.status!=='AUTHORIZED'||grant.schoolId!==actor.schoolId||
    grant.tenantId!==actor.tenantId||grant.actorId!==actor.actorId||
    grant.role!==actor.role||!yes(subject?.id)||!yes(subject?.classId)||
    !yes(subject?.syllabusId)||
    !fields.every(k=>subject.curriculumBinding?.[k]===identity?.[k]))
  refuse('trusted school subject enrolment and exact curriculum binding required')
 return subject
}
function verifiedRegistry(snapshot){
 const chapters=new Map(),topicIds=new Set(),keys=new Set()
 const rows=snapshot?.topicRegistry
 if(!Array.isArray(rows)||!rows.length||rows.length>5000)
  refuse('signed complete bilingual display registry is not yet published')
 for(const t of rows){
  const key=t?.chapterId+'::'+t?.topicId
  if(!yes(t?.chapterId)||!yes(t?.topicId)||keys.has(key)||topicIds.has(t.topicId)||
     !good(t.chapterNumber)||
     !['enChapterTitle','urChapterTitle','enTopicTitle','urTopicTitle',
       'enSourceTopicId','urSourceTopicId'].every(k=>yes(t[k]))||
     !['en','ur'].every(lang=>good(t[lang+'PageStart'])&&
       good(t[lang+'PageEnd'])&&t[lang+'PageStart']<=t[lang+'PageEnd']))
   refuse('missing, duplicated or invented canonical bilingual chapter/topic/page evidence')
  keys.add(key);topicIds.add(t.topicId)
  let chapter=chapters.get(t.chapterId)
  if(!chapter){
   if([...chapters.values()].some(c=>c.n===t.chapterNumber))
    refuse('conflicting signed chapter sequence numbers')
   chapter={id:t.chapterId,n:t.chapterNumber,en:t.enChapterTitle,
    ur:t.urChapterTitle,topics:[],byId:new Map()}
   chapters.set(t.chapterId,chapter)
  }
  if(chapter.n!==t.chapterNumber||chapter.en!==t.enChapterTitle||
     chapter.ur!==t.urChapterTitle)
   refuse('signed chapter number/title drift across published topics')
  chapter.topics.push({id:t.topicId,en:t.enTopicTitle,ur:t.urTopicTitle})
  chapter.byId.set(t.topicId,t)
 }
 return chapters
}
function teacherProjection(snapshot,subject){
 if(snapshot?.status!=='PUBLISHED_APPROVED'||
    snapshot.trustOrigin!=='SERVER_INDEPENDENT_AUDIT'||
    snapshot.signatureVerification!=='PINNED_ED25519_VERIFIED'||
    !yes(snapshot.publicationId)||!good(snapshot.revision)||!sha(snapshot.recordsDigest)||
    !Array.isArray(snapshot.records)||!snapshot.records.length||
    !fields.every(k=>snapshot.curriculumIdentity?.[k]===subject.curriculumBinding?.[k])||
    !['en','ur'].every(lang=>yes(snapshot.sourceBookIds?.[lang])&&
      sha(snapshot.sourceChecksums?.[lang])))
  refuse('current Phase3V independently signed publication and subject binding required')
 const chapters=verifiedRegistry(snapshot),seen=new Set()
 const questions=snapshot.records.map(q=>{
  const chapter=chapters.get(q?.chapter?.id),t=chapter?.byId.get(q?.topicId)
  if(!t||!yes(q.id)||seen.has(q.id)||!kinds.has(q.type)||!good(q.marks)||
     q.marks>100||q.review?.status!=='approved'||
     q.chapter.number!==chapter.n||
     !fields.every(k=>q.curriculum?.[k]===snapshot.curriculumIdentity?.[k]))
   refuse('unregistered, duplicated or nonapproved academic question')
  seen.add(q.id)
  for(const lang of ['en','ur']){
   const source=q.source?.languages?.[lang]
   if(source?.pdfSha256!==snapshot.sourceChecksums[lang]||
      source?.topicId!==t[lang+'SourceTopicId']||
      !good(source.page)||source.page<t[lang+'PageStart']||
      source.page>t[lang+'PageEnd']||
      !yes(q.content?.[lang]?.stem)||!yes(q.content?.[lang]?.answer))
    refuse('question evidence does not match signed bilingual chapter/topic page range')
  }
  let options=[]
  if(q.type==='mcq'){
   const en=q.content.en.options,ur=q.content.ur.options
   if(!Array.isArray(en)||!Array.isArray(ur)||en.length!==4||ur.length!==4||
      !['A','B','C','D'].includes(q.correctOptionId)||
      en.some((x,i)=>x.id!==ur[i]?.id||!yes(x.text)||!yes(ur[i]?.text))||
      new Set(en.map(x=>x.id)).size!==4)
    refuse('signed MCQ option mapping is incomplete')
   const idx=en.findIndex(x=>x.id===q.correctOptionId)
   if(idx<0||q.content.en.answer!==en[idx].text||q.content.ur.answer!==ur[idx].text)
    refuse('correct MCQ answer text and paired option ID mismatch')
   options=en.map((x,i)=>({label:x.id,text:x.text,textUrdu:ur[i].text}))
  }
  return {id:q.id,subjectId:subject.id,type:q.type,chapterId:q.chapter.id,
   topicId:q.topicId,marks:q.marks,text:q.content.en.stem,textUrdu:q.content.ur.stem,
   answerEn:q.content.en.answer,answerUrdu:q.content.ur.answer,
   options,correctOptionId:q.correctOptionId??null,academicRecord:clone(q)}
 })
 const publicationLineage={schema:LINEAGE,publicationId:snapshot.publicationId,
  snapshotRevision:snapshot.revision,recordsDigest:snapshot.recordsDigest,
  clientAuthorizationState:'UNVERIFIED_CLIENT_ONLY'}
 return {schema:SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
  authoritativeOwner:'grade9-10-curriculum',identity:clone(snapshot.curriculumIdentity),
  subjects:[{id:subject.id,classId:subject.classId,syllabusId:subject.syllabusId}],
  sourceBookIds:clone(snapshot.sourceBookIds),
  sourceChecksums:clone(snapshot.sourceChecksums),selection:clone(snapshot.selection),
  chapters:[...chapters.values()].sort((a,b)=>a.n-b.n).map(c=>({
   id:c.id,subjectId:subject.id,n:c.n,en:c.en,ur:c.ur,topics:c.topics})),
  questions,academicRecordCount:questions.length,revision:snapshot.revision,
  publicationLineage,legacyBankWriteAllowed:false,sourcePaperUpdated:false,
  printApproved:false,serverPublicationApproved:false}
}
function createPhase3XTeacherProjection({gate,authenticate,resolveSubjectGrant,
 approvedProvider}={}){
 if(process.env.NODE_ENV==='production'||gate?.label!==GATE_LABEL||
    gate.confirmedNotProduction!==true||gate.verifiedPhase3VBackendPort!==true||
    gate.independentSchoolSubjectGrantReviewed!==true||
    typeof authenticate!=='function'||typeof resolveSubjectGrant!=='function'||
    typeof approvedProvider!=='function')
  refuse('server-authenticated, nonproduction teacher projection gates required')
 return async function loadTeacherProjection({authenticationContext,
  curriculumIdentity,selection}={}){
  if(process.env.NODE_ENV==='production')refuse('production activation not approved')
  const actor=checkActor(await authenticate(authenticationContext))
  if(!obj(curriculumIdentity)||!fields.every(k=>k==='grade'?
     good(curriculumIdentity.grade):yes(curriculumIdentity[k]))||
     !obj(selection)||!['full','alp'].includes(selection.syllabusMode)||
     (selection.syllabusMode==='full'&&selection.examYear!==null)||
     (selection.syllabusMode==='alp'&&!good(selection.examYear)))
   refuse('explicit curriculum identity and verified Full/ALP request required')
  const subject=checkedSubject(await resolveSubjectGrant({...actor,
   curriculumIdentity,selection}),actor,curriculumIdentity)
  // School/tenant are taken only from trusted authenticate(); no caller-supplied IDs.
  const snapshot=await approvedProvider({schoolId:actor.schoolId,
   tenantId:actor.tenantId,curriculumIdentity,selection})
  if(snapshot?.schoolId!==actor.schoolId||snapshot.tenantId!==actor.tenantId||
     !same(snapshot.selection,selection))
   refuse('independently verified publication does not belong to staff school/tenant/scope')
  return {status:'TEACHER_ONLY_UNSAVED_PROJECTION',schoolId:actor.schoolId,
   projection:teacherProjection(snapshot,subject),
   authorizesPersistence:false,studentAccessible:false,printApproved:false}
 }
}
module.exports={GATE_LABEL,createPhase3XTeacherProjection}
