import assert from 'node:assert/strict'
import { inferExamTermKey, resolveResultPrintOptions, summarizePrintBatch, RESULT_TERM_KEYS } from '../src/Modules/examination/resultPrintPlanning.js'
const expectations=[['First Term Exam','includeFirstTerm'],['1st term','includeFirstTerm'],['Second Term Exam','includeSecondTerm'],['2nd term','includeSecondTerm'],['Third Term','includeThirdTerm'],['Monthly Assessment','includeAssessment'],['Final Annual','includeFinalTerm'],['Comprehensive Test',null]]
for(const [name,key] of expectations){assert.equal(inferExamTermKey({name}),key,name)}
for(const [name,key] of expectations){const out=resolveResultPrintOptions({autoTermColumns:true,includeFirstTerm:true,includeFinalTerm:true}, {name});assert.deepEqual(RESULT_TERM_KEYS.filter(k=>out[k]), key ? [key]:[],name)}
const manual=resolveResultPrintOptions({autoTermColumns:false,includeFirstTerm:true,includeSecondTerm:true},{name:'Final Term'})
assert.equal(manual.includeFirstTerm,true);assert.equal(manual.includeSecondTerm,true)
const info=summarizePrintBatch([{school:{logo:'/api/uploads/logo.png'},result:{subjects:[{subjectName:'English',hasMarks:true},{subjectName:'Urdu',hasMarks:false}]}},{school:{logo:null},result:{subjects:[{subjectName:'—',hasMarks:false}]}}])
assert.deepEqual(info,{cards:2,scored:1,pending:2,absentLogo:1,missingSubject:1,ungraded:0,missingStudent:2,unscoredCards:1})
console.log('RESULT_PRINT_PLANNING_PASS 8 exam names, automatic/manual mixed terms, missing logo/marks summary')
