import test from 'node:test'
import assert from 'node:assert/strict'
import {compileWeeklyPlan,CLASS_INCHARGES,shortDiary} from '../lessonWeeklyEngine.js'
import {termWeeks,planWeekRows,shortSourceStatement} from '../weeklyNotebookModel.js'
const candidate=(klass,subject,verbatim)=>({
 proposed_class_level:klass,source_subject_label:subject,
 source_submissions:['WA14-L200'],source_detail_records:[{
 source_id:'WA14-L200',source_excerpt_pieces:[{verbatim}]
 }]
})
test('October dates and textbook page numbers stay chronological',()=>{
 const c=candidate('Starter','English','English\n15 October to 17\nPage# 22 to 23\n19 to 24\nPage# 24 to 26\n26 to 31\nPage# 27 to 29\nNovember\n2 to 7\nPage# 30 to 32')
 const a=compileWeeklyPlan(c).weeks
 assert.equal(a[0].start,'2026-10-15')
 assert.equal(a[0].end,'2026-10-17')
 assert.equal(a[0].page.from,22)
 assert.equal(a[1].start,'2026-10-19')
 assert.equal(a[1].page.to,26)
 assert.ok(a.some(w=>w.start==='2026-11-02'))
})
test('Class Four English preserves exact chapter and page but NEVER invents assessment dates',()=>{
 const c=candidate('4','English','15 Oct to 15 Nov\nUnit No #07 + Verb Pg 29-32 + Assessment + Application\n15 Nov to 15 Dec\nUnit No 8 and 9 + Pronoun + Assessment + Letter - Birthday Present')
 const w=compileWeeklyPlan(c).weeks
 assert.ok(w.some(x=>x.assessment?.origin==='SOURCE_UNDATED_ASSESSMENT'))
 assert.ok(!w.some(x=>x.assessment?.date==='2026-11-14'||x.assessment?.date==='2026-12-14'))
 assert.equal(w[0].page.from,29)
 assert.ok(w[0].statement.includes('Unit No'))
 assert.ok(!w.some(x=>x.assessment?.origin==='ORIGINAL_SOURCE'))
})
test('Urdu numeric ranges are source-preserved and isolated from original text',()=>{
 const original='1) 10 اکتوبر تا 16 اکتوبر - صفحہ نمبر 79 تا 82\nجائزہ - 27 اکتوبر\n2) 28 اکتوبر تا 2 نومبر - صفحہ نمبر 88 تا 91'
 const c=candidate('4','Islamiyat',original)
 const result=compileWeeklyPlan(c)
 assert.ok(result.weeks.some(x=>x.page?.from===79&&x.page.to===82))
 assert.ok(result.weeks.some(x=>x.assessment?.date==='2026-10-27'))
 assert.equal(c.source_detail_records[0].source_excerpt_pieces[0].verbatim,original)
 assert.match(shortDiary('Islamiyat',{from:79,to:82}),/صفحہ نمبر 79–82/)
})
test('Class Two and Three source lacking dates remains BLOCKED without weekly allocations',()=>{
 const c=candidate('3','English-A','English-A\nUnit no:7 Seasons\nTo\nUnit no :9 All about rules')
 const out=compileWeeklyPlan(c,{start:'2026-10-15',end:'2026-11-15'})
 assert.equal(out.mode,'SOURCE_UNDATED_REVIEW')
 assert.equal(out.weeks.length,0)
 assert.ok(out.warnings.some(x=>x.includes('No class allocations')))
})
test('Class-One original image cannot invent academic transcription',()=>{
 const out=compileWeeklyPlan({proposed_class_level:'1',source_subject_label:'English-A',source_detail_records:[],source_submissions:['WA14-IMG-C1']})
 assert.equal(out.mode,'IMAGE_REVIEW_REQUIRED')
 assert.equal(out.weeks.length,0)
})
test('teaching weeks never include Sunday and fit 1,2,3 class print settings',()=>{
 const w=termWeeks('2026-10-15','2026-11-16')
 assert.ok(w.length>=5)
 assert.ok(w.every(x=>new Date(x.start+'T00:00:00Z').getUTCDay()!==0))
 assert.deepEqual(w[0],{index:1,start:'2026-10-15',end:'2026-10-17'})
})
test('Principal-supplied classroom names do not grant auth ownership',()=>{
 assert.deepEqual(CLASS_INCHARGES.Mover,['Miss Laiba','Miss Abida'])
 assert.deepEqual(CLASS_INCHARGES.Starter,['Miss Mubeen'])
 assert.deepEqual(CLASS_INCHARGES.Flyer,['Miss Mubeen'])
 assert.deepEqual(CLASS_INCHARGES.One,['Miss Amna'])
 assert.deepEqual(CLASS_INCHARGES.Two,['Miss Aasia'])
 assert.deepEqual(CLASS_INCHARGES.Three,['Miss Alisha'])
})
test('short source statements never silently claim academic approval',()=>{
 assert.equal(shortSourceStatement('Unit 7 + Verb + Application',1,3),'Verb')
 const c=candidate('4','English','15 Oct to 15 Nov\nUnit 7 + Verb + Assessment + Application')
 const plan=planWeekRows([c],'Four',termWeeks()[0])
 assert.equal(plan.rows.length,1)
 assert.equal(plan.rows[0].sourceStatus,'SOURCE DATED')
 assert.ok(!JSON.stringify(plan.rows).includes('APPROVED_BY_VERIFIED'))
})
