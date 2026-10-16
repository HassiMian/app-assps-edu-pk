import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5995
test('bounded Urdu serial+instruction real mouse drag and Bold never touches marks',{timeout:90000},async t=>{
 const vite=await createServer({root,server:{port,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1}));localStorage.setItem('al_siddique_login_at',String(Date.now()))})
 await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:'+port+'/paper-workspace-test.html',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const serial=page.getByLabel('Edit question 2 number')
 const instruction=page.getByLabel('Edit question 2 heading')
 const marks=page.getByLabel('Edit question 2 marks')
 await instruction.scrollIntoViewIfNeeded()
 const originalMarks=await marks.innerHTML()
 const beforeText=await instruction.textContent()
 const points=await page.evaluate(()=>{
   const s=document.querySelector('[aria-label="Edit question 2 number"]')
   const h=document.querySelector('[aria-label="Edit question 2 heading"]')
   const caret=(el,position)=>{
     const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
     const range=document.createRange();range.setStart(node,position);range.collapse(true)
     const box=range.getBoundingClientRect()
     return {x:box.x,y:box.y+box.height/2}
   }
   const sText=s.textContent,hText=h.textContent
   return {sText,hText,start:caret(s,Math.max(0,sText.length-3)),end:caret(h,Math.min(8,hText.length))}
 })
 await page.mouse.move(points.start.x,points.start.y)
 await page.mouse.down()
 await page.mouse.move(points.end.x,points.end.y,{steps:25})
 await page.mouse.up()
 const selected=await page.evaluate(()=>window.getSelection()?.toString()||'')
 assert.ok(selected.includes('2:'),'serial glyphs missing '+JSON.stringify(selected))
 assert.ok(selected.includes('درج'),'Urdu heading glyphs missing '+JSON.stringify(selected))
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 const result=await page.evaluate(()=>{
  const s=document.querySelector('[aria-label="Edit question 2 number"]')
  const h=document.querySelector('[aria-label="Edit question 2 heading"]')
  return {serial:s.innerHTML,heading:h.innerHTML,selected:getSelection()?.toString()}
 })
 assert.match(result.serial,/font-weight|<b>|<strong>/i,'serial selected part must be styled')
 assert.match(result.heading,/font-weight|<b>|<strong>/i,'heading selected part must be styled')
 assert.equal(await marks.innerHTML(),originalMarks)
 assert.equal(await instruction.textContent(),beforeText)
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'Undo'}).click()
 const undo=await page.evaluate(()=>({s:document.querySelector('[aria-label="Edit question 2 number"]').innerHTML,h:document.querySelector('[aria-label="Edit question 2 heading"]').innerHTML}))
 assert.ok(!/font-weight:\s*bold/i.test(undo.s),'undo must clear bounded serial style')
 assert.ok(!/font-weight:\s*bold/i.test(undo.h),'undo must clear bounded instruction style')
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'Redo'}).click()
 const redo=await page.evaluate(()=>({s:document.querySelector('[aria-label="Edit question 2 number"]').innerHTML,h:document.querySelector('[aria-label="Edit question 2 heading"]').innerHTML}))
 assert.match(redo.s,/font-weight:\s*bold/i)
 assert.match(redo.h,/font-weight:\s*bold/i)
 await page.getByRole('button',{name:'Done Editing'}).click()
 const preview=page.locator('[data-official-section]').nth(1)
 const persistedSerial=await preview.locator('[data-edit-field="question-number"]').innerHTML()
 const persistedHeading=await preview.locator('[data-edit-field="question-heading"]').innerHTML()
 assert.match(persistedSerial,/font-weight:\s*bold/i,'serial bold must persist after Done Editing')
 assert.match(persistedHeading,/font-weight:\s*bold/i,'instruction bold must persist after Done Editing')
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const printed=await frame.evaluate(el=>{
  const section=el.contentDocument?.querySelectorAll('[data-official-section]')?.[1]
  return {serial:section?.querySelector('[data-edit-field="question-number"]')?.innerHTML,
    heading:section?.querySelector('[data-edit-field="question-heading"]')?.innerHTML}
 })
 assert.match(printed.serial||'',/font-weight:\s*bold/i)
 assert.match(printed.heading||'',/font-weight:\s*bold/i)
 console.log('CROSS_FIELD_BOUNDED_URDU_BOLD_PRINT_PASS',JSON.stringify({selected,persistedSerial,persistedHeading,printed}))
})

