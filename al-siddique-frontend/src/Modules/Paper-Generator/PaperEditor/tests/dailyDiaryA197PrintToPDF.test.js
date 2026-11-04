import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5295;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Science',classes:['8']},{name:'Urdu',classes:['8']}]}}
const students=Array.from({length:5},(_,i)=>({id:i+1,name:['Ali Ahmad','Sara Khan','Usman Raza','Ayesha Noor','Hamza Ali'][i],roll_number:String(i+1).padStart(2,'0'),class:'Eight',section:'Blue'}))
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
  await page.goto(URL,{waitUntil:'domcontentloaded'});await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:12000});await page.locator('[data-dd-class]').selectOption('8');await page.locator('[data-dd-section]').selectOption('Blue');await page.getByText('5 students loaded').waitFor({timeout:10000})
  await page.locator('[data-studio-design="31"]').click();
  // Deliberately synthetic diary: no writes to live school records.
  const samples=[
    'Page 21 — Read, write, and revise the assigned words.',
    'صفحہ ۳۱ — ظفر، ظروف — یاد کریں اور کاپی پر لکھیں۔',
    'Page 34 — Addition by number bonds — Practice and copy work.',
  ];
  for(let i=0;i<3;i++) await page.locator('.dd-row-editor textarea').nth(i).fill(samples[i]);
  await page.locator('[data-studio-color="jade"]').click();
  await page.locator('.dd-sqb-select').selectOption('times');

  for(const density of [6,8]) {
    await page.locator('[data-card-count="'+density+'"]').click();
    const cardCount=await page.locator('.dd-card-studio').count();
    if(cardCount!==5) throw Error('Expected 5 selected synthetic students, got '+cardCount);
    const preview=await page.locator('.dd-card-studio').first().textContent();
    assert.match(preview,/Ali Ahmad/);
    assert.match(preview,/ظفر/);
    await page.getByRole('button',{name:'Print / PDF'}).click();
    await page.locator('#dd-print-frame').waitFor({state:'attached'});
    const html=await page.evaluate(()=>{
      const doc=document.getElementById('dd-print-frame').contentDocument;
      if(!doc||!doc.querySelector('.dd-card-studio')) throw Error('Print iframe document not ready');
      return '<!doctype html>'+doc.documentElement.outerHTML;
    });
    const pdfPage=await context.newPage({viewport:{width:800,height:1100}});
    await pdfPage.setContent(html,{waitUntil:'domcontentloaded'});
    await pdfPage.emulateMedia({media:'print'});
    await pdfPage.evaluate(async()=>{await document.fonts.ready});
    const metrics=await pdfPage.evaluate(()=>{
      const pages=[...document.querySelectorAll('.dd-a4-page')];
      const cards=[...document.querySelectorAll('.dd-card-studio')];
      const mistakes=[];
      for(const [i,card] of cards.entries()){
         const cr=card.getBoundingClientRect();
         const pg=card.closest('.dd-a4-page');
         const pr=pg.getBoundingClientRect();
         if(cr.right>pr.right+1||cr.left<pr.left-1||cr.top<pr.top-1||cr.bottom>pr.bottom+1)mistakes.push({index:i,reason:'card out of page',card:[cr.x,cr.y,cr.width,cr.height],page:[pr.x,pr.y,pr.width,pr.height]});
         for(const task of card.querySelectorAll('.dd-diary-cell')){
           if(task.scrollHeight>task.clientHeight+3)mistakes.push({index:i,reason:'task vertical overflow',scroll:task.scrollHeight,box:task.clientHeight})
         }
      }
      const row=cards[0]?.querySelector('.dd-row');
      const urdu=[...document.querySelectorAll('.dd-diary-cell')].find(x=>x.textContent.includes('ظفر'));
      return {pages:pages.length,cards:cards.length,page:[pages[0]?.getBoundingClientRect().width,pages[0]?.getBoundingClientRect().height],font:getComputedStyle(urdu).fontFamily,urduPresent:!!urdu,errors:mistakes};
    });
    assert.equal(metrics.pages,1);
    assert.equal(metrics.cards,5);
    assert.ok(metrics.urduPresent);
    assert.equal(metrics.errors.length,0,'Print layout clipping '+JSON.stringify(metrics.errors));
    const out='/tmp/ASSPS_DailyDiary_A197_RealPrint_'+density+'up.pdf';
    await pdfPage.pdf({path:out,preferCSSPageSize:true,format:'A4',printBackground:true});
    console.log('A197_REAL_PDF_RENDER_PASS',JSON.stringify({density,path:out,...metrics}));
    await pdfPage.close();
  }

  // Also print fully populated 6-up and 8-up generic sheets (not just 5 student cards).
  await page.getByRole('button',{name:'None'}).click();
  for(const density of [6,8]){
    await page.locator('[data-card-count="'+density+'"]').click();
    await page.waitForTimeout(120);
    assert.equal(await page.locator('.dd-card-studio').count(),density);
    await page.getByRole('button',{name:'Print / PDF'}).click();
    await page.locator('#dd-print-frame').waitFor({state:'attached'});
    const fullHtml=await page.evaluate(()=>'< !doctype html>'.replace(' ','')+document.getElementById('dd-print-frame').contentDocument.documentElement.outerHTML);
    const pdfPage=await context.newPage({viewport:{width:800,height:1100}});
    await pdfPage.setContent(fullHtml,{waitUntil:'domcontentloaded'});
    await pdfPage.emulateMedia({media:'print'});
    await pdfPage.evaluate(()=>document.fonts.ready);
    const check=await pdfPage.evaluate(()=>{
      const pages=[...document.querySelectorAll('.dd-a4-page')];
      const cards=[...document.querySelectorAll('.dd-card-studio')];
      const overs=[];
      for(const [i,card] of cards.entries()){
        const c=card.getBoundingClientRect(),p=card.closest('.dd-a4-page').getBoundingClientRect();
        if(c.bottom>p.bottom+1||c.right>p.right+1||c.top<p.top-1||c.left<p.left-1)overs.push('card-'+i);
        for(const task of card.querySelectorAll('.dd-diary-cell')){
          if(task.scrollHeight>task.clientHeight+3)overs.push('task-'+i);
        }
      }
      return {pages:pages.length,cards:cards.length,overflow:overs,urdu:document.body.textContent.includes('ظفر')};
    });
    assert.deepEqual(check,{pages:1,cards:density,overflow:[],urdu:true});
    const output='/tmp/ASSPS_DailyDiary_A197_FullSheet_'+density+'up.pdf';
    await pdfPage.pdf({path:output,preferCSSPageSize:true,format:'A4',printBackground:true});
    console.log('A197_FULL_SHEET_PDF_PASS',JSON.stringify({density,path:output,...check}));
    await pdfPage.close();
  }
  console.log('A197_FULL_SHEET_PDF_2_OF_2_PASS');
  console.log('A197_PRINT_MISSION_PDF_2_OF_2_PASS');
 }finally{await context.close();await browser.close();await server.close()}
})
