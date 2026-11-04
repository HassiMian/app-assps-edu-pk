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
  await page.locator('[data-studio-design="31"]').click();
  const card=page.locator('.dd-card-studio').first();
  const read=async()=>card.evaluate(el=>{
    const m=selector=>{
      const e=el.querySelector(selector),s=getComputedStyle(e),r=e.getBoundingClientRect();
      return {font:s.fontFamily,size:parseFloat(s.fontSize),weight:s.fontWeight,height:r.height,width:r.width};
    };
    return {school:m('.dd-school-name'),calendar:m('.dd-premium-calendar'),header:m('.dd-card-head'),heading:m('.dd-th-subject'),taskHeading:m('.dd-th-diary'),subject:m('.dd-sub-cell'),task:m('.dd-diary-cell'),row:m('.dd-row'),footer:m('footer')};
  });
  const baseline=await read();
  assert.ok(baseline.heading.size>=8,'A195 table heading unreadable: '+baseline.heading.size);
  assert.ok(baseline.footer.size>=7,'A195 footer unreadable: '+baseline.footer.size);
  const family=page.locator('.dd-sqb-select');
  await family.selectOption('inter');
  const inter=await read();
  assert.match(inter.task.font,/Inter/i,'Inter must affect English task');
  assert.match(inter.heading.font,/Inter/i,'Inter must affect headings');
  await family.selectOption('serif');
  const georgia=await read();
  assert.match(georgia.task.font,/Georgia/i,'Georgia must affect English task');
  await family.selectOption('times');
  const controls=page.locator('[data-table-heading-controls]');
  await controls.waitFor();
  await controls.getByTitle('Increase table heading font size').click();
  const large=await read();
  assert.ok(large.heading.size>baseline.heading.size,'Heading size control ineffective');
  assert.equal(large.taskHeading.size,large.heading.size,'Both table headings must resize');
  await controls.getByTitle('Toggle Subject and Home Task heading bold').click();
  const unbold=await read();
  assert.notEqual(unbold.heading.weight,large.heading.weight,'Heading bold toggle ineffective');
  const scale=page.locator('[data-studio-quick-bar]');
  const beforeScale=await read();
  await scale.getByTitle('Increase header scale').click();
  const afterScale=await read();
  assert.ok(afterScale.school.size>beforeScale.school.size,'Header scale must affect school');
  assert.ok(afterScale.calendar.width>beforeScale.calendar.width,'Header scale must affect calendar');
  const beforeSchool=await read();
  await scale.getByTitle('Increase school title font size').click();
  const afterSchool=await read();
  assert.ok(afterSchool.school.size>beforeSchool.school.size,'School font plus must never shrink text');
  const beforeRow=await read();
  await scale.getByTitle('Increase row height').click();
  const afterRow=await read();
  console.log('A195_ROW_HEIGHT',JSON.stringify({before:beforeRow.row.height,after:afterRow.row.height}));
  console.log('A195_ROW_CSS',JSON.stringify(await card.evaluate(el=>({rowCSS:getComputedStyle(el.querySelector('.dd-row')).cssText,flex:getComputedStyle(el.querySelector('.dd-row')).flex,minHeight:getComputedStyle(el.querySelector('.dd-row')).minHeight,forcedHeight:getComputedStyle(el).getPropertyValue('--dd-row-height'),scale:getComputedStyle(el).getPropertyValue('--scale')}))));
  assert.notEqual(afterRow.row.height,beforeRow.row.height,'Row height control did not change physical row');
  for(const count of [2,3,4,5,6,8,10]){
    await page.locator('[data-card-count="'+count+'"]').click();
    const v=await read();
    assert.ok(v.heading.size>=8,'Unreadable table heading at '+count+'-up: '+v.heading.size);
    assert.ok(v.footer.size>=7,'Unreadable footer at '+count+'-up: '+v.footer.size);
    console.log('A195_DENSITY',JSON.stringify({count,heading:v.heading.size,footer:v.footer.size}));
  }
  await page.locator('[data-card-count="6"]').click();
  // The print control uses an isolated iframe. The selected family must survive it.
  await family.selectOption('inter');
  const printBtn=page.getByRole('button',{name:'Print / PDF'});
  await printBtn.click();
  await page.locator('#dd-print-frame').waitFor({state:'attached',timeout:10000});
  const printed=await page.evaluate(()=>{
    const frame=document.getElementById('dd-print-frame');
    const doc=frame.contentDocument;
    const view=frame.contentWindow;
    const head=doc.querySelector('.dd-card-studio .dd-th-subject');
    const task=doc.querySelector('.dd-card-studio .dd-diary-cell');
    return {heading:parseFloat(view.getComputedStyle(head).fontSize),font:view.getComputedStyle(task).fontFamily,headingFont:view.getComputedStyle(head).fontFamily,footer:parseFloat(view.getComputedStyle(doc.querySelector('.dd-card-studio footer')).fontSize)};
  });
  assert.match(printed.font,/Inter/i,'Print task font mismatch');
  assert.match(printed.headingFont,/Inter/i,'Print heading font mismatch');
  assert.ok(printed.heading>=8,'Print table heading unreadable');
  assert.ok(printed.footer>=7,'Print footer unreadable');
  console.log('A195_TYPOGRAPHY_CONTROLS_AND_PRINT_PASS',JSON.stringify({baseline,inter:inter.task.font,largeHeading:large.heading.size,headerScale:afterScale.school.size,schoolFont:afterSchool.school.size,printed}));
  await family.selectOption('times');
  const studioNames=['Atelier Folio','Ivory Ledger','Nordic Index','Cambridge Folio','Jade Monogram','Rose Letterpress','Architect Grid','Pearl Horizon'];
  const fingerprints=[];
  for(const name of studioNames){
    const choice=page.locator('[data-studio-design]').filter({hasText:name});
    assert.equal(await choice.count(),1,'Studio missing: '+name);
    await choice.click();
    const card=page.locator('.dd-card-studio').first();
    assert.equal(await card.count(),1,'Studio design class not rendered: '+name);
    const look=await card.evaluate(el=>{
      const style=node=>getComputedStyle(el.querySelector(node));
      const c=getComputedStyle(el);
      const rect=el.getBoundingClientRect();
      const school=el.querySelector('.dd-school-name').getBoundingClientRect();
      const calendar=el.querySelector('.dd-premium-calendar').getBoundingClientRect();
      return {
        edition:Array.from(el.classList).find(s=>s.startsWith('dd-edition-')),
        border:c.borderTopStyle+'-'+c.borderTopWidth+'-'+c.borderTopColor,
        radius:c.borderTopLeftRadius,
        headerBg:style('.dd-card-head').backgroundImage+'-'+style('.dd-card-head').backgroundColor,
        meta:style('.dd-student-strip').backgroundColor,
        table:style('.dd-table-head').backgroundColor,
        headerBorder:style('.dd-card-head').borderBottomWidth+'-'+style('.dd-card-head').borderBottomStyle,
        calRadius:style('.dd-premium-calendar').borderRadius,
        subjectBg:style('.dd-sub-cell').backgroundColor,
        subjectBorder:style('.dd-sub-cell').borderRightWidth,
        subjectPrefix:getComputedStyle(el.querySelector('.dd-sub-cell'),'::before').content,
        cols:style('.dd-student-strip').gridTemplateColumns.split(/\s+/).length,
        footer:style('footer').textAlign,
        overlap:school.right>calendar.left,
        within:calendar.right<=rect.right+1,
      };
    });
    assert.equal(look.cols,3,'Three student details required: '+name);
    assert.equal(look.footer,'center','Footer not centered: '+name);
    assert.equal(look.overlap,false,'Calendar overlaps school: '+name);
    assert.equal(look.within,true,'Calendar exceeds page: '+name);
    fingerprints.push(JSON.stringify([look.border,look.radius,look.headerBg,look.meta,look.table,look.headerBorder,look.calRadius,look.subjectBg,look.subjectBorder,look.subjectPrefix]));
  }
  console.log('STUDIO_FINGERPRINTS',fingerprints.map((f,i)=>[studioNames[i],f]));
  assert.equal(new Set(fingerprints).size,8,'Studio editions are not structurally differentiated');
  const colors=[
    ['jade','#4f8578'],['blue','#588fae'],['champagne','#a08053'],
    ['lavender','#867aad'],['blush','#ae7d91'],['sand','#ac826c'],
    ['sea','#5b9b9b'],['silver','#707f97']
  ];
  let verified=0;
  for(const name of studioNames){
    await page.locator('[data-studio-design]').filter({hasText:name}).click();
    for(const [colorId,accent] of colors){
      const option=page.locator('[data-studio-color="'+colorId+'"]');
      assert.equal(await option.count(),1);
      await option.click();
      const style=await page.locator('.dd-card-studio').first().evaluate(el=>({
        accent:getComputedStyle(el).getPropertyValue('--accent').trim(),
        edition:Array.from(el.classList).find(x=>x.startsWith('dd-edition-')),
        date:!!el.querySelector('.dd-premium-calendar'),
        columns:getComputedStyle(el.querySelector('.dd-student-strip')).gridTemplateColumns.trim().split(/\s+/).length,
        footer:getComputedStyle(el.querySelector('footer')).textAlign
      }));
      assert.equal(style.accent,accent,'Selected color did not affect design '+name);
      assert.equal(style.date,true);
      assert.equal(style.columns,3);
      assert.equal(style.footer,'center');
      verified++;
    }
  }
  assert.equal(verified,64);
  // The color remains selected while the user switches design structures.
  await page.locator('[data-studio-design="31"]').click();
  assert.equal(await page.locator('[data-studio-color="silver"]').getAttribute('aria-pressed'),'true');
  // Draft state must persist both independent controls across a reload.
  await page.locator('[data-studio-design="35"]').click();
  await page.locator('[data-studio-color="lavender"]').click();
  await page.waitForTimeout(120);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('[data-studio-design="35"]').waitFor({state:'visible'});
  assert.equal(await page.locator('[data-studio-design="35"]').getAttribute('aria-pressed'),'true','Structure not persisted in local draft');
  assert.equal(await page.locator('[data-studio-color="lavender"]').getAttribute('aria-pressed'),'true','Independent color not persisted in local draft');
  // The backend save payload must preserve the pair without changing legacy template IDs.
  let capturedPayload=null;
  await page.route('**/api/daily-diary', async route=>{
    if(route.request().method()!=='POST') return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[]})});
    capturedPayload=JSON.parse(route.request().postData()||'{}');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id:41001,class_level:capturedPayload.class_level,diary_date:capturedPayload.diary_date,style_settings:capturedPayload.style_settings}})});
  });
  await page.getByRole('button',{name:'Save Diary'}).first().click();
  await page.getByText('Daily diary saved safely (ID #41001).').waitFor({timeout:10000});
  assert.equal(capturedPayload?.template_id,35);
  assert.equal(capturedPayload?.style_settings?.studioColorId,'lavender');
  console.log('STUDIO_STRUCTURE_COLOR_SAVE_AND_RELOAD_PASS');
  console.log('STUDIO_64_INDEPENDENT_STRUCTURE_COLOR_COMBINATIONS_PASS');
  console.log('STUDIO_8_DISTINCT_ARCHITECTURES_PASS',studioNames.join(', '));
  await page.locator('.dd-classic-themes summary').click();
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
