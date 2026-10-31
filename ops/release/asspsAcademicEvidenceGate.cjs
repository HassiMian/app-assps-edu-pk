'use strict'
const fs=require('node:fs')
const crypto=require('node:crypto')
const path=require('node:path')
const ASSPS_CLASSES=['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven']
function auditSourceManifest(input){
 const d=input&&typeof input==='object'?input:{}
 const grouped=d.classes&&typeof d.classes==='object'?d.classes:{}
 const rows=[]
 const classSummary={}
 for(const klass of ASSPS_CLASSES){
  const list=Array.isArray(grouped[klass]?.subjects)?grouped[klass].subjects:[]
  classSummary[klass]={groups:list.length,approved:0,held:0}
  for(const v of list){
   const source=v&&typeof v==='object'?v:{}
   const approved=source.ownerVerified===true&&source.academicApproval===true&&source.publishStatus==='APPROVED'
   // The manifest alone is never a cryptographic school-owner sign-off.
   // Count apparent flags, but do not grant publication authority.
   if(approved)classSummary[klass].approved++
   else classSummary[klass].held++
   rows.push({klass,approved,blockedReasons:Array.isArray(source.blockedReasons)?source.blockedReasons.length:0})
  }
 }
 const unexpected=Object.keys(grouped).filter(x=>!ASSPS_CLASSES.includes(x))
 const anyOutOfScope=unexpected.length>0
 const count=rows.length
 const approvalCount=rows.filter(r=>r.approved).length
 const sourceHash=/^[0-9a-f]{64}$/i.test(String(d.originalTeacherZIPhash||''))
 const sourceReportedApproval=d.all59SourceApproved===true
 const objectiveHolds=[
   ...(!sourceHash?['ORIGINAL_ZIP_DIGEST_NOT_VERIFIABLE_FROM_MANIFEST']:[]),
   ...(anyOutOfScope?['OUT_OF_SCOPE_CLASS_IN_TERM_SOURCE']:[]),
   ...(!count?['NO_SOURCE_GROUPS']:[]),
   ...(approvalCount<count?['UNAPPROVED_SUBJECT_GROUPS']:[]),
   ...(!sourceReportedApproval?['ORIGINAL_59_SOURCE_NOT_APPROVED']:[]),
   'INDEPENDENT_ACCOUNT_LEVEL_ACADEMIC_SIGNOFF_REQUIRED'
 ]
 return {
  schema:'assps.academic.read_only_gate.v1',
  classes:ASSPS_CLASSES.length,subjectGroups:count,
  apparentApprovedGroups:approvalCount,notApprovedGroups:count-approvalCount,
  classesInSource:Object.keys(grouped).length,
  classSummary,unexpectedClasses:unexpected,
  originalZipSha256:sourceHash?d.originalTeacherZIPhash:null,
  observedSourceReportedApproval:sourceReportedApproval,
  publicationCertification:'HOLD',
  // Never produce a signed certificate from untrusted manifest flags.
  mayIssueFromManifestAlone:false,holdReasons:objectiveHolds
 }
}
if(require.main===module){
 const filename=process.argv[2]
 if(!filename||!path.isAbsolute(filename)){console.error('Supply absolute, private source manifest path');process.exitCode=2}
 else {
  try{
   const bytes=fs.readFileSync(filename)
   const data=JSON.parse(bytes)
   const out=auditSourceManifest(data)
   out.sourceManifestSha256=crypto.createHash('sha256').update(bytes).digest('hex')
   process.stdout.write(JSON.stringify(out,null,2)+'\n')
   // HOLD is an expected academic state, not a process error for an audit.
  }catch(e){console.error('EVIDENCE_AUDIT_FAILED',e.message);process.exitCode=1}
 }
}
module.exports={auditSourceManifest,ASSPS_CLASSES}
