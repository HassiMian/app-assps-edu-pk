import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
const json=(data,status=200)=>({status,contentType:'application/json',body:JSON.stringify(data)})
test('failed Assessment creation stays visible, retry only closes after actual server acknowledgement', {timeout:85000},async()=>{
 const vite=await createServer({root,server:{port:5879,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const ctx=await browser.newContext()
  const page=await ctx.newPage()
  const draftPosts=[]
  let allowSave=false
  await ctx.route('**/api/academic/setup**',r=>r.fulfill(json({success:true,data:{classes:[{name:'One',level:'1',sections:['Blue'],active:true}],subjects:[{name:'English',classes:['1']}],sessionStart:'2026-04-01',sessionEnd:'2027-03-31'}})))
  await ctx.route('**/api/exams/grade-settings**',r=>r.fulfill(json({success:true,data:[]})))
  await ctx.route('**/api/students**',r=>r.fulfill(json({success:true,data:[]})))
  await ctx.route('**/api/exams**',async r=>{
   if(r.request().method()==='POST'){
    const payload=r.request().postDataJSON()
    draftPosts.push(payload)
    return r.fulfill(allowSave?json({success:true,data:{id:412, ...payload}},201):json({success:false,message:'Assessment storage temporarily unavailable.'},503))
   }
   return r.fulfill(json({success:true,data:[{id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:100,pass_marks:33}]}))
  })
  await page.goto('http://127.0.0.1:5879/exam-modal-review-test.html')
  await page.getByRole('button',{name:'Add Exam'}).first().click()
  await page.getByPlaceholder('Mid-Term 2026').fill('Assessment 1')
  // Date is intentionally optional; leave the date input untouched.
  const fields=page.locator('input[type="number"]')
  await fields.nth(0).fill('25')
  await fields.nth(1).fill('10')
  await page.getByRole('button',{name:'Add Exam'}).last().click()
  await page.getByText('Assessment storage temporarily unavailable.').waitFor({state:'visible',timeout:12000})
  assert.equal(await page.getByPlaceholder('Mid-Term 2026').inputValue(),'Assessment 1')
  assert.equal(draftPosts.length,1,'must attempt exactly one save')
  assert.equal(draftPosts[0].class,'All Classes')
  allowSave=true
  await page.getByRole('button',{name:'Add Exam'}).last().click()
  await page.getByText('Assessment 1',{exact:true}).first().waitFor({state:'visible',timeout:12000})
  assert.equal(await page.getByPlaceholder('Mid-Term 2026').count(),0,'confirmed save closes dialog')
  assert.equal(draftPosts.length,2,'retry should be explicit once')
  assert.equal(draftPosts[1].total_marks,25)
  assert.equal(draftPosts[1].pass_marks,10)
  console.log('EXAM_MODAL_BROWSER_FAILURE_RETRY_ACKNOWLEDGEMENT PASS')
  await ctx.close()
 }finally{await browser.close();await vite.close()}
})
