// Phase 3V: dormant, server-only approved Curriculum -> Phase3S provider.
// Does NOT publish source records, activate routes, read local drafts or authorize print.
const {createHash,createPublicKey,verify}=require('node:crypto')
const {authoringBindingSha256}=require('./newAuthoringRoleBoundRepositoryPhase3T')
const SCHEMA='assps-curriculum-signed-publication-v1'
const GATE_LABEL='PHASE3V_SIGNED_PUBLISHED_PROVIDER_STAGING_ONLY'
const MAX_RECORDS=5000,MAX_BYTES=5*1024*1024
const has=x=>typeof x==='string'&&x.trim().length>0
const positive=x=>Number.isSafeInteger(x)&&x>0
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const sha=x=>createHash('sha256').update(x,'utf8').digest('hex')
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x)
const refuse=x=>{throw Error('Phase3V refused: '+x)}
const FIELDS=['authority','grade','subjectId','textbookId','edition','syllabusVersion']
function canonicalJson(x){
 let raw;try{raw=JSON.stringify(x)}catch{refuse('nonserializable publication content')}
 if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>MAX_BYTES)
  refuse('missing or oversized publication payload')
 const sort=(v,depth)=>{
  if(depth>25)refuse('publication nesting exceeds safe bound')
  if(Array.isArray(v))return v.map(n=>sort(n,depth+1))
  if(v!==null&&typeof v==='object'){
   const result={};for(const k of Object.keys(v).sort())result[k]=sort(v[k],depth+1)
   return result
  }
  return v
 }
 return JSON.stringify(sort(JSON.parse(raw),0))
}
const canonicalPublicationPayload=canonicalJson
const recordsDigest=records=>sha(canonicalJson([...records].sort((a,b)=>
 String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0)))
