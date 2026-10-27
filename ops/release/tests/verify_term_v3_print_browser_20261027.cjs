/* Read-only synthetic academic-print QA. No school DB or student information. */
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {chromium}=require(path.resolve(__dirname,'../../../al-siddique-frontend/node_modules/playwright'))
const css=fs.readFileSync(path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/TermPlannerEditor.css'),'utf8')

;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const page=await browser.newPage({viewport:{width:1260,height:870}})
  const original='SYNTHETIC QA ONLY — Source teacher instruction is preserved in full without abbreviation. Unit 7, Chapter 3: Formation of clouds; reading exercise 3; mark teacher corrections for review. '
  const long=Array.from({length:95},(_,i)=>'Original weekly statement '+(i+1)+': '+original).join(' ')
  const card=txt=>`<article class="term-print-document" style="--term-text-size:16px;--term-school-name:22px;--term-head-size:19px;--term-subject-name:15px;--term-subject-weight:750;--term-line-height:1.45;--term-page-padding:6mm"><header class="term-letterhead"><h2>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h2><strong>SECOND TERM — SOURCE REVIEW</strong></header><section class="term-student-identification"><strong>Student: Synthetic QA</strong></section><table class="term-print-subjects"><thead><tr><th>SUBJECT</th><th>TERM SYLLABUS / CHAPTERS / PAGE RANGE</th></tr></thead><tbody><tr><th>English</th><td><div class="term-english-content">${txt}</div></td></tr></tbody></table></article>`
  await page.setContent(`<!doctype html><html><head><style>@page{size:A4;margin:6mm}</style><style>${css}</style></head><body class="term-reflow-large"><div id="wn-term-print" class="term-print-pages"><section class="term-print-sheet" style="--term-cards-per-sheet:2">${card(long)}${card('Short complete source statement.')}</section></div></body></html>`)
  await page.emulateMedia({media:'print'})
  const result=await page.evaluate(()=>{
   const d=document.querySelector('.term-print-document')
   const h=d.querySelector('.term-letterhead h2')
   const th=d.querySelector('tbody th')
   const sheet=document.querySelector('.term-print-sheet')
   return {bodySize:getComputedStyle(d).fontSize,
           schoolSize:getComputedStyle(h).fontSize,
           subjectSize:getComputedStyle(th).fontSize,
           overflow:getComputedStyle(d).overflow,
           documentHeight:getComputedStyle(d).height,
           sheetHeight:getComputedStyle(sheet).height,
           count:document.querySelectorAll('.term-print-document').length}
  })
  assert.equal(result.bodySize,'16px')
  assert.equal(result.schoolSize,'22px')
  assert.equal(result.subjectSize,'15px')
  assert.equal(result.overflow,'visible')
  assert.equal(result.count,2)
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
  assert.ok(pdf.length>4000)
  // Chromium writes /Type /Page records as uncompressed PDF dictionary objects.
  const pageCount=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
  assert.ok(pageCount>=2,'Long original source statement must extend across >=2 A4 pages; got '+pageCount)
  console.log(JSON.stringify({result:'PASS',synthetic_only:true,
    actual_chromium_print_to_pdf:true,printed_pages:pageCount,
    selected_fonts_preserved:result,student_data_exposed:false,
    school_db_or_browser_session_touched:false}))
 }finally{await browser.close()}
})().catch(e=>{console.error('TERM_A4_BROWSER_FAIL',e.message);process.exit(1)})
