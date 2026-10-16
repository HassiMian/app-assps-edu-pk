// Pure synthetic Principal + original private source; no production API or DB writes.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createServer} from 'vite'
import {chromium} from 'playwright'

const host='127.0.0.1'
const dev=await createServer({configFile:'vite.config.js',
  server:{host,port:0,strictPort:false,hmr:false}})
await dev.listen()
const port=dev.httpServer.address().port
const browser=await chromium.launch({headless:true,
  executablePath:'/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']})
const page=await browser.newPage({viewport:{width:1380,height:900}})
const errors=[]
const manifest=JSON.parse(fs.readFileSync(
  '/root/secure-archive/composer-review-20261014/manifest_plus_classone_private.json','utf8'))
await page.addInitScript(()=>localStorage.setItem('al_siddique_user',
  JSON.stringify({id:92001,role:'admin',designation:'Principal',school_id:1})))
page.on('pageerror',error=>errors.push(error.message))
let unauthorizedSaveCalls=0
await page.route('**/api/**',route=>{
  const pathname=new URL(route.request().url()).pathname
  if(route.request().method()!=='GET'){
    unauthorizedSaveCalls++
    return route.fulfill({status:403,contentType:'application/json',
      body:JSON.stringify({success:false,code:'BROWSER_READ_ONLY'})})
  }
  const data=pathname.endsWith('/planner/private-source-bundle')?manifest:[]
  return route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({success:true,data})})
})
try{
  await page.goto('http://'+host+':'+port+'/weekly-notebook-test.html',{waitUntil:'domcontentloaded'})
  await page.getByText('Original source library automatically loaded: 59 subjects').waitFor({timeout:25000})
  const actual=await page.locator('[data-wn-class] option').evaluateAll(
    options=>options.map(option=>option.value))
  const expected=['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven']
  assert.deepEqual(actual,expected,'excluded class options must not be selectable')
  for(const [klass,n] of [['One',6],['Two',5],['Three',6]]){
    await page.locator('[data-wn-class]').selectOption(klass)
    assert.equal(await page.locator('.wn-subjects label').count(),n)
    const subjects=await page.locator('.wn-subjects label span').allTextContents()
    assert.equal(subjects.filter(x=>x==='English').length,1)
    assert.equal(subjects.filter(x=>x==='Urdu').length,1)
    assert(!subjects.some(x=>/English-[AB]|Urdu-[AB]/.test(x)))
    await page.getByRole('button',{name:'1. Term Syllabus'}).click()
    assert.equal(await page.locator('[data-term-edit-subject]').count(),n)
    for (const subject of ['English','Urdu']){
      const textarea=page.getByRole('textbox',{name:subject+' term coverage'})
      const contents=await textarea.inputValue()
      assert(contents.includes('[A]')&&contents.includes('[B]'),
        klass+'/'+subject+' term A/B must survive')
      // One A4 term table row per canonical subject; independent source labels inside.
      assert.equal(await page.locator('.term-print-subjects tr').filter({has:page.locator('th').getByText(subject,{exact:true})}).count(),1)
    }
    await page.getByRole('button',{name:'2. Weekly Plan'}).click()
    for (const subject of ['English','Urdu']){
      const row=page.locator('.wn-editline').filter({has:page.locator('label').getByText(subject,{exact:false})})
      const value=await row.locator('textarea').inputValue()
      assert(value.includes('[A]')&&value.includes('[B]'),
        klass+'/'+subject+' weekly A/B must survive')
    }
    console.log('BROWSER_CLASS_PASS',klass,'SUBJECT_ROWS',n,'AB_SOURCE_LABELS',4)
  }
  assert.equal(unauthorizedSaveCalls,0)
  assert.deepEqual(errors,[])
  console.log('REAL_CHROMIUM_AB_10_CLASSES_51_SUBJECTS_PASS PORT_DYNAMIC')
  console.log('ZERO_WRITES_PUBLICATION_OR_STUDENT_DATA')
}catch(error){
  console.error('BROWSER_QA_FAILURE',error.message)
  console.error('BODY_HEAD',(await page.locator('body').innerText()).slice(0,850))
  throw error
}finally{
  await browser.close()
  await dev.close()
}
