import test from 'node:test'
import assert from 'node:assert/strict'
import {marksSubjectsForClass,needsMarksSubjectSetupWarning} from './marksEntryModel.js'
const assessment={id:15,name:'Assessment 2',type:'Assessment',class:'All Classes',session:'2026-2027',subject_offerings:[]}
test('All Classes assessment displays actual Academic Setup subjects with no fake warning',()=>{
 const args={exam:assessment,className:'Six',academicSubjects:['English','Mathematics','Science','Urdu','Islamiyat']}
 assert.deepEqual(marksSubjectsForClass(args),args.academicSubjects)
 assert.equal(needsMarksSubjectSetupWarning(args),false)
})
test('no class configured means no warning until class is chosen',()=>{
 assert.equal(needsMarksSubjectSetupWarning({exam:assessment,className:'',academicSubjects:[]}),false)
})
test('no actual class subjects produces actionable warning, not silent empty select',()=>{
 assert.equal(needsMarksSubjectSetupWarning({exam:assessment,className:'Six',academicSubjects:[]}),true)
})
test('official subject offering class mismatch stays held for saved First Term',()=>{
 const official={name:'First Term Exam',type:'Term Exam',session:'2026-2027',subject_offerings:[{class_name:'Seven',section:'Blue',subject:'Science'}]}
 assert.equal(needsMarksSubjectSetupWarning({exam:official,className:'Six',academicSubjects:['English']}),true)
})
test('specific assessment offerings take precedence over irrelevant academic classes',()=>{
 const offered={...assessment,subject_offerings:[{class_name:'Six',section:'Blue',subject:'English'}]}
 assert.deepEqual(marksSubjectsForClass({exam:offered,className:'Six',academicSubjects:['Urdu']}),['English'])
 assert.equal(needsMarksSubjectSetupWarning({exam:offered,className:'Six',academicSubjects:[]}),false)
})
