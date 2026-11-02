'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {studentIdFromKey,verifiedReleaseContext,assertStudentIdentityForRelease}=require('./assessmentResultStudentIdentity.js')
const release={metadata:{className:'Pre-Nine',section:'Blue',subject:'Biology'}}
const student={id:231,school_id:1,name:'Synthetic Learner',class:'Pre Nine',section:'Blue',roll_number:'R-12',is_active:true}
function queryOf(rows=[student]){const calls=[];return{calls,client:{query:async (sql,args)=>{calls.push({sql,args});return {rows,rowCount:rows.length}}}}}
async function error(code,params={},rows=[student]){
 const q=queryOf(rows)
 await assert.rejects(()=>assertStudentIdentityForRelease(q.client,{schoolId:1,releaseSnapshot:release,studentKey:'231',...params}),e=>e.code===code)
}
test('student key supports canonical integer student ID or explicit student: prefix, never free text',()=>{
 assert.equal(studentIdFromKey('231'),231);assert.equal(studentIdFromKey('student:231'),231)
 for(const s of ['student-231','student_231','roll:R-12','000231','0','1 OR 1=1','2147483648','student:1/2','-1'])
 assert.equal(studentIdFromKey(s),null,s)
})
test('only metadata with source-authoritative class, section and subject can pass',()=>{
 assert.deepEqual(verifiedReleaseContext(release),{className:'Pre-Nine',section:'Blue',subject:'Biology'})
 for(const m of [{className:'Nine',subject:'Biology'},{className:'Nine',section:'Blue'},{subject:'Bio',section:'Blue'},{}])
 assert.equal(verifiedReleaseContext({metadata:m}),null)
})
test('cross school, inactive and unrecognised students are refused',async()=>{
 await error('ASSESSMENT_STUDENT_NOT_FOUND',{},[])
 await error('ASSESSMENT_STUDENT_NOT_FOUND',{studentKey:'1'},[])
 await error('ASSESSMENT_STUDENT_COHORT_MISMATCH',{},[{...student,school_id:2}])
 await error('ASSESSMENT_STUDENT_COHORT_MISMATCH',{},[{...student,is_active:false}])
})
test('misassigned class and section cannot pass',async()=>{
 await error('ASSESSMENT_STUDENT_COHORT_MISMATCH',{},[{...student,class:'Nine'}])
 await error('ASSESSMENT_STUDENT_COHORT_MISMATCH',{},[{...student,section:'Red'}])
})
test('invalid and mismatched student snapshots fail closed',async()=>{
 await error('STUDENT_IDENTITY_KEY_REQUIRED',{studentKey:'roll:R-12'})
 await error('STUDENT_SNAPSHOT_ID_MISMATCH',{studentSnapshot:{id:232}})
 await error('STUDENT_SNAPSHOT_COHORT_MISMATCH',{studentSnapshot:{className:'Nine'}})
 await error('STUDENT_SNAPSHOT_COHORT_MISMATCH',{studentSnapshot:{section:'Red'}})
})
test('authoritative student details replace untrusted client snapshot',async()=>{
 const {client,calls}=queryOf()
 const x=await assertStudentIdentityForRelease(client,{schoolId:1,releaseSnapshot:release,studentKey:'student:231',
 studentSnapshot:{displayName:'Malicious alias',extraUnsafeData:'not persisted',section:'blue'}})
 assert.equal(x.displayName,'Synthetic Learner');assert.equal(x.studentId,231)
 assert.equal(x.className,'Pre Nine');assert.equal(x.section,'Blue')
 assert.equal(x.extraUnsafeData,undefined)
 assert.match(calls[0].sql,/WHERE school_id=\$1 AND id=\$2 AND is_active=true/)
 assert.deepEqual(calls[0].args,[1,231])
})
test('empty-but-authoritative section is valid only for student with empty section',async()=>{
 const c=queryOf([{...student,class:'Seven',section:''}])
 const x=await assertStudentIdentityForRelease(c.client,{schoolId:1,releaseSnapshot:{metadata:{className:'Seven',section:'',subject:'Maths'}},studentKey:'231'})
 assert.equal(x.section,'')
})
