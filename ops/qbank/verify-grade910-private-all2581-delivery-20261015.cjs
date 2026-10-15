#!/usr/bin/env node
'use strict'
// Consolidate existing institution-only faculty packets and untouched unsigned
// template sources. No real review, signature, answer-key publication or DB write.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const DATA=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json')
const SUMMARY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_2581_PRIVATE_FACULTY_HANDOFF_ATTESTATION_20261015.json')
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex')
const bad=x=>{throw Error('ASSPS_2581_PRIVATE_DELIVERY_'+x)}
const safeDir=d=>{
 if(!path.isAbsolute(d))bad('PRIVATE_DIRECTORY_ABSOLUTE_REQUIRED')
 const s=fs.lstatSync(d)
 if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0||fs.realpathSync(d)!==d)bad('PRIVATE_DIRECTORY_UNTRUSTED')
 const relative=path.relative(ROOT,d)
 if(relative===''||relative==='..'||(!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative)))bad('PRIVATE_DELIVERY_INSIDE_PUBLIC_REPOSITORY')
 return d
}
function readIndex(root,name){const file=path.join(safeDir(root),name),s=fs.lstatSync(file)
 if(!s.isFile()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077)!==0)bad('PRIVATE_INDEX_INSECURE_'+name)
 const bytes=fs.readFileSync(file)
 return{data:JSON.parse(bytes),sha256:SHA(bytes)}
}
function inspect({base,runId}={}){
 if(!/^[a-z0-9][a-z0-9_-]{5,58}$/.test(String(runId||'')))bad('INVALID_DELIVERY_RUN_ID')
 safeDir(base)
 const x=JSON.parse(fs.readFileSync(DATA)), sourceHash=SHA(fs.readFileSync(DATA))
 if(x.rows.length!==2581||x.groups.length!==56||x.metrics.flaggedCandidates!==584)bad('2581_SOURCE_CROSSWALK_CHANGED')
 const roots={packs:safeDir(path.join(base,'packets',runId)),faculty:safeDir(path.join(base,'faculty-intake',runId)),adoption:safeDir(path.join(base,'school-adoption',runId))}
 const p=readIndex(roots.packs,'INDEX.json'),f=readIndex(roots.faculty,'TEMPLATES_INDEX.json'),a=readIndex(roots.adoption,'ADOPTION_TEMPLATES_INDEX.json')
 if(p.data.originalQuestionCandidates!==2581||p.data.exportedForReview!==2580||p.data.filePairs.length!==120||p.data.verifiedPublished!==0||
    p.data.facultyHeldExcludedFromAllReviewContent!==1||p.data.authenticatedIndependentTeacherApproved!==0)bad('PACKETS_APPROVAL_OR_COUNT_DRIFT')
 if(f.data.originalCandidates!==2581||f.data.editableQuestionForms!==2580||f.data.records.length!==2580||f.data.realTeacherReviewsReceived!==0||f.data.schoolAcademicApprovals!==0)bad('FACULTY_APPROVAL_OR_COUNT_DRIFT')
 if(a.data.unsignedSourceCatalogForms!==56||a.data.entries.length!==56||a.data.actualSchoolAuthoritySignaturesIncluded!==0||a.data.publicationAuthorized!==false)bad('SCHOOL_ADOPTION_FABRICATION')
 const current=new Map(x.rows.map(q=>[q.questionId,q])),byId=new Map(),faculty=new Map(),adoption=new Set()
 for(const packet of p.data.filePairs){
  if(!/^[a-z0-9_-]+--batch-[0-9]{3}$/.test(packet.batch))bad('UNSAFE_PACKET_NAME')
  for(const [ext,expected] of [['blind.json',packet.blindSha256],['answer-review.json',packet.referenceSha256],['unsigned-decisions.json',packet.unsignedDecisionTemplateSha256]]){
   const file=path.join(roots.packs,packet.batch+'.'+ext),stat=fs.lstatSync(file)
   if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o077)!==0||SHA(fs.readFileSync(file))!==expected)bad('PACKET_CHANGED_'+packet.batch)
  }
  if(packet.questions!==packet.originalIds.length)bad('PACKET_COUNT_DRIFT')
  for(const id of packet.originalIds){
   if(!current.has(id)||byId.has(id))bad('DUPLICATE_OR_UNKNOWN_PACKET_ID')
   byId.set(id,{packet:packet.batch,originalRevisionSha256:current.get(id).originalRevisionSha256})
  }
 }
 for(const row of f.data.records){
  if(!current.has(row.originalQuestionId)||faculty.has(row.originalQuestionId)||
     row.sourceRevisionSha256!==current.get(row.originalQuestionId).originalRevisionSha256)bad('FACULTY_SOURCE_SHA_DRIFT')
  faculty.set(row.originalQuestionId,row.templateFile)
 }
 for(const row of a.data.entries){if(adoption.has(row.catalogId))bad('DUPLICATE_ADOPTION_CATALOG');adoption.add(row.catalogId)}
 if(byId.size!==2580||faculty.size!==2580)bad('PRIVATE_QUESTION_COVERAGE')
 if([...byId.keys()].some(id=>!faculty.has(id))||[...faculty.keys()].some(id=>!byId.has(id)))bad('FACULTY_PACKET_TEMPLATE_IDS_DIFFER')
 const held=x.rows.filter(q=>!byId.has(q.questionId))
 if(held.length!==1||faculty.has(held[0].questionId))bad('ONE_INCOMPLETE_HELD_RECORD_NOT_ISOLATED')
 const groups=[]
 for(const group of x.groups){
  const items=x.rows.filter(q=>q.groupKey===group.groupKey),ready=items.filter(q=>byId.has(q.questionId))
  if(items.length!==group.sourceResearchQuestions||ready.length+items.filter(q=>q.questionId===held[0].questionId).length!==items.length)bad('56_GROUP_ASSIGNMENT_DRIFT')
  groups.push({groupKey:group.groupKey,grade:group.grade,subject:group.subject,medium:group.medium,
   originalResearchItems:items.length,readyForIndependentReview:ready.length,
   excludedHeld:items.length-ready.length,notYetApproved:items.length,
   refs:ready.map(q=>({id:q.questionId,originalRevisionSha256:q.originalRevisionSha256,
    batchFileStem:byId.get(q.questionId).packet,facultyTemplate:faculty.get(q.questionId)}))})
 }
 return{schema:'assps-grade910-2581-private-faculty-handoff-attestation-v1',privateDirectory:base,
  originalResearchQuestionCount:2581,privateBlindAndAnswerReferenceQuestions:byId.size,
  unsignedQualifiedTeacherForms:faculty.size,unsignedTextbookAdoptionForms:adoption.size,
  questionReviewBatchCount:p.data.filePairs.length,sourceReviewGroups:groups.length,
  facultyHeldOriginalId:held[0].questionId,facultyHeldOriginalRevisionSha256:held[0].originalRevisionSha256,
  candidateReviewCrosswalkSha256:sourceHash,blindPacketIndexSha256:p.sha256,
  unsignedFacultyIndexSha256:f.sha256,unsignedAdoptionIndexSha256:a.sha256,
  teacherReviewsAuthenticated:0,principalAcademicApprovals:0,schoolBookAdoptionSigned:0,
  academicallyApproved:0,published:0,productionWritePermitted:false,
  status:'PRIVATE_UNSIGNED_FACULTY_HANDOFF_READY_PUBLICATION_HOLD',groups}
}
function verifyFrozen(args){
 const r=inspect(args),name=path.join(safeDir(args.base),'PRIVATE_HANDOFF_GROUP_CROSSWALK.json')
 const st=fs.lstatSync(name)
 if(!st.isFile()||st.isSymbolicLink()||(st.mode&0o077)!==0||st.uid!==process.getuid())bad('PRIVATE_MANIFEST_FILE_UNSAFE')
 const bytes=fs.readFileSync(name)
 if(bytes.toString('utf8')!==JSON.stringify(r,null,2)+'\n')bad('PRIVATE_MANIFEST_BYTES_OR_SOURCE_REVISED')
 const stat=JSON.parse(fs.readFileSync(SUMMARY))
 if(stat.privateGroupHandoffSha256!==SHA(bytes)||stat.teacherReviewsAuthenticated!==0||
    stat.academicallyApproved!==0||stat.published!==0||stat.productionWritePermitted!==false)
  bad('PUBLIC_ATTESTATION_OR_SCHOOL_APPROVAL_DRIFT')
 return{verifiedPrivateGroupSha256:SHA(bytes),sourceSha256:r.candidateReviewCrosswalkSha256,
  groups:r.groups.length,originals:r.originalResearchQuestionCount,
  unsignedFaculty:r.unsignedQualifiedTeacherForms,adoptionForms:r.unsignedTextbookAdoptionForms,
  schoolApprovalExists:false,published:false}
}
function write(args){
 const r=inspect(args),folder=safeDir(args.base),file=path.join(folder,'PRIVATE_HANDOFF_GROUP_CROSSWALK.json')
 if(fs.existsSync(file))bad('NONDESTRUCTIVE_PRIVATE_ATTESTATION_ALREADY_EXISTS')
 fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n',{mode:0o600,flag:'wx'})
 const publicRecord={schema:r.schema,originalResearchQuestionCount:r.originalResearchQuestionCount,
  privateBlindAndAnswerReferenceQuestions:r.privateBlindAndAnswerReferenceQuestions,
  unsignedQualifiedTeacherForms:r.unsignedQualifiedTeacherForms,
  unsignedTextbookAdoptionForms:r.unsignedTextbookAdoptionForms,
  questionReviewBatchCount:r.questionReviewBatchCount,sourceReviewGroups:r.sourceReviewGroups,
  facultyHeldOriginalId:r.facultyHeldOriginalId,
  candidateReviewCrosswalkSha256:r.candidateReviewCrosswalkSha256,
  privateGroupHandoffSha256:SHA(fs.readFileSync(file)),
  teacherReviewsAuthenticated:0,academicallyApproved:0,published:0,productionWritePermitted:false,
  status:r.status}
 fs.writeFileSync(SUMMARY,JSON.stringify(publicRecord,null,2)+'\n')
 return publicRecord
}
if(require.main===module){
 const a=process.argv.slice(2),get=k=>a[a.indexOf(k)+1],args={base:get('--base'),runId:get('--run-id')}
 console.log(JSON.stringify(a.includes('--verify')?verifyFrozen(args):a.includes('--write')?write(args):inspect(args)).slice(0,3000))
}
module.exports={inspect,write,verifyFrozen,SUMMARY,safeDir}
