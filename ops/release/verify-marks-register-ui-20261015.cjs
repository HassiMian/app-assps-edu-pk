'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
function inspect(root){
 root=path.resolve(root)
 const fail=x=>{throw new Error('MARKS_REGISTER_ACTIVE_BUNDLE_'+x)}
 const safe=(name)=>{
  if(!/^[A-Za-z0-9_-]+\.(js|css)$/.test(name))fail('UNSAFE_CHUNK')
  const f=path.join(root,'assets',name)
  if(!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink()||!fs.statSync(f).isFile())fail('MISSING_OR_UNTRUSTED_ASSET_'+name)
  return fs.readFileSync(f,'utf8')
 }
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8')
 const entry=html.match(/<script[^>]+src="\/assets\/(index-[A-Za-z0-9_-]+\.js)"/)
 if(!entry)fail('ACTIVE_INDEX_MISSING')
 const app=safe(entry[1])
 const feature=app.match(/MarksRegister-[A-Za-z0-9_-]+\.js/)
 const css=app.match(/MarksRegister-[A-Za-z0-9_-]+\.css/)
 if(!feature||!css)fail('MARKS_REGISTER_NOT_REACHABLE_FROM_ROUTER')
 const js=safe(feature[0]),style=safe(css[0])
 const required=['Saved Marks Register','Print Marks Sheet','/api/exams/results','ABSENT','Edit','student_id','exam_ids']
 const missing=required.filter(s=>!js.includes(s))
 if(missing.length)fail('MISSING_FEATURES_'+missing.join(','))
 if(!style.includes('.mr-page')||!style.includes('.mr-tablewrap'))fail('MISSING_REGISTER_CSS')
 return {status:'PASS',activeEntry:entry[1],activeModule:feature[0],activeCss:css[0],requiredSignals:required,
  indexSha256:crypto.createHash('sha256').update(html).digest('hex'),
  sourceScope:'frontend-authenticated-view-print_only',academicRevisionApprovalGranted:false,studentMarksMutated:false}
}
if(require.main===module){
 try{const i=process.argv.indexOf('--dist');if(i===-1||!process.argv[i+1])throw new Error('MISSING_DIST')
  console.log(JSON.stringify(inspect(process.argv[i+1])))
 }catch(e){console.error(e.message);process.exitCode=2}
}
module.exports={inspect}
