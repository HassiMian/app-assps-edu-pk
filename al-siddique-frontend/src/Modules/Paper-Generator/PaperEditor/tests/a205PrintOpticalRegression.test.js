import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5352;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
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
   await page.locator('[data-studio-color="blush"]').click();
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
   const qa=await pdfPage.evaluate(()=>{
     const pages=[...document.querySelectorAll('.dd-a4-page')];
     const all=[...document.querySelectorAll('.dd-card-studio.dd-density-8')];
     const failures=[],reports=[],counts=[];
     const box=el=>el.getBoundingClientRect();
     const style=el=>getComputedStyle(el);
     for(const [pi,page] of pages.entries()){
       const cards=[...page.querySelectorAll('.dd-card-studio.dd-density-8')];
       counts.push(cards.length);
       for(const [i,card] of cards.entries()){
         const n=pi*8+i, rows=[...card.querySelectorAll('.dd-row')];
         const body=card.querySelector('.dd-rows');
         const footer=body.querySelector(':scope > footer.dd-table-footer');
         const header=card.querySelector('.dd-table-head'),pg=box(page),cr=box(card);
         if(rows.length!==4)failures.push(n+': wrong subjects '+rows.length);
         if(!footer)failures.push(n+': footer not inside table');
         if(footer && footer.textContent.trim().length<9)failures.push(n+': footer text');
         if(footer && parseFloat(style(footer).borderTopWidth)<.8)failures.push(n+': missing footer row border');
         if(footer && Math.abs(box(footer).top-box(rows[3]).bottom)>.8)failures.push(n+': gap GK/footer');
         if(footer && (box(footer).bottom>box(body).bottom+1||box(footer).left<box(body).left-.8))failures.push(n+': footer outside table');
         if(cr.bottom>pg.bottom+1||cr.right>pg.right+1)failures.push(n+': outside page');
         for(let j=0;j<4;j++){
           const r=rows[j],sub=r.querySelector('.dd-sub-cell'),task=r.querySelector('.dd-diary-cell');
           if(j<3){
             const after=style(rows[j+1]);
             if(parseFloat(after.borderTopWidth)<.8)failures.push(n+': row '+j+' missing full width bottom line');
             if(Math.abs(box(rows[j+1]).top-box(r).bottom)>.8)failures.push(n+': row '+j+' gap');
           }
           if(parseFloat(style(sub).borderRightWidth)<.8)failures.push(n+': subject/task divider '+j);
           if(task.scrollHeight>task.clientHeight+3||task.scrollWidth>task.clientWidth+3)failures.push(n+': task clipped '+j);
         }
         const fields=[...card.querySelectorAll('.dd-student-field')];
         const strip=card.querySelector('.dd-student-strip');
         if(fields.length!==3)failures.push(n+': missing student metadata fields');
         for(const [j,field] of fields.entries()){
           const label=field.querySelector('.dd-student-lbl'),val=field.querySelector('.dd-student-val');
           const fr=box(field),lr=box(label),vr=box(val);
           if(Math.abs(lr.top+lr.height/2-(vr.top+vr.height/2))>3)failures.push(n+': metadata '+j+' not one baseline');
           if(vr.right>fr.right+1.3)failures.push(n+': metadata '+j+' value overlaps next field '+(vr.right-fr.right).toFixed(1));
           if(val.scrollWidth>val.clientWidth+1.2)failures.push(n+': metadata '+j+' text clipped');
           if(fr.height>box(strip).height+1)failures.push(n+': metadata '+j+' wraps');
         }
         if(!fields[1].textContent.includes('Flyer')||!fields[1].textContent.includes('Pink'))failures.push(n+': class label wrong');
         const roll=fields[2].querySelector('.dd-student-val').textContent;
         if(roll.includes('Roll ')||!roll.includes('MIG26-'))failures.push(n+': roll duplicated');
         if(n===0)reports.push({header:box(header).height,footer:box(footer).height,footerBg:style(footer).backgroundColor,
           rows:rows.map(r=>({subject:r.querySelector('.dd-sub-cell').textContent,after:style(r).borderTopWidth})),
           fields:fields.map(f=>({width:box(f).width,text:f.textContent,scroll:f.scrollWidth,client:f.clientWidth})),
           ink:style(rows[1]).borderTopColor,bodyH:box(body).height});
       }
     }
     return {pages:pages.length,cards:all.length,perPage:counts,failures,first:reports[0]};
   });
   console.log('A204_FLYER_PINK_25_STUDENTS_A4',JSON.stringify(qa));
   assert.equal(qa.pages,4);
   assert.equal(qa.cards,25);
   assert.deepEqual(qa.perPage,[8,8,8,1]);
   assert.deepEqual(qa.failures,[]);
   assert.equal(pageErrors.length,0,pageErrors.join('; '));
   const gridLocations=await pdfPage.evaluate(()=>{
     return [...document.querySelectorAll('.dd-a4-page')].map((page,pi)=>{
       const pg=page.getBoundingClientRect();
       return [...page.querySelectorAll('.dd-card-studio.dd-density-8')].map((card,j)=>{
         const b=card.querySelector('.dd-rows'),rows=[...b.querySelectorAll('.dd-row')];
         const css=getComputedStyle(rows[1]),sub=getComputedStyle(rows[1].querySelector('.dd-sub-cell'));
         const offset=el=>{const r=el.getBoundingClientRect();return {x:r.left-pg.left,y:r.top-pg.top,w:r.width,h:r.height}};
         return {page:pi,card:j,body:offset(b),rowRects:rows.map(offset),
           horizontal:rows.slice(1).map(row=>offset(row).y), divider:offset(rows[1].querySelector('.dd-sub-cell')),
           ink:css.borderTopColor,verticalInk:sub.borderRightColor,hWidth:css.borderTopWidth,vWidth:sub.borderRightWidth};
       });
     }).flat();
   });
   assert.equal(gridLocations.length,25);
   assert.ok(gridLocations.every(x=>x.hWidth==='2px'&&x.vWidth==='2px'),'Every previewed slip must use integral 2px dividers');
   fs.writeFileSync('/tmp/ASSPS_A205_AFTER_BLUSH_GRID.json',JSON.stringify(gridLocations,null,2));
   console.log('A205_AFTER_GRID_COORDS',JSON.stringify(gridLocations[0]));
   const computed=await pdfPage.evaluate(()=>{
     const row=document.querySelector('.dd-card-studio.dd-density-8 .dd-row:nth-child(2)');
     const s=getComputedStyle(row),card=row.closest('.dd-card-studio'),cs=getComputedStyle(card);
     return {border:s.borderTop,background:s.backgroundColor,accent:cs.getPropertyValue('--accent'),line:cs.getPropertyValue('--line'),
       mixSupported:CSS.supports('color','color-mix(in srgb, red 40%, blue 60%)'),
       directMix:getComputedStyle(document.querySelector('.dd-table-footer')).backgroundColor};
   });
   console.log('A205_AFTER_CSS_CONTRACT',JSON.stringify(computed));

   await pdfPage.pdf({path:'/tmp/ASSPS_A205_AFTER_BLUSH_A4.pdf',format:'A4',preferCSSPageSize:true,printBackground:true});
   await pdfPage.close();
 }finally{await context.close();await browser.close();await server.close()}
})
