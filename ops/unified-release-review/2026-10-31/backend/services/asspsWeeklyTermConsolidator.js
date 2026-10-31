'use strict'
// Strict evidence-only consolidation. Never fabricates textbook pages or certifies term scope.
const clean=v=>String(v??'').trim().replace(/\s+/g,' ')
const isSecondTerm=v=>/\bsecond\s*term\b|\b2nd\s*term\b|\bterm\s*ii\b|دوسری\s*ٹرم/i.test(clean(v))
const normalizeGrade=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(?:class|grade)/,'')
const isoDate=v=>v instanceof Date && Number.isFinite(v.getTime())?v.toISOString().slice(0,10):String(v||'').slice(0,10)
function parsePages(text){
  const v=clean(text).replace(/^[#\s]*(?:pages?|pgs?)[.#:\s]*/i,'').replace(/^#/,'')
  const m=v.match(/^(\d{1,4})(?:\s*(?:-|–|—|to)\s*(\d{1,4}))?$/i)
  if(!m)return null
  const start=Number(m[1]),end=Number(m[2]||m[1])
  return start>0 && end>=start && end<=2000 ? {start,end}:null
}
function canonicalSubject(raw){
  const name=clean(raw)
  const m=name.match(/^(English|Urdu|اردو|انگریزی)\s*[-– ]\s*([AB])$/i)
  return m? {group:m[1],track:m[2].toUpperCase(),raw:name}:{group:name,track:'main',raw:name}
}
function consolidateWeeklyToTerm({schoolId,weeklyPlans}){
 if(Number(schoolId)!==1)return {error:'ASSPS_SCHOOL_SCOPE_REQUIRED'}
 if(!Array.isArray(weeklyPlans)||weeklyPlans.length<1||weeklyPlans.length>60)return {error:'EXACT_WEEKLY_SOURCE_PLANS_REQUIRED'}
 const plans=weeklyPlans.map(p=>({...p,plan_date:isoDate(p.plan_date),end_date:isoDate(p.end_date),payload:p.payload||{}})).sort((a,b)=>a.plan_date.localeCompare(b.plan_date))
 const cls=clean(plans[0].class_level||plans[0].payload.classLevel)
 const section=clean(plans[0].payload.section)
 if(!cls)return {error:'SOURCE_CLASS_REQUIRED'}
 const grade=normalizeGrade(cls)
 if(['eight','8','8th'].includes(grade))return {error:'ASSPS_EIGHT_SECOND_TERM_FORBIDDEN'}
 if(['prenine','pre9','pre9th'].includes(grade))return {error:'PRE_NINE_PLANNING_DEFERRED'}
 if(['nine','9','9th','ten','10','10th'].includes(grade))return {error:'SECOND_TERM_SCHOOL_SCOPE_ENDS_AT_SEVEN'}
 // Allow only the approved Starter–Seven planning scope. Unknown labels must
 // never bypass the Grade Eight/Pre-Nine academic promotion boundary.
 const permitted=new Set(['starter','mover','flyer','one','two','three','four','five','six','seven','1','2','3','4','5','6','7'])
 if(!permitted.has(grade))return {error:'ASSPS_STARTER_TO_SEVEN_SCOPE_REQUIRED'}
 const subjectTracks=new Map()
 for(const p of plans){
   if(String(p.planning_scope||p.payload.planningScope||'').toLowerCase()!=='weekly')return {error:'ONLY_SAVED_WEEKLY_PLANS_ALLOWED'}
   if(clean(p.class_level||p.payload.classLevel).toLowerCase()!==cls.toLowerCase())return {error:'MIXED_CLASS_SOURCES_REJECTED'}
   if(clean(p.payload.section)!==section)return {error:'MIXED_SECTION_SOURCES_REJECTED'}
   if(!/^\d{4}-\d{2}-\d{2}$/.test(String(p.plan_date||'')))return {error:'SOURCE_DATE_REQUIRED'}
   const sources=p.payload.subjects
   if(!Array.isArray(sources)||sources.length===0)return {error:'SOURCE_SUBJECTS_REQUIRED'}
   for(const subject of sources){
     const label=clean(subject?.subject||subject?.name||subject?.subjectName)
     if(!label)return {error:'SOURCE_SUBJECT_NAME_REQUIRED'}
     const {group,track}=canonicalSubject(label)
     const key=group.toLowerCase()+'|'+track
     const units=Array.isArray(subject.units)?subject.units:[]
     const ranges=(units.length?units.map(x=>x.pageRange||x.page_range||x.pages||''):[subject.pageRange||subject.page_range||subject.pages||''])
     if(!ranges.length || ranges.some(x=>!parsePages(x)))return {error:'OFFICIAL_SOURCE_PAGES_REQUIRED',subject:label}
     if(!subjectTracks.has(key))subjectTracks.set(key,{group,track,ranges:[]})
     for(const r of ranges)subjectTracks.get(key).ranges.push({...parsePages(r),sourcePlanId:p.public_id,sourceDate:p.plan_date})
   }
 }
 const grouped=new Map()
 for(const item of subjectTracks.values()){
  const ranges=item.ranges.sort((a,b)=>a.sourceDate.localeCompare(b.sourceDate)||a.start-b.start)
  let last=0
  for(const r of ranges){
   if(last && r.start>last+1)return {error:'SOURCE_PAGE_GAP_REQUIRES_REVIEW',subject:item.group}
   if(last && r.end<last)return {error:'SOURCE_PAGES_OUT_OF_SEQUENCE',subject:item.group}
   last=Math.max(last,r.end)
  }
  const first=Math.min(...ranges.map(x=>x.start)),end=Math.max(...ranges.map(x=>x.end))
  const text=`Pages ${first}–${end}`
  const isUrdu=['urdu','اردو'].includes(item.group.toLowerCase())
  const trackLabel=item.track==='main'?text:`${item.group} ${item.track}: ${text}`
  const groupKey=item.group.toLowerCase()
  if(!grouped.has(groupKey))grouped.set(groupKey,{subject:item.group,parts:[],isUrdu})
  grouped.get(groupKey).parts.push(trackLabel)
 }
 const dates=plans.map(p=>({start:String(p.plan_date).slice(0,10),end:String(p.end_date||p.plan_date).slice(0,10)}))
 const result={
   status:'PREVIEW_ONLY_SOURCE_PAGES_NEED_ACADEMIC_SIGNOFF',
   classLevel:cls,section,
   sourceWeeklyIds:plans.map(p=>p.public_id),
   sourceStartDate:dates[0].start,
   sourceEndDate:dates.reduce((max,x)=>x.end>max?x.end:max,dates[0].end),
   subjects:[...grouped.values()].map(s=>({subject:s.subject,pageRangeLabel:s.parts.join(' | '),
     statement:s.isUrdu?'ان صفحات کو پڑھیں، مشقیں حل کریں، کاپی ورک مکمل کریں اور اسسمنٹ کی تیاری کریں۔':'Read these pages, complete textbook exercises and written work, and revise for assessments.'})),
   assessments:[1,2,3,4].map(n=>({name:`Assessment ${n}`,date:''})),
   paperLayout:{size:'A4',orientation:'landscape',portraitPlansPerSheet:3,englishFont:'Times New Roman',urduFont:'Jameel Noori Nastaleeq'},
   academicCertification:'HOLD_UNTIL_ORIGINAL_SOURCE_AND_PRINCIPAL_APPROVAL',
 }
 if(!result.subjects.length)return {error:'SOURCE_SUBJECTS_REQUIRED'}
 return {data:result}
}
module.exports={consolidateWeeklyToTerm,parsePages,canonicalSubject}
