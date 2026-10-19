'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const fs=require('node:fs'),path=require('node:path')
const g=require('../services/timetableWriteGuard')
const bells=require('../domain/schoolBellSchedule').schoolBellSchedule(1)
const opts={sourceSha:g.APPROVED_SHA,attested:true}
const fail=(f,code)=>assert.throws(f,e=>e.code===code)
const actor=(role='principal',school_id=1)=>({user:{id:98,role,school_id},school_id,body:{}})
function input(day='Monday'){
 return {class_name:'Five',section:'Blue',day_name:day,academic_session:bells.academic_session,
 schedule_version:bells.version,source_sha256:g.APPROVED_SHA,expected_snapshot_sha256:'f'.repeat(64),
 entries:(day==='Friday'?bells.friday:bells.regular).filter(x=>x.label.startsWith('Period ')).map(s=>
 ({period_label:s.label,start_time:s.start,end_time:s.end,teacher_id:77,teacher_display_name:'Test Teacher',subject:'Science'}))}
}
test('verified principal manager accepted',()=>assert.equal(g.authority(actor()).schoolId,1))
test('teachers, clerks, anonymous and superadmins cannot write',()=>{for(const role of ['teacher','staff','clerk','','super_admin'])fail(()=>g.authority(actor(role)),'TIMETABLE_MANAGER_REQUIRED')})
test('no default School1, no peer tenant override',()=>{fail(()=>g.authority({user:{id:9,role:'principal',school_id:1},body:{}}),'TIMETABLE_VERIFIED_SCHOOL_ACTOR_REQUIRED');fail(()=>g.authority({...actor(),school_id:2}),'TIMETABLE_VERIFIED_SCHOOL_ACTOR_REQUIRED');fail(()=>g.authority({...actor(),body:{school_id:2}}),'TIMETABLE_SCHOOL_OVERRIDE_DENIED')})
test('source attestation blocked until independently reviewed',()=>fail(()=>g.normalize(input(),bells,{sourceSha:g.APPROVED_SHA}),'TIMETABLE_SOURCE_ATTESTATION_HOLD'))
test('valid Monday and Friday eight periods correct',()=>{for(const day of ['Monday','Friday']){const r=g.normalize(input(day),bells,opts);assert.equal(r.entries.length,8);assert.equal(r.entries[4].period_label,'Period 5');assert.equal(r.entries[7].end_time,day==='Friday'?'12:30':'13:30')}})
test('empty and missing period blocked',()=>{for(const rows of [[],input().entries.slice(1)]){const p=input();p.entries=rows;fail(()=>g.normalize(p,bells,opts),'TIMETABLE_EIGHT_PERIODS_REQUIRED')}})
test('duplicate period blocked',()=>{const p=input();p.entries[7]={...p.entries[0]};fail(()=>g.normalize(p,bells,opts),'TIMETABLE_PERIOD_DUPLICATE_OR_INVALID')})
test('wrong bell time, Friday break and Regular writes blocked',()=>{const p=input();p.entries[0].start_time='08:15';fail(()=>g.normalize(p,bells,opts),'TIMETABLE_OFFICIAL_TIME_REQUIRED');const q=input('Friday');q.entries[7].period_label='Break';fail(()=>g.normalize(q,bells,opts),'TIMETABLE_PERIOD_DUPLICATE_OR_INVALID');const x=input();x.day_name='Regular';fail(()=>g.normalize(x,bells,opts),'TIMETABLE_DAY_INVALID')})
test('fabricated teacher ID, blank subject and stale version blocked',()=>{const p=input();p.entries[0].teacher_id='77oops';fail(()=>g.normalize(p,bells,opts),'TIMETABLE_TEACHER_ID_REQUIRED');const q=input();q.entries[0].subject=' ';fail(()=>g.normalize(q,bells,opts),'TIMETABLE_SUBJECT_REQUIRED');const x=input();x.schedule_version='old';fail(()=>g.normalize(x,bells,opts),'TIMETABLE_BELL_VERSION_MISMATCH')})
test('old source hash and missing optimistic concurrency rejected',()=>{const p=input();p.source_sha256='a'.repeat(64);fail(()=>g.normalize(p,bells,opts),'TIMETABLE_APPROVED_SOURCE_MISMATCH');const q=input();delete q.expected_snapshot_sha256;fail(()=>g.normalize(q,bells,opts),'TIMETABLE_IF_MATCH_REQUIRED')})
test('existing rows must be complete and same revision',()=>{const rows=input().entries.map(r=>({...r,source_sha256:g.APPROVED_SHA,staff_identity_reviewed:true}));g.matchSnapshot(rows,g.digest(rows));g.matchSnapshot([...rows].reverse(),g.digest(rows));fail(()=>g.matchSnapshot(rows,'0'.repeat(64)),'TIMETABLE_CONCURRENT_MODIFICATION');fail(()=>g.matchSnapshot(rows.slice(0,7),g.digest(rows)),'TIMETABLE_EXISTING_SLICE_UNVERIFIED')})
test('source route has serializable lock, safe role guard and transaction rollback',()=>{
 const r=fs.readFileSync(path.join(__dirname,'../routes/timetableRoutes.js'),'utf8')
 for(const x of ['writeGuard.authority(req)','ISOLATION LEVEL SERIALIZABLE','pg_advisory_xact_lock','writeGuard.matchSnapshot','applyTenantContext(client)','TIMETABLE_STAFF_IDENTITY_REVIEW_REQUIRED',"client.query('ROLLBACK')"])
  assert.ok(r.includes(x),x)
 assert.ok(!r.includes('req.user?.school_id || 1'),'never fallback to School1')
})
