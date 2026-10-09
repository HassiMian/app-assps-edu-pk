import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { buildPlanDates } from '../../lessonPlanDateSchedule.js'
const modulePath=fileURLToPath(new URL('../../lessonPlanDateSchedule.js',import.meta.url))

test('month-end monthly and annual plans clamp each original desired day without skipping months',()=>{
 assert.deepEqual(buildPlanDates('2026-01-31','monthly',4),['2026-01-31','2026-02-28','2026-03-31','2026-04-30'])
 assert.deepEqual(buildPlanDates('2028-01-31','monthly',4),['2028-01-31','2028-02-29','2028-03-31','2028-04-30'])
 assert.deepEqual(buildPlanDates('2026-12-31','monthly',3),['2026-12-31','2027-01-31','2027-02-28'])
 const annual=buildPlanDates('2026-01-31','annual',12)
 assert.equal(annual.length,12);assert.equal(annual[1],'2026-02-28');assert.equal(annual[10],'2026-11-30')
 console.log('MONTH_END_CLAMPED_2026',JSON.stringify(annual))
})
test('daily skips weekends and weekly stays on real Mondays',()=>{
 assert.deepEqual(buildPlanDates('2026-10-09','daily',1),['2026-10-09','2026-10-12','2026-10-13','2026-10-14','2026-10-15'])
 assert.deepEqual(buildPlanDates('2026-10-05','weekly',3),['2026-10-05','2026-10-12','2026-10-19'])
 assert.deepEqual(buildPlanDates('2026-10-07','weekly',2),['2026-10-12','2026-10-19'])
 assert.deepEqual(buildPlanDates('2026-10-05','term',2),['2026-10-05','2026-10-12'])
})
test('invalid date-only source is rejected without mutation or infinite iteration',()=>{
 for(const date of ['2026-02-30','2026-13-01','2026-00-01','2026-1-1','',null]) assert.deepEqual(buildPlanDates(date,'monthly',3),[])
 assert.deepEqual(buildPlanDates('2026-10-05','weekly',0),[])
})
test('dates are byte-identical across Pakistan, North America and UTC host timezones',()=>{
 const source=`import {buildPlanDates} from ${JSON.stringify('file://'+modulePath)};console.log(JSON.stringify([buildPlanDates('2026-01-31','annual',12),buildPlanDates('2026-10-05','weekly',4),buildPlanDates('2026-10-09','daily',1)]))`
 const values=[]
 for(const zone of ['Asia/Karachi','America/Los_Angeles','UTC']){
  const p=spawnSync(process.execPath,['--input-type=module','-e',source],{env:{...process.env,TZ:zone},encoding:'utf8'})
  assert.equal(p.status,0,p.stderr);values.push(JSON.parse(p.stdout.trim()))
 }
 assert.deepEqual(values[0],values[1]);assert.deepEqual(values[1],values[2]);console.log('THREE_TIMEZONE_PARITY_PASS')
})