test('English LTR serial and instruction underline is bounded, reversible and print-identical',{timeout:90000},async t=>{
 const englishPort=5996
 const vite=await createServer({root,server:{port:englishPort,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1}));localStorage.setItem('al_siddique_login_at',String(Date.now()))})
 await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:'+englishPort+'/paper-workspace-test.html?crossEnglish',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const serial=page.getByLabel('Edit question 2 number')
 const heading=page.getByLabel('Edit question 2 heading')
 const marks=page.getByLabel('Edit question 2 marks')
 await heading.scrollIntoViewIfNeeded()
 const originalMarks=await marks.innerHTML()
 const coords=await page.evaluate(()=>{
  const s=document.querySelector('[aria-label="Edit question 2 number"]')
  const h=document.querySelector('[aria-label="Edit question 2 heading"]')
  const caret=(el,n)=>{
   const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
   const r=document.createRange();r.setStart(node,n);r.collapse(true)
   const box=r.getBoundingClientRect();return {x:box.x,y:box.y+box.height/2}
  }
  return {start:caret(s,Math.max(0,s.textContent.length-2)),end:caret(h,Math.min(5,h.textContent.length))}
 })
 await page.mouse.move(coords.start.x,coords.start.y);await page.mouse.down()
 await page.mouse.move(coords.end.x,coords.end.y,{steps:24});await page.mouse.up()
 const selection=await page.evaluate(()=>window.getSelection()?.toString()||'')
 assert.match(selection,/2[.]/,'serial Q2 must be included')
 assert.match(selection,/Study/i,'English instruction must be included')
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 const bold=await page.evaluate(()=>({
  serial:document.querySelector('[aria-label="Edit question 2 number"]').innerHTML,
  heading:document.querySelector('[aria-label="Edit question 2 heading"]').innerHTML,
 }))
 assert.match(bold.serial,/underline/i)
 assert.match(bold.heading,/underline/i)
 assert.equal(await marks.innerHTML(),originalMarks)
 await toolbar.getByRole('button',{name:'Undo'}).click()
 const undo=await serial.innerHTML()
 assert.ok(!/underline/i.test(undo),'Undo removes English serial underline')
 await toolbar.getByRole('button',{name:'Redo'}).click()
 assert.match(await serial.innerHTML(),/underline/i)
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 assert.ok(!/underline/i.test(await serial.innerHTML()),'English serial underline OFF must affect only range')
 assert.ok(!/underline/i.test(await heading.innerHTML()),'English heading underline OFF must affect only range')
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 assert.match(await serial.innerHTML(),/underline/i)
 assert.match(await heading.innerHTML(),/underline/i)
 await toolbar.getByRole('button',{name:'I',exact:true}).click()
 assert.match(await serial.innerHTML(),/font-style:\s*italic/i)
 assert.match(await heading.innerHTML(),/font-style:\s*italic/i)
 await toolbar.getByRole('button',{name:'I',exact:true}).click()
 assert.ok(!/font-style:\s*italic/i.test(await serial.innerHTML()))
 assert.ok(!/font-style:\s*italic/i.test(await heading.innerHTML()))
 await toolbar.getByRole('button',{name:'I',exact:true}).click()
 assert.match(await serial.innerHTML(),/font-style:\s*italic/i)
 assert.match(await heading.innerHTML(),/font-style:\s*italic/i)
 // The marks badge is never part of the two-field composite formatting surface,
 // even if a user extends a DOM range beyond the instruction.
 const protectedSerial=await serial.innerHTML(),protectedHeading=await heading.innerHTML()
 await page.evaluate(()=>{
   const s=document.querySelector('[aria-label="Edit question 2 number"]')
   const m=document.querySelector('[aria-label="Edit question 2 marks"]')
   const r=document.createRange()
   const a=document.createTreeWalker(s,NodeFilter.SHOW_TEXT).nextNode()
   const b=document.createTreeWalker(m,NodeFilter.SHOW_TEXT).nextNode()
   r.setStart(a,0);r.setEnd(b,Math.min(1,b.textContent.length))
   const sel=getSelection();sel.removeAllRanges();sel.addRange(r)
 })
 await toolbar.getByRole('button',{name:'B',exact:true}).click()
 assert.equal(await marks.innerHTML(),originalMarks,'crossing into marks must be rejected')
 assert.equal(await serial.innerHTML(),protectedSerial,'invalid three-field selection cannot edit serial')
 assert.equal(await heading.innerHTML(),protectedHeading,'invalid three-field selection cannot edit heading')
 await page.getByRole('button',{name:'Done Editing'}).click()
 const section=page.locator('[data-official-section]').nth(1)
 assert.match(await section.locator('[data-edit-field="question-number"]').innerHTML(),/underline/i)
 assert.match(await section.locator('[data-edit-field="question-heading"]').innerHTML(),/underline/i)
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame');await frame.waitFor({state:'attached'})
 const print=await frame.evaluate(el=>{
  const item=el.contentDocument?.querySelectorAll('[data-official-section]')?.[1]
  return {s:item?.querySelector('[data-edit-field="question-number"]')?.innerHTML,
    h:item?.querySelector('[data-edit-field="question-heading"]')?.innerHTML}
 })
 assert.match(print.s||'',/underline/i);assert.match(print.h||'',/underline/i)
 assert.match(print.s||'',/font-style:\s*italic/i)
 assert.match(print.h||'',/font-style:\s*italic/i)
 console.log('CROSS_FIELD_ENGLISH_LTR_UNDERLINE_PRINT_PASS',JSON.stringify({selection,print}))
})

