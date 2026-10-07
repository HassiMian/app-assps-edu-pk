const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(path.resolve(__dirname, '../../al-siddique-frontend/src/Modules/attendance/AttendanceModule.jsx'), 'utf8')

test('attendance data is bound to class section and date scope', () => {
  assert.match(source, /const currentScopeKey = `\$\{selectedClass\}::\$\{selectedSection\}::\$\{selectedDate\}`/)
  assert.match(source, /const scopeMatches = loadedScopeKey === currentScopeKey/)
  assert.match(source, /setLoadedScopeKey\(requestScopeKey\)/)
})

test('attendance source failure preserves cached data but hides stale scope', () => {
  const block = source.match(/Could not load attendance[\s\S]{0,360}?finally/)?.[0] || ''
  assert.ok(block)
  assert.doesNotMatch(block, /setStudents\(\[\]\)|setAttendance\(\{\}\)/)
  assert.match(source, /const visibleStudents = scopeMatches \? students : \[\]/)
  assert.match(source, /const visibleAttendance = scopeMatches \? attendance : \{\}/)
})

test('attendance save cannot submit a stale or unavailable scope', () => {
  assert.match(source, /if \(!scopeMatches\) \{[\s\S]{0,160}Attendance for the selected class, section and date is not loaded yet\./)
  assert.match(source, /Object\.entries\(visibleAttendance\)/)
})
