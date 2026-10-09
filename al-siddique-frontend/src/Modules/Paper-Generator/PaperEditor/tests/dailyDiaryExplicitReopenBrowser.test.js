import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5581
const saved={id:201,school_id:1,created_by:999,class_level:'8',class_name:'Eight',diary_date:'2026-10-09T00:00:00.000Z',slips_per_page:5,footer_text:'Original saved footer',style_settings:{section:'Blue',paletteId:2},rows:[{id:'english',subject:'ENGLISH',diary:'Original saved English homework',isUrdu:false,isBold:true,fontSize:11,textAlign:'left'}]}

test('teacher explicitly reopens only authenticated exact-scope saved Diary after reload; preserves ID for subsequent PUT',{timeout:90000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const ctx=await browser.newContext({viewport:{width:1550,height:1000},timezoneId:'Asia/Karachi'})
 await ctx.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'teacher',school_id:1,tenant_id:'assps'}));localStorage.setItem('al_siddique_login_at',String(Date.now()))})
 const academic={success:true,configured:true,data:{periodsPerDay:8,classes:[{level:'8',name:'Eight',active:true,sections:['Blue','Green']}],subjects:[{name:'English',classes:['8']}]}}
 const calls=[]
 await ctx.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(academic)}))
 await ctx.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{"school_name":"AL SIDDIQUE SCHOLARS PUBLIC SCHOOL"}}'}))
 await ctx.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[{"id":801,"name":"Synthetic Student","roll_number":"01","class":"Eight","section":"Blue"}]}'}))
 await ctx.route('**/api/lesson-plans**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await ctx.route(/\/api\/daily-diary(?:\/|\?|$)/,r=>{
  const req=r.request();const pathname=new URL(req.url()).pathname;calls.push({method:req.method(),pathname})
  if(req.method()==='GET'&&pathname==='/api/daily-diary')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[{...saved,school_id:2,id:999},saved]})})
  if(req.method()==='GET'&&pathname==='/api/daily-diary/201')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:saved})})
  if(req.method()==='PUT'&&pathname==='/api/daily-diary/201')return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{...saved,...req.postDataJSON()}})})
  return r.fulfill({status:404,contentType:'application/json',body:'{"success":false}'});
 })
 const page=await ctx.newPage()
 page.on('dialog',dialog=>dialog.accept())
 try{
  await page.goto(`http://127.0.0.1:${PORT}/daily-diary-workspace-test.html`,{waitUntil:'domcontentloaded',timeout:35000})
  await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:15000})
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.locator('[data-dd-date]').fill('2026-10-09')
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.locator('[data-dd-date]').fill('2026-10-09')
  await page.getByRole('button',{name:'Reopen Saved Diary'}).click()
  await page.getByText('Saved diary reopened',{exact:false}).waitFor({timeout:17000})
  assert.match(await page.locator('[data-diary-editor]').textContent(),/Original saved English homework/)
  assert.ok(calls.some(c=>c.method==='GET'&&c.pathname==='/api/daily-diary/201'),'saved record authorized GET by ID required')
  assert.ok(!calls.some(c=>c.pathname==='/api/daily-diary/999'),'wrong-school same-scope record must never be selected')
  const [response]=await Promise.all([page.waitForResponse(x=>x.url().includes('/api/daily-diary/201')&&x.request().method()==='PUT',{timeout:13000}),page.getByRole('button',{name:'Save Diary'}).click()])
  assert.equal(response.status(),200)
  assert.equal(calls.at(-1).pathname,'/api/daily-diary/201')
  console.log('EXPLICIT_REOPEN_HTTP',JSON.stringify(calls))
 }finally{await ctx.close()}
})

test('reopen fails closed on duplicate records, wrong school, and detail substitution without changing draft',{timeout:115000},async t=>{
 const v=await createServer({root,server:{port:5582,strictPort:true}});await v.listen()
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await b.close();await v.close()})
 const ctx=await b.newContext({viewport:{width:1450,height:900}})
 await ctx.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'teacher',school_id:1}));localStorage.setItem('al_siddique_login_at',String(Date.now()))})
 let mode='duplicate', detailFetches=0
 await ctx.route('**/api/academic/setup',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,configured:true,data:{classes:[{level:'8',name:'Eight',active:true,sections:['Blue']}],subjects:[{name:'English',classes:['8']}]}})}))
 await ctx.route('**/api/settings',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":{}}'}))
 await ctx.route('**/api/students**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await ctx.route('**/api/lesson-plans**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'}))
 await ctx.route(/\/api\/daily-diary(?:\/|\?|$)/,r=>{
  const uri=new URL(r.request().url()).pathname
  if(uri==='/api/daily-diary'){
   const records=mode==='duplicate'?[saved,{...saved,id:202}]:mode==='foreign'?[{...saved,school_id:2,id:999}]:[saved]
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:records})})
  }
  detailFetches++
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{...saved,school_id:2}})})
 })
 const p=await ctx.newPage();p.on('dialog',dialog=>dialog.accept())
 try{
  await p.goto('http://127.0.0.1:5582/daily-diary-workspace-test.html',{waitUntil:'domcontentloaded',timeout:35000})
  await p.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:15000})
  await p.locator('[data-dd-class]').selectOption('8');await p.locator('[data-dd-section]').selectOption('Blue');await p.locator('[data-dd-date]').fill('2026-10-09')
  await p.getByRole('button',{name:'Reopen Saved Diary'}).click()
  await p.getByText('Multiple saved diaries match',{exact:false}).waitFor({timeout:16000})
  assert.equal(detailFetches,0,'ambiguous saved records cannot auto-select an arbitrary ID')
  mode='foreign'
  await p.getByRole('button',{name:'Reopen Saved Diary'}).click()
  await p.getByText('No saved diary found',{exact:false}).waitFor({timeout:16000})
  assert.equal(detailFetches,0,'list record from different school cannot be fetched')
  mode='substitute'
  await p.getByRole('button',{name:'Reopen Saved Diary'}).click()
  await p.getByText('Saved diary scope verification failed',{exact:false}).waitFor({timeout:16000})
  assert.equal(detailFetches,1,'record GET must be revalidated, not blindly trusted')
  assert.ok(!((await p.locator('[data-diary-editor]').textContent())||'').includes('Original saved English homework'),'untrusted document was not hydrated')
  console.log('SAVED_DIARY_REOPEN_FAIL_CLOSED',JSON.stringify({duplicate:true,foreign:true,serverDetailMismatch:true,detailFetches}))
 }finally{await ctx.close()}
})
