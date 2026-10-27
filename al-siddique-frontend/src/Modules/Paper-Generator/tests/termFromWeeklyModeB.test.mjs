import test from 'node:test'
import assert from 'node:assert/strict'
import {buildTermOverview} from '../termPlanningModel.js'
import {compileWeeklyPlan} from '../lessonWeeklyEngine.js'
import {improveWeeklyStatement,summarizeTermFromOriginalNotes} from '../sourceFaithfulPlanningCopy.js'
const candidate={
 candidate_key:'fixture-English',source_subject_label:'English',
 source_submissions:['SYNTHETIC-ONLY'],
 source_detail_records:[{source_id:'SYNTHETIC-ONLY',source_excerpt_pieces:[
  {verbatim:'15 October to 21 October\nPage 37 to 40\nUnit 7: Formation of clouds\nComplete and classwork'},
  {verbatim:'22 October to 28 October\nPage 41 to 48\nUnit 8: Condensation\nComplete the classwork and revise the assigned material'}
 ]}]
}
const options={start:'2026-10-15',end:'2026-10-28'}
test('MODE B: Term is derived from all matching Weekly source weeks and merges exact page endpoints',()=>{
 const week=compileWeeklyPlan(candidate,options)
 const [term]=buildTermOverview([candidate],options)
 assert.equal(term.pageFrom,'37')
 assert.equal(term.pageTo,'48')
 assert.equal(term.sourcePageFrom,'37')
 assert.equal(term.sourcePageTo,'48')
 assert.ok(term.sourceWeeklyCoverage.length>=2)
 assert.ok(term.sourceWeeklyCoverage.some(w=>w.pageFrom==='37'))
 assert.ok(term.sourceWeeklyCoverage.some(w=>w.pageTo==='48'))
 assert.ok(week.weeks.length>=2)
})
test('MODE B: source teacher-given units preserve their actual numbers and full names',()=>{
 const [term]=buildTermOverview([candidate],options)
 assert.deepEqual(term.sourceChapterTitles,
   ['Unit 7: Formation of clouds','Unit 8: Condensation'])
 assert.ok(term.originalTeacherNotes.some(t=>t.includes('Formation of clouds')))
 assert.ok(term.originalTeacherNotes.some(t=>t.includes('Condensation')))
 assert.ok(!term.sourceChapterTitles.some(t=>t.includes('invented')))
})
test('MODE B: Term copy is a short synthesis NOT a list of full Weekly statements',()=>{
 const [term]=buildTermOverview([candidate],options)
 assert.ok(term.detail.length>12&&term.detail.length<=200)
 assert.ok(!term.detail.includes('22 October to 28 October'))
 assert.ok(!term.detail.includes('Unit 7'))
 assert.ok(!term.detail.includes('Unit 8'))
 assert.ok(!term.detail.includes('\n'))
 assert.ok(!term.detail.includes('Condensation'))
})
test('MODE B: exact teacher pages and source text survive a manual teaching statement edit',()=>{
 const [term]=buildTermOverview([candidate],{...options,edits:{'fixture-English':{
  detail:'Complete the assigned classwork and related exercises neatly.',
  pageFrom:'5',pageTo:'999'
 }}})
 assert.equal(term.detail,'Complete the assigned classwork and related exercises neatly.')
 assert.equal(term.pageFrom,'37')
 assert.equal(term.pageTo,'48')
 assert.ok(term.originalTeacherNotes.some(t=>t.includes('Unit 7')))
})
test('Weekly corrections never invent pages, chapter names or assessment dates',()=>{
 const raw='Page 37-40 — Unit 7: Formation of clouds. Assessment 2 date: 17 October.'
 assert.equal(improveWeeklyStatement(raw,'English'),raw)
 assert.equal(improveWeeklyStatement('Complete and classwork','English'),
  'Complete the assigned classwork neatly and accurately.')
})
test('No weekly original source means NO fabricated Term pages, chapters, dates or text',()=>{
 const [term]=buildTermOverview([{candidate_key:'empty',source_subject_label:'Science',source_detail_records:[]}],options)
 assert.equal(term.pageFrom,'')
 assert.equal(term.pageTo,'')
 assert.equal(term.detail,'')
 assert.deepEqual(term.sourceChapterTitles,[])
 assert.deepEqual(term.sourceWeeklyCoverage,[])
})
