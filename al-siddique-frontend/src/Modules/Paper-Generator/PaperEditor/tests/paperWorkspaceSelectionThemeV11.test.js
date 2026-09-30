import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..')
const PORT = 5199
let server, browser, context, page
const executablePath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(fs.existsSync)

before(async () => {
  server = await createServer({ root, server: { port: PORT, strictPort: true } })
  await server.listen()
  browser = await chromium.launch({ headless:true, executablePath, args:['--no-sandbox'] })
  context = await browser.newContext({ viewport:{ width:1640,height:1000 } })
  await context.route('**/api/settings/public**', route => route.fulfill({ status:200, contentType:'application/json', body:'{}' }))
  page = await context.newPage()
})
beforeEach(async () => {
  await page.goto('about:blank')
  await page.goto(`http://localhost:${PORT}/paper-workspace-test.html`, { waitUntil:'domcontentloaded' })
  await page.locator('[data-paper-style-root]').waitFor({ state:'visible', timeout:15000 })
})
after(async () => { await context?.close(); await browser?.close(); await server?.close() })

function explicitMark(html, kind) {
  const compact=String(html).toLowerCase().split(' ').join('')
  if(kind==='bold') return ['<b>','<strong>','font-weight:bold','font-weight:700','font-weight:800','font-weight:900'].some(token=>compact.includes(token))
  if(kind==='italic') return ['<i>','<em>','font-style:italic'].some(token=>compact.includes(token))
  if(kind==='underline') return ['<u>','text-decoration:underline','text-decoration-line:underline'].some(token=>compact.includes(token))
  return false
}
async function selectHeadingWord() {
  const heading = page.getByLabel('Edit question 1 heading')
  await heading.click()
  const text = await heading.evaluate(el => {
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
    const node=walker.nextNode()
    if(!node) throw new Error('No heading text node')
    const r=document.createRange()
    r.setStart(node,0);r.setEnd(node,Math.min(6,node.textContent.length))
    const sel=window.getSelection();sel.removeAllRanges();sel.addRange(r)
    el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))
    document.dispatchEvent(new Event('selectionchange'))
    return sel.toString()
  })
  assert.ok(text)
  return { heading, text }
}

test('V11-01: select in question heading and Bold toggles ON/OFF/ON without formatting marks', async () => {
  await page.getByRole('button',{name:'Edit Paper'}).click()
  const { heading, text }=await selectHeadingWord()
  const toolbar=page.locator('[data-inline-selection-toolbar]')
  const marks=page.getByLabel('Edit question 1 marks')
  const originalMarks=await marks.innerHTML()
  const plain=await heading.textContent()
  await toolbar.getByRole('button',{name:'B',exact:true}).click()
  let html=await heading.innerHTML()
  assert.ok(explicitMark(html,'bold'), 'first B must explicitly emphasize selected heading')
  assert.equal(await marks.innerHTML(),originalMarks,'marks must be untouched')
  assert.equal(await heading.textContent(),plain,'question text must not change')
  await toolbar.getByRole('button',{name:'B',exact:true}).click()
  html=await heading.innerHTML()
  assert.ok(!explicitMark(html,'bold'),'second B must remove selected bold')
  assert.equal(await marks.innerHTML(),originalMarks)
  await toolbar.getByRole('button',{name:'B',exact:true}).click()
  assert.ok(explicitMark(await heading.innerHTML(),'bold'),'third B must restore selected bold')
  await page.getByRole('button',{name:'Done Editing'}).click()
  assert.ok(explicitMark(await page.locator('[data-edit-field="question-heading"]').first().innerHTML(),'bold'),'selected emphasis must persist in preview')
  assert.equal(await page.locator('[data-edit-field="marks"]').first().innerHTML(),originalMarks)
})

test('V11-02: Italic and Underline each toggle off on second click, without Clear', async () => {
  await page.getByRole('button',{name:'Edit Paper'}).click()
  const {heading}=await selectHeadingWord()
  const toolbar=page.locator('[data-inline-selection-toolbar]')
  for(const [label,kind] of [['I','italic'],['U','underline']]){
    const btn=toolbar.getByRole('button',{name:label,exact:true})
    await btn.click()
    assert.ok(explicitMark(await heading.innerHTML(),kind),kind+' first click must enable mark')
    assert.equal(await btn.getAttribute('aria-pressed'),'true',kind+' button must reflect enabled state')
    await btn.click()
    assert.ok(!explicitMark(await heading.innerHTML(),kind),kind+' second click must disable mark')
    assert.equal(await btn.getAttribute('aria-pressed'),'false',kind+' button must reflect disabled state')
  }
})

