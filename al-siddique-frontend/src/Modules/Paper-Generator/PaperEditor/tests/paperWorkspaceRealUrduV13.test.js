import {test,before,after,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import pngjs from 'pngjs'
const {PNG}=pngjs
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5213
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
 await page.evaluate(()=>document.fonts.ready)
})
after(async()=>{await context?.close();await browser?.close();await server?.close()})
function pixelStats(before,after){
 const b=PNG.sync.read(before),a=PNG.sync.read(after)
 const width=Math.min(a.width,b.width),height=Math.min(a.height,b.height)
 let changed=0,baselineInk=0,boldInk=0
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const bi=4*(y*b.width+x),ai=4*(y*a.width+x)
  const v=[0,1,2].map(k=>Math.abs(b.data[bi+k]-a.data[ai+k]))
  if(Math.max(...v)>16)changed++
  const dark=(data,i)=>(data[i]+data[i+1]+data[i+2])<590
  if(dark(b.data,bi))baselineInk++
  if(dark(a.data,ai))boldInk++
 }
 return {changed,baselineInk,boldInk,width,height}
}

test('V13-01: actual Urdu statement has a raster-visible selected Bold, unlike unchanged marks',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 await heading.scrollIntoViewIfNeeded()
 const marks=page.getByLabel('Edit question 2 marks')
 const originalMarks=await marks.innerHTML()
 await heading.click()
 await page.evaluate(()=>window.getSelection()?.removeAllRanges())
 const before=await heading.screenshot({animations:'disabled'})
 const selected=await heading.evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
  if(!node||!/\p{Script=Arabic}/u.test(node.textContent))throw Error('No Urdu heading to measure')
  const range=document.createRange(),selection=window.getSelection()
  range.setStart(node,0);range.setEnd(node,Math.min(node.length,14))
  selection.removeAllRanges();selection.addRange(range)
  el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
  document.dispatchEvent(new Event('selectionchange'))
  return selection.toString()
 })
 assert.match(selected,/\p{Script=Arabic}/u)
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 assert.match(await heading.innerHTML(),/font-weight:\s*bold/i)
 await heading.evaluate(()=>window.getSelection()?.removeAllRanges())
 await page.waitForTimeout(100)
 const after=await heading.screenshot({animations:'disabled'})
 const stats=pixelStats(before,after)
 assert.ok(stats.changed>35,'Urdu glyph pixels must visibly differ after Bold: '+JSON.stringify(stats))
 assert.ok(stats.boldInk>stats.baselineInk,'Bold must measurably thicken the Urdu ink, not only the Latin tick: '+JSON.stringify(stats))
 assert.equal(await marks.innerHTML(),originalMarks,'Marks must remain entirely unchanged')
 const family=await heading.evaluate(el=>getComputedStyle(el).fontFamily)
 assert.match(family,/ASSPS Paper Static Noori|Noto Nastaliq Urdu/i)
})

test('V13-02: when user drags serial plus title, the statement receives Bold and marks never change',async()=>{
 const number=page.getByLabel('Edit question 2 number')
 const heading=page.getByLabel('Edit question 2 heading')
 await heading.scrollIntoViewIfNeeded()
 const marks=page.getByLabel('Edit question 2 marks')
 const beforeMarks=await marks.innerHTML()
 const text=await heading.textContent()
 await heading.click()
 const selected=await heading.evaluate(el=>{
  const wrapper=el.closest('[data-question-heading]')
  const number=wrapper?.querySelector('[data-edit-field="question-number"]')
  if(!number)throw Error('Serial field missing')
  const start=document.createTreeWalker(number,NodeFilter.SHOW_TEXT).nextNode()
  const end=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
  const r=document.createRange()
  r.setStart(start,0);r.setEnd(end,end.textContent.length)
  const s=window.getSelection()
  s.removeAllRanges();s.addRange(r)
  document.dispatchEvent(new Event('selectionchange'))
  return s.toString()
 })
 assert.equal(selected.trim(),(await number.textContent()).trim(),'Chromium reproduces the cross-editable drag clipping to serial')
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 assert.match(await heading.innerHTML(),/font-weight:\s*bold/i)
 assert.equal(await heading.textContent(),text)
 assert.equal(await marks.innerHTML(),beforeMarks)
})

