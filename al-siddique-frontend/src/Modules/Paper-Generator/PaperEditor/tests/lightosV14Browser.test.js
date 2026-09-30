
import {test,before,after,beforeEach} from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../../..')
const port=5233
let server,browser,context,page
const executablePath=[
 'C:/Program Files/Google/Chrome/Application/chrome.exe',
 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
 (process.env.LOCALAPPDATA||'')+'/Google/Chrome/Application/chrome.exe'
].find(fs.existsSync)
const newest=new Date().toISOString()
const notifications=[
 {id:150,title:'Presidential Dispatch',message:'Old January dispatch',sent_at:'2026-01-01T09:00:00Z',read_at:'2026-09-30T13:00:00Z'},
 {id:151,title:'New attendance update',message:'Recent recorded school event',sent_at:newest,read_at:null}
]
before(async()=>{
 server=await createServer({root,server:{port,strictPort:true}})
 await server.listen()
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']})
 context=await browser.newContext({viewport:{width:1550,height:950}})
 await context.addInitScript(()=>{
   localStorage.setItem('al_siddique_theme','light')
   localStorage.setItem('al_siddique_token','local_1_fixture')
   localStorage.setItem('al_siddique_user',JSON.stringify({id:1,role:'principal',school_id:1,name:'School Principal',designation:'Principal'}))
   localStorage.setItem('al_siddique_login_at',String(Date.now()))
 })
 await context.route('**/api/notify/inbox*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:notifications})}))
 await context.route('**/api/notify/read-all*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true})}))
 await context.route('**/api/school/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',logoUrl:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect width=%2240%22 height=%2240%22 fill=%22%23102944%22/%3E%3Ctext x=%2220%22 y=%2226%22 text-anchor=%22middle%22 font-size=%2214%22 fill=%22white%22%3EAS%3C/text%3E%3C/svg%3E'}})}))
 await context.route('**/api/settings/public*',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 await context.route('**/api/students*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:[],students:[]})}))
 await context.route('**/api/settings*',route=>route.fulfill({status:200,contentType:'application/json',body:'{}'}))
 page=await context.newPage()
})
beforeEach(async()=>{
 await page.goto('about:blank')
 await page.goto('http://localhost:'+port+'/lightos-v14-test.html',{waitUntil:'domcontentloaded'})
 await page.locator('[data-os-saved-papers="v14"]').waitFor({state:'visible',timeout:15000})
 await page.waitForTimeout(400)
})
after(async()=>{await context?.close();await browser?.close();await server?.close()})
const rgb=s=>[...String(s).matchAll(/[0-9.]+/g)].map(x=>Number(x[0])).slice(0,3)
function contrast(a,b){
 const lum=arr=>arr.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
 const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}

test('V14-01: light sidebar active+hover icons remain legible and school logo has no duplicate tile shadows',async()=>{
 const aside=page.locator('aside.super-sidebar')
 await aside.hover()
 const active=page.locator('a.os-sidebar-link[href="/paper-generator"]')
 await active.waitFor({state:'visible'})
 const logo=page.locator('.os-sidebar-school-logo')
 const tiles=page.locator('.os-sidebar-icon-tile')
 assert.ok(await tiles.count()>5)
 assert.equal(await logo.count(),1,'Only the actual school logo may receive the brand tile style')
 const logoStyles=await logo.evaluate(el=>({shadow:getComputedStyle(el).boxShadow,background:getComputedStyle(el).backgroundColor}))
 assert.equal(logoStyles.shadow,'none','Light logo should be clear, without the old bright shadow')
 await active.hover()
 const selected=await active.evaluate(el=>{
  const icon=el.querySelector('svg'),s=getComputedStyle(el)
  return {bg:s.backgroundColor,color:s.color,stroke:getComputedStyle(icon).stroke}
 })
 assert.ok(contrast(selected.color,selected.bg)>=4.5,'Selected text contrast: '+JSON.stringify(selected))
 assert.ok(contrast(selected.stroke,selected.bg)>=3,'Selected icon contrast: '+JSON.stringify(selected))
 const dashboard=page.locator('a.os-sidebar-link[href="/dashboard"]')
 await dashboard.hover()
 const hover=await dashboard.evaluate(el=>{
  const icon=el.querySelector('svg'),s=getComputedStyle(el)
  return {bg:s.backgroundColor,color:s.color,stroke:getComputedStyle(icon).stroke,hovered:el.matches(':hover'),background:s.background,hoverVariable:s.getPropertyValue('--os-sidebar-hover'),element:document.elementFromPoint(el.getBoundingClientRect().x+15,el.getBoundingClientRect().y+15)?.tagName}
 })
 assert.ok(contrast(hover.color,hover.bg)>=4.5,'Hover text contrast: '+JSON.stringify(hover))
 assert.ok(contrast(hover.stroke,hover.bg)>=3,'Hover icon contrast: '+JSON.stringify(hover))
 assert.notEqual(hover.stroke,hover.bg)
})
test('V14-02: dark/light switch does not hide active sidebar or bell glyph',async()=>{
 const aside=page.locator('aside.super-sidebar');await aside.hover()
 const toggle=page.locator('.os-theme-trigger')
 await toggle.click()
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark')
 const active=page.locator('a.os-sidebar-link[href="/paper-generator"]')
 await active.hover()
 const dark=await active.evaluate(el=>({bg:getComputedStyle(el).backgroundColor,fg:getComputedStyle(el).color,stroke:getComputedStyle(el.querySelector('svg')).stroke}))
 assert.ok(contrast(dark.fg,dark.bg)>=4.5,'Dark active contrast: '+JSON.stringify(dark))
 assert.ok(contrast(dark.stroke,dark.bg)>=3)
 const bell=page.locator('.os-notif-trigger svg')
 const darkBell=await bell.evaluate(el=>getComputedStyle(el).stroke)
 assert.ok(darkBell&&darkBell!=='none')
 await toggle.click()
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='light')
 const lightBell=await bell.evaluate(el=>getComputedStyle(el).stroke)
 assert.notEqual(lightBell,'rgb(248, 250, 252)','Bell must not be white-on-white in light mode')
})
test('V14-03: Saved Papers stats are neutral, every action is named and storage actions are scoped',async()=>{
 assert.equal(await page.locator('[data-os-paper-card]').count(),4)
 const card=page.locator('[data-os-paper-card]').first()
 const colors=await card.locator('.os-paper-stat strong').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).color))
 assert.equal(colors[0],colors[1])
 assert.equal(colors[1],colors[2])
 assert.notEqual(colors[2],colors[3],'Only marks have subtle gold emphasis')
 assert.equal(await card.getByRole('button',{name:'Rename'}).count(),1)
 assert.equal(await card.getByRole('button',{name:'Delete'}).count(),1)
 await card.getByRole('button',{name:'Load & Preview'}).click()
 assert.deepEqual(await page.evaluate(()=>window.__v14LoadAction),{paperId:'p1',mode:'preview'})
 await card.getByRole('button',{name:'Open / Edit'}).click()
 assert.deepEqual(await page.evaluate(()=>window.__v14LoadAction),{paperId:'p1',mode:'build'})
 await card.getByRole('button',{name:'Rename'}).click()
 await card.getByRole('textbox',{name:'Rename paper'}).fill('Renamed Urdu test paper')
 await card.getByRole('button',{name:'Save paper name'}).click()
 assert.match(await card.locator('h2.os-saved-title').textContent(),/Renamed Urdu/)
 await card.getByRole('button',{name:'Delete'}).click()
 const dialog=page.getByRole('alertdialog')
 await dialog.waitFor()
 await dialog.getByRole('button',{name:'Cancel'}).click()
 assert.equal(await page.locator('[data-os-paper-card]').count(),4,'Cancel cannot delete or mutate source papers')
})

test('V14-04: recent Bell excludes historical Dispatch; hide survives refresh; Archive retains old event',async()=>{
 const bell=page.locator('.os-notif-trigger')
 await bell.click()
 const popover=page.locator('.os-notif-popover')
 await popover.waitFor({state:'visible'})
 await page.getByText('New attendance update',{exact:true}).waitFor({state:'visible'})
 assert.equal(await popover.getByText('Presidential Dispatch').count(),0,'Old record must not masquerade as a new alert')
 const freshRow=popover.locator('.os-notif-row').filter({hasText:'New attendance update'})
 await freshRow.locator('button').click()
 await page.waitForTimeout(90)
 assert.equal(await popover.getByText('New attendance update').count(),0)
 await page.reload({waitUntil:'domcontentloaded'})
 await page.locator('[data-os-saved-papers]').waitFor()
 await page.locator('.os-notif-trigger').click()
 const freshAgain=page.locator('.os-notif-popover')
 await freshAgain.getByText('No recent notifications',{exact:false}).waitFor()
 assert.equal(await freshAgain.getByText('Presidential Dispatch').count(),0)
 await freshAgain.getByRole('button',{name:'View Inbox & History'}).click()
 await page.locator('[data-os-inbox="v14"]').waitFor()
 await page.getByRole('tab',{name:'History'}).click()
 await page.getByText('Presidential Dispatch',{exact:true}).waitFor()
 assert.equal(await page.locator('.os-inbox-item').count(),1)
})
test('V14-05: mobile Saved Papers grid never overflows the viewport',async()=>{
 await page.setViewportSize({width:390,height:830})
 await page.waitForTimeout(240)
 const metrics=await page.locator('.os-saved-papers').evaluate(el=>{
   const card=el.querySelector('.os-saved-card')
   return {viewport:document.documentElement.clientWidth,bodyScroll:document.body.scrollWidth,grid:el.querySelector('.os-saved-grid').scrollWidth,container:el.clientWidth,card:card?.getBoundingClientRect().width}
 })
 assert.ok(metrics.bodyScroll<=metrics.viewport+3,JSON.stringify(metrics))
 assert.ok(metrics.grid<=metrics.container+3,JSON.stringify(metrics))
 assert.ok(metrics.card>=260,JSON.stringify(metrics))
})