test('V11-03: Light Mode defaults on, toolbar and inspector have readable light surfaces, switch persists', async () => {
  const shell=page.locator('.pts-paper-generator-shell')
  assert.equal(await shell.getAttribute('data-paper-theme'),'light')
  await page.getByRole('button',{name:'Edit Paper'}).click()
  const toolbar=page.locator('[data-inline-selection-toolbar]')
  const inspector=page.locator('[data-section-inspector]')
  if(process.env.ASSPS_V11_SCREENSHOT){
    await page.screenshot({path:path.join(process.env.TEMP||'.','assps-editor-v11-light.png'),fullPage:false})
  }
  const colors=await page.evaluate(()=>{
    const props=(selector)=>{const s=getComputedStyle(document.querySelector(selector));return {bg:s.backgroundColor,fg:s.color}}
    return {toolbar:props('[data-inline-selection-toolbar]'),inspector:props('[data-section-inspector]'),input:props('[data-paper-header-controls] input')}
  })
  for(const key of ['toolbar','inspector','input']){
    assert.ok(!/rgb\\(7, 25, 48\\)|rgb\\(11, 44, 77\\)/.test(colors[key].bg), key+' must not be hardcoded dark')
  }
  const contrasts=await page.evaluate(()=>{
    const rgb=raw=>raw.slice(raw.indexOf('(')+1,raw.indexOf(')')).split(',').slice(0,3).map(Number)
    const lum=raw=>rgb(raw).map(value=>{const x=value/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0)
    const ratio=(selector)=>{const s=getComputedStyle(document.querySelector(selector));const fg=lum(s.color),bg=lum(s.backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)}
    return {
      toolbar:ratio('[data-inline-selection-toolbar]'),
      inspector:ratio('[data-section-inspector]'),
      headerInput:ratio('[data-paper-header-controls] input'),
      templateSelect:ratio('select[aria-label="Paper template"]'),
      markButton:ratio('[data-inline-selection-toolbar] button[title="B"]'),
    }
  })
  for(const [element,value] of Object.entries(contrasts)){
    assert.ok(value>=4.5,element+' must meet 4.5:1 contrast, got '+value.toFixed(2))
  }
  await page.getByRole('button',{name:'Light Mode'}).click()
  assert.equal(await shell.getAttribute('data-paper-theme'),'dark')
  await page.getByRole('button',{name:'Dark Mode'}).click()
  assert.equal(await shell.getAttribute('data-paper-theme'),'light')
  assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_theme')),'light')
  assert.equal(await page.locator('[data-paper-style-root]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)')
})

test('V11-04: Urdu MCQ bracket is optically compact and ordered in preview and print', async () => {
  const option=page.locator('[data-option-label][data-language="urdu"]').first()
  const label=option.locator('[data-option-label-text]')
  const bracket=option.locator('[data-option-bracket]')
  assert.equal((await bracket.textContent()).trim(),')')
  const metrics=await option.evaluate(el=>{
    const label=el.querySelector('[data-option-label-text]')
    const bracket=el.querySelector('[data-option-bracket]')
    const a=label.getBoundingClientRect(), b=bracket.getBoundingClientRect()
    return {labelSize:parseFloat(getComputedStyle(label).fontSize),bracketSize:parseFloat(getComputedStyle(bracket).fontSize),bracketHeight:b.height,labelHeight:a.height,svg:bracket.querySelectorAll('svg').length,dir:getComputedStyle(bracket).direction}
  })
  assert.equal(metrics.svg,0)
  assert.equal(metrics.dir,'ltr')
  assert.ok(metrics.bracketSize<=metrics.labelSize*.83,'bracket must be optically smaller than Nastaliq glyph')
  await page.getByRole('button',{name:'Print'}).click()
  const frame=page.locator('#__print_frame')
  await frame.waitFor({state:'attached'})
  const print=await frame.evaluate(f=>{
    const bracket=f.contentDocument?.querySelector('[data-option-bracket]')
    return {text:bracket?.textContent?.trim(),font:bracket?parseFloat(getComputedStyle(bracket).fontSize):0}
  })
  assert.equal(print.text,')')
  assert.ok(print.font>0)
})
