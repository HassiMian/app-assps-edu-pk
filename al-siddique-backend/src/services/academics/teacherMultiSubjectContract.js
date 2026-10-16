'use strict'
const SUBJECT_KEY=/^[a-z][a-z0-9_]{1,79}$/
const trim=(v,n)=>typeof v==='string'?v.trim().slice(0,n):''
const SCHOOL_SESSIONS=/^20\d{2}[–-](?:\d{2}|20\d{2})$/
function academicSession(value){
 const raw=trim(value,24)
 const match=/^(20\d{2})[–-](\d{2}|20\d{2})$/.exec(raw)
 if(!match)return null
 const begin=Number(match[1]),end=Number(match[2].length===2?match[1].slice(0,2)+match[2]:match[2])
 return end===begin+1?match[1]+'–'+String(end).slice(-2):null
}
const isPositiveInteger=v=>Number.isSafeInteger(Number(v))&&Number(v)>0
function normalizeSubject(body){
 const key=trim(body?.key,80).toLowerCase()
 const name=trim(body?.name,140)
 const nameUrdu=trim(body?.nameUrdu,140)
 const errors=[]
 if(!SUBJECT_KEY.test(key)) errors.push('INVALID_SUBJECT_KEY')
 if(name.length<2) errors.push('SUBJECT_NAME_REQUIRED')
 return {errors,value:{key,name,nameUrdu:nameUrdu||null}}
}
function normalizeTeacherSubjectProposal(body){
 const id=Number(body?.employeeId)
 const subjectId=Number(body?.subjectId)
 const session=trim(body?.academicSession,24)
 const evidence=trim(body?.evidenceReference,400)
 const errors=[]
 if(!isPositiveInteger(id))errors.push('EMPLOYEE_ID_REQUIRED')
 if(!isPositiveInteger(subjectId))errors.push('EXACT_SUBJECT_ID_REQUIRED')
 if(!SCHOOL_SESSIONS.test(session)||!academicSession(session))errors.push('ACADEMIC_SESSION_INVALID')
 if(evidence.length<12)errors.push('SOURCE_EVIDENCE_REQUIRED')
 return {errors,value:{employeeId:id,subjectId,session:academicSession(session),evidence}}
}
function validateInchargeCandidate(body){
 const employeeId=Number(body?.employeeId)
 const className=trim(body?.className,80)
 const section=trim(body?.section,80)
 const session=trim(body?.academicSession,24)
 const evidence=trim(body?.evidenceReference,400)
 const role=trim(body?.assignmentRole||'primary',16)
 const errors=[]
 if(!isPositiveInteger(employeeId))errors.push('EMPLOYEE_REQUIRED')
 if(!className||!section)errors.push('EXACT_CLASS_AND_SECTION_REQUIRED')
 if(!SCHOOL_SESSIONS.test(session)||!academicSession(session))errors.push('SESSION_INVALID')
 if(evidence.length<12)errors.push('INCHARGE_SOURCE_EVIDENCE_REQUIRED')
 if(!['primary','assistant'].includes(role))errors.push('INVALID_INCHARGE_ROLE')
 return {errors,value:{employeeId,className,section,session,evidence,role}}
}
module.exports={normalizeSubject,normalizeTeacherSubjectProposal,validateInchargeCandidate}
