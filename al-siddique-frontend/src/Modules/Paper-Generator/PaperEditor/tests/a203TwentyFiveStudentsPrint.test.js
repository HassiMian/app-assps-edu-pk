import process from 'node:process'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const here=path.dirname(fileURLToPath(import.meta.url));const root=path.resolve(here,'../../../../..');const PORT=5340;const URL=`http://localhost:${PORT}/daily-diary-workspace-test.html`
const installedChrome=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',`${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`].find(candidate=>fs.existsSync(candidate))
const academic={success:true,configured:true,data:{periodsPerDay:8,localities:['Rayya Khas'],sessionStart:'2026-08-01',sessionEnd:'2027-05-31',classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']},{name:'Science',classes:['8']},{name:'Urdu',classes:['8']}]}}
const students=Array.from({length:25},(_,i)=>({id:i+1,name:['Ali Ahmad','Sara Khan','Usman Raza','Ayesha Noor','Hamza Ali','Fiza Afzaal','Haider Ali','Abdullah Basharat'][i%8],roll_number:'MIG26-'+String(i+1).padStart(3,'0'),class:'Eight',section:'Blue'}))
const generated={schemaVersion:2,documentType:'ASSPS_LESSON_PLAN',planningType:'daily',status:'draft',classLevel:'8',section:'Blue',startDate:'2026-10-08',endDate:'2026-10-08',subjects:[{subject:'English',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'e1',label:'Reading'}],lessons:[{key:'e1',date:'2026-10-08',period:'1st',subject:'English',unitId:'e1',unitLabel:'Reading',title:'Reading comprehension',objectives:['Read fluently'],activities:[],assessment:'Oral check',homework:'Exercise 4',resources:[],status:'planned',confidence:'high'}]},{subject:'Science',capacityPeriods:1,bufferPeriods:0,usablePeriods:1,units:[{id:'s1',label:'Photosynthesis'}],lessons:[{key:'s1',date:'2026-10-08',period:'2nd',subject:'Science',unitId:'s1',unitLabel:'Photosynthesis',title:'Photosynthesis diagram',objectives:[],activities:[],assessment:'',homework:'Label diagram',resources:[],status:'planned',confidence:'high'}]}],analysis:{warnings:[]},provenance:{deterministic:true,aiEnhanced:true}}

