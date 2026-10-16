'use strict'
const {spawnSync}=require('node:child_process')
const path=require('node:path')
const cwd=path.resolve(__dirname,'../../al-siddique-frontend')
const file='src/Modules/Paper-Generator/PaperEditor/tests/paperWorkspaceSelectionRegressionV12.test.js'
const out=spawnSync(process.execPath,['--test',file],{
 cwd,timeout:150000,encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env}
})
const output=(out.stdout||'')+(out.stderr||'')
const counters=Object.fromEntries(
 [...output.matchAll(/^# (pass|fail|cancelled|skipped)\s+(\d+)\s*$/gm)]
 .map(m=>[m[1],Number(m[2])]))
if(out.error||out.status!==0||counters.pass!==8||
 counters.fail!==0||counters.cancelled!==0||counters.skipped!==0){
 console.error('PAPER_SELECTION_V12_HOLD',JSON.stringify({exit:out.status,counters,error:out.error?.message}))
 console.error(output.slice(-3100))
 process.exitCode=2
}else console.log('PAPER_SELECTION_V12_8_OF_8_CHROMIUM_PASS')
