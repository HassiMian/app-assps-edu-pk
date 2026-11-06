import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
import {chromium} from 'playwright'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const chrome='/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const setup={success:true,configured:true,data:{classes:[{name:'Pre Nine',level:'pre-nine',active:true,sections:['Blue']},{name:'Nine',level:'9',active:true,sections:['Fatima','Usman']}],subjects:[],localities:[],sessionStart:'2026-04-01',sessionEnd:'2027-03-31'}}
const preNine=Array.from({length:12},(_,i)=>({id:i+101,class:'Pre Nine',section:'Blue',name:`Pre Nine Student ${i+1}`}))
const nineFatima=Array.from({length:6},(_,i)=>({id:i+201,class:'Nine',section:'Fatima',name:`Nine Fatima Student ${i+1}`}))
const nineUsman=Array.from({length:9},(_,i)=>({id:i+301,class:'Nine',section:'Usman',name:`Nine Usman Student ${i+1}`}))
const reply=(route,status,payload)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)})
async function waitForPreNineRequest(requests){
 for(let i=0;i<120;i++){
  if(requests.some(x=>x.path==='/api/students'&&x.klass==='Pre Nine'&&x.section==='Blue'))return
  await new Promise(resolve=>setTimeout(resolve,40))
 }
 assert.fail('Pre Nine Blue request was not started before grade switch')
}
async function start(t,port,{slowPreNine=false,contaminate=false}={}){
 const vite=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const ctx=await browser.newContext()
 const requests=[]
 await ctx.route('**/api/**',async route=>{
  const url=new URL(route.request().url());const klass=url.searchParams.get('class'),section=url.searchParams.get('section')
  requests.push({path:url.pathname,method:route.request().method(),klass,section})
  if(url.pathname==='/api/academic/setup')return reply(route,200,setup)
  if(url.pathname==='/api/students'){
   if(klass==='Pre Nine'&&slowPreNine)await new Promise(resolve=>setTimeout(resolve,1100))
   const cohort=klass==='Pre Nine'&&section==='Blue'?preNine:klass==='Nine'&&section==='Fatima'?nineFatima:klass==='Nine'&&section==='Usman'?nineUsman:[]
   return reply(route,200,{success:true,data:contaminate&&klass==='Pre Nine'?[...cohort,nineFatima[0]]:cohort})
  }
  if(url.pathname==='/api/attendance'){
   if(klass==='Pre Nine'&&slowPreNine)await new Promise(resolve=>setTimeout(resolve,1100))
   return reply(route,200,{success:true,data:[]})
  }
  return reply(route,200,{success:true,data:[]})
 })
 const page=await ctx.newPage()
 return {page,requests,go:async(mode='mark')=>page.goto(`http://127.0.0.1:${port}/a213-attendance-test.html?mode=${mode}`)}
}
test('actual Mark Attendance shows distinct Pre Nine Blue, Nine Fatima, Nine Usman classes',async t=>{
 const {page,requests,go}=await start(t,5941)
 await go()
 await page.getByRole('combobox').first().selectOption('Pre Nine')
 await page.getByText('Pre Nine Student 1',{exact:true}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Pre Nine Student 12',{exact:true}).count(),1)
 assert.equal(await page.getByText('Nine Fatima Student 1',{exact:true}).count(),0)
 await page.getByRole('combobox').first().selectOption('Nine')
 await page.getByText('Nine Fatima Student 1',{exact:true}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.ok(requests.some(x=>x.path==='/api/students'&&x.klass==='Pre Nine'&&x.section==='Blue'))
 assert.ok(requests.some(x=>x.path==='/api/students'&&x.klass==='Nine'&&x.section==='Fatima'))
 assert.equal(requests.filter(x=>x.method==='POST').length,0)
})
test('late old Pre Nine response cannot replace current Nine Fatima roster',async t=>{
 const {page,go,requests}=await start(t,5942,{slowPreNine:true})
 await go()
 await waitForPreNineRequest(requests)
 await page.getByRole('combobox').first().selectOption('Nine')
 await page.getByText('Nine Fatima Student 1',{exact:true}).waitFor({timeout:20000})
 await page.waitForTimeout(1400)
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.equal(await page.getByText('Nine Fatima Student 6',{exact:true}).count(),1)
})
test('mixed-grade backend roster fails closed in actual Mark Attendance UI',async t=>{
 const {page,go,requests}=await start(t,5943,{contaminate:true})
 await go()
 await page.getByText('roster or grade mismatch',{exact:false}).waitFor({timeout:22000})
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.equal(requests.filter(x=>x.method==='POST').length,0)
})
test('actual main AttendanceModule filters Pre Nine and Nine separately',async t=>{
 const {page,go,requests}=await start(t,5944)
 await go('module')
 await page.getByText('Pre Nine Student 1',{exact:true}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Nine Fatima Student 1',{exact:true}).count(),0)
 await page.getByRole('combobox').first().selectOption('Nine')
 await page.getByText('Nine Fatima Student 1',{exact:true}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.ok(requests.some(x=>x.path==='/api/students'&&x.klass==='Nine'&&x.section==='Fatima'))
})
test('actual main AttendanceModule ignores delayed old Pre Nine roster',async t=>{
 const {page,go,requests}=await start(t,5945,{slowPreNine:true})
 await go('module')
 await waitForPreNineRequest(requests)
 await page.getByRole('combobox').first().selectOption('Nine')
 await page.getByText('Nine Fatima Student 1',{exact:true}).waitFor({timeout:20000})
 await page.waitForTimeout(1400)
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
})
test('actual main AttendanceModule shows Nine Usman nine-person roster without Fatima or Pre Nine',async t=>{
 const {page,go,requests}=await start(t,5946)
 await go('module')
 await page.getByRole('combobox').first().selectOption('Nine')
 await page.getByRole('combobox').nth(1).selectOption('Usman')
 await page.getByText('Nine Usman Student 1',{exact:true}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Nine Usman Student 9',{exact:true}).count(),1)
 assert.equal(await page.getByText('Nine Fatima Student 1',{exact:true}).count(),0)
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.ok(requests.some(x=>x.path==='/api/students'&&x.klass==='Nine'&&x.section==='Usman'))
 assert.equal(requests.filter(x=>x.method==='POST').length,0)
})
test('actual AttendanceModule refuses mixed Pre Nine and Grade Nine API roster',async t=>{
 const {page,go,requests}=await start(t,5947,{contaminate:true})
 await go('module')
 await page.getByText('Attendance roster or grade mismatch',{exact:false}).waitFor({timeout:20000})
 assert.equal(await page.getByText('Pre Nine Student 1',{exact:true}).count(),0)
 assert.equal(requests.filter(x=>x.method==='POST').length,0)
})
test('a wrong-grade API payload cannot be saved from Mark Attendance',async t=>{
 const {page,go,requests}=await start(t,5948,{contaminate:true})
 await go()
 await page.getByText('roster or grade mismatch',{exact:false}).waitFor({timeout:20000})
 const save=page.getByRole('button',{name:'Save Attendance'})
 assert.equal(await save.isDisabled(),true)
 assert.equal(requests.filter(x=>x.path==='/api/attendance/mark').length,0)
})
