import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5861

test('Late Diary Save must not confirm currently unsaved selection',{timeout:115000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const ctx=await browser.newContext({viewport:{width:1480,height:970},timezoneId:'Asia/Karachi'})
 await ctx.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 const calls=[]
 let releaseSave
 const deferredSave=new Promise(resolve=>{releaseSave=resolve})
 const students=[
  {id:801,name:'Synthetic Blue Eight',roll_number:'01',class:'Eight',section:'Blue'},
  {id:802,name:'Synthetic Green Eight',roll_number:'02',class:'Eight',section:'Green'},
  {id:701,name:'Synthetic Blue Seven',roll_number:'01',class:'Seven',section:'Blue'},
 ]
 const academic={success:true,configured:true,data:{periodsPerDay:8,classes:[{level:'8',name:'Eight',active:true,sections:['Blue','Green']},{level:'7',name:'Seven',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8','7']}]}}
 await ctx.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await ctx.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{school_name:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}})}))
 await ctx.route('**/api/students**',r=>{const term=new URL(r.request().url()).searchParams.get('class');return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:students.filter(s=>s.class===term)})})})
 await ctx.route('**/api/lesson-plans**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await ctx.route(/\/api\/daily-diary(?:\/|$)/,async r=>{
  const req=r.request()
  const method=req.method()
  if(method==='POST'||method==='PUT'){
   const body=req.postDataJSON();calls.push({method,url:new URL(req.url()).pathname,scope:[body.class_level,body.style_settings?.section,body.diary_date],body})
   const match=/\/api\/daily-diary\/(\d+)$/.exec(new URL(req.url()).pathname)
   const id=method==='POST'?200+calls.filter(c=>c.method==='POST').length:Number(match?.[1])
   if(method==='POST'&&calls.length===1)await deferredSave
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id}})})
  }
  return r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'});
 })
 const page=await ctx.newPage()
 try{
  await page.goto(`http://127.0.0.1:${PORT}/daily-diary-workspace-test.html`,{waitUntil:'domcontentloaded',timeout:35000})
  await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:15000})
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  const date=page.locator('[data-dd-date]');await date.fill('2026-10-09')
  const pending=page.getByRole('button',{name:'Save Diary'}).click()
  await page.waitForRequest(r=>r.url().includes('/api/daily-diary')&&r.method()==='POST')
  await date.fill('2026-10-10')
  releaseSave()
  await pending
  await page.getByText('Previous diary selection was saved. Current editor selection was not saved.').waitFor({timeout:15000})
  assert.equal(calls.length,1)
  assert.deepEqual(calls[0].scope,['8','Blue','2026-10-09'])
 }finally{await ctx.close()}
})
