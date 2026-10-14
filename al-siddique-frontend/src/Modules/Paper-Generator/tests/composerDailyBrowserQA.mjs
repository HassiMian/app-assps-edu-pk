import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const host='127.0.0.1',port=5197
const server=await createServer({configFile:'vite.config.js',server:{host,port,strictPort:true,hmr:false}})
await server.listen()
const browser=await chromium.launch({headless:true,
  executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true})
const errors=[]
page.on('pageerror',x=>errors.push(x.message))
const original='/root/secure-archive/composer-review-20261014/manifest_private.json'
try {
 await page.goto('http://'+host+':'+port+'/composer-daily-test.html',{waitUntil:'networkidle'})
 await page.getByRole('heading',{name:'Class-wise Second Term Syllabus'}).waitFor()
 await page.locator('.composer-upload-button input[type=file]').setInputFiles(original)
 await page.getByText('Verified 59 original source groups in 12 classes.').waitFor({timeout:25000})
 assert.equal(await page.locator('.composer-class-list button').count(),12)
 assert.ok(await page.locator('.composer-readiness').innerText().then(x=>x.includes('publication HOLD')))
 await page.getByRole('button',{name:/Class Seven/}).click()
 await page.getByRole('button',{name:/Islamiyat/}).click()
 const evidence=await page.locator('.composer-excerpt').first().innerText()
 assert.ok(evidence.length>40)
 const source=await page.locator('.composer-edit select').first().locator('option').allTextContents()
 assert.ok(source.length>1)
 await page.locator('.composer-edit select').first().selectOption({index:1})
 await page.locator('.composer-edit textarea').first().fill('Proposed correction after syllabus calendar review')
 await page.locator('.composer-edit textarea').nth(1).fill('The original date should be checked against the authorized session calendar')
 await page.getByRole('button',{name:'Add Unapproved Proposal'}).click()
 await page.getByText('Correction recorded in this browser session.').waitFor()
 assert.ok((await page.locator('.composer-proposal').innerText()).includes('PROPOSED_NOT_APPROVED'))
 const downloadPromise=page.waitForEvent('download')
 await page.getByRole('button',{name:'Save Review Copy'}).click()
 const download=await downloadPromise
 const saved='/tmp/assps_composer_local_review_browser_20261014.json'
 await download.saveAs(saved)
 const j=JSON.parse(fs.readFileSync(saved,'utf8'))
 assert.equal(j.candidates.length,59)
 assert.equal(j.local_review_proposals['LPREVIEW-20261014-seven-islamiyat']?.length,1)
 await page.locator('.composer-upload-button input[type=file]').setInputFiles(saved)
 await page.getByText('Verified 59 original source groups in 12 classes.').waitFor()
 await page.getByRole('button',{name:/Class Seven/}).click()
 await page.getByRole('button',{name:/Islamiyat/}).click()
 await page.locator('.composer-proposal').waitFor()
 const winPromise=page.waitForEvent('popup')
 await page.getByRole('button',{name:'Print This Class'}).click()
 const win=await winPromise
 await win.waitForLoadState('domcontentloaded')
 const html=await win.content()
 assert.ok(html.includes('PRIVATE SOURCE REVIEW'))
 assert.ok(html.includes('Proposed correction after syllabus calendar review'))
 assert.ok(html.includes('Jameel Noori Nastaleeq'))
 await win.close()
 const bulkPromise=page.waitForEvent('popup')
 await page.getByRole('button',{name:'Print All Classes'}).click()
 const bulk=await bulkPromise
 await bulk.waitForLoadState('domcontentloaded')
 const all=await bulk.content()
 assert.equal((all.match(/class="class"/g)||[]).length,12)
 assert.ok(all.includes('Class Seven'))
 assert.equal(errors.length,0,JSON.stringify(errors))
 console.log('ASSPS_DAILY_BROWSER_REVIEW: 59/59 original source verifier PASS')
 console.log('LOCAL_REVIEW_SAVE_REOPEN_CORRECTION_AND_CLASS_PRINT: PASS')
 console.log('TWELVE_CLASS_BULK_A4_PRINT_AND_URDU_FONT_FALLBACK: PASS')
} catch(e){
 console.error('ASSPS_DAILY_QA_FAILED',e.message)
 console.error('PAGE_STATUS',String(await page.locator('body').innerText()).slice(0,1200))
 console.error('JS_ERRORS',errors)
 process.exitCode=1
} finally {
 await browser.close()
 await server.close()
}
