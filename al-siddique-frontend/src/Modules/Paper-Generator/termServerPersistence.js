import {listLessonPlans,createLessonPlan,updateLessonPlan} from './lessonPlanClient'
import {eligibleTermPlans,buildTermServerPayload} from './termPlanningModel.js'
export async function listTermServerPlans(){
  return eligibleTermPlans(await listLessonPlans({limit:500}))
}
export async function saveTermServerPlan(args){
  const payload=buildTermServerPayload(args)
  return args.existing?updateLessonPlan(payload):createLessonPlan(payload)
}
