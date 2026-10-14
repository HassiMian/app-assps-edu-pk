'use strict'
const fs=require('fs'),assert=require('node:assert/strict'),http=require('http')
const {chromium}=require('/root/workspace/assps-core-marks-entry-scope-guard-20261010/al-siddique-frontend/node_modules/playwright')
const html=fs.readFileSync('/root/workspace/assps-core-regular-timetable-20261014/ops/release/timetable/regular-view.html','utf8')
const data=JSON.parse(fs.readFileSync('/tmp/assps-timetable-fixture-20261014.json','utf8'))
const srv=http.createServer((req,res)=>{
 if(req.url==='/timetable/regular'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return}
 if(req.url==='/api/timetable/reference'){
  if(req.headers.authorization!=='Bearer synthetic-ui-token'){res.writeHead(401,{'Content-Type':'application/json'});res.end('{}');return}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:true,data}));return
 }
 res.writeHead(404);res.end()
})
;(async()=>{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve))
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
 try{
  const page=await browser.newPage()
  const url='http://127.0.0.1:'+srv.address().port+'/timetable/regular'
  await page.goto(url)
  await page.locator('#error').waitFor()
  assert.match(await page.locator('#error').innerText(),/sign in/i)
  await page.evaluate(()=>localStorage.setItem('al_siddique_token','synthetic-ui-token'))
  await page.reload()
  await page.locator('.card').first().waitFor()
  assert.equal(await page.locator('.card').count(),5)
  assert.equal(await page.locator('tbody tr.breakrow').count(),5)
  assert.equal(await page.locator('.card tbody tr').count(),45)
  assert.equal(await page.locator('.bell.break').count(),1)
  assert.match(await page.locator('#conflict').innerText(),/Miss Isma.*Four and Six.*Period 3/i)
  const sixth=await page.locator('.card').first().locator('tbody tr').nth(5).innerText()
  const br=await page.locator('.card').first().locator('tbody tr').nth(6).innerText()
  const seventh=await page.locator('.card').first().locator('tbody tr').nth(7).innerText()
  assert.match(sixth,/Period 6/)
  assert.match(br,/11:50 AM/)
  assert.match(seventh,/Period 7/)
  await page.evaluate(()=>{window.__printInvocations=0;window.print=()=>window.__printInvocations++})
  await page.locator('#print').click()
  assert.equal(await page.evaluate(()=>window.__printInvocations),1)
  console.log(JSON.stringify({status:'PASS_SYNTHETIC_AUTH_BROWSER_PRINT_LAYOUT',classCount:5,lectures:40,schoolBellEntries:2,breakPlacement:'after sixth',printWindowInvocation:1}))
 }finally{await browser.close();await new Promise(resolve=>srv.close(resolve))}
})().catch(e=>{console.error(e.stack);process.exitCode=2})
