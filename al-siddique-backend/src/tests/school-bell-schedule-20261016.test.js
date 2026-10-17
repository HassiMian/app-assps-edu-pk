'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { schoolBellSchedule } = require('../domain/schoolBellSchedule')

const duration = (s) => {
  const minutes = t => Number(t.slice(0,2))*60 + Number(t.slice(3,5))
  return minutes(s.end) - minutes(s.start)
}

test('school-scoped published timetable never leaks to other tenants', () => {
  assert.equal(schoolBellSchedule(2), null)
  assert.equal(schoolBellSchedule(null), null)
  assert.equal(schoolBellSchedule(-1), null)
  assert.equal(schoolBellSchedule('1').school_id, 1)
})

test('Regular school day has 8 periods, assembly and 25-minute break, exactly 08:30–13:30', () => {
  const s=schoolBellSchedule(1)
  const a=s.regular
  assert.equal(a.length, 10)
  assert.equal(a[0].label, 'Assembly')
  assert.equal(a[0].start, '08:30')
  assert.equal(a.at(-1).end, '13:30')
  assert.equal(a.filter(x=>x.label.startsWith('Period ')).length,8)
  assert.equal(duration(a.find(x=>x.label==='Period 1')),40)
  assert.equal(duration(a.find(x=>x.label==='Period 8')),40)
  assert.equal(duration(a.find(x=>x.label==='Break')),25)
  assert.equal(a.find(x=>x.label==='Break').order,7)
  for(let i=1;i<a.length;i++) assert.equal(a[i-1].end,a[i].start)
  assert.equal(a.reduce((n,x)=>n+duration(x),0),300)
})

test('Friday exactly 08:30–12:30 with 8 periods and no break', () => {
  const s=schoolBellSchedule(1)
  const a=s.friday
  assert.equal(a.length,9)
  assert.equal(a[0].start,'08:30')
  assert.equal(a.at(-1).end,'12:30')
  assert.equal(a.filter(x=>x.label.startsWith('Period ')).length,8)
  assert.equal(a.some(x=>x.label.toLowerCase().includes('break')),false)
  for(let i=1;i<a.length;i++) assert.equal(a[i-1].end,a[i].start)
  assert.equal(a.reduce((n,x)=>n+duration(x),0),240)
})

test('version and day mapping are stable for every consumer', () => {
  const s=schoolBellSchedule(1)
  assert.equal(s.version,'assps-school1-bells-20261016-v1')
  assert.deepEqual(s.regular_days,['Monday','Tuesday','Wednesday','Thursday','Saturday'])
  assert.equal(s.friday_day,'Friday')
  assert.equal(Object.isFrozen(s.regular),true)
  assert.equal(Object.isFrozen(s.friday),true)
})
