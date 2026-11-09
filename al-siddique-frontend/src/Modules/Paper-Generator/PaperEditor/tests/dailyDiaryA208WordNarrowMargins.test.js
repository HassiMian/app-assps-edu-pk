import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5311;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
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
   'URDU: صفحہ ۳۴ — عمارت، عورت، الفاظ یاد کریں اور کاپی پر لکھیں۔',
   'ENGLISH: Page 33 — Complete Page — Learn and complete copy work',
   'GK: Page 9 — Bread, Pizza, Burger — Learn all three words',
   'MATH: Page 40 — Numbers 11,12,13,14 — Learn and practise counting. Poem: Red Light!',
   'NAZRA: سُبْحَانَ اللّٰهِ — Learn and recite. Make a Train — Complete the creative activity'
 ].join('\n');
 await page.locator('.dd-paste textarea').first().fill(diaryLines);
 await page.getByRole('button',{name:'Auto Arrange'}).click();
 const results=[];
 for(const density of [6,12]){
   await page.locator('[data-card-count="'+density+'"]').click();
   for(const design of [31,32,33,34,35,36,37,38]){
     await page.locator('[data-studio-design="'+design+'"]').click();
     for(const mm of [5,3,2]){
       await page.locator('[data-page-margin="'+mm+'"]').click();
       await page.emulateMedia({media:'print'});
       const result=await page.evaluate(()=>{
         const a4=document.querySelector('[data-a4-page]');
         const card=document.querySelector('[data-student-card]');
         const tasks=[...document.querySelectorAll('.dd-diary-cell')];
         const ps=getComputedStyle(a4);
         const px=parseFloat(ps.paddingLeft),mm=px*25.4/96;
         const pg=a4.getBoundingClientRect(),cr=card.getBoundingClientRect();
         return {marginMm:+mm.toFixed(2),pageWidth:+pg.width.toFixed(1),pageHeight:+pg.height.toFixed(1),
          gap:getComputedStyle(a4).gap,
          cards:document.querySelectorAll('[data-student-card]').length,
          pages:document.querySelectorAll('[data-a4-page]').length,
          clipped:[...document.querySelectorAll('.dd-card-studio')].filter(c=>c.scrollHeight>c.clientHeight+3).length,
          taskClip:tasks.filter(c=>c.scrollHeight>c.clientHeight+3).length,
          subjectLine:parseFloat(getComputedStyle(card.querySelector('.dd-sub-cell')).borderRightWidth)};
       });
       results.push({density,design,requestedMm:mm,...result});
       await page.emulateMedia({media:'screen'});
     }
   }
 }
 const failures=results.filter(x=>Math.abs(x.marginMm-x.requestedMm)>.15||x.clipped||x.taskClip||x.subjectLine<1.9||x.cards!==55||x.pages!==(x.density===12?5:10));
 console.log('A208_48_MARGIN_MATRIX',JSON.stringify({tested:results.length,failed:failures.slice(0,8),failCount:failures.length,examples:results.slice(0,3)}));
 assert.equal(results.length,48);assert.deepEqual(failures,[]);
 for(const density of [6,12]){
   await page.locator('[data-card-count="'+density+'"]').click();
   await page.locator('[data-page-margin="3"]').click();
   await page.getByRole('button',{name:'Print / PDF'}).click();
   await page.locator('#dd-print-frame').waitFor({state:'attached'});
   const html=await page.evaluate(()=>{
     const doc=document.getElementById('dd-print-frame').contentDocument;
     if(!doc||!doc.querySelector('.dd-card-studio'))throw Error('No isolated print iframe document');
     return '<!doctype html>'+doc.documentElement.outerHTML;
   });
   const pp=await context.newPage();
   await pp.setContent(html,{waitUntil:'domcontentloaded'});
   await pp.emulateMedia({media:'print'});
   const actual=await pp.evaluate(()=>{
     const p=document.querySelector('.dd-a4-page');
     const all=[...document.querySelectorAll('.dd-a4-page')];
     const r=p.getBoundingClientRect();
     const margin=parseFloat(getComputedStyle(p).paddingLeft)*25.4/96;
     return {marginMm:margin,pages:all.length,width:r.width,height:r.height,
      clip:[...document.querySelectorAll('.dd-card-studio')].filter(c=>c.scrollHeight>c.clientHeight+3).length};
   });
   console.log('A208_IFRAME_MARGIN',JSON.stringify({density,...actual}));
   assert.ok(Math.abs(actual.marginMm-3)<.15);
   assert.equal(actual.pages,density===6?10:5);
   assert.equal(actual.clip,0);
   await pp.close();
 }
 }finally{await context.close();await browser.close();await server.close()}
})
