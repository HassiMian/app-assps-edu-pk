import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5344;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'Flyer',name:'Flyer',active:true,sections:['Pink']}],subjects:[{name:'English',classes:['Flyer']},{name:'Science',classes:['Flyer']},{name:'Urdu',classes:['Flyer']}]}}
const students=Array.from({length:25},(_,i)=>({id:i+1,name:['Ali Ahmad','Sara Khan','Usman Raza','Ayesha Noor','Hamza Ali','Fiza Afzaal','Haider Ali','Abdullah Basharat'][i%8],roll_number:'MIG26-'+String(i+60).padStart(3,'0'),class:'Flyer',section:'Pink'}))
const generated={schemaVersion:2,documentType:'ASSPS_LESSON_PLAN',planningType:'daily',status:'draft',classLevel:'8',section:'Blue',startDate:'2026-10-08',endDate:'2026-10-08',subjects:[{subject:'English',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'e1',label:'Reading'}],lessons:[{key:'e1',date:'2026-10-08',period:'1st',subject:'English',unitId:'e1',unitLabel:'Reading',title:'Reading comprehension',objectives:['Read fluently'],activities:[],assessment:'Oral check',homework:'Exercise 4',resources:[],status:'planned',confidence:'high'}]},{subject:'Science',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'s1',label:'Photosynthesis'}],lessons:[{key:'s1',date:'2026-10-08',period:'2nd',subject:'Science',unitId:'s1',unitLabel:'Photosynthesis',title:'Photosynthesis diagram',objectives:[],activities:[],assessment:'',homework:'Label diagram',resources:[],status:'planned',confidence:'high'}]}],analysis:{warnings:[]},provenance:{deterministic:true,aiEnhanced:true}}

