'use strict'
// Database constraints are authoritative. Turn known academic constraints
// into actionable errors without disabling the trigger or changing records.
const KNOWN=Object.freeze({
 CLASS_EIGHT_PROMOTION_AWAITS_PRINT_APPROVAL:{
  code:'CLASS_EIGHT_APPROVAL_PENDING',
  message:'Class Eight final-result print verification and academic approval are still pending. No students were moved.'
 },
 CLASS_EIGHT_PAPER_MAXIMA_NOT_FULLY_APPROVED:{
  code:'CLASS_EIGHT_PAPER_APPROVAL_PENDING',
  message:'Class Eight subject papers and maximum marks require official academic approval. No students were moved.'
 },
 CLASS_EIGHT_STUDENT_MARKS_NOT_COMPLETE_OR_DENOMINATOR_MISMATCH:{
  code:'CLASS_EIGHT_MARKS_INCOMPLETE',
  message:'At least one Class Eight student has incomplete or mismatched official exam marks. No students were moved.'
 },
 CLASS_EIGHT_MUST_ENTER_EXACT_APPROVED_PRE_NINE_SECTION:{
  code:'CLASS_EIGHT_DESTINATION_NOT_APPROVED',
  message:'The promotion destination does not match the approved Class Eight plan. No students were moved.'
 },
 CLASS_EIGHT_SCHOOL_SCOPE_CANNOT_CHANGE:{
  code:'CLASS_EIGHT_SCHOOL_SCOPE_BLOCKED',
  message:'Changing the student school is not permitted in this promotion. No students were moved.'
 }
})
function promotionErrorMap(error){
 if(error?.code!=='23514')return null
 return KNOWN[String(error?.message||'')]||null
}
module.exports={promotionErrorMap}
