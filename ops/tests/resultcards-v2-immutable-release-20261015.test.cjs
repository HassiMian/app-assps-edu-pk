'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {inspect}=require('../release/verify-resultcards-v2-active-20261015.cjs')
function fx(t){
 const r=fs.mkdtempSync(path.join(os.tmpdir(),'assps-rc-v2-'))
 t.after(()=>fs.rmSync(r,{recursive:true,force:true}))
 fs.mkdirSync(path.join(r,'assets'))
 const themes=['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier','scholars-archive']
 const names=['STUDENT (OPTIONAL)','Preview all ','All Classes','Preview & Print Result Cards','result-batch-pagination']
 const a={
 'index.html':'<script src="/assets/index-test1234.js"></script>',
 'assets/index-test1234.js':'"assets/ResultCards-abc12345.js" "assets/ResultCards-abc12345.css"',
 'assets/ResultCards-abc12345.js':[...themes,...names].join(' '),
 'assets/ResultCards-abc12345.css':'.result-batch-pagination {}'
 }
 for(const [n,v] of Object.entries(a))fs.writeFileSync(path.join(r,n),v)
 return {root:r,alter(n,cb){const p=path.join(r,n);fs.writeFileSync(p,cb(fs.readFileSync(p,'utf8')))}}
}
test('actual candidate must preserve ten premium templates and class batch',{timeout:25000},()=>{
 const source=process.env.ASSPS_RESULT_CARDS_DIST
 assert.ok(source,'ASSPS_RESULT_CARDS_DIST required')
 assert.equal(inspect(source).distinctPremiumTemplates,10)
})
test('valid reachable synthetic bundle passes',t=>{
 assert.equal(inspect(fx(t).root).status,'PASS')
})
test('orphan result chunk never authorizes release',t=>{
 const x=fx(t)
 x.alter('assets/index-test1234.js',s=>s.replace('ResultCards-abc12345.js','OldCards-abc12345.js'))
 assert.throws(()=>inspect(x.root),/NOT_REACHABLE/)
})
test('removal of tenth template blocks older nine-theme release',t=>{
 const x=fx(t)
 x.alter('assets/ResultCards-abc12345.js',s=>s.replace('scholars-archive','old-ninth-only'))
 assert.throws(()=>inspect(x.root),/MISSING_scholars-archive/)
})
test('missing class/section batch UI blocks release',t=>{
 const x=fx(t)
 x.alter('assets/ResultCards-abc12345.js',s=>s.replace('STUDENT (OPTIONAL)','first-student-only'))
 assert.throws(()=>inspect(x.root),/STUDENT \(OPTIONAL\)/)
})
test('missing print pagination CSS blocks release',t=>{
 const x=fx(t)
 fs.unlinkSync(path.join(x.root,'assets/ResultCards-abc12345.css'))
 assert.throws(()=>inspect(x.root),/MISSING_OR_UNTRUSTED/)
})
