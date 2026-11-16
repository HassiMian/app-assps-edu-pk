'use strict'
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const sha=data=>crypto.createHash('sha256').update(data).digest('hex')
const REFERENCE=/^[A-Za-z0-9_.-]+\.(js|css)$/
const SIGNALS={
 diary:['Subject Bold','Row Height','Diary Font Size','Footer Font Size','Logo Size','Print','Saved','subjectFontSize','rowHeightMm','logoSizeMm','footerFontSize'],
 marks:['Saved Marks Register','Print Marks Sheet','/api/exams/results','ABSENT','Edit','student_id','exam_ids'],
 results:['include_subjects','missing_configured_subject','DRAFT RESULT','Verify before final print','__asspsValidatedResultPrint','Subject roster not verified','STUDENT (OPTIONAL)','scholars-archive','result-batch-pagination','signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier']
}
function fail(x){throw Error('A315_FAIL_CLOSED_'+x)}
function safe(name){if(typeof name!=='string'||!REFERENCE.test(name)||name.includes('..'))fail('BAD_ASSET_SPECIFIER');return name}
function read(root,name){
 const dir=path.resolve(root,'assets'),p=path.resolve(dir,safe(name))
 if(!p.startsWith(dir+path.sep))fail('TRAVERSAL')
 let st;try{st=fs.lstatSync(p)}catch{fail('ASSET_NOT_FOUND_'+name)}
 if(st.isSymbolicLink()||!st.isFile()||st.size<10||st.size>25e6)fail('UNTRUSTED_ASSET_'+name)
 return fs.readFileSync(p,'utf8')
}
function one(source,prefix,ext='js'){
 const m=[...new Set(source.match(new RegExp(prefix+'-[A-Za-z0-9_-]+\\.'+ext,'g'))||[])]
 if(m.length!==1)fail('AMBIGUOUS_'+prefix+'_'+ext+'_'+m.length)
 return m[0]
}
function parse(root){
 const html=fs.readFileSync(path.resolve(root,'index.html'),'utf8')
 const scripts=[...html.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(x=>/\btype\s*=\s*"module"/.test(x)&&/\bsrc=/.test(x))
 if(scripts.length!==1)fail('MODULE_BOOTSTRAP_COUNT_'+scripts.length)
 const hit=scripts[0].match(/\bsrc\s*=\s*"\/assets\/([A-Za-z0-9_.-]+\.js)"/)
 if(!hit)fail('MODULE_BOOTSTRAP_NOT_LOCAL')
 const bootName=safe(hit[1]),boot=read(root,bootName)
 const im=[...html.matchAll(/<script\s+type\s*=\s*"importmap"\s*>([\s\S]*?)<\/script>/g)]
 if(im.length!==1)fail('IMPORT_MAP_MISSING_OR_MULTIPLE')
 let decoded;try{decoded=JSON.parse(im[0][1])}catch{fail('IMPORT_MAP_INVALID_JSON')}
 if(!decoded||!decoded.imports||typeof decoded.imports!=='object'||Array.isArray(decoded.imports))fail('IMPORT_MAP_INVALID')
 const mappings={}
 for(const [from,to] of Object.entries(decoded.imports)){
  if(!from.startsWith('/assets/')||!to.startsWith('/assets/'))fail('IMPORT_MAP_NON_LOCAL')
  mappings[safe(from.slice(8))]=safe(to.slice(8))
  read(root,mappings[safe(from.slice(8))])
 }
 const refs=[...boot.matchAll(/'\.\/(index-[A-Za-z0-9_-]+\.js)'/g)].map(m=>m[1])
 if(refs.length!==4||new Set(refs).size!==4||!/__initialShell==='paper'/.test(boot)||!/__initialShell==='exams'/.test(boot)||!/__initialShell==='fees'/.test(boot)||!/await import\(__initialShell/.test(boot))fail('MULTISHELL_BOOTSTRAP_UNPROVEN')
 const names=['paper','exams','fees','stable'],shells={}
 names.forEach((n,i)=>{shells[n]=refs[i]})
 return {html,bootName,mappings,shells}
}
function inspect(root){
 if(!root||path.resolve(root)==='/')fail('MISSING_OR_UNSAFE_ROOT')
 const {html,bootName,mappings,shells}=parse(root)
 const resolve=n=>mappings[n]||n
 const routes={}
 for(const [route,entry] of Object.entries(shells)){
  const app=read(root,resolve(entry))
  const find=kind=>{
   const original=one(app,kind),actual=resolve(original),text=read(root,actual)
   return {original,active:actual,sha256:sha(text),text}
  }
  const result=find('ResultCards'),marks=find('MarksRegister'),paper=find('PaperGenerator')
  const diaryName=one(paper.text,'DailyDiaryWorkspace'),diaryCssName=one(paper.text,'DailyDiaryWorkspace','css')
  const diary=read(root,resolve(diaryName)),diaryCss=read(root,resolve(diaryCssName))
  const marksCss=read(root,resolve(one(app,'MarksRegister','css')))
  const resultCss=read(root,resolve(one(app,'ResultCards','css')))
  routes[route]={entry,checks:{
   diary:{ok:SIGNALS.diary.every(s=>diary.includes(s))&&diaryCss.includes('diary'),missing:SIGNALS.diary.filter(s=>!diary.includes(s)),active:resolve(diaryName),sha256:sha(diary)},
   marks:{ok:SIGNALS.marks.every(s=>marks.text.includes(s))&&marksCss.includes('.mr-page')&&marksCss.includes('.mr-tablewrap'),missing:SIGNALS.marks.filter(s=>!marks.text.includes(s)),active:marks.active,sha256:marks.sha256},
   results:{ok:SIGNALS.results.every(s=>result.text.includes(s))&&resultCss.includes('result-premium-shell'),missing:SIGNALS.results.filter(s=>!result.text.includes(s)),active:result.active,sha256:result.sha256}
  }}
 }
 const gate={diary:Object.values(routes).every(x=>x.checks.diary.ok),marks:Object.values(routes).every(x=>x.checks.marks.ok),results:Object.values(routes).every(x=>x.checks.results.ok)}
 return {schema:'A315-ACTIVE-MULTISHELL-MAPPED-ACADEMIC-GUARD-V1',entry:bootName,indexSha256:sha(html),shellCount:Object.keys(routes).length,importMappings:Object.keys(mappings).length,gate,routes,passed:Object.values(gate).every(Boolean)}
}
if(require.main===module){
 try{
  const a=process.argv.indexOf('--dist')
  if(a<0||!process.argv[a+1])fail('MISSING_DIST_ARGUMENT')
  const result=inspect(process.argv[a+1])
  console.log(JSON.stringify(result,null,2))
  if(!result.passed)process.exitCode=2
 }catch(err){console.error(err.message);process.exitCode=3}
}
module.exports={inspect,parse,read,one,SIGNALS}
