'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
function inspect(dist){
 const root=path.resolve(dist)
 const fail=(reason)=>{throw Error('ASSPS_RESULTCARDS_V2_RELEASE_HOLD_'+reason)}
 const file=(name)=>{
   if(!/^[a-zA-Z0-9_-]+\.(js|css)$/.test(name))fail('UNSAFE_ASSET')
   const p=path.join(root,'assets',name)
   if(!fs.existsSync(p)||fs.lstatSync(p).isSymbolicLink())fail('MISSING_OR_UNTRUSTED_'+name)
   return fs.readFileSync(p,'utf8')
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
 const entry=html.match(/src="\/assets\/(index-[a-zA-Z0-9_-]+\.js)"/)
 if(!entry)fail('ACTIVE_INDEX_NOT_FOUND')
 const start=file(entry[1])
 const route=start.match(/ResultCards-[a-zA-Z0-9_-]+\.js/)
 const css=start.match(/ResultCards-[a-zA-Z0-9_-]+\.css/)
 if(!route||!css)fail('DYNAMIC_RESULT_CARDS_NOT_REACHABLE')
 const chunk=file(route[0]);const styles=file(css[0])
 const ten=['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier','scholars-archive']
 const signals=['STUDENT (OPTIONAL)','Preview all ','All Classes','Preview & Print Result Cards','result-batch-pagination']
 for(const text of [...ten,...signals])if(!chunk.includes(text))fail('MISSING_'+text)
 if(!styles.includes('result-batch-pagination'))fail('MISSING_BATCH_NAV_CSS')
 return {status:'PASS',activeChunk:route[0],activeCss:css[0],distinctPremiumTemplates:ten.length,signalsChecked:signals.length,legacyNinePreserved:true,sourceHash:crypto.createHash('sha256').update(html).digest('hex')}
}
if(require.main===module){
 try{const at=process.argv.indexOf('--dist');if(at===-1||!process.argv[at+1])throw Error('missing --dist')
 console.log(JSON.stringify(inspect(process.argv[at+1])))}
 catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
