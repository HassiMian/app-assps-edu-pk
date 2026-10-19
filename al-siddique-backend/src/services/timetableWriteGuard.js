'use strict'
const {createHash,timingSafeEqual}=require('node:crypto')
const MANAGERS=new Set(['principal','school_admin','admin','headmaster'])
const APPROVED_SHA='9ac81002d2bc67cc748ece72b637c6cc081c8e1f23d1551d594031deea7e70c4'
const DAYS=new Set(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
class GateError extends Error {constructor(status,code){super(code);this.status=status;this.code=code}}
const reject=(status,code)=>{throw new GateError(status,code)}
function id(value){const s=String(value??'');const n=Number(s);return /^[1-9]\d*$/.test(s)&&Number.isSafeInteger(n)?n:null}
function secureEqual(a,b){return /^[a-f0-9]{64}$/.test(String(a||''))&&/^[a-f0-9]{64}$/.test(String(b||''))&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'))}
function authority(req){
 const u=req.user||{}
 if(!MANAGERS.has(String(u.role||'').toLowerCase()))reject(403,'TIMETABLE_MANAGER_REQUIRED')
 const sid=id(u.school_id)
 if(!sid||sid!==id(req.school_id)||!id(u.id))reject(403,'TIMETABLE_VERIFIED_SCHOOL_ACTOR_REQUIRED')
 for(const v of [req.body?.school_id,req.body?.schoolId,req.query?.school_id,req.headers?.['x-school-id']])
  if(v!==undefined&&id(v)!==sid)reject(403,'TIMETABLE_SCHOOL_OVERRIDE_DENIED')
 return {schoolId:sid,actorId:id(u.id)}
}
const val=(x,label,max=160)=>{if(typeof x!=='string'||!x.trim()||x.trim().length>max)reject(422,label);return x.trim()}
const time=v=>{const s=String(v||'');return /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(s)?s.slice(0,5):null}
function normalize(body,bells,{sourceSha,attested=false}={}){
 if(!bells||!id(bells.school_id))reject(503,'TIMETABLE_BELLS_MISSING')
 if(!attested||!secureEqual(sourceSha,APPROVED_SHA))reject(409,'TIMETABLE_SOURCE_ATTESTATION_HOLD')
 if(!body||typeof body!=='object'||Array.isArray(body))reject(422,'TIMETABLE_BODY_REQUIRED')
 const cls=val(body.class_name,'TIMETABLE_CLASS_REQUIRED',80)
 if(cls.toLowerCase()==='school-wide')reject(403,'TIMETABLE_SCHOOLWIDE_READ_ONLY')
 const section=val(body.section,'TIMETABLE_SECTION_REQUIRED',80)
 const day=val(body.day_name,'TIMETABLE_DAY_REQUIRED',20)
 if(!DAYS.has(day))reject(422,'TIMETABLE_DAY_INVALID')
 const session=val(body.academic_session,'TIMETABLE_SESSION_REQUIRED',30)
 if(session!==bells.academic_session||body.schedule_version!==bells.version)reject(409,'TIMETABLE_BELL_VERSION_MISMATCH')
 if(!secureEqual(body.source_sha256,sourceSha))reject(409,'TIMETABLE_APPROVED_SOURCE_MISMATCH')
 if(!/^[a-f0-9]{64}$/.test(String(body.expected_snapshot_sha256||'')))reject(428,'TIMETABLE_IF_MATCH_REQUIRED')
 if(!Array.isArray(body.entries)||body.entries.length!==8)reject(422,'TIMETABLE_EIGHT_PERIODS_REQUIRED')
 const slots=(day==='Friday'?bells.friday:bells.regular).filter(x=>/^Period [1-8]$/.test(x.label))
 if(slots.length!==8)reject(503,'TIMETABLE_OFFICIAL_BELLS_INVALID')
 const sorted=new Map()
 for(const e of body.entries){
  const n=/^Period ([1-8])$/.exec(String(e?.period_label||''))
  if(!n||sorted.has(Number(n[1])))reject(422,'TIMETABLE_PERIOD_DUPLICATE_OR_INVALID')
  const slot=slots.find(x=>x.label===e.period_label)
  if(time(e.start_time)!==slot?.start||time(e.end_time)!==slot?.end)reject(422,'TIMETABLE_OFFICIAL_TIME_REQUIRED')
  if(!Object.prototype.hasOwnProperty.call(e,'room') || (e.room!==null && (typeof e.room!=='string' || e.room.length>120)))reject(422,'TIMETABLE_ROOM_SNAPSHOT_REQUIRED')
  const teacher=id(e.teacher_id)
  if(!teacher)reject(422,'TIMETABLE_TEACHER_ID_REQUIRED')
  sorted.set(Number(n[1]),{period_label:e.period_label,start_time:slot.start,end_time:slot.end,subject:val(e.subject,'TIMETABLE_SUBJECT_REQUIRED'),teacher_id:teacher,teacher_display_name:val(e.teacher_display_name,'TIMETABLE_TEACHER_NAME_REQUIRED'),room:e.room})
 }
 return {class_name:cls,section,day_name:day,academic_session:session,entries:Array.from({length:8},(_,i)=>sorted.get(i+1)),expected_snapshot_sha256:body.expected_snapshot_sha256,source_sha256:sourceSha}
}
function digest(rows){
 const normalized=rows.map(r=>({period_label:r.period_label,start_time:time(r.start_time),end_time:time(r.end_time),teacher_id:id(r.teacher_id),teacher_display_name:String(r.teacher_display_name||'').trim(),subject:String(r.subject||'').trim(),room:r.room==null?null:String(r.room),source_sha256:String(r.source_sha256||'').trim(),staff_identity_reviewed:r.staff_identity_reviewed===true})).sort((a,b)=>a.period_label.localeCompare(b.period_label,undefined,{numeric:true}))
 return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}
function matchSnapshot(rows,expected){
 if(!Array.isArray(rows)||rows.length!==8||new Set(rows.map(x=>x.period_label)).size!==8||!rows.every(x=>/^Period [1-8]$/.test(x.period_label)))reject(409,'TIMETABLE_EXISTING_SLICE_UNVERIFIED')
 if(!secureEqual(digest(rows),expected))reject(409,'TIMETABLE_CONCURRENT_MODIFICATION')
}
module.exports={GateError,APPROVED_SHA,authority,normalize,digest,matchSnapshot}
