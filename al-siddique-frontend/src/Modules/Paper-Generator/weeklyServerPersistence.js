import {createLessonPlan,updateLessonPlan,listLessonPlans} from './lessonPlanClient'
import {createEmptyLessonPlanDocument,toLessonPlanPersistencePayload,
 normalizeLessonPlanDocument} from './lessonPlanDomain'
import api from '../../services/api'

export const WEEKLY_MARKER='ASSPS_WEEKLY_NOTEBOOK_V1'
const trim=s=>String(s||'').trim()
export const weeklyIdentity=(klass,section,start)=>[trim(klass).toLowerCase(),trim(section).toLowerCase(),trim(start)].join('|')
export function buildWeeklyServerPayload({klass,section,week,rows,teacherLabel,sourceZipSha256,existing}){
 if(!klass||!week?.start||!week?.end||!Array.isArray(rows)||!rows.length)
  throw new Error('Class, teaching week and at least one subject are required')
 const sourceDigest=String(sourceZipSha256||'')
 if(!/^[a-f0-9]{64}$/.test(sourceDigest))
  throw new Error('Original source verification is required before server save')
 if(rows.length>24)throw new Error('Too many subjects')
 const identity=weeklyIdentity(klass,section,week.start)
 const normalizedSubjects=rows.map((row,index)=>{
   if(!row.id||!trim(row.subject)||!trim(row.task))
    throw new Error('Every subject must have verified identity and an editable statement')
   return {
     subject:row.subject,status:'draft',
     rationale:'Source-based weekly draft, not verified official academic publication',
     units:row.page?[{id:row.id,label:row.subject,
       pageRange:row.page.from+(row.page.to!==row.page.from?'–'+row.page.to:''),
       source:'assps-original-whatsapp-review',
       needsReview:row.sourceStatus!=='SOURCE DATED'}]:[],
     lessons:[{key:'assps-week-'+week.start+'-'+index,subject:row.subject,
       date:week.start,title:row.task,homework:row.task,
       notes:row.originalSourceIds?.slice(0,12)||[],
       assessment:row.assessments?.map(a=>a.date+' ('+a.origin+')').join('; ')||'',
       activities:row.activities?.map(x=>x.label+': '+x.date)||[],
       source:'assps-private-reviewed-original',needsReview:true}]
   }
 })
 const existingDoc=existing?normalizeLessonPlanDocument(existing):null
 const doc=createEmptyLessonPlanDocument({
   planningType:'weekly',status:'draft',sessionLabel:'2026–2027',
   termLabel:'Second Term · Source-based draft',
   classLevel:klass,section:trim(section),teacher:'',
   startDate:week.start,endDate:week.end,subjects:normalizedSubjects,
   analysis:{warnings:['Source review, teacher/section and academic approval pending']},
   provenance:{deterministic:true,aiEnhanced:false,
     marker:WEEKLY_MARKER,weeklyKey:identity,
     academicPublication:'BLOCKED',teacherLabelDisplayOnly:teacherLabel||'',
     sourceZipSha256:sourceDigest}
 })
 const title='Weekly Notebook — '+klass+(section?' '+section:'')+' — '+week.start
 const out=toLessonPlanPersistencePayload({...doc,title})
 if(existingDoc?.id){
   out.id=existingDoc.id
   out.serverRevision=existingDoc.serverRevision
 }
 return out
}
export function eligibleWeeklyPlans(plans=[]){
 return (Array.isArray(plans)?plans:[])
   .map(plan=>normalizeLessonPlanDocument(plan))
   .filter(plan=>plan.provenance?.marker===WEEKLY_MARKER &&
     plan.provenance?.academicPublication==='BLOCKED')
}
export function localEditsFromServer(plan){
 const doc=normalizeLessonPlanDocument(plan)
 const edits={}
 for(const s of doc.subjects)
  for(const l of s.lessons)
   if(l.homework||l.title)edits[s.subject]=l.homework||l.title
 return edits
}
export async function listWeeklyServerPlans(){
 return eligibleWeeklyPlans(await listLessonPlans({limit:500}))
}
export async function saveWeeklyServerPlan(args){
 const payload=buildWeeklyServerPayload(args)
 return args.existing?updateLessonPlan(payload):createLessonPlan(payload)
}
export async function loadPrincipalSourceLibrary(){
 const result=await api.get('/api/lesson-plans/planner/private-source-bundle')
 return result?.data?.data
}
