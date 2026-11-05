import {test} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5325
const user={id:991,role:'admin',school_id:1,tenant_id:'assps'}

test('A199 server metadata cannot open fake blank paper when revision verification fails',{timeout:70000},async()=>{
 const server=await createServer({root,server:{port,host:'127.0.0.1',strictPort:true}})
 await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const ctx=await browser.newContext({viewport:{width:1400,height:900}})
 await ctx.addInitScript(u=>{
   localStorage.setItem('al_siddique_token','mock-jwt')
   localStorage.setItem('al_siddique_user',JSON.stringify(u))
   localStorage.setItem('al_siddique_login_at',String(Date.now()))
 },user)
 const calls=[]
 await ctx.route('**/api/**',r=>{
   const p=new URL(r.request().url()).pathname
   calls.push(p)
   let status=200, payload={success:true,data:[]}
   if(p==='/api/auth/me')payload={success:true,user}
   if(p==='/api/portal/paper-studio/library')payload={success:true,data:{vault:[]}}
   if(p==='/api/assessment-studio/papers')payload={success:true,data:[{public_id:'server-only-2',title:'Assessment 4 Server Revision',current_revision:2,current_revision_available:true,status:'DRAFT'}]}
   if(p==='/api/assessment-studio/papers/server-only-2'){status=503;payload={success:false,message:'Versioned document unavailable'}}
   return r.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)})
 })
 const page=await ctx.newPage();const pageErrors=[]
 page.on('pageerror',e=>pageErrors.push(e.message))
 try{
   await page.goto('http://127.0.0.1:'+port+'/saved-papers-a199-router-test.html',{waitUntil:'domcontentloaded'})
   await page.locator('[data-server-row="server-only-2"]').waitFor({timeout:25000})
   await page.locator('[data-server-row="server-only-2"] button').click()
   await page.getByRole('alert').getByText('Could not verify server assessment. No unverified paper was opened.').waitFor({timeout:15000})
   assert.ok(calls.includes('/api/assessment-studio/papers/server-only-2'))
   assert.ok((await page.locator('body').innerText()).includes('Saved Papers'))
   assert.equal(await page.locator('[data-server-row="server-only-2"]').count(),1,'stay in Saved Papers instead of opening an empty document')
   assert.equal(pageErrors.length,0,pageErrors.join('; '))
   console.log('A199_FULL_PAPER_GENERATOR_SERVER_REVISION_FAIL_CLOSED_PASS')
 }finally{await ctx.close();await browser.close();await server.close()}
})
