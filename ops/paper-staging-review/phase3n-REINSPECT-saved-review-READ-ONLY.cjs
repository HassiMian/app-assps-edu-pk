// Phase3N explicit operator-only REINSPECTION. Reads ORIGINAL four files,
// one untrusted existing workpack, one hash-pinned local PDF inspector. NO WRITES.
// No production route, DB connection, original paper/print changes or approval.
const fs=require('node:fs/promises')
const path=require('node:path')
const {reinspectSavedNativeWorkpack}
 =require('../../al-siddique-backend/src/services/papers/paperOriginalReinspectionPhase3N.js')
const names=['--baseline','--manifest','--preview','--print',
 '--paper-id','--tenant-scope','--family','--pdfinfo-exe',
 '--pdfinfo-sha256','--saved-workpack']
async function readUntrustedWorksheet(file){
 if(typeof file!=='string'||!path.isAbsolute(file)||
  path.extname(file).toLowerCase()!=='.json')
  throw new Error('Exact existing private .json workpack path required.')
 const stat=await fs.lstat(file),real=await fs.realpath(file)
 if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
  stat.size<100||stat.size>512*1024||real!==path.resolve(file))
  throw new Error('Untrusted worksheet is linked, redirected, empty, oversized or missing.')
 const data=await fs.readFile(file)
 const after=await fs.lstat(file)
 if(after.size!==stat.size||after.ino!==stat.ino||
  after.dev!==stat.dev||after.mtimeMs!==stat.mtimeMs)
  throw new Error('Untrusted worksheet changed while loading.')
 return JSON.parse(data.toString('utf8'))
}
async function main(argv){
 if(argv.length!==20||names.some((k,i)=>argv[i*2]!==k||!argv[i*2+1]))
  throw new Error('All ten original evidence and reinspection flags are required.')
 const v=i=>argv[i*2+1]
 const canonical=p=>path.resolve(p).toLowerCase()
 if([v(0),v(1),v(2),v(3),v(7)].some(p=>canonical(p)===canonical(v(9))))
  throw new Error('Untrusted workpack must be DISTINCT from originals and inspector.')
 const savedWorkpack=await readUntrustedWorksheet(v(9))
 // Never trust any self-reported identity, file path, page count or tool metadata
 // from the saved workpack as the authority to choose an ORIGINAL or inspector.
 const proof=await reinspectSavedNativeWorkpack({
  baselinePath:v(0),manifestPath:v(1),previewPath:v(2),printPath:v(3),
  expectedPaperId:v(4),expectedTenantScope:v(5),expectedFamily:v(6),
  inspectorExecutablePath:v(7),expectedInspectorSha256:v(8),
  savedWorkpack,
 })
 process.stdout.write(JSON.stringify({
  status:proof.status,
  originalFourEvidenceFilesRechecked:proof.fullFourOriginalEvidenceFilesRechecked,
  inspectorRerunAgainstActualPinnedNativePdf:proof.actualOriginalPdfAndHashPinnedInspectorReexecuted,
  fullA4PageInventoryMatched:proof.eachOriginalNativePdfPageA4GeometryCompared,
  verifiedPdfPageCount:proof.pageCount,
  livePaperProvenanceStillPending:true,
  humanVisualSignoffStillPending:true,
  actualEncryptedStagingBackupStillPending:true,
  independentlyApproved:false,productionCutoverAllowed:false,
  sourceMutationAllowed:false,
 })+'\n')
 return proof
}
if(require.main===module){
 main(process.argv.slice(2)).catch(()=>{
  // Redacted, including original school name, paper source text, reviewer data and paths.
  process.stderr.write('PHASE3N_REINSPECTION_REFUSED: original evidence, native PDF, inspector pin or unsigned workpack could not be independently matched.\n')
  process.exitCode=1
 })
}
module.exports={main}
