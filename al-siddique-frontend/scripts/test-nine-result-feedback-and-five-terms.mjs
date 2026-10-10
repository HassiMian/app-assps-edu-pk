import assert from 'node:assert/strict'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const m={
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardData.js'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardPrint.js'),
 }
 const school={name:'Synthetic School',logo:'/api/uploads/school.png'}
 const student={name:'Student Test',className:'Seven',roll_number:'009'}
 const remarksA='Excellent classroom preparation, consistent science laboratory participation.'
 const remarksB='Attentive oral response and improved handwriting across the current examination.'
 const opts={...m.DEFAULT_RESULT_OPTIONS,autoTermColumns:true,template:'corporate-ledger',gradeBands:[{from:0,to:100,label:'G'}]}
 const build=(examName,remarks,options=opts)=>m.buildResultCardData({school,student,exam:{name:examName,total_marks:100,teacherRemarks:remarks},studentMarks:[{subject:'English',marks_obtained:76,total_marks:100}],options})
 const cardA=build('First Term',remarksA),cardB=build('Second Term',remarksB)
 assert.equal(cardA.result.teacherRemarks,remarksA,'Saved exam remarks preserved for student A')
 assert.equal(cardB.result.teacherRemarks,remarksB,'Saved exam remarks preserved for student B')
 assert.ok(renderToStaticMarkup(createElement(m.ResultCardPreview,{data:cardA})).includes(remarksA))
 assert.ok(renderToStaticMarkup(createElement(m.ResultCardPreview,{data:cardB})).includes(remarksB))
 const edited=build('First Term',remarksA,{...opts,teacherRemarksEdited:true,teacherRemarks:'Manually verified customized comment.'})
 assert.equal(edited.result.teacherRemarks,'Manually verified customized comment.')
 const cleared=build('First Term',remarksA,{...opts,teacherRemarksEdited:true,teacherRemarks:''})
 assert.equal(cleared.result.teacherRemarks,'','Intentional blank override must be respected')
 const five=m.buildResultCardData({student,school,exam:{name:'Final Examination',total_marks:100},studentMarks:[{subject:'Advanced Computer',total_marks:100,assessmentMarks:60,firstTermMarks:70,secondTermMarks:80,thirdTermMarks:90,finalTermMarks:100}],options:{...opts,autoTermColumns:false,includeAssessment:true,includeFirstTerm:true,includeSecondTerm:true,includeThirdTerm:true,includeFinalTerm:true}})
 const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data:five}))
 for(const label of ['Assess.','Term 1','Term 2','Term 3','Final'])assert.ok(html.includes('>'+label+'</th>'),label+' column missing')
 assert.equal(five.result.subjects[0].totalMarks,500)
 assert.equal(five.result.subjects[0].obtainedMarks,400)
 assert.equal(five.result.percentage,80)
 assert.equal(five.result.grade,'G')
 console.log('NINE_FEEDBACK_AND_TERMS_PASS: actual exam-specific comments, teacher explicit override, compact five-term headings, 400/500=80%')
}finally{await vite.close()}
