'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const rules={...require('../services/feeBatchRules'),...require('../services/feeBatchPlanner')}
const month={month:'November',year:2026}
test('all classes is supported without a student, never silently defaults to one student',()=>{
 const result=rules.input({...month,scope:'all'})
 assert.equal(result.scope,'all')
 assert.equal(result.className,'')
 assert.equal(result.extra.exam_fee,0)
})
test('class wise requires a class',()=>{
 assert.throws(()=>rules.input({...month,scope:'class'}))
 assert.equal(rules.input({...month,scope:'class',class_name:'Pre Nine'}).className,'Pre Nine')
})
test('student wise requires real id',()=>{
 assert.throws(()=>rules.input({...month,scope:'student'}))
 assert.equal(rules.input({...month,scope:'student',student_id:800}).studentId,800)
})
test('fees cannot be negative, huge or imprecise',()=>{
 for(const fee of ['-1','100000','1.123','nan'])assert.throws(()=>rules.input({...month,scope:'all',fees:{exam_fee:fee}}))
})
test('historical month validation is explicit',()=>{
 assert.throws(()=>rules.input({scope:'all',month:'Smarch',year:2026}))
 assert.throws(()=>rules.input({scope:'all',month:'November',year:2033}))
})
test('due date defaults to tenth and accepts explicit due date',()=>{
 assert.equal(rules.input({...month,scope:'all'}).dueDate,'2026-11-10')
 assert.equal(rules.input({...month,scope:'all',due_date:'2026-11-12'}).dueDate,'2026-11-12')
})
test('individual fee profile overrides class rate, not vice versa',()=>{
 assert.equal(rules.profileMonthly(2000,2500),2000)
 assert.equal(rules.profileMonthly(null,2500),2500)
})
test('sibling discount applies only when actual sibling count passes minimum',()=>{
 const pkg=[{id:1,name:'Triple Star',discount_type:'percentage',discount_value:10,min_sibling_count:3,applicable_classes:[],applicable_sessions:[]}]
 assert.equal(rules.chooseDiscount({class:'Seven'},pkg,3,'2026-2027',2800).amount,280)
 assert.equal(rules.chooseDiscount({class:'Seven'},pkg,2,'2026-2027',2800).amount,0)
})
test('applicable class and session restrictions are retained',()=>{
 const pkg=[{id:2,name:'Special',discount_type:'fixed',discount_value:500,min_sibling_count:2,applicable_classes:['Seven'],applicable_sessions:['2026-2027']}]
 assert.equal(rules.chooseDiscount({class:'Six'},pkg,4,'2026-2027',2800).amount,0)
 assert.equal(rules.chooseDiscount({class:'Seven'},pkg,4,'2027-2028',2800).amount,0)
})
test('preview keeps existing invoices separate from creation and holds duplicates',async()=>{
 const rows=[
 {id:1,name:'Ali',father_name:'Khan',gr_number:'1',class:'Starter',section:'Blue',profile_fee:null,prior_balance:500,existing_id:null},
 {id:2,name:'Ali',father_name:'Khan',gr_number:'2',class:'Starter',section:'Blue',profile_fee:null,prior_balance:100,existing_id:null},
 {id:3,name:'B',father_name:'Z',gr_number:'3',class:'Starter',section:'Blue',profile_fee:null,prior_balance:0,existing_id:101},
 {id:4,name:'C',father_name:'T',gr_number:'4',class:'Starter',section:'Blue',profile_fee:null,prior_balance:700,existing_id:null}
 ]
 const stub={async query(sql){
  if(sql.includes('FROM settings'))return {rows:[{academic_setup:{sessionStart:'2026-10-01',sessionEnd:'2027-05-30'}}]}
  if(sql.includes('FROM fee_class_settings'))return {rows:[{class_name:'Starter',monthly_fee:2500,session:'2026-2027'}]}
  if(sql.includes('FROM students s LEFT JOIN student_fee_profiles'))return {rows}
  if(sql.includes('FROM students WHERE'))return {rows:[]}
  if(sql.includes('FROM fee_discount_packages'))return {rows:[]}
  throw Error('Unexpected mock SQL '+sql.slice(0,90))
 }}
 const p=rules.input({...month,scope:'all'})
 const result=await rules.build(stub,2,p)
 assert.equal(result.summary.existing,1)
 assert.equal(result.summary.held,2)
 assert.equal(result.summary.ready,1)
 assert.equal(result.summary.due_total,3200)
 assert.equal(result.items.find(x=>x.student_id===4).arrears,700)
 assert.equal(result.items.find(x=>x.student_id===4).paper_fund,0)
})
