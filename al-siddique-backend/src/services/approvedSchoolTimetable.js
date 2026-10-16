'use strict'
// ASSPS approved institutional timetable, supplied 16 October 2026.
// Source of timing: explicit principal instruction, NOT legacy timetable.start_time.
// Changing this policy requires a reviewed replacement version and acceptance tests.
const SCHOOL_ID = 1
const VERSION = 'ASSPS-2026-10-16-V1'
const SOURCE_SHAS = Object.freeze(['263941c69d939a6dafaa8288097f423a95087333679a4edb9963767efd667589','e182d9616f300e731e3e3dc957bc43934ef1f574b7b564714d433726c03fc724'])
const REGULAR = [
 ['Assembly','08:30','08:45'],['Period 1','08:45','09:25'],
 ['Period 2','09:25','09:55'],['Period 3','09:55','10:25'],
 ['Period 4','10:25','10:55'],['Period 5','10:55','11:25'],
 ['Period 6','11:25','11:55'],['Break','11:55','12:20'],
 ['Period 7','12:20','12:50'],['Period 8','12:50','13:30']
]
const FRIDAY = [
 ['Assembly','08:30','08:45'],['Period 1','08:45','09:20'],
 ['Period 2','09:20','09:50'],['Period 3','09:50','10:15'],
 ['Period 4','10:15','10:40'],['Period 5','10:40','11:05'],
 ['Period 6','11:05','11:30'],['Period 7','11:30','12:00'],
 ['Period 8','12:00','12:30']
]
const VALID_DAYS = new Set(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])
const JUNIOR_INCHARGES = Object.freeze({
 'starter|blue':{name:'Miss Mubeen',staff:['Miss Mubeen']},
 'mover|purple':{name:null,staff:['Miss Laiba','Miss Abida'],note:'Primary incharge not designated; both are assigned teachers'},
 'flyer|pink':{name:'Miss Mubeen',staff:['Miss Mubeen']},
 'one|yellow':{name:'Miss Amina',staff:['Miss Amina']},
 'two|orange':{name:'Miss Aasia',staff:['Miss Aasia']},
 'three|red':{name:'Miss Alisha',staff:['Miss Alisha']}
})
const studentGroupKey=(cls,section)=>String(cls||'').trim().toLowerCase()+'|'+String(section||'').trim().toLowerCase()
const getKarachiDay=(instant=new Date())=>new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'Asia/Karachi'}).format(instant)
const clockMinutes=x=>{const [h,m]=x.split(':').map(Number);return h*60+m}
const rowsForDay=(day)=>{
 if(!VALID_DAYS.has(day))throw new Error('INVALID_SCHOOL_WEEKDAY')
 const source=day==='Sunday'?[]:day==='Friday'?FRIDAY:REGULAR
 return source.map(([label,start,end])=>({label,start,end,duration_minutes:clockMinutes(end)-clockMinutes(start),kind:label==='Assembly'?'assembly':label==='Break'?'break':'teaching'}))
}
function buildChildTimetable(student,dbRows,day) {
 const periods=rowsForDay(day)
 const scheduleByLabel=new Map(periods.map(p=>[p.label,p]))
 const key=studentGroupKey(student.class,student.section)
 const junior=JUNIOR_INCHARGES[key]
 const rows=dbRows.filter(r=>studentGroupKey(r.class_name,r.section)===key)
 const p1=rows.find(r=>r.period_label==='Period 1')
 const incharge=junior ? {name:junior.name,teachers:junior.staff,source:'principal-fixed',staff_identity_verified:false,note:junior.note||null}
 : p1 ? {name:p1.teacher_display_name,teachers:[p1.teacher_display_name],source:'verified-first-period',staff_identity_verified:p1.teacher_id!=null,note:null}
 : {name:null,teachers:[],source:'not-yet-verified',staff_identity_verified:false,note:null}
 const byPeriod=new Map(rows.map(r=>[r.period_label,r]))
 const entries=periods.map(p=>{
   const record=byPeriod.get(p.label)
   return {...p,subject:record?.subject||null,teacher:record?.teacher_display_name||null,
     teacher_account_linked:record?.teacher_id!=null,period_verified:Boolean(record)}
 })
 return {
   student_id:student.id,name:student.name,class:student.class,section:student.section,
   class_incharge:incharge,teacher_labels:junior?junior.staff:[],
   timetable_status:rows.length===8?'complete':junior?'junior-subject-allocation-pending':'unverified',
   // No fake subjects for junior classes and no unsupported Eight/Pre-Nine aliasing.
   periods:entries
 }
}
module.exports={SCHOOL_ID,SOURCE_SHAS,VERSION,VALID_DAYS,REGULAR,FRIDAY,JUNIOR_INCHARGES,getKarachiDay,rowsForDay,buildChildTimetable,studentGroupKey}
