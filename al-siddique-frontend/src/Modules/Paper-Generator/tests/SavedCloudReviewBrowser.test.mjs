import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
test('saved papers shows tenant-sourced cloud assessments and refuses to invent reopened document', {timeout:85000},async()=>{
 const vite=await createServer({root,server:{port:5880,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const context=await browser.newContext()
  await context.route('**/api/assessment-studio/papers**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[{public_id:'assps-a1',title:'Assessment 1',current_revision:3,status:'DRAFT'}]})}))
  const page=await context.newPage()
  await page.goto('http://127.0.0.1:5880/saved-cloud-review-test.html')
  await page.getByRole('heading',{name:'Server-Saved Assessments · Reopen for Editing'}).waitFor({timeout:14000})
  await page.getByText('Assessment 1',{exact:true}).waitFor()
  await page.evaluate(()=>window.__rejectCloud=true)
  await page.getByRole('button',{name:'Open & Edit'}).click()
  await page.getByText('Server revision cannot be reopened.').waitFor()
  assert.equal(await page.getByText('Assessment 1',{exact:true}).count(),1,'failure keeps cloud paper visible')
  const meta=await page.evaluate(()=>window.__cloudOpened)
  assert.equal(meta.serverPaperId,'assps-a1')
  assert.equal(meta.serverOnly,true)
  assert.equal(meta.canonicalDocument,undefined,'list is metadata only, not fabricated paper content')
  console.log('CLOUD_SAVED_PAPERS_BROWSER_READ_FAIL_CLOSED PASS')
  await context.close()
 }finally{await browser.close();await vite.close()}
})
test('a historical finalized paper without current revision is visible but cannot be opened for editing', {timeout:85000},async()=>{
 const vite=await createServer({root,server:{port:0,strictPort:false}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const context=await browser.newContext()
  let detailRequests=0
  await context.route('**/api/assessment-studio/papers**',r=>{
   if(new URL(r.request().url()).pathname!=='/api/assessment-studio/papers'){detailRequests++;return r.fulfill({status:404,contentType:'application/json',body:'{}'})}
   return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[
    {public_id:'real-draft',title:'Actual saved assessment',current_revision:1,current_revision_available:true,status:'DRAFT'},
    {public_id:'historic-print',title:'Print HTTP historical fixture',current_revision:1,current_revision_available:false,status:'FINALIZED'}
   ]})})
  })
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:'+vite.httpServer.address().port+'/saved-cloud-review-test.html')
  await page.getByText('Print HTTP historical fixture',{exact:true}).waitFor({timeout:15000})
  await page.getByText(/Historical record only.*original editable revision unavailable/).waitFor()
  assert.equal(await page.getByRole('button',{name:'Revision unavailable'}).isDisabled(),true)
  assert.equal(await page.getByRole('button',{name:'Open & Edit'}).isEnabled(),true)
  assert.equal(detailRequests,0,'Cannot request a nonexistent revision by clicking disabled item')
  assert.deepEqual(errors,[])
  console.log('MISSING_FINALIZED_REVISION_DISPLAYED_NOT_FABRICATED_BROWSER_PASS')
  await context.close()
 }finally{await browser.close();await vite.close()}
})
