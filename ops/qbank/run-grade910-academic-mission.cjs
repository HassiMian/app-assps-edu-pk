#!/usr/bin/env node
'use strict'
// Single explicit, synchronous, non-scheduled and non-deploying source/QA mission.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os')
const ROOT=path.resolve(__dirname,'../..')
const ACADEMIC=path.join(ROOT,'ops/tests')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const EVIDENCE=process.env.ASSPS_GRADE910_EVIDENCE_DIR||path.join(os.tmpdir(),'assps-grade910-one-mission-evidence')
function partition(files,n){
 const groups=Array.from({length:n},()=>[])
 files.forEach((file,i)=>groups[i%n].push(file))
 return groups.filter(x=>x.length)
}
function plan(){
 const academic=fs.readdirSync(ACADEMIC).filter(x=>/^grade910-.*\.test\.cjs$/.test(x)).sort().map(x=>path.relative(ROOT,path.join(ACADEMIC,x)))
 const paper=fs.readdirSync(STAGING).filter(x=>/\.test\.mjs$/.test(x)).sort().map(x=>path.relative(ROOT,path.join(STAGING,x)))
 if(academic.length<39||paper.length!==111)throw Error('ACADEMIC_MISSION_SUITE_INVENTORY_DRIFT')
 return {academicSourceFiles:academic.length,stagingTestFiles:paper.length,
  batches:[...partition(paper,3).map((files,i)=>({id:'staging-'+(i+1),files})),
   ...partition(academic,8).map((files,i)=>({id:'academic-'+(i+1),files}))],
  productionDeployment:false,publisherSelectable:false}
}
function tap(text){
 const lines=text.trim().split(/\r?\n/)
 function count(label){
  const l=lines.filter(x=>x.startsWith('# '+label+' '))
  return l.length===1?Number(l[0].slice(('# '+label+' ').length)):null
 }
 return {tests:count('tests'),pass:count('pass'),fail:count('fail'),skipped:count('skipped'),
  completeFooter:lines.some(x=>/^1\.\.\d+$/.test(x))}
}
function execute(){
 const x=plan()
 fs.mkdirSync(EVIDENCE,{recursive:true,mode:0o700})
 const outcome={schemaVersion:'assps-grade910-one-invocation-no-schedule-qa-v1',
  startedAt:new Date().toISOString(),academicTestFiles:x.academicSourceFiles,
  stagingTestFiles:x.stagingTestFiles,batches:[],publication:'HOLD',deployment:false}
 let failed=false
 const bins=[{id:'frozen-current-source-prepublication',exec:process.execPath,
   argv:['ops/qbank/attest-grade910-prepublication-gates.cjs','--write'],maxMs:240000},
   {id:'frozen-current-original-faculty-worklist',exec:process.execPath,
    argv:['ops/qbank/build-grade910-authoritative-faculty-intake.cjs','--write'],maxMs:240000}]
 for(const batch of [...bins,...x.batches]){
  const args=batch.argv||['--test','--test-concurrency=4',...batch.files]
  const p=cp.spawnSync(batch.exec||process.execPath,args,{cwd:ROOT,timeout:batch.maxMs||300000,encoding:'utf8',maxBuffer:32*1024*1024})
  const output=(p.stdout||'')+(p.stderr||'')
  const ev=path.join(EVIDENCE,batch.id+'.log')
  fs.writeFileSync(ev,output)
  const counts=batch.files?tap(output):null
  const passed=p.status===0&&!p.error&&(!counts||(counts.completeFooter&&counts.tests!==null&&counts.fail===0&&counts.skipped===0&&counts.tests===counts.pass))
  outcome.batches.push({name:batch.id,sourceFiles:batch.files?.length??null,
   exit:p.status,signal:p.signal||null,error:p.error?.message||null,
   completeTap:counts?.completeFooter||false,
   tests:counts?.tests??null,passed:counts?.pass??null,failed:counts?.fail??null,skipped:counts?.skipped??null,
   passedGate:Boolean(passed),evidenceLog:ev})
  fs.writeFileSync(path.join(EVIDENCE,'mission-audit.json'),JSON.stringify(outcome,null,2)+'\n')
  if(!passed){failed=true;break}
 }
 outcome.endedAt=new Date().toISOString()
 outcome.allSourceTestsCompleted=outcome.batches.length===x.batches.length+bins.length
 outcome.qualityGatesPassed=!failed&&outcome.allSourceTestsCompleted
 outcome.academicallyApproved=0;outcome.verifiedPublished=0
 outcome.releaseDecision='BLOCK_PUBLICATION_PENDING_AUTHENTICATED_SCHOOL_ADOPTION_AND_HUMAN_REVIEW'
 fs.writeFileSync(path.join(EVIDENCE,'mission-audit.json'),JSON.stringify(outcome,null,2)+'\n')
 return {success:outcome.qualityGatesPassed,evidenceDir:EVIDENCE,
  checks:outcome.batches.length,examPaperPublisherSelectable:false}
}
if(require.main===module){
 try{
  if(process.argv.includes('--plan'))console.log(JSON.stringify(plan(),null,2))
  else {const r=execute();console.log(JSON.stringify(r));if(!r.success)process.exitCode=1}
 }catch(e){console.error('ACADEMIC_MISSION_FAIL_CLOSED',e.message);process.exitCode=1}
}
module.exports={plan,partition,tap,execute}
