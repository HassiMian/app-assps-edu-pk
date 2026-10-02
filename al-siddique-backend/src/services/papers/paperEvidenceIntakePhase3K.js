// Phase3K read-only intake. No automatic search, persistent DB, uploads or sign-off.
const fs=require('node:fs/promises')
const path=require('node:path')
const {createHash}=require('node:crypto')
const {verifyPrincipalEvidencePreflight}=require('./paperPrincipalEvidencePreflight.js')
const SHA=b=>createHash('sha256').update(b).digest('hex')
const kinds=Object.freeze({baseline:'.json',manifest:'.json',preview:'.png',print:'.pdf'})
async function readOwnedFile(filename,kind){
 if(typeof filename!=='string'||!path.isAbsolute(filename)||!filename.trim()||
  path.extname(filename).toLowerCase()!==kinds[kind])
  throw new Error('Explicit absolute '+kind+' file path with correct extension required.')
 const before=await fs.lstat(filename)
 if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1||
  before.size<32||before.size>(kind==='preview'||kind==='print'?24:5)*1024*1024)
  throw new Error('Refuse link, hardlink, missing, oversized or invalid '+kind+' file.')
 const real=await fs.realpath(filename)
 if(real!==path.resolve(filename))throw new Error('Refuse symlinked or redirected evidence path.')
 const bytes=await fs.readFile(filename,{flag:'r'})
 const after=await fs.lstat(filename)
 if(!after.isFile()||after.isSymbolicLink()||after.nlink!==1||
  before.size!==after.size||before.mtimeMs!==after.mtimeMs||
  before.ino!==after.ino||before.dev!==after.dev||bytes.length!==before.size)
  throw new Error('Evidence file changed during intake: '+kind+'.')
 return {file:real,bytes,sha256:SHA(bytes),stat:after}
}
async function intakeNativeEvidence({baselinePath,manifestPath,previewPath,printPath,
 expectedPaperId,expectedTenantScope,expectedFamily}={}){
 const selected={baseline:baselinePath,manifest:manifestPath,preview:previewPath,print:printPath}
 const paths=Object.values(selected)
 if(paths.some(p=>typeof p!=='string'||!path.isAbsolute(p))||
    new Set(paths.map(p=>path.normalize(p).toLowerCase())).size!==4)
  throw new Error('Four separate explicitly selected absolute evidence files required.')
 if(!['SAVED_PAPER','EARLY_YEARS_REFERENCE'].includes(expectedFamily)||
    typeof expectedPaperId!=='string'||!expectedPaperId.trim()||
    typeof expectedTenantScope!=='string'||!expectedTenantScope.trim())
  throw new Error('Independent explicit family, paper ID and signed-in scope required.')
 const files={}
 for(const kind of Object.keys(kinds))files[kind]=await readOwnedFile(selected[kind],kind)
 const report=verifyPrincipalEvidencePreflight({
  baselineRawText:files.baseline.bytes.toString('utf8'),
  manifestRawText:files.manifest.bytes.toString('utf8'),
  screenPngBytes:files.preview.bytes,nativePdfBytes:files.print.bytes,
  expectedPaperId,expectedTenantScope,expectedFamily,
 })
 // Re-read and hash all FOUR files after verification to reject mid-review edits.
 for(const kind of Object.keys(kinds)){
  const second=await readOwnedFile(selected[kind],kind)
  if(second.sha256!==files[kind].sha256||second.stat.mtimeMs!==files[kind].stat.mtimeMs||
    second.stat.ino!==files[kind].stat.ino||second.stat.dev!==files[kind].stat.dev)
   throw new Error('Evidence changed after digest validation: '+kind+'.')
 }
 return Object.freeze({...report,
  actualFilesSelected:true,independentLivePaperProvenanceEstablished:false,
  principalApprovalRecorded:false,actualEncryptedStagingRestoreVerified:false,
  productionCutoverAllowed:false,sourceMutationAllowed:false})
}
module.exports={intakeNativeEvidence}
