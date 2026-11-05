import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5324
const url='http://127.0.0.1:'+port+'/saved-papers-a199-test.html'
const user={id:999,role:'admin',school_id:1,tenant_id:'assps'}

test('A199 source V5 preserves Vault, server assessments, local papers and no-revision safeguards',{timeout:80000},async()=>{
 const server=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true}})
 await server.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1440,height:950},acceptDownloads:true})
 await context.addInitScript(account=>{
   localStorage.setItem('al_siddique_token','synthetic-token')
   localStorage.setItem('al_siddique_user',JSON.stringify(account))
   localStorage.setItem('al_siddique_login_at',String(Date.now()))
 },user)
 let denyServer=false
 let failVault=false
 const requests=[]
 await context.route('**/api/**',route=>{
   const destination=new URL(route.request().url()).pathname
   requests.push(destination)
   if(route.request().method()!=='GET')return route.fulfill({status:403,contentType:'application/json',body:'{"success":false}'})
   let payload={success:true,data:[]}
   let status=200
   if(destination==='/api/auth/me')payload={success:true,user}
   if(destination==='/api/assessment-studio/papers'){
     if(denyServer){status=403;payload={success:false,message:'Forbidden'}}
     else payload={success:true,data:[
       {public_id:'term2-assessment-4',title:'Second Term Assessment 4',current_revision:2,current_revision_available:true,status:'DRAFT'},
       {public_id:'term2-assessment-5',title:'Assessment 5 historical',current_revision:0,current_revision_available:false,status:'DRAFT'},
     ]}
   }
   if(destination==='/api/portal/paper-studio/library')payload={success:true,data:{vault:[
     {id:271,name:'Synthetic Science Vault',className:'6',subjectName:'Science',status:'draft',revision:1},
   ]}}
   if(destination==='/api/portal/paper-studio/papers/271'){
     if(failVault){status=503;payload={success:false,message:'Vault unavailable'}}
     else payload={success:true,data:{id:271,revision:1,document:{
       id:'approved-original',name:'Synthetic Science Vault',sections:[{id:'s1',type:'short',content:'Science question'}],
       config:{classLevel:'6',subject:'Science'},isPublished:true,approvedBy:55,approvedAt:'yesterday',
     }}}
   }
   return route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)})
 })
 const page=await context.newPage()
 const errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 try{
   await page.goto(url,{waitUntil:'domcontentloaded'})
   await page.locator('[data-server-row="term2-assessment-4"]').waitFor({timeout:22000})
   assert.equal(await page.locator('[data-vault-row="271"]').count(),1)
   assert.equal(await page.locator('[data-server-row="term2-assessment-5"] button').isDisabled(),true)
   assert.ok((await page.locator('body').innerText()).includes('browser paper'))
   assert.ok((await page.locator('body').innerText()).includes('Export Original JSON'))
   await page.locator('[data-server-row="term2-assessment-4"] button').click()
   const serverStub=await page.evaluate(()=>window.__A199_OPENED__)
   assert.equal(serverStub.tab,'build')
   assert.equal(serverStub.paper.serverPaperId,'term2-assessment-4')
   assert.equal(serverStub.paper.serverOnly,true)
   assert.equal(serverStub.paper.serverRevision,2)
   await page.locator('[data-vault-row="271"] button').first().click()
   await page.waitForFunction(()=>window.__A199_OPENED__?.paper?.vaultSourceId==='271',{timeout:11000})
   const newCopy=await page.evaluate(()=>window.__A199_OPENED__)
   assert.equal(newCopy.paper.vaultSourceId,'271')
   assert.equal(newCopy.paper.isPublished,false)
   assert.equal(newCopy.paper.approvedBy,null)
   assert.equal(newCopy.paper.serverPaperId,null)
   assert.equal(newCopy.paper.persistenceMode,'UNSAVED_NEW_COPY')
   const downloadWait=page.waitForEvent('download')
   await page.getByRole('button',{name:'Export Original JSON'}).click()
   const download=await downloadWait
   assert.ok(download.suggestedFilename().endsWith('Original_CONFIDENTIAL.json'))
   const pathOnDisk=await download.path()
   const document=JSON.parse(readFileSync(pathOnDisk,'utf8'))
   assert.equal(document.sourcePaperId,'271')
   assert.equal(document.sourceDocument.isPublished,true)
   await page.locator('input[placeholder*="Search papers"]').fill('Assessment 4')
   assert.equal(await page.locator('[data-server-row]').count(),1)
   assert.equal(await page.locator('[data-vault-row]').count(),0)
   await page.locator('input[placeholder*="Search papers"]').fill('')
   await page.evaluate(()=>{window.__A199_OPEN_FAIL__=true})
   await page.locator('[data-server-row="term2-assessment-4"] button').click()
   await page.getByRole('alert').getByText('Authentic server revision not available (synthetic)').waitFor()
   denyServer=true
   await page.getByRole('button',{name:'Refresh Saved Sources'}).click()
   await page.getByRole('alert').getByText('Your account is not authorized to access these server papers.').waitFor()
   assert.equal(await page.locator('[data-server-row]').count(),0)
   assert.equal(await page.locator('[data-vault-row]').count(),1)
   assert.equal(errors.length,0,'Runtime errors '+errors.join('; '))
   console.log('A199_BROWSER_SOURCE_V5_VAULT_SERVER_ASSESSMENT_PARITY_PASS',JSON.stringify({sourceEndpoints:[...new Set(requests)].filter(t=>t.includes('assessment-studio')||t.includes('paper-studio'))}))
 }finally{
   await context.close()
   await browser.close()
   await server.close()
 }
})
