import test from 'node:test'
import assert from 'node:assert/strict'
import {compileWeeklyPlan} from '../../al-siddique-frontend/src/Modules/Paper-Generator/lessonWeeklyEngine.js'
import {planWeekRows,termWeeks} from '../../al-siddique-frontend/src/Modules/Paper-Generator/weeklyNotebookModel.js'
import {buildTermOverview,termAssessmentRows} from '../../al-siddique-frontend/src/Modules/Paper-Generator/termPlanningModel.js'
const english={candidate_key:'one-en',source_subject_label:'English',proposed_class_level:'One',source_submissions:['owner-original-1']}
const urdu={candidate_key:'one-ur',source_subject_label:'Urdu A',proposed_class_level:'One',source_submissions:['owner-original-2']}
const review={weeks:[
 {week:1,start:'2026-10-15',end:'2026-10-17',work:{English:'Pg#22:23 Read and complete class work.', 'Urdu A':'صفحہ نمبر 28 تا 30 پڑھیں اور مشق مکمل کریں۔'}},
 {week:2,start:'2026-10-19',end:'2026-10-24',work:{English:'Pages 38–40 Complete exercise.', 'Urdu A':'صفحہ نمبر 50 تا 52 پڑھیں اور یاد کریں۔'}},
]}
test('actual image-transcribed Pg#22:23 page range must preserve both boundaries',()=>{
 const c=compileWeeklyPlan(english,{start:'2026-10-15',end:'2026-10-31',imageReview:review})
 assert.equal(c.weeks[0].page.from,22)
 assert.equal(c.weeks[0].page.to,23)
 assert.match(c.weeks[0].teacherText,/Read and complete class work/)
})
test('Week One compact task does not duplicate raw source or invent assessments',()=>{
 const a=planWeekRows([english],'One',{start:'2026-10-15',end:'2026-10-17'},
 {start:'2026-10-15',end:'2026-10-31',imageReview:review})
 assert.equal(a.rows.length,1)
 assert.equal(a.rows[0].page.from,22)
 assert.equal(a.rows[0].page.to,23)
 assert.match(a.rows[0].task,/Pages 22–23/)
 assert.match(a.rows[0].task,/Read the lesson/)
 assert.equal(a.rows[0].teacherSourceNotes[0],'Pg#22:23 Read and complete class work.')
})
test('Term full source page span and original-language statements match weekly provenance',()=>{
 const rows=buildTermOverview([english,urdu],{start:'2026-10-15',end:'2026-10-31',imageReview:review})
 assert.equal(rows.length,2)
 assert.deepEqual(rows.slice(0,1).map(r=>[r.pageFrom,r.pageTo]),[['22','40']])
 assert.deepEqual(rows.slice(1).map(r=>[r.pageFrom,r.pageTo]),[['28','52']])
 assert.match(rows[1].detail,/صفحہ نمبر 28 تا 52/)
 assert.doesNotMatch(rows[1].detail,/Pages|Read|review test|final exam/i)
 assert.equal(rows[0].originalTeacherNotes.length,2)
})
test('Weekly and Term calendar share October owner dates with max two proposals',()=>{
 const weeks=termWeeks('2026-10-15','2026-12-31')
 const rows=buildTermOverview([english],{start:'2026-10-15',end:'2026-12-31',imageReview:review})
 const calendar=termAssessmentRows(rows,[],{weeks,start:'2026-10-15',end:'2026-12-31'})
 assert.deepEqual(calendar.filter(a=>a.date.startsWith('2026-10')).map(a=>a.date),['2026-10-17','2026-10-24'])
 assert.ok(calendar.filter(a=>a.date.startsWith('2026-11')).length<=2)
 assert.ok(calendar.filter(a=>a.date.startsWith('2026-12')).length<=2)
})
test('Authenticated teacher edits survive regeneration instead of being overwritten',()=>{
 const rows=buildTermOverview([english],{start:'2026-10-15',end:'2026-10-31',imageReview:review,
  edits:{'one-en':{detail:'Owner-approved custom wording.',pageFrom:'22',pageTo:'40'}}})
 assert.equal(rows[0].detail,'Owner-approved custom wording.')
 assert.deepEqual([rows[0].pageFrom,rows[0].pageTo],['22','40'])
})
test('First Term cannot silently copy Second Term source pages',()=>{
 const rows=buildTermOverview([english],{term:'First Term',start:'2026-10-15',end:'2026-10-31',imageReview:review})
 assert.deepEqual([rows[0].pageFrom,rows[0].pageTo],['',''])
 assert.match(rows[0].sourceStatus,/UNSOURCED/)
})
test('source-authoritative term pages reject a conflicting older manual page override',()=>{
 const rows=buildTermOverview([english],{start:'2026-10-15',end:'2026-10-31',imageReview:review,
  edits:{'one-en':{pageFrom:'1',pageTo:'999',detail:'Teacher wording retained.'}}})
 assert.equal(rows[0].pageFrom,'22')
 assert.equal(rows[0].pageTo,'40')
 assert.equal(rows[0].detail,'Teacher wording retained.')
 assert.ok(rows[0].warnings.some(x=>/manual page start differs/.test(x)))
})
test('image TEST only remains assessment date without invented lesson content',()=>{
 const img={weeks:[{week:17,start:'2027-02-08',end:'2027-02-13',work:{English:'FULL REVISION TEST'}}]}
 const c=compileWeeklyPlan(english,{start:'2027-02-08',end:'2027-02-13',imageReview:img})
 assert.equal(c.weeks[0].source,'ORIGINAL_ASSESSMENT_ONLY')
 const w=planWeekRows([english],'One',{start:'2027-02-08',end:'2027-02-13'},
  {start:'2027-02-08',end:'2027-02-13',imageReview:img})
 assert.equal(w.rows.length,1)
 assert.match(w.rows[0].task,/scheduled assessment/)
 assert.doesNotMatch(w.rows[0].task,/FULL REVISION TEST/)
 assert.equal(w.rows[0].assessments[0].date,'2027-02-13')
})
