// Unified Term coverage is derived from the same evidence-first weekly engine.
// Proposed allocations are never promoted to verified textbook/source claims.
import {compileWeeklyPlan} from './lessonWeeklyEngine.js'
import {createEmptyLessonPlanDocument,toLessonPlanPersistencePayload,
  normalizeLessonPlanDocument} from './lessonPlanDomain.js'

export const TERM_MARKER='ASSPS_TERM_NOTEBOOK_V1'
const dateValid=value=>{
  if(!/^\d{4}-\d\d-\d\d$/.test(String(value||'')))return false
  const parsed=new Date(value+'T00:00:00Z')
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value
}
export function assertTermRange(start,end){
  if(!dateValid(start)||!dateValid(end)||end<start)
    throw Error('Choose valid term start and end dates')
  if((Date.parse(end)-Date.parse(start))/86400000>370)
    throw Error('A term may not exceed 371 calendar days')
}
const validPage=x=>Number.isSafeInteger(Number(x))&&Number(x)>0&&Number(x)<10000
const sourceText=s=>String(s||'').trim()
const inTerm=(week,start,end)=>week?.start<=end&&week?.end>=start
export const termKey=(klass,section,term,start)=>[
  klass,section,term,start].map(x=>String(x||'').trim().toLowerCase()).join('|')

