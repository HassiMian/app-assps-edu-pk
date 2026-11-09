import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5303;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Science',classes:['8']},{name:'Urdu',classes:['8']}]}}
const students=Array.from({length:55},(_,i)=>({id:i+1,name:'Student '+String(i+1).padStart(2,'0'),roll_number:'M1G26-'+String(i+301),class:'Eight',section:'Blue'}))
const generated={schemaVersion:2,documentType:'ASSPS_LESSON_PLAN',planningType:'daily',status:'draft',classLevel:'8',section:'Blue',startDate:'2026-10-08',endDate:'2026-10-08',subjects:[{subject:'English',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'e1',label:'Reading'}],lessons:[{key:'e1',date:'2026-10-08',period:'1st',subject:'English',unitId:'e1',unitLabel:'Reading',title:'Reading comprehension',objectives:['Read fluently'],activities:[],assessment:'Oral check',homework:'Exercise 4',resources:[],status:'planned',confidence:'high'}]},{subject:'Science',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'s1',label:'Photosynthesis'}],lessons:[{key:'s1',date:'2026-10-08',period:'2nd',subject:'Science',unitId:'s1',unitLabel:'Photosynthesis',title:'Photosynthesis diagram',objectives:[],activities:[],assessment:'',homework:'Label diagram',resources:[],status:'planned',confidence:'high'}]}],analysis:{warnings:[]},provenance:{deterministic:true,aiEnhanced:true}}

test('Daily Diary split workspace personalizes students, supports dynamic A4 counts and Lesson Plan mode',{timeout:120000},async()=>{
 const server=await createServer({root,server:{port:PORT,strictPort:true}});await server.listen();const browser=await chromium.launch({headless:true,executablePath:installedChrome,args:['--no-sandbox','--disable-setuid-sandbox']});const context=await browser.newContext({viewport:{width:1600,height:1050}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 // This is a synthetic browser-layout contract, not a live authenticated API test.
 // Fail-closed runtime authorization is tested separately; prevent unrelated 401
 // responses from redirecting the visual harness before layout checks execute.
 await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await context.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{school_name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',school_logo:''}})}))
 await context.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:students})}))
 await context.route('**/api/lesson-plans?**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})}))
 await context.route('**/api/lesson-plans/planner/generate',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:generated,analysis:generated.analysis,ai:{used:true,model:'test-model'},context:{}})}))
 const page=await context.newPage();page.on('pageerror',e=>console.error('DD_PAGEERROR',e.stack||e.message));page.on('console',m=>{if(m.type()==='error')console.error('DD_CONSOLE',m.text())});try{
  await page.goto(URL,{waitUntil:'domcontentloaded'});await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:12000});await page.locator('[data-dd-class]').selectOption('8');await page.locator('[data-dd-section]').selectOption('Blue');await page.getByText('55 students loaded').waitFor({timeout:10000})


  const diaryLines=[
    'URDU: Page 34 — [Activity] — Learn and complete copy work',
    'ENGLISH: Page 33 — [Complete Page] — Learn and complete copy work',
    'GK: Page 9 — [Bread, Pizza, Burger] — Learn all three words',
    'MATH: Page 40 — [Numbers 11,12,13,14] — Learn and practise counting. Poem: Red Light!',
    'NAZRA: Learn and recite. Activity: Make a Train — Complete the creative activity'
  ].join('\n');
  await page.locator('.dd-paste textarea').first().fill(diaryLines);
  await page.getByRole('button',{name:'Auto Arrange'}).click();
  await page.locator('[data-card-count="12"]').click();
  assert.equal(await page.locator('[data-student-card]').count(),55);
  assert.equal(await page.locator('[data-a4-page]').count(),5);
  const results=[];
  for(const design of [31,32,33,34,35,36,37,38]){
    await page.locator('[data-studio-design="'+design+'"]').click();
    await page.emulateMedia({media:'print'});
    const x=await page.evaluate(()=>{
       const p=[...document.querySelectorAll('[data-a4-page]')];
       const cards=[...document.querySelectorAll('[data-student-card]')];
       return {pageCount:p.length,cardCount:cards.length, pageWidth:parseFloat(getComputedStyle(p[0]).width), pageHeight:parseFloat(getComputedStyle(p[0]).height), overflowingPages:p.filter(el=>el.scrollHeight>el.clientHeight+3).length,
         overflowingCards:cards.filter(el=>el.scrollHeight>el.clientHeight+3).length,
         dividerWidths:[...new Set(cards.map(el=>getComputedStyle(el.querySelector('.dd-sub-cell')).borderRightWidth))],
         rowCounts:[...new Set(cards.map(el=>el.querySelectorAll('.dd-rows>.dd-row').length))]
       }
    });
    results.push({design,...x});
    await page.emulateMedia({media:'screen'});
  }
  console.log('A207_55_STUDENT_12UP_STRESS',JSON.stringify(results));
  assert.equal(results.length,8);
  assert.equal(results.filter(r=>r.cardCount===55&&r.pageCount===5&&r.pageWidth>1100&&r.pageHeight<810&&r.dividerWidths.every(v=>parseFloat(v)>=1.9)).length,8);

  await page.locator('[data-studio-design="35"]').click();
  await page.locator('[data-studio-color="jade"]').click();
  await page.getByRole('button',{name:'Print / PDF'}).click();
  await page.locator('#dd-print-frame').waitFor({state:'attached'});
  const printHtml=await page.evaluate(()=>{
    const doc=document.getElementById('dd-print-frame').contentDocument;
    if(!doc || !doc.querySelector('.dd-card-studio')) throw Error('Isolated print iframe missing');
    return '<!doctype html>'+doc.documentElement.outerHTML;
  });
  assert.match(printHtml,/@page \{ size: A4 landscape; margin: 0; \}/);
  assert.match(printHtml,/dd-a4-landscape/);
  const pp=await context.newPage();
  await pp.setContent(printHtml,{waitUntil:'domcontentloaded'});
  await pp.emulateMedia({media:'print'});
  const printGeom=await pp.evaluate(()=>{
    const p=[...document.querySelectorAll('.dd-a4-page')];
    const cards=[...document.querySelectorAll('.dd-card-studio')];
    const clipped=[];
    for(const [i,card] of cards.entries()){
      if(card.scrollHeight>card.clientHeight+3)clipped.push({card:i,type:'card',over:card.scrollHeight-card.clientHeight});
      for(const [j,task] of [...card.querySelectorAll('.dd-diary-cell,.dd-student-name-field')].entries()){
        if(task.scrollHeight>task.clientHeight+3)clipped.push({card:i,child:j,type:'task',over:task.scrollHeight-task.clientHeight});
      }
    }
    const rect=p[0].getBoundingClientRect();
    return {pages:p.length,cards:cards.length,width:rect.width,height:rect.height,clipped:clipped.slice(0,15)};
  });
  console.log('A207_PRINT_IFRAME_LANDSCAPE',JSON.stringify(printGeom));
  assert.equal(printGeom.pages,5);
  assert.equal(printGeom.cards,55);
  assert.ok(printGeom.width>1100&&printGeom.height<810);
  assert.deepEqual(printGeom.clipped,[]);
  await pp.pdf({path:'/tmp/assps-a207-12up-landscape-55students.pdf',preferCSSPageSize:true,printBackground:true});
  await pp.close();
 }finally{await context.close();await browser.close();await server.close()}
})
