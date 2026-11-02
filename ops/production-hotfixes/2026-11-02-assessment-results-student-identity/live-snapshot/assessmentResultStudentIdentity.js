'use strict'
const { normalizeClassKey } = require('./academicClassKey')
const fail=(code,message)=>Object.assign(new Error(message),{code,status:422})
function studentIdFromKey(studentKey){
  const s=String(studentKey??'')
  const match=/^(?:student:)?([1-9][0-9]{0,9})$/.exec(s)
  if(!match)return null
  const id=Number(match[1])
  return Number.isSafeInteger(id)&&id<=2147483647?id:null
}
function verifiedReleaseContext(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return null
  const meta=snapshot.metadata
  if(!meta||typeof meta!=='object'||Array.isArray(meta))return null
  const className=String(meta.className||meta.classLevel||'').trim()
  const subject=String(meta.subject||meta.subjectName||'').trim()
  if(!className||!subject||!Object.hasOwn(meta,'section'))return null
  const section=String(meta.section??'').trim()
  if(className.length>80||section.length>80||subject.length>160)return null
  return {className,section,subject}
}
function sameSection(a,b) {return String(a??'').trim().toLocaleLowerCase('en')===String(b??'').trim().toLocaleLowerCase('en')}
async function assertStudentIdentityForRelease(client,{schoolId,releaseSnapshot,studentKey,studentSnapshot}){
  const studentId=studentIdFromKey(studentKey)
  if(!studentId)throw fail('STUDENT_IDENTITY_KEY_REQUIRED','Student key must be the verified school student database ID.')
  const cohort=verifiedReleaseContext(releaseSnapshot)
  if(!cohort)throw fail('ASSESSMENT_RELEASE_COHORT_REQUIRED','Assessment release has no authoritative class, section and subject identity.')
  const record=await client.query('SELECT id,school_id,name,class,section,roll_number,is_active FROM students WHERE school_id=$1 AND id=$2 AND is_active=true LIMIT 1',[schoolId,studentId])
  if(record.rowCount!==1)throw fail('ASSESSMENT_STUDENT_NOT_FOUND','Student is not active in the assessment school.')
  const s=record.rows[0]
  if(Number(s.school_id)!==Number(schoolId)||s.is_active!==true||normalizeClassKey(s.class)!==normalizeClassKey(cohort.className)||!sameSection(s.section,cohort.section)){
    throw fail('ASSESSMENT_STUDENT_COHORT_MISMATCH','Student class/section does not match the verified assessment release.')
  }
  const snapshot=studentSnapshot&&typeof studentSnapshot==='object'&&!Array.isArray(studentSnapshot)?studentSnapshot:{}
  for(const k of ['id','studentId','student_id']){
    if(Object.hasOwn(snapshot,k)&&Number(snapshot[k])!==studentId)throw fail('STUDENT_SNAPSHOT_ID_MISMATCH','Submitted student identity conflicts with the school student record.')
  }
  if(Object.hasOwn(snapshot,'className')&&normalizeClassKey(snapshot.className)!==normalizeClassKey(s.class))throw fail('STUDENT_SNAPSHOT_COHORT_MISMATCH','Submitted student class conflicts with school.')
  if(Object.hasOwn(snapshot,'section')&&!sameSection(snapshot.section,s.section))throw fail('STUDENT_SNAPSHOT_COHORT_MISMATCH','Submitted student section conflicts with school.')
  return Object.freeze({id:s.id,studentId:s.id,displayName:s.name||'',className:s.class,section:s.section||'',rollNumber:s.roll_number||''})
}
module.exports={studentIdFromKey,verifiedReleaseContext,assertStudentIdentityForRelease}
