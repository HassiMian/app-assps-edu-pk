import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try{
 const m={
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardData.js'),
  ...await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardPrint.js'),
 }
 const ids=m.RESULT_TEMPLATES.filter(t=>['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier'].includes(t.id)).map(t=>t.id)
 const subjects=['English Language and Comprehensive Literature','Mathematics and Quantitative Reasoning','General Science and Environment','اردو زبان اور ادب','Islamic Studies and Moral Development','Computer Science and Digital Literacy','Pakistan Studies and Social Responsibilities','General Knowledge and Current Awareness','Biological Sciences','Physical Sciences and Applied Mechanics','Chemical Sciences and Laboratory Practice','جغرافیہ اور ماحولیاتی مطالعہ']
 const marks=subjects.map((subject,i)=>({subject,marks_obtained:40+i*2,total_marks:100}))
 const page=await browser.newPage({viewport:{width:1200,height:1400}});await page.emulateMedia({media:'print'})
 for(const id of ids){
  const data=m.buildResultCardData({student:{name:'Muhammad Abdullah bin Abdul Rahman Al-Siddique',father_name:'Muhammad Abdul Qayyum bin Abdul Rashid',className:'Class Nine',roll_number:'000912'},exam:{name:'First Term Examination',session:'2026-2027',total_marks:100},studentMarks:marks,school:{name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',address:'Sharif Chowk, Rayya Khas, Narowal',logo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9Cgd6ZQAAAABJRU5ErkJggg=='},options:{...m.DEFAULT_RESULT_OPTIONS,template:id,autoTermColumns:true,gradeBands:[{from:0,to:100,label:'Recorded'}]}})
  const html=renderToStaticMarkup(createElement(m.ResultCardPreview,{data}))
  await page.setContent('<style>'+m.resultCardPrintCss+'</style>'+html)
  const metrics=await page.evaluate(()=>{const main=document.querySelector('.result-card-a4'),b=main.getBoundingClientRect();const footer=document.querySelector('.rc-footer')?.getBoundingClientRect();const table=document.querySelector('.rc-marks-table')?.getBoundingClientRect();return {height:main.clientHeight,scrollHeight:main.scrollHeight,scrollWidth:main.scrollWidth,clientWidth:main.clientWidth,footerBottom:footer?footer.bottom-b.top:null,tableRight:table?table.right-b.left:null,chars:document.querySelectorAll('.premium-bar-item').length,regions:['.rc-standard-header','.rc-student-info','.rc-marks-table','.premium-analytics','.premium-bar-list','.premium-summary-chart','.rc-remarks','.rc-footer'].map(sel=>{const el=document.querySelector(sel);const b=el?.getBoundingClientRect();return [sel,Math.round(b?.top||0),Math.round(b?.height||0)]})}})
  const pdf=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true})
  const count=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  console.log('LONG_TEXT',id,JSON.stringify(metrics),'PDF_PAGES',count)
  assert.equal(metrics.chars,12)
  if(process.env.REPORT_ONLY==='1')continue
  assert.ok(metrics.scrollHeight<=metrics.height+2,'Vertical clipping: '+id)
  assert.ok(metrics.footerBottom<=metrics.height,'Footer outside A4 canvas: '+id)
  assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,'Horizontal clipping: '+id)
  assert.equal(count,1,'Extra A4 print pages: '+id)
 }
}finally{await browser.close();await vite.close()}
