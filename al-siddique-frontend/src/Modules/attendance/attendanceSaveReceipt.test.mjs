import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const dir=path.dirname(fileURLToPath(import.meta.url))
import {validateAttendanceSaveReceipt, countAcceptedAttendanceAlerts} from './attendanceSaveReceipt.js'

test('exact backend acknowledgement permits success for all requested records',()=>{
  assert.equal(validateAttendanceSaveReceipt({success:true,savedCount:3,requestedCount:3},3),true)
  assert.equal(validateAttendanceSaveReceipt({success:true,savedCount:0,requestedCount:0},0),false)
})
test('incomplete, missing, or false acknowledgements cannot claim saved attendance',()=>{
  const cases=[
    {success:false,savedCount:3,requestedCount:3},
    {success:true,savedCount:2,requestedCount:3},
    {success:true,savedCount:3,requestedCount:2},
    {success:true},null,
  ]
  for(const c of cases) assert.equal(validateAttendanceSaveReceipt(c,3),false)
})
test('provider failures and not configured statuses are not counted as accepted alerts',()=>{
  assert.equal(countAcceptedAttendanceAlerts({queued:2,accepted:1,sent:1,failed:5,not_configured:3,skipped:2}),4)
  assert.equal(countAcceptedAttendanceAlerts({failed:3}),0)
  assert.equal(countAcceptedAttendanceAlerts(null),0)
})

test('both attendance screens require exact save acknowledgement before success UI',()=>{
  for (const component of ['MarkAttendance.jsx','AttendanceModule.jsx']){
    const source=fs.readFileSync(path.join(dir,component),'utf8')
    assert.match(source,/validateAttendanceSaveReceipt\(response\.data,\s*records\.length\)/)
  }
})
