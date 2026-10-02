// Pure synthetic-negative intake; never scans a user's files or accesses production.
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs/promises')
const os=require('node:os')
const path=require('node:path')
const {intakeNativeEvidence}=require('../services/papers/paperEvidenceIntakePhase3K.js')
const expected={expectedPaperId:'fictional-id-1',
 expectedTenantScope:'fictional-school',expectedFamily:'SAVED_PAPER'}
const args=root=>({...expected,baselinePath:path.join(root,'baseline.json'),
 manifestPath:path.join(root,'manifest.json'),
 previewPath:path.join(root,'preview.png'),printPath:path.join(root,'native.pdf')})
async function owned(fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'assps-phase3k-fake-only-'))
 try{return await fn(root)}finally{await fs.rm(root,{recursive:true,force:true})}
}
test('no paths: refuse, do not discover, fabricate or accept missing principal package',async()=>{
 await assert.rejects(()=>intakeNativeEvidence(expected),/Four separate/)
})
test('file-list mismatch and wrong independently selected family block BEFORE data read',async()=>{
 await owned(async root=>{
  const x=args(root)
  await assert.rejects(()=>intakeNativeEvidence({...x,previewPath:x.printPath}),/Four separate/)
  await assert.rejects(()=>intakeNativeEvidence({...x,expectedFamily:'APPROVED'}),/family/)
 })
})
test('missing original evidence blocks; no synthetic or Phase3J archived DB dump accepted',async()=>{
 await owned(async root=>{
  const x=args(root)
  await assert.rejects(()=>intakeNativeEvidence(x),/ENOENT/)
  await fs.writeFile(x.baselinePath,'{"fictional":true}'.repeat(8))
  await assert.rejects(()=>intakeNativeEvidence(x),/ENOENT/)
 })
})
test('links and hardlinks cannot redirect evidence to a different item',async()=>{
 await owned(async root=>{
  const x=args(root)
  const shared=path.join(root,'original.json')
  await fs.writeFile(shared,'{"fictional":"not real approval"}'.repeat(7))
  await fs.link(shared,x.baselinePath)
  await assert.rejects(()=>intakeNativeEvidence(x),/hardlink|link/)
 })
})
test('invalid signatures and mismatching manifest must refuse without any file writes',async()=>{
 await owned(async root=>{
  const x=args(root)
  for(const filename of [x.baselinePath,x.manifestPath,x.previewPath,x.printPath])
   await fs.writeFile(filename,Buffer.alloc(96,97))
  const before=await Promise.all(Object.values(x).filter(v=>typeof v==='string'&&
   path.isAbsolute(v)).map(filename=>fs.readFile(filename)))
  await assert.rejects(()=>intakeNativeEvidence(x),/JSON|digest|format|manifest/)
  const after=await Promise.all(Object.values(x).filter(v=>typeof v==='string'&&
   path.isAbsolute(v)).map(filename=>fs.readFile(filename)))
  assert.deepEqual(after,before)
 })
})
test('public CLI refuses implicit scanning or no-args invocation and does not print file content',async()=>{
 const {spawnSync}=require('node:child_process')
 const script=path.resolve(__dirname,'../../../ops/paper-staging-review/phase3k-READ-ONLY-four-file-intake.cjs')
 const run=spawnSync(process.execPath,[script],{encoding:'utf8',timeout:6000})
 assert.equal(run.status,1)
 assert.match(run.stderr,/PHASE3K_READ_ONLY_INTAKE_REFUSED/u)
 assert.equal(run.stdout,'')
})
