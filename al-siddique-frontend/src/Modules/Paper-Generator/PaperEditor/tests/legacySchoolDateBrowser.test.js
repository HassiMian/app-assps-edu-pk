import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5546

test('legacy Lesson Plans editor and reference Diary use the Pakistan local calendar day after midnight',{timeout:120000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({timezoneId:'Asia/Karachi',viewport:{width:1440,height:970}})
 await context.clock.install({time:new Date('2026-10-08T19:30:00.000Z')})
 await context.route('**/api/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,configured:true,data:[],papers:[],students:[]})}))
 await t.test('legacy Lesson Plan new editor',async()=>{
  const page=await context.newPage()
  try{
   await page.goto(`http://127.0.0.1:${PORT}/lesson-plan-test.html`,{waitUntil:'domcontentloaded',timeout:30000})
   await page.getByText('Lesson Plans',{exact:true}).waitFor({timeout:18000})
   await page.getByRole('button',{name:/Create First Plan|New Plan/}).first().click()
   const field=page.locator('input[type="date"]').first();await field.waitFor({state:'visible'})
   const got=await field.inputValue();console.log('LEGACY_LESSON_EDITOR_DATE',got)
   assert.equal(got,'2026-10-09')
   await field.fill('2026-09-29');assert.equal(await field.inputValue(),'2026-09-29')
  }finally{await page.close()}
 })
 await t.test('legacy Daily Diary date input',async()=>{
  const page=await context.newPage()
  try{
   await page.goto(`http://127.0.0.1:${PORT}/lesson-plan-test.html?legacyDiary`,{waitUntil:'domcontentloaded',timeout:30000})
   const field=page.locator('input[type="date"]').first();await field.waitFor({state:'visible',timeout:18000})
   const got=await field.inputValue();console.log('LEGACY_DAILY_DIARY_DATE',got)
   assert.equal(got,'2026-10-09')
   await field.fill('2026-09-28');assert.equal(await field.inputValue(),'2026-09-28')
  }finally{await page.close()}
 })
 await t.test('legacy auto-generation planning start date',async()=>{
  const page=await context.newPage()
  try{
   await page.goto(`http://127.0.0.1:${PORT}/lesson-plan-test.html`,{waitUntil:'domcontentloaded',timeout:30000})
   await page.getByText('Lesson Plans',{exact:true}).waitFor({timeout:18000})
   await page.getByRole('button',{name:/Auto-Generate/}).first().click()
   await page.getByText('Auto-Generate Lesson Plans',{exact:false}).last().waitFor({state:'visible',timeout:10000})
   const dates=page.locator('input[type="date"]');await dates.first().waitFor({state:'visible'})
   const actual=await dates.first().inputValue();console.log('LEGACY_AUTOGENERATE_START_DATE',actual)
   assert.equal(actual,'2026-10-09')
   await dates.first().fill('2026-09-27');assert.equal(await dates.first().inputValue(),'2026-09-27')
  }finally{await page.close()}
 })
 await context.close()
})
