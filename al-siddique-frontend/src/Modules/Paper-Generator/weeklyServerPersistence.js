import {createLessonPlan,updateLessonPlan,listLessonPlans} from './lessonPlanClient'
import {normalizeLessonPlanDocument} from './lessonPlanDomain'
import {WEEKLY_MARKER,buildWeeklyServerPayload} from './weeklyServerPayload'
import api from '../../services/api'
export {WEEKLY_MARKER,weeklyIdentity,buildWeeklyServerPayload} from './weeklyServerPayload'

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
