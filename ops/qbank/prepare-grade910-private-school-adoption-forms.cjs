#!/usr/bin/env node
'use strict'
// Source-locked, EMPTY private institution forms: never an adoption decision or school signature.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const book=require('./build-grade910-school-adoption-verification-matrix.cjs')
const faculty=require('./aggregate-grade910-offline-faculty-decisions.cjs')
const h=v=>crypto.createHash('sha256').update(v).digest('hex')
const deny=x=>{throw Error('ASSPS_GRADE910_PRIVATE_ADOPTION_FORMS_'+x)}
function content(x){
 return{schemaVersion:'assps-grade910-school-adoption-evidence-unsigned-template-v1',
  sourceCatalogRecordId:x.catalogId,
  originalCatalogGradeClaim:x.gradeCatalogClaim,
  originalCatalogSubjectClaim:x.subjectCatalogClaim,
  originalCatalogMediumClaim:x.mediumCatalogClaim,
  originalCatalogEditionLabel:x.editionCatalogLabel,
  sourceCatalogPdfSha256:x.sourcePdfSha256,
  originalQuestionRevisionSetSha256:x.originalQuestionRevisionSetSha256,
  associatedFrozenResearchCandidates:x.originalResearchCandidateCount,
  schoolSessionUnderReview:'2026-27',
  schoolActuallyAdoptsThisEdition:null,
  schoolAdoptedPrintedBookTitle:null,
  verifiedActualPrintedEdition:null,
  verifiedSchoolGrade:null,verifiedSchoolSubject:null,verifiedSchoolMedium:null,
  applicableBISEBoardAndExamYear:null,
  physicalBookChapterAndExercisePageEvidenceSha256:null,
  actualSchoolAdoptionCertificateEvidenceSha256:null,
  adoptingSchoolAcademicCoordinatorActorId:null,
  authorizedPrincipalApproverActorId:null,
  originalBookProvenanceVerifiedByRealStaff:false,
  independentTeacherReviewComplete:false,
  authenticatedSchoolAdoptionSignature:null,
  certifiedForPaperStudioAcademicPublication:false}
}
function root(base,run){
 const dir=faculty.secureDir(base)
 if(typeof run!=='string'||!/^[a-z][a-z0-9_-]{4,70}$/.test(run))
  deny('UNSAFE_PRIVATE_ADOPTION_RUN_ID')
 return path.join(dir,run)
}
function generate({base,runId}){
 const target=root(base,runId),source=book.build(),
  selected=source.rows.filter(x=>x.originalResearchCandidateCount>0)
 if(selected.length!==56||selected.reduce((n,q)=>n+q.originalResearchCandidateCount,0)!==2581)
  deny('AUTHORED_56_ADOPTION_SOURCE_SET_CHANGED')
 fs.mkdirSync(target,{mode:0o700})
 const entries=[]
 for(const candidate of selected.sort((a,b)=>a.catalogId.localeCompare(b.catalogId))){
  const form=content(candidate),name=candidate.catalogId+'.unsigned-school-adoption.json'
  const bytes=JSON.stringify(form,null,2)+'\n'
  fs.writeFileSync(path.join(target,name),bytes,{flag:'wx',mode:0o600})
  entries.push({catalogId:candidate.catalogId,form:name,sha256:h(bytes),
   originalQuestionRevisionSetSha256:candidate.originalQuestionRevisionSetSha256})
 }
 const index={schemaVersion:'assps-grade910-school-edition-unsigned-private-form-index-v1',
  unsignedSourceCatalogForms:56,frozenResearchQuestionReferences:2581,
  actualSchoolAuthoritySignaturesIncluded:0,schoolAdoptionDecisionsVerified:0,
  actuallyApprovedAcademicQuestions:0,publicationAuthorized:false,
  instruction:'These are intentionally UNSIGNED source-locked forms, not submitted school textbook adoption certificates. A real authorized school coordinator and principal must attest actual editions and sign final evidence through institutional verifier.',
  entries}
 const ib=JSON.stringify(index,null,2)+'\n'
 fs.writeFileSync(path.join(target,'ADOPTION_TEMPLATES_INDEX.json'),ib,{flag:'wx',mode:0o600})
 return{privateDirectory:target,unsignedForms:56,originalQuestionRefs:2581,
  originalIndexSha256:h(ib),realAdoptionCertificatesReceived:0}
}
function verify({base,runId}){
 const target=root(base,runId),dir=fs.lstatSync(target)
 if(!dir.isDirectory()||dir.isSymbolicLink()||dir.uid!==process.getuid()||
   (dir.mode&0o077)!==0)deny('ADOPTION_PRIVATE_DIR_NOT_SAFE')
 const indexFile=path.join(target,'ADOPTION_TEMPLATES_INDEX.json')
 const idx=JSON.parse(fs.readFileSync(indexFile,'utf8'))
 const used=new Map(book.build().rows.filter(x=>x.originalResearchCandidateCount>0)
   .map(x=>[x.catalogId,x]))
 if(idx.unsignedSourceCatalogForms!==56||idx.frozenResearchQuestionReferences!==2581||
  idx.schoolAdoptionDecisionsVerified!==0||idx.publicationAuthorized!==false||
  !Array.isArray(idx.entries)||idx.entries.length!==56)deny('ADOPTION_INDEX_SOURCE_COUNT_DRIFT')
 const seen=new Set()
 for(const row of idx.entries){
  const src=used.get(row.catalogId)
  if(!src||seen.has(row.catalogId)||row.form!==row.catalogId+'.unsigned-school-adoption.json'||
    row.originalQuestionRevisionSetSha256!==src.originalQuestionRevisionSetSha256)
   deny('INVALID_CATALOG_SOURCE_OR_DUPLICATE')
  seen.add(row.catalogId)
  const p=path.join(target,row.form),stat=fs.lstatSync(p)
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
   stat.uid!==process.getuid()||(stat.mode&0o077)!==0)deny('UNSAFE_SCHOOL_ADOPTION_FORM_FILE')
  const b=fs.readFileSync(p),form=JSON.parse(b.toString('utf8'))
  if(h(b)!==row.sha256||JSON.stringify(form)!==JSON.stringify(content(src)))
   deny('PRIVATE_ADOPTION_FORM_CHANGED_FROM_EMPTY_SOURCE')
 }
 return{verifiedUnsignedForms:seen.size,originalResearchQuestionRefs:2581,
  authenticatedSchoolAdoptionCertificates:0,releaseDecision:'HOLD'}
}
if(require.main===module){
 try{
  const a=process.argv.slice(2),get=k=>a[a.indexOf(k)+1]
  const params={base:get('--base'),runId:get('--run-id')}
  if(a.includes('--generate')){
   if(!a.includes('--explicit-private-school-review'))
    deny('EXPLICIT_SCHOOL_ADOPTION_TEMPLATES_OPT_IN_REQUIRED')
   console.log(JSON.stringify(generate(params)))
  }else if(a.includes('--verify'))console.log(JSON.stringify(verify(params)))
  else console.log(JSON.stringify({sourceCatalogsNeedingSchoolAdoption:56,
   unsignedTemplatesNotRealApproval:true,published:0}))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={content,generate,verify}
