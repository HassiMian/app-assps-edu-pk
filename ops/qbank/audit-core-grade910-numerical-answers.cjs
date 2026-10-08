#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const LEDGER=path.join(ROOT,'ops/qbank/grade910-core-numerical-golden-sha-20261008.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORE_NUMERICAL_ARITHMETIC_QA_20261008.json')
const sha=v=>crypto.createHash('sha256').update(v).digest('hex')
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s,،]/g,'').replace(/[.۔]+$/g,'')
function hasExactResultMarker(answer,marker){
 const value=norm(answer),needle=norm(marker)
 if(!needle)return false
 let offset=0,index
 while((index=value.indexOf(needle,offset))!==-1){
  const prev=value[index-1]||'',next=value[index+needle.length]||''
  const leftOkay=!/^[0-9]/.test(needle)||!/[0-9.]/.test(prev)
  const rightOkay=!/[0-9]$/.test(needle)||!/[0-9.]/.test(next)
  if(leftOkay&&rightOkay)return true
  offset=index+1
 }
 return false
}
const ops=Object.freeze({
 scientificExponent:x=>Math.floor(Math.log10(x)),
 velocity:(u,a,t)=>u+a*t,force:(m,a)=>m*a,
 torque:(f,d)=>f*d,power:(w,t)=>w/t,pressure:(f,a)=>f/a,
 kelvin:(c,offset)=>c+offset,cmToMetre:c=>c/100,speed:(d,t)=>d/t,
 density:(m,v)=>m/v,heat:(m,c,delta)=>m*c*delta,waveSpeed:(f,lambda)=>f*lambda,
 echoDistance:(v,t)=>v*t/2,refractiveIndex:(c,v)=>c/v,
 resistance:(v,i)=>v/i,transformer:(vp,np,ns)=>vp*ns/np,
 halfLife:(start,n)=>start*(.5**n),
 sqrtFactor:(n,radicand)=>Math.sqrt(n/radicand),
 logs:(a,b)=>Math.log10(a)+Math.log10(b),
 union:(a,b,both)=>a+b-both,
 factorIdentity:(a,b,sum,product)=>a+b===sum&&a*b===product?1:0,
 systemX:(sum,difference)=>(sum+difference)/2,
 hypotenuse:(a,b)=>Math.hypot(a,b),
 slope:(y1,y2,x1,x2)=>(y2-y1)/(x2-x1),
 similar:(small,large,other)=>other*(large/small),
 lineValue:(m,x,b)=>m*x+b,
 mean:(...nums)=>nums.reduce((a,b)=>a+b,0)/nums.length,
 probability:(favorable,total)=>favorable/total
})
const BATCHES=Object.freeze({
 'physics9EnglishStarter2026.json':[
  ['IX-PHY-2025-C01-N01','scientificExponent',[0.00072],-4,['7.2×10^-4']],
  ['IX-PHY-2025-C02-N01','velocity',[5,2,4],13,['13m/s']],
  ['IX-PHY-2025-C03-N01','force',[4,3],12,['12N']],
  ['IX-PHY-2025-C04-N01','torque',[20,.30],6,['6.0N·m']],
  ['IX-PHY-2025-C05-N01','power',[1200,6],200,['200W']],
  ['IX-PHY-2025-C06-N01','pressure',[600,.20],3000,['3000Pa']],
  ['IX-PHY-2025-C07-N01','kelvin',[27,273],300,['300K']]
 ],
 'physics9UrduStarter2026.json':[
  ['IX-PHY-UR-C01-N01','cmToMetre',[250],2.5,['2.50m']],
  ['IX-PHY-UR-C02-N01','speed',[120,10],12,['12m/s']],
  ['IX-PHY-UR-C03-N01','force',[2,3],6,['6N']],
  ['IX-PHY-UR-C04-N01','torque',[10,.5],5,['5Nm']],
  ['IX-PHY-UR-C05-N01','power',[200,10],20,['20W']],
  ['IX-PHY-UR-C06-N01','density',[400,200],2,['2g/cm³']],
  ['IX-PHY-UR-C07-N01','heat',[2,500,3],3000,['3000J']]
 ],
 'physics10Starter2026.json':[
  ['X-PHY-C10-N01','heat',[2,4200,5],42000,['42000J']],
  ['X-PHY-C12-N01','waveSpeed',[50,2],100,['100m/s']],
  ['X-PHY-C13-N01','echoDistance',[340,.40],68,['68m']],
  ['X-PHY-C14-N01','refractiveIndex',[3e8,2e8],1.5,['1.5']],
  ['X-PHY-C16-N01','resistance',[12,3],4,['4Ω']],
  ['X-PHY-C18-N01','transformer',[240,500,100],48,['48V']],
  ['X-PHY-C20-N01','halfLife',[800,3],100,['100remain']]
 ],
 'mathematics9Starter2026.json':[
  ['IX-MATH-C01-N01','sqrtFactor',[50,2],5,['5√2']],
  ['IX-MATH-C02-N01','logs',[1000,.1],2,['=2']],
  ['IX-MATH-C03-N01','union',[18,15,6],27,['=27']],
  ['IX-MATH-C04-N01','factorIdentity',[2,3,5,6],1,['(x+2)(x+3)']],
  ['IX-MATH-C05-N01','systemX',[9,3],6,['x=6','y=3']],
  ['IX-MATH-C06-N01','hypotenuse',[6,8],10,['10cm']],
  ['IX-MATH-C07-N01','slope',[2,10,1,5],2,['=2']],
  ['IX-MATH-C09-N01','similar',[4,10,6],15,['15cm']],
  ['IX-MATH-C10-N01','lineValue',[3,5,-4],11,['=11']],
  ['IX-MATH-C12-N01','mean',[4,6,8,12],7.5,['=7.5']],
  ['IX-MATH-C13-N01','probability',[3,6],.5,['1/2']]
 ],
 'mathematics9UrduStarter2026.json':[
  ['IX-MATH-UR-C01-N01','sqrtFactor',[72,2],6,['6√2']],
  ['IX-MATH-UR-C02-N01','logs',[100,.01],0,['=0']],
  ['IX-MATH-UR-C03-N01','union',[18,15,6],27,['=27']],
  ['IX-MATH-UR-C04-N01','factorIdentity',[3,4,7,12],1,['(x+3)(x+4)']],
  ['IX-MATH-UR-C05-N01','systemX',[10,2],6,['x=6','y=4']],
  ['IX-MATH-UR-C06-N01','hypotenuse',[5,12],13,['13cm']],
  ['IX-MATH-UR-C07-N01','slope',[2,10,1,5],2,['=2']],
  ['IX-MATH-UR-C09-N01','similar',[1,3,5],15,['15cm']],
  ['IX-MATH-UR-C10-N01','lineValue',[3,5,-4],11,['=11']],
  ['IX-MATH-UR-C12-N01','mean',[4,6,8,12],7.5,['=7.5']],
  ['IX-MATH-UR-C13-N01','probability',[3,6],.5,['1/2']]
 ]
})
function audit({sourceRoot=STAGING,baselineFile=LEDGER,documents}={}){
 const pinned=JSON.parse(fs.readFileSync(baselineFile,'utf8'))
 const baselines=new Map(pinned.items.map(x=>[x.questionId,x]))
 if(new Set(pinned.items.map(x=>x.questionId)).size!==pinned.items.length)throw Error('DUPLICATE_BASELINE_ID')
 const results=[]
 for(const [file,entries] of Object.entries(BATCHES)){
  const doc=documents?.[file] || JSON.parse(fs.readFileSync(path.join(sourceRoot,file),'utf8'))
  const actualRows=(doc.drafts||[]).filter(q=>q.type==='numerical')
  if(actualRows.length!==entries.length)throw Error('UNACCOUNTED_NUMERICAL_DRAFT:'+file)
  const byId=new Map(actualRows.map(q=>[q.id,q]))
  for(const [id,op,args,expected,markers] of entries){
   const q=byId.get(id),previous=baselines.get(id)
   if(!q||!previous||previous.sourceFile!==file)throw Error('NUMERICAL_BASELINE_MISSING:'+id)
   const digest=sha(JSON.stringify(q)),matchesBaseline=digest===previous.contentSha256
   const computed=ops[op](...args)
   const computationPass=Number.isFinite(computed)&&Math.abs(computed-expected)<1e-9
   const sourceAnswer=q.content?.en?.answer || q.content?.ur?.answer || ''
   const storedAnswerPass=markers.every(token=>hasExactResultMarker(sourceAnswer,token))
   results.push({
    questionId:id,sourceFile:file,questionContentSha256:digest,
    baselineContentSha256:previous.contentSha256,baselineContentMatches:matchesBaseline,
    mathematicalRecomputationPass:computationPass,storedAnswerTokenCrosscheckPass:storedAnswerPass,
    passed:matchesBaseline&&computationPass&&storedAnswerPass,
    independentlyHumanReviewed:false,questionSourcePageVerified:false,academicallyApproved:false
   })
  }
 }
 if(pinned.items.length!==results.length)throw Error('BASELINE_OVERCOUNT_OR_UNDERCOUNT')
 return {schemaVersion:'assps-grade910-independent-numerical-qa-v1',
  scope:'MECHANICAL_ARITHMETIC_ONLY_NOT_INDEPENDENT_HUMAN_ACADEMIC_REVIEW',
  questions:results.length,passed:results.filter(x=>x.passed).length,
  failed:results.filter(x=>!x.passed).length,batches:Object.keys(BATCHES).length,
  sourceVerified:0,humanReviewed:0,approved:0,published:0,results}
}
function baselineCandidate(){
 const items=[]
 for(const [file,rows] of Object.entries(BATCHES)){
  const doc=JSON.parse(fs.readFileSync(path.join(STAGING,file),'utf8'))
  for(const [id] of rows){
   const q=doc.drafts.find(x=>x.id===id&&x.type==='numerical')
   if(!q)throw Error('SOURCE_NUMERICAL_NOT_FOUND:'+id)
   items.push({questionId:id,sourceFile:file,contentSha256:sha(JSON.stringify(q))})
  }
 }
 return {schemaVersion:'assps-grade910-numerical-golden-baseline-v1',
  scope:'IMMUTABLE_ORIGINAL_AUTHORING_CONTENT_HASHES_NOT_ACADEMIC_APPROVAL',
  sourceHashOnly:true,approvalGranted:false,items}
}
if(require.main===module){
 try{
  if(process.argv.includes('--create-initial-baseline')){
   if(fs.existsSync(LEDGER))throw Error('BASELINE_ALREADY_EXISTS_NO_OVERWRITE')
   fs.writeFileSync(LEDGER,JSON.stringify(baselineCandidate(),null,2)+'\n',{flag:'wx'})
  }
  const report=audit()
  if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({questions:report.questions,passed:report.passed,failed:report.failed,batches:report.batches,humanReviewed:0,approved:0,failures:report.results.filter(x=>!x.passed).map(x=>({id:x.questionId,baseline:x.baselineContentMatches,recomputation:x.mathematicalRecomputationPass,storedAnswer:x.storedAnswerTokenCrosscheckPass}))},null,2))
  if(report.failed||report.questions!==43)process.exitCode=2
 }catch(e){console.error('NUMERICAL_QA_BLOCKED',e.message);process.exitCode=2}
}
module.exports={BATCHES,ops,norm,hasExactResultMarker,audit,baselineCandidate}
