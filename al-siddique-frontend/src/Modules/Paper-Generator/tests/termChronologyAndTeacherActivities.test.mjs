import test from 'node:test'
import assert from 'node:assert/strict'
import {compileWeeklyPlan} from '../lessonWeeklyEngine.js'
import {buildTermOverview} from '../termPlanningModel.js'
import {summarizeTermFromOriginalNotes} from '../sourceFaithfulPlanningCopy.js'
const c=(a,b)=>({
 candidate_key:'synthetic-eng',source_subject_label:'English',
 source_submissions:['SYNTHETIC-TEACHER-NOT-A-REAL-SCHOOL-SOURCE'],
 source_detail_records:[{source_id:'SYNTHETIC-TEACHER-NOT-A-REAL-SCHOOL-SOURCE',
 source_excerpt_pieces:[{verbatim:a},{verbatim:b}]}]
})
const source=c(
  '15 October to 21 October\nPage 37 to 40\nUnit 7: Historical example\nRead the assigned text\nComplete the classwork',
  '22 October to 28 October\nPage 41 to 48\nUnit 8: Different example\nComplete homework\nFinish task work\nRevision'
)
const options={start:'2026-10-12',end:'2026-11-10'}
test('Term uses earliest source date and last source date, not unsupported date span',()=>{
 const [row]=buildTermOverview([source],options)
 assert.equal(row.sourceTermStart,'2026-10-15')
 assert.equal(row.sourceTermEnd,'2026-10-28')
 assert.equal(row.pageFrom,'37')
 assert.equal(row.pageTo,'48')
})
test('True teacher activity lines are recovered; Weekly first-topic headline cannot suppress homework',()=>{
 const plan=compileWeeklyPlan(source,options)
 assert.ok(plan.weeks.some(w=>w.teacherText?.includes('Complete homework')))
 assert.ok(plan.weeks.some(w=>w.teacherText?.includes('Finish task work')))
 const [row]=buildTermOverview([source],options)
 assert.match(row.detail,/\bread\b/i)
 assert.match(row.detail,/\bclasswork\b/i)
 assert.match(row.detail,/\bhomework\b/i)
 assert.match(row.detail,/\btasks\b/i)
 assert.ok(!row.detail.includes('Unit 7'))
 assert.ok(!row.detail.includes('Unit 8'))
 assert.ok(!row.detail.includes('15 October to'))
 assert.ok(!row.detail.includes('\n'))
 assert.ok(row.detail.length<210)
 assert.ok(row.sourceWeeklyCoverage.some(w=>w.teacherText.includes('Finish task work')))
})
test('Do not invent textbook exercises or assessments not recorded by teacher',()=>{
 const [row]=buildTermOverview([source],options)
 assert.ok(!row.detail.includes('exercises'))
 assert.ok(!row.detail.toLowerCase().includes('assessment'))
 assert.deepEqual(row.sourceChapterTitles,
  ['Unit 7: Historical example','Unit 8: Different example'])
})
test('Page/chapter-only teacher source yields EMPTY instruction rather than generic fabricated homework',()=>{
 const data=c(
  '15 October to 21 October\nPage 37 to 40\nUnit 7: Historical example',
  '22 October to 28 October\nPage 41 to 48\nUnit 8: Different example')
 const [row]=buildTermOverview([data],options)
 assert.equal(row.detail,'')
 assert.ok(row.warnings.some(w=>w.includes('no explicit')))
 assert.equal(row.pageFrom,'37')
 assert.equal(row.pageTo,'48')
})
test('Reversed page coverage cannot be printed as a fake first-to-last span',()=>{
 const data=c(
  '15 October to 21 October\nPage 60 to 65\nUnit 7: Learning',
  '22 October to 28 October\nPage 11 to 18\nUnit 8: Revision')
 const [row]=buildTermOverview([data],options)
 assert.equal(row.sourcePageFrom,'')
 assert.equal(row.sourcePageTo,'')
 assert.ok(row.warnings.some(w=>w.includes('Page numbering reverses')))
 assert.ok(row.sourceWeeklyCoverage.length>0)
})
test('Source-only Urdu actions stay Urdu and do not add homework that was not assigned',()=>{
 const text=summarizeTermFromOriginalNotes(
  ['کلاس ورک مکمل کریں','سبق پڑھیں','مشق حل کریں'],'Urdu')
 assert.match(text,/کلاس ورک/)
 assert.match(text,/مشق/)
 assert.ok(!text.includes('ہوم ورک'))
 assert.ok(!text.includes('اسسمنٹ'))
})
test('All teacher-assigned work types survive; never discard fifth/sixth instruction',()=>{
 const text=summarizeTermFromOriginalNotes([
  'Read the lesson','Complete classwork','Finish homework','Solve exercise',
  'Complete copy work','Finish task work','Revise work','Learn the lesson',
  'Assessment 2 scheduled by teacher'],'English')
 for(const word of ['read','classwork','homework','exercises','written work','tasks','revise','learn','assessment'])
   assert.match(text,new RegExp(word,'i'))
 assert.ok(text.split('. ').length<=2)
})
test('Explicit NO homework or cancelled test never becomes an assignment',()=>{
 const text=summarizeTermFromOriginalNotes(['Read the lesson','No homework','No test'],'English')
 assert.match(text,/read/i)
 assert.doesNotMatch(text,/homework|assessment/i)
})
