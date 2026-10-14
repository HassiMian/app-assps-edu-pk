'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const {selectGradeBand} = require('../services/gradeBandAssignment')
const bands = [
  {label:'A+',from:90,to:100},
  {label:'A',from:80,to:89},
  {label:'B',from:70,to:79},
  {label:'C',from:60,to:69},
  {label:'D',from:40,to:59},
  {label:'F',from:0,to:39}
]
const match = (p, b=bands) => selectGradeBand(p,b)?.label ?? ''
test('40% school passing grade boundary: 39.999 is F; 40 is D',()=>{
  assert.equal(match(39.999),'F')
  assert.equal(match(40),'D')
  assert.equal(match(59.999),'D')
  assert.equal(match(60),'C')
})
test('old 69.333/89.333 gaps classify without altering actual marks',()=>{
  for (const [p, grade] of [[69.333,'C'],[89.333,'A'],[79.999,'B'],[90,'A+'],[100,'A+'],[0,'F']])
    assert.equal(match(p),grade)
})
test('decimal-authored school bands are treated literally, not floored',()=>{
  const fraction = [{label:'F',from:0,to:39.49},{label:'D',from:39.5,to:100}]
  assert.equal(match(39.55,fraction),'D')
  assert.equal(match(39.495,fraction),'')
})
test('malformed, overlaid or missing school bands fail closed',()=>{
  for(const pct of [NaN,Infinity,-1,100.1]) assert.equal(match(pct),'')
  assert.equal(match(81,[...bands,{label:'X',from:80,to:100}]),'')
  assert.equal(match(62,[{label:'D',from:40,to:59}]),'')
  assert.equal(match(82,[]),'')
})
