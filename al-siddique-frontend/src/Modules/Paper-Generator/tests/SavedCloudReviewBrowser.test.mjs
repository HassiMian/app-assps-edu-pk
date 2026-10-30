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
