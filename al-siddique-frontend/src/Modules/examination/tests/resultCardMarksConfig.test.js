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
  const { buildResultCardData, ResultMarksTable } = await server.ssrLoadModule('/src/Modules/examination/resultCardTemplates.jsx')
  const exam = { id: 9, name: 'First Term Exam', type: 'TE', session: '2026-2027', total_marks: 100 }
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
})
