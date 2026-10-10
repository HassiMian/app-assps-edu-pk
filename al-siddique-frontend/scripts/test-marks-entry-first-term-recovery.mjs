import assert from 'node:assert/strict'
import {
  normalizeMarksClass, equivalentMarksClass, normalizeMarksExam,
  matchesMarksExam, pickMarksExam, uniqueMarksClasses, marksEntryClasses, marksSubjectsForClass, marksClassQueryAliases, mergeMarksRoster,
  filterMarksStudents, validateMarksBatch
} from '../src/Modules/examination/marksEntryModel.js'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {OFFICIAL_FIRST_TERM_SUBJECTS_2026} from '../src/Modules/examination/officialFirstTerm2026Subjects.js'
const require=createRequire(import.meta.url)
const canonical=require('../../al-siddique-backend/src/config/firstTermExam2026.js')
const exams=[
 {id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33},
 {id:18,name:'Monthly Assessment',type:'AS',class:'Class One',session:'2026-2027'},
 {id:20,name:'Second Term Exam',type:'TE',class:'Two',session:'2026-2027'}
].map(normalizeMarksExam)
assert.equal(normalizeMarksClass('Class One'),'One')
assert.equal(normalizeMarksClass('Class 1'),'One')
assert.ok(equivalentMarksClass('Class One','1'))
assert.ok(equivalentMarksClass('Three','Class Three'))
console.log('PASS canonical student-class aliases')
assert.equal(pickMarksExam(exams,'Term Exam','One')?.id,9)
assert.equal(pickMarksExam(exams,'Assessment','One')?.id,18)
assert.equal(pickMarksExam(exams,'Term Exam','Two','20')?.id,20)
assert.equal(pickMarksExam(exams,'Term Exam','Nine')?.id,9)
assert.equal(pickMarksExam(exams,'Assessment','Two'),null)
assert.equal(matchesMarksExam(exams[1],'Assessment','Two'),false)
assert.deepEqual(uniqueMarksClasses(['Class One','Two'],exams),['One','Two'])
assert.deepEqual(marksEntryClasses([],exams.filter(e=>e.id===9)).slice(0,5),['Starter','Mover','Flyer','One','Two'])
assert.deepEqual(marksEntryClasses([],[]),[])
console.log('PASS actual First Term Exam ID9 discovery, exact selection, class/type filtering')
for (const cls of Object.values(canonical.CLASS_LEVEL_TO_NAME)) {
 const expected=[...new Set(canonical.subjectsForClass(cls).map(x=>x.subject))]
 assert.deepEqual(OFFICIAL_FIRST_TERM_SUBJECTS_2026[cls],expected,cls)
 assert.deepEqual(marksSubjectsForClass({exam:exams[0],className:cls,academicSubjects:[]}),expected)
}
assert.equal(canonical.officialRows().length,75)
assert.deepEqual(marksSubjectsForClass({exam:exams[0],className:'Class One',academicSubjects:[]}),[
 'English','Mathematics','Urdu','Science','Islamiyat','Quran / Nazra'
])
assert.deepEqual(marksSubjectsForClass({exam:{...exams[0],session:'2027-2028'},className:'One',academicSubjects:['Math']}),['Math'])
assert.deepEqual(marksSubjectsForClass({exam:exams[1],className:'One',academicSubjects:['Assessment English']}),['Assessment English'])
console.log('PASS 75 official First Term papers, 11 class subject lists, no future-session/assessment invention')
const students=[{id:1,name:'A',class:'One'}, {id:2,name:'B',class:'Class One'}, {id:3,name:'C',class:'Two'}]
assert.deepEqual(filterMarksStudents(students,'Class One').map(x=>x.id),[1,2])
console.log('PASS canonical roster filtered within authorized response')
assert.deepEqual(marksClassQueryAliases('Class One'),['One','Class One','1','Class 1'])
assert.deepEqual(marksClassQueryAliases('Two'),['Two','Class Two','2','Class 2'])
assert.deepEqual(marksClassQueryAliases('Starter'),['Starter','Class Starter'])
assert.deepEqual(mergeMarksRoster([
 [{id:1,name:'One A',class:'One'}],
 [{id:2,name:'One B',class:'Class One'}],
 [{id:1,name:'One A',class:'1'},{id:3,name:'Wrong class',class:'Three'}],
 [{id:2,name:'One B',class:'Class 1'}, {id:0,name:'Bad ID',class:'One'}],
], 'One').map(x=>x.id),[1,2])
console.log('PASS class-specific roster alias union and ID dedupe, never require unfiltered school roster')

const ctx={exam:exams[0],selectedClass:'One',students,subject:'Maths',marks:{1:'0',2:'89',3:''},totalMarks:'100',passMarks:'33'}
const batch=validateMarksBatch(ctx)
assert.equal(batch.error,'')
assert.deepEqual(batch.rows.map(x=>x.marks_obtained),[0,89])
assert.deepEqual(batch.rows.map(x=>x.exam_id),[9,9])
assert.equal(batch.rows.length,2)
console.log('PASS explicit zero retained, blank excluded, only saved exam ID9 written')
for(const bad of ['-1','101','abc','Infinity']){
  assert.match(validateMarksBatch({...ctx,marks:{1:bad}}).error,/Invalid marks/)
}
assert.match(validateMarksBatch({...ctx,marks:{}}).error,/at least one/)
assert.match(validateMarksBatch({...ctx,exam:null}).error,/valid saved/)
assert.match(validateMarksBatch({...ctx,passMarks:'101'}).error,/total and passing/)
assert.match(validateMarksBatch({...ctx,exam:{...exams[0],id:'broken'}}).error,/valid saved/)
assert.match(validateMarksBatch({...ctx,exam:exams[2]}).error,/does not belong/)
assert.match(validateMarksBatch({...ctx,students:[{id:'bad',name:'A',class:'One'}],marks:{bad:'12'}}).error,/invalid ID/)
assert.match(validateMarksBatch({...ctx,students:[{id:3,name:'C',class:'Two'}],marks:{3:'12'}}).error,/Student class differs/)
assert.equal(validateMarksBatch({...ctx,students:[{id:2,name:'B',class:'Class One'}],marks:{2:'0'}}).rows.length,1)
console.log('PASS invalid exam/student IDs and cross-class mark writes denied')
console.log('PASS invalid marks / incomplete batch / nonexistent exam fail closed')
const sheet=readFileSync(new URL('../src/Modules/examination/MarksSheet.jsx',import.meta.url),'utf8')
assert.ok(sheet.includes('name="savedExam"'))
assert.ok(sheet.includes("params: { class: classAlias }"))
assert.ok(sheet.includes('validateMarksBatch'))
assert.ok(!sheet.includes("name: `${selectedExamType} - Class ${selectedClass}`"))
assert.ok(!sheet.includes('await api.post(\'/api/exams\','))
console.log('PASS user-facing explicit saved exam selector and no implicit duplicate exam creation')
