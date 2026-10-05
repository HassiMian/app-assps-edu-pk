const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const shaFile=f=>sha(fs.readFileSync(f))
const isHash=x=>/^[a-f0-9]{64}$/.test(String(x||''))
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const cleanCommit=x=>/^[a-f0-9]{40}$/.test(String(x||''))?String(x):''
const envText=(env,name)=>String(env?.[name]||'').trim()

async function verifyCanonicalRendererEvidence({env=process.env,fetchImpl=global.fetch}={}){
 const issues=[]
 const manifestPath=envText(env,'PAPER_CANONICAL_RENDERER_EVIDENCE_PATH')
 const expectedManifestSha=envText(env,'PAPER_CANONICAL_RENDERER_EVIDENCE_SHA256').toLowerCase()
 const approvedCommit=cleanCommit(envText(env,'PAPER_CANONICAL_RENDERER_SOURCE_COMMIT'))
 const provenanceUrl=envText(env,'PAPER_CONNECT_BUILD_PROVENANCE_URL')||'http://127.0.0.1:3002/build-provenance'
 if(!manifestPath)issues.push('renderer evidence path is not configured')
 if(!isHash(expectedManifestSha))issues.push('renderer evidence SHA-256 is not configured')
 if(!approvedCommit)issues.push('approved renderer source commit is not configured')
 let manifest=null,manifestSha=null
 if(!issues.length){
  try{
   manifestSha=shaFile(manifestPath)
   if(manifestSha!==expectedManifestSha)issues.push('renderer evidence manifest hash mismatch')
   manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'))
  }catch(e){issues.push('renderer evidence manifest cannot be read')}
 }
 const ids=['english','urdu','dual']
 if(manifest){
  if(manifest.architectureVersion!=='v6-f4-golden-render-evidence-1')issues.push('renderer evidence architecture version mismatch')
  if(manifest.approvalClaim!==false||manifest.evidenceOnly!==true)issues.push('renderer evidence must remain evidence-only')
  const prov=manifest.rendererProvenance||{}
  if(prov.rendererSourceCommit!==approvedCommit)issues.push('renderer evidence source commit mismatch')
  if(prov.attestedPathsOnly!==true||prov.rendererPathsMatchCommit!==true)issues.push('renderer source path attestation failed')
  if(!prov.buildId||typeof prov.buildId!=='string')issues.push('renderer evidence build id missing')
  if(!prov.rendererFiles||typeof prov.rendererFiles!=='object'||!Object.keys(prov.rendererFiles).length)issues.push('renderer file hashes missing')
  const variants=Array.isArray(manifest.variants)?manifest.variants:[]
  if(variants.length!==3||!same([...variants.map(v=>v.id)].sort(),[...ids].sort()))issues.push('renderer evidence must contain exactly English, Urdu and Dual variants')
  const dir=path.dirname(manifestPath)
  for(const id of ids){
   const v=variants.find(x=>x?.id===id)
   if(!v)continue
   if(v.semanticParity!==true||v.horizontalOverflow!==false)issues.push(`${id} renderer parity/overflow check failed`)
   if(!isHash(v.semanticTextSha256)||!isHash(v.printHtmlSha256))issues.push(`${id} semantic or print HTML hash missing`)
   if(v.screen?.scrollWidth>v.screen?.clientWidth+1||v.print?.scrollWidth>v.print?.clientWidth+1)issues.push(`${id} horizontal clipping detected`)
   const artifactChecks=[
    [`${id}-screen.png`,v.screen?.pngSha256],
    [`${id}-print.png`,v.print?.pngSha256],
    [`${id}-page.pdf`,v.print?.pdfSha256],
   ]
   for(const [name,expected] of artifactChecks){
    if(!isHash(expected)){issues.push(`${id} artifact hash missing: ${name}`);continue}
    const file=path.join(dir,name)
    if(!fs.existsSync(file)||shaFile(file)!==expected)issues.push(`${id} artifact hash mismatch: ${name}`)
   }
   if(id==='english'&&Array.isArray(v.urdu)&&v.urdu.length)issues.push('English evidence unexpectedly reports RTL Urdu nodes')
   if(id!=='english'){
    const rtl=(Array.isArray(v.urdu)?v.urdu:[]).some(x=>String(x?.direction).toLowerCase()==='rtl'&&/nastaliq/i.test(String(x?.fontFamily||'')))
    if(!rtl)issues.push(`${id} RTL Nastaliq evidence missing`)
   }
  }
 }
 let liveProvenance=null
 if(manifest&&!issues.length){
  try{
   const response=await fetchImpl(provenanceUrl,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(2500)})
   if(!response.ok)throw Error('non-200')
   liveProvenance=await response.json()
   const expected=manifest.rendererProvenance
   if(liveProvenance.rendererSourceCommit!==expected.rendererSourceCommit)issues.push('live Connect renderer commit differs from evidence')
   if(liveProvenance.buildId!==expected.buildId)issues.push('live Connect build id differs from evidence')
   if(liveProvenance.rendererPathsMatchCommit!==true||!same(liveProvenance.rendererFiles,expected.rendererFiles))issues.push('live Connect renderer file hashes differ from evidence')
  }catch(e){issues.push('live Connect build provenance could not be verified')}
 }
 return {valid:issues.length===0,issues,manifestSha,sourceCommit:manifest?.rendererProvenance?.rendererSourceCommit||null,buildId:manifest?.rendererProvenance?.buildId||null,variantCount:Array.isArray(manifest?.variants)?manifest.variants.length:0,liveVerified:Boolean(liveProvenance&&!issues.length)}
}
module.exports={verifyCanonicalRendererEvidence}
