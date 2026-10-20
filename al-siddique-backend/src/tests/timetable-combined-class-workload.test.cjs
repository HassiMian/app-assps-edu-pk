'use strict'
// Offline regression tests; do not connect to or modify production PostgreSQL.
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const route=fs.readFileSync(path.join(__dirname,'../routes/timetableRoutes.js'),'utf8')

// Test the paired-class policy with synthetic data; the live query is also
// separately verified using READ ONLY PostgreSQL via the unified release gate.
function permittedSharedPair(a,b){
 const names=[a.class_name,b.class_name].sort().join('|')
 return a.school_id===1 && b.school_id===1 && names==='Five|Four'
   && a.section==='Blue' && b.section==='Blue'
   && a.subject===b.subject && a.teacher_id===b.teacher_id
   && a.day_name===b.day_name && a.period_label===b.period_label
   && a.start_time===b.start_time && a.end_time===b.end_time
   && (a.room||'')===(b.room||'')
}
const one={school_id:1,class_name:'Four',section:'Blue',subject:'English',
 teacher_id:2378,day_name:'Monday',period_label:'Period 5',
 start_time:'10:55',end_time:'11:25',room:null}
const two={...one,class_name:'Five'}

test('School1 known combined Four/Five shares exactly one occupied teacher slot',()=>{
 assert.equal(permittedSharedPair(one,two),true)
 assert.equal(permittedSharedPair(two,one),true)
})
test('other school and missing section never gain combined exception',()=>{
 for(const variant of [{school_id:2},{section:''},{section:null},{class_name:'Six'}]){
  assert.equal(permittedSharedPair(one,{...two,...variant}),false)
 }
})
test('different teacher, subject, date, period, timing or room is a real clash',()=>{
 for(const variant of [{teacher_id:999},{subject:'Urdu'},{day_name:'Friday'},
  {period_label:'Period 4'},{start_time:'10:30'},{end_time:'11:15'},
  {room:'Computer Lab'}]){
   assert.equal(permittedSharedPair(one,{...two,...variant}),false)
  }
})
test('backend SQL uses exact school, classes, subject, bell times and room guard',()=>{
 const where=route.split('const clashSql = `')[1]?.split('`')[0]||''
 for(const fragment of ["t1.school_id=1","t1.section='Blue'", "t2.section='Blue'",
  "t1.class_name='Four'", "t2.class_name='Five'", "t1.class_name='Five'",
  "t2.class_name='Four'", 't1.subject IS NOT DISTINCT FROM t2.subject',
  't1.start_time IS NOT DISTINCT FROM t2.start_time',
  't1.end_time IS NOT DISTINCT FROM t2.end_time',
  "coalesce(t1.room,'')=coalesce(t2.room,'')"]){
   assert.ok(where.includes(fragment),fragment)
  }
 assert.ok(where.includes('AND NOT ('),'shared exception must explicitly exclude only exact pairs')
 assert.ok(where.includes("t1.school_id = $1"),'school actor still scopes the workload')
})
test('teacher workload counts occupied slots separately from class assignment rows',()=>{
 assert.match(route,/COUNT\(DISTINCT \(day_name,period_label\)\) as total_periods/)
 assert.match(route,/COUNT\(\*\) as assignment_rows/)
 assert.doesNotMatch(route,/COUNT\(\*\) as total_periods/)
})
