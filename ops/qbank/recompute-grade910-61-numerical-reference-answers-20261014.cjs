#!/usr/bin/env node
'use strict'
// Each explicit input is transcribed from the original revision-locked stem.
// The reported result is COMPUTED afresh rather than copied from the answer.
// This checks numerical/symbolic consistency only; it cannot certify adopted
// textbook edition, real subject reviewer, language equivalence or publication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const OUTPUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_61_NUMERICAL_INDEPENDENT_RECOMPUTATION_20261014.json')
const SUMMARY=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_61_NUMERICAL_INDEPENDENT_RECOMPUTATION_20261014.md')
const hash=v=>crypto.createHash('sha256').update(v).digest('hex')
const S={
'IX-BIO-UR-C11-N01':['mean',[5,7,9,11]],
'IX-CHEM-UR-C04-N01':['moles',[18,18]],
'IX-MATH-C01-N01':['sqrt2',[50]],
'IX-MATH-C02-N01':['logsum',[1000,0.1]],
'IX-MATH-C03-N01':['union',[18,15,6]],
'IX-MATH-C04-N01':['factor',[2,3]],
'IX-MATH-C06-N01':['hyp',[6,8]],
'IX-MATH-C07-N01':['slope',[1,2,5,10]],
'IX-MATH-C10-N01':['linear',[3,5,-4]],
'IX-MATH-C12-N01':['mean',[4,6,8,12]],
'IX-MATH-UR-C01-N01':['sqrt2',[72]],
'IX-MATH-UR-C02-N01':['logsum',[100,0.01]],
'IX-MATH-UR-C03-N01':['union',[18,15,6]],
'IX-MATH-UR-C04-N01':['factor',[3,4]],
'IX-MATH-UR-C06-N01':['hyp',[5,12]],
'IX-MATH-UR-C07-N01':['slope',[1,2,5,10]],
'IX-MATH-UR-C09-N01':['scale',[5,3]],
'IX-MATH-UR-C10-N01':['linear',[3,5,-4]],
'IX-MATH-UR-C12-N01':['mean',[4,6,8,12]],
'IX-PHT-E-C01-N01':['scientific',[0.00045]],
'IX-PHT-E-C02-N01':['speed',[150,15]],
'IX-PHT-E-C03-N01':['force',[4,2]],
'IX-PHT-E-C04-N01':['moment',[12,0.5]],
'IX-PHT-E-C05-N01':['power',[300,15]],
'IX-PHT-E-C06-N01':['density',[600,300]],
'IX-PHT-U-C01-N01':['scientific',[0.00045]],
'IX-PHT-U-C02-N01':['speed',[150,15]],
'IX-PHT-U-C03-N01':['force',[4,2]],
'IX-PHT-U-C04-N01':['moment',[12,0.5]],
'IX-PHT-U-C05-N01':['power',[300,15]],
'IX-PHT-U-C06-N01':['density',[600,300]],
'IX-PHY-2025-C01-N01':['scientific',[0.00072]],
'IX-PHY-2025-C03-N01':['force',[4,3]],
'IX-PHY-2025-C05-N01':['power',[1200,6]],
'IX-PHY-2025-C06-N01':['pressure',[600,0.2]],
'IX-PHY-2025-C07-N01':['kelvin',[27,273]],
'IX-PHY-UR-C01-N01':['cmToM',[250]],
'IX-PHY-UR-C02-N01':['speed',[120,10]],
'IX-PHY-UR-C03-N01':['force',[2,3]],
'IX-PHY-UR-C04-N01':['moment',[10,0.5]],
'IX-PHY-UR-C05-N01':['power',[200,10]],
'IX-PHY-UR-C06-N01':['density',[400,200]],
'IX-PHY-UR-C07-N01':['heat',[2,500,3]],
'X-MATH-C01-N01':['complexAdd',[3,2,4,-5]],
'X-MATH-C01-N02':['complexMultiply',[2,3,1,-2]],
'X-MATH-C02-N01':['roots',[2,3]],
'X-MATH-C03-N01':['det',[2,3,1,4]],
'X-MATH-C04-N01':['parabola',[2,2,-3]],
'X-MATH-C05-N01':['fraction',[1,1,2]],
'X-MATH-C06-N01':['vector',[2,-1,3,4]],
'X-MATH-C09-N01':['tangent',[7]],
'X-MATH-C09-N02':['hypDifference',[17,8]],
'X-MATH-C11-N01':['mean',[5,7,8,10,10]],
'X-MATH-C12-N01':['probability',[3,5]],
'X-PHY-C10-N01':['heat',[2,4200,5]],
'X-PHY-C12-N01':['wave',[50,2]],
'X-PHY-C16-N01':['resistance',[12,3]],
'X-PHY-TECH-C10-X01':['heat',[2,500,4]],
'X-PHY-TECH-C12-X01':['wave',[25,4]],
'X-PHY-TECH-C14-X01':['refractive',[3.0e8,2.0e8]],
'X-PHY-TECH-C16-X01':['resistance',[12,2]]
}
function compute(kind,a) {
 const [x,y,z,w]=a
 switch(kind){
 case 'mean':return{value:a.reduce((s,v)=>s+v,0)/a.length,unit:'',method:'Arithmetic mean = sum of observations / count'}
 case 'moles':return{value:x/y,unit:'mol',method:'n=m/M using mass g and molar mass g/mol'}
 case 'sqrt2':return{value:Math.sqrt(x),representation:Math.sqrt(x/2)+'√2',unit:'',method:'Simplify radical by extracting the largest square factor'}
 case 'logsum':return{value:Math.log10(x)+Math.log10(y),unit:'',method:'Sum of two base-ten logarithms'}
 case 'union':return{value:x+y-z,unit:'',method:'Inclusion-exclusion n(A∪B)=n(A)+n(B)-n(A∩B)'}
 case 'factor':return{value:[x,y],representation:'(x+'+x+')(x+'+y+')',unit:'',method:'Multiply factors to recover x²+'+(x+y)+'x+'+(x*y)}
 case 'hyp':return{value:Math.hypot(x,y),unit:'cm',method:'Pythagorean theorem'}
 case 'slope':return{value:(w-y)/(z-x),unit:'',method:'(y₂−y₁)/(x₂−x₁)'}
 case 'linear':return{value:x*y+z,unit:'',method:'Substitute x into linear function'}
 case 'scale':return{value:x*y,unit:'cm',method:'Corresponding side × similarity scale factor'}
 case 'scientific':return{value:x,unit:'',method:'Determine coefficient and base-ten exponent'}
 case 'speed':return{value:x/y,unit:'m/s',method:'distance/time'}
 case 'force':return{value:x*y,unit:'N',method:'Newton’s second law F=ma'}
 case 'moment':return{value:x*y,unit:'N m',method:'perpendicular force × pivot distance'}
 case 'power':return{value:x/y,unit:'W',method:'work/time'}
 case 'density':return{value:x/y,unit:'g/cm³',method:'mass/volume'}
 case 'pressure':return{value:x/y,unit:'Pa',method:'perpendicular force/area'}
 case 'kelvin':return{value:x+y,unit:'K',method:'School problem explicitly specifies K=°C+273'}
 case 'cmToM':return{value:x/100,unit:'m',method:'centimetres / 100'}
 case 'heat':return{value:x*y*z,unit:'J',method:'Q=mcΔT'}
 case 'complexAdd':return{value:[x+z,y+w],representation:String(x+z)+(y+w<0?'':'+')+(y+w)+'i',unit:'',method:'Add real and imaginary components separately'}
 case 'complexMultiply':return{value:[x*z-y*w,x*w+y*z],representation:String(x*z-y*w)+(x*w+y*z===-1?'-i':x*w+y*z===1?'+i':(x*w+y*z<0?'':'+')+(x*w+y*z)+'i'),unit:'',method:'(a+bi)(c+di)=(ac−bd)+(ad+bc)i'}
 case 'roots':return{value:[x,y],unit:'',method:'Reconstruct x²−(r₁+r₂)x+r₁r₂=0'}
 case 'det':return{value:x*w-y*z,unit:'',method:'Determinant ad−bc'}
 case 'parabola':return{value:x*y*y+z,unit:'',method:'Substitution f(x)=ax²+b'}
 case 'fraction':return{value:x+x/y,representation:'3/(2x)',unit:'',method:'Combine 1/x + 1/(2x) as 3/(2x), x≠0'}
 case 'vector':return{value:[x+z,y+w],representation:'('+(x+z)+','+(y+w)+')',unit:'',method:'Component-wise vector addition'}
 case 'tangent':return{value:x,unit:'cm',method:'Tangents from the same external point have equal lengths'}
 case 'hypDifference':return{value:Math.sqrt(x*x-y*y),unit:'cm',method:'Right triangle tangent length sqrt(OP²−OA²)'}
 case 'probability':return{value:x/(x+y),representation:x+'/'+(x+y),unit:'',method:'Favourable red / all outcomes'}
 case 'wave':return{value:x*y,unit:'m/s',method:'Wave speed v=fλ'}
 case 'resistance':return{value:x/y,unit:'Ω',method:'Ohm’s law R=V/I'}
 case 'refractive':return{value:x/y,unit:'',method:'Absolute refractive index = c/v'}
 default:throw Error('UNKNOWN_KIND_'+kind)
 }
}
function matchSourceAnswer(kind,a,computed,raw) {
 const ans=String(raw||'').replace(/[,،]/g,'').replace(/[−–]/g,'-').replace(/۔/g,'.').replace(/\s+/g,'')
 if(!ans)return false
 switch(kind){
 case 'factor':return ans.includes('(x+'+a[0]+')(x+'+a[1]+')')
 case 'sqrt2':return ans.includes(computed.representation)
 case 'complexAdd':return ans.endsWith(computed.representation+'.')||ans===computed.representation
 case 'complexMultiply':return ans.endsWith(computed.representation+'.')||ans.endsWith(computed.representation)
 case 'roots':return ans.includes('x='+a[0])&&ans.includes('x='+a[1])
 case 'fraction':return ans.includes(computed.representation)
 case 'vector':return ans.includes(computed.representation.replace(/,/g,''))
 case 'probability':return ans.includes(computed.representation)
 case 'scientific':{
  const exp=Math.floor(Math.log10(a[0]))
  const normalized=ans.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g,ch=>String('⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(ch)))
   .replace(/⁻/g,'-').replace(/\^/g,'')
  const coeff=Number((a[0]/Math.pow(10,exp)).toPrecision(8)).toString()
  return normalized.includes(coeff+'×10'+exp)||normalized.includes(coeff+'*10'+exp)||normalized.includes(coeff+'x10'+exp)
 }
 default:{
  const matches=ans.match(/-?\d+(?:\.\d+)?/g)||[]
  const last=matches.length?Number(matches[matches.length-1]):NaN
  return Number.isFinite(last)&&Math.abs(last-computed.value)<=1e-8*Math.max(1,Math.abs(computed.value))
 }
 }
}
function verify(){
 const originalIntegrity=require('./verify-grade910-processed-correction-integrity-20261014.cjs').assess()
 if(originalIntegrity.originalsBoundToExactSourceBytesAndRevisionHash!==584)
  throw Error('NUMERICAL_ORIGINAL_SOURCE_INTEGRITY_FAILED')
 const doc=JSON.parse(fs.readFileSync(V2))
 if(JSON.stringify(doc)!==JSON.stringify(originalIntegrity))
  throw Error('NUMERICAL_INTEGRITY_DOCKET_DRIFT')
 const numerical=doc.rows.filter(r=>r.signals.includes('NUMERICAL_WORKING_REVIEW'))
 if(numerical.length!==61||Object.keys(S).length!==61)throw Error('NUMERICAL_SET_MISMATCH')
 const results=[]
 for(const q of numerical){
  const v=S[q.originalId]
  if(!v)throw Error('UNMAPPED_ORIGINAL_'+q.originalId)
  const original=originalIntegrity.rows.find(item=>item.originalId===q.originalId)
  if(!original||!original.sourceFile)throw Error('MISSING_SOURCE_FILE_MAPPING_'+q.originalId)
  const file=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging',original.sourceFile)
  const data=JSON.parse(fs.readFileSync(file))
  const originalQuestion=(data.drafts||data.questions||data.items||[]).find(item=>item.id===q.originalId)
  if(!originalQuestion)throw Error('MISSING_ORIGINAL_STEM_'+q.originalId)
  const originalStem=String(originalQuestion.stem||originalQuestion.content?.en?.stem||originalQuestion.content?.ur?.stem||'')
  if(!originalStem.trim())throw Error('EMPTY_ORIGINAL_STEM_'+q.originalId)
  const [kind,inputs]=v
  const computed=compute(kind,inputs)
  const checked=matchSourceAnswer(kind,inputs,computed,q.originalReferenceAnswer)
  if(!checked)throw Error('ANSWER_COMPUTATION_DISAGREEMENT:'+q.originalId)
  results.push({
   originalId:q.originalId,originalStem,originalStemSha256:hash(originalStem),originalRevisionSha256:q.originalRevisionSha256,
   sourceFileSha256:q.sourceFileSha256,
   checkType:'INDEPENDENT_ARITHMETIC_OR_SYMBOLIC_RECALCULATION_FROM_LOCKED_STEM',
   computationalMethod:computed.method,inputs,computedValue:computed.value,
   computedRepresentation:computed.representation||null,
   expectedUnit:computed.unit,originalReferenceAnswer:q.originalReferenceAnswer,
   independentComputationAgreesWithSourceReference:checked,
   sourceTextbookEditionAdopted:false,
   languageTranslationCertified:false,qualifiedTeacherReviewed:false,
   curriculumAndExercisePageCertified:false,academicallyApproved:false,published:false
  })
 }
 const out={
  schemaVersion:'assps-grade910-original-numerical-independent-computation-v1',
  sourceIntegrityDocketSha256:hash(fs.readFileSync(V2)),
  sourceOriginalRevisionChecksInherited:61,
  explicitStemInputComputations:results.length,
  arithmeticAndSymbolicReferenceAgreements:results.filter(x=>x.independentComputationAgreesWithSourceReference).length,
  originalSourceFilesRewritten:false,
  realQualifiedFacultyReviewCount:0,academicallyApproved:0,published:0,
  notCertified:'Actual source edition, exercise location, STEM interpretation by qualified subject teacher and Urdu translation acceptance are separate human/school checks.',
  rows:results
 }
 return out
}
function write(){
 const x=verify()
 fs.writeFileSync(OUTPUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(SUMMARY,[
  '# ASSPS Grade IX–X — actual independent numerical/symbolic reference recomputation','',
  '**Automated computation, not faculty review or Board/publisher verification.**','',
  '- Source SHA-bound original numerical questions reprocessed: **61**.',
  '- Independently recomputed arithmetic/symbolic reference outcomes matching original answer expressions: **'+x.arithmeticAndSymbolicReferenceAgreements+'/61**.',
  '- Each row has a stable ID, original revision/source file SHA, transcribed input operands, computational method, separately calculated value and original reference answer.',
  '- No original rows/answers modified, no assumed source textbook page, no school adoption claim.',
  '- **Qualified teacher correctness signoffs: 0; academically approved: 0; published: 0.**',
  '- Computing an answer is useful correctness evidence but does NOT authorize verified Paper Studio selection. A teacher must still check interpretation, notation, session/edition relevance and Urdu wording.',''
 ].join('\n'))
 return{count:x.rows.length,agreement:x.arithmeticAndSymbolicReferenceAgreements,sha256:hash(fs.readFileSync(OUTPUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={verify,write,compute,matchSourceAnswer,S,OUTPUT,SUMMARY}
