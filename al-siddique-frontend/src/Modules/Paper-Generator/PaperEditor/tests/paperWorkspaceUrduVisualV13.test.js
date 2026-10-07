import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pngjs from 'pngjs'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const { PNG } = pngjs
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const port = 5221
let server, browser, context, page
const executablePath = [
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 (process.env.LOCALAPPDATA||'')+'/Google/Chrome/Application/chrome.exe',
].find(fs.existsSync)
before(async () => {
 server = await createServer({ root, server:{port,strictPort:true} })
 await server.listen()
 browser = await chromium.launch({ headless:true, executablePath, args:['--no-sandbox'] })
 context = await browser.newContext({viewport:{width:1640,height:1000},deviceScaleFactor:1})
 await context.route('**/api/settings/public**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}))
 page = await context.newPage()
})
beforeEach(async () => {
 await page.goto('about:blank')
 await page.goto('http://localhost:'+port+'/paper-workspace-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('[data-paper-style-root]').waitFor()
 await page.evaluate(()=>document.fonts.ready)
})
after(async()=>{await context?.close();await browser?.close();await server?.close()})
async function selectStart(field,length=7) {
 await field.click()
 return field.evaluate((el,size)=>{
  const node = document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
  if(!node)throw Error('No Urdu text node')
  const range=document.createRange()
  range.setStart(node,0)
  range.setEnd(node,Math.min(size,node.length))
  const sel=getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
  el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
  document.dispatchEvent(new Event('selectionchange'))
  return sel.toString()
 },length)
}
function delta(a,b) {
 const x=PNG.sync.read(a),y=PNG.sync.read(b)
 assert.equal(x.width,y.width,'Font styles must not shift field width')
 assert.equal(x.height,y.height,'Font styles must not shift field height')
 let changed=0,darker=0
 for(let i=0;i<x.data.length;i+=4){
  const diff=Math.abs(x.data[i]-y.data[i])+Math.abs(x.data[i+1]-y.data[i+1])+Math.abs(x.data[i+2]-y.data[i+2])
  if(diff>35)changed++
  if(x.data[i]+x.data[i+1]+x.data[i+2]-(y.data[i]+y.data[i+1]+y.data[i+2])>35)darker++
 }
 return {changed,darker}
}
test('V13-01: Jameel static face permits visible Urdu bold ink, not just computed 700', async()=>{
 const face=await page.evaluate(()=>Array.from(document.fonts).find(f=>f.family==='ASSPS Jameel Noori')?.weight)
 assert.equal(face,'400','Do not misdeclare a static Urdu face as a 400–900 variable font')
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const heading=page.getByLabel('Edit question 2 heading')
 const marks=page.getByLabel('Edit question 2 marks')
 const originalMarks=await marks.innerHTML()
 await heading.click()
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const normal=await heading.screenshot()
 const selected=await selectStart(heading,7)
 assert.ok(/\p{Script=Arabic}/u.test(selected),'Selection must contain Urdu glyphs')
 const bar=page.locator('[data-inline-selection-toolbar]')
 await bar.getByRole('button',{name:'B',exact:true}).click()
 assert.equal(await marks.innerHTML(),originalMarks)
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const bold=await heading.screenshot()
 const visual=delta(normal,bold)
 assert.ok(visual.changed>=100&&visual.darker>=100,'Urdu selected phrase must have visibly darker pixels. Measured: '+JSON.stringify(visual))
 await bar.getByRole('button',{name:'B',exact:true}).click()
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const reset=await heading.screenshot()
 assert.ok(delta(normal,reset).changed<40,'Second click must visibly restore normal Urdu glyphs')
})
test('V13-02: Urdu italic has a real visible shape and reverses independently', async()=>{
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const h=page.getByLabel('Edit question 2 heading')
 await h.click()
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const normal=await h.screenshot()
 await selectStart(h,7)
 const bar=page.locator('[data-inline-selection-toolbar]')
 await bar.getByRole('button',{name:'I',exact:true}).click()
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const italic=await h.screenshot()
 const italicVisual=delta(normal,italic)
 console.log('ITALIC_PIXELS',JSON.stringify(italicVisual),'STYLE',await h.evaluate(e=>{const n=e.querySelector('span');return {css:n?.getAttribute('style'),font:getComputedStyle(n||e).fontFamily,fontStyle:getComputedStyle(n||e).fontStyle}}))
 assert.ok(italicVisual.changed>=50,'Italic must change visible Urdu glyph pixels, not only toolbar: '+JSON.stringify(italicVisual))
 await bar.getByRole('button',{name:'I',exact:true}).click()
 await page.evaluate(()=>getSelection()?.removeAllRanges())
 const normalAgain=await h.screenshot()
 assert.ok(delta(normal,normalAgain).changed<40,'Italic OFF should restore baseline glyph shape')
})
test('V13-03: RTL closing bracket mirrors visually toward Urdu label and print uses same orientation',async()=>{
 const option=page.locator('[data-option-label][data-language="urdu"]').first()
 const geometry=await option.evaluate(el=>{
  const label=el.querySelector('[data-option-label-text]')
  const bracket=el.querySelector('[data-option-bracket]')
  const text=el.closest('[data-option-choice]')?.querySelector('[data-option-text]')
  const L=label.getBoundingClientRect(), B=bracket.getBoundingClientRect(), T=text.getBoundingClientRect()
  return {ch:bracket.textContent.trim(),dir:getComputedStyle(bracket).direction,
   bracketLeft:B.left,bracketRight:B.right,labelLeft:L.left,labelRight:L.right,optionTextRight:T.right}
 })
 assert.equal(geometry.ch,')','Closing punctuation remains logically a closing bracket')
 assert.equal(geometry.dir,'rtl','RTL Unicode mirroring must face the closing curve toward the Urdu label')
 assert.ok(geometry.bracketRight<geometry.labelLeft,'Closing glyph appears immediately to the left of Urdu label')
 assert.ok(geometry.optionTextRight<geometry.bracketLeft,'Option content follows outside the bracket')
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const print=await frame.evaluate(f=>{
  const b=f.contentDocument?.querySelector('[data-option-label][data-language="urdu"] [data-option-bracket]')
  return {ch:b?.textContent?.trim(),dir:b?getComputedStyle(b).direction:''}
 })
 assert.deepEqual(print,{ch:')',dir:'rtl'},'Print and preview must use the same mirrored closing bracket')
})

test('V13-04: optical Urdu italic survives sanitization, Done Editing and print clone', async()=>{
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const heading=page.getByLabel('Edit question 2 heading')
 await selectStart(heading,7)
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'I',exact:true}).click()
 const live=await heading.innerHTML()
 assert.match(live,/skewX\(-8deg\)/i)
 await page.getByRole('button',{name:'Done Editing'}).click()
 const preview=page.locator('[data-official-section]').nth(1).locator('[data-edit-field="question-heading"]')
 const previewHtml=await preview.innerHTML()
 assert.match(previewHtml,/skewX\(-8deg\)/i,'Saved preview must keep visible Urdu italic correction')
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const printed=await frame.evaluate(el=>{
  const h=el.contentDocument?.querySelectorAll('[data-official-section] [data-edit-field="question-heading"]')?.[1]
  const span=h?.querySelector('span[style*="skewX"]')
  return {html:h?.innerHTML||'',transform:span?getComputedStyle(span).transform:'none'}
 })
 assert.match(printed.html,/skewX\(-8deg\)/i,'Print clone must not strip optical italic')
 assert.notEqual(printed.transform,'none','Printed Urdu text must visibly keep its slope')
})

