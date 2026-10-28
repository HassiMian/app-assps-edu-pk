import {listLessonPlans,createLessonPlan,updateLessonPlan} from './lessonPlanClient'
import {eligibleTermPlans,buildTermServerPayload} from './termPlanningModel.js'
import {getAuthUser} from '../../services/api'
import {assertSecondTermAcademicPolicy} from './secondTermAcademicScope.js'
export async function listTermServerPlans(){
  return eligibleTermPlans(await listLessonPlans({limit:500}))
}
export async function saveTermServerPlan(args){
  const authUser=getAuthUser() || {}
  assertSecondTermAcademicPolicy(args?.klass,args?.term ?? 'Second Term',authUser.school_id ?? authUser.schoolId)
  const payload=buildTermServerPayload({...args,schoolId:authUser.school_id ?? authUser.schoolId})
  return args.existing?updateLessonPlan(payload):createLessonPlan(payload)
}
