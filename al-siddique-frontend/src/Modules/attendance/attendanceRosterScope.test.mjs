import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {activeAttendanceRosterParams} from './attendanceRosterScope.js'
const dir=path.dirname(fileURLToPath(import.meta.url))

test('attendance roster always requests only active students of selected class and section',()=>{
  assert.deepEqual(activeAttendanceRosterParams({className:'Seven',section:'Blue'}),{
    class:'Seven',section:'Blue',active:'true'
  })
  assert.deepEqual(activeAttendanceRosterParams({className:'Starter',section:'A'}),{
    class:'Starter',section:'A',active:'true'
  })
})
test('attendance roster never substitutes school-wide scope for specific class',()=>{
  const obj=activeAttendanceRosterParams({className:'Class Three',section:'Red'})
  assert.equal(obj.class,'Class Three')
  assert.equal(obj.section,'Red')
  assert.equal(obj.active,'true')
})
test('both attendance screens use the common active-filtered source',()=>{
  for(const name of ['MarkAttendance.jsx','AttendanceModule.jsx']){
    const source=fs.readFileSync(path.join(dir,name),'utf8')
    const studentRequests=[...source.matchAll(/api\.get\('\/api\/students',\s*\{[^)]*/g)]
    assert.equal(studentRequests.length,1,name+' must have exactly one canonical roster request')
    assert.match(studentRequests[0][0],/activeAttendanceRosterParams\(/,name)
  }
})
