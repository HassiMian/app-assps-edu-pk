/* Strict synthetic A4 print test. NO school roster or production data. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.resolve(__dirname,'../../../al-siddique-frontend/node_modules/playwright'));
const style=fs.readFileSync(path.resolve(__dirname,'../../../al-siddique-frontend/src/Modules/Paper-Generator/TermPlannerEditor.css'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}});
  const subjects=['English','Urdu','Mathematics','Science','Islamiyat','Quran / Nazra','Social Studies','Computer'];
  const sections=subjects.map((s,i)=>'<table class="term-print-subject-mini">'+
    '<thead><tr><th colspan="2">'+s+'</th></tr></thead><tbody>'+
    '<tr><th>Syllabus / Classwork</th><td>Complete the teacher-assigned classwork. '+
    (i===0?'Pages 37-48 - Chapter 2: SYNTHETIC EXPLICIT TEACHER LABEL.':'')+
    '</td></tr><tr><th>Assessments</th><td class="term-subject-assessments">Source date not supplied</td></tr></tbody></table>').join('');
  const html='<!doctype html><html><head><style>'+style+'</style><style>@page{size:A4;margin:6mm}'+
    'body{margin:0;background:white}.term-print-sheet{width:198mm;height:285mm}'+
    '.term-print-sheet .term-print-document{height:100%}'+
    '</style></head><body><section class="term-print-sheet" style="--term-cards-per-sheet:1">'+
    '<article class="term-print-document term-template-ivory" style="--term-text-size:11px;'+
    '--term-head-size:14px;--term-school-name:17px;--term-subject-name:12px;'+
    '--term-subject-weight:750;--term-row-height:22px;--term-subject-width:25%;'+
    '--term-text-family:Times New Roman;--term-line-height:1.25;--term-page-padding:6mm">'+
    '<header class="term-letterhead"><h2>AL SIDDIQUE SCHOLARS PUBLIC SCHOOL</h2></header>'+
    '<div class="term-student-identification">STUDENT: SYNTHETIC QA / CLASS FIVE / ROLL DEMO</div>'+
    '<div class="term-subject-separate-tables">'+sections+'</div>'+
    '<div class="term-document-foot">REVIEW ONLY - NO NEW CHAPTER CONTENT</div>'+
    '</article></section></body></html>';
  await page.setContent(html);await page.emulateMedia({media:'print'});
  const check=await page.evaluate(()=>{
   let p=document.querySelector('.term-print-document');
   return {sheets:document.querySelectorAll('.term-print-sheet').length,
    cards:document.querySelectorAll('.term-print-document').length,
    subjects:document.querySelectorAll('.term-print-subject-mini').length,
    clipped:p.scrollHeight>p.clientHeight+2};
  });
  assert.equal(check.sheets,1);assert.equal(check.cards,1);
  assert.equal(check.subjects,8);assert.equal(check.clipped,false);
  const pdf=await page.pdf({format:'A4',preferCSSPageSize:true,printBackground:true});
  const pages=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  assert.equal(pages,1);
  console.log(JSON.stringify({status:'PASS',one_child_one_A4:true,
    subject_tables:8,pages,clipped:false,source_data:'SYNTHETIC_ONLY'}));
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL_TERM_STRICT_A4',e.message);process.exit(3)});
