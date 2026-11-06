import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { chromium } from 'playwright'
import { createServer } from 'vite'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..')
const chrome='/root/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const passphrase='strong-private-backup-passphrase'
const original=JSON.stringify({savedPapers:[{id:'original-1',name:'Original Urdu Worksheet',questions:[{text:'Urdu source question'}]},{id:'original-2',name:'Original English Paper'}],paperSettings:{privateConfiguration:'NOT_IN_BACKUP'}})
async function begin(t,port){
 const vite=await createServer({root,server:{host:'127.0.0.1',port,strictPort:true,proxy:{}}})
 await vite.listen()
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox']})
 t.after(async()=>{await browser.close();await vite.close()})
 const context=await browser.newContext({acceptDownloads:true})
 await context.addInitScript(raw=>{localStorage.setItem('al_siddique_paper_store',raw)},original)
 return {context,page:await context.newPage()}
}
const from64=s=>Uint8Array.from(atob(s),ch=>ch.charCodeAt(0))
async function decrypt(encrypted){
 const material=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(passphrase),'PBKDF2',false,['deriveKey'])
 const key=await webcrypto.subtle.deriveKey({name:'PBKDF2',salt:from64(encrypted.saltBase64),iterations:encrypted.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt'])
 const bytes=await webcrypto.subtle.decrypt({name:'AES-GCM',iv:from64(encrypted.ivBase64)},key,from64(encrypted.ciphertextBase64))
 return JSON.parse(new TextDecoder().decode(bytes))
}
test('Principal can inspect original browser papers without exposing titles or touching storage',async t=>{
 const {page}=await begin(t,5921)
 await page.goto('http://127.0.0.1:5921/a211-recovery-test.html')
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByText('Older browser store — local storage',{exact:true}).waitFor()
 assert.equal(await page.getByText('2 papers',{exact:true}).count(),1)
 assert.equal(await page.getByText('Original Urdu Worksheet').count(),0)
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).isDisabled(),true)
 const after=await page.evaluate(()=>localStorage.getItem('al_siddique_paper_store'))
 assert.equal(after,original)
})
test('real Chromium encrypts and downloads only selected legacy papers, not settings or auth details',async t=>{
 const {page}=await begin(t,5922)
 await page.goto('http://127.0.0.1:5922/a211-recovery-test.html')
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByRole('checkbox').check()
 await page.getByRole('textbox',{name:'Backup passphrase (minimum 14 characters)'}).fill(passphrase)
 const pending=page.waitForEvent('download',{timeout:30000})
 await page.getByRole('button',{name:'Download encrypted local backup'}).click()
 const d=await pending
 assert.match(d.suggestedFilename(),/^ASSPS_papers_encrypted_school-1_legacy-local_/)
 const encrypted=JSON.parse(await readFile(await d.path(),'utf8'))
 assert.equal(encrypted.cipher,'AES-256-GCM')
 assert.equal(encrypted.count,2)
 assert.equal(encrypted.serverUploaded,false)
 const clear=await decrypt(encrypted)
 assert.equal(clear.papers.length,2)
 assert.equal(clear.papers[0].questions[0].text,'Urdu source question')
 assert.ok(!JSON.stringify(clear).includes('NOT_IN_BACKUP'))
 assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_paper_store')),original)
 assert.equal(await page.getByRole('textbox',{name:'Backup passphrase (minimum 14 characters)'}).inputValue(),'')
})
test('teacher identity cannot inspect or export Principal legacy papers in isolated guard',async t=>{
 const {page}=await begin(t,5923)
 await page.goto('http://127.0.0.1:5923/a211-recovery-test.html?role=teacher')
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByText('Server-backed school identity could not be verified. Recovery remains locked.').waitFor()
 assert.equal(await page.getByText('2 papers',{exact:true}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).count(),0)
})
test('corrupt legacy browser snapshots report unreadable without writing replacements',async t=>{
 const {page}=await begin(t,5924)
 await page.goto('http://127.0.0.1:5924/a211-recovery-test.html')
 await page.evaluate(()=>localStorage.setItem('al_siddique_paper_store','{broken-original'))
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByText('unreadable-json').waitFor()
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).count(),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_paper_store')),'{broken-original')
})
test('encrypted backup can be checked in-browser without uploading paper contents',async t=>{
 const {page}=await begin(t,5925)
 await page.goto('http://127.0.0.1:5925/a211-recovery-test.html')
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByRole('checkbox').check()
 await page.getByRole('textbox',{name:'Backup passphrase (minimum 14 characters)'}).fill(passphrase)
 const pending=page.waitForEvent('download',{timeout:30000})
 await page.getByRole('button',{name:'Download encrypted local backup'}).click()
 const download=await pending
 await page.locator('#paperVerifyFile').setInputFiles(await download.path())
 await page.locator('#paperVerifyPassphrase').fill(passphrase)
 await page.getByRole('button',{name:'Verify encrypted file locally'}).click()
 await page.getByText('Encrypted local backup verified for 2 original papers',{exact:false}).waitFor({timeout:20000})
 assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_paper_store')),original)
})
test('Principal browser inventory remains locked after server-confirmed school switch',async t=>{
 const {page}=await begin(t,5926)
 await page.goto('http://127.0.0.1:5926/a211-recovery-test.html?verifiedSchool=2')
 await page.getByRole('button',{name:'Inspect this browser only'}).click()
 await page.getByText('Server-backed school identity could not be verified. Recovery remains locked.').waitFor({timeout:12000})
 assert.equal(await page.getByText('2 papers',{exact:true}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Download encrypted local backup'}).count(),0)
 assert.equal(await page.evaluate(()=>localStorage.getItem('al_siddique_paper_store')),original)
})
