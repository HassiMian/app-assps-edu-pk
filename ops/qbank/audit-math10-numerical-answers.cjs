#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const FILE=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/mathematics10OriginalReasoningBatch2026.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_MATH10_NUMERICAL_INDEPENDENT_MECHANICAL_QA_20261008.json')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const close=(x,y)=>Math.abs(x-y)<1e-10
function mechanicalChecks(){
 const c1={re:2*1-3*(-2),im:2*(-2)+3*1}
 const roots=[(-2-Math.sqrt(2*2-4*1*(-8)))/2,(-2+Math.sqrt(2*2-4*1*(-8)))/2].sort((a,b)=>a-b)
 const matrix=[2,1,1,1],det=matrix[0]*matrix[3]-matrix[1]*matrix[2]
 const inv=[matrix[3]/det,-matrix[1]/det,-matrix[2]/det,matrix[0]/det]
 const f=x=>3*x-5;const inverse=y=>(y+5)/3
 const sum=x=>2/(x+1)+1/(x-1)
 const simplified=x=>(3*x-1)/(x*x-1)
 const resultant=[-3+5,4+(-1)]
 const complexMagnitude=Math.sqrt(resultant[0]**2+resultant[1]**2)
 const cos=Math.sqrt(1-(5/13)**2)
 const radius=Math.hypot(24/2,5)
 const tangent=Math.sqrt(17*17-8*8)
 const weighted=(1*2+2*3+3*1)/(2+3+1)
 const flips=['HH','HT','TH','TT'].filter(s=>(s.match(/H/g)||[]).length===1).length/4
 return {
 'X-MATH-C01-N02':{numerical:close(c1.re,8)&&close(c1.im,-1),answerTokens:['8-i']},
 'X-MATH-C02-N02':{numerical:roots[0]===-4&&roots[1]===2,answerTokens:['x=-4','x=2']},
 'X-MATH-C03-N02':{numerical:det===1&&[1,-1,-1,2].every((x,i)=>x===inv[i])&&
       [matrix[0]*inv[0]+matrix[1]*inv[2],matrix[0]*inv[1]+matrix[1]*inv[3],matrix[2]*inv[0]+matrix[3]*inv[2],matrix[2]*inv[1]+matrix[3]*inv[3]].every((x,i)=>x===[1,0,0,1][i]),
   answerTokens:['[[1,-1],[-1,2]]']},
 'X-MATH-C04-N02':{numerical:[-9,-1,0,2,5,18].every(x=>close(inverse(f(x)),x)),answerTokens:['(x+5)/3']},
 'X-MATH-C05-N02':{numerical:[-5,-2,0,2,5].every(x=>close(sum(x),simplified(x))),answerTokens:['(3x-1)/(x²-1)','1 or -1']},
 'X-MATH-C06-N02':{numerical:resultant[0]===2&&resultant[1]===3&&close(complexMagnitude,Math.sqrt(13)),answerTokens:['(2,3)','√13']},
 'X-MATH-C07-N02':{numerical:close(cos,12/13),answerTokens:['12/13']},
 'X-MATH-C08-N01':{numerical:radius===13,answerTokens:['13 cm']},
 'X-MATH-C09-N02':{numerical:tangent===15,answerTokens:['15 cm']},
 'X-MATH-C11-N02':{numerical:close(weighted,11/6),answerTokens:['11/6']},
 'X-MATH-C12-N02':{numerical:flips===1/2,answerTokens:['1/2']}
 }
}
function auditMathNumericals(data){
 const numeric=data.drafts.filter(q=>q.type==='numerical')
 const checks=mechanicalChecks(),byId=new Map(numeric.map(q=>[q.id,q]))
 const results=[]
 for(const id of Object.keys(checks)){
  const q=byId.get(id)
  if(!q){results.push({questionId:id,mechanicalCheckPassed:false,reason:'QUESTION_ID_MISSING'});continue}
  const answer=String(q.content?.en?.answer||'').normalize('NFKC').toLowerCase().replace(/\s+/g,'')
  const checksPass=checks[id].answerTokens.every(s=>answer.includes(s.normalize('NFKC').toLowerCase().replace(/\s+/g,'')))
  results.push({questionId:id,questionContentSha256:sha(JSON.stringify(q)),
    numericalDerivationValid:checks[id].numerical,
    savedAnswerCrosscheckPassed:checksPass,
    mechanicalCheckPassed:checks[id].numerical&&checksPass,
    independentlyHumanReviewed:false,sourcePageVerified:false,approved:false})
 }
 const extra=numeric.filter(q=>!Object.hasOwn(checks,q.id)).map(q=>q.id)
 return{schemaVersion:'assps-math10-numerical-mechanical-qa-v1',
  scope:'INDEPENDENT_ARITHMETIC_AND_SAVED_ANSWER_SPOT_CHECK_NOT_SOURCE_OR_HUMAN_CERTIFICATION',
  originalFile:path.basename(FILE),originalFileSha256:sha(fs.readFileSync(FILE)),
  numericalDraftCount:numeric.length,checked:results.length,
  passed:results.filter(x=>x.mechanicalCheckPassed).length,failed:results.filter(x=>!x.mechanicalCheckPassed).length,
  uncheckedNumericalIds:extra,academicApproved:0,published:0,
  results}
}
if(require.main===module){
 const d=JSON.parse(fs.readFileSync(FILE,'utf8'));const x=auditMathNumericals(d)
 if(process.argv.includes('--write'))fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 console.log(JSON.stringify({numericalDraftCount:x.numericalDraftCount,checked:x.checked,passed:x.passed,failed:x.failed,uncheckedNumericalIds:x.uncheckedNumericalIds,sourceVerified:0,humanReviewed:0,approved:0},null,2))
 if(process.argv.includes('--strict')&&(x.failed||x.uncheckedNumericalIds.length))process.exitCode=1
}
module.exports={mechanicalChecks,auditMathNumericals}
