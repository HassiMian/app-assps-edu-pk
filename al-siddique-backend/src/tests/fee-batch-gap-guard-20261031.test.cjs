'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {build}=require('../services/feeBatchPlanner')
const {input}=require('../services/feeBatchRules')
const make=prior=>({
 id:801,gr_number:'GR-801',name:'Test Pupil',father_name:'Sample Father',
 class:'Pre Nine',section:'Blue',prior_id:12,prior_year:2026,prior_month:'October',
 prior_balance:5800,prior_monthly:3000,profile_fee:2000,existing_id:null,...prior
})
async function run(prior,month='November'){
 const row=make(prior)
 const db={async query(sql){
  if(sql.includes('FROM settings'))return {rows:[{academic_setup:{sessionStart:'2026-10-01',sessionEnd:'2027-06-01'}}]}
  if(sql.includes('FROM fee_class_settings'))return {rows:[{class_name:'Pre Nine',monthly_fee:3000,session:'2026-2027'}]}
  if(sql.includes('FROM students s LEFT JOIN student_fee_profiles'))return {rows:[row]}
  if(sql.includes('FROM students WHERE'))return {rows:[{father_name:'sample father',n:1}]}
  if(sql.includes('FROM fee_discount_packages'))return {rows:[]}
  throw Error('Unexpected SQL')
 }}
 return build(db,2,input({scope:'all',month,year:2026}))
}
test('current previous month carries manually edited remaining once, keeps per-student rate',async()=>{
 const x=(await run({prior_month:'October',prior_balance:5800})).items[0]
 assert.equal(x.status,'ready')
 assert.equal(x.monthly_fee,2000)
 assert.equal(x.arrears,5800)
 assert.equal(x.total,7800)
})
test('missing intermediate month is held, never quietly underbilled',async()=>{
 const x=(await run({prior_month:'September',prior_balance:5800})).items[0]
 assert.equal(x.status,'held')
 assert.equal(x.reason,'MISSING_INTERMEDIATE_MONTH_RECONCILIATION')
})
test('negative historical balance requires review, is not zeroed and billed',async()=>{
 const x=(await run({prior_month:'October',prior_balance:-600})).items[0]
 assert.equal(x.status,'held')
 assert.equal(x.reason,'INVALID_PREVIOUS_BALANCE')
})
test('old paid status not implied by zero previous balance',async()=>{
 const x=(await run({prior_month:'October',prior_balance:0})).items[0]
 assert.equal(x.status,'ready')
 assert.equal(x.arrears,0)
 assert.equal(x.total,2000)
})
test('already existing November voucher stays immutable despite historical gap',async()=>{
 const x=(await run({prior_month:'July',existing_id:900})).items[0]
 assert.equal(x.status,'existing')
 assert.equal(x.reason,'ALREADY_GENERATED')
})
test('cross-year December previous period is correctly recognized for January',async()=>{
 const x=(await run({prior_year:2025,prior_month:'December',prior_balance:1000},'January')).items[0]
 assert.equal(x.status,'ready')
})
