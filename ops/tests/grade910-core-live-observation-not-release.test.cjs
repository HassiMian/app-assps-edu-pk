'use strict'
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto')
const m=require('../qbank/attest-grade910-core-live-readonly-observation.cjs')
const h=x=>crypto.createHash('sha256').update(x).digest('hex')
const now=new Date('2026-10-13T13:33:59.050Z')
function mock(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'assps910-core-obs-'))
 fs.chmodSync(dir,0o700)
 const file=path.join(dir,'observed.json')
 const x={schemaVersion:'assps-academic-external-core-live-readonly-observation-v1',
  capturedAt:now.toISOString(),sourceOwner:'SaaS Core & Production Master',
  sourceVerifierGit:h('dummy snapshot SHA not a real owner release'),
  sourceVerifierSha256:h('source script'),observedJsonSha256:h('payload'),
  sourceVerifierExitCode:2,authorizesDeployment:false,
  coreOwnerCertifiedProductionRelease:false,paperOwnerApprovedPickerRelease:false,
  schoolStaffSessionAccepted:false,
  verifierPayload:{status:'HOLD',facts:{marks_signed_guards:77,
   green_signed_guards:77,legacy_app_signed_guards:0,legacy_bypass_still_active:false},
   authenticated_real_staff:false,prod_app_switched:false,production_release_certified:false}}
 fs.writeFileSync(file,JSON.stringify(x),{mode:0o600})
 return{dir,file,x,write:()=>fs.writeFileSync(file,JSON.stringify(x),{mode:0o600}),
  done:()=>fs.rmSync(dir,{recursive:true,force:true})}
}
test('new staged green 77 and safer legacy role still do NOT equal Core owner production acceptance',()=>{
 const f=mock()
 try{
  const r=m.inspect(f.file,now)
  assert.equal(r.greenCoreSignedStagedGuards,77)
  assert.equal(r.activeLegacyCoreSignedGuards,0)
  assert.equal(r.activeLegacyDbLoginHasBypassRls,false)
  assert.equal(r.productionAppSwitchedToGreenRuntime,false)
  assert.equal(r.coreOwnerCertifiedRelease,false)
  assert.equal(r.certifiedAcademicPublication,false)
  assert.match(r.decision,/HOLD/)
 }finally{f.done()}
})
test('fake full-release flag, bypassing authorizing booleans and malformed SHA are denied',()=>{
 const f=mock()
 try{
  f.x.coreOwnerCertifiedProductionRelease=true;f.write()
  assert.throws(()=>m.inspect(f.file,now),/NOT_VALID_READONLY_STATUS_SOURCE/)
  f.x.coreOwnerCertifiedProductionRelease=false
  f.x.sourceVerifierSha256='fake';f.write()
  assert.throws(()=>m.inspect(f.file,now),/NOT_VALID_READONLY_STATUS_SOURCE/)
 }finally{f.done()}
})
test('weak file permissions, stale snapshots and repo paths cannot become trusted release observations',()=>{
 const f=mock()
 try{
  fs.chmodSync(f.file,0o644)
  assert.throws(()=>m.inspect(f.file,now),/SOURCE_MUST_BE_OWNER_ONLY_REGULAR_FILE/)
  fs.chmodSync(f.file,0o600)
  assert.throws(()=>m.inspect(f.file,new Date('2026-10-15T13:33:59.050Z')),
   /STALE_CORE_OBSERVATION_ONLY/)
  assert.throws(()=>m.inspect(path.resolve(__dirname,'../../package.json'),now),
   /SOURCE_CANNOT_BE_REPO_FILE/)
 }finally{f.done()}
})
