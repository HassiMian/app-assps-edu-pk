import {test} from 'node:test'
import assert from 'node:assert/strict'
import {getAllEarlyYearsPapers} from '../earlyYears/data/earlyYearsSourceStore.js'
import {getDefaultEarlyYearsTemplateId} from '../earlyYears/earlyYearsTemplates.js'
import {registerSessionSketch} from '../earlyYears/assets/SketchAssetRegistry.js'
import {captureEarlyYearsReferenceBaseline,verifyEarlyYearsReferenceBaseline,
 compareEarlyYearsReferenceBaseline} from '../earlyYears/specs/EarlyYearsOverlayBaseline.js'
const papers=getAllEarlyYearsPapers()
const source=papers[0],scope='tenant-phase3c-controlled'
const clone=o=>JSON.parse(JSON.stringify(o))
const args=(paper=source,extra={})=>({
 paper,tenantScope:scope,explicitAcknowledgement:true,capturedAt:'2026-10-02T07:00:00.000Z',
 rawOverlayJson:JSON.stringify({[paper.id+'::__header__']:{totalMarksOverride:50},
  [paper.id+'::'+paper.questions[0].id]:{lineCount:4}}),
 rawTemplateMapJson:JSON.stringify({[paper.id]:'scholar-spark'}),
 displayedTemplateId:'scholar-spark',
 displayedOverlays:{__header__:{totalMarksOverride:50},[paper.questions[0].id]:{lineCount:4}},
 ...extra
})
test('all nine original V2 source objects capture and verify WITHOUT altering teacher data or inventing overlays',()=>{
 assert.equal(papers.length,9)
 for(const paper of papers){
  const before=JSON.stringify(paper)
  const opts=args(paper,{rawOverlayJson:null,rawTemplateMapJson:null,displayedOverlays:{},
   displayedTemplateId:getDefaultEarlyYearsTemplateId(paper.classStage)})
  const bundle=captureEarlyYearsReferenceBaseline(opts)
  assert.equal(bundle.identity.paperId,paper.id)
  assert.deepEqual(bundle.teacherSource,paper)
  assert.equal(bundle.audit.overlayEntries,0)
  assert.equal(bundle.approval.status,'DATA_CAPTURE_ONLY')
  assert.equal(bundle.approval.renderCutoverAllowed,false)
  assert.equal(bundle.approval.visualEvidence,'SCREENSHOT_AND_A4_PDF_PENDING')
  assert.equal(verifyEarlyYearsReferenceBaseline(bundle).valid,true)
  assert.equal(JSON.stringify(paper),before)
  assert.equal(compareEarlyYearsReferenceBaseline(bundle,opts).matches,true)
 }
})
test('captures selected paper header/question edits ONLY; preserves unknown orphan overlay with explicit diagnostic',()=>{
 const current=args(source)
 const overlays=JSON.parse(current.rawOverlayJson)
 overlays['ey-other-urdu-2026::qX']={marksOverride:999}
 overlays[source.id+'::old-deleted-question']={contentOverride:'keep unknown teacher edit'}
 const bundle=captureEarlyYearsReferenceBaseline({...current,rawOverlayJson:JSON.stringify(overlays),
  displayedOverlays:{...current.displayedOverlays,'old-deleted-question':{contentOverride:'keep unknown teacher edit'}}})
 assert.equal(bundle.overlays.__header__.totalMarksOverride,50)
 assert.equal(bundle.overlays[source.questions[0].id].lineCount,4)
 assert.equal(bundle.overlays['old-deleted-question'].contentOverride,'keep unknown teacher edit')
 assert.deepEqual(bundle.audit.orphanOverlayKeysPreserved,['old-deleted-question'])
 assert.equal(bundle.overlays.qX,undefined)
 assert.equal(verifyEarlyYearsReferenceBaseline(bundle).valid,true)
})
test('template map captures RAW legacy selected style and rejects displayed/default mismatch',()=>{
 const opts=args(source)
 const base=captureEarlyYearsReferenceBaseline(opts)
 assert.equal(base.template.storedRaw,'scholar-spark')
 assert.equal(base.template.resolvedId,'scholar-spark')
 assert.equal(base.template.storageScope,'LEGACY_UNSCOPED_LOCAL_BROWSER_MAP')
 assert.equal(base.audit.templateMapKeyIsUnscoped,true)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,displayedTemplateId:'sky-adventure'}),/template differs/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,rawTemplateMapJson:'{broken'}),/corrupted/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,rawTemplateMapJson:'[]'}),/object/)
})
test('stale, unsaved in-memory edit and malformed overlay storage fail closed',()=>{
 const opts=args(source)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,explicitAcknowledgement:false}),/acknowledgement/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,tenantScope:'public'}),/signed-in/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,displayedOverlays:{}}),/PERSISTED/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,rawOverlayJson:'{broken'}),/corrupted/)
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,rawOverlayJson:'[]'}),/object/)
 const wrongPaper={...clone(source),questions:[...source.questions,{id:'fake',marks:100}]}
 assert.throws(()=>captureEarlyYearsReferenceBaseline({...opts,paper:wrongPaper}),/authoritative source/)
})
test('session-only uploaded sketch bytes are INCLUDED and verified, builtin IDs have NO replicated data',()=>{
 const asset=registerSessionSketch({id:'user.upload.phase3c.verified',name:'Testing Asset',
  source:'USER_UPLOAD',mimeType:'image/svg+xml',
  svgContent:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M1 1 L50 50" stroke="black"/></svg>'})
 const o={[source.id+'::__header__']:{},[source.id+'::'+source.questions[0].id]:{
  sketchOverrides:{first:asset.id,second:'sketch.chicken.v1'},sketchAssetId:asset.id,isSessionAsset:true}}
 const selected={__header__:{},[source.questions[0].id]:o[source.id+'::'+source.questions[0].id]}
 const opts=args(source,{rawOverlayJson:JSON.stringify(o),displayedOverlays:selected})
 const bundle=captureEarlyYearsReferenceBaseline(opts)
 assert.deepEqual(bundle.sketches.map(x=>x.id),['sketch.chicken.v1',asset.id])
 assert.equal(bundle.sketches[0].snapshot,null)
 assert.equal(bundle.sketches[1].snapshot.svgContent,asset.svgContent)
 assert.equal(bundle.sketches[1].isSession,true)
 assert.equal(bundle.audit.sessionSketchesIncluded,1)
 assert.equal(verifyEarlyYearsReferenceBaseline(bundle).valid,true)
 assert.equal(compareEarlyYearsReferenceBaseline(bundle,opts).matches,true)
 const bad=clone(bundle);bad.sketches[1].snapshot.svgContent='changed'
 assert.throws(()=>verifyEarlyYearsReferenceBaseline(bad),/digest mismatch/)
})
test('missing referenced custom upload or builtin MUST block exact baseline, not silently drop art',()=>{
 const opts=args(source,{rawOverlayJson:JSON.stringify({[source.id+'::'+source.questions[0].id]:
  {isSessionAsset:true,sketchAssetId:'user.upload.lost-after-reload'}}),
  displayedOverlays:{[source.questions[0].id]:{isSessionAsset:true,sketchAssetId:'user.upload.lost-after-reload'}}})
 assert.throws(()=>captureEarlyYearsReferenceBaseline(opts),/unavailable/)
})
test('read-only comparison independently detects overlay/template change and stale editor, with no writes',()=>{
 const opts=args(source),base=captureEarlyYearsReferenceBaseline(opts)
 assert.equal(compareEarlyYearsReferenceBaseline(base,opts).matches,true)
 const more={...opts,rawOverlayJson:JSON.stringify({[source.id+'::__header__']:{totalMarksOverride:70},
  [source.id+'::'+source.questions[0].id]:{lineCount:4}})}
 const overlayCompare=compareEarlyYearsReferenceBaseline(base,more)
 assert.equal(overlayCompare.overlayChanged,true)
 assert.equal(overlayCompare.screenStale,true)
 assert.equal(overlayCompare.writePerformed,false)
 const templateCompare=compareEarlyYearsReferenceBaseline(base,{...opts,
  rawTemplateMapJson:JSON.stringify({[source.id]:'sky-adventure'}),displayedTemplateId:'sky-adventure'})
 assert.equal(templateCompare.templateChanged,true)
 assert.equal(templateCompare.matches,false)
 assert.throws(()=>compareEarlyYearsReferenceBaseline(base,{...opts,tenantScope:'tenant-other'}),/another school/)
})
test('tampered envelope, counterfeit approval, cross-paper snapshot cannot validate',()=>{
 const opts=args(source),base=captureEarlyYearsReferenceBaseline(opts)
 const bad=clone(base);bad.teacherSource.questions[0].marks=999
 assert.throws(()=>verifyEarlyYearsReferenceBaseline(bad),/digest mismatch/)
 const fake=clone(base);fake.approval.serverApproved=true
 assert.throws(()=>verifyEarlyYearsReferenceBaseline(fake),/cannot be upgraded/)
 const mismatched=clone(base);mismatched.integrity.payloadSha256='0'.repeat(64)
 assert.throws(()=>verifyEarlyYearsReferenceBaseline(mismatched),/digest mismatch/)
 assert.throws(()=>compareEarlyYearsReferenceBaseline(base,{...args(papers[1],{
  displayedTemplateId:getDefaultEarlyYearsTemplateId(papers[1].classStage),
  rawTemplateMapJson:null}),tenantScope:scope}),/different Early Years paper/)
})
