'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {inspect}=require('../release/verify-resultcards-v3-active-20261015.cjs')
const path=require('node:path'),fs=require('node:fs'),os=require('node:os')
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'assps-v3-static-'))
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}))
 fs.mkdirSync(path.join(root,'assets'))
 const markers=['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier','scholars-archive','STUDENT (OPTIONAL)','Preview all ','All Classes','Preview & Print Result Cards','result-batch-pagination','include_subjects','missing_configured_subject','DRAFT RESULT','AWAITING ACADEMIC APPROVAL','__asspsValidatedResultPrint','Subject roster not verified']
 const files={
  'index.html':'<script src="/assets/index-stress123.js"></script>',
  'assets/index-stress123.js':'"assets/ResultCards-abc12345.js" "assets/ResultCards-abc12345.css"',
  'assets/ResultCards-abc12345.js':markers.join(' '),
  'assets/ResultCards-abc12345.css':'.result-batch-pagination{display:flex}'
 }
 for(const [p,data] of Object.entries(files))fs.writeFileSync(path.join(root,p),data)
 return {root,remove(marker){
  const p=path.join(root,'assets/ResultCards-abc12345.js')
  fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(marker,'REGRESSED'))
 }}
}
test('real optimized candidate includes official-subject reconciliation and both print preflights',()=>{
 const candidate=process.env.ASSPS_RESULT_CARDS_V3_DIST
 assert.ok(candidate,'ASSPS_RESULT_CARDS_V3_DIST is required')
 assert.equal(inspect(candidate).academicRosterContract,'PASS')
})
test('fully reachable 10-design academic-validated fixture passes',t=>assert.equal(inspect(fixture(t).root).status,'PASS'))
for(const marker of ['include_subjects','missing_configured_subject','DRAFT RESULT','AWAITING ACADEMIC APPROVAL','__asspsValidatedResultPrint','Subject roster not verified']){
 test('fail closed if future bundle drops '+marker,t=>{
  const f=fixture(t);f.remove(marker)
  assert.throws(()=>inspect(f.root),/V3_RELEASE_HOLD/)
 })
}
