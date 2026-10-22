'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const vm=require('node:vm')
const path=require('node:path')
const source=fs.readFileSync(path.resolve(__dirname,'../../al-siddique-frontend/src/Modules/examination/resultCardTemplates.jsx'),'utf8')
const a=source.slice(source.indexOf('export const DEFAULT_RESULT_OPTIONS'),source.indexOf('function SchoolNameLines'))
const b=source.slice(source.indexOf('export function buildResultCardData'),source.indexOf('export function ResultCardTemplateSelector'))
const context={}
vm.runInNewContext((a+b).replaceAll('export ','')+'; this.buildResultCardData=buildResultCardData;',context)
const compute=(entry)=>context.buildResultCardData({student:{name:'Isolated Test'},exam:{name:'First Term Exam',total_marks:50},studentMarks:[entry],options:{},school:{}})
test('decimal mark is not truncated by JavaScript bitwise OR',()=>{
 const x=compute({subject:'English Written',firstTermMarks:49.5,first_term_marks:40,total_marks:50})
 assert.equal(x.result.subjects[0].firstTermMarks,49.5)
 assert.equal(x.result.subjects[0].obtainedMarks,49.5)
})
test('genuine zero must win over stale alternate-source score',()=>{
 const x=compute({subject:'English Written',firstTermMarks:0,first_term_marks:25,total_marks:50})
 assert.equal(x.result.subjects[0].firstTermMarks,0)
})
test('snake-case fallback remains compatible and negative claims are not fabricated',()=>{
 const x=compute({subject:'English Written',first_term_marks:42,total_marks:50})
 assert.equal(x.result.subjects[0].firstTermMarks,42)
 const pending=compute({subject:'English Written',total_marks:50})
 assert.equal(pending.result.subjects[0].firstTermMarks,null)
})
test('do not use bitwise OR for any of six academic score selectors',()=>{
 const s=source.slice(source.indexOf('export function buildResultCardData'),source.indexOf('export function ResultCardTemplateSelector'))
 assert.equal(/row\.\w+\s*\|\s*row\.\w+/.test(s),false)
})
