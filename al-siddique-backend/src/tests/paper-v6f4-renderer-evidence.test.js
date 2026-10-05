const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto')
const {verifyCanonicalRendererEvidence}=require('../services/papers/paperRendererEvidenceV6F4')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
function fixture(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'v6f4-render-'))
 const commit='a'.repeat(40),buildId='build-proof-1',rendererFiles={'a.jsx':'b'.repeat(64)}
 const variants=['english','urdu','dual'].map(id=>{
  const screen=Buffer.from(`${id}-screen`),print=Buffer.from(`${id}-print`),pdf=Buffer.from(`${id}-pdf`)
  fs.writeFileSync(path.join(dir,`${id}-screen.png`),screen);fs.writeFileSync(path.join(dir,`${id}-print.png`),print);fs.writeFileSync(path.join(dir,`${id}-page.pdf`),pdf)
  return {id,language:id,semanticTextSha256:'c'.repeat(64),screen:{pngSha256:sha(screen),width:794,height:1123,scrollWidth:794,clientWidth:794},print:{pngSha256:sha(print),pdfSha256:sha(pdf),width:794,height:1123,scrollWidth:794,clientWidth:794},urdu:id==='english'?[]:[{direction:'rtl',fontFamily:'Noto Nastaliq Urdu'}],semanticParity:true,horizontalOverflow:false,printHtmlSha256:'d'.repeat(64)}
 })
 const manifest={architectureVersion:'v6-f4-golden-render-evidence-1',approvalClaim:false,evidenceOnly:true,rendererProvenance:{rendererSourceCommit:commit,attestedPathsOnly:true,rendererPathsMatchCommit:true,rendererFiles,buildId},variants}
 const file=path.join(dir,'manifest.json');fs.writeFileSync(file,JSON.stringify(manifest))
 const env={PAPER_CANONICAL_RENDERER_EVIDENCE_PATH:file,PAPER_CANONICAL_RENDERER_EVIDENCE_SHA256:sha(fs.readFileSync(file)),PAPER_CANONICAL_RENDERER_SOURCE_COMMIT:commit,PAPER_CONNECT_BUILD_PROVENANCE_URL:'http://proof.invalid'}
 const fetchImpl=async()=>({ok:true,json:async()=>manifest.rendererProvenance})
 return {dir,file,env,manifest,fetchImpl}
}
test('exact evidence + live provenance approves renderer evidence',async()=>{const f=fixture();try{const r=await verifyCanonicalRendererEvidence({env:f.env,fetchImpl:f.fetchImpl});assert.equal(r.valid,true);assert.equal(r.liveVerified,true);assert.equal(r.variantCount,3)}finally{fs.rmSync(f.dir,{recursive:true,force:true})}})
test('tampered screenshot fails closed',async()=>{const f=fixture();try{fs.appendFileSync(path.join(f.dir,'urdu-print.png'),'tamper');const r=await verifyCanonicalRendererEvidence({env:f.env,fetchImpl:f.fetchImpl});assert.equal(r.valid,false);assert.ok(r.issues.some(x=>x.includes('urdu artifact hash mismatch')))}finally{fs.rmSync(f.dir,{recursive:true,force:true})}})
test('stale live build id fails closed',async()=>{const f=fixture();try{const fetchImpl=async()=>({ok:true,json:async()=>({...f.manifest.rendererProvenance,buildId:'different'})});const r=await verifyCanonicalRendererEvidence({env:f.env,fetchImpl});assert.equal(r.valid,false);assert.ok(r.issues.includes('live Connect build id differs from evidence'))}finally{fs.rmSync(f.dir,{recursive:true,force:true})}})
test('missing explicit approval coordinates fail closed',async()=>{const r=await verifyCanonicalRendererEvidence({env:{},fetchImpl:async()=>{throw Error('must not fetch')}});assert.equal(r.valid,false);assert.ok(r.issues.length>=3)})
