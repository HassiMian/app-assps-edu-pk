'use strict'
/**
 * Approved 16-Oct ASSPS print-source contract. No production DB writes or
 * employee authorization. Run: node --test ops/release/timetable/approved_timetable_contract.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const fixturePath = path.join(__dirname, '../../../al-siddique-backend/src/domain/ASSPS_APPROVED_TIMETABLE_SOURCE_20261016.json')
const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
const periods = data.allocations.flatMap(x => x.periods)
const find = (className, section = null) => data.allocations.find(x => x.class_name === className && x.section === section)
const minute = v => Number(v.slice(0,2))*60 + Number(v.slice(3,5))
const expectContinuous = bells => {
  bells.forEach((entry, i) => {
    assert.ok(minute(entry.end) > minute(entry.start), entry.label)
    if (i) assert.equal(bells[i-1].end, entry.start, entry.label)
  })
}
test('source document integrity and School 1 boundary are pinned', () => {
  assert.equal(data.school_id, 1)
  assert.equal(data.source_document,'ASSPS_Timetable_Print_Locked_2026-27.pdf')
  assert.equal(data.source_pdf_sha256,'9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4')
  assert.equal(data.academic_session,'2026–27')
})
test('56 exact allocations include Period 5 in all seven cohorts', () => {
  assert.equal(data.allocations.length,7)
  assert.equal(periods.length,56)
  for (const cohort of data.allocations) {
    assert.deepEqual(cohort.periods.map(x=>x.period),[1,2,3,4,5,6,7,8])
    assert.ok(cohort.periods.every(x=>x.subject && x.teacher_display_name))
  }
})
test('regular bells include proper assembly, Period 5 and 25-minute break', () => {
  assert.equal(data.regular_bells.length,10)
  assert.deepEqual(data.regular_bells[0],{label:'Assembly',start:'08:30',end:'08:45'})
  assert.deepEqual(data.regular_bells[5],{label:'Period 5',start:'10:55',end:'11:25'})
  assert.deepEqual(data.regular_bells[7],{label:'Break',start:'11:55',end:'12:20'})
  assert.equal(data.regular_bells.at(-1).end,'13:30')
  expectContinuous(data.regular_bells)
})
test('Friday has eight periods and zero break, finishes at 12:30', () => {
  assert.equal(data.friday_bells.length,9)
  assert.equal(data.friday_bells.filter(x=>x.label.startsWith('Period')).length,8)
  assert.ok(!data.friday_bells.some(x=>x.label==='Break'))
  assert.deepEqual(data.friday_bells[5],{label:'Period 5',start:'10:40',end:'11:05'})
  assert.equal(data.friday_bells.at(-1).end,'12:30')
  assert.deepEqual(data.regular_weekdays,['Monday','Tuesday','Wednesday','Thursday','Saturday'])
  expectContinuous(data.friday_bells)
})
test('Grade Nine Boys Usman Period 7 is Computer Science with Miss Isma', () => {
  const s=find('Nine','Usman').periods[6]
  assert.deepEqual([s.subject,s.teacher_display_name],['Computer Science','Miss Isma'])
})
test('Grade Nine girls Fatima has independent allocation', () => {
  assert.equal(find('Nine','Fatima').periods[6].teacher_display_name,'Sir Fida-ul-Rehman')
  assert.equal(find('Nine','Fatima').periods[6].subject,'Islamiyat')
  assert.equal(find('Nine','Fatima').periods[4].subject,'Quran')
})
test('correct Class Five Period 5 and Miss Aqsa teacher spelling', () => {
  assert.deepEqual([find('Five').periods[4].subject,find('Five').periods[4].teacher_display_name],['English','Miss Sumaira'])
  assert.equal(find('Four').periods[0].teacher_display_name,'Miss Aqsa')
  assert.equal(find('Six').periods[2].teacher_display_name,'Miss Ghulam Fatima')
  assert.ok(!periods.some(p=>/Miss (Ausa|Afsa|Aousa)/i.test(p.teacher_display_name)))
})
test('fail closed: employee accounts and most sections require verification', () => {
  assert.equal(data.publication_authorized,false)
  assert.equal(data.may_write_production_timetable,false)
  assert.equal(data.teacher_accounts_verified,false)
  assert.equal(data.section_mapping_verified,false)
  for (const cohort of data.allocations) {
    if(cohort.class_name !== 'Nine') {
      assert.equal(cohort.section,null)
      assert.equal(cohort.section_verified,false)
    }
    for(const p of cohort.periods) {
      assert.equal(p.employee_id,null)
      assert.equal(p.employee_identity_verified,false)
    }
  }
})
test('official fixture does not contain student/marks/password data keys', () => {
  const content=fs.readFileSync(fixturePath,'utf8')
  for(const key of ['student_name','student_id','marks','fee_amount','password','api_token','attendance_status']) {
    assert.ok(!content.includes('"'+key+'"'),key)
  }
})
