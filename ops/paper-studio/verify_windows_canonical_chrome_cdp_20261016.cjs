'use strict'
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const crypto=require('node:crypto'),assert=require('node:assert/strict')
const {spawn,execFileSync}=require('node:child_process')
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
function deadline(p,ms,code){return Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error(code)),ms))])}
function chromePath(){
  for(const root of [process.env.PROGRAMFILES,process.env['PROGRAMFILES(X86)'],process.env.LOCALAPPDATA]){
    if(root){const file=path.join(root,'Google','Chrome','Application','chrome.exe');if(fs.existsSync(file))return file}
  }
  throw Error('CHROME_NOT_INSTALLED')
}
async function session(port,qaPort) {
  const resp=await deadline(fetch('http://127.0.0.1:'+port+'/json/new?about:blank',{method:'PUT'}),9000,'CDP_NEW_TAB_TIMEOUT')
  if(!resp.ok)throw Error('CDP_TAB_CREATE_FAILED')
  const data=await resp.json(),ws=new WebSocket(data.webSocketDebuggerUrl)
  await deadline(new Promise((ok,no)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',()=>no(Error('CDP_WS_ERROR')),{once:true})}),9000,'CDP_CONNECT_TIMEOUT')
  let serial=0;const pending=new Map()
  const interception={mockedApis:0,blockedExternal:0}
  ws.addEventListener('message',e=>{try{const x=JSON.parse(e.data);
    if(x.method==='Fetch.requestPaused'){
      const requestId=x.params.requestId, url=new URL(x.params.request.url)
      // Match Chromium/Playwright fixture behavior without touching any live auth/API.
      if(url.pathname.startsWith('/api/')){
        interception.mockedApis++
        call('Fetch.fulfillRequest',{requestId,responseCode:200,
          responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],
          body:Buffer.from('{"success":true,"data":{}}').toString('base64')}).catch(()=>{})
      }else if((url.hostname==='127.0.0.1'||url.hostname==='localhost')&&Number(url.port)===qaPort){
        call('Fetch.continueRequest',{requestId}).catch(()=>{})
      }else{
        interception.blockedExternal++
        call('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'}).catch(()=>{})
      }
      return
    }
    if(!pending.has(x.id))return;const k=pending.get(x.id);pending.delete(x.id);clearTimeout(k.timer);x.error?k.no(Error('CDP_METHOD_ERROR_'+k.method.replace(/\W/g,'_').toUpperCase()+'_'+String(x.error.code).replace(/\W/g,'_')+'_'+String(x.error.message||'').replace(/\W/g,'_').slice(0,65).toUpperCase())):k.ok(x.result)}catch(_){}})
  function call(method,params={}){
    return new Promise((ok,no)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);no(Error('CDP_COMMAND_TIMEOUT'))},30000);pending.set(id,{ok,no,timer,method});ws.send(JSON.stringify({id,method,params}))})
  }
  return {call,interception,close:()=>ws.close()}
}
async function checkDocument(call){
  for(let i=0;i<80;i++){
    const response=await call('Runtime.evaluate',{expression:"(()=>{const e=document.querySelector('[data-canonical-working-document]');if(!e)return {ready:false};const c=getComputedStyle(e);return {ready:true,len:e.innerText.length,dir:c.direction,font:c.fontFamily,overflow:e.scrollWidth-e.clientWidth}})()",returnByValue:true})
    const value=response.result&&response.result.value
    if(value&&value.ready&&value.len>200)return value
    await sleep(400)
  }
  throw Error('CANONICAL_DOM_TIMEOUT')
}
async function main(){
  if(process.platform!=='win32')throw Error('WINDOWS_ONLY')
  const vitePort=Number(process.env.ASSPS_PRIVATE_VITE_PORT||5681)
  if(!Number.isInteger(vitePort)||vitePort<1024||vitePort>65535)throw Error('INVALID_QA_PORT')
  const resp=await deadline(fetch('http://127.0.0.1:'+vitePort+'/b3-test.html').catch(()=>{throw Error('QA_HARNESS_UNREACHABLE')}),9000,'QA_HARNESS_UNREACHABLE')
  if(!resp.ok)throw Error('QA_HARNESS_HTTP_ERROR')
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'assps-real-canonical-chrome-'))
  let child
  try {
    child=spawn(chromePath(),['--headless=new','--disable-gpu','--disable-extensions','--no-proxy-server','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'})
    let port
    for(let i=0;i<100;i++){
      const file=path.join(profile,'DevToolsActivePort')
      if(fs.existsSync(file)){port=Number(fs.readFileSync(file,'utf8').split(/\r?\n/)[0]);break}
      if(child.exitCode!=null)throw Error('CHROME_PROCESS_EXITED')
      await sleep(120)
    }
    if(!port)throw Error('CDP_PORT_UNAVAILABLE')
    const result=[];let totalApiMocks=0
    const cases=[
      {id:'doc__official-first-term-2026-class-1-urdu',dir:'rtl',family:'Jameel',pdfFont:/Jameel#20Noori#20Nastaleeq#20Kasheeda/},
      {id:'doc__official-first-term-2026-class-6-urdu',dir:'rtl',family:'Jameel',pdfFont:/Jameel#20Noori#20Nastaleeq#20Kasheeda/},
      {id:'doc__official-first-term-2026-class-8-tarjuma-tul-quran',dir:'rtl',family:'Jameel',pdfFont:/Jameel#20Noori#20Nastaleeq#20Kasheeda/},
      {id:'doc__official-first-term-2026-class-1-english',dir:'ltr',family:'Times New Roman',pdfFont:/TimesNewRoman|Times#20New#20Roman|TimesNewRomanPS/},
      {id:'doc__official-first-term-2026-class-8-english',dir:'ltr',family:'Times New Roman',pdfFont:/TimesNewRoman|Times#20New#20Roman|TimesNewRomanPS/}
    ]
    for(const x of cases){
      const s=await session(port,vitePort)
      try{
        await s.call('Page.enable');await s.call('Runtime.enable');await s.call('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]})
        await s.call('Page.navigate',{url:'http://127.0.0.1:'+vitePort+'/b3-test.html?mode='+encodeURIComponent(x.id)})
        const dom=await checkDocument(s.call)
        // Some canonical previews do not perform API calls after bootstrap.
        // Global network interception remains active for every case.
        assert.equal(dom.dir,x.dir,'PAPER_DIRECTION_MISMATCH')
        assert.ok(dom.font.includes(x.family),'PAPER_CSS_FONT_MISMATCH')
        assert.ok(dom.overflow<=3,'PAPER_HORIZONTAL_OVERFLOW')
        await s.call('Runtime.evaluate',{expression:'document.fonts.ready.then(()=>true)',awaitPromise:true});await s.call('Emulation.setEmulatedMedia',{media:'print'})
        const printScope=await s.call('Runtime.evaluate',{expression:"({page:location.pathname,canonical:!!document.querySelector('[data-canonical-working-document]')})",returnByValue:true})
        assert.equal(printScope.result?.value?.page,'/b3-test.html','QA_REDIRECTED_AWAY_FROM_DOCUMENT')
        assert.ok(printScope.result?.value?.canonical,'QA_CANONICAL_DOCUMENT_REMOVED')
        const printed=await s.call('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,paperWidth:8.27,paperHeight:11.69,transferMode:'ReturnAsBase64'})
        const pdf=Buffer.from(printed.data||'','base64'),t=pdf.toString('latin1')
        assert.ok(pdf.subarray(0,5).toString()==='%PDF-'&&pdf.length>10000,'PDF_INVALID')
        assert.ok(x.pdfFont.test(t),'PDF_EXPECTED_FONT_ABSENT')
        assert.ok(/\/FontFile2\b|\/FontFile3\b/.test(t),'PDF_FONT_NOT_EMBEDDED')
        const m=t.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/)
        assert.ok(m&&Math.abs(Number(m[1])-595)<5&&Math.abs(Number(m[2])-842)<5,'PDF_NOT_A4')
        result.push({paper:x.id,chars:dom.len,dir:dom.dir,pdfBytes:pdf.length,sha256:crypto.createHash('sha256').update(pdf).digest('hex'),fontEmbedded:true,a4:true,mockedApiRequests:s.interception.mockedApis,blockedExternalRequests:s.interception.blockedExternal})
      }finally{totalApiMocks+=s.interception.mockedApis;s.close()}
    }
    assert.ok(totalApiMocks>0,'TEST_API_ISOLATION_INACTIVE')
    return result
  }finally{
    if(child&&child.pid){try{execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:8000,stdio:'ignore'})}catch(_){}}
    try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:400})}catch(_){}
  }
}
main().then(results=>console.log(JSON.stringify({schema:'ASSPS_WINDOWS_CANONICAL_REAL_A4_V1',verdict:'WINDOWS_CANONICAL_PDFS_PASS_NOT_RELEASE',results,releaseAuthorized:false,productionChanged:false,physicalPrinterUsed:false})),e=>{console.log(JSON.stringify({schema:'ASSPS_WINDOWS_CANONICAL_REAL_A4_V1',verdict:'HOLD',errorCode:/^[A-Z0-9_]{4,110}$/.test(e.message||'')?e.message:'QA_CHECK_FAILED',releaseAuthorized:false,productionChanged:false,physicalPrinterUsed:false}));process.exitCode=2})
