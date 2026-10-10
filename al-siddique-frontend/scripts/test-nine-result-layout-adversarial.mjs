import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const templateIds = ['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier']
const scenario = process.env.SCENARIO || 'dense'
const vite=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'})
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9Cgd6ZQAAAABJRU5ErkJggg=='
const longName='Muhammad Abdul Rahman al-Siddique Khan bin Muhammad Iftikhar Ahmed'
const longSchool='AL SIDDIQUE SCHOLARS PUBLIC SCHOOL CAMPUS FOR ADVANCED LEARNING AND ACADEMIC EXCELLENCE'
const longSubjects=['English Language & Comprehensive Literature','Mathematics & Quantitative Reasoning','General Science and Sustainable Environment','اردو زبان اور کلاسیکی و جدید ادب','Islamic Studies & Moral Development','Computer Science, Artificial Intelligence and Digital Literacy','Pakistan Studies and Social Responsibilities','General Knowledge and Current Awareness','Biological Sciences and Human Physiology','Physical Sciences and Applied Mechanics','Chemical Sciences and Laboratory Practice','جغرافیہ اور ماحولیاتی مطالعہ','Economics and Entrepreneurship','Advanced Mathematics and Statistics','Science and Technology Experiments','Environmental Sciences and Project Research']
const standardSubjects=['English','Maths','Science','Urdu','Islamiyat','Computer','Social Studies','General Knowledge','Biology','Physics','Chemistry','Geography','Economics','Statistics','History','Civics']
const plan={minimal:{count:1,long:false,remarks:40,school:false},normal:{count:9,long:false,remarks:75,school:false},dense:{count:12,long:true,remarks:110,school:true},extended:{count:16,long:true,remarks:110,school:true},remarks:{count:12,long:true,remarks:520,school:true},identity:{count:10,long:false,remarks:115,school:true},fiveTerms:{count:12,long:true,remarks:130,school:true},overflow:{count:20,long:true,remarks:520,school:true}}
const active=plan[scenario];if(!active)throw Error('Unknown SCENARIO: '+scenario)
const subjects=Array.from({length:active.count},(_,i)=>(active.long?longSubjects:standardSubjects)[i%16]+(i>=16?' - Applied Section '+(i-15):''))
let failures=[]
try{
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const page=await browser.newPage({viewport:{width:1180,height:1360}})
 await page.emulateMedia({media:'print'})
 for(const id of templateIds){
  const data=m.buildResultCardData({student:{name:active.school?longName:'Test Student',father_name:active.school?longName:'Test Father',className:'Class Nine - Section A',roll_number:'09-1012'},exam:{name:'First Term',session:'2026-2027',teacherRemarks:'Consistent classroom participation. '.repeat(Math.ceil(active.remarks/36)).slice(0,active.remarks),total_marks:100},studentMarks:subjects.map((subject,i)=>({subject,marks_obtained:42+i,total_marks:100,...(scenario==='fiveTerms'?{assessmentMarks:42+i,firstTermMarks:44+i,secondTermMarks:45+i,thirdTermMarks:46+i,finalTermMarks:47+i}:{})})),school:{name:active.school?longSchool:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',address:active.school?'Sharif Chowk, Rayya Khas, Narowal, Punjab, Pakistan — Exemplary Campus Office and Academics':'Sharif Chowk, Rayya Khas, Narowal',slogan:active.school?'العلم والأخلاق والتربية الحديثة':'',logo:pixel},options:{...m.DEFAULT_RESULT_OPTIONS,...(['remarks','overflow'].includes(scenario)?{teacherRemarks:'Consistent classroom participation. '.repeat(Math.ceil(active.remarks/36)).slice(0,active.remarks)}:{}),autoTermColumns:scenario!=='fiveTerms',template:id,gradeBands:[{from:0,to:100,label:'Recorded'}]}})
  const markup=renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
  await page.setContent('<html><head><style>'+m.resultCardPrintCss+'</style></head><body>'+markup+'</body></html>',{waitUntil:'load'})
  const q=await page.evaluate(()=>{
   const root=document.querySelector('.result-card-a4'),rootRect=root.getBoundingClientRect()
   const coord=sel=>{const el=document.querySelector(sel);if(!el)return null;const b=el.getBoundingClientRect();return {left:Math.round(b.left-rootRect.left),top:Math.round(b.top-rootRect.top),right:Math.round(b.right-rootRect.left),bottom:Math.round(b.bottom-rootRect.top),width:Math.round(b.width),height:Math.round(b.height)}}
   const invalid=[]
   document.querySelectorAll('.rc-school-name,.rc-school-address,.rc-student-info strong,.rc-marks-table th,.rc-marks-table td,.premium-bar-name,.premium-bar-item b,.rc-remarks p,.rc-footer p').forEach(el=>{
    if(el.scrollWidth>el.clientWidth+2)invalid.push({field:el.className||el.tagName,text:el.textContent.slice(0,55),extraWidth:el.scrollWidth-el.clientWidth})
    if(el.scrollHeight>el.clientHeight+2)invalid.push({field:el.className||el.tagName,text:el.textContent.slice(0,55),extraHeight:el.scrollHeight-el.clientHeight})
   })
   const footer=coord('.rc-footer'),remarks=coord('.rc-remarks'),analytics=coord('.premium-analytics'),table=coord('.rc-marks-table'),header=coord('.rc-standard-header')
   const violations=[]
   if(root.scrollHeight>root.clientHeight+2)violations.push('page-vertical-overflow '+(root.scrollHeight-root.clientHeight))
   if(root.scrollWidth>root.clientWidth+2)violations.push('page-horizontal-overflow '+(root.scrollWidth-root.clientWidth))
   if(footer?.bottom>root.clientHeight+1)violations.push('footer-clipped '+footer.bottom+'>'+root.clientHeight)
   if(table&&analytics&&table.bottom>analytics.top+1)violations.push('table-overlaps-analytics '+table.bottom+'>'+analytics.top)
   if(remarks&&footer&&remarks.bottom>footer.top+1)violations.push('remarks-overlaps-footer '+remarks.bottom+'>'+footer.top)
   if(header&&table&&header.bottom>table.top+1)violations.push('header-overlaps-table '+header.bottom+'>'+table.top)
   return {rootHeight:root.clientHeight,footer,remarks,analytics,table,header,violations,invalid:invalid.slice(0,7),nameLines:Math.round(coord('.rc-school-name')?.height||0)}
  })
  if(process.env.CAPTURE==='1'&&['corporate-ledger','young-scholars'].includes(id)){
   await page.locator('.result-card-a4').screenshot({path:'/tmp/assps-p10-'+scenario+'-'+id+'.png'})
  }
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
  const count=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  if(count!==1)q.violations.push('pdf-page-count '+count)
  if(q.invalid.length)q.violations.push('text-overflow '+q.invalid.length)
  console.log('AUDIT',scenario,id,JSON.stringify(q))
  if(q.violations.length)failures.push({id,violations:q.violations})
 }
 await page.close()
 if(failures.length){console.error('LAYOUT_RED',scenario,JSON.stringify(failures));process.exitCode=1}else console.log('LAYOUT_GREEN',scenario,'9/9 all content/spacing/text and A4 page count')
}finally{await browser.close();await vite.close()}
