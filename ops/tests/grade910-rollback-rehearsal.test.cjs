'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {rehearse,verifyBuild}=require('../qbank/rehearse-grade910-paper-selector-rollback.cjs')
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-paper-artifact-test-'))
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 function make(label){
  const dir=path.join(root,label),assetDir=path.join(dir,'assets')
  fs.mkdirSync(assetDir,{recursive:true})
  fs.writeFileSync(path.join(dir,'index.html'),'<html><meta name="build" content="'+label+'"><script src="/assets/app.js"></script></html>')
  fs.writeFileSync(path.join(assetDir,'app.js'),'// '+label)
  return dir
 }
 return {old:make('old'),candidate:make('candidate')}
}
test('atomic sandbox swap can restore prior bytes exactly without altering either build',t=>{
 const f=fixture(t),before=verifyBuild(f.old),next=verifyBuild(f.candidate)
 const result=rehearse({baseline:f.old,candidate:f.candidate})
 assert.equal(result.atomicRollbackPassed,true)
 assert.equal(result.productionTouched,false)
 assert.equal(result.genuineAuthenticatedLiveCutoverCertified,false)
 assert.equal(result.baselineIndexSha256,before.indexSha256)
 assert.deepEqual(verifyBuild(f.old),before)
 assert.deepEqual(verifyBuild(f.candidate),next)
})
test('missing bundled asset fails rollback acceptance rather than passing incomplete build',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.candidate,'assets/app.js'))
 assert.throws(()=>rehearse({baseline:f.old,candidate:f.candidate}),/MISSING_ASSET_FILE/)
})
test('same baseline and new candidate source is not a real cutover rehearsal',t=>{
 const f=fixture(t)
 assert.throws(()=>rehearse({baseline:f.old,candidate:f.old}),/NO_BASELINE_DIFFERENCE/)
})
