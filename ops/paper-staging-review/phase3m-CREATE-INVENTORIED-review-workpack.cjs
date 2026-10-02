// One-shot, EXPLICIT files only: Phase3K 4-file preflight + hash-pinned external
// pdfinfo ALL-PAGES A4 inspection + Phase3M unsigned private human workpack.
// No binary download, no original file writes, no automatic visual/DB approval.
const fs=require('node:fs/promises')
const path=require('node:path')
const {intakeNativeEvidence}
 =require('../../al-siddique-backend/src/services/papers/paperEvidenceIntakePhase3K.js')
const {inspectOriginalNativePdf}
 =require('../../al-siddique-backend/src/services/papers/paperPdfPageInventoryPhase3M.js')
const {makeInventoriedReviewWorkpack}
 =require('../../al-siddique-backend/src/services/papers/paperInventoriedReviewPhase3M.js')
const keys=['--baseline','--manifest','--preview','--print','--paper-id',
 '--tenant-scope','--family','--pdfinfo-exe','--pdfinfo-sha256',
 '--collector-ref','--output']
async function main(args){
 if(args.length!==keys.length*2||keys.some((k,i)=>args[2*i]!==k||!args[2*i+1]))
  throw new Error('Eleven explicit local original evidence, trusted inspector and private output flags are required.')
 const v=i=>args[i*2+1]
 const output=v(10),repo=path.resolve(__dirname,'../..').toLowerCase()
 if(!path.isAbsolute(output)||path.extname(output).toLowerCase()!=='.json'||
  [v(0),v(1),v(2),v(3)].some(src=>
   path.resolve(src).toLowerCase()===path.resolve(output).toLowerCase()))
  throw new Error('Output must be a distinct absolute PRIVATE .json path.')
 const dir=path.dirname(output),resolvedDir=await fs.realpath(dir)
 const parent=await fs.lstat(dir)
 if(!parent.isDirectory()||parent.isSymbolicLink()||
  resolvedDir.toLowerCase()!==path.resolve(dir).toLowerCase()||
  path.resolve(output).toLowerCase().startsWith(repo+path.sep)||
  resolvedDir.toLowerCase().startsWith(repo+path.sep)||
  resolvedDir.toLowerCase()===repo)
  throw new Error('No redirected/junction or repository-backed output folder accepted.')
 // Both checks are READ ONLY. Source selected by exact caller paths, no broad scan.
 const original=await intakeNativeEvidence({
  baselinePath:v(0),manifestPath:v(1),previewPath:v(2),printPath:v(3),
  expectedPaperId:v(4),expectedTenantScope:v(5),expectedFamily:v(6),
 })
 const inventory=await inspectOriginalNativePdf({
  nativePdfPath:v(3),expectedPrintSha256:original.printSha256,
  inspectorExecutablePath:v(7),expectedInspectorSha256:v(8),
 })
 const workpack=makeInventoriedReviewWorkpack({preflight:original,
  inventory,sourceCollectorRef:v(9)})
 // Prevent original PDF/source or output-parent mutation between validation/write.
 const again=await intakeNativeEvidence({
  baselinePath:v(0),manifestPath:v(1),previewPath:v(2),printPath:v(3),
  expectedPaperId:v(4),expectedTenantScope:v(5),expectedFamily:v(6),
 })
 if(again.baselineSha256!==original.baselineSha256||
  again.previewSha256!==original.previewSha256||
  again.printSha256!==original.printSha256)
  throw new Error('Original four native files changed before review workpack creation.')
 if((await fs.realpath(dir)).toLowerCase()!==resolvedDir.toLowerCase())
  throw new Error('Output parent changed during original PDF inspection.')
 const file=await fs.open(output,'wx',0o600)
 try{await file.writeFile(JSON.stringify(workpack,null,2)+'\n','utf8')}
 finally{await file.close()}
 process.stdout.write('PHASE3M_UNSIGNED_COMPLETE_PDF_PAGE_WORKPACK_CREATED; HUMAN_SIGNOFF_PENDING; PRODUCTION_CUTOVER=false\n')
 return {created:true,verifiedPageCount:inventory.verifiedPdfPageCount,
  independentlyApproved:false,productionCutoverAllowed:false}
}
if(require.main===module){
 main(process.argv.slice(2)).catch(()=>{
  // Never echo sensitive filenames, scope, paper text, metadata, secrets or binary path.
  process.stderr.write('PHASE3M_INVENTORIED_WORKPACK_REFUSED: required files, executable pin, complete PDF/A4 geometry or private output not verified.\n')
  process.exitCode=1
 })
}
module.exports={main}
