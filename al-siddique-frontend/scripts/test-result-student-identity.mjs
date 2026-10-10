import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {buildResultStudents} from '../src/Modules/examination/resultStudentIdentity.js'
import {createServer} from 'vite'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const rows=[
 {student_id:77,name:'Ali Student',class:'All Classes',subject:'English',roll_number:'17'},
 {student_id:77,student_class:'Class Eight',student_section:'Blue',father_name:'Parent',subject:'Math'},
 {student_id:78,student_name:'Fatima Student',student_class:'Class Seven',section:'A',gr_number:'GR-078',subject:'Urdu'},
]
const students=buildResultStudents(rows)
assert.equal(students.length,2)
assert.equal(students[0].className,'Class Eight')
assert.equal(students[0].section,'Blue')
assert.equal(students[0].roll_number,'17')
assert.equal(students[0].father_name,'Parent')
assert.equal(students[0].subjectsCount,2)
assert.equal(students[1].className,'Class Seven')
assert.equal(students[1].section,'A')
assert.equal(buildResultStudents([{student_id:1,student_class:'All Classes'}])[0].className,'')
assert.equal(buildResultStudents([{subject:'orphan'}]).length,0)
const source=readFileSync('../al-siddique-backend/src/routes/examRoutes.js','utf8')
assert.ok(source.includes('s.class AS student_class, s.section AS student_section'),'Authenticated single-exam read must include real student class/section')
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try {
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const data=m.buildResultCardData({student:students[0],exam:{name:'First Term',class:'All Classes',total_marks:100},studentMarks:[{subject:'English',marks_obtained:80,total_marks:100}],options:{...m.DEFAULT_RESULT_OPTIONS,template:'signature-editorial',autoTermColumns:true},school:{name:'Fixture Only'}})
 const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
 assert.ok(html.includes('Class Eight / Blue'))
 assert.ok(html.includes('>17</strong>'))
 assert.ok(!html.includes('All Classes'))
 const noClass=m.buildResultCardData({student:{name:'No Class'},exam:{name:'First Term',class:'All Classes',total_marks:100},studentMarks:[{subject:'Math',marks_obtained:80,total_marks:100}],options:{...m.DEFAULT_RESULT_OPTIONS,template:'signature-editorial'}})
 assert.equal(noClass.student.className,'—')
} finally {await vite.close()}
console.log('RESULT_STUDENT_IDENTITY: 15 checks PASS including real SSR of class/section and roll number')
