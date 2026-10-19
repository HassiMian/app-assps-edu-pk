import {test} from 'node:test'
import assert from 'node:assert/strict'
import {buildGuardedDayPayload,submitGuardedDay} from '../src/Modules/timetable/guardedDaySave.js'

const hash = 'a'.repeat(64)
const bells = {
  school_id:1, version:'signed-school1-v1', academic_session:'2026–27',
  regular:Array.from({length:8},(_,i)=>({label:'Period '+(i+1),start:'09:00',end:'09:30'})),
  friday:Array.from({length:8},(_,i)=>({label:'Period '+(i+1),start:'09:00',end:'09:20'}))
}
const originals = Array.from({length:8},(_,i)=>({
  period_label:'Period '+(i+1),subject:'English',teacher_id:42,teacher_display_name:'Miss Approved',
  source_sha256:hash,staff_identity_reviewed:true,room:'12'
}))
const snapshot = {expected_snapshot_sha256:'b'.repeat(64),entries:originals}
const assignments = Object.fromEntries(['Monday','Friday'].map(d=>[d,Object.fromEntries(
  Array.from({length:8},(_,i)=>['Period '+(i+1),{
    subject:'Science',teacher:'Miss Approved',teacher_id:42,start_time:'00:00',end_time:'23:59'
  }])
)]))
const defaults = {schoolClass:'Five',section:'Blue',day:'Monday',numPeriods:8,assignments,bells,snapshot}
const build = override => buildGuardedDayPayload({...defaults,...override})

test('one-day payload keeps eight reviewed periods, server snapshot and versioned bells',()=>{
  const p = build({})
  assert.deepEqual(Object.keys(p).sort(), ['academic_session','class_name','day_name','entries',
    'expected_snapshot_sha256','schedule_version','section','source_sha256'].sort())
  assert.equal(p.entries.length,8)
  assert.equal(p.entries[0].teacher_id,42)
  assert.equal(p.entries[0].start_time,'09:00')
  assert.equal(p.entries[0].end_time,'09:30')
  assert.equal(p.entries[0].room,'12')
  assert.equal(p.source_sha256,hash)
  assert.equal(p.expected_snapshot_sha256,'b'.repeat(64))
})
test('Friday gets versioned Friday bells; not stale editable UI clock',()=>{
  assert.equal(build({day:'Friday'}).entries[0].end_time,'09:20')
})
test('reject malformed scopes, missing identities and unreviewed sources before sending',()=>{
  const cases=[
    {schoolClass:'School-wide'}, {section:''},{day:'Sunday'},{numPeriods:7},
    {bells:{...bells,school_id:2}},
    {bells:{...bells,regular:bells.regular.slice(0,7)}},
    {snapshot:{...snapshot,expected_snapshot_sha256:''}},
    {snapshot:{...snapshot,entries:originals.slice(0,7)}},
    {snapshot:{...snapshot,entries:originals.map((e,i)=>i===0?Object.fromEntries(Object.entries(e).filter(([k])=>k!=='room')):e)}},
    {snapshot:{...snapshot,entries:originals.map((e,i)=>({...e,source_sha256:i?'b'.repeat(64):hash}))}},
    {snapshot:{...snapshot,entries:originals.map((e,i)=>({...e,staff_identity_reviewed:i?false:true}))}},
    {assignments:{Monday:{...assignments.Monday,'Period 1':{...assignments.Monday['Period 1'],teacher_id:null}}}},
    {assignments:{Monday:{...assignments.Monday,'Period 1':{...assignments.Monday['Period 1'],teacher:' '}}}},
    {assignments:{Monday:{...assignments.Monday,'Period 1':{...assignments.Monday['Period 1'],subject:''}}}}
  ]
  cases.forEach((change,i)=>assert.throws(()=>build(change),Error,'invalid case '+i))
})
test('network flow always reads scoped bells and snapshot before exactly one guarded POST',async()=>{
  const calls=[]
  const api={
    async get(path,opts) {
      calls.push({method:'GET',path,opts})
      return path.endsWith('/bells')?{data:{success:true,data:bells}}:{data:{success:true,...snapshot}}
    },
    async post(path,payload) {calls.push({method:'POST',path,payload});return {data:{success:true}}}
  }
  const result=await submitGuardedDay({api,...defaults})
  assert.equal(result.data.success,true)
  assert.deepEqual(calls.map(c=>c.method+' '+c.path),[
    'GET /api/timetable/bells','GET /api/timetable/snapshot','POST /api/timetable/save'])
  assert.deepEqual(calls[1].opts.params,{class_name:'Five',section:'Blue',day_name:'Monday',academic_session:'2026–27'})
  assert.equal(calls[2].payload.entries.length,8)
  assert.equal(calls[2].payload.day_name,'Monday')
})
test('missing snapshot or unreviewed source fails closed without a POST',async()=>{
  let posts=0
  const api={
    async get(p){return p.endsWith('bells')?{data:{success:true,data:bells}}:{data:{success:true,...snapshot,entries:originals.slice(0,7)}}},
    async post(){posts++}
  }
  await assert.rejects(submitGuardedDay({api,...defaults}),/SNAPSHOT/)
  assert.equal(posts,0)
})
test('HTTP 403 legacy save denial is propagated; no insecure fallback',async()=>{
  let posts=0
  const api={
    async get(p){return p.endsWith('bells')?{data:{success:true,data:bells}}:{data:{success:true,...snapshot}}},
    async post(){posts++; throw Object.assign(new Error('TIMETABLE_MANAGER_REQUIRED'),{response:{status:403}})}
  }
  await assert.rejects(submitGuardedDay({api,...defaults}),/TIMETABLE_MANAGER_REQUIRED/)
  assert.equal(posts,1)
})

test('null room roundtrips exactly',()=>{const s={...snapshot,entries:originals.map(e=>({...e,room:null}))};assert.equal(build({snapshot:s}).entries[0].room,null)})

test('overlong snapshot room never silently truncates',()=>{const s={...snapshot,entries:originals.map((e,i)=>i===0?{...e,room:'X'.repeat(121)}:e)};assert.throws(()=>build({snapshot:s}),/ROOM_SNAPSHOT_REQUIRED/)})
