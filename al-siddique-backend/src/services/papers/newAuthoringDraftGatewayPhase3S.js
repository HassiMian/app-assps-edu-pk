// Phase 3S: dormant server-side provider-gated draft persistence preparation.
// No application route, database connector, migration or production import.
const {createHash,timingSafeEqual}=require('node:crypto')
const MAX_BYTES=5*1024*1024
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const refuse=x=>{throw Error('Phase3S refused: '+x)}
const has=x=>typeof x==='string'&&x.trim().length>0
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const positive=x=>Number.isSafeInteger(x)&&x>0
const safeHash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const hashEqual=(a,b)=>safeHash(a)&&safeHash(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))
const roles=new Set(['teacher','principal','admin'])
const identityKeys=['authority','grade','subjectId','textbookId','edition','syllabusVersion']
function actorScope(actor){
 if(!obj(actor)||!positive(actor.id)||!positive(actor.school_id)||
    !has(actor.tenant_id)||!roles.has(actor.role)||actor.account_type==='service')
  refuse('independently authenticated school actor required')
 return {schoolId:actor.school_id,tenantId:actor.tenant_id,actorId:actor.id,role:actor.role}
}
function approvedRecords(snapshot,scope,doc){
 const sid=doc?.sourceIdentity
 // Only the CURRENT server resolver can authorize publication lineage.
 // An unpinned local preview may exist, but it cannot use a signed provider for saving.
 if(snapshot?.signatureVerification==='PINNED_ED25519_VERIFIED'&&(
    !has(snapshot.publicationId)||!safeHash(snapshot.recordsDigest)||
    !has(sid?.publicationId)||!safeHash(sid?.recordsDigest)||
    sid.publicationId!==snapshot.publicationId||
    sid.recordsDigest!==snapshot.recordsDigest))
  refuse('signed publisher ID/digest missing or differs from authored source pin')
 if(!obj(snapshot)||snapshot.status!=='PUBLISHED_APPROVED'||
    snapshot.trustOrigin!=='SERVER_INDEPENDENT_AUDIT'||snapshot.schoolId!==scope.schoolId||
    snapshot.tenantId!==scope.tenantId||!positive(snapshot.revision)||
    sid?.approvedSnapshotRevision!==snapshot.revision||
    !identityKeys.every(k=>same(snapshot.curriculumIdentity?.[k],sid?.curriculumIdentity?.[k]))||
    !same(snapshot.selection,sid?.selection)||!same(snapshot.sourceBookIds,sid?.sourceBookIds)||
    !same(snapshot.sourceChecksums,sid?.sourceChecksums)||!Array.isArray(snapshot.records))
  refuse('server-approved snapshot school/tenant/edition/selection/revision mismatch')
 const records=new Map()
 for(const q of snapshot.records){
  if(!has(q?.id)||records.has(q.id)||q.review?.status!=='approved'||
     !identityKeys.every(k=>same(q.curriculum?.[k],snapshot.curriculumIdentity?.[k]))||
     !['en','ur'].every(lang=>safeHash(snapshot.sourceChecksums?.[lang])&&
       q.source?.languages?.[lang]?.pdfSha256===snapshot.sourceChecksums[lang]&&
       has(q.content?.[lang]?.stem)&&has(q.content?.[lang]?.answer)))
   refuse('unapproved, duplicate or mismatched authoritative provider record')
  records.set(q.id,q)
 }
 if(!records.size)refuse('no published academic questions exist')
 return records
}
function validateDraft(doc,records){
 const sid=doc?.sourceIdentity
 if(!obj(doc)||doc.format!=='assps-new-authoring-paper'||
    doc.documentModel!=='PaperDocumentNewAuthoring'||doc.schemaVersion!==1||
    doc.status!=='UNSAVED_LOCAL_DRAFT'||!has(doc.id)||doc.id.length>128||
    !/^[a-z0-9][a-z0-9_.:-]{2,127}$/i.test(doc.id)||
    sid?.kind!=='NEW_AUTHORING_APPROVED_CURRICULUM'||sid.draftId!==doc.id||
    sid.authorizationState!=='UNVERIFIED_CLIENT_ONLY'||sid.sourcePaperId!==null||
    sid.sourceDatasetGeneration!==null||doc.institutionBranding!==null||
    doc.legacyBankWriteAllowed!==false||doc.legacyPaperUpdated!==false||
    doc.canonicalV13MigrationClaim!==false||doc.printApproved!==false||
    doc.serverPublicationApproved!==false)
  refuse('only independent unpublished new-authoring documents may be stored')
 const medium=doc.metadata?.language==='english'?'en':doc.metadata?.language==='urdu'?'ur':null
 const direction=medium==='ur'?'rtl':'ltr'
 if(!medium||doc.metadata?.direction!==direction||
    doc.metadata?.classLevel!==sid.curriculumIdentity?.grade||
    doc.metadata?.subject!==sid.curriculumIdentity?.subjectId||!has(doc.metadata?.title))
  refuse('document language/class/subject binding is inconsistent')
 if(!Array.isArray(doc.sections)||!doc.sections.length||doc.sections.length>24||
    !Array.isArray(doc.sourceLedger)||!doc.sourceLedger.length||doc.sourceLedger.length>1920)
  refuse('bounded authored sections and original source ledger required')
 const ledger=new Map()
 for(const entry of doc.sourceLedger){
  const key=entry?.blockId+'::'+entry?.questionId
  const authoritative=records.get(entry?.questionId)
  if(ledger.has(key)||!has(entry?.blockId)||!has(entry?.questionId)||
     !same(entry.academicRecord,authoritative)||
     entry.chapterId!==authoritative?.chapter?.id||entry.topicId!==authoritative?.topicId)
   refuse('draft includes forged, unapproved or duplicate source record')
  ledger.set(key,entry)
 }
 const usedBlocks=new Set(),usedQuestions=new Set();let total=0
 for(let i=0;i<doc.sections.length;i++){
  const section=doc.sections[i]
  if(!has(section?.id)||usedBlocks.has(section.id)||section.order!==i+1||
     section.medium!==medium||!Array.isArray(section.items)||!section.items.length||
     section.items.length>80||!positive(section.attemptAny)||
     section.attemptAny>section.items.length)
   refuse('section identity, order, question count or Attempt Any invalid')
  usedBlocks.add(section.id)
  const marks=[]
  for(const item of section.items){
   const sourceId=item?.sourceQuestionId,key=section.id+'::'+sourceId
   const record=ledger.get(key)?.academicRecord,working=item?.working
   if(!record||usedQuestions.has(sourceId)||
      item.id!=='authored::'+section.id+'::'+sourceId||item.kind!==section.kind||
      item.kind!==record.type||
      item.chapterId!==record.chapter?.id||item.topicId!==record.topicId||
      !obj(working)||!has(working.stem)||!positive(working.marks)||working.marks>100||
      working.direction!==direction||!Number.isInteger(working.responseLines)||
      working.responseLines<0||working.responseLines>30)
    refuse('authored question mismatch, invalid marks or duplicate source selection')
   usedQuestions.add(sourceId);marks.push(working.marks)
   const original=record.type==='mcq'?record.content?.[medium]?.options:[]
   const current=working.options
   if(!Array.isArray(current)||
      (record.type==='mcq'&&(!Array.isArray(original)||original.length!==4||
       current.length!==4||current.some((v,n)=>v.label!==original[n]?.id||!has(v.text))))||
      (record.type!=='mcq'&&current.length!==0))
    refuse('option count/identity or authored text is invalid')
   const changed=working.stem!==record.content?.[medium]?.stem||
     (record.type==='mcq'&&current.some((v,n)=>v.text!==original[n]?.text))
   const prov=item.provenance
   if(prov?.sourceBlockId!==section.id||prov.sourceRecordId!==sourceId||
      prov.academicTextMutated!==changed||
      prov.answerKeyStatus!==(changed?'NEEDS_TEACHER_REVIEW':'SOURCE_VERIFIED')||
      prov.marksMutated!==(working.marks!==record.marks))
    refuse('source provenance or authored answer-key review state inconsistent')
  }
  const uniform=marks.every(m=>m===marks[0])
  if(section.attemptAny<marks.length&&!uniform)
   refuse('Attempt Any with mixed question marks is ambiguous')
  const listed=marks.reduce((a,b)=>a+b,0)
  const sectionTotal=section.attemptAny===marks.length?listed:section.attemptAny*marks[0]
  if(section.selectedCount!==marks.length||section.listedPotentialMarks!==listed||
     section.totalMarks!==sectionTotal||
     section.marksPerQuestion!==(uniform?marks[0]:null)||
     section.instruction!==(section.attemptAny===marks.length?
       'Attempt all':'Attempt any '+section.attemptAny))
   refuse('section marks or instruction calculation mismatch')
  total+=sectionTotal
 }
 if(usedQuestions.size!==ledger.size||total!==doc.totalMarks)
  refuse('original ledger coverage or paper total calculation mismatch')
 return true
}
const nativeText=doc=>{
 const value=JSON.stringify(doc)
 if(!has(value)||Buffer.byteLength(value,'utf8')>MAX_BYTES)
  refuse('new-authoring draft exceeds bounded UTF-8 payload')
 return value
}
function checkStoredRow(row,scope,draftId){
 if(!obj(row)||row.schoolId!==scope.schoolId||row.tenantId!==scope.tenantId||
    row.draftId!==draftId||row.status!=='DRAFT'||row.sourceProtected!==false||
    !positive(row.revision)||!safeHash(row.nativeSha256)||
    !has(row.nativeJsonText)||!hashEqual(sha(row.nativeJsonText),row.nativeSha256))
  refuse('database record is not a valid same-school immutable-hash draft')
 if(scope.role==='teacher'&&row.createdBy!==scope.actorId)
  refuse('teachers can open and revise only their own authored drafts')
 return true
}
function checkSavedResult(row,scope,draftId,revision,digest,createdBy=null){
 if(!obj(row)||row.schoolId!==scope.schoolId||row.tenantId!==scope.tenantId||
    row.draftId!==draftId||row.status!=='DRAFT'||row.sourceProtected!==false||
    (createdBy!==null&&row.createdBy!==createdBy)||row.revision!==revision||
    !hashEqual(row.nativeSha256,digest))
  refuse('repository did not return the expected school/tenant/CAS revision and hash')
 return {status:'STAGING_ONLY_DRAFT_STORED',schoolId:scope.schoolId,
  draftId,revision,nativeSha256:digest,
  approvedForPrint:false,authorizesProduction:false,legacyBankUpdated:false}
}
const GATE_LABEL='PHASE3S_ISOLATED_DRAFT_STAGING_ONLY'
function createIsolatedDraftGateway({gate,authenticate,approvedProvider,repository,
 isSchoolEnabled}={}){
 // Trusted backend construction only: do not allow the client to provide any of these ports.
 if(process.env.NODE_ENV==='production')refuse('this staging gateway is disabled in production')
 if(gate?.label!==GATE_LABEL||gate.confirmedNotProduction!==true||
    gate.isolatedSchoolCredentialAuditPassed!==true||
    gate.backupRestoreTestPassed!==true||gate.approvedProviderReadinessVerified!==true)
  refuse('independent non-production staging, credential, restore and provider gates required')
 if(typeof authenticate!=='function'||typeof approvedProvider!=='function'||
    typeof repository?.createExclusive!=='function'||
    typeof repository?.loadScoped!=='function'||typeof repository?.casUpdate!=='function'||
    typeof isSchoolEnabled!=='function')
  refuse('trusted authentication, provider, scoped repository and feature ports required')
 const authorize=async authenticationContext=>{
  const scope=actorScope(await authenticate(authenticationContext))
  const enabled=await isSchoolEnabled({schoolId:scope.schoolId,tenantId:scope.tenantId,
   feature:'paper_new_authoring_staging'})
  if(enabled!==true)refuse('school has not been independently enabled for isolated staging')
  return scope
 }
 const assertExpectedScope=(scope,expected)=>{
  if(expected!==undefined&&(!obj(expected)||
     expected.actorId!==scope.actorId||expected.role!==scope.role||
     expected.schoolId!==scope.schoolId||expected.tenantId!==scope.tenantId))
   refuse('authenticated actor changed between authoring session and staging gateway')
 }
 const audit=async(scope,doc)=>{
  if(!obj(doc)||!obj(doc.sourceIdentity))refuse('new-authoring document required')
  // Only trusted provider lookup decides which question IDs and versions are published.
  const snap=await approvedProvider({schoolId:scope.schoolId,tenantId:scope.tenantId,
   curriculumIdentity:doc.sourceIdentity.curriculumIdentity,
   selection:doc.sourceIdentity.selection})
  const records=approvedRecords(snap,scope,doc)
  validateDraft(doc,records)
  return snap
 }
 async function create({authenticationContext,draft,expectedScope}={}){
  const scope=await authorize(authenticationContext)
  assertExpectedScope(scope,expectedScope)
  const published=await audit(scope,draft)
  const json=nativeText(draft),digest=sha(json)
  const row=await repository.createExclusive({schoolId:scope.schoolId,
   tenantId:scope.tenantId,draftId:draft.id,createdBy:scope.actorId,
   revision:1,status:'DRAFT',sourceProtected:false,
   approvedSnapshotRevision:published.revision,
   nativeJsonText:json,nativeSha256:digest})
  return checkSavedResult(row,scope,draft.id,1,digest,scope.actorId)
 }
 async function loadVerified(scope,draftId){
  if(!has(draftId)||draftId.length>128)refuse('draft ID missing or malformed')
  const row=await repository.loadScoped({schoolId:scope.schoolId,
   tenantId:scope.tenantId,draftId})
  checkStoredRow(row,scope,draftId)
  let paper;try{paper=JSON.parse(row.nativeJsonText)}
  catch{refuse('stored authored paper is not valid JSON')}
  await audit(scope,paper)
  if(paper.id!==draftId)refuse('stored native draft ID drift')
  return {row,paper}
 }
 async function read({authenticationContext,draftId,expectedScope}={}){
  const scope=await authorize(authenticationContext)
  assertExpectedScope(scope,expectedScope)
  const {row,paper}=await loadVerified(scope,draftId)
  return {status:'STAGING_ONLY_AUTHORIZED_READ',draft:JSON.parse(JSON.stringify(paper)),
   revision:row.revision,nativeSha256:row.nativeSha256,authorizesProduction:false}
 }
 async function revise({authenticationContext,draft,expectedRevision,expectedNativeSha256,
  expectedScope}={}){
  const scope=await authorize(authenticationContext)
  assertExpectedScope(scope,expectedScope)
  if(!obj(draft)||!positive(expectedRevision)||!safeHash(expectedNativeSha256))
   refuse('draft, expected revision and native SHA required')
  const {row,paper:old}=await loadVerified(scope,draft.id)
  if(row.revision!==expectedRevision||!hashEqual(row.nativeSha256,expectedNativeSha256))
   refuse('stale revision or native SHA; reload draft')
  const published=await audit(scope,draft)
  const structure=d=>d.sections.map(s=>[s.id,s.order,s.kind,s.medium,
   s.items.map(item=>[item.sourceQuestionId,item.id,item.chapterId,item.topicId,item.kind])])
  if(!same(old.sourceIdentity,draft.sourceIdentity)||
     !same(old.sourceLedger,draft.sourceLedger)||!same(structure(old),structure(draft)))
   refuse('source, snapshot identity and selected question structure are immutable')
  const json=nativeText(draft)
  if(json===row.nativeJsonText)refuse('no changes to create a new revision')
  const digest=sha(json),nextRevision=row.revision+1
  const updated=await repository.casUpdate({schoolId:scope.schoolId,
   tenantId:scope.tenantId,draftId:draft.id,actorId:scope.actorId,
   expectedRevision,expectedNativeSha256,nextRevision,
   approvedSnapshotRevision:published.revision,
   nextNativeSha256:digest,nextNativeJsonText:json})
  return checkSavedResult(updated,scope,draft.id,nextRevision,digest)
 }
 return Object.freeze({create,read,revise})
}
module.exports={createIsolatedDraftGateway,GATE_LABEL,actorScope,approvedRecords,validateDraft,MAX_BYTES}
