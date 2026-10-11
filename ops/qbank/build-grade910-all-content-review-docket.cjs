#!/usr/bin/env node
'use strict'
// Immutable-original editorial QA, not answer validation or school publication.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const source=require('./attest-grade910-all-original-candidate-revisions.cjs')
const DOC=path.resolve(__dirname,'../../docs/question-bank')
const OUT=path.join(DOC,'ASSPS_GRADE910_ALL_2581_CONTENT_ANSWER_EDITORIAL_REVIEW_20261011.json')
const SUMMARY=path.join(DOC,'ASSPS_GRADE910_ALL_2581_CONTENT_EDITORIAL_QA_20261011.md')
const hash=s=>crypto.createHash('sha256').update(s).digest('hex')
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim()
const ansNorm=x=>norm(x).replace(/[.!?۔؟。]+$/u,'').trim()
const optText=o=>typeof o==='string'?o:typeof o?.text==='string'?o.text:''
const answerOf=q=>q.content?.en?.answer||q.content?.ur?.answer||q.answer||''
const stemOf=q=>q.question_text||q.questionText||q.stem||q.content?.en?.stem||q.content?.ur?.stem||''
const bad=x=>{throw Error('GRADE910_EDITORIAL_'+x)}
function evaluate(q){
 const flags=[],type=q.type,answer=answerOf(q),anslen=String(answer).length
 if(!String(stemOf(q)).trim())flags.push('STEM_MISSING')
 if(!String(answer).trim())flags.push('ANSWER_REFERENCE_MISSING')
 if(type==='long'){
  if(anslen<=100)flags.push('LONG_REFERENCE_EXTREMELY_BRIEF')
  else if(anslen<=200)flags.push('LONG_REFERENCE_BRIEF_RUBRIC_REVIEW')
 }
 if(type==='essay'&&anslen<100)flags.push('ESSAY_REFERENCE_BRIEF')
 if(type==='numerical'&&anslen<30)flags.push('NUMERICAL_WORKING_REVIEW')
 let mcq=null
 if(type==='mcq'){
  const en=q.content?.en,ur=q.content?.ur,options=en?.options||ur?.options||q.options
  const os=Array.isArray(options)?options:[]
  if(os.length!==4)flags.push('MCQ_OPTION_COUNT_NOT_FOUR')
  const texts=os.map(optText),values=texts.map(ansNorm)
  const labels=os.map(x=>typeof x==='object'&&x!==null?x.id:null)
  const labeled=labels.join('|')==='A|B|C|D'
  if(!labeled)flags.push('MCQ_OPTIONS_NOT_CANONICALLY_LABELED')
  if(texts.some(x=>!x.trim()))flags.push('MCQ_EMPTY_OPTION')
  if(new Set(values).size!==values.length)flags.push('MCQ_REPEATED_OPTION')
  const key=/^[A-D]$/.test(String(q.correctOptionId||''))?q.correctOptionId:null
  if(!key)flags.push('MCQ_KEY_ID_NOT_EXPLICIT')
  const inferredIndex=values.findIndex(x=>x===ansNorm(answer))
  const researchOnlyKey=key||(!labeled&&inferredIndex>=0&&values.filter(x=>x===ansNorm(answer)).length===1?'ABCD'[inferredIndex]:null)
  const selected=os[labels.indexOf(key)]
  if(labeled&&key&&selected&&answer&&ansNorm(optText(selected))!==ansNorm(answer))
   flags.push('MCQ_SELECTED_TEXT_ANSWER_DISAGREE')
  const matches=values.filter(x=>x===ansNorm(answer)).length
  if(matches!==1)flags.push('MCQ_TEXT_ANSWER_NOT_UNIQUE_OPTION')
  if(en&&ur){
   const e=en.options||[],u=ur.options||[]
   if(e.map(o=>o.id).join('|')!=='A|B|C|D'||u.map(o=>o.id).join('|')!=='A|B|C|D')
    flags.push('MCQ_URDU_ENGLISH_LABEL_PARITY_REVIEW')
   const picked=u.find(o=>o.id===key)
   if(picked&&ur.answer&&ansNorm(optText(picked))!==ansNorm(ur.answer))
    flags.push('MCQ_URDU_TEXT_ANSWER_DISAGREE')
  }
  const lens=texts.map(x=>x.length),max=Math.max(...lens,0),min=Math.min(...lens,Infinity)
  if(labeled&&min>0&&max>=3*min&&max-min>=35)
   flags.push('MCQ_OPTION_LENGTH_CUE_REVIEW')
  mcq={key,researchedAnswerPositionNotVerified:researchOnlyKey,optionCount:os.length,canonicallyLabeled:labeled,
   answerMatchesExactlyOneOption:matches===1,
   optionLengthRange:[Number.isFinite(min)?min:0,max],
   bilingualOptionSets:Boolean(en?.options&&ur?.options)}
 }
 return{answerLength:anslen,stemLength:String(stemOf(q)).length,
  objectiveEditorialFlags:[...new Set(flags)].sort(),mcq}
}
function build(){
 const inp=source.loadInputs(),locked=source.assertFrozen(inp)
 if(locked.originalAuthoredQuestionCandidates!==2581||locked.originalAuthoredFiles!==73||
    locked.academicallyApproved!==0||locked.verifiedPublished!==0)bad('FROZEN_BASELINE_DRIFT')
 const files=new Map(locked.files.map(f=>[f.originalAuthoredFile,f]))
 const rows=[],seen=new Set(),flagCounts={},types={},keys={A:0,B:0,C:0,D:0,missing:0}
 const groups=new Map()
 for(const d of inp.documents){
  const file=files.get(d.file)
  if(!file)continue
  const rev=new Map(file.originalQuestionRevisions.map(x=>[x.originalQuestionId,x]))
  const drafts=[...(d.data?.drafts||[]),...(d.data?.items||[])]
  if(drafts.length!==rev.size)bad('UNSEALED_FILE_POPULATION:'+d.file)
  for(const q of drafts){
   const v=rev.get(q.id)
   if(!v||seen.has(q.id)||v.originalQuestionRevisionSha256!==hash(JSON.stringify(q)))
    bad('ORIGINAL_REVISION_DRIFT:'+q.id)
   seen.add(q.id)
   const ev=evaluate(q),group=JSON.stringify([q.curriculum?.grade??null,q.curriculum?.subjectId??null])
   types[q.type]=(types[q.type]||0)+1
   if(!groups.has(group))groups.set(group,{grade:q.curriculum?.grade??null,
    subject:q.curriculum?.subjectId??null,originals:0,mcq:0,editorialSignals:0})
   const g=groups.get(group);g.originals++
   if(q.type==='mcq'){g.mcq++;keys[ev.mcq?.researchedAnswerPositionNotVerified||'missing']++}
   if(ev.objectiveEditorialFlags.length)g.editorialSignals++
   for(const f of ev.objectiveEditorialFlags)flagCounts[f]=(flagCounts[f]||0)+1
   rows.push({
    originalId:q.id,revisionSha256:v.originalQuestionRevisionSha256,
    sourceFile:d.file,sourceFileSha256:file.originalFileSha256,
    gradeClaim:q.curriculum?.grade??null,subjectClaim:q.curriculum?.subjectId||null,
    mediumClaim:q.medium||null,chapterClaim:q.chapter?.number??q.unit??null,
    originalSourcePdfSha256Claim:q.source?.pdfSha256||d.data.sourcePdfSha256||null,
    originalCatalogId:q.source?.catalogRecordId||d.data.sourceRecordId||null,
    questionType:q.type,marks:q.marks??null,...ev,
    actualIndependentFacultyAnswerVerified:false,academicApproved:false,published:false
   })
  }
 }
 if(rows.length!==2581||seen.size!==2581||types.mcq!==875||types.short!==908||
    types.long!==564||types.numerical!==91||keys.A!==785||keys.B!==50||
    keys.C!==33||keys.D!==7||keys.missing!==0)bad('COHORT_ANSWER_KEY_TOTALS_DRIFT')
 rows.sort((a,b)=>a.originalId.localeCompare(b.originalId))
 return{schemaVersion:'assps-grade910-sha-frozen-original-editorial-signal-v1',
  originalCandidates:2581,sourceFiles:73,originalTypes:types,mcqKeyCounts:keys,
  originalMcqAProportion:785/875,signalCounts:flagCounts,
  flaggedQuestionIds:rows.filter(r=>r.objectiveEditorialFlags.length).length,
  subjectGradeGroups:[...groups.values()].sort((a,b)=>
   String(a.grade).localeCompare(String(b.grade))||String(a.subject).localeCompare(String(b.subject))),
  approved:0,published:0,publisherSelectable:false,
  method:'Warnings about option/key format, reference length or bilingual labels are editorial signals, NOT verified scientific answer errors. No original question text, answer or options copied; no option reordering.',
  rows}
}
function markdown(r){
 const signals=Object.entries(r.signalCounts).sort((a,b)=>b[1]-a[1])
 return ['# Grade IX–X — all 2,581 original answer-format and MCQ editorial research audit','',
  '**NOT academically verified. All 2,581 remain provisional; approved = 0; published = 0.**','',
  'Frozen sources: **73**. Original MCQs: **875**, shorts **908**, longs **564**, numericals **91**, plus Urdu/English writing types.',
  'Original selected MCQ keys: A **785**, B **50**, C **33**, D **7**; option A accounts for **'+
   (100*r.originalMcqAProportion).toFixed(1)+'%**. Balance is an editorial quality risk, not proof of an incorrect key.',
  '','| Objective research-only signal | Original candidates | Required qualified teacher decision |',
  '|---|---:|---|',
  ...signals.map(([flag,n])=>'| '+flag+' | '+n+
   ' | Inspect content and answer against true curriculum/book; no auto-approval or text change |'),
  '','A brief long-answer rubric can be deliberate and still need teacher expansion for a full marking model. A length-imbalanced option may still be valid; it is not a scientific correctness verdict. Legacy string-option questions must be normalized to the new paper schema through an independently reviewed question revision.',
  '','Every source-bound research item is included once with immutable question/source SHA fingerprints; no copyrighted question stem or answer reproduced by this manifest. Risks can overlap. Student and institution data were not accessed.',
  '','**Release remains HOLD** pending real adopted textbook/board-year, qualified independent subject/Urdu verification, authenticated institutional final approval and SaaS Core production certification.',''].join('\n')
}
function write(){
 const x=build()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(SUMMARY,markdown(x))
 return{originals:x.originalCandidates,flaggedOriginals:x.flaggedQuestionIds,
  signals:x.signalCounts,approved:x.approved}
}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build(),null,2))
module.exports={build,write,evaluate,markdown,ansNorm,OUT,SUMMARY}
