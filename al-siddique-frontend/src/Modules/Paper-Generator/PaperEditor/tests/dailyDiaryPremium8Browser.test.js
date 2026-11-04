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

test('Daily Diary split workspace personalizes students, supports dynamic A4 counts and Lesson Plan mode',{timeout:90000},async()=>{
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
  const premiumNames=['Porcelain Jade','Champagne Gold','Powder Blue','Blush Mauve','Lilac Mist','Elegant Sage','Peach & Navy','Silver Lavender'];
  for(const name of premiumNames){
    const option=page.locator('.dd-palettes button').filter({hasText:name});
    assert.equal(await option.count(),1,`Palette missing: ${name}`);
    await option.click();
    assert.ok(await page.locator('.dd-card-premium').count()>0,`Premium style not applied: ${name}`);
    const info=await page.locator('.dd-card-premium').first().evaluate(el=>({
      classField:!!el.querySelector('.dd-student-class-field'),
      dateField:!!el.querySelector('.dd-student-date-field'),
      calendar:!!el.querySelector('.dd-premium-calendar'),
      metaColumns:getComputedStyle(el.querySelector('.dd-student-strip')).gridTemplateColumns.trim().split(/\s+/).length,
      schoolFont:parseFloat(getComputedStyle(el.querySelector('.dd-school-name')).fontSize),
      studentFont:parseFloat(getComputedStyle(el.querySelector('.dd-student-val')).fontSize),
      footerAlign:getComputedStyle(el.querySelector('footer')).textAlign,
      rowGap:getComputedStyle(el.querySelector('.dd-rows')).rowGap,
      metaHidden:getComputedStyle(el.querySelector('.dd-head-meta-row')).display==='none',
      headColor:getComputedStyle(el.querySelector('.dd-table-head')).color,
    }));
    assert.equal(info.classField,true,`class field missing: ${name}`);
    assert.equal(info.dateField,false,'Date must not repeat in strip: '+name);
    assert.equal(info.calendar,true,'Calendar missing: '+name);
    assert.equal(info.metaColumns,3,'Student strip must have three columns: '+name);
    assert.ok(info.schoolFont>=9,'School branding too small: '+name+' '+info.schoolFont);
    assert.ok(info.studentFont>=7.5,'Student details too small: '+name+' '+info.studentFont);
    assert.equal(info.footerAlign,'center','Footer should be centered: '+name);
    assert.equal(info.rowGap,'0px',`continuous table rows not applied: ${name}`);
    assert.equal(info.metaHidden,true,`redundant old header fields visible: ${name}`);
  }
  await page.locator('[data-dd-date]').fill('2026-11-04');
  const cal=page.locator('.dd-card-premium .dd-premium-calendar').first();
  await cal.getByText('04',{exact:true}).waitFor();
  assert.match(await cal.textContent(),/NOV 2026/);
  assert.match(await cal.textContent(),/WED/);
  await page.locator('[data-card-count="8"]').click();
  await page.waitForTimeout(200);
  assert.equal(await page.locator('.dd-card-premium').count(),5,'5 selected students should remain personalized at 8-per-page density');
  const geometry=await page.locator('.dd-card-premium').first().evaluate(el=>{
    const cal=el.querySelector('.dd-premium-calendar').getBoundingClientRect();
    const school=el.querySelector('.dd-school-name').getBoundingClientRect();
    return {right:cal.right,cardRight:el.getBoundingClientRect().right,overlap:school.right>cal.left}
  });
  assert.ok(geometry.right<=geometry.cardRight+1,'Calendar exceeds diary card');
  assert.equal(geometry.overlap,false,'School branding overlaps calendar');
  console.log('PREMIUM_CALENDAR_DATE_AND_HEADER_PASS',JSON.stringify(geometry));
  console.log('PREMIUM_8_PALETTES_AND_TABLES 8/8 PASS');

  await page.locator('[data-card-count="5"]').click();await page.waitForTimeout(250);assert.equal(await page.locator('[data-a4-page]').count(),1);assert.equal(await page.locator('[data-student-card]').count(),5);assert.match((await page.locator('[data-a4-page]').textContent())||'',/Ali Ahmad/);assert.match((await page.locator('[data-a4-page]').textContent())||'',/Roll 01/);assert.doesNotMatch((await page.locator('[data-a4-page]').textContent())||'',/null|undefined|DIARY_TENANT/i)
  await page.locator('[data-card-count="2"]').click();await page.waitForTimeout(120);assert.equal(await page.locator('[data-a4-page]').count(),3,'5 selected students at 2 cards/page must paginate to 3 A4 pages');assert.equal(await page.locator('[data-student-card]').count(),5)
  await page.getByRole('button',{name:'None'}).click()
  for(const count of [2,3,4,5,6,8,10]){await page.locator(`[data-card-count="${count}"]`).click();await page.waitForTimeout(80);assert.equal(await page.locator('[data-a4-page]').count(),1,`generic ${count} should use one A4 page`);assert.equal(await page.locator('[data-student-card]').count(),count,`generic ${count} card count`)}
  await page.emulateMedia({media:'print'});const printStyle=await page.locator('[data-a4-page]').first().evaluate(el=>({width:parseFloat(getComputedStyle(el).width),height:parseFloat(getComputedStyle(el).height),transform:getComputedStyle(el).transform}));assert.ok(printStyle.width>780&&printStyle.width<810,`A4 print width unexpected: ${printStyle.width}`);assert.ok(printStyle.height>1110&&printStyle.height<1140,`A4 print height unexpected: ${printStyle.height}`);assert.equal(printStyle.transform,'none');await page.emulateMedia({media:'screen'})
  await page.locator('[data-diary-mode="lesson"]').click();await page.locator('[data-auto-plan-today]').click();await page.getByText('Daily multi-subject plan generated with AI enrichment.').waitFor({timeout:10000});const preview=(await page.locator('[data-a4-page]').first().textContent())||'';assert.match(preview,/ENGLISH/);assert.match(preview,/SCIENCE/);assert.match(preview,/Reading comprehension/);assert.match(preview,/Photosynthesis diagram/)
  const pageStyle=await page.locator('[data-a4-page]').first().evaluate(el=>({width:getComputedStyle(el).width,height:getComputedStyle(el).height,cols:getComputedStyle(el).getPropertyValue('--cols'),rows:getComputedStyle(el).getPropertyValue('--rows')}));assert.ok(parseFloat(pageStyle.width)>700);assert.ok(parseFloat(pageStyle.height)>1000);assert.equal(pageStyle.cols.trim(),'2');assert.equal(pageStyle.rows.trim(),'5')
  console.log('DAILY_DIARY_WORKSPACE_BROWSER 1/1 PASS')
 }finally{await context.close();await browser.close();await server.close()}
})
