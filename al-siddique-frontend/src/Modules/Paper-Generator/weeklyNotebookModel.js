import {compileWeeklyPlan} from './lessonWeeklyEngine.js'
import {composeTeachingStatement} from './professionalLessonCopy.js'
const NUMERIC={1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight'}
const normalizeClass=s=>NUMERIC[Number(s)]||({Play:'Starter',Playgroup:'Starter',Nursery:'Mover',Prep:'Flyer'})[s]||s
export const LESSON_CARD_COUNTS=[1,2,3,4,6,8]
const days=86400000
const parse=s=>new Date(String(s)+'T00:00:00Z')
const iso=x=>x.toISOString().slice(0,10)
const dateAdd=(date,n)=>new Date(date.getTime()+days*n)
export function termWeeks(start='2026-10-15',end='2027-02-15'){
 const first=parse(start),last=parse(end),weeks=[]
 if(!Number.isFinite(first.getTime())||!Number.isFinite(last.getTime())||first>last)return weeks
 let current=first
 while(current<=last&&weeks.length<35){
  if(current.getUTCDay()===0){current=dateAdd(current,1);continue}
  let finish=current
  while(finish<last&&finish.getUTCDay()!==6)finish=dateAdd(finish,1)
  if(finish>last)finish=last
  weeks.push({start:iso(current),end:iso(finish),index:weeks.length+1})
  current=dateAdd(finish,1)
 }
 return weeks
}
export function shortSourceStatement(text,weekIndex,weekCount){
 const raw=String(text||'')
 const pieces=raw.split(/\s*\+\s*/).map(x=>x.trim()).filter(x=>x&&!/^(assessment|test|جائزہ)$/iu.test(x))
 if(pieces.length<2)return raw
 let index=Math.min(pieces.length-1,Math.floor(weekIndex*pieces.length/weekCount))
 let chosen=pieces[index]
 // Never invent a lesson absent in the original list; proposed distribution
 // is clearly flagged by source proof state in the UI.
 return chosen
}
export function planWeekRows(candidates,klass,week,options={}){
 const rows=[],sourceMeta=[]
 const subjects=(candidates||[]).filter(c=>normalizeClass(c.proposed_class_level)===klass)
 for(const candidate of subjects){
  const compiled=compileWeeklyPlan(candidate,options)
  const matching=compiled.weeks.filter(w=>w.start<=week.end&&w.end>=week.start)
  const study=matching.filter(w=>w.source!=='ORIGINAL_ASSESSMENT_ONLY')
  if(compiled.mode==='IMAGE_TRANSCRIPTION_REVIEW'&&!study.length){
   // Keep test-only image weeks in the assessment calendar; do not invent
   // a reading lesson or paste 'FULL REVISION TEST' as syllabus work.
   const testOnly=matching.flatMap(w=>w.assessment?[w.assessment]:[])
   if(!testOnly.length)continue
   const subject=candidate.source_subject_label
   const urdu=/Urdu|Islamiat|Islamiyat|Nazra|Quran|اردو|اسلامیات/i.test(subject)
   rows.push({id:candidate.candidate_key,subject,
    task:urdu?'متعلقہ باب کے کام کی تکمیل کے بعد مقررہ جائزہ لیں۔':
      'Complete the scheduled assessment after confirming chapter coverage.',
    teacherSourceNotes:matching.map(w=>w.teacherText||w.statement).filter(Boolean),
    sourceUnits:[],page:null,sourceStatus:'ASSESSMENT WEEK / SOURCE REVIEW',
    assessments:testOnly,activities:[],flags:['Original lesson coverage must be verified.'],
    originalSourceIds:candidate.source_submissions||[]})
   continue
  }
  let task=study[0]?.statement||''
  let flags=[]
  if(study.length>1&&new Set(study.map(w=>w.sourceRange)).size>1)
   flags.push('Overlapping source plans: academic review required')
  if(study.length===1&&study[0].source==='SOURCE_DATE_RANGE'){
   const parallel=compiled.weeks.filter(w=>w.sourceRange===study[0].sourceRange&&w.source!=='ORIGINAL_ASSESSMENT_ONLY')
   const at=parallel.findIndex(w=>w.start===study[0].start&&w.end===study[0].end)
   if(parallel.length>1&&/\+/.test(task)){
    task=shortSourceStatement(task,at,parallel.length)
   }
  }
  const assessments=matching.flatMap(x=>x.assessment?[x.assessment]:[])
   .filter((x,i,arr)=>arr.findIndex(q=>q.date===x.date&&q.label===x.label)===i)
  const activities=[]
  const lastAssessment=assessments.find(x=>x.origin==='PROPOSED_END_OF_BLOCK')
  if(lastAssessment && /\bapplication\b/i.test(study[0]?.statement||'')){
    const d=new Date(lastAssessment.date+'T00:00:00Z')
    d.setUTCDate(d.getUTCDate()-1)
    while(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()-1)
    activities.push({date:d.toISOString().slice(0,10),
      label:'Application',origin:'PROPOSED_PRE_ASSESSMENT'})
  }
  const sourceStatus=compiled.mode==='IMAGE_TRANSCRIPTION_REVIEW'?'IMAGE TRANSCRIPTION / REVIEW':
   compiled.mode==='PROPOSED'?'PROPOSED WEEK':compiled.mode==='IMAGE_REVIEW_REQUIRED'?
    'IMAGE REVIEW REQUIRED':'SOURCE DATED'
  if(study.some(x=>x.reviewRequired))flags.push('Source date/month needs confirmation')
  // Only transform source-backed instruction text; do not invent pages or weeks.
  const teacherNotes=study.map(w=>w.teacherText||w.statement).filter(Boolean)
  const composed=study.length?composeTeachingStatement({
    subject:candidate.source_subject_label,notes:teacherNotes,pages:study.map(w=>w.page)
  }):null
  const page=composed?.pageFrom&&composed?.pageTo?
    {from:Number(composed.pageFrom),to:Number(composed.pageTo)}:study[0]?.page||null
  if(composed?.statement)task=composed.statement
  if(composed?.needsLanguageReview)flags.push('Verify original Urdu teacher wording before publishing.')
  if(!task&&compiled.mode==='IMAGE_REVIEW_REQUIRED')task='Review original image before writing a weekly task.'
  if(!task)task='No source lesson in this week. Review syllabus coverage.'
  rows.push({id:candidate.candidate_key,subject:candidate.source_subject_label,task,
   teacherSourceNotes:teacherNotes,sourceUnits:composed?.units||[],
   page,sourceStatus,assessments,activities,flags,originalSourceIds:candidate.source_submissions||[]})
  sourceMeta.push({id:candidate.candidate_key,warnings:compiled.warnings})
 }
 return {rows,sourceMeta}
}
export function notebookModel({candidates,klass,week,options,edits,subjects}){
 const payload=planWeekRows(candidates,klass,week,options)
 return payload.rows.filter(x=>subjects===undefined||subjects===null?true:subjects.includes(x.id)).map(x=>({
  ...x,task:typeof edits?.[x.id]==='string'?edits[x.id]:x.task
 }))
}
