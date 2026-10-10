import process from 'node:process'
import {test,before,after,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5209
let server,browser,context,page
const executablePath=[
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 (process.env.LOCALAPPDATA||'')+'/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync)
before(async()=>{
 server=await createServer({root,server:{port,strictPort:true}})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']})
 context=await browser.newContext({viewport:{width:1640,height:1000}})
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 page=await context.newPage()
})
beforeEach(async()=>{
 await page.goto('about:blank')
 await page.goto('http://localhost:'+port+'/paper-workspace-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('[data-paper-style-root]').waitFor({state:'visible'})
 await page.getByRole('button',{name:'Edit Paper'}).click()
})
after(async()=>{await context?.close();await browser?.close();await server?.close()})
async function highlight(field){
 await field.click()
 return field.evaluate(el=>{
  const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
  const node=w.nextNode()
  if(!node)throw Error('field missing text node')
  const r=document.createRange()
  r.setStart(node,0);r.setEnd(node,Math.min(5,node.textContent.length))
  const s=window.getSelection();s.removeAllRanges();s.addRange(r)
  el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
  document.dispatchEvent(new Event('selectionchange'))
  return s.toString()
 })
}
test('V12-01: after selecting an earlier marks field, new heading selection B only changes the actual heading',async()=>{
 const marks1=page.getByLabel('Edit question 1 marks')
 const marks2=page.getByLabel('Edit question 2 marks')
 const heading2=page.getByLabel('Edit question 2 heading')
 await highlight(marks1)
 const before1=await marks1.innerHTML(),before2=await marks2.innerHTML()
 const selected=await highlight(heading2)
 const beforeText=await heading2.textContent()
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 const boldText=await heading2.locator('b,strong,[style*="font-weight"]').allTextContents()
 assert.ok(boldText.some(t=>t.includes(selected)), 'actual Q2 selected text must be bold, not another field')
 assert.equal(await heading2.textContent(),beforeText,'full question must remain intact')
 assert.equal(await marks1.innerHTML(),before1,'Q1 marks must remain untouched')
 assert.equal(await marks2.innerHTML(),before2,'Q2 marks must remain untouched')
})
test('V12-02: single click inside an editable heading opens the matching question inspector',async()=>{
 await page.getByLabel('Edit question 2 heading').click()
 const inspector=page.locator('[data-section-inspector]')
 await inspector.locator('input[type="number"]').first().waitFor({state:'visible',timeout:2000})
 assert.equal(await inspector.locator('input[type="number"]').first().inputValue(),'2')
 assert.equal(await page.locator('[data-official-section][data-edit-selected="true"]').count(),1)
})
test('V12-03: legacy span underline can be switched OFF and ON within one selected heading',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 await heading.click()
 await heading.evaluate(el=>{
  const plain=el.textContent
  const before=plain.slice(0,5)
  el.innerHTML='<span style="text-decoration:underline">'+before+'</span>'+plain.slice(5)
  const s=window.getSelection(),r=document.createRange(),node=el.querySelector('span').firstChild
  r.selectNodeContents(node);s.removeAllRanges();s.addRange(r)
  el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
  document.dispatchEvent(new Event('selectionchange'))
 })
 const button=page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'U',exact:true})
 await button.click()
 const state1=await heading.evaluate(el=>getComputedStyle(el.firstElementChild||el).textDecorationLine)
 assert.ok(!state1.includes('underline'),'first U on legacy-underlined range must remove underline')
 await button.click()
 assert.equal(await button.getAttribute('aria-pressed'),'true')
 assert.ok((await heading.innerHTML()).toLowerCase().includes('<u>')||(await heading.innerHTML()).includes('underline'))
})
test('V12-04: header and workspace switches never display opposite themes',async()=>{
 const root=page.locator('.pts-paper-generator-shell')
 const header=page.locator('#fixture-global-theme-toggle')
 const initial=await root.getAttribute('data-paper-theme')
 assert.equal(initial,await header.getAttribute('data-current-theme'))
 assert.equal(initial,await page.evaluate(()=>document.documentElement.dataset.theme))
 await header.evaluate(element=>element.click())
 await page.waitForFunction(()=>document.querySelector('.pts-paper-generator-shell')?.dataset.paperTheme==='dark')
 assert.equal(await root.getAttribute('data-paper-theme'),await header.getAttribute('data-current-theme'),'header toggle must update editor')
 await page.getByRole('button',{name:'Dark Mode'}).click()
 await page.waitForFunction(()=>document.querySelector('.pts-paper-generator-shell')?.dataset.paperTheme==='light')
 assert.equal(await root.getAttribute('data-paper-theme'),await header.getAttribute('data-current-theme'),'editor toggle must update header')
})

