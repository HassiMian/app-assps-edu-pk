import test from 'node:test'
import assert from 'node:assert/strict'
import {composeTeachingStatement,proposeTwiceMonthlyAssessments} from '../../al-siddique-frontend/src/Modules/Paper-Generator/professionalLessonCopy.js'
import {termWeeks} from '../../al-siddique-frontend/src/Modules/Paper-Generator/weeklyNotebookModel.js'
test('Starter English keeps page range, concise work, no artificial exam prep',()=>{
 const r=composeTeachingStatement({subject:'English',notes:['Page 22-23 read and complete class work','Page 38-40 Complete exercise'],pages:[{from:22,to:23},{from:38,to:40}],scope:'term'})
 assert.equal(r.pageFrom,'22');assert.equal(r.pageTo,'40')
 assert.match(r.statement,/Pages 22–40/);assert.doesNotMatch(r.statement,/final exam|full revision|2027-10/)
})
test('Class One Urdu A prints only Urdu instructions with fixed pages',()=>{
 const r=composeTeachingStatement({subject:'Urdu A',notes:['Full revision','درخواست','Page 28-52'],pages:[{from:28,to:29},{from:50,to:52}]})
 assert.equal(r.statement.includes('صفحہ نمبر 28 تا 52'),true)
 assert.doesNotMatch(r.statement,/full revision|Page|final exam|review test/i)
})
test('Urdu B roman writing topics rendered as Urdu labels',()=>{
 const r=composeTeachingStatement({subject:'Urdu B',notes:['Bimari ki darkhwast','Meri kitab mazmoon'],pages:[]})
 assert.match(r.statement,/بیماری کی درخواست/)
 assert.match(r.statement,/میری کتاب/)
 assert.doesNotMatch(r.statement,/bimari|darkhwast|meri kitab/i)
})
test('English B application and essay stay in English',()=>{
 const r=composeTeachingStatement({subject:'English B',notes:['Sick Leave application','My Book essay']})
 assert.match(r.statement,/Application: Sick Leave/)
 assert.match(r.statement,/Essay: My Book/)
})
test('unit references reflect only sourced chapter numbers',()=>{
 const r=composeTeachingStatement({subject:'Science',notes:['Unit #3 reading','Unit #3 Questions Answers']})
 assert.deepEqual(r.units,[3]);assert.match(r.statement,/Unit #3/)
})
test('unprovided pages are never fabricated',()=>{
 const r=composeTeachingStatement({subject:'Math',notes:['Finish class work']})
 assert.equal(r.pageFrom,'');assert.equal(r.pageTo,'');assert.doesNotMatch(r.statement,/Pages \d/)
})
test('weekly/term dates month twice, October owner days',()=>{
 const weeks=termWeeks('2026-10-15','2026-12-31')
 const a=proposeTwiceMonthlyAssessments({weeks,start:'2026-10-15',end:'2026-12-31'})
 assert.deepEqual(a.filter(x=>x.date.startsWith('2026-10')).map(x=>x.date),['2026-10-17','2026-10-24'])
 assert.ok(['2026-11','2026-12'].every(m=>a.filter(x=>x.date.startsWith(m)).length<=2))
 assert.ok(a.every(x=>x.origin==='SCHOOL_POLICY_PROPOSAL'&&x.academicApproval===false))
})
test('real source dates reduce instead of duplicating monthly proposals',()=>{
 const weeks=termWeeks('2026-10-15','2026-10-31')
 const a=proposeTwiceMonthlyAssessments({weeks,start:'2026-10-15',end:'2026-10-31',existing:[{date:'2026-10-17'}]})
 assert.deepEqual(a.map(x=>x.date),['2026-10-24'])
})
test('invalid dates do not result in proposals',()=>{
 assert.deepEqual(proposeTwiceMonthlyAssessments({weeks:termWeeks('2026-10-15','2026-11-30'),start:'2026-10-40',end:'2026-11-30'}),[])
})
test('Sunday image week-end schedules the preceding teaching day without rewriting week end',()=>{
 const weeks=[{index:1,start:'2026-11-02',end:'2026-11-08'},{index:2,start:'2026-11-09',end:'2026-11-15'},
  {index:3,start:'2026-11-16',end:'2026-11-22'},{index:4,start:'2026-11-23',end:'2026-11-29'}]
 const original=weeks.map(w=>w.end)
 const dates=proposeTwiceMonthlyAssessments({weeks,start:'2026-11-01',end:'2026-11-30'})
 assert.deepEqual(dates.map(x=>x.date),['2026-11-14','2026-11-28'])
 assert.deepEqual(weeks.map(w=>w.end),original)
})

test('Class One verified Science shorthand U3 and U4 is retained',()=>{
 const r=composeTeachingStatement({subject:'Science',notes:['U3 Reading','U3 Q/A','U4 Reading','U4 Q/A']})
 assert.deepEqual(r.units,[3,4])
 assert.match(r.statement,/Units #3, 4/)
 assert.match(r.statement,/questions and answers/i)
})
test('plain words without chapter or unit numbers cannot fabricate a unit',()=>{
 const r=composeTeachingStatement({subject:'Science',notes:['Useful reading','Review the work']})
 assert.deepEqual(r.units,[])
 assert.doesNotMatch(r.statement,/Unit #/)
})
