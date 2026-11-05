import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5334;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Science',classes:['8']},{name:'Urdu',classes:['8']}]}}
const students=Array.from({length:8},(_,i)=>({id:i+1,name:['Ali Ahmad','Sara Khan','Usman Raza','Ayesha Noor','Hamza Ali','Fiza Afzaal','Haider Ali','Abdullah Basharat'][i],roll_number:String(i+1).padStart(2,'0'),class:'Eight',section:'Blue'}))
const generated={schemaVersion:2,documentType:'ASSPS_LESSON_PLAN',planningType:'daily',status:'draft',classLevel:'8',section:'Blue',startDate:'2026-10-08',endDate:'2026-10-08',subjects:[{subject:'English',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'e1',label:'Reading'}],lessons:[{key:'e1',date:'2026-10-08',period:'1st',subject:'English',unitId:'e1',unitLabel:'Reading',title:'Reading comprehension',objectives:['Read fluently'],activities:[],assessment:'Oral check',homework:'Exercise 4',resources:[],status:'planned',confidence:'high'}]},{subject:'Science',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'s1',label:'Photosynthesis'}],lessons:[{key:'s1',date:'2026-10-08',period:'2nd',subject:'Science',unitId:'s1',unitLabel:'Photosynthesis',title:'Photosynthesis diagram',objectives:[],activities:[],assessment:'',homework:'Label diagram',resources:[],status:'planned',confidence:'high'}]}],analysis:{warnings:[]},provenance:{deterministic:true,aiEnhanced:true}}

