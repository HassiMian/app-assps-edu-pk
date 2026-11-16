'use strict'
const {inspect,SIGNALS}=require('./audit-active-academic-graph.cjs')
function bridge(kind,root){
 if(!['diary','marks','results'].includes(kind))throw Error('A315_UNKNOWN_GUARD_KIND')
 const a=inspect(root)
 const ok=a.gate[kind]
 const checked=Object.values(a.routes).map(r=>r.checks[kind])
 const missing=[...new Set(checked.flatMap(x=>x.missing))]
 const receipt={
  schema:'ASSPS_A315_MULTISHELL_ACADEMIC_SOURCE_GUARD',
  status:ok?'PASS':'FAIL',
  sourceScope:'ALL_FOUR_LIVE_SHELLS_WITH_IMPORTMAP_STATIC_CODE_ONLY',
  sourceEvidenceOnly:true,
  academicRevisionApprovalGranted:false,
  studentMarksMutated:false,
  activeEntry:a.entry,
  rootIndexSha256:a.indexSha256,
  routeCount:a.shellCount,
  importMapResolved:a.importMappings,
  checkedAssets:checked.map(x=>({name:x.active,sha256:x.sha256})),
  missingSignals:missing
 }
 if(kind==='diary')receipt.prePromotionDecision=ok?'PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY':'HOLD_DIARY_ACTIVE_CONTROLLER_MISSING'
 if(kind==='results'){
  const ten=['signature-editorial','swiss-grid','data-atelier','regal-linework',
   'young-scholars','academic-heritage','airframe-geometry','corporate-ledger',
   'examination-dossier','scholars-archive']
  receipt.distinctPremiumTemplates=Math.min(...checked.map(x=>
    ten.filter(t=>!x.missing.includes(t)).length))
 }
 return receipt
}
function run(kind){
 try{
  const at=process.argv.indexOf('--dist')
  if(at<0||!process.argv[at+1])throw Error('A315_MISSING_DIST')
  const j=bridge(kind,process.argv[at+1])
  console.log(JSON.stringify(j))
 }catch(e){console.error(e.message);process.exitCode=3}
}
module.exports={bridge,run}
