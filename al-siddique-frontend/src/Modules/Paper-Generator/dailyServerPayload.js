// Independent private Daily Lesson Plan; never overwrites Weekly Plan or Daily Diary.
import {
 createEmptyLessonPlanDocument,normalizeLessonPlanDocument,toLessonPlanPersistencePayload
} from './lessonPlanDomain.js'

export const DAILY_NOTEBOOK_MARKER='ASSPS_DAILY_LESSON_NOTEBOOK_V1'
const text=value=>String(value||'').trim()
const isoDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))
export const dailyIdentity=(klass,section,date)=>
 [text(klass),text(section),text(date)].map(value=>value.toLowerCase()).join('|')

export function buildDailyServerPayload({klass,section,date,rows,sourceZipSha256,existing,design,teacherLabel}){
 const scope=dailyIdentity(klass,section,date)
 if(!text(klass)||!isoDate(date)||!Array.isArray(rows)||rows.length<1||rows.length>24)
  throw Error('Select a class, valid day and 1–24 subjects before Save Day')
 const digest=text(sourceZipSha256)
 if(!/^[a-f0-9]{64}$/.test(digest))throw Error('Verified source is required for Daily Plan saving')
 const subjects=rows.map((row,index)=>{
  if(!text(row.id)||!text(row.subject)||!text(row.task))
   throw Error('Each daily subject needs a source identity, title and teaching statement')
  return {subject:text(row.subject),status:'draft',
   rationale:'Private day-specific teaching statement, pending teacher review',
   lessons:[{key:'assps-day-'+date+'-'+index,subject:text(row.subject),
     date,title:text(row.task),homework:text(row.homework),
     objectives:row.objectives?[text(row.objectives)]:[],
     activities:row.activitiesText?[text(row.activitiesText)]:[],
     assessment:text(row.assessments?.[0]?.label),
     notes:[],source:'assps-original-weekly-proposed',needsReview:true}]}
 })
 const doc=createEmptyLessonPlanDocument({
  planningType:'daily',status:'draft',sessionLabel:'2026–2027',
  classLevel:klass,section:text(section),teacher:'',
  startDate:date,endDate:date,subjects,
  layoutSettings:design&&typeof design==='object'?design:{},
  provenance:{marker:DAILY_NOTEBOOK_MARKER,academicPublication:'BLOCKED',
   sourceZipSha256:digest,dailyKey:scope,sourceApplicability:'TEACHER_REVIEW_REQUIRED',
   teacherLabelDisplayOnly:text(teacherLabel),
   dailyStatementById:Object.fromEntries(rows.map(row=>[row.id,String(row.task)])),
   dailyDetailsById:Object.fromEntries(rows.map(row=>[row.id,{
    objectives:text(row.objectives),activities:text(row.activitiesText),
    homework:text(row.homework),assessment:text(row.assessments?.[0]?.label)
   }]))}
 })
 const payload=toLessonPlanPersistencePayload({
  ...doc,title:'Daily Lesson Plan — '+klass+(section?' '+section:'')+' — '+date
 })
 if(existing){
  const prior=normalizeLessonPlanDocument(existing)
  if(!prior.id||prior.provenance?.marker!==DAILY_NOTEBOOK_MARKER||
      prior.provenance?.dailyKey!==scope)
   throw Error('Refusing to overwrite a different saved daily plan')
  payload.id=prior.id
  payload.serverRevision=prior.serverRevision
 }
 return payload
}