test('V13-05: exact Class 7 Urdu heading (✓) uses compact Arial punctuation and remains editable/print-safe',async()=>{
 const preview=page.locator('[data-official-section]').first().locator('[data-edit-field="question-heading"]')
 assert.match(await preview.textContent(),/\(✓\)/)
 const metric=async el=>el.evaluate(h=>{
  const mark=[...h.querySelectorAll('span[dir="ltr"]')].find(n=>n.textContent.includes('✓'))
  if(!mark)return null
  return {text:mark.textContent,html:mark.outerHTML,font:getComputedStyle(mark).fontFamily,
    markSize:parseFloat(getComputedStyle(mark).fontSize),
    headingSize:parseFloat(getComputedStyle(h).fontSize),direction:getComputedStyle(mark).direction}
 })
 let before=await metric(preview)
 assert.ok(before,'The heading must isolate the tick parenthetical rather than render Nastaleeq oversized Latin parentheses')
 assert.match(before.font,/Arial/i)
 assert.equal(before.direction,'ltr')
 assert.ok(before.markSize<=before.headingSize*.9,'Parentheses and tick must be optically compact')
 await page.getByRole('button',{name:'Edit Paper'}).click()
 const heading=page.getByLabel('Edit question 1 heading')
 const plain=await heading.textContent()
 const marks=page.getByLabel('Edit question 1 marks')
 const unchangedMarks=await marks.innerHTML()
 await selectStart(heading,7)
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 assert.equal(await heading.textContent(),plain)
 assert.equal(await marks.innerHTML(),unchangedMarks)
 assert.ok(await metric(heading),'Special parenthetical must survive selected-text formatting')
 await page.getByRole('button',{name:'Done Editing'}).click()
 before=await metric(preview)
 assert.ok(before&&/Arial/i.test(before.font),'Preview must keep corrected parenthetical size/font after save')
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const printed=await frame.evaluate(f=>{
  const h=f.contentDocument?.querySelector('[data-official-section] [data-edit-field="question-heading"]')
  const mark=h?.querySelector('span[dir="ltr"]')
  return {text:mark?.textContent||'',font:mark?getComputedStyle(mark).fontFamily:'',size:mark?parseFloat(getComputedStyle(mark).fontSize):0}
 })
 assert.match(printed.text,/\(✓\)/)
 assert.match(printed.font,/Arial/i)
 assert.ok(printed.size>0&&printed.size<=before.markSize+1)
})
