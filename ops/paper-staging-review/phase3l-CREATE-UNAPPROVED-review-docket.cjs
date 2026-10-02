// EXPLICIT LOCAL ONLY; reads four originals, creates ONE fresh private unsigned
// review worksheet in a user-chosen folder; never modifies originals or approves.
const fs=require('node:fs/promises')
const path=require('node:path')
const {intakeNativeEvidence}
 =require('../../al-siddique-backend/src/services/papers/paperEvidenceIntakePhase3K.js')
const {makeVisualReviewDocket}
 =require('../../al-siddique-backend/src/services/papers/paperIndependentVisualDocketPhase3L.js')
const names=['--baseline','--manifest','--preview','--print','--paper-id',
 '--tenant-scope','--family','--claimed-pdf-pages','--collector-ref','--output']
async function main(args){
 if(args.length!==20||names.some((n,i)=>args[i*2]!==n||!args[i*2+1]))
  throw new Error('All ten explicit reviewer handoff flags are mandatory.')
 const v=i=>args[i*2+1]
 const output=v(9)
 const repo=path.resolve(__dirname,'../..')
 if(!path.isAbsolute(output)||path.extname(output).toLowerCase()!=='.json'||
  path.resolve(output).toLowerCase().startsWith(repo.toLowerCase()+path.sep)||
  [v(0),v(1),v(2),v(3)].some(p=>path.normalize(p).toLowerCase()===
    path.normalize(output).toLowerCase()))
  throw new Error('A distinct absolute NEW private review .json output file is required.')
 if(!/^[1-9][0-9]*$/u.test(v(7))||Number(v(7))>32)
  throw new Error('Explicit manually claimed PDF page count required (1 to 32).')
 // No output is ever opened unless actual four original files first pass exact
 // Phase3K fingerprints and unchanged-file re-read.
 const intake=await intakeNativeEvidence({
  baselinePath:v(0),manifestPath:v(1),previewPath:v(2),printPath:v(3),
  expectedPaperId:v(4),expectedTenantScope:v(5),expectedFamily:v(6),
 })
 const docket=makeVisualReviewDocket({preflight:intake,
  claimedPdfPages:Number(v(7)),sourceCollectorRef:v(8)})
 const parent=await fs.lstat(path.dirname(output))
 if(!parent.isDirectory()||parent.isSymbolicLink())
  throw new Error('Output parent directory must be explicitly chosen real folder.')
 // wx = do not overwrite ANY existing file; only a newly created private worksheet.
 const file=await fs.open(output,'wx',0o600)
 try{await file.writeFile(JSON.stringify(docket,null,2)+'\n','utf8')}
 finally{await file.close()}
 process.stdout.write('PHASE3L_PRIVATE_UNSIGNED_REVIEW_WORKSHEET_CREATED; HUMAN_REVIEW_PENDING; CUTOVER=false\n')
 return {worksheetWritten:true,productionCutoverAllowed:false,sourceMutationAllowed:false}
}
if(require.main===module){
 main(process.argv.slice(2)).catch(()=>{
  // No sensitive school ID, original paper text, evidence path or credentials printed.
  process.stderr.write('PHASE3L_DOCKET_CREATION_REFUSED: invalid, missing, changed, redirected, mismatched or already-existing evidence/output.\n')
  process.exitCode=1
 })
}
module.exports={main}
