const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {violatesAsspsSecondTermPolicy:deny}=require('../services/asspsSecondTermPolicy')
test('school 1 Class Eight Second Term denied on save/replay, while First Term preserved',()=>{
 for(const level of ['Eight','8','Class Eight','Class 8','8th','VIII']){
  assert.equal(deny(1,{classLevel:level,termLabel:'Second Term'}),true,level)
  assert.equal(deny(1,{classLevel:level,termLabel:'Second Term · Source-based draft'}),true,level)
  assert.equal(deny(1,{class_level:level,payload:{termLabel:'Second Term'}}),true,level)
  assert.equal(deny(1,{classLevel:level,termLabel:'First Term'}),false,level)
 }
})
test('peer tenants are exempt from ASSPS Class Eight calendar policy',()=>{
 for(const schoolId of [2,3,null,0])
  assert.equal(deny(schoolId,{classLevel:'Eight',termLabel:'Second Term'}),false)
})
test('Pre-Nine, Seven, Nine and term-unmarked historical documents not falsely denied',()=>{
 for(const cls of ['Seven','Pre-Nine','Nine','Ten'])
  assert.equal(deny(1,{classLevel:cls,termLabel:'Second Term'}),false)
 assert.equal(deny(1,{classLevel:'Eight',termLabel:'Third Term'}),false)
 assert.equal(deny(1,{classLevel:'Eight',planningScope:'weekly'}),false)
})
test('archive scope provenance triggers second term denial',()=>{
 assert.equal(deny(1,{classLevel:'Eight',payload:{provenance:{sourceArchiveScope:'SECOND_TERM_ONLY'}}}),true)
 assert.equal(deny(1,{classLevel:'Seven',payload:{provenance:{sourceArchiveScope:'SECOND_TERM_ONLY'}}}),false)
})
test('backend create, update and share enforce policy',()=>{
 const text=fs.readFileSync(path.join(__dirname,'../routes/lessonPlanRoutes.js'),'utf8')
 assert.equal((text.match(/violatesAsspsSecondTermPolicy\(schoolId,plan\)/g)||[]).length,2)
 assert.match(text,/violatesAsspsSecondTermPolicy\(schoolId,\{classLevel:row\.class_level,payload\}\)/)
 assert.match(text,/ASSPS_EIGHT_SECOND_TERM_FORBIDDEN/)
})

test('alternate Second Term labels cannot bypass School1 Eight policy',()=>{
 const variants=['Second Term','Second-Term','second_term','2nd Term','Term 2','Term II','Term Two','II Term','Second Term · draft','Second Term (2026)','Second']
 for(const term of variants){
  assert.equal(deny(1,{classLevel:'Eight',termLabel:term}),true,term)
  assert.equal(deny(2,{classLevel:'Eight',termLabel:term}),false,term)
  assert.equal(deny(1,{classLevel:'Seven',termLabel:term}),false,term)
 }
 for(const term of ['First Term','Third Term','Second language','Second trimester',''])
  assert.equal(deny(1,{classLevel:'Eight',termLabel:term}),false,term)
})

test('punctuation-delimited Class Eight aliases do not bypass the policy',()=>{
 for(const klass of ['Class-VIII','Class_8','Grade.08','Grade-VIII','Class.8th']){
  assert.equal(deny(1,{classLevel:klass,termLabel:'2nd Term'}),true,klass)
  assert.equal(deny(1,{classLevel:klass,termLabel:'First Term'}),false,klass)
 }
})

test('nested plannerDocument Class Eight / Second Term cannot bypass mislabeled outer values',()=>{
 const variants=[
  {classLevel:'Seven',termLabel:'First Term',payload:{plannerDocument:{classLevel:'Eight',termLabel:'Second Term'}}},
  {classLevel:'Eight',payload:{plannerDocument:{classLevel:'Eight',termLabel:'Second Term'}}},
  {classLevel:'Seven',payload:{classLevel:'Eight',termLabel:'Second Term'}},
  {classLevel:'Eight',termLabel:'First Term',payload:{classLevel:'Seven',termLabel:'Second Term'}},
  {classLevel:'Seven',termLabel:'Second Term',payload:{plannerDocument:{classLevel:'Class-VIII',termLabel:'First Term'}}},
  {classLevel:'Seven',termLabel:'First Term',payload:{plannerDocument:{classLevel:'Eight',provenance:{sourceArchiveScope:'SECOND_TERM_ONLY'}}}}
 ]
 for(const sample of variants)assert.equal(deny(1,sample),true,JSON.stringify(sample))
 for(const sample of variants)assert.equal(deny(2,sample),false,'peer tenant')
})
test('nested First Term Eight and unrelated grades are preserved',()=>{
 assert.equal(deny(1,{classLevel:'Eight',termLabel:'First Term',payload:{plannerDocument:{classLevel:'Eight',termLabel:'First Term'}}}),false)
 assert.equal(deny(1,{classLevel:'Seven',termLabel:'Second Term',payload:{plannerDocument:{classLevel:'Seven',termLabel:'Second Term'}}}),false)
})

test('dated labels, nested source termKey and conflicting key names cannot bypass School1',()=>{
 const cases=[
  {classLevel:'Eight',payload:{plannerDocument:{classLevel:'Eight',provenance:{termKey:'eight|blue|second term|2026-10-15'}}}},
  {classLevel:'Eight',payload:{plannerDocument:{termLabel:'2026–27 / Second Term'}}},
  {classLevel:'Seven',class_level:'Eight',termLabel:'First Term',term:'Second Term'},
  {classLevel:'Eight',payload:{termLabel:'First Term',session_term:'Term II'}},
  {classLevel:'VIII',payload:{plannerDocument:{termLabel:'Second Semester'}}}
 ]
 for(const c of cases){
  assert.equal(deny(1,c),true,JSON.stringify(c))
  assert.equal(deny(2,c),false,'peer school calendar unchanged')
 }
 assert.equal(deny(1,{classLevel:'Eight',payload:{plannerDocument:{provenance:{termKey:'eight|blue|first term|2026-04'}}}}),false)
 assert.equal(deny(1,{classLevel:'Pre-Nine',termLabel:'2026–27 / Second Term'}),false)
})

test('explicit term-field numeric/ordinal codes cannot bypass School1 Eight policy',()=>{
 for(const term of [2,'2','02','2nd','II','two']){
  for(const key of ['term','termLabel','sessionTerm','session_term','term_name']){
   const input={classLevel:'Eight',[key]:term}
   assert.equal(deny(1,input),true,`${key}=${term}`)
   assert.equal(deny(2,input),false,`peer ${key}=${term}`)
   assert.equal(deny(1,{classLevel:'Seven',[key]:term}),false,`Seven ${key}=${term}`)
  }
 }
 for(const term of [1,'1','01','1st','I','one','2026','2027'])
  assert.equal(deny(1,{classLevel:'Eight',term}),false,`not second term: ${term}`)
 assert.equal(deny(1,{classLevel:'Eight',payload:{plannerDocument:{sessionTerm:'II'}}}),true)
 assert.equal(deny(1,{classLevel:'Eight',payload:{plannerDocument:{provenance:{termKey:'eight|blue|2|2026-10-15'}}}}),false,'termKey components must not treat arbitrary 2 as Second Term')
})
