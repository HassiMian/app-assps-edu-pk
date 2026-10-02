// Oct 03 emergency Class 6 Urdu: EXACT existing official pattern, CONTENT ONLY.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname,resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {applyClass6UrduOct03ContentCorrection,CLASS6_URDU_OCT03_ID,
 CLASS6_URDU_OCT03_CONTENT,CLASS6_URDU_OCT03_VERSION,CLASS6_URDU_EXPECTED_REFERENCE_SHA}
 from '../class6UrduOct03ContentHotfix.js'
import {getFinalExamScheduleForPaper} from '../../dateSheetFinalExam2026.js'
const here=dirname(fileURLToPath(import.meta.url))
const seed=JSON.parse(fs.readFileSync(resolve(here,'../seed-data/official-first-term-2026-v13.json'),'utf8'))
const ref=seed.papers.find(p=>p.id===CLASS6_URDU_OCT03_ID)
const clone=x=>JSON.parse(JSON.stringify(x))
const make=()=>({savedPapers:seed.papers.map(clone),seedInfo:{},unrelated:'preserved'})
const copyContent=p=>p.official_section.map(s=>s.content)
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex')
test('exact 3 October original official paper exists once, locked SHA, 11 native sections',()=>{
 assert.equal(seed.papers.filter(p=>p.id===CLASS6_URDU_OCT03_ID).length,1)
 assert.equal(ref.documentFormat,'pts-native-v13')
 assert.equal(ref.sourceContentSha256,CLASS6_URDU_EXPECTED_REFERENCE_SHA)
 assert.equal(ref.config.totalMarks,75)
 assert.equal(ref.config.language,'urdu')
 assert.equal(ref.official_section.length,11)
 assert.equal(CLASS6_URDU_OCT03_CONTENT.length,11)
 const schedule=getFinalExamScheduleForPaper('6','Urdu')
 assert.equal(schedule.date,'2026-10-03')
})
test('content replacement only; all original native section settings and paper header retained',()=>{
 const original=make(),target=clone(original.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID))
 const out=applyClass6UrduOct03ContentCorrection(original,seed)
 const actual=out.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID)
 assert.notEqual(out,original)
 assert.equal(actual.teacherContentCorrection.version,CLASS6_URDU_OCT03_VERSION)
 assert.deepEqual(copyContent(actual),CLASS6_URDU_OCT03_CONTENT)
 assert.deepEqual(actual.selectedQuestions.official_section.questions.map(s=>s.content),CLASS6_URDU_OCT03_CONTENT)
 assert.deepEqual(actual.config,target.config)
 assert.deepEqual(actual.editorSettings,target.editorSettings)
 for(const [i,section] of actual.official_section.entries()){
  const {content,...before}=target.official_section[i]
  const {content:afterContent,...after}=section
  assert.deepEqual(after,before,'native section geometry/headings/marks unchanged: '+i)
  assert.equal(afterContent,CLASS6_URDU_OCT03_CONTENT[i])
 }
 const {teacherContentCorrection,...safeActual}=actual
 const old=clone(target),now=clone(safeActual)
 old.official_section.forEach((s,i)=>{s.content=now.official_section[i].content})
 old.selectedQuestions.official_section.questions.forEach((s,i)=>{
  s.content=now.selectedQuestions.official_section.questions[i].content})
 assert.deepEqual(now,old,'no other existing native paper fields were changed')
 assert.equal(out.seedInfo.class6UrduOct03Content.originalTargetBackedUp,true)
 assert.deepEqual(out.paperContentHotfixBackups[0].originalPaper,target)
 assert.equal(original.paperContentHotfixBackups,undefined)
})
test('all 42 OTHER original official papers retain exact JSON identity and section data',()=>{
 const original=make()
 const out=applyClass6UrduOct03ContentCorrection(original,seed)
 assert.equal(out.savedPapers.length,original.savedPapers.length)
 for(const paper of original.savedPapers.filter(p=>p.id!==CLASS6_URDU_OCT03_ID))
  assert.deepEqual(out.savedPapers.find(p=>p.id===paper.id),paper)
 assert.deepEqual(seed.papers.find(p=>p.id===CLASS6_URDU_OCT03_ID),ref)
})
test('5 MCQ four options each, five fills, sentence usage, correction, remaining 10 prompts intact',()=>{
 const c=CLASS6_URDU_OCT03_CONTENT
 assert.equal((c[1].match(/(?:^|\n)\d+\./gu)||[]).length,5)
 assert.equal((c[1].match(/(?:^|\s)ا\)/gu)||[]).length,5)
 assert.equal((c[1].match(/(?:^|\s)ب\)/gu)||[]).length,5)
 assert.equal((c[1].match(/(?:^|\s)ج\)/gu)||[]).length,5)
 assert.equal((c[1].match(/(?:^|\s)د\)/gu)||[]).length,5)
 assert.equal((c[2].match(/(?:^|\n)\d+\./gu)||[]).length,5)
 assert.equal((c[4].match(/(?:^|\n)\d+\./gu)||[]).length,5)
 assert.equal((c[7].match(/(?:^|\n)\d+\./gu)||[]).length,5)
 assert.match(c[1],/میثاقِ مدینہ/u)
 assert.match(c[1],/میر باقر علی/u)
 assert.match(c[2],/پولیو/u)
 assert.match(c[4],/حصہ ب - انشائیہ/u)
 assert.match(c[7],/مزدوروں/u)
})
test('current 75-point header and teacher-entered 79-point allocations are left unchanged, not concealed',()=>{
 assert.deepEqual(ref.official_section.map(x=>Number(x.marks)),[0,5,12,12,5,5,5,10,5,10,10])
 const out=applyClass6UrduOct03ContentCorrection(make(),seed)
 const x=out.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID)
 assert.equal(x.config.totalMarks,75)
 assert.equal(x.official_section.reduce((n,s)=>n+Number(s.marks),0),79)
 assert.equal(x.teacherContentCorrection.marksMismatchPendingPrincipalDecision,true)
})
test('idempotent reload; source drift or custom working copy blocks automatic overwrite',()=>{
 const first=applyClass6UrduOct03ContentCorrection(make(),seed)
 assert.equal(applyClass6UrduOct03ContentCorrection(first,seed),first)
 for(const mutate of [
  p=>{p.sourceContentSha256='bad-source'},
  p=>{p.official_section[1].heading='Principal custom heading'},
  p=>{p.official_section[1].content='Principal custom question'},
  p=>{p.paperSystem={workingCopy:{important:'keep'}}},
  p=>{p.canonicalWorkingDraft={payload:{question:'keep'}}},
 ]){
  const store=make()
  mutate(store.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID))
  assert.equal(applyClass6UrduOct03ContentCorrection(store,seed),store)
 }
 const badReference=clone(seed)
 badReference.papers.find(p=>p.id===CLASS6_URDU_OCT03_ID).sourceContentSha256='changed'
 const store=make()
 assert.equal(applyClass6UrduOct03ContentCorrection(store,badReference),store)
})