test('A202 A4 8-up contiguous table grid, no overflow, no footer ghost line',{timeout:125000},async()=>{
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
   await page.locator('[data-dd-class]').selectOption('8');
   await page.locator('[data-dd-section]').selectOption('Blue');
   await page.getByText('8 students loaded').waitFor({timeout:12000});
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
   const cards=page.locator('.dd-card-studio.dd-density-8');
   assert.equal(await cards.count(),8);
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
   assert.ok(info.cal.height<=48,'Calendar not compact: '+info.cal.height);
   assert.ok(info.strip.height<=27,'Student row still wastes vertical space: '+info.strip.height);
   assert.equal(info.rolls.length,1);
   assert.equal(info.rolls[0].text,'01');
   assert.equal(info.rolls[0].scroll<=info.rolls[0].client+1,true,'Roll number is clipped');
   assert.ok(info.task.size>=9,'Homework font must not be shrunk');
   assert.equal(info.sub.length,4,'Need subject columns');
   assert.equal(new Set(info.sub.map(x=>x.font)).size,1,'English-language subject names should share one font');
   assert.ok(Number.parseFloat(info.row.border)>=.8,'Printed row separator too thin');

   await page.getByRole('button',{name:'Print / PDF'}).click();
   await page.locator('#dd-print-frame').waitFor({state:'attached',timeout:10000});
   const html=await page.evaluate(()=>'< !DOCTYPE html>'.replace(' ','')+document.getElementById('dd-print-frame').contentDocument.documentElement.outerHTML);
   const pdfPage=await context.newPage({viewport:{width:900,height:1300}});
   await pdfPage.setContent(html,{waitUntil:'domcontentloaded'});
   await pdfPage.emulateMedia({media:'print'});
   await pdfPage.evaluate(async()=>document.fonts.ready);
   const printInfo=await pdfPage.evaluate(()=>{
      const cards=[...document.querySelectorAll('.dd-card-studio.dd-density-8')],pages=[...document.querySelectorAll('.dd-a4-page')];
      const bad=[];
      for(const [index,card] of cards.entries()){
        const bounds=card.getBoundingClientRect(),pg=card.closest('.dd-a4-page').getBoundingClientRect();
        if(bounds.bottom>pg.bottom+1 || bounds.right>pg.right+1||bounds.left<pg.left-1||bounds.top<pg.top-1)bad.push({index,reason:'card outside page'});
        for(const row of card.querySelectorAll('.dd-row')){
          const s=getComputedStyle(row),cell=row.querySelector('.dd-diary-cell');
          if(parseFloat(s.borderBottomWidth)<.8)bad.push({index,reason:'row border missing'});
          if(cell.scrollHeight>cell.clientHeight+3)bad.push({index,reason:'task overflow',text:cell.textContent.trim().slice(0,40)});
        }
        const roll=card.querySelector('.dd-student-roll-field');
        if(roll.getBoundingClientRect().height>25)bad.push({index,reason:'roll field wrapped'});
      }
      const sample=cards[0],cal=sample?.querySelector('.dd-premium-calendar');
      return {pages:pages.length,cards:cards.length,errors:bad,calendar:cal?.getBoundingClientRect().height,rowCount:sample?.querySelectorAll('.dd-row').length};
   });
   const grid=await pdfPage.evaluate(()=>{
     const all=[...document.querySelectorAll('.dd-card-studio.dd-density-8')];
     const bad=[];
     const difference=(a,b)=>Math.abs(a-b);
     const coords=el=>el?.getBoundingClientRect();
     for(const [cardIndex,card] of all.entries()){
       const head=card.querySelector('.dd-table-head');
       const body=card.querySelector('.dd-rows');
       const subjectHead=head?.querySelector('.dd-th-subject');
       const rows=[...card.querySelectorAll('.dd-row')];
       const hr=coords(head),br=coords(body);
       if(difference(hr.left,br.left)>0.6||difference(hr.right,br.right)>0.6)bad.push(cardIndex+': head/body width differs');
       const bodyCss=getComputedStyle(body);
       if(parseFloat(bodyCss.borderLeftWidth)>0||parseFloat(bodyCss.paddingLeft)>0.3)bad.push(cardIndex+': leftover wrapper border or padding');
       for(const [i,row] of rows.entries()){
         const r=coords(row),div=coords(row.querySelector('.dd-sub-cell')),subject=coords(subjectHead);
         const css=getComputedStyle(row),sc=getComputedStyle(row.querySelector('.dd-sub-cell'));
         if(difference(r.left,hr.left)>0.6||difference(r.right,hr.right)>0.6)bad.push(cardIndex+': row '+i+' not aligned to table header');
         if(difference(div.right,subject.right)>0.6)bad.push(cardIndex+': vertical divider not aligned in row '+i);
         if(parseFloat(css.borderLeftWidth)<0.8||parseFloat(css.borderRightWidth)<0.8||parseFloat(css.borderBottomWidth)<0.8)bad.push(cardIndex+': missing outer row grid '+i);
         if(parseFloat(sc.borderRightWidth)<0.8)bad.push(cardIndex+': missing subject/homework separator '+i);
         if(i>0 && difference(coords(rows[i-1]).bottom,r.top)>0.6)bad.push(cardIndex+': gap between subject rows '+(i-1)+' and '+i);
         const cell=row.querySelector('.dd-diary-cell');
         if(cell.scrollWidth>cell.clientWidth+2||cell.scrollHeight>cell.clientHeight+2)bad.push(cardIndex+': homework overflow row '+i);
       }
       const footerCss=getComputedStyle(card.querySelector('footer'));
       if(parseFloat(footerCss.borderTopWidth)>0)bad.push(cardIndex+': unwanted footer top line');
     }
     return {cardCount:all.length,rowsPerCard:all[0]?.querySelectorAll('.dd-row').length,errors:bad,
       headerLeft:+coords(all[0].querySelector('.dd-table-head')).left.toFixed(2),
       bodyLeft:+coords(all[0].querySelector('.dd-rows')).left.toFixed(2),
       firstRowLeft:+coords(all[0].querySelector('.dd-row')).left.toFixed(2),
       headerDivider:+coords(all[0].querySelector('.dd-th-subject')).right.toFixed(2),
       firstRowDivider:+coords(all[0].querySelector('.dd-sub-cell')).right.toFixed(2),
       footerTopBorder:getComputedStyle(all[0].querySelector('footer')).borderTopWidth,
     };
   });
   console.log('A202_TRUE_TABLE_GRID_METRICS',JSON.stringify(grid));
   // Recheck actual isolated A4 print frames in all eight design structures.
   // The user's pink Flyer is represented by the blush palette.
   const suite=[];
   for(let design=31;design<=38;design++){
     await page.locator('[data-studio-design="'+design+'"]').click();
     await page.locator('[data-studio-color="blush"]').click();
     await page.getByRole('button',{name:'Print / PDF'}).click();
     const iframe=page.locator('#dd-print-frame');
     await iframe.waitFor({state:'attached'});
     await page.waitForFunction((n)=>{
       const frame=document.getElementById('dd-print-frame'),doc=frame?.contentDocument;
       return !!doc && doc.querySelectorAll('.dd-card-studio.dd-density-8').length===8 &&
         doc.querySelector('.dd-card-studio.dd-density-8')?.className?.includes('dd-edition-');
     },null,{timeout:10000});
     const actual=await page.evaluate(()=>{
       const doc=document.getElementById('dd-print-frame').contentDocument;
       const cards=[...doc.querySelectorAll('.dd-card-studio.dd-density-8')],errors=[];
       for(const [index,card] of cards.entries()){
         const head=card.querySelector('.dd-table-head').getBoundingClientRect();
         const rows=card.querySelector('.dd-rows').getBoundingClientRect();
         const divider=card.querySelector('.dd-table-head .dd-th-subject').getBoundingClientRect().right;
         if(Math.abs(head.left-rows.left)>.7||Math.abs(head.right-rows.right)>.7)errors.push(index+': disconnected heading');
         const children=[...card.querySelectorAll('.dd-row')];
         for(const [j,row] of children.entries()){
           const rr=row.getBoundingClientRect(),sub=row.querySelector('.dd-sub-cell');
           if(Math.abs(rr.left-head.left)>.7||Math.abs(rr.right-head.right)>.7)errors.push(index+': disconnected row '+j);
           if(Math.abs(sub.getBoundingClientRect().right-divider)>.7)errors.push(index+': missing subject/task column divider '+j);
           if(parseFloat(getComputedStyle(row).borderBottomWidth)<.8||parseFloat(getComputedStyle(sub).borderRightWidth)<.8)errors.push(index+': missing grid line '+j);
           if(j && Math.abs(children[j-1].getBoundingClientRect().bottom-rr.top)>.7)errors.push(index+': vertical row gap '+j);
         }
         if(parseFloat(getComputedStyle(card.querySelector('footer')).borderTopWidth)>0)errors.push(index+': footer ghost line');
       }
       return {cards:cards.length,errors,layout:cards[0]?.className};
     });
     suite.push({design,errors:actual.errors.length});
     assert.equal(actual.cards,8,'Design '+design+' lost the 8-up card count');
     assert.deepEqual(actual.errors,[],'Design '+design+' table lines/regression: '+actual.errors.join(';'));
   }
   console.log('A202_PINK_8_DESIGNS_PRINT_COHERENCE',JSON.stringify(suite));

   assert.equal(grid.cardCount,8);
   assert.equal(grid.rowsPerCard,4);
   assert.deepEqual(grid.errors,[],'8-up cards must have seamless grid borders and no overflow');
   console.log('A201_PRINT_METRICS',JSON.stringify(printInfo));
   assert.equal(printInfo.cards,8);
   assert.equal(printInfo.rowCount,4);
   assert.equal(printInfo.pages,1);
   assert.deepEqual(printInfo.errors,[]);
   assert.equal(pageErrors.length,0);
   const out='/tmp/ASSPS_A202_GRID_REPAIRED_EIGHT_UP_A4.pdf';
   await pdfPage.pdf({path:out,preferCSSPageSize:true,format:'A4',printBackground:true});
   console.log('A201_EIGHT_UP_PRINT_PASS',out);
   await pdfPage.close();
 }finally{
   await context.close();await browser.close();await server.close();
 }
})
