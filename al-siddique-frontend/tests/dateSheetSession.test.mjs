import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAcademicSession, pickDateSheetSession, dateSheetSessionOptions } from '../src/Modules/dateSheetSession.js'

test('normalize academic year from portal and reject malformed or stale values', () => {
  assert.equal(normalizeAcademicSession('2026-27'), '2026-2027')
  assert.equal(normalizeAcademicSession('2026-2027'), '2026-2027')
  assert.equal(normalizeAcademicSession('2026 / 2027'), '2026-2027')
  assert.equal(normalizeAcademicSession('2026-2022'), '')
  assert.equal(normalizeAcademicSession(''), '')
})
test('empty/late academic store does not result in blank select state', () => {
  assert.equal(pickDateSheetSession('', '', []), '2026-2027')
  assert.equal(pickDateSheetSession('2027-2028', '', []), '2027-2028')
})
test('saved server sessions are authoritative over obsolete academic year defaults', () => {
  const rows = [{ session: '2026-2027', term: 'First Term Exam' }]
  assert.equal(pickDateSheetSession('2027-2028', '', rows), '2026-2027')
  assert.equal(pickDateSheetSession('2026-2027', '', rows), '2026-2027')
  assert.equal(pickDateSheetSession('2027-2028', '', [{session:'2027-2028'},{session:'2026-2027'}]), '2027-2028')
})
test('session dropdown options cover live persisted values and future active session', () => {
  assert.deepEqual(dateSheetSessionOptions([{session:'2028-2029'}], '2028-2029', '', '2028-2029','2028-2029'),
    ['2026-2027','2027-2028','2028-2029'])
})
