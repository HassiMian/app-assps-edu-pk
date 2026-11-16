'use strict'
const {test}=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs'),os=require('node:os'),path=require('node:path')
const {parse,inspect,one}=require('./audit-active-academic-graph.cjs')
const liveRoot=process.env.A315_LIVE_ROOT||'/var/www/assps-releases/assps-diary-a208-word-narrow-margins-20261109'
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'a315-graph-test-'))
 const assetDir=path.join(root,'assets');fs.mkdirSync(assetDir)
 fs.copyFileSync(path.join(liveRoot,'index.html'),path.join(root,'index.html'))
 const {bootName,mappings,shells}=parse(liveRoot)
 const all=new Set([bootName,...Object.values(mappings),...Object.values(shells)])
 const resolve=n=>mappings[n]||n
 for(const name of Object.values(shells)){
  const app=fs.readFileSync(path.join(liveRoot,'assets',resolve(name)),'utf8')
  for(const kind of ['ResultCards','MarksRegister','PaperGenerator']){
   const original=one(app,kind)
   all.add(resolve(original))
   if(kind!=='PaperGenerator')all.add(resolve(one(app,kind,'css')))
   else {
    const paper=fs.readFileSync(path.join(liveRoot,'assets',resolve(original)),'utf8')
    all.add(resolve(one(paper,'DailyDiaryWorkspace')))
    all.add(resolve(one(paper,'DailyDiaryWorkspace','css')))
   }
  }
 }
 for(const name of all){
  const from=path.join(liveRoot,'assets',name),to=path.join(assetDir,name)
  fs.copyFileSync(from,to)
 }
 return {root,close:()=>fs.rmSync(root,{recursive:true,force:true})}
}
function run(name,fn){test(name,()=>{const f=fixture();try{fn(f.root)}finally{f.close()}})}
run('real four-shell active graph resolves importmap, diary and marks while keeping Results HOLD',root=>{
 const j=inspect(root)
 assert.equal(j.shellCount,4)
 assert.equal(j.importMappings,12)
 assert.equal(j.gate.diary,true)
 assert.equal(j.gate.marks,true)
 assert.equal(j.gate.results,false)
 assert.equal(j.passed,false)
 for(const route of Object.values(j.routes))assert.equal(route.checks.results.missing.length,9)
})
run('untrusted remote import override fails closed',root=>{
 const p=path.join(root,'index.html')
 fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/"\/assets\/ResultCards-ASSPS-COMPACT-20261114\.js"/,'"https://example.org/a.js"'))
 assert.throws(()=>inspect(root),/A315_FAIL_CLOSED_IMPORT_MAP_NON_LOCAL/)
})
run('missing or multiple module boot scripts cannot be silently bypassed',root=>{
 const p=path.join(root,'index.html')
 fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/<script type="module" crossorigin src="[^"]+"[^>]*><\/script>/,''))
 assert.throws(()=>inspect(root),/A315_FAIL_CLOSED_MODULE_BOOTSTRAP_COUNT/)
})
run('removing active mapped diary bold control fails the Diary gate',root=>{
 const j=inspect(root)
 const target=path.join(root,'assets',j.routes.paper.checks.diary.active)
 const src=fs.readFileSync(target,'utf8')
 assert.ok(src.includes('Subject Bold'))
 fs.writeFileSync(target,src.replace('Subject Bold','Removed Value'))
 assert.equal(inspect(root).gate.diary,false)
})
run('removing active marks register title fails Marks gate',root=>{
 const j=inspect(root)
 const target=path.join(root,'assets',j.routes.exams.checks.marks.active)
 const src=fs.readFileSync(target,'utf8')
 assert.ok(src.includes('Saved Marks Register'))
 fs.writeFileSync(target,src.replaceAll('Saved Marks Register','Removed Value'))
 assert.equal(inspect(root).gate.marks,false)
})
run('symlink into mounted deployment assets is rejected',root=>{
 const j=inspect(root)
 const target=path.join(root,'assets',j.routes.paper.entry)
 fs.unlinkSync(target)
 fs.symlinkSync(path.join(liveRoot,'assets',j.routes.paper.entry),target)
 assert.throws(()=>inspect(root),/A315_FAIL_CLOSED_UNTRUSTED_ASSET/)
})
run('missing mapped Result Cards bundle fails closed rather than fallback to stale orphan',root=>{
 const j=inspect(root)
 const target=path.join(root,'assets',j.routes.paper.checks.results.active)
 fs.unlinkSync(target)
 assert.throws(()=>inspect(root),/A315_FAIL_CLOSED_ASSET_NOT_FOUND/)
})
