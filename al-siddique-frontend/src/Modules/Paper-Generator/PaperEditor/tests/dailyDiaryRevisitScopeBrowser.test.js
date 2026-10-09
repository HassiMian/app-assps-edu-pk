import {test} from 'node:test'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
import {createServer} from 'vite'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const PORT=5572

test('Daily Diary revisiting saved scope must PUT the original ID rather than duplicate another POST',{timeout:115000},async t=>{
 const vite=await createServer({root,server:{port:PORT,strictPort:true}});await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const ctx=await browser.newContext({viewport:{width:1480,height:970},timezoneId:'Asia/Karachi'})
 await ctx.addInitScript(()=>{localStorage.setItem('al_siddique_token','mock-jwt-token');localStorage.setItem('al_siddique_login_at',String(Date.now()));localStorage.setItem('al_siddique_user',JSON.stringify({id:999,role:'admin',school_id:1,tenant_id:'assps'}))})
 const calls=[]
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
 await ctx.route(/\/api\/daily-diary(?:\/|$)/,r=>{
  const req=r.request()
  const method=req.method()
  if(method==='POST'||method==='PUT'){
   const body=req.postDataJSON();calls.push({method,url:new URL(req.url()).pathname,scope:[body.class_level,body.style_settings?.section,body.diary_date],body})
   const match=/\/api\/daily-diary\/(\d+)$/.exec(new URL(req.url()).pathname)
   const id=method==='POST'?200+calls.filter(c=>c.method==='POST').length:Number(match?.[1])
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id}})})
  }
  return r.fulfill({status:200,contentType:'application/json',body:'{"success":true,"data":[]}'});
 })
 const page=await ctx.newPage()
 const save=async()=>{
  const [res]=await Promise.all([page.waitForResponse(r=>r.url().includes('/api/daily-diary')&&['POST','PUT'].includes(r.request().method()),{timeout:14000}),page.getByRole('button',{name:'Save Diary'}).click()])
  console.log('DIARY_HTTP_RESPONSE',res.status(),res.url(),calls.at(-1)?.method);assert.equal(res.status(),200);return calls.at(-1)
 }
 try{
  await page.goto(`http://127.0.0.1:${PORT}/daily-diary-workspace-test.html`,{waitUntil:'domcontentloaded',timeout:35000})
  await page.locator('[data-diary-workspace]').waitFor({state:'visible',timeout:15000})
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  const date=page.locator('[data-dd-date]');await date.fill('2026-10-09')
  assert.equal((await save()).method,'POST','first class diary must create an independent record')
  assert.equal((await save()).method,'PUT','same class, section and date should update its existing ID')
  await date.fill('2026-10-10')
  assert.equal((await save()).method,'POST','new school-day diary must create a new ID rather than rewrite yesterday')
  await page.locator('[data-dd-section]').selectOption('Green')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  assert.equal((await save()).method,'POST','different section must not overwrite previous section')
  await page.locator('[data-dd-class]').selectOption('7')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  assert.equal((await save()).method,'POST','different class must not overwrite previous class diary')
  assert.equal((await save()).method,'PUT','same new class+section+date can safely revise its own record')
  await page.locator('[data-dd-class]').selectOption('8')
  await page.locator('[data-dd-section]').selectOption('Blue')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  await date.fill('2026-10-09')
  const revisited=await save()
  assert.equal(revisited.method,'PUT','return to previous school day must reopen its known session identity, NOT create duplicate')
  assert.equal(revisited.url,'/api/daily-diary/201','original day must update its own original ID')
  await date.fill('2026-10-10')
  await page.locator('[data-dd-section]').selectOption('Green')
  await page.getByText('1 students loaded').waitFor({timeout:15000})
  const greenAgain=await save()
  assert.equal(greenAgain.method,'PUT','return to previous section must preserve its known record')
  assert.equal(greenAgain.url,'/api/daily-diary/203','previous Green section must update the matching ID')
  console.log('DIARY_SCOPE_REVISIT_HTTP',JSON.stringify(calls.map(c=>({method:c.method,path:c.url,scope:c.scope}))))
  assert.deepEqual(calls.map(c=>c.method),['POST','PUT','POST','POST','POST','PUT','PUT','PUT'])
 }finally{await ctx.close()}
})
