'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {DAYS,validateTimetableDraft}=require('../domain/schoolTimetableDraftContract')
function payload(){
 return {class_name:'Five',section:'Blue',academic_session:'2026–27',revision:0,
  days:DAYS.map(day=>({day,periods:Array.from({length:8},(_,i)=>({
   number:i+1,subject:i===4?'English':'',teacher_display_name:i===4?'Miss Sumaira':''
  }))}))}
}
test('six weekdays and eight periods form draft only; Friday exists',()=>{
 const r=validateTimetableDraft(payload())
 assert.deepEqual(r.errors,[])
 assert.equal(r.value.content.days.length,6)
 assert.equal(r.value.content.days[4].day,'Friday')
 assert.equal(r.value.publication_authorized,false)
 assert.equal(r.value.staff_identity_reviewed,false)
 assert.equal(r.value.content.days[0].periods[4].subject,'English')
})
test('reject dishonest teacher account ID or destructive instructions',()=>{
 const p=payload();p.days[0].periods[0].teacher_id=2378
 assert.ok(validateTimetableDraft(p).errors.includes('INVALID_PERIOD_SCHEMA'))
})
test('reject duplicate day, missing day, and fewer periods',()=>{
 const p=payload();p.days[5].day='Monday'
 assert.ok(validateTimetableDraft(p).errors.includes('INVALID_OR_DUPLICATE_DAY'))
 const q=payload();q.days[1].periods.pop()
 assert.ok(validateTimetableDraft(q).errors.includes('EIGHT_PERIODS_REQUIRED'))
})
test('reject HTML/script payload and unsafe characters',()=>{
 const p=payload();p.days[0].periods[0].subject='<script>alert(1)</script>'
 assert.ok(validateTimetableDraft(p).errors.includes('INVALID_TEXT'))
 const q=payload();q.class_name='Five<all>'
 assert.ok(validateTimetableDraft(q).errors.includes('CLASS_REQUIRED'))
})
test('reject falsified approval flags and invalid revisions',()=>{
 const p=payload();p.staff_identity_reviewed=true
 assert.ok(validateTimetableDraft(p).errors.includes('UNVERIFIED_AUTHORIZATION'))
 const q=payload();q.revision=-1
 assert.ok(validateTimetableDraft(q).errors.includes('INVALID_REVISION'))
})
test('unknown teacher names remain display text only, not authorization',()=>{
 const p=payload();p.days[0].periods[0].teacher_display_name='Unknown'
 const v=validateTimetableDraft(p).value
 assert.equal(v.content.days[0].periods[0].teacher_display_name,'Unknown')
 assert.equal(v.staff_identity_reviewed,false)
})
