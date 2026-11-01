'use strict'
// Standalone pure safety rules, no DB writes and no inferred academic approvals.
function isSequentialAllClassAssessment({name,type,className}){
  return /^assessment\s+[1-9]\d*$/i.test(String(name||'').trim())
      && String(type||'').trim()==='AS'
      && String(className||'').trim().toLowerCase()==='all classes'
}
function officialPassMarks(total,failedGradeMax){
 const t=Number(total),f=Number(failedGradeMax)
 if(!Number.isSafeInteger(t)||t<=0||t>1000||!Number.isSafeInteger(f)||f<0||f>=100)
  return null
 return Math.ceil(t*(f+1)/100)
}
module.exports={isSequentialAllClassAssessment,officialPassMarks}
