#!/usr/bin/env node
'use strict'
// Offline artifact rehearsal only. NEVER switches actual Nginx/PM2/live symlinks.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto')
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex')
const reject=reason=>{throw Error('ASSPS_SELECTOR_ROLLBACK_'+reason)}
function verifyBuild(dir){
 const html=path.join(dir,'index.html')
 if(!fs.existsSync(html))reject('NO_INDEX')
 const contents=fs.readFileSync(html,'utf8')
 const names=[...contents.matchAll(/(?:src|href)="\/?(assets\/[^"]+)"/g)].map(x=>x[1])
 if(names.length<1)reject('MISSING_REFERENCED_ASSET')
 const files=names.map(f=>path.join(dir,f))
 if(files.some(f=>!fs.existsSync(f)||!fs.statSync(f).isFile()))reject('MISSING_ASSET_FILE')
 return {indexSha256:hash(Buffer.from(contents)),assets:files.map(f=>({
  name:path.relative(dir,f),sha256:hash(fs.readFileSync(f))}))}
}
function atomicPoint(root,dir){
 const staging=path.join(root,'.next-qa-pointer')
 try{fs.unlinkSync(staging)}catch(e){if(e.code!=='ENOENT')throw e}
 fs.symlinkSync(dir,staging)
 fs.renameSync(staging,path.join(root,'active'))
}
function rehearse(options={}){
 const baseline=path.resolve(options.baseline||'')
 const candidate=path.resolve(options.candidate||'')
 if(baseline===candidate)reject('NO_BASELINE_DIFFERENCE')
 const before=verifyBuild(baseline),after=verifyBuild(candidate)
 if(before.indexSha256===after.indexSha256)reject('CANDIDATE_EQUALS_BASELINE')
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-grade910-selector-rollback-'))
 fs.chmodSync(root,0o700)
 try{
  const old=path.join(root,'old'),next=path.join(root,'next')
  fs.cpSync(baseline,old,{recursive:true});fs.cpSync(candidate,next,{recursive:true})
  if(verifyBuild(old).indexSha256!==before.indexSha256||verifyBuild(next).indexSha256!==after.indexSha256)
    reject('STAGED_ARTIFACT_HASH_MISMATCH')
  // Atomic entry-point switch, no work on the public deployment path.
  atomicPoint(root,old)
  if(verifyBuild(path.join(root,'active')).indexSha256!==before.indexSha256)reject('BASELINE_POINTER_INVALID')
  atomicPoint(root,next)
  if(verifyBuild(path.join(root,'active')).indexSha256!==after.indexSha256)reject('CANDIDATE_SWITCH_FAILED')
  atomicPoint(root,old)
  if(verifyBuild(path.join(root,'active')).indexSha256!==before.indexSha256)
    reject('ROLLBACK_ASSET_PARITY_FAILED')
  return {mode:'PRIVATE_OFFLINE_ARTIFACT_REHEARSAL',
   baselineIndexSha256:before.indexSha256,candidateIndexSha256:after.indexSha256,
   baselineReferencedAssets:before.assets.length,candidateReferencedAssets:after.assets.length,
   atomicCandidateSwitchPassed:true,atomicRollbackPassed:true,
   exactBaselineBytesRestored:true,productionTouched:false,
   genuineAuthenticatedLiveCutoverCertified:false}
 }finally{fs.rmSync(root,{recursive:true,force:true})}
}
if(require.main===module){
 try{
  const r=rehearse({baseline:process.argv[2],candidate:process.argv[3]})
  console.log(JSON.stringify(r,null,2))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={rehearse,verifyBuild}
