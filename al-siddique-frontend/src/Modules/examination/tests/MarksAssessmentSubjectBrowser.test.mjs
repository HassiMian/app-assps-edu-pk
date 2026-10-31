import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
const json=data=>({status:200,contentType:'application/json',body:JSON.stringify(data)})
test('Marks Sheet Assessment 2 / Class Six displays English with no false red warning', {timeout:85000},async()=>{
 const vite=await createServer({root,server:{port:5887,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const ctx=await browser.newContext()
  const page=await ctx.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await ctx.route('**/api/academic/setup**',r=>r.fulfill(json({success:true,configured:true,data:{
   sessionStart:'2026-04-01',sessionEnd:'2027-03-31',
   classes:[{name:'Six',level:'6',sections:['Blue'],active:true}],
   subjects:[{name:'English',classes:['6']},{name:'Science',classes:['6']},{name:'Mathematics',classes:['6']}]
  }})))
  await ctx.route('**/api/exams**',r=>r.fulfill(json({success:true,data:[
   {id:15,name:'Assessment 2',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8,subject_offerings:[]}
  ]})))
  await page.goto('http://127.0.0.1:5887/marks-assessment-subject-test.html')
  await page.getByText('Marks Sheet',{exact:true}).waitFor({timeout:16000})
  const selects=page.locator('select')
  await selects.nth(0).selectOption('Assessment')
  await selects.nth(1).selectOption('Six')
  await selects.nth(2).selectOption('15')
  await selects.nth(3).selectOption('English')
  assert.equal(await selects.nth(3).inputValue(),'English')
  assert.equal(await page.getByText(/No active subjects are configured/).count(),0)
  assert.equal(await page.getByText(/No subjects are available for this class/).count(),0)
  assert.deepEqual(errors,[])
  console.log('MARKS_SIX_ENGLISH_ALL_CLASSES_FALLBACK_NO_RED_WARNING_PASS')
 }finally{await browser.close();await vite.close()}
})
