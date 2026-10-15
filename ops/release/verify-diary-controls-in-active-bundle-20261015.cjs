#!/usr/bin/env node
'use strict'
// Fail-closed build-to-live-entrypoint chain guard. No production writes.
// Different stale DailyDiaryWorkspace-* bundles can coexist in a retained
// deployment dir: inspect ONLY the chunk actually linked from index.html.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const fail=x=>{throw Error('ASSPS_DIARY_ACTIVE_BUNDLE_REGRESSION_'+x)}
const token=(data,exp,label)=>{
 const v=[...data.matchAll(exp)].map(m=>m[1])
 if(v.length!==1||!/^assets\/[a-zA-Z0-9_.-]+$/.test(v[0]))
  fail('ENTRYPOINT_'+label+'_MISSING_OR_AMBIGUOUS')
 return v[0]
}
function inspect(dist){
 const root=path.resolve(dist||'')
 if(!dist||root==='/'||!fs.statSync(root).isDirectory())fail('INVALID_DIST_ROOT')
 const read=rel=>{
  if(!/^assets\/[A-Za-z0-9_.-]+$/.test(rel))fail('UNSAFE_ASSET_REFERENCE')
  const file=path.join(root,rel)
  let st
  try{st=fs.lstatSync(file)}catch{fail('MISSING_OR_UNTRUSTED_ASSET_'+rel)}
  if(!st.isFile()||st.isSymbolicLink()||st.size<30||st.size>25e6)fail('MISSING_OR_UNTRUSTED_ASSET_'+rel)
  return fs.readFileSync(file)
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
 const index=token(html,/(?:src|href)="\/?(assets\/index-[A-Za-z0-9_-]+\.js)"/g,'INDEX')
 const indexBytes=read(index),entry=indexBytes.toString('utf8')
 const paper=token(entry,/["'](assets\/PaperGenerator-[A-Za-z0-9_-]+\.js)["']/g,'PAPER_ROUTE')
 const paperBytes=read(paper),router=paperBytes.toString('utf8')
 const diary=token(router,/["'](assets\/DailyDiaryWorkspace-[A-Za-z0-9_-]+\.js)["']/g,'DIARY_MODULE')
 const css=token(router,/["'](assets\/DailyDiaryWorkspace-[A-Za-z0-9_-]+\.css)["']/g,'DIARY_CSS')
 const jsBytes=read(diary),styles=read(css)
 const script=jsBytes.toString('utf8')
 // Real teacher-facing labels and state persistence identifiers from the
 // current canonical Diary implementation; do not accept dead stale chunks.
 const controls=[
  ['SUBJECT_BOLD','Subject Bold'],
  ['ROW_HEIGHT','Row Height'],
  ['DIARY_FONT_SIZE','Diary Font Size'],
  ['FOOTER_FONT_SIZE','Footer Font Size'],
  ['LOGO_SIZE','Logo Size'],
  ['PRINT','Print'],
  ['SAVED_LIBRARY','Saved'],
  ['SUBJECT_FONT_SETTING','subjectFontSize'],
  ['ROW_HEIGHT_SETTING','rowHeightMm'],
  ['LOGO_SIZE_SETTING','logoSizeMm'],
  ['FOOTER_SIZE_SETTING','footerFontSize']
 ]
 const missing=controls.filter(([code,needle])=>!script.includes(needle)).map(([code])=>code)
 if(missing.length)fail('MISSING_CONTROLLERS_'+missing.join(','))
 if(styles.length<100||!styles.toString('utf8').includes('diary'))fail('DIARY_CSS_MISSING_OR_WRONG')
 // Ensure dynamic chunk is part of the active JS route chain, not simply a
 // stale orphan in a dist folder from a prior successful release.
 return {schema:'assps-diary-active-entrypoint-nonregression-v1',
  activeEntry:index,activePaperModule:paper,activeDiaryModule:diary,activeDiaryCss:css,
  rootIndexSha256:sha(fs.readFileSync(path.join(root,'index.html'))),
  activeDiaryJsSha256:sha(jsBytes),activeDiaryCssSha256:sha(styles),
  verifiedControllerSignals:controls.map(x=>x[0]),
  activeEntryGraphVerified:true,unreferencedStaleDiaryChunksIgnored:true,
  deploymentPerformed:false,liveStudentDataTouched:false,
  prePromotionDecision:'PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY'}
}
if(require.main===module){
 try{
  const i=process.argv.indexOf('--dist'),root=i<0?null:process.argv[i+1]
  if(!root)fail('MISSING_DIST_ARG')
  console.log(JSON.stringify(inspect(root)))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
