#!/usr/bin/env node
/** A198 fail-closed guard for the live Saved Papers three-source contract.
 * Does not mutate production. Validates the selected importmap target, not
 * orphaned historical JS files in the static release directory.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args=process.argv.slice(2)
function arg(name){const i=args.indexOf(name);return i<0?null:args[i+1]}
const root=arg('--root')||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const distRoot=arg('--dist-root')||(args.includes('--dist')?path.join(root,'al-siddique-frontend','dist'):null)
const failures=[]
const ensure=(label,content,terms)=>{
 for(const term of terms)if(!content.includes(term))failures.push(label+' missing: '+term)
}
if(!args.includes('--dist-only')){
 const file=path.join(root,'al-siddique-frontend','src','Modules','Paper-Generator','SavedPapersTab.jsx')
 let source=''
 try{source=fs.readFileSync(file,'utf8')}catch{failures.push('SavedPapersTab.jsx missing')}
 try {
   source += '\n' + fs.readFileSync(path.join(root,'al-siddique-frontend','src','Modules','Paper-Generator','AssessmentStudio','core','assessmentPersistence.js'),'utf8')
 }catch{ /* No helper present; contract checks still fail closed. */ }
 ensure('Saved Papers source',source,[
   'usePaperStore','savedPapers','assessment-studio/papers',
   '/api/portal/paper-studio/library','serverPaperId','revisionAvailable'
 ])
}
if(distRoot){
 const index=path.join(distRoot,'index.html')
 let html=''
 try{html=fs.readFileSync(index,'utf8')}catch{failures.push('Built index.html missing')}
 const rel=[]
 const match=html.match(/<script type="importmap">([\s\S]*?)<\/script>/)
 if(match){
   try{
     const map=JSON.parse(match[1]).imports||{}
     for(const [key,target] of Object.entries(map)){
       if(key.includes('SavedPapersTab-'))rel.push(target)
     }
   }catch{failures.push('Malformed importmap')}
 }
 if(!rel.length){
   const assets=path.join(distRoot,'assets')
   if(fs.existsSync(assets)){
     rel.push(...fs.readdirSync(assets).filter(f=>/^SavedPapersTab-[^.]+\.js$/.test(f)).map(f=>'/assets/'+f))
   }
 }
 if(rel.length!==1)failures.push('Expected one current Saved Papers JS entry; found '+rel.length)
 else{
   let chunk=''
   const f=path.join(distRoot,rel[0].replace(/^\/+/, ''))
   try{chunk=fs.readFileSync(f,'utf8')}catch{failures.push('Active Saved Papers chunk missing: '+rel[0])}
   ensure('Active Saved Papers chunk',chunk,[
     'savedPapers','/api/assessment-studio/papers',
     '/api/portal/paper-studio/library','serverOnly',
     'revisionAvailable'
   ])
 }
}
if(failures.length){
 console.error('A198_SAVED_PAPERS_RELEASE_BLOCKED',failures.length)
 for(const failure of failures)console.error('- '+failure)
 process.exitCode=3
}else console.log('A198_SAVED_PAPERS_CONTINUITY_PASS',distRoot?'built-active-chunk':'source')