export function buildTermOverview(candidates,{start,end,imageReview,edits={},term='Second Term'}={}){
  assertTermRange(start,end)
  return (Array.isArray(candidates)?candidates:[]).map(candidate=>{
    const id=candidate.candidate_key
    if (Array.isArray(candidate.sourceVariants)) {
      // The two original documents retain separate verified/proposed state and
      // assessment provenance. One visible English/Urdu row is saved as a draft.
      const parts=candidate.sourceVariants.map(({part,candidate:source})=>({
        part,source,row:buildTermOverview([source],{start,end,imageReview,edits,term})[0]
      }))
      const override=edits[id]||{}
      const combined=parts.map(p=>'['+p.part+'] '+(p.row.detail||
        'No verified source coverage; review original '+p.part+' plan.')).join('\n')
      const allPages=parts.map(x=>x.row)
      const from=allPages.map(x=>Number(x.pageFrom)).filter(validPage)
      const to=allPages.map(x=>Number(x.pageTo)).filter(validPage)
      const pageFrom=from.length?String(Math.min(...from)):''
      const pageTo=to.length?String(Math.max(...to)):''
      return {
        id,subject:candidate.source_subject_label,
        detail:override.detail===undefined?combined:String(override.detail),
        pageFrom:override.pageFrom===undefined?pageFrom:String(override.pageFrom),
        pageTo:override.pageTo===undefined?pageTo:String(override.pageTo),
        sourceStatus:term==='Second Term'?'A/B SOURCE — REVIEW REQUIRED':
          'UNSOURCED TERM — TEACHER PROPOSAL',
        originalSourceIds:term==='Second Term'?(candidate.source_submissions||[]):[],
        sourceParts:parts.map(p=>({part:p.part,candidateKey:p.source.candidate_key,
          sourceIds:term==='Second Term'?(p.source.source_submissions||[]):[]})),
        needsReview:true,
        warnings:parts.flatMap(p=>(p.row.warnings||[]).map(w=>'['+p.part+'] '+w)),
        events:parts.flatMap(p=>(p.row.events||[]).map(e=>({
          ...e,subject:candidate.source_subject_label,
          name:'['+p.part+'] '+e.name,sourcePart:p.part
        })))
      }
    }
    // The pinned private school archive was sourced for Second Term.
    // Never silently reuse those dated topics/pages as First or Third Term.
    if(term!=='Second Term'){
      const override=edits[id]||{}
      return {
        id,subject:candidate.source_subject_label,
        detail:override.detail===undefined?'':String(override.detail),
        pageFrom:override.pageFrom===undefined?'':String(override.pageFrom),
        pageTo:override.pageTo===undefined?'':String(override.pageTo),
        sourceStatus:'UNSOURCED TERM — TEACHER PROPOSAL',
        originalSourceIds:[],needsReview:true,
        warnings:['Original school source archive is Second Term only. Verify this term independently.'],
        events:[]
      }
    }
    const compiled=compileWeeklyPlan(candidate,{start,end,imageReview})
    const matched=(compiled.weeks||[]).filter(x=>inTerm(x,start,end))
    const teaching=matched.filter(x=>x.source!=='ORIGINAL_ASSESSMENT_ONLY')
    const notes=[...new Set(teaching.map(x=>sourceText(x.statement)).filter(Boolean))]
    const actualPages=teaching.map(x=>x.page).filter(p=>p&&validPage(p.from)&&validPage(p.to))
    const defaultFrom=actualPages.length?String(Math.min(...actualPages.map(p=>Number(p.from)))):''
    const defaultTo=actualPages.length?String(Math.max(...actualPages.map(p=>Number(p.to)))):''
    const events=matched.flatMap(x=>x.assessment?[{
      date:x.assessment.date||'',name:x.assessment.label||'Assessment',
      subject:candidate.source_subject_label,origin:x.assessment.origin||'PROPOSED',
      originalDate:x.assessment.date||'',sourceId:x.assessment.sourceId||''
    }]:[])
    const override=edits[id]||{}
    return {
      id,subject:candidate.source_subject_label,
      detail:override.detail===undefined?notes.join(' ; '):String(override.detail),
      pageFrom:override.pageFrom===undefined?defaultFrom:String(override.pageFrom),
      pageTo:override.pageTo===undefined?defaultTo:String(override.pageTo),
      sourceStatus:compiled.mode==='PROPOSED'?'PROPOSED ALLOCATION':
        compiled.mode==='IMAGE_TRANSCRIPTION_REVIEW'?'IMAGE TRANSCRIPTION / REVIEW':
        compiled.mode==='IMAGE_REVIEW_REQUIRED'?'IMAGE REVIEW REQUIRED':'SOURCE DATED / REVIEW',
      originalSourceIds:candidate.source_submissions||[],
      needsReview:true,
      warnings:compiled.warnings||[],
      events
    }
  })
}
export function termAssessmentRows(rows,manual=[]){
  const seen=new Set(),source=[]
  for(const row of rows||[])for(const a of row.events||[]){
    const key=[row.id,a.date,a.sourceId,a.origin].join('|')
    if(!a.date||seen.has(key))continue
    seen.add(key)
    source.push({id:'src:'+key,date:a.date,subject:a.subject||row.subject,
      name:a.name||'Assessment',origin:a.origin,originalDate:a.originalDate||a.date,
      sourceId:a.sourceId||''})
  }
  source.sort((a,b)=>a.date.localeCompare(b.date)||a.subject.localeCompare(b.subject))
  const extras=(Array.isArray(manual)?manual:[]).filter(a=>a&&a.id)
    .map(a=>({...a,date:String(a.date||''),name:String(a.name||'Assessment'),
      subject:String(a.subject||''),origin:a.origin||'MANUAL_PROPOSAL'}))
  const combined=[...source.map(s=>extras.find(a=>a.id===s.id)||s),
    ...extras.filter(a=>!String(a.id).startsWith('src:'))]
  while(combined.length<2)
    combined.push({id:'blank-'+combined.length,date:'',name:'Assessment',
      subject:'',origin:'EMPTY_PROPOSAL'})
  return combined.map((a,index)=>({...a,number:index+1}))
}
export function validateTermContent({klass,start,end,rows,assessments}){
  assertTermRange(start,end)
  if(!klass||!Array.isArray(rows)||!rows.length)throw Error('Select a class with subjects')
  const ids=new Set()
  for(const row of rows){
    if(!row.id||!row.subject||ids.has(row.id))throw Error('Duplicate or missing subject identity')
    ids.add(row.id)
    if(String(row.detail||'').length>6000)throw Error('Subject text exceeds 6000 characters')
    const a=String(row.pageFrom||''),b=String(row.pageTo||'')
    if((a&&!validPage(a))||(b&&!validPage(b))||
      (a&&b&&Number(b)<Number(a)))throw Error('Invalid page range for '+row.subject)
  }
  for(const a of assessments||[]){
    if(a.date&&!dateValid(a.date))throw Error('Assessment '+a.number+' has an invalid date')
    if(a.date&&(a.date<start||a.date>end))
      throw Error('Assessment '+a.number+' falls outside the selected term')
  }
  return true
}
export function buildTermServerPayload({klass,section,term,start,end,rows,
  assessments,design,sourceZipSha256,existing}){
  validateTermContent({klass,start,end,rows,assessments})
  if(!term||!/^([a-f0-9]{64})$/.test(String(sourceZipSha256||'')))
    throw Error('Verified original source and term name are required')
  const identity=termKey(klass,section,term,start)
  const subjects=rows.map((r,index)=>({
    subject:r.subject,status:'draft',notes:[],
    units:[{id:'term-unit-'+index,label:r.subject,
      pageRange:r.pageFrom&&r.pageTo?r.pageFrom+'–'+r.pageTo:'',
      source:'private-academic-review',needsReview:true}],
    lessons:[{key:'term-coverage-'+index,date:start,
      title:r.detail.slice(0,700),homework:r.detail.slice(0,900),
      source:'private-academic-review',needsReview:true}]
  }))
  const original=existing?normalizeLessonPlanDocument(existing):null
  const doc={
    ...createEmptyLessonPlanDocument({planningType:'term',status:'draft',
      classLevel:klass,section,termLabel:term,startDate:start,endDate:end,
      subjects,analysis:{warnings:['Term source, dates and subject offerings require institutional review']},
      provenance:{marker:TERM_MARKER,termKey:identity,sourceZipSha256,
        sourceArchiveScope:'SECOND_TERM_ONLY',
        sourceApplicability:term==='Second Term'?'ORIGINAL_REVIEW_PENDING':'UNSOURCED_MANUAL_DRAFT',
        academicPublication:'BLOCKED',deterministic:true,aiEnhanced:false,
        sourcePartsBySubject:Object.fromEntries(rows.filter(r=>r.sourceParts?.length)
          .map(r=>[r.id,r.sourceParts.map(p=>({
            part:p.part,candidateKey:p.candidateKey,sourceIds:p.sourceIds||[]
          }))]))}}),
    schemaVersion:3,
    title:'Term Planner — '+klass+' — '+term+' — '+start,
    termCoverageRows:rows.map(r=>({id:r.id,subject:r.subject,
      detail:r.detail,pageFrom:r.pageFrom,pageTo:r.pageTo,sourceStatus:r.sourceStatus,
      originalSourceIds:r.originalSourceIds,needsReview:true})),
    assessments:(assessments||[]).map(a=>({...a})),
    layoutSettings:{...(design||{})}
  }
  const payload=toLessonPlanPersistencePayload(doc)
  if(original?.id){payload.id=original.id;payload.serverRevision=original.serverRevision}
  return payload
}
export function eligibleTermPlans(plans=[]){
  return (Array.isArray(plans)?plans:[])
    .map(plan=>normalizeLessonPlanDocument(plan))
    .filter(doc=>doc.planningType==='term'&&
      doc.provenance?.marker===TERM_MARKER&&
      doc.provenance.academicPublication==='BLOCKED')
}
