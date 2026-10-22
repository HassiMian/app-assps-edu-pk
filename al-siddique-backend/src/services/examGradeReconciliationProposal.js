'use strict'
// READ-ONLY proposal; deliberately does not authorize or execute any UPDATE.
// The original school grade policy, signed Owner review, historical source and
// immutable versioned audit ledger must be established before publication.
const {selectGradeBand}=require('./gradeBandAssignment')
function draftGradeReconciliation({record,bands,schoolId}={}){
 const id=Number(record?.id),rowSchool=Number(record?.school_id)
 if(!Number.isSafeInteger(Number(schoolId))||Number(schoolId)<1||
    rowSchool!==Number(schoolId)||!Number.isSafeInteger(id)||id<1||
    record?.result_status!=='SCORED') return null
 const rawMarks=record?.marks_obtained,rawMax=record?.total_marks
 if(rawMarks===null||rawMarks===undefined||typeof rawMarks==='boolean'||
    (typeof rawMarks==='string' && !rawMarks.trim())||
    rawMax===null||rawMax===undefined||typeof rawMax==='boolean'||
    (typeof rawMax==='string' && !rawMax.trim()))return null
 const obtained=Number(rawMarks),max=Number(rawMax)
 if(!Number.isFinite(obtained)||!Number.isFinite(max)||max<=0||
    obtained<0||obtained>max) return null
 const grade=selectGradeBand(100*obtained/max,bands)
 if(!grade||String(record.grade??'')===grade.label)return null
 return Object.freeze({resultId:id,schoolId:Number(schoolId),
   currentGrade:String(record.grade??''),provisionalGrade:grade.label,
   expectedMarks:obtained,expectedTotal:max,
   state:'AWAITING_AUTHENTICATED_OWNER_ACADEMIC_REVIEW',
   productionMutationAuthorized:false})
}
module.exports={draftGradeReconciliation}
