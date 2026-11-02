const test=require('node:test'),assert=require('node:assert/strict');
const m=require('./assessmentResultStudentIdentity');
const release={metadata:{className:'Six',section:'Blue',subject:'Science'}};
function db(student){return {query:async(sql,args)=>({rowCount:student?1:0,rows:student?[student]:[]})}}
const s={id:19,school_id:1,name:'Synthetic Student',class:'Six',section:'Blue',roll_number:'7',is_active:true};
test('requires canonical numeric school student id',()=>{for(const key of ['other','student-19','0','-19','19 OR 1=1'])assert.equal(m.studentIdFromKey(key),null);assert.equal(m.studentIdFromKey('student:19'),19)});
test('accepts same-school active student with exact cohort',async()=>{const a=await m.assertStudentIdentityForRelease(db(s),{schoolId:1,releaseSnapshot:release,studentKey:'19',studentSnapshot:{id:19,section:'Blue'}});assert.equal(a.id,19);assert.equal(a.displayName,'Synthetic Student')});
test('denies another-school student',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db({...s,school_id:2}),{schoolId:1,releaseSnapshot:release,studentKey:'19'}),{code:'ASSESSMENT_STUDENT_COHORT_MISMATCH'})});
test('denies inactive student',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db({...s,is_active:false}),{schoolId:1,releaseSnapshot:release,studentKey:'19'}),{code:'ASSESSMENT_STUDENT_COHORT_MISMATCH'})});
test('denies different section',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db({...s,section:'Red'}),{schoolId:1,releaseSnapshot:release,studentKey:'19'}),{code:'ASSESSMENT_STUDENT_COHORT_MISMATCH'})});
test('denies missing release identity',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db(s),{schoolId:1,releaseSnapshot:{metadata:{className:'Six'}},studentKey:'19'}),{code:'ASSESSMENT_RELEASE_COHORT_REQUIRED'})});
test('denies missing student',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db(null),{schoolId:1,releaseSnapshot:release,studentKey:'19'}),{code:'ASSESSMENT_STUDENT_NOT_FOUND'})});
test('denies student snapshot identity spoofing',async()=>{await assert.rejects(m.assertStudentIdentityForRelease(db(s),{schoolId:1,releaseSnapshot:release,studentKey:'19',studentSnapshot:{id:20}}),{code:'STUDENT_SNAPSHOT_ID_MISMATCH'})});
