import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname2 = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'http://127.0.0.1:4178'
const JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBhbHNpZGRpcXVlLmVkdS5wayIsInJvbGUiOiJhZG1pbiIsInNjaG9vbF9pZCI6MSwiaWF0IjoxNzkwMDgxOTM4LCJleHAiOjE3OTA2ODY3Mzh9.9VK-Auc9f7l58DdjETdot-SJxEUwDoPBm3Xs2OOYrl4'
const USER = JSON.stringify({id:1,school_id:1,name:'Haseeb',email:'admin@alsiddique.edu.pk',role:'admin'})
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(c=>fs.existsSync(c))
const b = await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
const ctx = await b.newContext({viewport:{width:1440,height:900},storageState:{cookies:[],origins:[{origin:BASE_URL,localStorage:[{name:'al_siddique_token',value:JWT},{name:'al_siddique_login_at',value:String(Date.now())},{name:'al_siddique_user',value:USER}]}]}})
const page = await ctx.newPage()
page.on('console', m => { if(m.type()==='error') console.log('[ERR]',m.text()) })
await page.goto(BASE_URL, {waitUntil:'networkidle',timeout:25000})
console.log('URL:', page.url())
await page.waitForTimeout(4000)
console.log('URL after 4s:', page.url())
const allTids = await page.evaluate(()=>[...document.querySelectorAll('[data-testid]')].map(e=>e.getAttribute('data-testid')))
console.log('testids:', JSON.stringify(allTids))
const ls = await page.evaluate(()=>Object.fromEntries([...Array(localStorage.length)].map((_,i)=>[localStorage.key(i), localStorage.getItem(localStorage.key(i)).substring(0,50)])))
console.log('localStorage:', JSON.stringify(Object.keys(ls)))
const tok = await page.evaluate(()=>localStorage.getItem('al_siddique_token'))
console.log('token found:', !!tok, 'length:', tok ? tok.length : 0)
const ss = __dirname2 + '/debug-screenshot.png'
await page.screenshot({path:ss,fullPage:false})
console.log('screenshot:', ss)
const hasUnmarked = await page.locator('[data-testid='+'"'+'unmarked-stat-cell'+'"'+']').count()
console.log('unmarked-stat-cell count:', hasUnmarked)
if (!hasUnmarked) {
  const domSnip = await page.evaluate(()=>document.body.innerHTML.substring(0,3000))
  console.log('DOM:', domSnip)
}
await b.close()
