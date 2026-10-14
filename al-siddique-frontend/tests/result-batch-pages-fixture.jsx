import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProfessionalParametersModal } from '../src/Modules/examination/ResultCards.jsx'

const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#183B63"/><text x="7" y="36" font-size="15" fill="white">TEST</text></svg>'
const logo = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
const school = { name:'ASSPS MOCK QA',logo,showUrduHeader:false, address:'Isolated test', academicYear:'2026-2027' }
const exam = { id:11, name:'First Term Exam', type:'Term Exam',class:'Five',session:'2026-2027',pass_marks:30,total_marks:75 }
const cards = Array.from({length:45}, (_,i) => {
  const number = i+1
  return {
    student:{id:number,name:`QA Student ${String(number).padStart(2,'0')}`,father_name:'Parent Test',className:'Five',section:'Blue',gr_number:`QA-${number}`},
    exam,
    studentMarks:[
      {student_id:number,subject:'English',marks_obtained:55,total_marks:75},
      {student_id:number,subject:'Mathematics',marks_obtained:41,total_marks:50},
    ],
  }
})
window.__testResultCards = cards
createRoot(document.getElementById('result-batch-qa')).render(
  <ProfessionalParametersModal
    cards={cards} school={school}
    gradeBands={[
      {label:'A+',from:90,to:100},{label:'A',from:80,to:89},
      {label:'B',from:70,to:79},{label:'C',from:60,to:69},
      {label:'D',from:50,to:59},{label:'F',from:0,to:49},
    ]}
    onClose={()=>{window.__qaClosed=true}}
  />
)
