'use strict'
function normalized(value){
 return String(value||'').toLowerCase().replace(/\b(class|grade)\b/g,'').replace(/[^a-z0-9]/g,'')
}
function excludedSchoolClass(value){
 const k=normalized(value)
 return /^(?:pre9|pre9th|prenine|preninth|preix|pregrade9)$/.test(k)
}
function checkSchoolPlanningScope(schoolId,classLevel){
 if(Number(schoolId)!==1||!excludedSchoolClass(classLevel))return null
 return {code:'ASSPS_PRENINE_PLANNING_HELD',message:'Pre Nine lesson planning is reserved for a separately approved academic syllabus. Plan Starter through Class Seven in the current Second Term.'}
}
module.exports={normalized,excludedSchoolClass,checkSchoolPlanningScope}
