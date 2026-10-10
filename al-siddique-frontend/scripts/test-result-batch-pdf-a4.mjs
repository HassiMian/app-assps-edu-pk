import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const vite=await createServer({server:{middlewareMode:true},appType:'custom'})
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
try {
 const m=await vite.ssrLoadModule('/src/Modules/examination/premiumResultCardTemplates.jsx')
 const {resolveResultPrintOptions}=await vite.ssrLoadModule('/src/Modules/examination/resultPrintPlanning.js')
 // Tiny transparent pixel is a fixture ONLY; school logos never replaced in app.
 const fixturePixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9Cgd6ZQAAAABJRU5ErkJggg=='
 const exams=['First Term Exam','Second Term Exam','Final Exam']
 const students=Array.from({length:Number(process.env.CARDS||3)},(_,i)=>{
  const exam={name:exams[i%3],total_marks:100,session:'2026–2027'}
  const rows=Array.from({length:12},(_,s)=>({subject:['English','Mathematics','Science','Urdu','Computer','Islamiyat','Social Studies','General Knowledge','Physics','Chemistry','Biology','Geography'][s],marks_obtained:65+((s+i)%31),total_marks:100}))
  return m.buildResultCardData({student:{name:`Fixture Student ${String(i+1).padStart(3,'0')}`,father_name:'Fixture Parent',className:'Nine',roll_number:String(i+1)},exam,studentMarks:rows,school:{name:'Fixture School (test only)',logo:fixturePixel,address:'Example street'},options:{...m.DEFAULT_RESULT_OPTIONS,template:['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier'][i%9],autoTermColumns:true,gradeBands:[{from:0,to:39,label:'F'},{from:40,to:100,label:'P'}]}})
 })
 for (const [i,card] of students.entries()) {
  const expected=['includeFirstTerm','includeSecondTerm','includeFinalTerm'][i%3]
  const flags=resolveResultPrintOptions(card.options,{name:exams[i%3]})
  assert.equal(flags[expected],true)
  assert.equal(card.result.percentage===null,false,'Every mixed-term student must have scored marks')
  assert.equal(card.result.subjects.length,12)
 }
 let html=''
 const oldWindow=globalThis.window
 globalThis.window={open:()=>({document:{write(value){html=value},close(){},set title(_x){}},focus(){}}),alert(){}}
 try {m.openResultPrintWindow(students,true)} finally {globalThis.window=oldWindow}
 assert.ok(html.includes('result-print-status'))
 assert.equal((html.match(/data-result-school-logo/g)||[]).length>=students.length,true)
 const page=await browser.newPage({viewport:{width:1100,height:1300}})
 await page.route('**/*', route=>route.request().url().startsWith('data:')?route.continue():route.abort())
 await page.setContent(html,{waitUntil:'load',timeout:30000})
 await page.emulateMedia({media:'print'})
 const status=await page.locator('#result-print-status').innerText()
 assert.equal(status,'','Fixture logo should load before printing')
 assert.equal(await page.locator('.result-card-a4').count(),students.length)
 const usedThemes=await page.locator('.result-card-a4').evaluateAll(nodes=>[...new Set(nodes.map(el=>el.className.split(' ').find(c=>c.startsWith('premium-')&&c!=='premium-card')))])
 if(students.length>=9) assert.equal(usedThemes.length,9,'Batch output must include all nine distinct template architectures')
 for (const [i,student] of students.entries()) {
  const text=await page.locator('.result-card-a4').nth(i).innerText()
  assert.ok(text.includes(student.student.name),'Student '+(i+1)+' must appear on its own card')
  const headers=await page.locator('.result-card-a4').nth(i).locator('th').allInnerTexts()
  const termLabel=['First Term','Second Term','Final Term'][i%3]
  assert.ok(headers.some(x=>x.toLowerCase().includes(termLabel.toLowerCase())),'Card '+i+' '+students[i].options.template+' current '+termLabel+' headers '+JSON.stringify(headers))
  assert.equal(headers.filter(x=>/^(First Term|Second Term|Final Term|Assessment|Third Term)$/i.test(x.trim())).length,1,'No extra unused term columns')
 }
 const buffer=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
 const pdfText=Buffer.from(buffer).toString('latin1')
 const pages=(pdfText.match(/\/Type\s*\/Page\b/g)||[]).length
 console.log('BATCH_PDF_PAGE_COUNT',pages,'STUDENTS',students.length,'PDF_BYTES',buffer.length)
 assert.equal(pages,students.length,'One printable A4 PDF page per actual student')
 await page.close()
 console.log('BATCH_PDF_PRINT_READY_PASS mixed terms + variable template types; one A4 per student')
}finally{await browser.close();await vite.close()}
