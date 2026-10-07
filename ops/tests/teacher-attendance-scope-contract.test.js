const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const attendance = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-backend/src/routes/attendanceRoutes.js'), 'utf8')
const students = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-backend/src/routes/studentRoutes.js'), 'utf8')

test('teacher roster reads fail explicitly when assignments are not configured', () => {
  assert.match(students, /code: 'TEACHER_ASSIGNMENTS_REQUIRED'/)
  assert.match(students, /await requireTeacherAssignmentsForStudentRead\(req, res\)/)
  assert.match(attendance, /code: 'TEACHER_ASSIGNMENTS_REQUIRED'/)
  assert.match(attendance, /await requireTeacherAssignmentsForAttendance\(req, res\)/)
})

test('teacher attendance writes are assignment scoped and actor identity cannot be spoofed', () => {
  assert.match(attendance, /if \(actorRole === 'teacher'\) \{[\s\S]{0,220}teacherStudentScopeClause\(req, 'students', pIdx\)/)
  assert.match(attendance, /const markedByUserId = actorRole === 'teacher'[\s\S]{0,100}\? authenticatedActorId/)
})
