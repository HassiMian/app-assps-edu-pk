#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {ops:baseOps,hasExactResultMarker}=require('./audit-core-grade910-numerical-answers.cjs')
const ROOT=path.resolve(__dirname,'../..')
const DIR=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const PIN=path.join(ROOT,'ops/qbank/grade910-other-numerical-golden-sha-20261008.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_REMAINING_NUMERICAL_ARITHMETIC_QA_20261008.json')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const ops={
 ...baseOps,
 complexAdd:(a,b,c,d,re,im)=>a+c===re&&b+d===im?1:0,
 quadraticRoots:(a,b,c,x,y)=>(x+y===-b/a&&x*y===c/a)?1:0,
 determinant:(a,b,c,d)=>a*d-b*c,
 evalQuadratic:(a,x,c)=>a*x*x+c,
 rationalCoefficient:(a,b)=>a+b,
 vectorCheck:(a,b,c,d,x,y)=>a+c===x&&b+d===y?1:0,
 opposite:(adj,num,den)=>adj*num/den,
 equalTangents:d=>d,
 atomCount:(al,s,o,g)=>al+s+o*g,
 gcd:(a,b)=>{while(b){[a,b]=[b,a%b]}return a},
 molecules:(n,avogadro)=>n*avogadro,
 moles:(m,mm)=>m/mm,
 productMass:(reactantMass,reactantMM,stoichR,stoichProduct,productMM)=>reactantMass/reactantMM*stoichProduct/stoichR*productMM,
 neutrons:(massNo,atomicNo)=>massNo-atomicNo,
 isotopes:(a,p,b,q)=>a*p+b*q
}
const GROUPS={
 'physicsTech9DualStarter2026.json':[
 ['IX-PHT-E-C01-N01','scientificExponent',[.00045],-4,['4.5×10⁻⁴']],
 ['IX-PHT-E-C02-N01','speed',[150,15],10,['10m/s']],
 ['IX-PHT-E-C03-N01','force',[4,2],8,['8N']],
 ['IX-PHT-E-C04-N01','torque',[12,.5],6,['6Nm']],
 ['IX-PHT-E-C05-N01','power',[300,15],20,['20W']],
 ['IX-PHT-E-C06-N01','density',[600,300],2,['2g/cm³']],
 ['IX-PHT-U-C01-N01','scientificExponent',[.00045],-4,['4.5×10⁻⁴']],
 ['IX-PHT-U-C02-N01','speed',[150,15],10,['10m/s']],
 ['IX-PHT-U-C03-N01','force',[4,2],8,['8N']],
 ['IX-PHT-U-C04-N01','torque',[12,.5],6,['6Nm']],
 ['IX-PHT-U-C05-N01','power',[300,15],20,['20W']],
 ['IX-PHT-U-C06-N01','density',[600,300],2,['2g/cm³']]
 ],
 'physicsTech10EnglishStarter2026.json':[
 ['X-PHY-TECH-C10-X01','heat',[2,500,4],4000,['4000J']],
 ['X-PHY-TECH-C12-X01','waveSpeed',[25,4],100,['100m/s']],
 ['X-PHY-TECH-C13-X01','echoDistance',[340,.50],85,['85m']],
 ['X-PHY-TECH-C14-X01','refractiveIndex',[3e8,2e8],1.5,['1.5']],
 ['X-PHY-TECH-C16-X01','resistance',[12,2],6,['6Ω']],
 ['X-PHY-TECH-C19-X01','halfLife',[800,3],100,['100remain']]
 ],
 'mathematics10Starter2026.json':[
 ['X-MATH-C01-N01','complexAdd',[3,2,4,-5,7,-3],1,['7-3i']],
 ['X-MATH-C02-N01','quadraticRoots',[1,-5,6,2,3],1,['x=2','x=3']],
 ['X-MATH-C03-N01','determinant',[2,3,1,4],5,['=5']],
 ['X-MATH-C04-N01','evalQuadratic',[2,2,-3],5,['=5']],
 ['X-MATH-C05-N01','rationalCoefficient',[1,.5],1.5,['3/(2x)']],
 ['X-MATH-C06-N01','vectorCheck',[2,-1,3,4,5,3],1,['(5,3)']],
 ['X-MATH-C07-N01','opposite',[20,3,4],15,['15m']],
 ['X-MATH-C09-N01','equalTangents',[7],7,['7cm']],
 ['X-MATH-C11-N01','mean',[5,7,8,10,10],8,['=8']],
 ['X-MATH-C12-N01','probability',[3,8],.375,['3/8']]
 ],
 'chemistry9Chapter4EnglishDrafts2026.json':[
 ['IX-CHEM-2025-C04-T01-N03','atomCount',[2,3,4,3],17,['17atoms']],
 ['IX-CHEM-2025-C04-T02-N06','gcd',[4,10],2,['c2h5']],
 ['IX-CHEM-2025-C04-T06-N17','molecules',[.50,6.02e23],3.01e23,['3.01×10^23']],
 ['IX-CHEM-2025-C04-T07-N20','moles',[22,44],.5,['0.500mol']],
 ['IX-CHEM-2025-C04-T09-N26','productMass',[4,2,2,2,18],36,['36.0g']]
 ],
 'chemistry9Chapter2EnglishDrafts2026.json':[
 ['IX-CHEM-2025-C02-T22-N11','neutrons',[37,17],20,['protons=17','neutrons=37-17=20','electrons=17']],
 ['IX-CHEM-2025-C02-T24-N23','isotopes',[20,.6,22,.4],20.8,['=20.8']]
 ],
 'biology9UrduStarter2026.json':[
 ['IX-BIO-UR-C11-N01','mean',[5,7,9,11],8,['=8']]
 ],
 'chemistry9UrduStarter2026.json':[
 ['IX-CHEM-UR-C04-N01','moles',[18,18],1,['=1mol']]
 ]
}
function baselineCandidate(){
 const items=[]
 for(const [file,rows] of Object.entries(GROUPS)){
  const doc=require(path.join(DIR,file))
  for(const [id] of rows){
   const q=doc.drafts.find(q=>q.id===id&&q.type==='numerical')
   if(!q)throw Error('NUMERICAL_DRAFT_MISSING:'+id)
   items.push({questionId:id,sourceFile:file,contentSha256:sha(JSON.stringify(q))})
  }
 }
 return{schemaVersion:'assps-grade910-additional-numerical-baseline-v1',
  scope:'ORIGINAL_DRAFT_CONTENT_HASH_ONLY_NOT_ACADEMIC_APPROVAL',approved:false,items}
}
function audit({sourceRoot=DIR,documents={},baselinePath=PIN}={}){
 const pinned=JSON.parse(fs.readFileSync(baselinePath,'utf8'))
 const hashes=new Map(pinned.items.map(r=>[r.questionId,r]))
 if(hashes.size!==pinned.items.length)throw Error('GOLDEN_SHA_DUPLICATE_ID')
 const results=[]
 for(const [file,rows] of Object.entries(GROUPS)){
  const doc=documents[file] || JSON.parse(fs.readFileSync(path.join(sourceRoot,file),'utf8'))
  const numerical=doc.drafts.filter(q=>q.type==='numerical')
  if(numerical.length!==rows.length)throw Error('UNACCOUNTED_NUMERICAL:'+file)
  for(const [id,op,args,expected,markers] of rows){
   const q=numerical.find(q=>q.id===id),pin=hashes.get(id)
   if(!q||!pin||pin.sourceFile!==file)throw Error('QUESTION_HASH_NOT_PINNED:'+id)
   const actual=sha(JSON.stringify(q))
   const computed=ops[op](...args)
   const independentlyRecomputed=Number.isFinite(computed)&&Math.abs(computed-expected)<=1e-9*Math.max(1,Math.abs(expected))
   const text=q.content?.en?.answer || q.content?.ur?.answer || ''
   const savedAnswerCrosscheck=markers.every(marker=>hasExactResultMarker(text,marker))
   const sourceRevisionMatches=actual===pin.contentSha256
   results.push({questionId:id,sourceFile:file,questionContentSha256:actual,
    sourceRevisionMatches,independentlyRecomputed,savedAnswerCrosscheck,
    passed:sourceRevisionMatches&&independentlyRecomputed&&savedAnswerCrosscheck,
    academicHumanApproved:false,sourcePageVerified:false,published:false})
  }
 }
 if(results.length!==pinned.items.length)throw Error('GOLDEN_SHA_OVER_OR_UNDERCOUNT')
 return{schemaVersion:'assps-grade910-additional-numerical-qa-v1',
  scope:'CALCULATION_ONLY_NOT_SCHOOL_ADOPTION_OR_HUMAN_ANSWER_APPROVAL',
  records:results.length,passed:results.filter(x=>x.passed).length,failed:results.filter(x=>!x.passed).length,
  sourceVerified:0,humanReviewed:0,approved:0,published:0,results}
}
if(require.main===module){
 try{
  if(process.argv.includes('--create-initial-baseline')){
   if(fs.existsSync(PIN))throw Error('BASELINE_ALREADY_EXISTS_CANNOT_OVERWRITE')
   fs.writeFileSync(PIN,JSON.stringify(baselineCandidate(),null,2)+'\n',{flag:'wx'})
  }
  const result=audit()
  if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify({records:result.records,passed:result.passed,failed:result.failed,
   humanReviewed:0,approved:0,failures:result.results.filter(x=>!x.passed).map(x=>x.questionId)},null,2))
  if(result.failed||result.records!==37)process.exitCode=2
 }catch(e){console.error('ADDITIONAL_NUMERICAL_QA_BLOCKED',e.message);process.exitCode=2}
}
module.exports={GROUPS,ops,audit,baselineCandidate}
