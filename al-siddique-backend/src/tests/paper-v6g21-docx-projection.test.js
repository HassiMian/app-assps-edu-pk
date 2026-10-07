const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {pathToFileURL}=require('node:url')
const {buildCanonicalDocxModel,buildCanonicalDocxBuffer,assessCanonicalDocxEligibility,extractCanonicalDocument}=require('../services/papers/paperCanonicalDocxProjectionV6G21')
const corpusPath=path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json')
const frontendModelPath=path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/export/canonicalDocxModel.js')
const raw=JSON.parse(fs.readFileSync(corpusPath,'utf8'))
const corpus=Array.isArray(raw)?raw:(raw.papers||raw.documents||[])

test('G21 backend projection model is exactly equal to G20 frontend canonical model across all 43 papers',async()=>{
  const frontend=await import(pathToFileURL(frontendModelPath).href)
  assert.equal(corpus.length,43)
  for(const paper of corpus){
    assert.deepEqual(buildCanonicalDocxModel(paper),frontend.buildCanonicalDocxModel(paper),paper.id)
  }
  console.log('G21_DOCX_MODEL_PARITY 43/43 PASS')
})

test('G21 eligibility is fail-closed to source-validated historical V13 only',()=>{
  const ok=assessCanonicalDocxEligibility({family:'historical-v13',reviewStatus:'SOURCE_VALIDATED',reviewedContract:'PaperDocumentV2',snapshotHash:'a'.repeat(64)})
  assert.equal(ok.eligible,true)
  for(const review of [
    {family:'legacy-connect-vault',reviewStatus:'LOSSLESS_ADAPTER_REQUIRED'},
    {family:'approved-curriculum-authoring',reviewStatus:'STRUCTURE_VALID_STAGING'},
    {family:'unsupported',reviewStatus:'UNKNOWN_DISCRIMINATOR'},
    {family:'historical-v13',reviewStatus:'SOURCE_INVALID',reviewedContract:'PaperDocumentV2'},
  ]) assert.equal(assessCanonicalDocxEligibility(review).eligible,false)
})

test('G21 emits a real OOXML buffer and preserves nested canonical document identity',async()=>{
  const paper=corpus.find(x=>x.metadata?.language==='urdu')
  const nested={document:paper,transportOnly:true}
  assert.equal(extractCanonicalDocument(nested),paper)
  const {buffer,model,filename}=await buildCanonicalDocxBuffer(extractCanonicalDocument(nested))
  assert.equal(buffer.subarray(0,2).toString(),'PK')
  assert.ok(buffer.length>5000)
  assert.equal(model.sourceDocumentId,paper.id)
  assert.match(filename,/\.docx$/i)
})
