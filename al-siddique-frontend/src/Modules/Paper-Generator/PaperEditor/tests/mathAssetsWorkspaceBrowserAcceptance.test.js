import process from 'node:process'
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../../../../..')
const PORT=5270
const URL=`http://localhost:${PORT}/b3-test.html?mode=math-assets`
const installedChrome=[
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
].find(candidate=>fs.existsSync(candidate))
let server,browser,page

before(async()=>{
 server=await createServer({root,server:{port:PORT,strictPort:true}})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath:installedChrome,args:['--no-sandbox','--disable-setuid-sandbox']})
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 page=await context.newPage()
})
after(async()=>{await browser?.close();await server?.close()})

test('Workspace renders, edits, persists and prints math plus immutable image assets',{timeout:90000},async()=>{
 await page.goto(URL,{waitUntil:'domcontentloaded'})
 await page.waitForSelector('.canonical-paper-editor-container',{timeout:12000})

 const math=page.locator('[data-content-capability="math"]')
 const image=page.locator('[data-content-capability="image"]')
 await math.waitFor({state:'visible',timeout:10000})
 await image.waitFor({state:'visible',timeout:10000})
 assert.match((await math.textContent())||'',/x\^2 \+ y\^2 = z\^2/)
 assert.equal(await image.getAttribute('data-asset-id'),'asset-image-browser-1')
 assert.equal(await image.getAttribute('data-asset-sha256'),'a'.repeat(64))
 const img=image.locator('img')
 assert.equal(await img.getAttribute('alt'),'A one-pixel browser test image')
 assert.match((await img.getAttribute('src'))||'',/^data:image\/png;base64,/)

 const mathEditor=page.getByRole('textbox',{name:'Math expression for question 1'})
 await mathEditor.click()
 await page.keyboard.press('Control+A')
 await page.keyboard.type('a^2 + b^2 = c^2')
 await page.keyboard.press('Enter')
 await page.waitForTimeout(150)
 assert.match((await math.textContent())||'',/a\^2 \+ b\^2 = c\^2/)

 await page.locator('button:has-text("Save Draft")').click()
 await page.waitForTimeout(500)
 const storedMathPatch=await page.evaluate(()=>{
   for(let i=0;i<localStorage.length;i++){
     const key=localStorage.key(i)
     if(!key?.includes('al_siddique_canonical_working_drafts'))continue
     try{
       const parsed=JSON.parse(localStorage.getItem(key))
       const raw=JSON.stringify(parsed)
       if(raw.includes('a^2 + b^2 = c^2')&&raw.includes('mathSource'))return true
     }catch{ /* Expected optional probe failure; the assertion after this block remains authoritative. */ }
   }
   return false
 })
 assert.equal(storedMathPatch,true,'mathSource must persist in canonical working draft')

 await page.goto(URL,{waitUntil:'domcontentloaded'})
 await page.waitForSelector('.canonical-paper-editor-container',{timeout:12000})
 const reloadedMath=page.locator('[data-content-capability="math"]')
 await reloadedMath.waitFor({state:'visible',timeout:10000})
 assert.match((await reloadedMath.textContent())||'',/a\^2 \+ b\^2 = c\^2/)
 const reloadedImage=page.locator('[data-content-capability="image"]')
 assert.equal(await reloadedImage.getAttribute('data-asset-sha256'),'a'.repeat(64))

 const integrity=await page.evaluate(()=>window.__B3_VERIFY_BASELINE_INTEGRITY__?.()||{ok:false})
 assert.equal(integrity.ok,true,integrity.error||'canonical baseline must remain immutable')

 await page.getByRole('button',{name:'Print'}).click()
 const iframe=page.locator('#__canonical_print_frame')
 await iframe.waitFor({state:'attached',timeout:8000})
 const printed=await iframe.evaluate(frame=>{
   const doc=frame.contentDocument
   const mathNode=doc.querySelector('[data-content-capability="math"]')
   const imageNode=doc.querySelector('[data-content-capability="image"]')
   const printedImg=imageNode?.querySelector('img')
   return {
     mathText:mathNode?.textContent||'',
     assetId:imageNode?.getAttribute('data-asset-id')||'',
     assetSha:imageNode?.getAttribute('data-asset-sha256')||'',
     imageSrc:printedImg?.getAttribute('src')||'',
     imageAlt:printedImg?.getAttribute('alt')||'',
   }
 })
 assert.match(printed.mathText,/a\^2 \+ b\^2 = c\^2/)
 assert.equal(printed.assetId,'asset-image-browser-1')
 assert.equal(printed.assetSha,'a'.repeat(64))
 assert.match(printed.imageSrc,/^data:image\/png;base64,/)
 assert.equal(printed.imageAlt,'A one-pixel browser test image')
 console.log('MATH_ASSETS_WORKSPACE_BROWSER 1/1 PASS')
})
