import { test, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const __filename=fileURLToPath(import.meta.url)
const __dirname=path.dirname(__filename)
const frontendRoot=path.resolve(__dirname,'../../../../..')
const PORT=5192
const BASE=`http://localhost:${PORT}/b3-test.html`
const clickTab=async id=>page.locator(`[data-command-tab="${id}"]`).evaluate(el=>el.click())
let server,browser,page

const chrome=[
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(x=>fs.existsSync(x))

before(async()=>{
 server=await createServer({root:frontendRoot,server:{port:PORT,strictPort:true}})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
 const ctx=await browser.newContext({viewport:{width:1600,height:1100}})
 await ctx.route('**/api/settings/public**',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 page=await ctx.newPage()
})

after(async()=>{
 await browser?.close()
 await server?.close()
})

test('V6-01 legacy schema2 Saved Paper opens the single Unified Editor, not legacy canvas',async()=>{
 await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
 await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
 assert.strictEqual(await page.locator('.canonical-paper-editor-container').count(),1)
 assert.strictEqual(await page.locator('.paper-editor-v2-root').count(),0)
 assert.strictEqual(await page.locator('.unified-adapter-badge').textContent(),'Migrated Saved Paper')
 for(const tab of ['home','insert','layout','paper']){
   assert.strictEqual(await page.locator(`[data-command-tab="${tab}"]`).count(),1,`missing ${tab} tab`)
 }
})

test('V6-02 Layout tab mutates real presentation state and keeps paper rendered',async()=>{
 await clickTab('layout')
 await page.locator('select[aria-label="Template"]').selectOption('modern')
 await page.locator('select[aria-label="Page Border"]').selectOption('double')
 await page.locator('select[aria-label="Print Mode"]').selectOption('half')
 assert.strictEqual(await page.locator('select[aria-label="Template"]').inputValue(),'modern')
 assert.strictEqual(await page.locator('select[aria-label="Page Border"]').inputValue(),'double')
 assert.strictEqual(await page.locator('select[aria-label="Print Mode"]').inputValue(),'half')
 const paper=page.locator('.canonical-paper-surface')
 await paper.waitFor()
 const style=await paper.getAttribute('style')
 assert.ok(style && style.length>20,'paper surface must remain styled after layout mutations')
})

test('V6-03 Paper tab edits subject and total marks independently',async()=>{
 await clickTab('paper')
 const subject=page.locator('[data-command-panel="paper"] input[aria-label="SUBJECT"]')
 await subject.fill('Islamiyat QA')
 await subject.blur()
 const total=page.locator('[data-command-panel="paper"] input[aria-label="Total Marks"]')
 await total.fill('12')
 await total.blur()
 await page.waitForTimeout(150)

 const headerSubject=page.locator('.canonical-paper-surface [aria-label="Subject"]').first()
 assert.strictEqual((await headerSubject.textContent()).trim(),'Islamiyat QA')
 const headerMarks=page.locator('.canonical-paper-surface [aria-label="Total Marks"]').first()
 assert.strictEqual((await headerMarks.textContent()).trim(),'12')
})

test('V6-04 Insert tab dispatches a real structural transaction',async()=>{
 await clickTab('insert')
 const before=await page.locator('[data-structured-editor]').count()
 await page.locator('[data-insert-node="true_false"]').evaluate(el=>el.click())
 await page.waitForTimeout(200)
 const after=await page.locator('[data-structured-editor]').count()
 assert.ok(after>before,`structured editor count must grow: ${before} -> ${after}`)
 assert.ok((await page.locator('[data-command-panel="insert"]').textContent()).includes('Added true false'))
})

test('V6-05 Save Paper persists the working draft',async()=>{
 await page.getByRole('button',{name:'Save Paper',exact:true}).evaluate(el=>el.click())
 await page.waitForTimeout(250)
 const hasDraft=await page.evaluate(()=>{
   for(let i=0;i<localStorage.length;i++){
     const k=localStorage.key(i)
     if(k?.includes('al_siddique_canonical_working_drafts')) return true
   }
   return false
 })
 assert.strictEqual(hasDraft,true)
})

test('V6-06 Class 7 Social Studies Urdu option geometry is label then closing bracket then text',async()=>{
 await page.evaluate(()=>window.__B3_LOAD_PAPER__('doc__official-first-term-2026-class-7-social-studies'))
 await page.waitForSelector('.canonical-paper-editor-container',{timeout:10000})
 await page.waitForTimeout(250)

 const first=page.locator('.canonical-mcq-table [data-option-choice]').first()
 await first.waitFor({timeout:8000})
 const label=first.locator('[data-option-label-text]')
 const bracket=first.locator('[data-option-bracket]')
 const textNode=first.locator('[data-option-text] .structured-text-input')
 const [lb,bb,tb]=await Promise.all([label.boundingBox(),bracket.boundingBox(),textNode.boundingBox()])
 assert.ok(lb&&bb&&tb,'all RTL option tokens need measurable boxes')
 assert.ok(lb.x>bb.x && bb.x>tb.x,`expected label > bracket > option text x positions; got ${lb.x}, ${bb.x}, ${tb.x}`)
 assert.strictEqual((await label.innerText()).trim(),'الف')
 assert.strictEqual((await bracket.innerText()).trim(),')')
})

test('V6-07 section marks remain a compact badge instead of a full-width pale bar',async()=>{
 const bar=page.locator('.canonical-section-heading-bar').first()
 const badge=bar.locator('.canonical-section-marks-badge').first()
 const [barBox,badgeBox]=await Promise.all([bar.boundingBox(),badge.boundingBox()])
 assert.ok(barBox&&badgeBox)
 assert.ok(badgeBox.width<100,`marks badge width ${badgeBox.width}px must stay compact`)
 assert.ok(barBox.width>badgeBox.width*4,'section title row must retain most available width')
 const bg=await bar.evaluate(el=>getComputedStyle(el).backgroundColor)
 assert.notStrictEqual(bg,'rgb(224, 242, 254)','section heading must not be a raw sky-blue marks strip')
})

test('V6-08 zoom controls operate on the real paper canvas',async()=>{
  await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  const preview=page.locator('.canonical-preview-container')
  const transform=()=>preview.evaluate(el=>getComputedStyle(el).transform)
  const initial=await transform()
  await page.getByRole('button',{name:'Zoom in',exact:true}).click()
  await page.waitForTimeout(80)
  assert.notStrictEqual(await transform(),initial)
  await page.getByRole('button',{name:'Reset zoom',exact:true}).click()
  await page.waitForTimeout(80)
  assert.ok((await preview.getAttribute('style')).includes('scale(1)'))
  await page.getByRole('button',{name:'Fit Width',exact:true}).click()
  await page.waitForTimeout(80)
  assert.match(await preview.getAttribute('style'),/scale\([0-9.]+\)/)
  await page.getByRole('button',{name:'Fit Page',exact:true}).click()
  await page.waitForTimeout(80)
  assert.match(await preview.getAttribute('style'),/scale\([0-9.]+\)/)
})

test('V6-09 official MCQ default is readable Table and layout switching is real',async()=>{
  await page.evaluate(()=>window.__B3_LOAD_PAPER__('doc__official-first-term-2026-class-7-social-studies'))
  await page.waitForSelector('.canonical-mcq-table',{timeout:10000})
  await clickTab('layout')
  const select=page.locator('select[aria-label="MCQ Layout"]')
  assert.strictEqual(await select.inputValue(),'table')
  await select.selectOption('grid')
  await page.waitForSelector('[data-structured-editor="mcq"]',{timeout:8000})
  assert.strictEqual(await page.locator('.canonical-mcq-table').count(),0)
  await select.selectOption('classic')
  await page.waitForTimeout(150)
  assert.strictEqual(await page.locator('.canonical-mcq-table').count(),0)
  await select.selectOption('table')
  await page.waitForSelector('.canonical-mcq-table',{timeout:8000})
})

test('V6-10 Paper tab edits all operational metadata independently',async()=>{
  await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  await clickTab('paper')
  const edits=[
    ['CLASS','8','Class'],
    ['SUBJECT','Islamiyat Advanced','Subject'],
    ['PAPER CODE','FT26-8-ISL','Paper Code'],
    ['TIME','2 Hours 30 Minutes','Time Allowed'],
    ['DATE','2026-10-10','Date'],
  ]
  for(const [commandLabel,value,headerLabel] of edits){
    const input=page.locator(`[data-command-panel="paper"] input[aria-label="${commandLabel}"]`)
    await input.fill(value); await input.blur(); await page.waitForTimeout(50)
    assert.strictEqual((await page.locator(`.canonical-paper-surface [aria-label="${headerLabel}"]`).first().textContent()).trim(),value)
  }
  const total=page.locator('[data-command-panel="paper"] input[aria-label="Total Marks"]')
  await total.fill('50'); await total.blur(); await page.waitForTimeout(70)
  assert.strictEqual((await page.locator('.canonical-paper-surface [aria-label="Total Marks"]').first().textContent()).trim(),'50')
})

test('V6-11 all six Insert commands add exactly one real document node',async()=>{
  await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  await clickTab('insert')
  const types=['mcq','true_false','fill_blank','matching_columns','grammar_table','vertical_math']
  for(const type of types){
    const uniqueCount=()=>page.locator('[data-node-id]').evaluateAll(els=>new Set(els.map(el=>el.getAttribute('data-node-id')).filter(Boolean)).size)
    const before=await uniqueCount()
    await page.locator(`[data-insert-node="${type}"]`).click()
    await page.waitForTimeout(120)
    const after=await uniqueCount()
    assert.strictEqual(after,before+1,`${type} must add exactly one unique node: ${before} -> ${after}`)
  }
})

test('V6-12 template selection changes real composition identity, not only a dropdown',async()=>{
  await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  await clickTab('layout')
  const template=page.locator('select[aria-label="Template"]')
  await template.selectOption('modern')
  await page.waitForTimeout(100)
  const surface=page.locator('.canonical-paper-surface')
  assert.strictEqual(await surface.getAttribute('data-template-id'),'modern')
  assert.strictEqual(await surface.getAttribute('data-header-style'),'banded')
  await template.selectOption('editorial')
  await page.waitForTimeout(100)
  assert.strictEqual(await surface.getAttribute('data-template-id'),'editorial')
  assert.strictEqual(await surface.getAttribute('data-header-style'),'editorial')
})

test('V6-13 question border and answer lines mutate the selected question only',async()=>{
  await page.goto(`${BASE}?mode=canonical-english`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  const responseNode=page.locator('[data-node-type="short_question"],[data-node-type="long_question"],[data-node-type="essay"],[data-node-type="translation"]').first()
  await responseNode.waitFor({timeout:8000})
  const editable=responseNode.locator('.canonical-editable-field').first()
  await editable.click()
  const node=responseNode
  const nodeId=await node.getAttribute('data-node-id')
  assert.ok(nodeId)
  await clickTab('layout')
  const border=page.locator('select[aria-label="Question Border"]')
  await border.selectOption('box')
  await page.waitForTimeout(100)
  assert.notStrictEqual(await node.evaluate(el=>getComputedStyle(el).borderStyle),'none')
  const lines=page.locator('select[aria-label="Answer Lines"]')
  assert.strictEqual(await lines.isDisabled(),false)
  await lines.selectOption('3')
  await page.waitForTimeout(120)
  assert.strictEqual(await node.locator('.canonical-answer-line').count(),3)
})

test('V6-14 template, metadata and inserted structure survive Save + Reload',async()=>{
  await page.goto(`${BASE}?mode=legacy-schema2`,{waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  await page.evaluate(()=>localStorage.clear())
  await page.reload({waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})

  await clickTab('layout')
  await page.locator('select[aria-label="Template"]').selectOption('gold')
  await clickTab('paper')
  const subject=page.locator('[data-command-panel="paper"] input[aria-label="SUBJECT"]')
  await subject.fill('Persistent Islamiyat'); await subject.blur()

  await clickTab('insert')
  await page.locator('[data-insert-node="true_false"]').click()
  await page.waitForTimeout(120)
  const beforeIds=await page.locator('[data-node-id]').evaluateAll(els=>[...new Set(els.map(el=>el.getAttribute('data-node-id')).filter(Boolean))])
  await page.getByRole('button',{name:'Save Paper',exact:true}).click()
  await page.waitForTimeout(250)

  await page.reload({waitUntil:'domcontentloaded'})
  await page.waitForSelector('[data-unified-editor-command-bar]',{timeout:12000})
  await page.waitForTimeout(250)
  assert.strictEqual(await page.locator('.canonical-paper-surface').getAttribute('data-template-id'),'gold')
  assert.strictEqual((await page.locator('.canonical-paper-surface [aria-label="Subject"]').first().textContent()).trim(),'Persistent Islamiyat')
  const afterIds=await page.locator('[data-node-id]').evaluateAll(els=>[...new Set(els.map(el=>el.getAttribute('data-node-id')).filter(Boolean))])
  assert.deepStrictEqual(afterIds.sort(),beforeIds.sort())
})

test('V6-15 MCQ number column stays number-only and marks live in a compact prompt chip',async()=>{
  await page.evaluate(()=>window.__B3_LOAD_PAPER__('doc__official-first-term-2026-class-7-social-studies'))
  await page.waitForSelector('.canonical-mcq-table',{timeout:10000})
  const firstTable=page.locator('.canonical-mcq-table').first()
  const numberCell=firstTable.locator('[data-mcq-number-cell]').first()
  const numberText=(await numberCell.innerText()).replace(/\s+/g,' ').trim()
  assert.ok(!/marks?/i.test(numberText),`number cell must not contain marks: ${numberText}`)
  const chip=firstTable.locator('.canonical-mcq-prompt-marks .canonical-question-marks').first()
  await chip.waitFor({timeout:8000})
  const box=await chip.boundingBox()
  assert.ok(box&&box.width<90,`MCQ marks chip must stay compact, got ${box?.width}px`)
  assert.ok(/marks/i.test(await chip.innerText()),'prompt-row marks chip must remain visible')
})

test('V6-16 structural and header edit controls are contextual instead of permanently occupying paper space',async()=>{
  await page.evaluate(()=>window.__B3_LOAD_PAPER__('doc__official-first-term-2026-class-7-social-studies'))
  await page.waitForSelector('[data-node-id]',{timeout:10000})
  const node=page.locator('[data-node-id]').filter({has:page.locator('.canonical-mcq-table')}).first()
  const controls=node.locator('.canonical-node-controls-header').first()
  await controls.waitFor({state:'attached',timeout:8000})
  assert.strictEqual(await controls.evaluate(el=>getComputedStyle(el).position),'absolute')
  assert.strictEqual(await controls.evaluate(el=>getComputedStyle(el).opacity),'0')
  await node.hover()
  await page.waitForTimeout(180)
  assert.strictEqual(await controls.evaluate(el=>getComputedStyle(el).opacity),'1')

  const headerControl=page.locator('.canonical-header-field-control').first()
  await headerControl.waitFor({state:'attached',timeout:8000})
  assert.strictEqual(await headerControl.evaluate(el=>getComputedStyle(el).opacity),'0')
  const headerCell=headerControl.locator('xpath=..')
  await headerCell.hover()
  await page.waitForTimeout(180)
  assert.strictEqual(await headerControl.evaluate(el=>getComputedStyle(el).opacity),'1')
})
