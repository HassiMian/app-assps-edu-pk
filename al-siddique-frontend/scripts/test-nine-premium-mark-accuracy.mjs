import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
try {
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const ids=['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier']
 assert.equal(m.RESULT_TEMPLATES.filter(t=>ids.includes(t.id)).length,9)
 const school={name:'School From SaaS Settings',logo:'https://logo.test/authorized-tenant.png',address:'Example Only'}
 const student={name:'Fixture Student',className:'Class Six',roll_number:'046'}
 const base={student,school,exam:{name:'First Term Examination',session:'2026-27'},studentMarks:[
  {subject:'English',marks_obtained:80,total_marks:100},
  {subject:'Mathematics',marks_obtained:33.5,total_marks:50},
  {subject:'Physics',marks_obtained:0,total_marks:100},
  {subject:'Urdu',marks_obtained:null,total_marks:100},
 ]}
 const bands=[{from:0,to:39,label:'F'},{from:40,to:79,label:'C'},{from:80,to:100,label:'A'}]
 for(const id of ids){
  const options={...m.DEFAULT_RESULT_OPTIONS,template:id,gradeBands:bands}
  const data=m.buildResultCardData({...base,options})
  const rows=data.result.subjects
  assert.equal(rows.length,4)
  assert.equal(rows[0].percentage,80)
  assert.equal(rows[0].grade,'A')
  assert.equal(rows[1].percentage,67)
  assert.equal(rows[1].grade,'C')
  assert.equal(rows[1].obtainedMarks,33.5)
  assert.equal(rows[2].percentage,0)
  assert.equal(rows[2].grade,'F')
  assert.equal(rows[3].percentage,null)
  assert.equal(rows[3].pending,true)
  assert.equal(data.result.obtainedMarks,113.5)
  assert.equal(data.result.totalMarks,250)
  assert.equal(data.result.pendingCount,1)
  assert.equal(data.result.percentage,null,'Overall grade must remain pending if a subject is missing')
  assert.equal(data.result.grade,'—')
  const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
  for(const text of ['School From SaaS Settings','authorized-tenant.png','Subject-wise Performance','Performance Summary','Mathematics','33.5','Pending marks','First Term'])assert.ok(html.includes(text),id+' must display '+text)
  assert.ok(!html.includes('apex-logo.svg'))
  assert.ok(!html.includes('All Classes'))
  assert.equal((html.match(/class="premium-bar-item"/g)||[]).length,4)
  const mandatory=renderToStaticMarkup(createElement(m.ResultCardPreview,{data:{...data,options:{...data.options,includeCharts:false,orientation:'landscape'}}}))
  assert.ok(mandatory.includes('premium-donut')&&mandatory.includes('premium-bar-item'),'Both charts mandatory for '+id)
  assert.ok(!mandatory.includes('result-card-a4 landscape'),'A4 portrait required for '+id)
  assert.ok(html.includes('width:67%'),'Mathematics 33.5/50 must render a 67% subject bar')
  console.log('NINE_MARKS_PASS',id,'80/100 33.5/50 0/100 null; aggregate pending')
 }
 const complete=m.buildResultCardData({...base,studentMarks:base.studentMarks.slice(0,3),options:{...m.DEFAULT_RESULT_OPTIONS,template:ids[0],gradeBands:bands}})
 assert.equal(complete.result.totalMarks,250)
 assert.equal(complete.result.obtainedMarks,113.5)
 assert.equal(complete.result.percentage,45.4)
 assert.equal(complete.result.grade,'C')
 const t1=m.buildResultCardData({...base,exam:{name:'Term 1',total_marks:40},studentMarks:[{subject:'Chemistry',marks_obtained:33,total_marks:40}],options:{...m.DEFAULT_RESULT_OPTIONS,template:ids[8],gradeBands:bands}})
 assert.equal(t1.result.subjects[0].firstTermMarks,33,'Term 1 data must land in the FIRST term column')
 assert.equal(t1.result.percentage,82.5)
 assert.equal(t1.result.grade,'A')
 const manual=m.buildResultCardData({...base,studentMarks:[{subject:'English',firstTermMarks:80,secondTermMarks:null,total_marks:100}],options:{...m.DEFAULT_RESULT_OPTIONS,template:ids[7],autoTermColumns:false,includeAssessment:false,includeFirstTerm:true,includeSecondTerm:true,includeThirdTerm:false,includeFinalTerm:false,gradeBands:bands}})
 assert.equal(manual.result.subjects[0].totalMarks,200)
 assert.equal(manual.result.subjects[0].percentage,null,'Half-complete two-term row must never receive a passing grade')
 assert.equal(manual.result.subjects[0].grade,'—')
 const fractional=m.buildResultCardData({...base,studentMarks:[{subject:'English',marks_obtained:79.8,total_marks:100}],options:{...m.DEFAULT_RESULT_OPTIONS,template:ids[0],gradeBands:bands}})
 assert.equal(fractional.result.percentage,79.8)
 assert.equal(fractional.result.grade,'—','Grade bands apply to unrounded percentage, matching server rule instead of guessing A')
 console.log('ALL_NINE_TEMPLATE_MARKS_VALIDATION_PASS / complete weighted 113.5/250, term1, manual incomplete, fractional boundary')
}finally{await vite.close()}
