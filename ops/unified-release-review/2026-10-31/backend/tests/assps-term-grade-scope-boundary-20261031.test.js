'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const {consolidateWeeklyToTerm}=require('../services/asspsWeeklyTermConsolidator')
const source=cls=>({public_id:'QA_20261031_week_01',class_level:cls,planning_scope:'weekly',
  plan_date:'2026-11-02',end_date:'2026-11-07',payload:{section:'Blue',subjects:[{subject:'Science',units:[{pageRange:'Pages 31–39'}]}]}})
const preview=cls=>consolidateWeeklyToTerm({schoolId:1,weeklyPlans:[source(cls)]})
test('Class/Grade Eight including ordinal labels are forbidden',()=>{
 for(const label of ['Eight','Class Eight','Grade Eight','8','Class 8','Grade 8th']) {
  assert.equal(preview(label).error,'ASSPS_EIGHT_SECOND_TERM_FORBIDDEN',label)
 }
})
test('Pre-Nine alias never merges into Nine and remains deferred',()=>{
 for(const label of ['Pre Nine','Pre-Nine','Class Pre 9','Grade Pre-9th']) {
  assert.equal(preview(label).error,'PRE_NINE_PLANNING_DEFERRED',label)
 }
})
test('Class Nine/Ten remain outside approved Second Term scope',()=>{
 for(const label of ['Nine','Class Nine','9','Grade 9th','Ten','Class Ten','10th']) {
  assert.equal(preview(label).error,'SECOND_TERM_SCHOOL_SCOPE_ENDS_AT_SEVEN',label)
 }
})
test('Unknown levels fail closed rather than enter academic planner',()=>{
 for(const label of ['Eleven','Class Eleven','Kindergarten','Administration','Playgroup','Pilot Class 8']) {
  assert.equal(preview(label).error,'ASSPS_STARTER_TO_SEVEN_SCOPE_REQUIRED',label)
 }
})
test('Starter–Seven and exact Class/Grade prefixes are accepted as preview only',()=>{
 for(const label of ['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Class One','Grade Seven','1','Class 7']) {
  const r=preview(label)
  assert.ok(r.data,label+': '+JSON.stringify(r))
  assert.match(r.data.academicCertification,/HOLD/)
  assert.equal(r.data.subjects[0].pageRangeLabel,'Pages 31–39')
 }
})