test('V12-05: real computed B/I/U styles toggle on and off on heading without touching marks',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 const marks=page.getByLabel('Edit question 2 marks')
 const originalMarks=await marks.innerHTML()
 await highlight(heading)
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 const metric=()=>heading.evaluate(el=>{
  const marked=[...el.querySelectorAll('span[style]')].find(n=>n.textContent?.trim())
  const target=marked||el
  const s=getComputedStyle(target)
  return {weight:Number(s.fontWeight),style:s.fontStyle,decoration:s.textDecorationLine,html:el.innerHTML}
 })
 const b=toolbar.getByRole('button',{name:'B',exact:true})
 const i=toolbar.getByRole('button',{name:'I',exact:true})
 const u=toolbar.getByRole('button',{name:'U',exact:true})
 await b.click(); assert.ok((await metric()).weight>=600,'Bold must visibly increase selected font weight')
 await i.click(); assert.match((await metric()).style,/italic|oblique/,'Italic must have actual computed effect')
 await u.click(); assert.match((await metric()).decoration,/underline/,'Underline must have actual computed effect')
 await u.click(); assert.ok(!(await metric()).decoration.includes('underline'),'Underline OFF must remove the selected effect')
 await i.click(); assert.equal((await metric()).style,'normal','Italic OFF must remove the selected effect')
 await b.click(); assert.ok((await metric()).weight<600,'Bold OFF must restore ordinary heading weight')
 assert.equal(await marks.innerHTML(),originalMarks,'marks stay completely unchanged')
 for(const name of ['B','I','U']){
  assert.equal(await toolbar.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'false',name+' state must match actual content')
 }
})

test('V12-06: selected Bold supports toolbar Undo and Redo without text loss',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 const text=await heading.textContent()
 await highlight(heading)
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 await toolbar.getByRole('button',{name:'B',exact:true}).click()
 const boldHtml=await heading.innerHTML()
 assert.match(boldHtml,/font-weight:\s*bold/i)
 await toolbar.getByRole('button',{name:'Undo',exact:true}).click()
 assert.ok(!/font-weight:\s*bold/i.test(await heading.innerHTML()),'Undo should reverse the selected mark')
 assert.equal(await toolbar.getByRole('button',{name:'B',exact:true}).getAttribute('aria-pressed'),'false','Undo resets button status')
 await toolbar.getByRole('button',{name:'Redo',exact:true}).click()
 assert.match(await heading.innerHTML(),/font-weight:\s*bold/i)
 assert.equal(await toolbar.getByRole('button',{name:'B',exact:true}).getAttribute('aria-pressed'),'true','Redo restores button status')
 assert.equal(await heading.textContent(),text,'Undo/Redo must preserve question wording')
})

test('V12-07: real mouse drag across Urdu heading remains selected and formatting never jumps to marks',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 await heading.scrollIntoViewIfNeeded()
 await heading.click()
 const marks=page.getByLabel('Edit question 2 marks')
 const originalMarks=await marks.innerHTML()
 const coords=await heading.evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
  const caret=index=>{
   const r=document.createRange()
   r.setStart(node,Math.min(index,node.textContent.length));r.collapse(true)
   const box=r.getBoundingClientRect()
   return {x:box.x,y:box.y+Math.max(3,box.height/2)}
  }
  return {start:caret(0),end:caret(Math.min(8,node.textContent.length))}
 })
 await page.mouse.move(coords.start.x,coords.start.y)
 await page.mouse.down()
 await page.mouse.move(coords.end.x,coords.end.y,{steps:14})
 await page.mouse.up()
 const selected=await page.evaluate(()=>window.getSelection()?.toString()||'')
 assert.ok(selected.length>0,'real mouse drag must highlight part of Urdu heading')
 await page.waitForTimeout(200)
 const stable=await heading.evaluate(el=>{
  const sel=window.getSelection()
  const n=sel?.anchorNode
  return {text:sel?.toString(),owner:n?.parentElement?.closest('[data-paper-inline-editable]')===el}
 })
 assert.equal(stable.text,selected,'selection must remain stable after the inspector updates')
 assert.ok(stable.owner,'selected text must belong to heading')
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 assert.equal(await marks.innerHTML(),originalMarks)
 assert.ok(/font-weight:\s*bold/i.test(await heading.innerHTML()))
})

test('V12-08: selected heading emphasis persists after Done Editing and in the print clone',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 await highlight(heading)
 const toolbar=page.locator('[data-inline-selection-toolbar]')
 await toolbar.getByRole('button',{name:'B',exact:true}).click()
 await toolbar.getByRole('button',{name:'U',exact:true}).click()
 await page.getByRole('button',{name:'Done Editing'}).click()
 const preview=page.locator('[data-official-section]').nth(1).locator('[data-edit-field="question-heading"]')
 const html=await preview.innerHTML()
 assert.match(html,/font-weight:\s*bold/i)
 assert.match(html,/underline/i)
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const printed=await frame.evaluate(el=>{
  const h=el.contentDocument?.querySelectorAll('[data-official-section] [data-edit-field="question-heading"]')?.[1]
  return h?.innerHTML||''
 })
 assert.match(printed,/font-weight:\s*bold/i)
 assert.match(printed,/underline/i)
})
