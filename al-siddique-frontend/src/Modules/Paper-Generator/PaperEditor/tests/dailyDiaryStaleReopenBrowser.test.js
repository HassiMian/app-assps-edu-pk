import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5832
const ownRecord={id:301,school_id:1,created_by:999,class_level:'8',class_name:'Eight',diary_date:'2026-10-09T00:00:00.000Z',slips_per_page:5,footer_text:'Original October 9 Footer',style_settings:{section:'Blue',paletteId:2},rows:[{id:'english',subject:'ENGLISH',diary:'Private October 9 English homework',isUrdu:false,isBold:true,fontSize:11,textAlign:'left'}]}

for(const returnToOriginal of [false,true]){
test(`late authorized Diary GET must not hydrate stale selection ${returnToOriginal?'even on Oct9→Oct10→Oct9 ABA':'after Oct9→Oct10'}`,{timeout:95000},async t=>{
 const port=PORT+(returnToOriginal?1:0)
 const v=await createServer({root,server:{port,strictPort:true}});await v.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});t.after(async()=>{await browser.close();await v.close()})
 const ctx=await browser.newContext({viewport:{width:1400,height:930},timezoneId:'Asia/Karachi'})
 await ctx.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'teacher',school_id:1,tenant_id:'assps'}))})
 const academic={success:true,configured:true,data:{periodsPerDay:8,classes:[{level:'8',name:'Eight',active:true,sections:['Blue','Green']}],subjects:[{name:'English',classes:['8']}]}}
 await ctx.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await ctx.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await ctx.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await ctx.route('**/api/lesson-plans**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 let releaseDetail=()=>{}, detailStarted=()=>{}
 const detailGate=new Promise(resolve=>{releaseDetail=resolve});const requestSeen=new Promise(resolve=>{detailStarted=resolve})
 const methods=[]
 await ctx.route(/\/api\/daily-diary(?:\/|\?|$)/,async r=>{
  const req=r.request(),uri=new URL(req.url()).pathname;methods.push(`${req.method()} ${uri}`)
  if(uri==='/api/daily-diary')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[ownRecord]})})
  if(uri==='/api/daily-diary/301'&&req.method()==='GET'){
   detailStarted();await detailGate
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:ownRecord})})
  }
  return r.fulfill({status:404,contentType:'application/json',body:'{"success":false}'})
 })
 const p=await ctx.newPage();p.on('dialog',d=>d.accept())
 try{
  await p.goto(`http://127.0.0.1:${port}/daily-diary-workspace-test.html`,{waitUntil:'domcontentloaded',timeout:35000})
  await p.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:17000})
  await p.locator('[data-dd-class]').selectOption('8');await p.locator('[data-dd-section]').selectOption('Blue');await p.locator('[data-dd-date]').fill('2026-10-09')
  await p.getByRole('button',{name:'Reopen Saved Diary'}).click()
  await requestSeen
  await p.locator('[data-dd-date]').fill('2026-10-10')
  assert.equal(await p.locator('[data-dd-date]').inputValue(),'2026-10-10')
  if(returnToOriginal)await p.locator('[data-dd-date]').fill('2026-10-09')
  releaseDetail()
  await p.waitForFunction(()=>document.querySelector('.dd-status')?.textContent?.includes('reopen')||document.querySelector('.dd-status')?.textContent?.includes('Reopen'),{timeout:15000})
  const editorText=await p.locator('[data-diary-editor]').textContent()
  assert.ok(!editorText.includes('Private October 9 English homework'),'stale Oct9 authorized GET must not replace currently selected Oct10 diary')
  assert.equal(await p.locator('[data-dd-date]').inputValue(),returnToOriginal?'2026-10-09':'2026-10-10')
  console.log('STALENESS_SCOPE_CHANGE_REJECTED',JSON.stringify(methods))
 }finally{releaseDetail();await ctx.close()}
})
}
