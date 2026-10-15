import test from 'node:test'
import assert from 'node:assert/strict'
import {buildDailyServerPayload,dailyIdentity} from '../dailyServerPayload.js'
const digest='a'.repeat(64)
const base={
 klass:'Four',section:'Blue',date:'2026-10-15',sourceZipSha256:digest,
 design:{subjectNameSize:17,subjectNameBold:false,cardsPerPage:2},
 rows:[{id:'source-english-1',subject:'English',task:'Learn exercise: pages 31–33.'},
       {id:'source-urdu-1',subject:'Urdu',task:'Urdu lesson for the selected date'}]
}
test('Daily Plan has separate class/section/day and is PRIVATE, never a Diary mutation',()=>{
 const x=buildDailyServerPayload(base)
 assert.equal(x.planningScope,'daily')
 assert.equal(x.date,base.date)
 assert.equal(x.endDate,base.date)
 assert.equal(x.plannerDocument.provenance.marker,'ASSPS_DAILY_LESSON_NOTEBOOK_V1')
 assert.equal(x.plannerDocument.provenance.academicPublication,'BLOCKED')
 assert.equal(x.plannerDocument.provenance.dailyKey,dailyIdentity('Four','Blue',base.date))
 assert.ok(!Object.hasOwn(x,'sentToPortal'))
 assert.equal(x.plannerDocument.subjects.length,2)
 assert.equal(x.plannerDocument.layoutSettings.subjectNameBold,false)
 assert.ok(!JSON.stringify(x).includes('QA Student'))
})
test('Existing Save Day revision updates only the exact Day identity',()=>{
 const created=buildDailyServerPayload(base)
 const existing={...created,id:'lp_day_123',serverRevision:7}
 const revised=buildDailyServerPayload({...base,existing,rows:[{...base.rows[0],task:'Revised work.'}]})
 assert.equal(revised.id,'lp_day_123')
 assert.equal(revised.serverRevision,7)
 assert.equal(revised.plannerDocument.subjects[0].lessons[0].title,'Revised work.')
 assert.throws(()=>buildDailyServerPayload({...base,date:'2026-10-16',existing}),/Refusing/)
})
test('Cannot overwrite weekly marker even if same class and date',()=>{
 const original=buildDailyServerPayload(base)
 const prior={...original,id:'lp_week',serverRevision:2,
  plannerDocument:{...original.plannerDocument,provenance:{
   marker:'ASSPS_WEEKLY_NOTEBOOK_V1',dailyKey:dailyIdentity('Four','Blue',base.date)
  }}}
 assert.throws(()=>buildDailyServerPayload({...base,existing:prior}),/Refusing/)
})
test('Out-of-scope sources and malformed dates fail closed',()=>{
 assert.throws(()=>buildDailyServerPayload({...base,date:'not-a-date'}),/valid day/)
 assert.throws(()=>buildDailyServerPayload({...base,sourceZipSha256:'UNVERIFIED'}),/Verified source/)
 assert.throws(()=>buildDailyServerPayload({...base,rows:[]}),/1–24 subjects/)
 assert.throws(()=>buildDailyServerPayload({...base,rows:[{subject:'Math',task:'Task'}]}),/source identity/)
})
test('A day can store mixed subjects but never stores student roster',()=>{
 const x=buildDailyServerPayload(base)
 assert.equal(x.plannerDocument.provenance.dailyStatementById['source-english-1'],
  'Learn exercise: pages 31–33.')
 assert.equal(x.subject,'Multiple Subjects')
 assert.equal(x.plannerDocument.subjects[1].subject,'Urdu')
})
