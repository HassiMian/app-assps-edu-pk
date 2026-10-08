import { test } from 'node:test'
import assert from 'node:assert/strict'
import { userRoleLabel } from '../userRoleLabel.js'

test('role-specific labels never misidentify teachers as principals', () => {
  assert.equal(userRoleLabel({ role: 'teacher' }), 'Teacher')
  assert.equal(userRoleLabel({ role: 'principal' }), 'Principal')
  assert.equal(userRoleLabel({ role: 'admin' }), 'Administrator')
  assert.equal(userRoleLabel({ role: 'school_admin' }), 'School Administrator')
  assert.equal(userRoleLabel({ role: 'student' }), 'Student')
})

test('explicit designation has priority and blank values fall back to role', () => {
  assert.equal(userRoleLabel({ role: 'teacher', designation: 'Science Teacher' }), 'Science Teacher')
  assert.equal(userRoleLabel({ role: 'teacher', designation: '  ' }), 'Teacher')
  assert.equal(userRoleLabel({ role: 'unknown' }), 'School Staff')
  assert.equal(userRoleLabel(null), 'School Staff')
})
