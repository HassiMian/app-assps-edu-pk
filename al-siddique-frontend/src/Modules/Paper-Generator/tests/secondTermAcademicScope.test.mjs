import test from 'node:test'
import assert from 'node:assert/strict'
import {CURRENT_SECOND_TERM_BATCH,isEighthClass,inCurrentSecondTermBatch,
  isSecondTermLabel,assertSecondTermAcademicPolicy} from '../secondTermAcademicScope.js'
import {buildWeeklyServerPayload} from '../weeklyServerPayload.js'
import {buildTermServerPayload} from '../termPlanningModel.js'

test('current batch only runs Starter through Seven; no Pre-Nine or Grade Eight',()=>{
  assert.deepEqual(CURRENT_SECOND_TERM_BATCH,['Starter','Mover','Flyer','One','Two',
    'Three','Four','Five','Six','Seven'])
  for(const level of CURRENT_SECOND_TERM_BATCH)assert.equal(inCurrentSecondTermBatch(level),true)
  for(const level of ['Eight','Class Eight','8th','VIII','Pre-Nine','Nine','Ten','unknown'])
    assert.equal(inCurrentSecondTermBatch(level),false,level)
})
test('Class Eight aliases fail closed in Second Term without affecting First Term history',()=>{
  for(const level of ['Eight','8','Class 8','8th','Class Eight','VIII','Grade VIII','08']){
    assert.equal(isEighthClass(level),true,level)
    assert.throws(()=>assertSecondTermAcademicPolicy(level,'Second Term',1),/NO Second Term/,level)
    assert.equal(assertSecondTermAcademicPolicy(level,'First Term',1),true,level)
  }
  assert.equal(assertSecondTermAcademicPolicy('Eight','Second Term',2),true)
  assert.equal(assertSecondTermAcademicPolicy('Eight','Second Term',null),true)
  for(const level of ['Seven','Pre-Nine','Nine','Ten']){
    assert.equal(isEighthClass(level),false,level)
    assert.equal(assertSecondTermAcademicPolicy(level,'Second Term',1),true,level)
  }
})
test('direct weekly save payload cannot bypass Class Eight exclusion',()=>{
 assert.throws(()=>buildWeeklyServerPayload({klass:'Eight',schoolId:1,section:'Blue',week:{
  start:'2026-10-19',end:'2026-10-24'},rows:[{id:'science',subject:'Science',task:'Read'}],
  sourceZipSha256:'a'.repeat(64)}),/NO Second Term/)
})
test('direct term save payload cannot bypass Class Eight exclusion but First Term is permitted',()=>{
 const args={klass:'Eight',schoolId:1,section:'Blue',term:'Second Term',start:'2026-10-15',
  end:'2027-02-15',rows:[{id:'math',subject:'Mathematics',pageFrom:'1',pageTo:'25',
  detail:'Review'}],assessments:[],sourceZipSha256:'a'.repeat(64)}
 assert.throws(()=>buildTermServerPayload(args),/NO Second Term/)
 const first=buildTermServerPayload({...args,term:'First Term'})
 assert.ok(first)
})

test('frontend rejects equivalent Second Term labels only for School1 Class Eight',()=>{
 for(const term of ['Second-Term','second_term','2nd Term','Term 2','Term II','Term Two','II Term','Second Term · draft','Second']){
  assert.throws(()=>assertSecondTermAcademicPolicy('VIII',term,1),/NO Second Term/,term)
  assert.equal(assertSecondTermAcademicPolicy('VIII',term,2),true,term)
  assert.equal(assertSecondTermAcademicPolicy('Seven',term,1),true,term)
 }
 for(const term of ['First Term','Third Term','Second language','Second trimester',''])
  assert.equal(assertSecondTermAcademicPolicy('Eight',term,1),true,term)
})

test('frontend punctuation-delimited Class Eight aliases are denied',()=>{
 for(const klass of ['Class-VIII','Class_8','Grade.08','Grade-VIII','Class.8th'])
  assert.throws(()=>assertSecondTermAcademicPolicy(klass,'2nd Term',1),/NO Second Term/,klass)
})

test('prefixed Second Term labels are denied only for ASSPS Grade Eight',()=>{
  assert.equal(isSecondTermLabel('2026–27 / Second Term'),true)
  assert.equal(isSecondTermLabel('2026 / Semester II'),true)
  assert.equal(isSecondTermLabel('First Term'),false)
  assert.throws(()=>assertSecondTermAcademicPolicy('Class Eight','2026–27 / Second Term',1))
  assert.doesNotThrow(()=>assertSecondTermAcademicPolicy('Class Eight','First Term',1))
  assert.doesNotThrow(()=>assertSecondTermAcademicPolicy('Class Eight','2026–27 / Second Term',2))
})

test('School1 Eighth explicit numeric/ordinal term field blocked while First and peer schools preserved',()=>{
 for(const term of [2,'2','02','2nd','II','two']){
  assert.throws(()=>assertSecondTermAcademicPolicy('Eight',term,1),/NO Second Term/,String(term))
  assert.equal(assertSecondTermAcademicPolicy('Eight',term,2),true,String(term))
  assert.equal(assertSecondTermAcademicPolicy('Seven',term,1),true,String(term))
 }
 for(const term of [1,'01','first','First Term',3,'Third Term','section|2|first term'])
  assert.equal(assertSecondTermAcademicPolicy('Eight',term,1),true,String(term))
})
