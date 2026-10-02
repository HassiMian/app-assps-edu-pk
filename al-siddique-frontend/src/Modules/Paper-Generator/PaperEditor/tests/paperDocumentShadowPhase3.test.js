// Phase 3 golden read-only contract: pinned parent snapshots from ec29eda, NOT replacement layouts.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {createPaperDocumentShadow,restoreSourcePaperUnchanged,verifySourcePaperUnchanged,
 assertNativePresentationContract,SOURCE_NATIVE_RENDER_ONLY} from '../core/PaperDocumentShadow.js'
import {createBlankPaperDraft} from '../../paperCreationDraft.js'
import {createUserEarlyYearsPaper,addUserActivity} from '../earlyYears/earlyYearsUserPapers.js'
import {buildRecoverySavedPapers} from '../../seed-data/examNightRecoveryAdapter.js'
const here=path.dirname(fileURLToPath(import.meta.url))
const read=p=>JSON.parse(fs.readFileSync(path.resolve(here,p),'utf8'))
const golden=read('./paperDocumentGoldenBaselines.json')
const sources={
 official43:read('../../seed-data/official-first-term-2026-v13.json').papers,
 earlyYears9:read('../earlyYears/data/early-years-first-term-2026-source-v2.json').papers,
 recovery6:read('../../seed-data/exam-night-recovery-v3.json').papers,
 canonical43:read('../migration/data/canonical-first-term-2026-paperdoc-v2-schema3.json').documents,
}
const digest=obj=>createHash('sha256').update(JSON.stringify(obj)).digest('hex')
test('golden corpus manifest pins EXACT all 101 original repository paper objects',()=>{
 assert.equal(golden.lockedParentCommit,'ec29edacc93b5bf7e347db70bca2e2dd6a7f9ffb')
 let total=0
 for(const [name,items] of Object.entries(sources)){
  const expected=golden.corpora[name]
  assert.equal(items.length,expected.count,name+' count changed')
  assert.equal(digest(items),expected.aggregateSha256,name+' original corpus changed')
  assert.equal(expected.entries.length,items.length)
  items.forEach((p,index)=>{
   assert.equal(p.id,expected.entries[index].id,name+': source ID/order changed')
   assert.equal(digest(p),expected.entries[index].sha256,p.id+': academic/presentation source changed')
  })
  total+=items.length
 }
 assert.equal(total,101)
})
test('ALL 101 paper source objects convert losslessly, preserve SHA, refuse cutover, and have no write side effects',()=>{
 let tested=0
 const routes=new Set()
 for(const [group,items] of Object.entries(sources))for(const [index,source] of items.entries()){
  const originalJson=JSON.stringify(source)
  const shadow=createPaperDocumentShadow(source)
  assert.equal(shadow.sourceHashSha256,golden.corpora[group].entries[index].sha256,source.id)
  assert.equal(shadow.appearance.renderPolicy,SOURCE_NATIVE_RENDER_ONLY,source.id)
  assert.equal(shadow.appearance.cutoverReady,false,source.id)
  assert.equal(shadow.protection.sourceReadOnly,true,source.id)
  assert.ok(shadow.appearance.renderRoute,source.id)
  assert.equal(verifySourcePaperUnchanged(source,shadow),true,source.id)
  assert.deepEqual(restoreSourcePaperUnchanged(shadow),source,source.id)
  assert.equal(JSON.stringify(source),originalJson,'Source input mutated: '+source.id)
  assert.equal(JSON.stringify(shadow.sourceSnapshot),originalJson,'Original content/presentation not retained: '+source.id)
  assert.equal(assertNativePresentationContract(source,shadow).cutoverReady,false)
  assert.equal(shadow.sections.length,group==='earlyYears9'?1:source.sections?.length??source.official_section?.length??0)
  routes.add(shadow.appearance.renderRoute)
  tested++
 }
 assert.equal(tested,101)
 assert.ok(routes.size>=3)
})
test('Class 8 Mathematics V13 keeps EVERY native section, heading/content, marks and editor settings',()=>{
 const source=sources.official43.find(p=>String(p.id).includes('class-8-mathematics'))
 assert.ok(source,'Class 8 Mathematics V13 teacher source must exist')
 const shadow=createPaperDocumentShadow(source)
 assert.equal(shadow.metadata.language,source.config.language)
 assert.equal(shadow.header.declared,source.config.totalMarks)
 assert.deepEqual(shadow.appearance.editorSettings,source.editorSettings)
 assert.deepEqual(shadow.sections.map(s=>s.sourceFields),source.official_section)
 assert.deepEqual(shadow.sections.map(s=>s.heading),source.official_section.map(s=>s.heading))
 assert.deepEqual(shadow.sections.map(s=>s.items[0].content),source.official_section.map(s=>s.content))
 assert.equal(shadow.appearance.renderRoute,'PTSPaperGenerator/OfficialSectionRenderer')
 assert.equal(shadow.appearance.cutoverReady,false)
})
test('Class 8 Urdu lives in the separate recovery seed: preserve EXACT source in native saved view',()=>{
 const source=sources.recovery6.find(p=>String(p.id).includes('class-8-urdu'))
 assert.ok(source,'Class 8 Urdu recovery teacher source must exist')
 const saved=buildRecoverySavedPapers({package:'fidelity-only',papers:[source]})[0]
 const shadow=createPaperDocumentShadow(saved)
 assert.equal(shadow.sourceType,'RECOVERY_SAVED_V13')
 assert.equal(shadow.metadata.language,'urdu')
 assert.equal(shadow.header.declared,saved.config.totalMarks)
 assert.deepEqual(shadow.sections.map(s=>s.sourceFields),saved.official_section)
 assert.deepEqual(shadow.appearance.editorSettings,saved.editorSettings)
 assert.equal(shadow.appearance.cutoverReady,false)
})
test('nine Early Years source papers preserve presentation type and every native content shape',()=>{
 let conflicts=0
 for(const source of sources.earlyYears9){
  const shadow=createPaperDocumentShadow(source)
  assert.equal(shadow.sections[0].items.length,source.questions.length,source.id)
  assert.equal(shadow.header.declared,source.totalMarksSource.headerTotal,source.id)
  assert.deepEqual(shadow.sections[0].items.map(q=>q.sourceFields),source.questions,source.id)
  assert.deepEqual(shadow.appearance.earlyYearsPresentation.questionPresentation.map(q=>q.type),
   source.questions.map(q=>q.presentationType),source.id)
  assert.deepEqual(shadow.appearance.earlyYearsPresentation.headerSource,source.headerSource)
  if(source.totalMarksSource.hasConflict){
   assert.ok(shadow.marks.issues.some(i=>i.code==='EXPLICIT_SOURCE_TOTAL_CONFLICT'),source.id)
   conflicts++
  }
 }
 assert.ok(conflicts>=1,'Original teacher-header marks conflicts must remain visible')
})
test('raw recovery retains section marks but does NOT invent per-item marks or split native content',()=>{
 for(const source of sources.recovery6){
  const shadow=createPaperDocumentShadow(source)
  assert.equal(shadow.sourceType,'RECOVERY_RAW_SEED')
  assert.deepEqual(shadow.sections.map(s=>s.sourceFields),source.sections)
  for(const section of shadow.sections)for(const item of section.items){
   assert.equal(item.marks,null)
   assert.equal(item.marksEvidence,'UNSTATED')
  }
  assert.equal(shadow.marks.headerMarks,source.totalMarks)
 }
})
test('recovery saved V13 keeps native heading, content, styles and exact source, not raw recovery view',()=>{
 const generated=buildRecoverySavedPapers({package:'locked-recovery-test',papers:[sources.recovery6[0]]})[0]
 const original=JSON.stringify(generated)
 const shadow=createPaperDocumentShadow(generated)
 assert.equal(shadow.sourceType,'RECOVERY_SAVED_V13')
 assert.equal(shadow.appearance.renderRoute,'PTSPaperGenerator/OfficialSectionRenderer')
 assert.deepEqual(shadow.sections.map(s=>s.sourceFields),generated.official_section)
 assert.equal(JSON.stringify(restoreSourcePaperUnchanged(shadow)),original)
})
test('blank self-service paper stays EMPTY and is NOT filled by sample/default content',()=>{
 const source=createBlankPaperDraft({classLevel:'3',subjectName:'Science',targetMarks:''})
 const shadow=createPaperDocumentShadow(source)
 assert.equal(shadow.sections.length,0)
 assert.equal(shadow.marks.calculatedMarks,null)
 assert.equal(shadow.marks.approvalBlocked,true)
 assert.equal(JSON.stringify(restoreSourcePaperUnchanged(shadow)),JSON.stringify(source))
})
test('independent Early Years self-service user draft retains actual activity layout and optional target',()=>{
 let source=createUserEarlyYearsPaper({classStage:'starter',subject:'English',targetMarks:''})
 source=addUserActivity(source,'TraceGlyphGrid',{text:'A B C',marks:10,instruction:'Trace.'})
 const shadow=createPaperDocumentShadow(source)
 assert.equal(shadow.sourceType,'EARLY_YEARS_USER')
 assert.equal(shadow.header.declared,null)
 assert.equal(shadow.marks.calculatedMarks,10)
 assert.deepEqual(shadow.sections[0].items[0].sourceFields,source.questions[0])
 assert.equal(shadow.appearance.earlyYearsPresentation.questionPresentation[0].type,'TraceGlyphGrid')
 assert.equal(verifySourcePaperUnchanged(source,shadow),true)
})
test('explicit source conflict is flagged, not reconciled or marked approved',()=>{
 const src={documentFormat:'pts-native-v13',id:'local-untouched',config:{classLevel:'6',subject:'Math',language:'english',totalMarks:60},
  official_section:[{id:'a',heading:'Q1',content:'Question exactly as entered',marks:20},
   {id:'b',heading:'Q2',content:'Question exactly as entered',marks:30}]}
 const before=JSON.stringify(src),shadow=createPaperDocumentShadow(src)
 assert.equal(shadow.marks.calculatedMarks,50)
 assert.equal(shadow.marks.headerMarks,60)
 assert.equal(shadow.marks.approvalBlocked,true)
 assert.ok(shadow.marks.issues.some(i=>i.code==='EXPLICIT_SOURCE_TOTAL_CONFLICT'))
 assert.equal(src.config.totalMarks,60)
 assert.equal(JSON.stringify(src),before)
})
test('missing section marks remain unresolved and zero mark is not confused with missing',()=>{
 const src={documentFormat:'pts-native-v13',config:{totalMarks:0,subject:'Science'},
  official_section:[{id:'a',marks:0,heading:'Header only',content:''},{id:'b',heading:'Question',content:'Answer.'}]}
 const shadow=createPaperDocumentShadow(src)
 assert.equal(shadow.marks.sections[0].origin,'EXPLICIT_SECTION')
 assert.equal(shadow.marks.sections[0].knownMarks,0)
 assert.equal(shadow.marks.sections[1].knownMarks,null)
 assert.equal(shadow.marks.calculatedMarks,null)
 assert.equal(shadow.marks.approvalBlocked,true)
})
test('source tampering or renderer-cutover override is detected fail-closed',()=>{
 const source=sources.official43[0],shadow=createPaperDocumentShadow(source)
 const altered={...shadow,sourceSnapshot:JSON.parse(JSON.stringify(shadow.sourceSnapshot))}
 altered.sourceSnapshot.config.totalMarks=999
 assert.equal(verifySourcePaperUnchanged(source,altered),false)
 assert.throws(()=>restoreSourcePaperUnchanged(altered),/Protected source snapshot changed/)
 const switchAttempt={...shadow,appearance:{...shadow.appearance,cutoverReady:true}}
 assert.throws(()=>assertNativePresentationContract(source,switchAttempt),/presentation projection changed/)
 const styleAttempt={...shadow,appearance:{...shadow.appearance,editorSettings:{...shadow.appearance.editorSettings,fontSize:24}}}
 assert.throws(()=>assertNativePresentationContract(source,styleAttempt),/presentation projection changed/)
 const originalMutation={...source,editorSettings:{...source.editorSettings,fontSize:24}}
 assert.throws(()=>assertNativePresentationContract(originalMutation,shadow),/source changed/)
})
test('a deliberately unsupported source fails closed, no synthetic fake paper',()=>{
 assert.throws(()=>createPaperDocumentShadow(null),/individual source/)
 assert.throws(()=>createPaperDocumentShadow({randomProperty:'unsupported'}),/Unrecognized source type/)
})
