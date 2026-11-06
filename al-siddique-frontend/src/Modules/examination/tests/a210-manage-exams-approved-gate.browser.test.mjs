import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const browserPath='/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const exam=(extra={})=>({id:14,name:'Assessment 1',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8,...extra})
const term={id:9,name:'First Term Exam',type:'TE',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8}
const json=(r,status,data)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(data)})
const begin=async t=>{
 const port = 5941 + ((Math.random()*30)|0)
 const vite=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:browserPath,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 return {browser,port}
}
test('real Assessment 1 returned as AS without approved catalog shows locked marks button',async t=>{
 const {browser,port}=await begin(t)
 const context=await browser.newContext()
 const calls=[]
 await context.route('**/api/**',r=>{
  const u=new URL(r.request().url());calls.push({method:r.request().method(),path:u.pathname,subjectFlag:u.searchParams.get('include_subjects')})
  if(u.pathname==='/api/exams'&&r.request().method()==='GET')return json(r,200,{success:true,data:[exam({subject_offerings:[]}),{...term,subject_offerings:[]}]})
  return json(r,403,{success:false,code:'ACCESS_DENIED'})
 })
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a210-manage-exams-test.html`)
 const assessmentRow=page.getByRole('row').filter({hasText:'Assessment 1'})
 await assessmentRow.getByRole('button',{name:'Marks Locked'}).waitFor({timeout:20000})
 assert.equal(await assessmentRow.getByRole('button',{name:'Marks Locked'}).isDisabled(),true)
 assert.equal(await assessmentRow.getByRole('button',{name:'Review Assessment 1 academic catalog'}).count(),1)
 const termRow=page.getByRole('row').filter({hasText:'First Term Exam'})
 assert.equal(await termRow.getByRole('button',{name:'Enter Marks'}).isEnabled(),true)
 assert.ok(calls.some(c=>c.path==='/api/exams' && c.method==='GET' && c.subjectFlag==='1'))
 assert.equal(calls.filter(c=>c.method!=='GET').length,0)
})
test('Assessment with one server-approved subject offers only Enter Approved Marks action',async t=>{
 const {browser,port}=await begin(t)
 const context=await browser.newContext()
 await context.route('**/api/**',r=>json(r,200,{success:true,data:[exam({subject_offerings:[{class_name:'Five',section:'Blue',subject:'English',total_marks:20,pass_marks:8}]})]}))
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a210-manage-exams-test.html`)
 const button=page.getByRole('row').filter({hasText:'Assessment 1'}).getByRole('button',{name:'Enter Approved Marks'})
 await button.waitFor({timeout:20000})
 assert.equal(await button.isEnabled(),true)
 assert.match(await button.getAttribute('title'),/Only 1 verified class-section/)
})
test('missing approved-catalog evidence fails closed even if backend returns Assessment header',async t=>{
 const {browser,port}=await begin(t)
 const context=await browser.newContext()
 await context.route('**/api/**',r=>json(r,200,{success:true,data:[exam()]}))
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a210-manage-exams-test.html`)
 const button=page.getByRole('row').filter({hasText:'Assessment 1'}).getByRole('button',{name:'Marks Locked'})
 await button.waitFor({timeout:20000})
 assert.equal(await button.isDisabled(),true)
 assert.match(await button.getAttribute('title'),/catalog not verified/)
})
test('failed catalog refresh revokes previously enabled Assessment marks without deleting exams',async t=>{
 const {browser,port}=await begin(t)
 const context=await browser.newContext()
 let examReads=0
 await context.route('**/api/**',r=>{
  const u=new URL(r.request().url())
  if(u.pathname==='/api/exams' && r.request().method()==='GET'){
   examReads++
   if(examReads===1)return json(r,200,{success:true,data:[exam({subject_offerings:[{class_name:'Five',section:'Blue',subject:'English',total_marks:20,pass_marks:8}]}),term]})
   return json(r,503,{success:false,message:'Catalog temporarily unavailable'})
  }
  return json(r,403,{success:false,code:'AUTH_REQUIRED'})
 })
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a210-manage-exams-test.html`)
 const assessmentRow=page.getByRole('row').filter({hasText:'Assessment 1'})
 await assessmentRow.getByRole('button',{name:'Enter Approved Marks'}).waitFor({timeout:20000})
 assert.equal(await assessmentRow.getByRole('button',{name:'Enter Approved Marks'}).isEnabled(),true)
 await page.getByRole('button',{name:'Refresh Data'}).click()
 const locked=assessmentRow.getByRole('button',{name:'Marks Locked'})
 await locked.waitFor({timeout:20000})
 assert.equal(await locked.isDisabled(),true)
 assert.equal(await page.getByRole('row').filter({hasText:'First Term Exam'}).count(),1)
 assert.ok((await page.locator('body').innerText()).includes('Assessment marks remain locked'))
 assert.ok(examReads>=2)
})
test('late stale approved response cannot override newer unapproved catalog in StrictMode',async t=>{
 const {browser,port}=await begin(t)
 const context=await browser.newContext()
 let calls=0
 await context.route('**/api/**',async route=>{
  const url=new URL(route.request().url())
  if(url.pathname==='/api/exams' && route.request().method()==='GET'){
   calls++
   if(calls===1){
    await new Promise(resolve=>setTimeout(resolve,1100))
    return json(route,200,{success:true,data:[exam({subject_offerings:[{class_name:'Five',section:'Blue',subject:'English',total_marks:20,pass_marks:8}]})]})
   }
   return json(route,200,{success:true,data:[exam({subject_offerings:[]})]})
  }
  return json(route,403,{success:false,code:'AUTH_REQUIRED'})
 })
 const page=await context.newPage()
 await page.goto(`http://127.0.0.1:${port}/a210-manage-exams-test.html?strict=1`)
 const locked=page.getByRole('row').filter({hasText:'Assessment 1'}).getByRole('button',{name:'Marks Locked'})
 await locked.waitFor({timeout:20000})
 assert.equal(await locked.isDisabled(),true)
 await page.waitForTimeout(1300)
 assert.equal(await locked.isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'Enter Approved Marks'}).count(),0)
 assert.ok(calls>=2,`StrictMode expected competing reads, got ${calls}`)
})
