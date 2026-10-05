const test = require('node:test')
const assert = require('node:assert/strict')

// Pure behavior is covered indirectly through the service contract in integration tests.
// This file protects the public error shape used by student/admission routes.
const { AcademicAssignmentError } = require('../services/academicAssignmentGuard')

test('academic assignment errors are explicit 422 domain errors', () => {
  const err = new AcademicAssignmentError('UNKNOWN_CLASS', 'Unknown class', { className: 'X' })
  assert.equal(err.status, 422)
  assert.equal(err.code, 'UNKNOWN_CLASS')
  assert.deepEqual(err.details, { className: 'X' })
})
