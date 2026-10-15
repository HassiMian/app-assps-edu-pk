import {createLessonPlan,updateLessonPlan,listLessonPlans} from './lessonPlanClient'
import {normalizeLessonPlanDocument} from './lessonPlanDomain'
import {DAILY_NOTEBOOK_MARKER,buildDailyServerPayload} from './dailyServerPayload'
export {DAILY_NOTEBOOK_MARKER,buildDailyServerPayload,dailyIdentity} from './dailyServerPayload'

export function eligibleDailyPlans(plans=[]){
 return (Array.isArray(plans)?plans:[]).map(normalizeLessonPlanDocument)
  .filter(doc=>doc.planningType==='daily' &&
   doc.provenance?.marker===DAILY_NOTEBOOK_MARKER &&
   doc.provenance?.academicPublication==='BLOCKED')
}
export async function listDailyServerPlans(){
 return eligibleDailyPlans(await listLessonPlans({limit:500}))
}
export async function saveDailyServerPlan(args){
 const payload=buildDailyServerPayload(args)
 return args.existing?updateLessonPlan(payload):createLessonPlan(payload)
}