function selectionValid(selection){
 return obj(selection)&&
 (selection.syllabusMode==='full'&&selection.examYear===null||
  selection.syllabusMode==='alp'&&positive(selection.examYear))
}
function validateRecords(p,records){
 if(!Array.isArray(records)||!records.length||records.length>MAX_RECORDS||
    records.length!==p.recordCount||!hex(p.recordsDigest))
  refuse('records missing, oversized or inconsistent with signed publication')
 const map=new Map(),seen=new Set()
 for(const t of p.topicRegistry||[]){
  const id=t?.chapterId+'::'+t?.topicId
  if(!has(t?.chapterId)||!has(t?.topicId)||!has(t?.enSourceTopicId)||
     !has(t?.urSourceTopicId)||seen.has(id))
   refuse('duplicate or unverified bilingual canonical topic identity')
  map.set(id,t);seen.add(id)
 }
 if(!map.size)refuse('signed bilingual topic registry missing')
 const ids=new Set()
 for(const q of records){
  const key=q?.chapter?.id+'::'+q?.topicId,t=map.get(key)
  if(!has(q?.id)||ids.has(q.id)||!t||q.review?.status!=='approved'||
     !has(q.review?.evidenceId)||!positive(q.review?.reviewerId)||
     q.review.reviewerId===p.reviewer.authorId||
     !FIELDS.every(k=>q.curriculum?.[k]===p.curriculumIdentity[k])||
     !has(q.type)||!positive(q.marks)||q.marks>100)
   refuse('duplicate, draft, unregistered topic or cohort-mismatched academic record')
  ids.add(q.id)
  for(const lang of ['en','ur']){
   const source=q.source?.languages?.[lang]
   if(source?.pdfSha256!==p.sourceChecksums[lang]||
      source?.topicId!==t[lang+'SourceTopicId']||
      !positive(source.page)||!has(q.content?.[lang]?.stem)||
      !has(q.content?.[lang]?.answer))
    refuse('incomplete official bilingual source evidence or unreviewed translation pairing')
  }
  if(q.type==='mcq'){
   const en=q.content.en.options,ur=q.content.ur.options
   if(!Array.isArray(en)||!Array.isArray(ur)||en.length!==4||ur.length!==4||
      en.some((o,i)=>!has(o?.id)||!has(o?.text)||o.id!==ur[i]?.id||
       !has(ur[i]?.text))||
      new Set(en.map(o=>o.id)).size!==4||
      !en.some(o=>o.id===q.correctOptionId))
    refuse('unverified bilingual MCQ option or correct-answer mapping')
  }
 }
 if(recordsDigest(records)!==p.recordsDigest)
  refuse('academic records changed after signed publication')
 return true
}
function createPhase3VApprovedProvider({gate,resolveCurrentHead,readPublication,
 readPublishedRecords,publicKeyRegistry,clock=Date.now}={}){
 if(process.env.NODE_ENV==='production')
  refuse('unsigned activation or production use prohibited in this isolated milestone')
 if(gate?.label!==GATE_LABEL||gate.confirmedNotProduction!==true||
    gate.independentCurriculumPublisherReviewPassed!==true||
    gate.serverSidePublicationRegistryVerified!==true||
    gate.keyCustodySeparationVerified!==true||
    typeof resolveCurrentHead!=='function'||typeof readPublication!=='function'||
    typeof readPublishedRecords!=='function'||typeof clock!=='function'||
    !obj(publicKeyRegistry)||!Object.keys(publicKeyRegistry).length)
  refuse('independent, pinned server publication/key registry unavailable')
 const keys=new Map()
 for(const [keyId,entry] of Object.entries(publicKeyRegistry)){
  if(!has(keyId)||!obj(entry)||!has(entry.publicKeyPem)||!has(entry.authority)||
     !positive(entry.notBefore)||!positive(entry.notAfter)||entry.notBefore>=entry.notAfter)
   refuse('missing independent issuer key custody/scope metadata')
  let key;try{key=createPublicKey(entry.publicKeyPem)}
  catch{refuse('invalid pinned issuer public key')}
  if(key.asymmetricKeyType!=='ed25519')refuse('only pinned Ed25519 publisher attestation supported')
  keys.set(keyId,{key,authority:entry.authority,
   notBefore:entry.notBefore,notAfter:entry.notAfter})
 }
 const pending='approved Curriculum snapshot is unavailable: no draft seeding or bypass'
 async function approvedProvider({schoolId,tenantId,curriculumIdentity,selection}={}){
  if(!positive(schoolId)||!has(tenantId)||tenantId.length>128||
     !obj(curriculumIdentity)||!FIELDS.every(k=>
      k==='grade'?positive(curriculumIdentity.grade):has(curriculumIdentity[k]))||
     !selectionValid(selection))refuse('explicit registered subject, tenant and full/ALP cohort required')
  const query={schoolId,tenantId,curriculumIdentity,selection}
  const head=await resolveCurrentHead(query)
  if(!obj(head)||head.status!=='PUBLISHED_APPROVED'||!positive(head.revision)||
     head.schoolId!==schoolId||head.tenantId!==tenantId||
     !has(head.publicationId)||!hex(head.payloadSha256))
   refuse(pending)
  const row=await readPublication({...query,publicationId:head.publicationId,
   revision:head.revision})
  const p=row?.payload
  if(row?.status!=='PUBLISHED_APPROVED'||!obj(p)||
     p.schema!==SCHEMA||p.publicationId!==head.publicationId||
     p.schoolId!==schoolId||p.tenantId!==tenantId||
     p.revision!==head.revision||!FIELDS.every(k=>
      p.curriculumIdentity?.[k]===curriculumIdentity[k])||
     !selectionValid(p.selection)||canonicalJson(p.selection)!==canonicalJson(selection)||
     !has(p.signingKeyId)||!hex(p.bindingSha256)||
     !['en','ur'].every(k=>has(p.sourceBookIds?.[k])&&hex(p.sourceChecksums?.[k]))||
     !positive(p.recordCount)||p.recordCount>MAX_RECORDS||
     !Array.isArray(p.topicRegistry)||!p.topicRegistry.length||
     p.topicRegistry.length>MAX_RECORDS||
     !hex(p.recordsDigest)||!positive(p.publishedAt)||!positive(p.validUntil)||
     !positive(p.reviewer?.authorId)||!positive(p.reviewer?.reviewerId)||
     p.reviewer.authorId===p.reviewer.reviewerId||
     p.reviewer.independentReviewComplete!==true||!has(p.reviewer.evidenceId))
   refuse('publication incomplete, revoked, unsigned review or mismatched source identity')
  if(p.selection.syllabusMode==='alp'&&
    (!has(p.alpPolicy?.evidenceId)||p.alpPolicy.examYear!==p.selection.examYear||
     p.alpPolicy.independentlyVerified!==true))
   refuse('ALP needs publication-signed verified board/year exclusion evidence')
  if(p.selection.syllabusMode==='full'&&p.alpPolicy!==null)
   refuse('Full textbook scope must not be overwritten by ALP policy')
  const now=Math.floor(clock()/1000)
  if(p.publishedAt>now||now>p.validUntil||
     p.validUntil-p.publishedAt>366*86400)
   refuse('publisher authorization not yet valid, expired or implausibly long-lived')
  const binding=authoringBindingSha256({curriculumIdentity:p.curriculumIdentity,
   selection:p.selection,sourceBookIds:p.sourceBookIds,
   sourceChecksums:p.sourceChecksums})
  if(binding!==p.bindingSha256||
     sha(canonicalJson(p))!==head.payloadSha256||
     (row.payloadSha256!==undefined&&row.payloadSha256!==head.payloadSha256))
   refuse('provider publication and immutable source binding SHA mismatch')
  const issuer=keys.get(p.signingKeyId)
  if(!issuer||issuer.authority!==p.curriculumIdentity.authority||
     p.publishedAt<issuer.notBefore||p.validUntil>issuer.notAfter||
     !has(row.signature)||Buffer.from(row.signature,'base64').length!==64||
     !verify(null,Buffer.from(canonicalPublicationPayload(p),'utf8'),
      issuer.key,Buffer.from(row.signature,'base64')))
   refuse('publication signature not independently trusted by pinned publisher key')
  const records=await readPublishedRecords({...query,publicationId:p.publicationId,
   revision:p.revision})
  validateRecords(p,records)
  const headAgain=await resolveCurrentHead(query)
  if(headAgain?.status!=='PUBLISHED_APPROVED'||headAgain.revision!==head.revision||
     headAgain.publicationId!==head.publicationId||
     headAgain.payloadSha256!==head.payloadSha256)
   refuse('publication changed or revoked during provider read; retry only with new approval')
  return {status:'PUBLISHED_APPROVED',trustOrigin:'SERVER_INDEPENDENT_AUDIT',
   schoolId,tenantId,revision:p.revision,
   curriculumIdentity:JSON.parse(JSON.stringify(p.curriculumIdentity)),
   selection:JSON.parse(JSON.stringify(p.selection)),
   sourceBookIds:JSON.parse(JSON.stringify(p.sourceBookIds)),
   sourceChecksums:JSON.parse(JSON.stringify(p.sourceChecksums)),
   records:JSON.parse(JSON.stringify(records)),
   publicationId:p.publicationId,recordsDigest:p.recordsDigest,
   signatureVerification:'PINNED_ED25519_VERIFIED'}
 }
 return approvedProvider
}
module.exports={SCHEMA,GATE_LABEL,canonicalPublicationPayload,recordsDigest,
 createPhase3VApprovedProvider}
