'use strict'
process.env.DB_STARTUP_PROBE = 'false'
process.env.DB_RUNTIME_ROLE = 'assps_qa_restricted'
const test = require('node:test'), assert = require('node:assert/strict')
const path = require('node:path')
const express = require(require.resolve('express', { paths: [path.join(__dirname, '../../al-siddique-backend')] }))
const authPath = require.resolve('../../al-siddique-backend/src/middleware/auth')

require.cache[authPath] = {
  id: authPath, filename: authPath, loaded: true, exports: {
    protect(req, res, next) {
      const who = req.get('x-qa-role')
      if (!who) return res.status(401).json({ success: false })
      req.user = who === 'teacher' ? { id: 50, school_id: 1, role: 'teacher' } :
        who === 'principal' ? { id: 10, school_id: 1, role: 'principal' } :
          who === 'admin' ? { id: 5, school_id: 1, role: 'admin' } :
            { id: 51, school_id: 2, role: 'teacher' }
      return next()
    },
    requireRoles: (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).end()
  }
}

const mockDraftRows = [
  {
    id: 'IX-BIO-DRAFT-01',
    class_level: '9th',
    subject: 'Biology',
    medium: 'english',
    question_type: 'mcq',
    question_text: 'Which organelle is known as the powerhouse of the cell?',
    question_text_urdu: 'سیل کا پاور ہاؤس کون سا ہے؟',
    options: [
      { key: 'A', text: 'Nucleus' },
      { key: 'B', text: 'Mitochondria' },
      { key: 'C', text: 'Ribosome' },
      { key: 'D', text: 'Golgi Apparatus' }
    ],
    correct_option: 'B',
    answer: 'Mitochondria',
    explanation: 'Mitochondria generate most of the cell supply of ATP.',
    marks: 1,
    difficulty: 'easy',
    chapter_no: '1',
    chapter_name: 'Introduction to Biology'
  }
]

let SQL = []
const dbPath = require.resolve('../../al-siddique-backend/src/config/database')
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true, exports: {
    query: async (sql, args) => {
      SQL.push({ sql, args })
      if (sql.includes('FROM question_bank')) {
        if (args[0] === 1 && String(args[2]).toLowerCase() === 'biology') {
          return { rows: mockDraftRows }
        }
        return { rows: [] }
      }
      return { rows: [] }
    }
  }
}

const route = require('../../al-siddique-backend/src/routes/grade910VerifiedPickerRoutes')

test('draft candidates endpoint returns institutional draft with AI Advisory status and zero false approval', async () => {
  const app = express()
  app.use(route)
  const server = app.listen(0)
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`

  try {
    // 1. Unauthenticated request rejected
    const unauth = await fetch(base + '/draft-candidates?grade=9&subject=Biology')
    assert.equal(unauth.status, 401)

    // 2. Teacher can fetch draft questions
    const res = await fetch(base + '/draft-candidates?grade=9&subject=Biology', {
      headers: { 'x-qa-role': 'teacher' }
    })
    assert.equal(res.status, 200)
    const body = await res.json()
    assert.equal(body.success, true)
    assert.equal(body.tier, 'institutional-draft')
    assert.equal(body.academicallyApprovedOnly, false)
    assert.equal(body.records.length, 1)

    const rec = body.records[0]
    assert.equal(rec.originalQuestionId, 'IX-BIO-DRAFT-01')
    assert.equal(rec.tier, 'institutional-draft')
    assert.equal(rec.pipelineState, 'AI_ADVISORY')
    assert.equal(rec.academicallyApproved, false) // STRICT: zero falsification!
    assert.equal(rec.paperStudioSelectable, true)
    assert.equal(rec.paperPayload.finalQuestion.stem, 'Which organelle is known as the powerhouse of the cell?')
    assert.equal(rec.paperPayload.finalAnswer.correctOption, 'B')

    // 3. Resolve exact draft question
    const resolveRes = await fetch(base + '/resolve-draft?grade=9&subject=Biology&originalQuestionId=IX-BIO-DRAFT-01', {
      headers: { 'x-qa-role': 'teacher' }
    })
    assert.equal(resolveRes.status, 200)
    const resolveBody = await resolveRes.json()
    assert.equal(resolveBody.success, true)
    assert.equal(resolveBody.records[0].originalQuestionId, 'IX-BIO-DRAFT-01')
    assert.equal(resolveBody.records[0].academicallyApproved, false)

    // 4. Other school cannot access school 1 draft questions (Tenant Isolation)
    const peerRes = await fetch(base + '/draft-candidates?grade=9&subject=Biology', {
      headers: { 'x-qa-role': 'other' }
    })
    assert.equal(peerRes.status, 200)
    const peerBody = await peerRes.json()
    assert.equal(peerBody.records.length, 0)
  } finally {
    server.close()
  }
})
