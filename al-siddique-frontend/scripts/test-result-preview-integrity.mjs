import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizeResultRows, formatResultCell, meetsResultPassMark } from '../src/Modules/examination/resultPreviewIntegrity.js'

const row = (student_id, subject, marks_obtained, total_marks) => ({ student_id, exam_id: 101, subject, marks_obtained, total_marks })
assert.deepEqual(summarizeResultRows([row(3,'English',0,100)]), {obtained:0,possible:100,recorded:1,pending:0,percentage:0})
assert.deepEqual(summarizeResultRows([row(3,'English',null,100)]), {obtained:0,possible:0,recorded:0,pending:1,percentage:null})
assert.deepEqual(summarizeResultRows([row(3,'English',86,100),row(3,'Science',null,100)]), {obtained:86,possible:100,recorded:1,pending:1,percentage:86})
assert.deepEqual(summarizeResultRows([row(3,'Maths',45,50),row(3,'Urdu','75','100')]), {obtained:120,possible:150,recorded:2,pending:0,percentage:80})
assert.equal(summarizeResultRows([row(3,'Maths',120,100),row(3,'Science',-1,100)]).pending,2)
assert.equal(formatResultCell(0),'0')
assert.equal(formatResultCell(''),'—')
assert.equal(formatResultCell(null),'—')
assert.equal(meetsResultPassMark(null,33),null)
assert.equal(meetsResultPassMark(0,null),null)
assert.equal(meetsResultPassMark(0,33),false)
assert.equal(meetsResultPassMark(33,33),true)
const source=readFileSync('src/Modules/examination/ResultCards.jsx','utf8')
assert.ok(source.includes('latestResultRequest.current !== requestId'), 'stale responses must be ignored')
assert.equal(source.split('latestResultRequest.current += 1; setSelectedExam').length-1,2, 'both selectors invalidate pending request')
assert.ok(source.includes('summarizeResultRows(studentMarks, exam)'), 'preview must use null-safe reducer')
console.log('RESULT_PREVIEW_INTEGRITY 13 assertions PASS')
