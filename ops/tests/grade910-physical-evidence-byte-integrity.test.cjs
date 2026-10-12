'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto')
const m=require('../qbank/verify-grade910-physical-evidence-objects.cjs')
const auth=require('../qbank/verify-grade910-institutional-signatures.cjs')
const H=v=>crypto.createHash('sha256').update(v).digest('hex')
const temp=()=>{const d=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-real-evidence-'));fs.chmodSync(d,0o700);return d}
function sample(){
 const values=['book adoption document','curriculum topic page','printed exercise witness',
  ...auth.REVIEW_CHECKS.map(x=>'review check actual supporting object: '+x)]
 const digests=values.map(H)
 const packet={originalQuestionId:'IX-TEST-BIO-01',
  originType:'textbook-exercise',bookAdoptionEvidenceSha256:digests[0],
  curriculumTopicEvidenceSha256:digests[1],
  printedPageExerciseEvidenceSha256:digests[2],
  checks:auth.REVIEW_CHECKS.map((name,i)=>({name,passed:true,evidenceSha256:digests[i+3]}))}
 return{values,digests,packet,records:[{packet}]}
}
function write(dir,{values,digests}){
 values.forEach((v,i)=>fs.writeFileSync(path.join(dir,digests[i]+'.evidence'),v,{mode:0o600}))
}
test('school review cannot claim supporting file proof from SHA strings alone',()=>{
 const dir=temp()
 try{
  const s=sample()
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/ENOENT/)
  write(dir,s)
  const x=m.verify({directory:dir,records:s.records})
  assert.equal(x.signedPacketClaims,1)
  assert.equal(x.uniquePhysicalEvidenceObjectsVerified,11)
  assert.equal(x.sha256MatchesAll,true)
  assert.equal(x.schoolAdoptionAuthorityVerifiedByByteCheck,false)
  assert.equal(x.schoolQualifiedHumanSignatureVerifiedByByteCheck,false)
  assert.equal(x.publisherSelectable,false)
  assert.equal(x.academicallyPublished,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('real evidence byte mutation and hardlink impersonation are rejected',()=>{
 const dir=temp(),s=sample()
 try{
  write(dir,s)
  const p=path.join(dir,s.digests[0]+'.evidence')
  fs.writeFileSync(p,'fabricated different book adoption',{mode:0o600})
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/PHYSICAL_EVIDENCE_BYTES_SHA256_MISMATCH/)
  fs.writeFileSync(p,s.values[0],{mode:0o600})
  const link=path.join(dir,'another-file.evidence')
  fs.linkSync(p,link)
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/PRIVATE_EVIDENCE_OBJECT_OWNER_MODE_SIZE_OR_HARDLINK_INVALID/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('symlink, weak file permissions and repo-located private evidence are refused',()=>{
 const dir=temp(),s=sample()
 try{
  write(dir,s)
  const p=path.join(dir,s.digests[0]+'.evidence')
  fs.chmodSync(p,0o644)
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/PRIVATE_EVIDENCE_OBJECT_OWNER_MODE_SIZE_OR_HARDLINK_INVALID/)
  fs.chmodSync(p,0o600);fs.unlinkSync(p)
  const other=path.join(dir,'secret.bytes')
  fs.writeFileSync(other,s.values[0],{mode:0o600});fs.symlinkSync(other,p)
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/PRIVATE_EVIDENCE_OBJECT_OWNER_MODE_SIZE_OR_HARDLINK_INVALID/)
  assert.throws(()=>m.safeDirectory(path.resolve(__dirname,'../../docs')),
   /EVIDENCE_BYTES_MUST_NOT_BE_IN_GIT/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('missing review check, malformed digest and duplicate packet IDs fail closed',()=>{
 const dir=temp(),s=sample()
 try{
  write(dir,s)
  s.packet.checks.pop()
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/INVALID_SIGNED_ACADEMIC_PACKET/)
  s.packet.checks=auth.REVIEW_CHECKS.map((name,i)=>({name,passed:true,evidenceSha256:s.digests[i+3]}))
  s.packet.checks[0].evidenceSha256='not-a-real-digest'
  assert.throws(()=>m.verify({directory:dir,records:s.records}),/MALFORMED_ACADEMIC_EVIDENCE_DIGEST/)
  s.packet.checks[0].evidenceSha256=s.digests[3]
  assert.throws(()=>m.verify({directory:dir,records:[...s.records,...s.records]}),
   /DUPLICATE_OR_MISSING_ORIGINAL_QUESTION/)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
test('original conceptual review does not fabricate a physical textbook exercise requirement',()=>{
 const dir=temp(),s=sample()
 try{
  s.packet.originType='original-conceptual'
  delete s.packet.printedPageExerciseEvidenceSha256
  write(dir,s)
  const result=m.verify({directory:dir,records:s.records})
  assert.equal(result.uniquePhysicalEvidenceObjectsVerified,10)
  assert.equal(result.academicallyPublished,0)
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
})
