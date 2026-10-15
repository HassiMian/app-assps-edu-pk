import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reconcileOfficialSubjectRoster,findGradeForPercent} from '../resultCardIntegrityGate.js'
const bands=[{label:'F',from:0,to:39},{label:'D',from:40,to:59},{label:'C',from:60,to:69},{label:'B',from:70,to:79},{label:'A',from:80,to:89},{label:'A+',from:90,to:100}]
const student={id:101,className:'Class One',section:'Blue'}
const exam={id:9,subject_offerings:[
 {class_name:'One',section:'Blue',subject:'English',total_marks:75},
 {class_name:'One',section:'Blue',subject:'Math',total_marks:75},
 {class_name:'One',section:'Yellow',subject:'Urdu',total_marks:75},
 {class_name:'Two',section:'Blue',subject:'Science',total_marks:75}
]}
test('real numeric zero stays zero; expected missing becomes explicit pending not zero',()=>{
 const r=reconcileOfficialSubjectRoster({student,exam,rows:[{subject:'English',marks_obtained:0,total_marks:75}]})
 assert.equal(r.rows.length,2);assert.equal(r.rows[0].marks_obtained,0)
 assert.equal(r.rows[1].subject,'Math');assert.equal(r.rows[1].marks_obtained,null)
 assert.equal(r.rows[1].result_status,'PENDING')
 assert.equal(r.audit.missingCount,1);assert.equal(r.audit.status,'DRAFT')
})
test('complete subject set is still not auto-approved',()=>{
 const r=reconcileOfficialSubjectRoster({student,exam,rows:[
 {subject:'English',marks_obtained:0,total_marks:75},
 {subject:'Math',marks_obtained:70,total_marks:75}
 ]})
 assert.equal(r.audit.status,'READY_FOR_REVIEW');assert.equal(r.audit.approved,false)
 assert.equal(r.audit.missingCount,0)
})
test('cross section/class offerings never leak into a student card',()=>{
 const r=reconcileOfficialSubjectRoster({student,exam,rows:[{subject:'English',marks_obtained:0}]})
 assert.deepEqual(r.rows.map(x=>x.subject),['English','Math'])
})
test('unmapped saved subject preserved and marked draft not deleted',()=>{
 const r=reconcileOfficialSubjectRoster({student,exam,rows:[{subject:'Computer',marks_obtained:60,total_marks:75}]})
 assert.equal(r.rows[0].subject,'Computer');assert.equal(r.audit.unexpectedCount,1)
})
test('missing or empty official catalog forces draft',()=>{
 for(const source of [undefined,[],[{class_name:'Two',section:'Blue',subject:'English'}]]){
  const r=reconcileOfficialSubjectRoster({student,exam:{subject_offerings:source},rows:[{subject:'English',marks_obtained:0}]})
  assert.equal(r.audit.status,'DRAFT')
 }
})
test('backend-equivalent integer grade thresholds have no fractional gaps',()=>{
 for(const [x,label] of [[0,'F'],[39.999,'F'],[40,'D'],[59.99,'D'],[69.999,'C'],[70,'B'],[79.9,'B'],[89.999,'A'],[90,'A+'],[100,'A+']]){
  assert.equal(findGradeForPercent(x,bands)?.label,label,String(x))
 }
})
test('overlap/invalid bounds never silently produce an official grade',()=>{
 assert.equal(findGradeForPercent(50,[{label:'X',from:0,to:60},{label:'Y',from:30,to:70}]),null)
 assert.equal(findGradeForPercent(NaN,bands),null)
})
