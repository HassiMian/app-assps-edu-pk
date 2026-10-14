#!/usr/bin/env node
'use strict'
// Computes observable length-position cues from the UNCHANGED 68 MCQ originals.
// No answer key, distractor, educational outcome or source is silently rewritten.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const V2=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_CORRECTION_INTEGRITY_VERIFIED_DOCKET_20261014.json')
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_68_MCQ_DISTRACTOR_CUE_METRICS_20261014.json')
const sha=b=>crypto.createHash('sha256').update(b).digest('hex')
const text=v=>String(typeof v==='object'?v?.text??'':v??'').trim().normalize('NFKC')
function load(){
 const ids=new Map(JSON.parse(fs.readFileSync(V2)).rows.filter(r=>r.signals.includes('MCQ_OPTION_LENGTH_CUE_REVIEW')).map(r=>[r.originalId,r]))
 if(ids.size!==68)throw Error('EXPECTED_68_ORIGINAL_CUES')
 const indexed=new Map()
 for(const file of fs.readdirSync(STAGING).filter(f=>f.endsWith('.json')).sort()){
  let data,bytes
  try{bytes=fs.readFileSync(path.join(STAGING,file));data=JSON.parse(bytes)}catch(_){continue}
  for(const q of data.drafts||data.questions||data.items||[]){
   const row=ids.get(q.id)
   if(!row)continue
   if(indexed.has(q.id))throw Error('DUPLICATE_SOURCE_ID:'+q.id)
   if(sha(bytes)!==row.sourceFileSha256||sha(JSON.stringify(q))!==row.originalRevisionSha256)
    throw Error('QUESTION_OR_FILE_SHA_DRIFT:'+q.id)
   indexed.set(q.id,{q,row})
  }
 }
 if(indexed.size!==ids.size)throw Error('MISSING_ORIGINALS')
 return indexed
}
function analyse(){
 const rows=[]
 for(const [id,{q,row}] of load()){
  const opts=q.options||q.content?.en?.options||q.content?.ur?.options
  if(!Array.isArray(opts)||opts.length!==4)throw Error('NOT_FOUR_OPTIONS:'+id)
  const choices=opts.map((v,i)=>({key:'ABCD'[i],text:text(v)}))
  if(choices.some(o=>!o.text)||new Set(choices.map(o=>o.text.toLowerCase())).size!==4)
   throw Error('UNIQUE_OPTION_RULE_FAILED:'+id)
  const originalAnswer=text(q.answer||q.content?.en?.answer||q.content?.ur?.answer)
  const matches=choices.filter(v=>v.text.toLowerCase()===originalAnswer.toLowerCase())
  if(matches.length!==1)throw Error('SOURCE_KEY_AMBIGUOUS:'+id)
  const answer=matches[0]
  const lengths=choices.map(v=>Array.from(v.text).length)
  const ix=choices.indexOf(answer)
  const distractors=lengths.filter((_,i)=>i!==ix)
  const average=distractors.reduce((a,b)=>a+b,0)/distractors.length
  const ratio=lengths[ix]/average
  const correctLongest=lengths[ix]>Math.max(...distractors)
  const outlier=ratio>=1.5
  rows.push({
   originalId:id,originalRevisionSha256:row.originalRevisionSha256,
   grade:row.grade,subject:row.subject,medium:row.medium,
   originalCorrectAnswerText:originalAnswer,sourceMatchedOptionId:answer.key,
   optionLengths:choices.map((v,i)=>({id:v.key,characterCount:lengths[i]})),
   sourceCorrectLength:lengths[ix],meanOtherLength:Number(average.toFixed(3)),
   correctToOtherMeanRatio:Number(ratio.toFixed(3)),correctIsStrictlyLongest:correctLongest,
   correctLongerThanOthersByAtLeast50Percent:outlier,
   cueRiskStatus:outlier?'STRONG_LENGTH_CUE_FOR_HUMAN_REVISION':'HEURISTIC_REVIEW_NO_STRONG_LENGTH_OUTLIER',
   actualDistractorRewritten:false,modelAnswerCorrectnessVerified:false,
   qualifiedFacultyReviewed:false,sourceEditionSchoolAdopted:false,
   academicallyApproved:false,published:false
  })
 }
 rows.sort((a,b)=>a.originalId.localeCompare(b.originalId))
 const strong=rows.filter(r=>r.correctLongerThanOthersByAtLeast50Percent).length
 const longest=rows.filter(r=>r.correctIsStrictlyLongest).length
 return{
  schemaVersion:'assps-grade910-mcq-option-length-objective-audit-v1',
  originalMcqSourceSHARechecked:rows.length,originalCueFlaggedQuestionCount:68,
  objectiveStrongLengthCueCount:strong,strictCorrectLongestCount:longest,
  actualOriginalAnswerOrOptionsEdited:0,correctAnswersAcademicallyVerified:0,
  qualifiedTeacherReviewed:0,approved:0,published:0,
  heuristicNote:'Correct-option length is a measurable drafting risk, not proof the key is wrong or that wording was changed. Source answers are only text matched, not fact-checked.',
  rows
 }
}
function write(){
 const x=analyse()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 return{total:x.rows.length,strong:x.objectiveStrongLengthCueCount,longest:x.strictCorrectLongestCount,fileSha256:sha(fs.readFileSync(OUT))}
}
if(require.main===module)console.log(JSON.stringify(write()))
module.exports={analyse,write,OUT}
