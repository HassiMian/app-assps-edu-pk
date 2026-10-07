const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const file = path.resolve(__dirname, '../services/paperStudioProjectionService.js')
const source = fs.readFileSync(file, 'utf8')

test('G43 list projection does not select full paper payload', () => {
  const start = source.indexOf('async function listProjectedPapers')
  const end = source.indexOf('async function getProjectedPaper', start)
  const block = source.slice(start, end)
  assert.ok(start >= 0 && end > start)
  assert.doesNotMatch(block, /\bpayload\b/)
  assert.match(block, /SELECT id, owner_user_id, name, class_name, section, subject_name, status, revision, created_at, updated_at/)
})

test('G43 detail and create retain authoritative document payload', () => {
  const detailStart = source.indexOf('async function getProjectedPaper')
  const detail = source.slice(detailStart)
  assert.match(detail, /revision, payload, created_at, updated_at/)
  assert.match(detail, /document: row\.payload/)
  const createStart = source.indexOf('async function createProjectedPaper')
  const serializeStart = source.indexOf('function serializePaper', createStart)
  const create = source.slice(createStart, serializeStart)
  assert.match(create, /RETURNING id, owner_user_id, name, class_name, section, subject_name, status, revision, payload, created_at, updated_at/)
  assert.match(create, /document: row\.payload/)
})

test('G43 list serializer is explicitly metadata-only', () => {
  const start = source.indexOf('function serializePaper')
  const end = source.indexOf('async function teacherContext', start)
  const block = source.slice(start, end)
  assert.doesNotMatch(block, /paper_json|row\.payload|payload\?\./)
  assert.match(block, /source: 'canonical-paper-projection'/)
})
