'use strict'
const {spawnSync}=require('node:child_process')
const path=require('node:path')
const cwd=path.resolve(__dirname,'../../al-siddique-frontend')
const cases=[
 ['paperSerialStatementCrossFieldBrowser.test.js',3],
 ['unifiedWorkspaceOfficialBrowserAcceptance.test.js',1],
]
for (const [filename,expected] of cases){
 const file='src/Modules/Paper-Generator/PaperEditor/tests/'+filename
 const r=spawnSync(process.execPath,['--test',file],{
  cwd,env:{...process.env},encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024
 })
 const out=(r.stdout||'')+(r.stderr||'')
 const counters=Object.fromEntries([...out.matchAll(/^# (pass|fail|skipped|cancelled)\s+(\d+)\s*$/gm)]
  .map(m=>[m[1],Number(m[2])]))
 if(r.error||r.status!==0||counters.pass!==expected||counters.fail!==0||counters.skipped!==0||counters.cancelled!==0){
  console.error('CROSSFIELD_PHASE3AG_HOLD',filename,JSON.stringify({exit:r.status,counters,error:r.error?.message}))
  console.error(out.slice(-2800));process.exitCode=2;break
 }
 console.log('CROSSFIELD_PHASE3AG_PASS',filename,expected+'/'+expected)
}
