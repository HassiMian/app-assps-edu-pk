// Local, EXPLICIT paths ONLY. No evidence is uploaded, moved, persisted or approved.
// Invoke only by trusted operator using FOUR original same-paper Phase3D files.
const {intakeNativeEvidence}=require('../../al-siddique-backend/src/services/papers/paperEvidenceIntakePhase3K.js')
const expected=['--baseline','--manifest','--preview','--print','--paper-id','--tenant-scope','--family']
async function main(argv){
 if(argv.length!==14||expected.some((name,i)=>argv[2*i]!==name||!argv[2*i+1]))
  throw new Error('Seven explicit flags required: --baseline PATH --manifest PATH --preview PATH --print PATH --paper-id ID --tenant-scope SCOPE --family SAVED_PAPER|EARLY_YEARS_REFERENCE.')
 const v=i=>argv[2*i+1]
 const result=await intakeNativeEvidence({
  baselinePath:v(0),manifestPath:v(1),previewPath:v(2),printPath:v(3),
  expectedPaperId:v(4),expectedTenantScope:v(5),expectedFamily:v(6),
 })
 // No filenames, actual school scopes, teacher/student content, native JSON,
 // tokens, DB URLs or secrets are written to stdout or disk.
 process.stdout.write(JSON.stringify({
  status:result.status,
  fourExactFileFingerprintsMatch:true,
  pngAndPdfNativeFingerprintsVerified:true,
  pdfA4MachineVerified:result.pdfA4MachineVerified,
  actualOriginalSelectedInSignedInBrowserMachineProven:false,
  originalLivePrintSemanticParityMachineProven:false,
  humanVisualReviewPending:true,
  principalApprovalRecorded:false,
  actualEncryptedStagingRestoreVerified:false,
  productionCutoverAllowed:false,sourceMutationAllowed:false,
 })+'\n')
}
if(require.main===module){
 main(process.argv.slice(2)).catch(e=>{
  // Errors are redacted: no passed file path, teacher source, school ID or secret.
  process.stderr.write('PHASE3K_READ_ONLY_INTAKE_REFUSED: '+(
   /Four separate|Seven explicit|family|signed-in scope/u.test(e.message)?
    'missing/invalid explicit evidence selection':'unverified, missing, changed or mismatched evidence')+'\n')
  process.exitCode=1
 })
}
module.exports={main}
