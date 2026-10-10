import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {validateMarksBatch} from '../src/Modules/examination/marksEntryModel.js'
import {marksEntryReadiness} from '../src/Modules/examination/marksEntryReadiness.js'
import {summarizePrintBatch} from '../src/Modules/examination/resultPrintPlanning.js'

const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
const exam={id:9,name:'First Term Exam',type:'Term Exam',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33}
const students=[{id:101,name:'Synthetic Student A',class:'Class One',roll_number:'01'}, {id:102,name:'Synthetic Student B',class:'One',roll_number:'02'}]
const school={name:'Test Fixture Institution',logo:'https://api.assps.edu.pk/uploads/branding/synthetic-fixture.png'}
const grades=[{from:0,to:39,label:'D'},{from:40,to:79,label:'B'},{from:80,to:100,label:'A'}]
const saved=[]
try {
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const opts={...m.DEFAULT_RESULT_OPTIONS,template:'signature-editorial',gradeBands:grades,autoTermColumns:true}
 const noData=marksEntryReadiness(students)
 assert.equal(noData.saved,0);assert.equal(noData.pending,2)
 const emptyBatch=validateMarksBatch({exam,selectedClass:'One',students,subject:'English',marks:{},totalMarks:100,passMarks:33})
 assert.equal(emptyBatch.rows.length,0);assert.match(emptyBatch.error,/Blank marks are not zero/)
 const blankCard=m.buildResultCardData({student:students[0],exam,studentMarks:[],school,options:opts})
 assert.equal(blankCard.result.percentage,null)
 assert.equal(summarizePrintBatch([blankCard]).unscoredCards,1,'Do not print an empty official Result Card')
 console.log('FIRSTDAY_GATE_PASS zero saved marks, two pending student records; print empty result blocked')
 const first=validateMarksBatch({exam,selectedClass:'One',students,subject:'English',marks:{101:'0'},totalMarks:100,passMarks:33})
 assert.equal(first.error,'');assert.equal(first.rows.length,1);assert.equal(first.rows[0].marks_obtained,0)
 saved.push(...first.rows)
 assert.equal(marksEntryReadiness(students,{101:0}).pending,1)
 const partial=[{subject:'English',marks_obtained:saved[0].marks_obtained,total_marks:100},{subject:'Mathematics',marks_obtained:null,total_marks:100}]
 const ids=m.RESULT_TEMPLATES.filter(t=>t.id!=='reference-clone' && t.id!=='minimal-corporate' && ['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier'].includes(t.id)).map(t=>t.id)
 assert.equal(ids.length,9)
 for(const template of ids){
  const card=m.buildResultCardData({student:students[0],exam,studentMarks:partial,school,options:{...opts,template}})
  assert.equal(card.result.subjects[0].obtainedMarks,0,template+' zero not missing')
  assert.equal(card.result.pendingCount,1)
  assert.equal(card.result.percentage,null,template+' no overall grade with unmarked Math')
  assert.equal(summarizePrintBatch([card]).unscoredCards,0,template+' partial cards flagged pending instead of empty')
 }
 console.log('FIRSTDAY_GATE_PASS first recorded 0 retained across all 9 premium styles, missing Math remains pending and ungraded')
 const second=validateMarksBatch({exam,selectedClass:'One',students,subject:'Mathematics',marks:{101:'70'},totalMarks:100,passMarks:33})
 assert.equal(second.error,'');saved.push(...second.rows)
 for(const template of ids){
  const rows=saved.map(r=>({subject:r.subject,marks_obtained:r.marks_obtained,total_marks:r.total_marks}))
  const card=m.buildResultCardData({student:students[0],exam,studentMarks:rows,school,options:{...opts,template}})
  assert.equal(card.result.obtainedMarks,70)
  assert.equal(card.result.totalMarks,200)
  assert.equal(card.result.percentage,35)
  assert.equal(card.result.grade,'D')
  assert.equal(card.result.pendingCount,0)
  assert.equal(summarizePrintBatch([card]).unscoredCards,0)
 }
 console.log('FIRSTDAY_GATE_PASS subject entry progresses 0/100 -> 70/200 = 35%, configured grade only, all 9 styles')
} finally {await vite.close()}
