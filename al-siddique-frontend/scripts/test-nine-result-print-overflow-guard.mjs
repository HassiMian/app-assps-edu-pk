import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9Cgd6ZQAAAABJRU5ErkJggg=='
const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try{
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const make=(i,count,feedback)=>m.buildResultCardData({
  student:{name:'Test Student '+i,className:'Class Nine',roll_number:String(i)},
  exam:{name:'First Term',total_marks:100},
  studentMarks:Array.from({length:count},(_,j)=>({subject:'A very long subject '+(j+1)+' for complete examination research and practical studies',marks_obtained:45+j%10,total_marks:100})),
  school:{name:'Source School',logo:pixel},
  options:{...m.DEFAULT_RESULT_OPTIONS,template:['signature-editorial','academic-heritage','examination-dossier'][i%3],autoTermColumns:true,teacherRemarksEdited:true,teacherRemarks:'Demonstrated conscientious ongoing interest in daily work and improvement. '.repeat(Math.ceil(feedback/80)).slice(0,feedback)}
 })
 const getHtml=cards=>{
  let html=''
  const prev=globalThis.window
  globalThis.window={open:()=>({document:{write(content){html=content},close(){}},focus(){}}),alert(){}}
  try{m.openResultPrintWindow(cards)}finally{globalThis.window=prev}
  return html
 }
 for(const [testName,cards,shouldBlock] of [
  ['valid_two_cards',[make(0,9,90),make(1,12,130)],false],
  ['extreme_second_card',[make(0,9,90),make(1,39,1900)],true]
 ]){
  const html=getHtml(cards)
  const page=await browser.newPage({viewport:{width:1200,height:1400}})
  await page.goto('about:blank')
  await page.evaluate(()=>{window.__printCount=0;window.print=()=>{window.__printCount++}})
  await page.setContent(html,{waitUntil:'load',timeout:30000})
  await page.waitForFunction(()=>window.__printCount>0||Boolean(document.querySelector('#result-print-status')?.textContent),null,{timeout:10000})
  const actual=await page.evaluate(()=>({printed:window.__printCount,status:document.querySelector('#result-print-status')?.textContent||'',cards:document.querySelectorAll('.result-card-a4').length}))
  assert.equal(actual.cards,2)
  if(shouldBlock){assert.equal(actual.printed,0);assert.match(actual.status,/Result card 2 exceeds its A4 print area/)}
  else{assert.equal(actual.printed,1);assert.equal(actual.status,'')}
  console.log('BATCH_PRINT_PREFLIGHT_PASS',testName,JSON.stringify(actual))
  await page.close()
 }
}finally{await browser.close();await vite.close()}
