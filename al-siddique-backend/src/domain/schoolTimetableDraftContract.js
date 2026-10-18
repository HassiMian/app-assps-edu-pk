'use strict'
// Non-publishing, versioned timetable drafts. Never links teacher display names
// to employee accounts or changes historic/published timetable records.
const DAYS=Object.freeze(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])
function cleanText(value,max) {
 if(typeof value!=='string')return null
 const x=value.trim()
 if(x.length>max || /[<>\u0000-\u001f]/u.test(x))return null
 return x
}
function validateTimetableDraft(payload) {
 const errors=[]
 const schoolClass=cleanText(payload?.class_name,80)
 const section=cleanText(payload?.section,80)
 const session=cleanText(payload?.academic_session,32)
 if(!schoolClass || !/^[\w \-]+$/u.test(schoolClass))errors.push('CLASS_REQUIRED')
 if(section===null || !section || !/^[\w \-]+$/u.test(section))errors.push('SECTION_REQUIRED')
 if(!session || !/^20\d{2}[–-]\d{2}$/u.test(session))errors.push('SESSION_REQUIRED')
 const rows=payload?.days
 if(!Array.isArray(rows) || rows.length!==6)errors.push('SIX_WEEKDAYS_REQUIRED')
 const seen=new Set()
 const days=[]
 if(Array.isArray(rows)){
 for(const day of rows){
  if(!DAYS.includes(day?.day)||seen.has(day.day)){errors.push('INVALID_OR_DUPLICATE_DAY');continue}
  seen.add(day.day)
  if(!Array.isArray(day.periods)||day.periods.length!==8){errors.push('EIGHT_PERIODS_REQUIRED');continue}
  const periods=[]
  for(let i=0;i<8;i++){
   const x=day.periods[i]
   if(!x || x.number!==i+1 || Object.keys(x).some(k=>!['number','subject','teacher_display_name'].includes(k))){
    errors.push('INVALID_PERIOD_SCHEMA');continue
   }
   const subject=cleanText(x.subject,120)
   const teacher=cleanText(x.teacher_display_name,120)
   if(subject===null || teacher===null){errors.push('INVALID_TEXT');continue}
   periods.push({number:i+1,subject,teacher_display_name:teacher})
  }
  if(periods.length===8)days.push({day:day.day,periods})
 }
 }
 if(seen.size!==6 || DAYS.some(day=>!seen.has(day)))errors.push('MISSING_WEEKDAY')
 const revision=Number(payload?.revision)
 if(!Number.isSafeInteger(revision)||revision<0)errors.push('INVALID_REVISION')
 if(payload?.publication_authorized===true||payload?.staff_identity_reviewed===true)errors.push('UNVERIFIED_AUTHORIZATION')
 return {errors:[...new Set(errors)],value:errors.length?null:{
  class_name:schoolClass,section,academic_session:session,
  revision,content:{days:DAYS.map(day=>days.find(x=>x.day===day))},
  status:'draft',publication_authorized:false,staff_identity_reviewed:false
 }}
}
module.exports={DAYS,validateTimetableDraft}
