import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright'
import {createServer} from 'vite'
const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename)
const frontendRoot=path.resolve(__dirname,'../../../../..')
const PORT=5198,BASE=`http://127.0.0.1:${PORT}/b3-test.html`
let server,browser,context,page
before(async()=>{server=await createServer({root:frontendRoot,server:{port:PORT,strictPort:true}});await server.listen();browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-setuid-sandbox']});context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}});page=await context.newPage()})
after(async()=>{await browser?.close();await server?.close()})
function inspectDocx(file){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g20-browser-docx-'));const copy=path.join(dir,'paper.docx');fs.copyFileSync(file,copy);try{return execFileSync('unzip',['-p',copy,'word/document.xml'],{encoding:'utf8',maxBuffer:25*1024*1024})}finally{fs.rmSync(dir,{recursive:true,force:true})}}
async function downloadFor(buttonId){await page.goto(BASE,{waitUntil:'networkidle'});await page.click(buttonId);await page.waitForSelector('.canonical-paper-editor-container',{timeout:10000});await page.waitForSelector('#canonical-docx-btn',{timeout:5000});const p=page.waitForEvent('download');await page.click('#canonical-docx-btn');const d=await p;const file=await d.path();assert.ok(file&&fs.existsSync(file));assert.match(d.suggestedFilename(),/\.docx$/i);assert.ok(fs.statSync(file).size>5000);return inspectDocx(file)}
test('G20 browser downloads canonical English DOCX from canonical editor',async()=>{const xml=await downloadFor('#btn-load-canonical-english');assert.match(xml,/<w:document/);assert.match(xml,/<w:tbl/);assert.ok(xml.includes('English'));console.log('G20_DOCX_BROWSER English PASS')})
test('G20 browser downloads canonical Urdu DOCX with RTL OOXML',async()=>{const xml=await downloadFor('#btn-load-canonical-urdu');assert.match(xml,/<w:document/);assert.match(xml,/<w:bidi\/?/);assert.match(xml,/[؀-ۿ]/);console.log('G20_DOCX_BROWSER Urdu RTL PASS')})
