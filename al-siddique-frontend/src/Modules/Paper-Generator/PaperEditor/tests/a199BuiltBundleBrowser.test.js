import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {preview} from 'vite'
import {chromium} from 'playwright'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5326
const user={id:999,role:'admin',school_id:1,tenant_id:'assps'}

test('A199 actual production candidate asset graph preserves browser, Vault and server assessments',{timeout:65000},async()=>{
 const web=await preview({root,preview:{host:'127.0.0.1',port,strictPort:true}})
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1500,height:960}})
 await context.addInitScript(account=>{
   localStorage.setItem('al_siddique_token','synthetic-jwt-token')
   localStorage.setItem('al_siddique_login_at',String(Date.now()))
   localStorage.setItem('al_siddique_user',JSON.stringify(account))
 },user)
 const endpoints=[]
 await context.route('**/api/**',r=>{
   const dest=new URL(r.request().url()).pathname
   endpoints.push(dest)
   let body={success:true,data:[]}
   if(dest==='/api/auth/me')body={success:true,user}
   if(dest==='/api/assessment-studio/papers')body={success:true,data:[{public_id:'synthetic-assessment-4',title:'Second Term Assessment 4',current_revision:2,current_revision_available:true,status:'DRAFT'}]}
   if(dest==='/api/portal/paper-studio/library')body={success:true,data:{vault:[{id:100,name:'Synthetic Vault Draft Class 6',className:'6',subjectName:'Science',revision:1,status:'draft'}]}}
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)})
 })
 const page=await context.newPage()
 const exceptions=[]
 page.on('pageerror',e=>exceptions.push(e.message))
 try{
   await page.goto('http://127.0.0.1:'+port+'/paper-generator',{waitUntil:'domcontentloaded',timeout:20000})
   const saved=page.getByText('Saved Papers',{exact:true})
   await saved.first().waitFor({timeout:22000})
   await saved.first().click()
   await page.locator('[data-server-row="synthetic-assessment-4"]').waitFor({timeout:22000})
   assert.equal(await page.locator('[data-vault-row="100"]').count(),1)
   assert.equal(await page.getByRole('button',{name:'Create Editable Copy'}).count(),1)
   assert.equal(await page.getByRole('button',{name:'Export Original JSON'}).count(),1)
   assert.equal(exceptions.length,0,exceptions.join('; '))
   assert.ok(endpoints.includes('/api/assessment-studio/papers'))
   assert.ok(endpoints.includes('/api/portal/paper-studio/library'))
   console.log('A199_BUILT_BUNDLE_PAPER_STUDIO_THREE_SOURCE_PASS',JSON.stringify({url:page.url(),calls:[...new Set(endpoints.filter(p=>p.includes('assessment-studio')||p.includes('paper-studio')))]}))
 }finally{
   await context.close()
   await browser.close()
   await new Promise(resolve=>web.httpServer.close(resolve))
 }
})
