#!/usr/bin/env node
'use strict'
// Stronger separation of signed evidence digest claims and real immutable private bytes.
// A SHA-matched evidence object is NOT proof of textbook adoption or teacher correctness.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const auth=require('./verify-grade910-institutional-signatures.cjs')
const SCHOOL=path.resolve(__dirname,'../..')
const SHA=/^[a-f0-9]{64}$/
const deny=x=>{throw Error('ASSPS_GRADE910_PHYSICAL_EVIDENCE_'+x)}
function safeDirectory(directory){
 if(typeof directory!=='string'||!path.isAbsolute(directory))
  deny('ABSOLUTE_PRIVATE_EVIDENCE_DIRECTORY_REQUIRED')
 const d=path.resolve(directory),relative=path.relative(SCHOOL,d)
 if(relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))
  deny('EVIDENCE_BYTES_MUST_NOT_BE_IN_GIT')
 if(fs.realpathSync(d)!==d)deny('EVIDENCE_DIRECTORY_ALIAS_OR_SYMLINK')
 const stat=fs.lstatSync(d)
 if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||
   (stat.mode&0o077)!==0)deny('EVIDENCE_DIRECTORY_MUST_BE_OWNER_PRIVATE')
 return d
}
function collect(record){
 const packet=record?.packet
 if(!packet||!Array.isArray(packet.checks)||packet.checks.length!==auth.REVIEW_CHECKS.length)
  deny('INVALID_SIGNED_ACADEMIC_PACKET')
 const items=[['schoolAdoption',packet.bookAdoptionEvidenceSha256],
  ['curriculumTopic',packet.curriculumTopicEvidenceSha256]]
 if(packet.originType==='textbook-exercise')
  items.push(['printedExercise',packet.printedPageExerciseEvidenceSha256])
 const set=new Set(packet.checks.map(x=>x?.name))
 if(set.size!==auth.REVIEW_CHECKS.length||
  auth.REVIEW_CHECKS.some(k=>!set.has(k)))deny('ACADEMIC_CRITERIA_MISMATCH')
 for(const c of packet.checks)items.push(['academicCheck:'+c.name,c.evidenceSha256])
 for(const [,digest] of items)if(!SHA.test(String(digest||'')))
  deny('MALFORMED_ACADEMIC_EVIDENCE_DIGEST')
 return items
}
function readObject(dir,digest){
 if(!SHA.test(digest))deny('MALFORMED_DIGEST_FILE_LOOKUP')
 const file=path.join(dir,digest+'.evidence')
 const stat=fs.lstatSync(file)
 if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||
   (stat.mode&0o077)!==0||stat.nlink!==1||stat.size<1||stat.size>32*1024*1024)
  deny('PRIVATE_EVIDENCE_OBJECT_OWNER_MODE_SIZE_OR_HARDLINK_INVALID')
 const nofollow=fs.constants.O_NOFOLLOW||0
 const fd=fs.openSync(file,fs.constants.O_RDONLY|nofollow)
 try{
  const second=fs.fstatSync(fd)
  if(!second.isFile()||second.ino!==stat.ino||second.dev!==stat.dev||
    second.size!==stat.size||second.nlink!==1||second.uid!==process.getuid())
   deny('PRIVATE_EVIDENCE_OBJECT_CHANGED_DURING_OPEN')
  const bytes=fs.readFileSync(fd)
  const actual=crypto.createHash('sha256').update(bytes).digest('hex')
  if(actual!==digest)deny('PHYSICAL_EVIDENCE_BYTES_SHA256_MISMATCH')
  return {digest,bytes:bytes.length}
 }finally{fs.closeSync(fd)}
}
function verify({directory,records}){
 const dir=safeDirectory(directory)
 if(!Array.isArray(records)||records.length===0||records.length>2581)
  deny('INVALID_SIGNED_RECORD_COUNT')
 const hashes=new Map(),ids=new Set()
 for(const r of records){
  const id=r?.packet?.originalQuestionId
  if(typeof id!=='string'||!id||ids.has(id))deny('DUPLICATE_OR_MISSING_ORIGINAL_QUESTION')
  ids.add(id)
  for(const [purpose,digest] of collect(r)){
   if(!hashes.has(digest))hashes.set(digest,new Set())
   hashes.get(digest).add(purpose)
  }
 }
 let total=0
 const results=[]
 for(const [digest,purposes] of [...hashes].sort(([a],[b])=>a.localeCompare(b))){
  const evidence=readObject(dir,digest)
  total+=evidence.bytes
  results.push({digest,bytes:evidence.bytes,purposes:[...purposes].sort()})
 }
 return{schemaVersion:'assps-grade910-private-signed-evidence-byte-integrity-v1',
  signedPacketClaims:records.length,uniquePhysicalEvidenceObjectsVerified:results.length,
  physicalEvidenceBytesVerified:total,sha256MatchesAll:true,
  teacherAcademicCorrectnessVerifiedByByteCheck:false,
  schoolAdoptionAuthorityVerifiedByByteCheck:false,
  schoolQualifiedHumanSignatureVerifiedByByteCheck:false,
  publisherSelectable:false,academicallyPublished:0,
  releaseDecision:'HOLD_UNTIL_SCHOOL_ROSTER_SIGNATURE_AND_FACULTY_REVIEW_VALIDATED',
  results}
}
function inspectStore(directory){
 const d=safeDirectory(directory)
 const list=fs.readdirSync(d,{withFileTypes:true})
 if(list.length>30000)deny('EVIDENCE_STORE_FILE_COUNT_TOO_HIGH')
 let size=0
 for(const x of list){
  if(!x.isFile()||x.isSymbolicLink()||!/^[0-9a-f]{64}\.evidence$/.test(x.name))
   deny('UNSAFE_EVIDENCE_OBJECT_NAME_OR_TYPE')
  size+=readObject(d,x.name.slice(0,64)).bytes
 }
 return{privateStoreConfigured:true,byteHashVerifiedObjectCount:list.length,
  sha256BytesVerified:size,actualSchoolAdoptionCertification:false,
  actualQualifiedSchoolReviewerSignatureVerified:false,
  academicallyApproved:0,published:0,releaseDecision:'HOLD'}
}
if(require.main===module){
 try{
  const directory=process.env.ASSPS_ACADEMIC_EVIDENCE_OBJECT_DIR
  console.log(JSON.stringify(directory?inspectStore(directory):
   {privateStoreConfigured:false,noAcademicApprovalGranted:true,
    requiresPrivateEvidenceObjectDirectory:true,published:0,releaseDecision:'HOLD'}))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={safeDirectory,collect,readObject,verify,inspectStore}
