'use strict'
const {spawnSync}=require('node:child_process')
const path=require('node:path')
const cwd=path.resolve(__dirname,'../../al-siddique-frontend')
const cases=[
 ['paperWorkspaceSelectionRegressionV12.test.js',8],
 ['paperWorkspaceUrduVisualV13.test.js',5],
]
let passed=0
for(const [name,expected] of cases){
const file='src/Modules/Paper-Generator/PaperEditor/tests/'+name
const out=spawnSync(process.execPath,['--test',file],{
 cwd,timeout:150000,encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env}
})
const output=(out.stdout||'')+(out.stderr||'')
const counters=Object.fromEntries(
 [...output.matchAll(/^# (pass|fail|cancelled|skipped)\s+(\d+)\s*$/gm)]
 .map(m=>[m[1],Number(m[2])]))
if(out.error||out.status!==0||counters.pass!==expected||
 counters.fail!==0||counters.cancelled!==0||counters.skipped!==0){
 console.error('PAPER_SELECTION_BASELINE_HOLD',name,JSON.stringify({exit:out.status,counters,error:out.error?.message}))
 console.error(output.slice(-3100))
 process.exitCode=2
 break
}else{passed+=expected;console.log('PAPER_SELECTION_BASELINE_PASS',name,expected+'/'+expected)}
}
if(passed===13&&process.exitCode!==2)console.log('PAPER_SELECTION_V12_V13_13_OF_13_CHROMIUM_PASS')
