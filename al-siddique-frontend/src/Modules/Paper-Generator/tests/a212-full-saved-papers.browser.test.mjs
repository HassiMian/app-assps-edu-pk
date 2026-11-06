import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const chrome='/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const original=JSON.stringify({savedPapers:[{id:'from-existing-browser',name:'Original Literature Paper',sections:[{text:'Question from school archive'}]}]})
const reply=(route,status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)})
async function setup(t,port,{role='principal',refreshRole=role}={}){
 const vite=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext()
 const actor={id:5,role,school_id:1}
 await context.addInitScript(({actor,original})=>{
   localStorage.setItem('al_siddique_token','fake-offline-test-only')
   localStorage.setItem('al_siddique_user',JSON.stringify(actor))
   localStorage.setItem('al_siddique_login_at',String(Date.now()))
   localStorage.setItem('al_siddique_paper_store',original)
 },{actor,original})
 let meCalls=0
 await context.route('**/api/**',route=>{
   const pathname=new URL(route.request().url()).pathname
   if(pathname==='/api/auth/me'){
     meCalls++
     return reply(route,200,{success:true,user:{...actor,role:meCalls>1?refreshRole:role}})
   }
   return reply(route,200,{success:true,data:[]})
 })
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a212-full-saved-papers-test.html`)
 return {page,meCalls:()=>meCalls}
}
test('actual SavedPapersTab in AuthProvider shows Principal-only browser recovery action',async t=>{
 const {page,meCalls}=await setup(t,5931)
 const button=page.getByRole('button',{name:'Inspect this browser only'})
 await button.waitFor({timeout:30000})
 assert.equal(await button.isVisible(),true)
 await button.click()
 await page.getByText('Verified school account. Browser-only inventory complete',{exact:false}).waitFor({timeout:20000})
 assert.ok(meCalls()>=2)
 assert.equal(await page.getByText('1 papers',{exact:true}).count(),1)
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('al_siddique_paper_store')).savedPapers[0].id),'from-existing-browser')
})
test('actual SavedPapersTab with Teacher is never offered Principal paper recovery',async t=>{
 const {page}=await setup(t,5932,{role:'teacher'})
 await page.getByText('Saved Papers',{exact:false}).first().waitFor({timeout:30000})
 assert.equal(await page.getByRole('button',{name:'Inspect this browser only'}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).count(),0)
})
test('server-confirmed role downgrade unmounts real SavedPapersTab recovery panel',async t=>{
 const {page}=await setup(t,5933,{role:'principal',refreshRole:'teacher'})
 const inspect=page.getByRole('button',{name:'Inspect this browser only'})
 await inspect.waitFor({timeout:30000})
 await inspect.click()
 await page.getByText('Server-backed school identity could not be verified',{exact:false}).waitFor({timeout:15000}).catch(()=>{})
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).count(),0)
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('al_siddique_paper_store')).savedPapers[0].id),'from-existing-browser')
})