test('reverse Urdu RTL drag stays bounded to one question and preserves unselected MCQ/marks',{timeout:90000},async t=>{
 const reversePort=5997
 const vite=await createServer({root,server:{port:reversePort,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.addInitScript(()=>{
  localStorage.setItem('al_siddique_token','mock-jwt-token')
  localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1}))
  localStorage.setItem('al_siddique_login_at',String(Date.now()))
 })
 await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 const page=await context.newPage()
 await page.goto('http://127.0.0.1:'+reversePort+'/paper-workspace-test.html',{waitUntil:'domcontentloaded'})
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const heading=page.getByLabel('Edit question 2 heading')
 const serial=page.getByLabel('Edit question 2 number')
 const marks=page.getByLabel('Edit question 2 marks')
 await heading.scrollIntoViewIfNeeded()
 const other=page.getByLabel('Edit question 1 heading')
 const otherBefore=await other.innerHTML()
 const marksBefore=await marks.innerHTML()
 const section2Before=await page.locator('[data-official-section]').nth(1).textContent()
 const matchingBefore=await page.locator('[data-official-section]').nth(2).textContent()
 assert.ok(section2Before.includes('کامیابی'),'five-item odd-number list is present')
 assert.ok(matchingBefore.includes('کالم'),'adjacent matching-table question exists')

 const points=await page.evaluate(()=>{
  const number=document.querySelector('[aria-label="Edit question 2 number"]')
  const instruction=document.querySelector('[aria-label="Edit question 2 heading"]')
  const caret=(el,pos)=>{
   const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
   const range=document.createRange();range.setStart(node,pos);range.collapse(true)
   const rect=range.getBoundingClientRect()
   return {x:rect.x,y:rect.y+rect.height/2}
  }
  return {
   fromHeading:caret(instruction,Math.min(8,instruction.textContent.length)),
   toSerial:caret(number,Math.max(0,number.textContent.length-3)),
  }
 })
 await page.mouse.move(points.fromHeading.x,points.fromHeading.y)
 await page.mouse.down()
 await page.mouse.move(points.toSerial.x,points.toSerial.y,{steps:24})
 await page.mouse.up()
 const selection=await page.evaluate(()=>{
  const selected=window.getSelection()
  return {text:selected?.toString(),isBackward:selected?.anchorNode?.parentElement?.closest('[data-edit-field]')?.dataset?.editField==='question-heading'}
 })
 assert.ok(selection.text?.includes('2:'),'backwards native drag must select serial '+JSON.stringify(selection))
 assert.ok(selection.text?.includes('درج'),'backwards native drag must select Urdu instruction '+JSON.stringify(selection))
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 await toolbar.getByRole('button',{name:'B',exact:true}).click()
 assert.match(await serial.innerHTML(),/font-weight:\s*bold/i)
 assert.match(await heading.innerHTML(),/font-weight:\s*bold/i)
 assert.equal(await marks.innerHTML(),marksBefore)
 assert.equal(await other.innerHTML(),otherBefore,'another question must remain unchanged')
 const serialBeforeForeign=await serial.innerHTML()
 const headingBeforeForeign=await heading.innerHTML()
 const heading3=page.getByLabel('Edit question 3 heading')
 const heading3Before=await heading3.innerHTML()
 await page.evaluate(()=>{
  const s=document.querySelector('[aria-label="Edit question 2 number"]')
  const h=document.querySelector('[aria-label="Edit question 3 heading"]')
  const first=document.createTreeWalker(s,NodeFilter.SHOW_TEXT).nextNode()
  const last=document.createTreeWalker(h,NodeFilter.SHOW_TEXT).nextNode()
  const selection=document.createRange()
  selection.setStart(first,0);selection.setEnd(last,Math.min(2,last.textContent.length))
  const active=window.getSelection();active.removeAllRanges();active.addRange(selection)
 })
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 assert.equal(await serial.innerHTML(),serialBeforeForeign,'cross-question formatting must not alter original serial')
 assert.equal(await heading.innerHTML(),headingBeforeForeign,'cross-question formatting must not alter original heading')
 assert.equal(await heading3.innerHTML(),heading3Before,'cross-question formatting must not alter destination heading')
 await page.getByRole('button',{name:'Done Editing'}).click()
 assert.equal(await page.locator('[data-official-section]').nth(1).textContent(),section2Before,
   'odd-number 5-item list and heading plain text must remain unchanged')
 assert.equal(await page.locator('[data-official-section]').nth(2).textContent(),matchingBefore,
   'neighboring matching-table question must remain byte-identical as text')
 const persisted=page.locator('[data-official-section]').nth(1)
 assert.match(await persisted.locator('[data-edit-field="question-number"]').innerHTML(),/font-weight:\s*bold/i)
 assert.match(await persisted.locator('[data-edit-field="question-heading"]').innerHTML(),/font-weight:\s*bold/i)
 console.log('CROSS_FIELD_REVERSE_RTL_BOUNDED_PASS',JSON.stringify(selection))
})
