'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const {execFileSync}=require('node:child_process')
const ROOT=path.resolve(__dirname,'../..')
const relative='al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx'
const approved=execFileSync('git',['show', '06be72b8:'+relative],{cwd:ROOT,encoding:'utf8'})
const candidate=fs.readFileSync(path.join(ROOT,relative),'utf8')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const original='cb76705cffecd8675f35ab6425b904374a44197a53779e403384a022fff7ee29'
const sources=[['assessmentMarks','assessment_marks'],['firstTermMarks','first_term_marks'],['secondTermMarks','second_term_marks'],['thirdTermMarks','third_term_marks'],['finalTermMarks','final_term_marks'],['marks_obtained','obtainedMarks']]
test('Phase 2 result-card source recovered exactly',()=>{
 assert.equal(sha(approved),original)
})
test('changed source reconstructs Phase 2 visual source after exactly six permitted substitutions',()=>{
 let changed=approved
 for (const [left,right] of sources){
  const before='row.'+left+' | row.'+right
  const after='row.'+left+' ?? row.'+right
  assert.equal(changed.split(before).length-1,1,before)
  changed=changed.replace(before,after)
 }
 assert.equal(candidate,changed)
 assert.notEqual(sha(candidate),sha(approved))
})
test('five other protected templates retain approved original hashes',()=>{
 const manifest=fs.readFileSync(path.join(ROOT,'docs/template-baseline/TEMPLATE_BASELINE_SHA256_20261005.txt'),'utf8')
 const entries=manifest.trim().split(/\r?\n/).map(line=>line.match(/^([0-9a-f]{64})\s+(.+)$/))
 assert.equal(entries.length,6)
 for (const entry of entries){
  assert.ok(entry)
  const [,hash,p]=entry
  if(p===relative)continue
  assert.equal(sha(fs.readFileSync(path.join(ROOT,p))),hash,p)
 }
})