test('A203 premium 25 students: eight-up A4, non-overlapping cards and clear pastel separators',{timeout:125000},async()=>{
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
   const printInfo=await pdfPage.evaluate(()=>{
      const cards=[...document.querySelectorAll('.dd-card-studio')],pages=[...document.querySelectorAll('.dd-a4-page')];
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
     const all=[...document.querySelectorAll('.dd-card-studio')];
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
   console.log('A203_PREMIUM_BASELINE_GRID',JSON.stringify(grid));
   const actual=await pdfPage.evaluate(()=>{
     const cards=[...document.querySelectorAll('.dd-card-studio.dd-density-8')],failures=[],details=[];
     for(const [i,card] of cards.entries()){
       const q=sel=>card.querySelector(sel), rect=el=>el.getBoundingClientRect(),style=el=>getComputedStyle(el);
       const head=q('.dd-table-head'),wrapper=q('.dd-rows'),hr=rect(head),br=rect(wrapper);
       const headSubject=q('.dd-th-subject'),rows=[...card.querySelectorAll('.dd-row')];
       const foot=q('footer'),strip=q('.dd-student-strip'),roll=q('.dd-student-roll-field .dd-student-val');
       if(Math.abs(hr.left-br.left)>.7 || Math.abs(hr.right-br.right)>.7)failures.push(i+': heading/body original margins not aligned');
       const leftBorder=parseFloat(style(wrapper).borderLeftWidth)||0;
       if(Math.abs(rect(rows[0]).left-(br.left+leftBorder))>.75)failures.push(i+': natural 1px border inset disrupted');
       if(Math.abs(rect(rows[0].querySelector('.dd-sub-cell')).right-rect(headSubject).right)>.8)failures.push(i+': subject/homework divider offset');
       if(parseFloat(style(head).borderBottomWidth)<.7)failures.push(i+': heading bottom separator missing');
       if(parseFloat(style(rows[0]).borderTopWidth)>.1)failures.push(i+': doubled heading/first row separator');
       for(const [j,row] of rows.entries()){
         if(j>0 && parseFloat(style(row).borderTopWidth)<.8)failures.push(i+': missing '+j+' row separator');
         const subj=row.querySelector('.dd-sub-cell'),task=row.querySelector('.dd-diary-cell');
         if(parseFloat(style(subj).borderRightWidth)<.8)failures.push(i+': missing subject divider '+j);
         if(task.scrollHeight>task.clientHeight+3 || task.scrollWidth>task.clientWidth+3)failures.push(i+': homework overflow '+j);
         if(j && Math.abs(rect(rows[j-1]).bottom-rect(row).top)>.8)failures.push(i+': gap between Math / GK etc row '+j);
       }
       if(parseFloat(style(foot).borderTopWidth)>0)failures.push(i+': double footer line');
       if(rect(foot).top < rect(rows.at(-1)).bottom-.6)failures.push(i+': footer overlaps GK');
       if(rect(foot).top-rect(rows.at(-1)).bottom>16)failures.push(i+': wasted footer gap');
       if(roll.textContent.includes('Roll ') || !roll.textContent.includes('MIG26-'))failures.push(i+': repeated Roll label');
       if(roll.scrollWidth>roll.clientWidth+1 || rect(roll).height>rect(strip).height-.5)failures.push(i+': roll clipped or wrapped');
       const subjectFonts=rows.map(row=>style(row.querySelector('.dd-sub-cell')).fontFamily);
       if(new Set(subjectFonts).size!==1)failures.push(i+': mixed fonts for Latin subject names');
       const cardRect=rect(card),pg=rect(card.closest('.dd-a4-page'));
       if(cardRect.left<pg.left-1||cardRect.right>pg.right+1||cardRect.bottom>pg.bottom+1)failures.push(i+': outside A4');
       details.push({i,ink:style(rows[1]).borderTopColor,accent:style(card).getPropertyValue('--accent').trim(),rowSeparator:style(rows[1]).borderTopWidth,subjectDivider:style(rows[1].querySelector('.dd-sub-cell')).borderRightWidth,headerOffset:+(hr.left-br.left).toFixed(2),footerBorder:style(foot).borderTopWidth,roll:roll.textContent.trim()});
     }
     return {cards:cards.length,subjects:cards[0]?.querySelectorAll('.dd-row').length,failures,first:details[0],paletteInk:details[0]?.ink};
   });
   console.log('A203_PREMIUM_PRINT_QA',JSON.stringify(actual));
   const neighbors=await pdfPage.evaluate(()=>{
     const pages=[...document.querySelectorAll('.dd-a4-page')],errors=[],counts=[];
     for(const [pageIndex,page] of pages.entries()){
       const cards=[...page.querySelectorAll('.dd-card-studio.dd-density-8')],rects=cards.map(c=>c.getBoundingClientRect());
       counts.push(cards.length);
       for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++){
         const x=Math.min(rects[i].right,rects[j].right)-Math.max(rects[i].left,rects[j].left);
         const y=Math.min(rects[i].bottom,rects[j].bottom)-Math.max(rects[i].top,rects[j].top);
         if(x>.6&&y>.6)errors.push('Page '+pageIndex+' diaries '+i+'/'+j+' overlap '+x.toFixed(2)+'×'+y.toFixed(2));
       }
     }
     return {pageCount:pages.length,cardCountByPage:counts,errors};
   });
   console.log('A203_25_STUDENTS_PAGINATION_AND_NO_OVERLAPS',JSON.stringify(neighbors));
   assert.deepEqual(neighbors.cardCountByPage,[8,8,8,1]);
   assert.deepEqual(neighbors.errors,[]);

   assert.equal(actual.cards,25);
   assert.equal(actual.subjects,4);
   assert.deepEqual(actual.failures,[],'Premium must retain true grid and compact layout without clipping');

   const density=await pdfPage.evaluate(()=>{
     const c=document.querySelector('.dd-card-studio');
     const sels=['.dd-card-head','.dd-premium-calendar','.dd-student-strip','.dd-table-head','.dd-rows','.dd-row:first-child','.dd-row:nth-child(2)','.dd-row:nth-child(3)','.dd-row:last-child','footer'];
     return sels.map(sel=>{const el=c.querySelector(sel),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {sel,top:r.top,bottom:r.bottom,height:r.height,left:r.left,right:r.right,marginTop:s.marginTop,marginBottom:s.marginBottom,flex:s.flex,overflow:s.overflow,borderColor:s.borderBottomColor};});
   });
   console.log('A203_PREMIUM_BASELINE_DENSITY',JSON.stringify(density));

   assert.equal(grid.cardCount,25);
   assert.equal(grid.rowsPerCard,4);
   console.log('A201_PRINT_METRICS',JSON.stringify(printInfo));
   assert.equal(printInfo.cards,25);
   assert.equal(printInfo.rowCount,4);
   assert.equal(printInfo.pages,4);
   assert.equal(pageErrors.length,0);
   const out='/tmp/ASSPS_A203_PREMIUM_25_STUDENTS_4A4.pdf';
   await pdfPage.pdf({path:out,preferCSSPageSize:true,format:'A4',printBackground:true});
   console.log('A201_EIGHT_UP_PRINT_PASS',out);
   await pdfPage.close();
 }finally{
   await context.close();await browser.close();await server.close();
 }
})
