'use strict'
const { parseExactMarksNumber } = require('./examMarksInputValidation')
const RESULT_STATES = new Set(['SCORED','ABSENT','PENDING','EXCUSED'])
function validateResultState(row, role) {
 const state=String(row?.result_status ?? 'SCORED').trim().toUpperCase()
 if (!RESULT_STATES.has(state)) return {error:'INVALID_EXAM_RESULT_STATUS'}
 const raw=row?.marks_obtained
 const blank=raw===undefined || raw===null || (typeof raw==='string' && raw.trim()==='')
 if (state==='SCORED') {
   if(blank) return {error:'EXAM_MARKS_UNMARKED_NOT_ZERO'}
   const number=parseExactMarksNumber(raw)
   if(!Number.isFinite(number)) return {error:'INVALID_NUMERIC_MARKS'}
   return {status:state,marks:number}
 }
 if(!blank) return {error:'NON_NUMERIC_STATUS_HAS_MARKS'}
 if(state==='EXCUSED' && !['principal','admin','super_admin','owner'].includes(String(role||'').toLowerCase()))
   return {error:'EXCUSED_REQUIRES_PRINCIPAL'}
 // A subject absence is not a daily-school-attendance status.
 return {status:state,marks:null}
}
module.exports={RESULT_STATES,validateResultState}
