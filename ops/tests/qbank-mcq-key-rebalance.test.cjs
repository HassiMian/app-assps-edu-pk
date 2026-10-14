const test=require('node:test')
const assert=require('node:assert/strict')
const path=require('node:path')
const {rebalanceRows,run}=require('../qbank/rebalance-provisional-mcq-keys.cjs')

function mcq(id,key='A') { return {id,category:'mcq',question_text:`Q ${id}`,answer:'one',correct_option:key,options:[{id:'A',text:'one'},{id:'B',text:'two'},{id:'C',text:'three'},{id:'D',text:'four'}]} }

test('rebalancer preserves answer/option text while cycling correct labels',()=>{
  const src=[mcq('1'),mcq('2'),mcq('3'),mcq('4'),mcq('5')]
  const {rows,after}=rebalanceRows(src)
  assert.deepEqual(rows.map(q=>q.correct_option),['A','B','C','D','A'])
  for (const q of rows) {
    assert.equal(q.answer,'one')
    assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D'])
    assert.deepEqual(q.options.map(o=>o.text).sort(),['four','one','three','two'])
    assert.equal(q.options.find(o=>o.id===q.correct_option).text,'one')
  }
  assert.deepEqual(after.counts,{A:2,B:1,C:1,D:1,OTHER:0})
})

test('real provisional package remains balanced and idempotent after editorial rebalance',()=>{
  const dir=path.resolve(__dirname,'../../al-siddique-backend/src/scripts/generated')
  const report=run({dir,apply:false})
  assert.ok(report.totals.files>=56)
  assert.ok(report.totals.mcqs>=809)
  assert.equal(report.totals.changed,0)
  assert.equal(report.totals.flaggedBefore,0)
  assert.equal(report.totals.flaggedAfter,0)
  assert.equal(Object.values(report.totals.after).reduce((a,b)=>a+b,0),report.totals.mcqs)
  const peak=Math.max(report.totals.after.A,report.totals.after.B,report.totals.after.C,report.totals.after.D)
  assert.ok(peak/report.totals.mcqs < 0.30)
})
