import {summarizeTermFromOriginalNotes,explicitTeacherChapterLabels} from './sourceFaithfulPlanningCopy.js'
// Unified Term coverage is derived from the same evidence-first weekly engine.
// Proposed allocations are never promoted to verified textbook/source claims.
import {compileWeeklyPlan} from './lessonWeeklyEngine.js'
import {composeTeachingStatement} from './professionalLessonCopy.js'
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
      const allPages=parts.map(x=>x.row)
      const from=allPages.map(x=>Number(x.pageFrom)).filter(validPage)
      const to=allPages.map(x=>Number(x.pageTo)).filter(validPage)
      const pageFrom=from.length?String(Math.min(...from)):''
      const pageTo=to.length?String(Math.max(...to)):''
      // Preserve A/B identities without repeating the same term page spans in
      // every weekly source sentence. Do not infer a missing part as approved.
      const concisePart=part=>String(part.row.detail||'Teacher source pending.')
        .replace(/^(?:Pages?\s+\d+\s*[–-]\s*\d+|صفحہ\s*نمبر\s*\d+\s*تا\s*\d+)\s*[—–:-]?\s*/iu,'').trim()
      const combined=[pageFrom&&pageTo?
        (/urdu|اسلام|اردو|قرآن/i.test(candidate.source_subject_label)?
          'صفحہ نمبر '+pageFrom+' تا '+pageTo:'Pages '+pageFrom+'–'+pageTo):'',
        ...parts.map(p=>'['+p.part+'] '+concisePart(p))]
        .filter(Boolean).join('\n')
      return {
        id,subject:candidate.source_subject_label,
        detail:override.detail===undefined?combined:String(override.detail),
        sourceChapterTitles:parts.flatMap(p=>p.row.sourceChapterTitles||[]),
        // Verified A/B Second Term page bounds cannot be overwritten by
        // stale or cross-account local draft edits. Unverified terms remain editable.
        pageFrom:term==='Second Term'&&pageFrom?pageFrom:
          (override.pageFrom===undefined?pageFrom:String(override.pageFrom)),
        pageTo:term==='Second Term'&&pageTo?pageTo:
          (override.pageTo===undefined?pageTo:String(override.pageTo)),
        sourcePageFrom:term==='Second Term'?pageFrom:'',
        sourcePageTo:term==='Second Term'?pageTo:'',
        sourceStatus:term==='Second Term'?'A/B SOURCE — REVIEW REQUIRED':
          'UNSOURCED TERM — TEACHER PROPOSAL',
        originalSourceIds:term==='Second Term'?(candidate.source_submissions||[]):[],
        sourceParts:parts.map(p=>({part:p.part,candidateKey:p.source.candidate_key,
          sourceIds:term==='Second Term'?(p.source.source_submissions||[]):[]})),
        needsReview:true,
        warnings:[...parts.flatMap(p=>(p.row.warnings||[]).map(w=>'['+p.part+'] '+w)),
          ...(term==='Second Term'&&pageFrom&&override.pageFrom!==undefined&&
            String(override.pageFrom)!==pageFrom?
            ['An older A/B manual page start differs from the original; original restored in preview.']:[]),
          ...(term==='Second Term'&&pageTo&&override.pageTo!==undefined&&
            String(override.pageTo)!==pageTo?
            ['An older A/B manual page end differs from the original; original restored in preview.']:[])],
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
        sourcePageFrom:'',sourcePageTo:'',
        sourceStatus:'UNSOURCED TERM — TEACHER PROPOSAL',
        originalSourceIds:[],needsReview:true,
        warnings:['Original school source archive is Second Term only. Verify this term independently.'],
        events:[]
      }
    }
    const compiled=compileWeeklyPlan(candidate,{start,end,imageReview})
    const matched=(compiled.weeks||[]).filter(x=>inTerm(x,start,end))
    const teaching=matched.filter(x=>x.source!=='ORIGINAL_ASSESSMENT_ONLY')
    const notes=[...new Set(teaching.map(x=>sourceText(x.teacherText||x.statement)).filter(Boolean))]
    const actualPages=teaching.map(x=>x.page).filter(p=>p&&validPage(p.from)&&validPage(p.to))
    // A term is a FULL coverage sheet, not a generic one-line teaching summary.
    // Keep every distinct source teacher statement in source order. Manual
    // corrections remain editable drafts; they never alter source provenance.
    const compactTermStatement=summarizeTermFromOriginalNotes(notes,candidate.source_subject_label)
    const authored=composeTeachingStatement({subject:candidate.source_subject_label,
      notes,pages:actualPages,scope:'term'})
    const defaultFrom=authored.pageFrom
    const defaultTo=authored.pageTo
    const events=matched.flatMap(x=>x.assessment?[{
      date:x.assessment.date||'',name:x.assessment.label||'Assessment',
      subject:candidate.source_subject_label,origin:x.assessment.origin||'PROPOSED',
      originalDate:x.assessment.date||'',sourceId:x.assessment.sourceId||''
    }]:[])
    const override=edits[id]||{}
    return {
      id,subject:candidate.source_subject_label,
      detail:override.detail===undefined?compactTermStatement:String(override.detail),
       originalTeacherNotes:notes,sourceChapterTitles:explicitTeacherChapterLabels(notes),sourceUnits:authored.units,
       needsLanguageReview:authored.needsLanguageReview,
      // Source-derived page bounds are immutable; keep legacy edits for audit.
      pageFrom:defaultFrom||(override.pageFrom===undefined?'':String(override.pageFrom)),
      pageTo:defaultTo||(override.pageTo===undefined?'':String(override.pageTo)),
      sourcePageFrom:defaultFrom,sourcePageTo:defaultTo,
      sourceStatus:compiled.mode==='PROPOSED'?'PROPOSED ALLOCATION':
        compiled.mode==='IMAGE_TRANSCRIPTION_REVIEW'?'IMAGE TRANSCRIPTION / REVIEW':
        compiled.mode==='IMAGE_REVIEW_REQUIRED'?'IMAGE REVIEW REQUIRED':'SOURCE DATED / REVIEW',
      originalSourceIds:candidate.source_submissions||[],
      needsReview:true,
      warnings:[...(compiled.warnings||[]),
        ...(defaultFrom&&override.pageFrom!==undefined&&String(override.pageFrom)!==defaultFrom?
          ['An older manual page start differs from the original; original restored in preview.']:[]),
        ...(defaultTo&&override.pageTo!==undefined&&String(override.pageTo)!==defaultTo?
          ['An older manual page end differs from the original; original restored in preview.']:[]),
        ...(authored.needsLanguageReview?['Original Urdu wording needs teacher verification.']:[])],
      events
    }
  })
}
// Class/section-local proposals: TWO non-Sunday dates per month for each
// source-listed subject. All existing source dates retain precedence. Dates
// across subjects must be distinct; conflicts never get silently coalesced.
const utcDate=s=>dateValid(s)?new Date(s+'T00:00:00Z'):null
const monthDays=(month,start,end)=>{
  const days=[]
  for(let d=(start>month+'-01'?start:month+'-01');d<=end && d.startsWith(month);){
    const stamp=utcDate(d)
    if(!stamp)break
    if(stamp.getUTCDay()!==0)days.push(d)
    stamp.setUTCDate(stamp.getUTCDate()+1)
    d=stamp.toISOString().slice(0,10)
  }
  return days
}
export function termAssessmentRows(rows,manual=[],calendar={}){
  const subjects=(Array.isArray(rows)?rows:[]).filter(r=>r?.id&&r.subject)
  const start=calendar.start,end=calendar.end
  const termDates=dateValid(start)&&dateValid(end)&&end>=start
  const explicit=[],used=new Set(),identities=new Set()
  for(const row of subjects){
    for(const item of row.events||[]){
      if(!dateValid(item.date)||(termDates&&(item.date<start||item.date>end)))continue
      // Original published draft identity (pre-upgrade) MUST stay unchanged
      // so saved manual source-date proposals reopen without losing revisions.
      const id='src:'+ [row.id,item.date,item.sourceId||'',item.origin||''].join('|')
      if(identities.has(id))continue
      identities.add(id)
      explicit.push({id,subjectId:row.id,subject:row.subject,date:item.date,
        name:item.name||'Assessment',origin:item.origin||'ORIGINAL_SOURCE',
        originalDate:item.originalDate||item.date,sourceId:item.sourceId||''})
    }
  }
  const changes=(Array.isArray(manual)?manual:[]).filter(x=>x&&x.id)
    .map(x=>({...x,id:String(x.id),subjectId:String(x.subjectId||
      subjects.find(r=>r.subject===x.subject)?.id||subjects[0]?.id||''),
      date:String(x.date||''),origin:x.origin||'MANUAL_PROPOSAL'}))
  // Historical saved/manual payloads are not authority to rewrite original
  // academic assessment dates or relabel source evidence as a proposal.
  // Retain the raw draft in storage; ignore conflicting aliases in rendering.
  // Only the current source manifest can grant ORIGINAL_SOURCE provenance.
  // Historical/manual drafts may adjust proposals, not forge a source identity,
  // change a source ID, or promote a proposal into academic approval.
  const sourceById=new Map(explicit.map(x=>[x.id,x]))
  const allowedSubjects=new Map(subjects.map(row=>[String(row.id),row]))
  const effectiveChanges=changes.filter(change=>{
    if(!allowedSubjects.has(change.subjectId))return false
    if(!change.id.startsWith('src:'))return true
    const original=sourceById.get(change.id)
    return !!original&&original.origin!=='ORIGINAL_SOURCE'&&
      original.subjectId===change.subjectId
  }).map(change=>{
    if(change.id.startsWith('src:')){
      const original=sourceById.get(change.id)
      return {...original,date:change.date,name:change.name||original.name,
        origin:'MANUAL_PROPOSAL',academicApproval:false}
    }
    return {...change,subject:allowedSubjects.get(change.subjectId).subject,
      origin:'MANUAL_PROPOSAL',originalDate:'',sourceId:'',academicApproval:false}
  })
  const overrides=new Map(effectiveChanges.filter(x=>String(x.id).startsWith('src:'))
    .map(x=>[x.id,x]))
  const source=explicit.map(x=>overrides.get(x.id)||x)
  // Approved/original dates and owner-edited proposed dates are immutable
  // reservations. Conflicts between two original dates remain visible HOLD.
  for(const x of source.filter(x=>x.origin==='ORIGINAL_SOURCE'))used.add(x.date)
  for(const x of effectiveChanges)if(dateValid(x.date))used.add(x.date)
  const sourceSchedule=source.map(x=>{
    if(x.origin==='ORIGINAL_SOURCE'||overrides.has(x.id))return x
    // Other source-engine origins were never approved school-calendar dates.
    // Where those proposals collide, reposition the proposal to the nearest
    // free teaching day in the SAME month. Retain originalDate+sourceId.
    const month=x.date.slice(0,7)
    const teachingDays=termDates?monthDays(month,start,end):[]
    const nearest=[x.date,...teachingDays.sort((a,b)=>
      Math.abs(Date.parse(a)-Date.parse(x.date))-
      Math.abs(Date.parse(b)-Date.parse(x.date))||a.localeCompare(b))]
      .filter(d=>dateValid(d)&&utcDate(d).getUTCDay()!==0&&!used.has(d))
    const updatedDate=nearest[0]||''
    if(updatedDate)used.add(updatedDate)
    return {...x,date:updatedDate,sourceProposalOrigin:x.origin,
      origin:'SCHOOL_POLICY_PROPOSAL',academicApproval:false}
  })
  const datedManual=effectiveChanges.filter(x=>!String(x.id).startsWith('src:')&&
    !String(x.id).startsWith('suggested:'))
  const schedule=[...sourceSchedule,...datedManual]
  for(const row of subjects){
    if(!termDates)continue
    const finalMonth=end.slice(0,7)
    for(let month=start.slice(0,7);month<=finalMonth;){
      const dates=monthDays(month,start,end)
      const bySubject=schedule.filter(a=>a.subjectId===row.id&&a.date.startsWith(month))
      const already=bySubject.length
      // Stable candidate IDs allow edits to survive recalculation and Save/Reopen.
      for(let ordinal=1;ordinal<=Math.max(0,2-already);ordinal++){
        const id='suggested:'+row.id+':'+month+':'+ordinal
        const override=effectiveChanges.find(x=>x.id===id)
        const taken=override&&dateValid(override.date)?override.date:null
        const half=ordinal===1?dates.slice(0,Math.ceil(dates.length/2)):
          dates.slice(Math.ceil(dates.length/2))
        // Prefer the established 17/24 October school planning anchors
        // when those dates are within this term; otherwise prefer the
        // second/fourth Saturday, with nearby weekdays as safe fallbacks.
        const anchors=month==='2026-10'?['2026-10-17','2026-10-24']:
          dates.filter(d=>utcDate(d).getUTCDay()===6)
        const desired=month==='2026-10'?anchors[ordinal-1]:
          anchors[ordinal===1?1:3]||half[Math.floor(half.length/2)]||''
        const preferred=[...half].sort((a,b)=>Math.abs(Date.parse(a)-Date.parse(desired))-
          Math.abs(Date.parse(b)-Date.parse(desired))||a.localeCompare(b))
          .concat(dates).filter(d=>!used.has(d))
        const proposed=taken||preferred[0]||''
        if(proposed)used.add(proposed)
        schedule.push({id,subjectId:row.id,subject:row.subject,
          date:proposed,name:'Assessment',origin:override?.origin||'SCHOOL_POLICY_PROPOSAL',
          originalDate:'',sourceId:'',academicApproval:false})
      }
      const next=utcDate(month+'-01')
      next.setUTCMonth(next.getUTCMonth()+1)
      month=next.toISOString().slice(0,7)
    }
  }
  // An edited auto-proposal that has become extra due to source records remains
  // visible for review, never silently deleted or promoted to original evidence.
  for(const x of effectiveChanges.filter(x=>String(x.id).startsWith('suggested:'))){
    if(!schedule.some(a=>a.id===x.id))schedule.push({...x,subject:x.subject||
      subjects.find(r=>r.id===x.subjectId)?.subject||'',academicApproval:false})
  }
  const ordered=schedule.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||
    subjects.findIndex(r=>r.id===a.subjectId)-subjects.findIndex(r=>r.id===b.subjectId)||
    a.id.localeCompare(b.id))
  const counter=new Map()
  return ordered.map(a=>{
    const n=(counter.get(a.subjectId)||0)+1
    counter.set(a.subjectId,n)
    return {...a,number:n}
  })
}
export function termAssessmentIssues(rows=[],assessments=[],calendar={}){
  const issues=[],byDate=new Map()
  const start=calendar.start,end=calendar.end
  for(const a of assessments){
    if(!a.date){issues.push('UNSCHEDULED_ASSESSMENT');continue}
    if(!dateValid(a.date)||a.date<start||a.date>end){
      issues.push('ASSESSMENT_OUTSIDE_TERM');continue
    }
    if(utcDate(a.date).getUTCDay()===0)issues.push('SUNDAY_ASSESSMENT')
    if(byDate.has(a.date))issues.push('ASSESSMENT_DATE_CONFLICT')
    byDate.set(a.date,a.id)
  }
  if(dateValid(start)&&dateValid(end)&&end>=start){
    const subjects=(rows||[]).filter(r=>r?.id&&r.subject)
    for(const row of subjects){
      for(let month=start.slice(0,7);month<=end.slice(0,7);){
        const count=assessments.filter(a=>a.subjectId===row.id&&a.date.startsWith(month)).length
        if(count!==2)issues.push('MONTHLY_SUBJECT_ASSESSMENT_COUNT')
        const date=utcDate(month+'-01');date.setUTCMonth(date.getUTCMonth()+1)
        month=date.toISOString().slice(0,7)
      }
    }
  }
  return [...new Set(issues)]
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
  // Second boundary: even a direct save caller must not forge source dates,
  // source labels, or approval from a replayed/manual planner payload.
  const locked=new Map()
  for(const row of rows)for(const event of row.events||[]){
    if(event.origin!=='ORIGINAL_SOURCE'||!dateValid(event.date)||
       event.date<start||event.date>end)continue
    const id='src:'+ [row.id,event.date,event.sourceId||'',event.origin].join('|')
    locked.set(id,{subjectId:row.id,subject:row.subject,date:event.date,
      originalDate:event.originalDate||event.date,sourceId:event.sourceId||'',
      name:event.name||'Assessment'})
  }
  for(const a of assessments||[]){
    if(a.academicApproval===true)
      throw Error('Academic approval cannot be granted by a term draft')
    const verified=locked.get(a.id)
    if(!verified){
      if(a.origin==='ORIGINAL_SOURCE')
        throw Error('Original assessment identity is not in the verified source')
      continue
    }
    if(a.origin!=='ORIGINAL_SOURCE'||a.subjectId!==verified.subjectId||
       a.subject!==verified.subject||a.date!==verified.date||
       a.originalDate!==verified.originalDate||a.sourceId!==verified.sourceId||
       a.name!==verified.name)
      throw Error('Original assessment provenance cannot be rewritten')
  }
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
