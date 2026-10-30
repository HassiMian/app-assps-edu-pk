import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
const user={id:77,name:'Test Principal',role:'principal',school_id:1,tenant_id:'assps'}
const apiCalls=[], writes=[]
const negative=process.env.PROMOTION_QA_MODE==='refresh-rejected'
const bootExpired=process.env.PROMOTION_QA_MODE==='boot-expired'
const context=await browser.newContext({viewport:{width:1500,height:1000}})
await context.addInitScript(({u,bootExpired})=>{
 localStorage.setItem('al_siddique_token',bootExpired?'qa-expired':'qa-initial')
 localStorage.setItem('al_siddique_refresh_token','qa-refresh')
 localStorage.setItem('al_siddique_user',JSON.stringify(u))
 localStorage.setItem('al_siddique_login_at',String(Date.now()))
},{u:user,bootExpired})
const roster=Array.from({length:11},(_,i)=>({id:1001+i,name:'Synthetic QA Student '+(i+1),gr_number:'QA-'+(i+1),class:'Eight',section:'Blue',is_active:true}))
await context.route('**/api/**', async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname
 apiCalls.push([req.method(),path])
 const send=(status,data)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
 if(path==='/api/auth/me'){
  const auth=req.headers()['authorization']||''
  if(auth.includes('qa-expired'))return send(401,{success:false,message:'Invalid or expired token.'})
  if(auth.includes('qa-initial')||auth.includes('qa-refreshed'))return send(200,{success:true,user})
  return send(401,{success:false,message:'Invalid or expired token.'})
 }
 if(path==='/api/auth/refresh')return negative ? send(401,{success:false,message:'Refresh token invalid or expired.'}) : send(200,{success:true,token:'qa-refreshed',refreshToken:'qa-refresh-new',user})
 if(path==='/api/academic/setup')return send(200,{success:true,data:{
  classes:[{name:'Eight',level:'8',sections:['Blue'],active:true},{name:'Pre Nine',level:'pre-nine',sections:['Blue'],active:true}],
  subjects:[{name:'English',classes:['8','pre-nine']}],
  sessionStart:'2026-04-01',sessionEnd:'2027-03-31'
 },configured:true})
 if(path==='/api/students'&&req.method()==='GET')return send(200,{success:true,data:roster})
 if(path==='/api/students/bulk-class-assignment'&&req.method()==='POST'){
  const payload=req.postDataJSON()
  writes.push({payload,auth:req.headers()['authorization']})
  return send(200,{success:true,count:payload.assignments.length,data:payload.assignments.map(x=>({id:x.student_id,class:x.class,section:x.section}))})
 }
 if(req.method()!=='GET')return send(403,{success:false,message:'BLOCKED UNEXPECTED QA MUTATION'})
 return send(200,{success:true,data:[]})
})
const page=await context.newPage()
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.goto((process.env.PROMOTION_QA_ORIGIN||'http://127.0.0.1:5888')+'/students/promote',{waitUntil:'domcontentloaded'})
await page.getByText('Promote / Demote Students',{exact:true}).waitFor({timeout:20000})
const options=await page.locator('select').evaluateAll(nodes=>nodes.map(x=>({selected:x.value,values:[...x.options].map(y=>y.value)})))
console.log('SELECTS',JSON.stringify(options))
await page.locator('select').nth(0).selectOption('Eight')
await page.getByRole('button',{name:'Load Students'}).click()
await page.getByText('Synthetic QA Student 1',{exact:true}).waitFor({timeout:12000})
await page.getByRole('button',{name:/Select All \(11\)/}).click()
await page.locator('select').nth(2).selectOption('Pre Nine')
await page.getByRole('button',{name:/Preview Movement \(11\)/}).click()
await page.getByRole('button',{name:/Apply Transition \(11\)/}).waitFor()
await page.evaluate(()=>localStorage.setItem('al_siddique_token','qa-expired'))
await page.getByRole('button',{name:/Apply Transition \(11\)/}).click()
if(negative){
 await page.getByText(/Your school session has expired/).waitFor({timeout:15000})
 assert.equal(writes.length,0,'expired refresh must not submit any student mutation')
 console.log('PROMOTION REFRESH REJECTED FAIL-CLOSED PASS; writes 0')
 await browser.close()
 process.exit(0)
}
await page.getByText(/Successfully moved 11 students/).waitFor({timeout:15000})
assert.equal(writes.length,1)
assert.equal(writes[0].auth,'Bearer qa-refreshed')
assert.equal(writes[0].payload.source_class,'Eight')
assert.equal(writes[0].payload.assignments.length,11)
assert.ok(writes[0].payload.assignments.every(a=>a.class==='Pre Nine'&&a.section==='Blue'))
assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_refresh_token')),'qa-refresh-new')
console.log('PROMOTION AUTH REFRESH BROWSER PASS; mock refresh: 1, mock atomic write: 1, 11 synthetic students')
console.log('PAGE_ERRORS',errors.slice(0,5))
await browser.close()