test('A204 premium Flyer-Pink: independent rows, inline metadata and attached footer',{timeout:125000},async()=>{
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

 const page=await context.newPage();
 const pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 try {
   await page.goto(URL,{waitUntil:'domcontentloaded'});
   await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:15000});
   await page.locator('[data-dd-class]').selectOption('Flyer');
   await page.locator('[data-dd-section]').selectOption('Pink');
   await page.getByText('25 students loaded').waitFor({timeout:12000});
   await page.locator('[data-studio-design="31"]').click();
   const subjects=['URDU','ENGLISH','MATH','GK'];
   const tasks=[
     'Page 31 — 【Activity】 — Learn the given answer.',
     'Page 19 — 【Fox, Box】 — Learn both words.',
     'Page 35 — 【Addition Using Number Bonds】 — Practise & complete copy work.',
     'Page 12 — 【Question No. 3】 — Learn the answer.'
   ];
   const initial=await page.locator('.dd-row-editor').count();
   for(let n=initial;n<4;n++) await page.getByRole('button',{name:'Add Subject'}).click();
   for(let i=0;i<4;i++){
     const editor=page.locator('.dd-row-editor').nth(i);
     await editor.locator('input[placeholder="Subject"]').fill(subjects[i]);
     await editor.locator('textarea').fill(tasks[i]);
   }
   await page.locator('[data-card-count="8"]').click();
   const cards=page.locator('.dd-card-studio');
   assert.equal(await cards.count(),25);
   const info=await cards.first().evaluate(card=>{
     const read=(q)=>{
       const el=card.querySelector(q),s=getComputedStyle(el),r=el.getBoundingClientRect();
       return {height:r.height,width:r.width,size:parseFloat(s.fontSize),font:s.fontFamily,line:s.lineHeight,border:s.borderBottomWidth,scroll:el.scrollHeight,client:el.clientHeight,text:el.textContent.trim()};
     };
     const subs=[...card.querySelectorAll('.dd-sub-cell')].map(el=>({label:el.textContent.trim(),font:getComputedStyle(el).fontFamily,fontSize:parseFloat(getComputedStyle(el).fontSize)}));
     const rolls=[...card.querySelectorAll('.dd-student-roll-field .dd-student-val')].map(el=>({text:el.textContent.trim(),scroll:el.scrollWidth,client:el.clientWidth}));
     return {head:read('.dd-card-head'),cal:read('.dd-premium-calendar'),strip:read('.dd-student-strip'),task:read('.dd-diary-cell'),row:read('.dd-row'),sub:subs,rolls};
   });
   console.log('A201_PREVIEW_METRICS',JSON.stringify(info));
   console.log('A203_BASELINE_CAL_HEIGHT',info.cal.height);
   console.log('A203_BASELINE_STUDENT_HEIGHT',info.strip.height);
   assert.equal(info.rolls.length,1);
   console.log('A203_BASELINE_ROLL',info.rolls[0].text);
   console.log('A203_BASELINE_ROLL_CLIP',info.rolls[0].scroll>info.rolls[0].client+1);
   assert.ok(info.task.size>=9,'Homework font must not be shrunk');
   assert.equal(info.sub.length,4,'Need subject columns');
   console.log('A203_BASELINE_SUBJECT_FONTS',info.sub.map(x=>x.font));
   console.log('A203_ROW_BORDER_BASELINE',info.row.border);

   await page.getByRole('button',{name:'Print / PDF'}).click();
   await page.locator('#dd-print-frame').waitFor({state:'attached',timeout:10000});
   const html=await page.evaluate(()=>'< !DOCTYPE html>'.replace(' ','')+document.getElementById('dd-print-frame').contentDocument.documentElement.outerHTML);
   const pdfPage=await context.newPage({viewport:{width:900,height:1300}});
   await pdfPage.setContent(html,{waitUntil:'domcontentloaded'});
   await pdfPage.emulateMedia({media:'print'});
   await pdfPage.evaluate(async()=>document.fonts.ready);
   const layouts=['atelier','ledger','nordic','cambridge','monogram','letterpress','architect','horizon'];
   const matrix=[];
   for(let i=0;i<layouts.length;i++){
     const edition=layouts[i];
     await page.locator('[data-studio-design="'+(31+i)+'"]').click();
     await page.locator('[data-studio-color="blush"]').click();
     await page.getByRole('button',{name:'Print / PDF'}).click();
     await page.locator('#dd-print-frame').waitFor({state:'attached',timeout:12000});
     await page.waitForFunction(name=>document.getElementById('dd-print-frame')?.contentDocument?.querySelector('.dd-card-studio')?.className.includes('dd-edition-'+name),edition,{timeout:12000});
     const printHtml=await page.evaluate(()=>document.getElementById('dd-print-frame').contentDocument.documentElement.outerHTML);
     await pdfPage.setContent('<!DOCTYPE html>'+printHtml,{waitUntil:'domcontentloaded'});
     await pdfPage.emulateMedia({media:'print'});
     await pdfPage.evaluate(()=>document.fonts.ready);
     const result=await pdfPage.evaluate(()=>{
       const cards=[...document.querySelectorAll('.dd-card-studio.dd-density-8')],bad=[];
       const rect=el=>el.getBoundingClientRect(),css=el=>getComputedStyle(el);
       for(const [n,card] of cards.entries()){
         const body=card.querySelector('.dd-rows'),rows=[...body.querySelectorAll('.dd-row')];
         const footer=body.querySelector(':scope > footer.dd-table-footer');
         if(rows.length!==4||!footer)bad.push(n+': missing subjects or footer');
         if(footer && Math.abs(rect(footer).top-rect(rows[3]).bottom)>.8)bad.push(n+': footer not attached');
         if(footer && parseFloat(css(footer).borderTopWidth)<.8)bad.push(n+': footer row top border');
         for(let j=1;j<4;j++){
           if(parseFloat(css(rows[j]).borderTopWidth)<.8)bad.push(n+': row separator '+j);
           if(Math.abs(rect(rows[j-1]).bottom-rect(rows[j]).top)>.8)bad.push(n+': row gap '+j);
         }
         for(const row of rows){
           if(parseFloat(css(row.querySelector('.dd-sub-cell')).borderRightWidth)<.8)bad.push(n+': subject divider');
           const task=row.querySelector('.dd-diary-cell');
           if(task.scrollWidth>task.clientWidth+3||task.scrollHeight>task.clientHeight+3)bad.push(n+': task clipped');
         }
         for(const field of card.querySelectorAll('.dd-student-field')){
           const value=field.querySelector('.dd-student-val'),label=field.querySelector('.dd-student-lbl');
           if(rect(value).right>rect(field).right+1.3||value.scrollWidth>value.clientWidth+1.3)bad.push(n+': metadata clips');
           if(Math.abs((rect(value).top+rect(value).bottom)/2-(rect(label).top+rect(label).bottom)/2)>3)bad.push(n+': metadata wraps');
         }
       }
       return {cards:cards.length,errors:bad,accent:css(cards[0]).getPropertyValue('--accent').trim(),
          ink:css(cards[0].querySelector('.dd-row:nth-child(2)')).borderTopColor,
          footer:css(cards[0].querySelector('.dd-table-footer')).backgroundColor};
     });
     matrix.push({design:31+i,edition,errors:result.errors.length,ink:result.ink});
     assert.equal(result.cards,25);
     assert.equal(result.accent,'#ae7d91');
     assert.deepEqual(result.errors,[],edition+' separator/metadata violations');
     assert.notEqual(result.ink,'rgb(0, 0, 0)');
   }
   console.log('A204_PINK_ALL_EIGHT_DESIGNS_PASS',JSON.stringify(matrix));
   await pdfPage.close();
 }finally{await context.close();await browser.close();await server.close()}
})