test('real native V13 MCQ parser renders exactly five Urdu questions with all four options intact',async()=>{
 const {parseMcqRows,inferOfficialSectionKind,splitContentWithMarkers}
  =await import('../officialSectionSemantics.js')
 const out=applyClass6UrduOct03ContentCorrection(make(),seed)
 const s=out.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID).official_section
 assert.equal(inferOfficialSectionKind(s[1]),'mcq')
 const rows=parseMcqRows(s[1].content)
 assert.equal(rows.length,5)
 rows.forEach((row,index)=>{
  assert.equal(String(row.number),String(index+1))
  assert.equal(row.options.length,4,'question '+(index+1))
  assert.deepEqual(row.options.map(o=>o.label),['ا','ب','ج','د'])
  assert.ok(row.options.every(o=>o.text.trim().length>0))
 })
 assert.deepEqual(splitContentWithMarkers(s[0].content).map(x=>x.type),['marker'])
 assert.deepEqual(splitContentWithMarkers(s[4].content).map(x=>x.type),['content','marker'])
 assert.equal(s[8].content,'')
 assert.equal(s[9].content,'')
 assert.equal(s[10].content,'')
 assert.match(s[8].heading,/اسم کی تعریف/u)
 assert.match(s[9].heading,/بیماری/u)
 assert.match(s[10].heading,/علم کے فائدے/u)
})

test('existing guarded canonical route imports corrected Class 6 Urdu content without stale Q1',async()=>{
 const {resolvePaperEditorRoute,isPristineOfficialV13Paper}
  =await import('../PaperEditor/editorV2/canonicalRouteGuards.js')
 const out=applyClass6UrduOct03ContentCorrection(make(),seed)
 const paper=out.savedPapers.find(p=>p.id===CLASS6_URDU_OCT03_ID)
 assert.equal(isPristineOfficialV13Paper(paper),false)
 const route=resolvePaperEditorRoute(paper)
 assert.equal(route.route,'CANONICAL_V2',route.reason)
 const canonical=route.resolvedPaper
 const text=JSON.stringify(canonical.sections)
 assert.match(text,/مذہبی رواداری/u)
 assert.match(text,/میر باقر علی/u)
 assert.match(text,/پولیو/u)
 assert.match(text,/مزدوروں/u)
 assert.equal(canonical.metadata.classLevel,'6')
 assert.equal(canonical.metadata.subject,'Urdu')
 assert.equal(canonical.authority.authoritativePaperTotal,75)
})

test('canonical original vs corrected paper preserves same 11 sections, node structure and presentation',async()=>{
 const {resolvePaperEditorRoute}=await import('../PaperEditor/editorV2/canonicalRouteGuards.js')
 const before=resolvePaperEditorRoute(ref)
 const fixed=applyClass6UrduOct03ContentCorrection(make(),seed).savedPapers
  .find(p=>p.id===CLASS6_URDU_OCT03_ID)
 const after=resolvePaperEditorRoute(fixed)
 assert.equal(before.route,'CANONICAL_V2')
 assert.equal(after.route,'CANONICAL_V2')
 const a=before.resolvedPaper,b=after.resolvedPaper
 assert.equal(a.sections.length,11)
 assert.equal(b.sections.length,11)
 assert.deepEqual(a.sections.map(s=>s.nodes.map(n=>n.type)),
  b.sections.map(s=>s.nodes.map(n=>n.type)),
  'Original canonical node/question types must remain identical')
 assert.deepEqual(a.sections.map(s=>s.sectionIndex),b.sections.map(s=>s.sectionIndex))
 assert.deepEqual(a.sections.slice(1).map(s=>s.authoritativeSectionTotal),
  b.sections.slice(1).map(s=>s.authoritativeSectionTotal),
  'all 10 displayed questions retain their original marks; section marker is zero-mark')
 assert.deepEqual(a.presentation,b.presentation)
 assert.deepEqual(a.metadata,b.metadata)
 assert.match(JSON.stringify(b.sections[1].nodes.map(n=>n.stemText)),/مذہبی رواداری/u)
})
