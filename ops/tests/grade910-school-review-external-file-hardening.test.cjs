'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const mod=require('../qbank/verify-grade910-school-review-envelope.cjs')
const mk=()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-school-review-safe-'));fs.chmodSync(root,0o700);return root}
test('actual out-of-repository sensitive school signed bundle accepts only 0700 parent and 0600 content',()=>{
 const d=mk(),f=path.join(d,'signed-school-review.json')
 try{
  fs.writeFileSync(f,'{"validSyntheticTest":true}',{mode:0o600})
  assert.equal(mod.verifyExternalFile(f,{sensitive:true}),f)
  fs.chmodSync(f,0o644)
  assert.throws(()=>mod.verifyExternalFile(f,{sensitive:true}),/SCHOOL_TRUST_FILE_UNSAFE_OWNER_MODE_OR_SIZE/)
  fs.chmodSync(f,0o600)
  fs.chmodSync(d,0o755)
  assert.throws(()=>mod.verifyExternalFile(f,{sensitive:true}),/SCHOOL_REVIEW_PARENT_FOLDER_NOT_PRIVATE/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
test('symlink, repository-relative, oversized, or public-writable school authority files fail closed',()=>{
 const d=mk(),a=path.join(d,'true.json'),alias=path.join(d,'alias.json')
 try{
  fs.writeFileSync(a,'{"syntheticData":true}',{mode:0o600})
  fs.symlinkSync(a,alias)
  assert.throws(()=>mod.verifyExternalFile(alias,{sensitive:true}),/SCHOOL_REVIEW_SYMLINK_OR_ALIAS_NOT_ALLOWED/)
  assert.throws(()=>mod.verifyExternalFile('relative.json',{sensitive:true}),/SCHOOL_TRUST_FILE_MUST_BE_ABSOLUTE/)
  assert.throws(()=>mod.verifyExternalFile(a,{sensitive:true,maxBytes:2}),/SCHOOL_TRUST_FILE_UNSAFE_OWNER_MODE_OR_SIZE/)
  fs.chmodSync(a,0o622)
  assert.throws(()=>mod.verifyExternalFile(a),/SCHOOL_TRUST_FILE_UNSAFE_OWNER_MODE_OR_SIZE/)
  assert.throws(()=>mod.verifyExternalFile(path.resolve(__dirname,'faux-trust.json'),{sensitive:true}),
   /SCHOOL_AUTHORITY_EVIDENCE_MUST_BE_OUTSIDE_GIT_WORKTREE/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
test('school PUBLIC root certificate is not confidential but still must be trusted, privately configured and writable-only by owner',()=>{
 const d=mk(),file=path.join(d,'institution-public-root.pem')
 try{
  fs.writeFileSync(file,'-----BEGIN PUBLIC KEY-----\nsynthetic-test-only\n-----END PUBLIC KEY-----',{mode:0o644})
  assert.equal(mod.verifyExternalFile(file,{sensitive:false,maxBytes:128*1024}),file)
  fs.chmodSync(file,0o666)
  assert.throws(()=>mod.verifyExternalFile(file,{sensitive:false}),/SCHOOL_TRUST_FILE_UNSAFE_OWNER_MODE_OR_SIZE/)
 }finally{fs.rmSync(d,{recursive:true,force:true})}
})