test('V13-03: RTL closing bracket mirrors physically and stays between label and option in preview/print',async()=>{
 const choices=page.locator('[data-option-choice]')
 assert.ok(await choices.count()>=4,'Need four authentic Urdu MCQ options')
 for(let index=0;index<4;index++){
  const option=choices.nth(index)
  const geometry=await option.evaluate(el=>{
   const label=el.querySelector('[data-option-label]')
   const glyph=el.querySelector('[data-option-bracket]')
   const word=el.querySelector('[data-option-label-text]')
   const text=el.querySelector('[data-option-text], [data-paper-inline-editable]')
   if(!label||!glyph||!word||!text)throw Error('MCQ markup incomplete')
   const b=glyph.getBoundingClientRect(),w=word.getBoundingClientRect()
   return {
    logical:glyph.textContent.trim(),
    mirrored:getComputedStyle(glyph).transform,
    direction:getComputedStyle(glyph).direction,
    glyphRight:b.right,wordLeft:w.left,
    glyphSize:parseFloat(getComputedStyle(glyph).fontSize),
    labelSize:parseFloat(getComputedStyle(word).fontSize),
    optionText:text.textContent,
   }
  })
  assert.equal(geometry.logical,')','Persisted semantic source stays a closing bracket')
  assert.match(geometry.mirrored,/matrix\(-/,'RTL visual curve must face the label (mirrored Latin closing glyph)')
  assert.ok(geometry.glyphRight<=geometry.wordLeft+3,'Physical bracket must follow Urdu label to its left: '+JSON.stringify(geometry))
  assert.ok(geometry.glyphSize<geometry.labelSize,'Bracket cannot become an oversized Nastaleeq flourish')
  assert.equal(geometry.direction,'ltr','Isolated glyph uses stable Latin direction')
 }
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const printed=await frame.evaluate(el=>{
  const doc=el.contentDocument
  return [...doc.querySelectorAll('[data-option-bracket]')].slice(0,4).map(bracket=>({
   text:bracket.textContent.trim(),
   mirrored:getComputedStyle(bracket).transform,
  }))
 })
 assert.equal(printed.length,4)
 for(const bracket of printed){
  assert.equal(bracket.text,')')
  assert.match(bracket.mirrored,/matrix\(-/,'Print bracket must have the identical RTL closing direction')
 }
})

test('V13-04: visible synthetic Urdu bold is preserved in the exact print iframe',async()=>{
 const heading=page.getByLabel('Edit question 2 heading')
 await heading.click()
 await heading.evaluate(el=>{
  const node=document.createTreeWalker(el,NodeFilter.SHOW_TEXT).nextNode()
  const range=document.createRange()
  range.setStart(node,0);range.setEnd(node,Math.min(node.length,14))
  const s=window.getSelection();s.removeAllRanges();s.addRange(range)
  el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
  document.dispatchEvent(new Event('selectionchange'))
 })
 await page.locator('[data-inline-selection-toolbar]').getByRole('button',{name:'B',exact:true}).click()
 await page.getByRole('button',{name:'Done Editing'}).click()
 await page.getByRole('button',{name:'Print'}).click()
 const frame=page.locator('#__print_frame')
 await frame.waitFor({state:'attached'})
 const state=await frame.evaluate(el=>{
  const doc=el.contentDocument
  const target=doc.querySelectorAll('[data-question-heading] [data-edit-field="question-heading"]')[1]
  const emphasized=target&&[...target.querySelectorAll('span[style]')].find(n=>n.style.fontWeight==='bold')
  if(!emphasized)return {error:'Missing emphasized heading in print'}
  const computed=doc.defaultView.getComputedStyle(emphasized)
  return {text:emphasized.textContent,family:computed.fontFamily,shadow:computed.textShadow,weight:computed.fontWeight,ancestors:[...function*(){for(let p=emphasized;p&&p!==doc.body;p=p.parentElement)yield [p.tagName,p.className,p.getAttribute('data-edit-field'),p.hasAttribute('data-official-sections')] }()],styles:doc.querySelector('style')?.textContent?.includes('text-shadow:0.24px'),selectorMatch:emphasized.matches('[data-official-sections] [data-edit-field] span[style*="font-weight: bold"]'),inline:emphasized.getAttribute('style'),ruleCount:doc.styleSheets?.[0]?.cssRules?.length,matchingRules:[...doc.styleSheets[0].cssRules].filter(r=>r.cssText?.includes('text-shadow')).map(r=>r.cssText)}
 })
 assert.ok(!state.error,JSON.stringify(state))
 assert.match(state.text,/\p{Script=Arabic}/u)
 assert.match(state.family,/ASSPS Paper Static Noori|Noto Nastaliq Urdu/i)
 assert.notEqual(state.shadow,'none','Print must preserve optical emphasis for the static Urdu font: '+JSON.stringify(state))
 assert.ok(Number(state.weight)>=700,'Print heading must carry the selected bold weight')
})
