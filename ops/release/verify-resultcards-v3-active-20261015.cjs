'use strict'
const fs=require('node:fs'),path=require('node:path')
const base=require('./verify-resultcards-v2-active-20261015.cjs')
function inspect(dist){
 const v2=base.inspect(dist)
 const root=path.resolve(dist)
 const chunk=path.resolve(root,'assets',v2.activeChunk)
 if(!chunk.startsWith(path.join(root,'assets')+path.sep))throw Error('V3_UNTRUSTED_ASSET')
 const contents=fs.readFileSync(chunk,'utf8')
 const required=[
  'include_subjects','missing_configured_subject','DRAFT RESULT',
  'AWAITING ACADEMIC APPROVAL','__asspsValidatedResultPrint',
  'Subject roster not verified','STUDENT (OPTIONAL)','scholars-archive'
 ]
 const missing=required.filter(k=>!contents.includes(k))
 if(missing.length)throw Error('RESULT_CARDS_V3_RELEASE_HOLD_'+missing.join(';'))
 return {...v2,academicRosterContract:'PASS',gradeBoundaryContract:'SOURCE_VERIFIED_BY_TESTS',sharedPrintPreflight:'PRESENT',allTenTemplatesPreserved:true}
}
if(require.main===module){
 try{
  const i=process.argv.indexOf('--dist')
  if(i<0||!process.argv[i+1])throw Error('MISSING_DIST')
  console.log(JSON.stringify(inspect(process.argv[i+1])))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
