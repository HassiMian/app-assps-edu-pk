const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {pathToFileURL}=require('node:url')
const {buildCanonicalDocxModel,buildCanonicalDocxBuffer,assessCanonicalDocxEligibility,extractCanonicalDocument,buildRevisionBoundCanonicalDocx}=require('../services/papers/paperCanonicalDocxProjectionV6G21')
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
  const {buffer,model,filename,docxSha256}=await buildCanonicalDocxBuffer(extractCanonicalDocument(nested))
  assert.equal(buffer.subarray(0,2).toString(),'PK')
  assert.equal(docxSha256,crypto.createHash('sha256').update(buffer).digest('hex'))
  assert.ok(buffer.length>5000)
  assert.equal(model.sourceDocumentId,paper.id)
  assert.match(filename,/\.docx$/i)
})


test('G21 revision-bound download preserves exact source identity without granting authority',async()=>{
  const paper=corpus.find(x=>x.metadata?.language==='english')
  const hash='b'.repeat(64)
  const result=await buildRevisionBoundCanonicalDocx({schoolId:5,userId:9,role:'teacher',paperId:'77',revision:4,snapshotHash:hash,deps:{
    resolveRevisionBoundPaper:async()=>({paper:{id:'77'},document:paper,revision:4,snapshotHash:hash,currentRevision:4,isCurrent:true}),
    reviewPortalPaperDocument:async()=>({family:'historical-v13',reviewStatus:'SOURCE_VALIDATED',reviewedContract:'PaperDocumentV2',snapshotHash:hash}),
  }})
  assert.ok(result.buffer.length>5000)
  assert.equal(result.source.paperId,'77')
  assert.equal(result.source.revision,4)
  assert.equal(result.source.snapshotHash,hash)
  assert.equal(result.policy.legacyDomExporterUsed,false)
  assert.equal(result.policy.persisted,false)
  assert.equal(result.policy.academicApprovalChanged,false)
  assert.equal(result.policy.publisherApprovalChanged,false)
  assert.equal(result.policy.canonicalWriteChanged,false)
  assert.equal(result.policy.approvalClaim,false)
})

test('G21 refuses historical revisions even when their snapshot is otherwise valid',async()=>{
  const paper=corpus[0],hash='c'.repeat(64)
  await assert.rejects(()=>buildRevisionBoundCanonicalDocx({schoolId:5,userId:9,role:'teacher',paperId:'77',revision:3,snapshotHash:hash,deps:{
    resolveRevisionBoundPaper:async()=>({paper:{id:'77'},document:paper,revision:3,snapshotHash:hash,currentRevision:4,isCurrent:false}),
  }}),e=>e.code==='CANONICAL_DOCX_CURRENT_REVISION_REQUIRED')
})

test('G21 refuses review-hash drift and noncanonical families',async()=>{
  const paper=corpus[0],hash='d'.repeat(64)
  const base={paper:{id:'77'},document:paper,revision:1,snapshotHash:hash,currentRevision:1,isCurrent:true}
  await assert.rejects(()=>buildRevisionBoundCanonicalDocx({schoolId:5,userId:9,role:'teacher',paperId:'77',revision:1,snapshotHash:hash,deps:{
    resolveRevisionBoundPaper:async()=>base,
    reviewPortalPaperDocument:async()=>({family:'historical-v13',reviewStatus:'SOURCE_VALIDATED',reviewedContract:'PaperDocumentV2',snapshotHash:'e'.repeat(64)}),
  }}),e=>e.code==='CANONICAL_DOCX_REVIEW_HASH_MISMATCH')
  await assert.rejects(()=>buildRevisionBoundCanonicalDocx({schoolId:5,userId:9,role:'teacher',paperId:'77',revision:1,snapshotHash:hash,deps:{
    resolveRevisionBoundPaper:async()=>base,
    reviewPortalPaperDocument:async()=>({family:'approved-curriculum-authoring',reviewStatus:'STRUCTURE_VALID_STAGING',reviewedContract:'PaperDocumentNewAuthoring',snapshotHash:hash}),
  }}),e=>e.code==='CANONICAL_DOCX_NOT_ELIGIBLE')
})

test('G21 backend DOCX emits Office Math and exact embedded image bytes',async()=>{
  const JSZip=require('jszip')
  const base=structuredClone(corpus.find(d=>d.metadata?.language==='english')||corpus[0])
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='
  base.assets=[{id:'asset-g21-image-1',kind:'image',storage:'embedded',mimeType:'image/png',sha256:'b'.repeat(64),byteLength:Buffer.from(png,'base64').length,widthPx:120,heightPx:80,altText:'G21 immutable diagram',description:'Server DOCX parity fixture',contentDataUrl:`data:image/png;base64,${png}`}]
  const nodes=base.sections.flatMap(section=>section.nodes||[]);assert.ok(nodes.length>=2)
  nodes[0].math={format:'latex',source:'m^2 + n^2 = h^2',display:'block'}
  nodes[1].assetRefs=['asset-g21-image-1']
  const model=buildCanonicalDocxModel(base)
  assert.ok(model.blocks.some(block=>block.kind==='math_capability'&&block.source==='m^2 + n^2 = h^2'))
  assert.ok(model.blocks.some(block=>block.kind==='image_asset'&&block.assetId==='asset-g21-image-1'))
  const {buffer,docxSha256}=await buildCanonicalDocxBuffer(base)
  assert.equal(docxSha256,crypto.createHash('sha256').update(buffer).digest('hex'))
  const zip=await JSZip.loadAsync(buffer)
  const xml=await zip.file('word/document.xml').async('string')
  assert.match(xml,/<m:oMath>/);assert.ok(xml.includes('m^2 + n^2 = h^2'));assert.ok(xml.includes('G21 immutable diagram'))
  const mediaName=Object.keys(zip.files).find(name=>name.startsWith('word/media/')&&!zip.files[name].dir)
  assert.ok(mediaName)
  const media=await zip.file(mediaName).async('nodebuffer')
  assert.deepEqual(media,Buffer.from(png,'base64'))
  console.log('G21_DOCX_MATH_IMAGE PASS')
})
