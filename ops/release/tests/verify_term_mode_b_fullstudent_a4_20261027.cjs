'use strict'
const fs=require('fs'),path=require('path'),assert=require('assert/strict')
const {chromium}=require(path.resolve(__dirname,'../../../al-siddique-frontend/node_modules/playwright'))
const source=path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/TermPlannerEditor.css')
const css=fs.readFileSync(source,'utf8')
const labels=['English','Urdu','Mathematics','Science','Islamiyat','Quran','Social Studies','Computer Science','Biology','Chemistry','Physics','General Knowledge']
function makeCard(n){
 const en='Read the assigned lesson; complete classwork, homework and prescribed exercises. Revise the work.'
 const ur='متعلقہ سبق پڑھیں، کلاس ورک اور ہوم ورک مکمل کریں۔ مقررہ مشقوں کی دہرائی کریں۔'
 const trs=labels.slice(0,n).map((label,i)=>'<table class="term-print-subject-mini"><thead><tr><th colspan="2">'+label+'</th></tr></thead><tbody><tr><th>Syllabus / classwork</th><td>'+
 (i===1||i===4||i===5?'<div lang="ur" dir="rtl" class="term-urdu-content">'+ur+'</div>':en)+
 '<small class="term-pages">Pages 37–48</small></td></tr><tr><th>Assessments</th><td>Teacher assessment source pending</td></tr></tbody></table>').join('')
 return '<div id="wn-term-print" class="term-print-pages"><section class="term-print-sheet" style="--term-cards-per-sheet:1"><article class="term-print-document term-template-silver" style="--term-text-size:11px;--term-subject-name:12px;--term-school-name:17px;--term-head-size:14px;--term-page-padding:6mm"><header class="term-letterhead"><h2>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h2><strong>SECOND TERM</strong></header><div class="term-meta">Academic session 2026–2027</div><div class="term-student-identification"><strong>SYNTHETIC STUDENT — NO REAL DATA</strong><span>Class: TEST · Roll: TEST</span></div><div class="term-subject-separate-tables">'+trs+'</div><div class="term-document-foot">PRIVATE ACADEMIC REVIEW DRAFT</div></article></section></div>'
}
;(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1350}})
  await page.emulateMedia({media:'print'})
  for(const count of [8,10,12]){
   await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body>'+makeCard(count)+'</body></html>',{waitUntil:'load'})
   await page.evaluate(()=>document.fonts.ready)
   const dims=await page.evaluate(()=>{
    const a=document.querySelector('.term-print-document'),u=document.querySelector('[lang="ur"]')
    const end=document.querySelector('.term-print-subject-mini:last-of-type')||[...document.querySelectorAll('.term-print-subject-mini')].at(-1);const pageBox=a.getBoundingClientRect(),lastBox=end.getBoundingClientRect();return {client:a.clientHeight,scroll:a.scrollHeight,lastTableBottom:Math.round(lastBox.bottom),cardBottom:Math.round(pageBox.bottom),renderedSubjects:document.querySelectorAll('.term-print-subject-mini').length,urduFont:getComputedStyle(u).fontFamily}
   })
   const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true})
   const pageCount=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length
   const clipped=dims.scroll>dims.client+3
   console.log(JSON.stringify({subjects:count,pageCount,clipped,...dims,synthetic:true}))
   assert.equal(dims.renderedSubjects,count)
   assert.equal(pageCount,1,'Unexpected extra A4 for '+count+' subjects')
   assert.ok(!clipped,'Clipping detected '+count+' subjects '+JSON.stringify(dims))
   assert.ok(dims.lastTableBottom<dims.cardBottom-4,'Last subject table below printable card bottom')
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('MODE_B_QA_FAILED',e.stack);process.exitCode=2})
