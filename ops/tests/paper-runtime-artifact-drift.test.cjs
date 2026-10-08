const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const os=require('node:os')
const {compareArtifacts,compareReleaseMeta}=require('../check-paper-runtime-artifacts.cjs')
test('release artifact guard accepts only actual matching backend bytes', t=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'assps-artifact-'))
  t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}))
  const source=path.join(tmp,'source'),dest=path.join(tmp,'deployed')
  for(const root of [source,dest]){
    fs.mkdirSync(path.join(root,'src'),{recursive:true})
    fs.writeFileSync(path.join(root,'src/example.js'),'same bytes')
  }
  assert.deepEqual(compareArtifacts(source,dest,['src/example.js']),[])
  fs.writeFileSync(path.join(dest,'src/example.js'),'different bytes')
  assert.deepEqual(compareArtifacts(source,dest,['src/example.js']),['ARTIFACT_CONTENT_DRIFT:src/example.js'])
  fs.rmSync(path.join(dest,'src/example.js'))
  assert.deepEqual(compareArtifacts(source,dest,['src/example.js']),['DEPLOYED_FILE_MISSING:src/example.js'])
})
test('release metadata must name exact audited backend source commit',()=>{
  assert.deepEqual(compareReleaseMeta('a'.repeat(40),{commit:'a'.repeat(40)}),[])
  assert.deepEqual(compareReleaseMeta('a'.repeat(40),{commit:'b'.repeat(40)}),['BACKEND_RELEASE_COMMIT_DRIFT'])
})
