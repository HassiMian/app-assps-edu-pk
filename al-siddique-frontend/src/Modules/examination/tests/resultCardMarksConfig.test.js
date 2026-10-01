import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

test('First Term card keeps blank, zero and fractional marks distinct and uses actual paper totals', async t => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
  t.after(async () => { await server.close() })
  const { buildResultCardData, ResultMarksTable, openResultPrintWindow } = await server.ssrLoadModule('/src/Modules/examination/resultCardTemplates.jsx')
  const { evaluateFirstTermStudent } = await server.ssrLoadModule('/src/Modules/examination/firstTermResultIntegrity.js')
  const exam = { id: 9, school_id:1, name: 'First Term Exam', type: 'TE', session: '2026-2027', total_marks: 100 }
  const student = { id: 1, name: 'Audit-only Student', class: 'One', section: 'Yellow' }
  const studentMarks = [
    { subject: 'English', marks_obtained: 0, total_marks: 50, grade: 'F' },
    { subject: 'Mathematics', marks_obtained: 7.5, total_marks: 60, grade: 'F' },
  ]
  const data = buildResultCardData({ student, exam, studentMarks, options: {}, school: {} })
  assert.equal(data.result.totalMarks, 110)
  assert.equal(data.result.obtainedMarks, 7.5)
  const html = renderToStaticMarkup(React.createElement(ResultMarksTable, { data }))
  assert.ok(html.includes('<td>0</td>'), 'an actual zero remains 0')
  assert.ok(html.includes('<td>7.5</td>'), 'fractional marks remain fractional')
  assert.ok(html.includes('<td>-</td>'), 'an unentered term is a dash, not 0')
  assert.equal(data.result.status,'Incomplete', 'unverified official results cannot be printable')
  assert.doesNotThrow(()=>openResultPrintWindow(data), 'incomplete card never opens a print window')

  const scheduledSubjects = [
    { class_name:'One',section:'Yellow',subject:'English',total_marks:50,pass_marks:20,pass_percentage:40 },
    { class_name:'One',section:'Yellow',subject:'Mathematics',total_marks:60,pass_marks:20,pass_percentage:33 },
  ]
  const failedRows = [
    {subject:'English',marks_obtained:19,total_marks:50},
    {subject:'Mathematics',marks_obtained:60,total_marks:60},
  ]
  const failed = evaluateFirstTermStudent({exam,student,rows:failedRows,scheduledSubjects})
  const failedCard = buildResultCardData({exam,student,studentMarks:failed.rows,assessment:failed,options:{},school:{}})
  assert.equal(failed.complete,true)
  assert.equal(failed.status,'Fail')
  assert.equal(failedCard.result.totalMarks,110)
  assert.equal(failedCard.result.obtainedMarks,79)
  assert.equal(failedCard.result.grade,'F', 'high overall percentage cannot override a failed subject')
  assert.equal(failedCard.result.status,'Fail')
  assert.equal(failedCard.options.includeAttendance,false,'unverified attendance must not print fabricated values')
  assert.equal(failedCard.result.principalRemarks,'','First Term should not imply automatic promotion')
  assert.deepEqual(failedCard.result.subjects.map(s=>s.grade),['F','A+'])
  const failedMarkup = renderToStaticMarkup(React.createElement(ResultMarksTable,{data:failedCard}))
  assert.ok(failedMarkup.includes('<td>Fail</td>'))

  const passed = evaluateFirstTermStudent({exam,student,rows:[
    {subject:'English',marks_obtained:20,total_marks:50},
    {subject:'Mathematics',marks_obtained:20,total_marks:60},
  ],scheduledSubjects})
  const passedCard = buildResultCardData({exam,student,studentMarks:passed.rows,assessment:passed,options:{},school:{}})
  assert.equal(passedCard.result.status,'Pass')
  assert.equal(passedCard.result.grade,'E')
  assert.equal(passedCard.result.obtainedMarks,40)
})
