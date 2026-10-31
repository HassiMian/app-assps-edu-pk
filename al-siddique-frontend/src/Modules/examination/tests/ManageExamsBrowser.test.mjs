import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../')
const json=(data,status=200)=>({status,contentType:'application/json',body:JSON.stringify(data)})
test('Add Exam persists Assessment 5 with hydrated session; duplicate Assessment 4 is rejected visibly', {timeout:75000},async()=>{
 const vite=await createServer({root,server:{port:5886,strictPort:true}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const ctx=await browser.newContext()
  const page=await ctx.newPage()
  const existing=[{id:17,name:'Assessment 4',type:'AS',class:'All Classes',session:'2026-2027',total_marks:20,pass_marks:8}]
  const posts=[]
  await ctx.route('**/api/academic/setup**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,350))
    await route.fulfill(json({success:true,data:{
      sessionStart:'2026-04-01',sessionEnd:'2027-03-31',
      classes:[{name:'Six',level:'6',sections:['Blue'],active:true}],
      subjects:[{name:'English',classes:['6']}]
    }}))
  })
  await ctx.route('**/api/exams',async route=>{
    if(route.request().method()==='POST'){
      const data=route.request().postDataJSON()
      posts.push(data)
      if(existing.some(e=>e.name===data.name&&e.session===data.session&&e.class===data.class))
        return route.fulfill(json({success:false,code:'EXAM_ALREADY_EXISTS',message:'This exam already exists.'},409))
      existing.push({id:18,...data})
      return route.fulfill(json({success:true,data:{id:18,...data}},201))
    }
    return route.fulfill(json({success:true,data:existing}))
  })
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:5886/manage-exams-browser-test.html')
  await page.getByText('Assessment 4',{exact:true}).first().waitFor({state:'visible',timeout:15000})
  const name=page.getByPlaceholder('e.g. First Term 2026')
  await name.fill('Assessment 5')
  const selects=page.locator('form select')
  await selects.nth(0).selectOption('Assessment')
  await page.locator('form input[type=number]').nth(0).fill('25')
  await page.locator('form input[type=number]').nth(1).fill('10')
  await page.getByRole('button',{name:'Add Exam'}).click()
  await page.getByText('Assessment 5',{exact:true}).first().waitFor({state:'visible',timeout:12000})
  assert.equal(posts.length,1)
  assert.equal(posts[0].session,'2026-2027')
  assert.equal(posts[0].class,'All Classes')
  assert.equal(posts[0].total_marks,25)
  assert.equal(posts[0].pass_marks,10)
  await name.fill('Assessment 4')
  await page.getByRole('button',{name:'Add Exam'}).click()
  await page.getByText(/This exam already exists for All Classes/).waitFor({state:'visible',timeout:12000})
  assert.equal(posts.length,2)
  assert.equal(existing.filter(x=>x.name==='Assessment 4').length,1)
  assert.deepEqual(errors,[])
  console.log('MANAGE_EXAMS_REAL_BROWSER_ASSESSMENT_CREATE_409_AND_SESSION_PASS')
 }finally{await browser.close();await vite.close()}
})
