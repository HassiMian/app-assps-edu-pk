'use strict'
// Four isolated Chromium flows: Diary screen/print CSS, authenticated
// save->reopen scope, stale asynchronous save, and revisit PUT identity. No live server,
// teacher credentials, database changes or real printer job.
const {spawnSync}=require('node:child_process')
const path=require('node:path')
const root=path.resolve(__dirname,'../../al-siddique-frontend')
const tests=[
 ['Diary print-layout and controller acceptance','dailyDiaryWorkspaceBrowserAcceptance.test.js',1],
 ['Diary Save-Reopen/foreign-tenant negative acceptance','dailyDiaryExplicitReopenBrowser.test.js',2],
 ['Late Diary save selection race','dailyDiarySaveStatusRaceBrowser.test.js',1],
 ['Diary revisited class/section/date preserves prior ID','dailyDiaryRevisitScopeBrowser.test.js',1],
]
let passed=0
for(const [label,file,expected] of tests){
 const rel='src/Modules/Paper-Generator/PaperEditor/tests/'+file
 const proc=spawnSync(process.execPath,['--test',rel],{
  cwd:root,encoding:'utf8',timeout:150000,maxBuffer:5*1024*1024,
  env:{...process.env},
 })
 const output=(proc.stdout||'')+(proc.stderr||'')
 const counts=Object.fromEntries(
  [...output.matchAll(/^# (pass|fail|skipped|cancelled)\s+(\d+)\s*$/gm)]
   .map(m=>[m[1],Number(m[2])])
 )
 if(proc.error||proc.status!==0||counts.pass!==expected||
     counts.fail!==0||counts.skipped!==0||counts.cancelled!==0){
  console.error('DIARY_BROWSER_RELEASE_HOLD',label,'exit=',proc.status,
   'counts=',JSON.stringify(counts),'error=',proc.error?.message||'')
  console.error(output.slice(-2500))
  process.exitCode=2
  break
 }
 passed+=expected
 console.log('DIARY_BROWSER_PASS',label,expected+'/'+expected)
}
if(passed===5&&process.exitCode!==2){
 console.log('ASSPS_DIARY_SAVE_REOPEN_PRINT_CHROMIUM 5/5 PASS (synthetic server, no hardware jobs)')
}
