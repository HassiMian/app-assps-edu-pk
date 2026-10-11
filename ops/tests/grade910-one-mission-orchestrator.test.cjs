'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {plan,partition,tap}=require('../qbank/run-grade910-academic-mission.cjs')
test('mission discovers all source and publisher tests without selecting a production mode',()=>{
 const p=plan()
 assert.equal(p.stagingTestFiles,111)
 assert.ok(p.academicSourceFiles>=40)
 assert.equal(p.batches.filter(x=>x.id.startsWith('staging-')).length,3)
 assert.equal(p.batches.filter(x=>x.id.startsWith('academic-')).length,8)
 assert.equal(p.batches.reduce((s,x)=>s+x.files.length,0),p.stagingTestFiles+p.academicSourceFiles)
 assert.equal(p.productionDeployment,false)
 assert.equal(p.publisherSelectable,false)
})
test('partition preserves each identity exactly once',()=>{
 const src=Array.from({length:47},(_,i)=>'test'+i)
 const p=partition(src,8)
 assert.equal(p.length,8)
 assert.deepEqual(new Set(p.flat()),new Set(src))
 assert.equal(p.flat().length,47)
})
test('TAP evidence parsing requires explicit complete exact pass summary',()=>{
 assert.deepEqual(tap('TAP version 13\nok 1 - one\nok 2 - two\n1..2\n# tests 2\n# pass 2\n# fail 0\n# skipped 0'),{
  tests:2,pass:2,fail:0,skipped:0,completeFooter:true})
 assert.equal(tap('ok 1 - incomplete').completeFooter,false)
 assert.equal(tap('1..1\n# tests 1\n# pass 0\n# fail 1\n# skipped 0').fail,1)
})
