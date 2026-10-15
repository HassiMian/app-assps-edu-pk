'use strict'
const PRIVATE_MARKERS=new Set(['ASSPS_WEEKLY_NOTEBOOK_V1','ASSPS_TERM_NOTEBOOK_V1','ASSPS_DAILY_LESSON_NOTEBOOK_V1'])
const LOCKED_SOURCE_IDS=new Set([
 'lp_c5_sst_adiba_20261014',
 'lp_c6_pakstudies_adiba_20261014',
 'lp_primary_4assessment_adiba_20261014'
])
function documentOf(payload){
 const raw=payload&&typeof payload==='object'?payload:{}
 return raw.plannerDocument&&typeof raw.plannerDocument==='object'?raw.plannerDocument:raw
}
function provenanceOf(payload){
 const doc=documentOf(payload)
 return doc.provenance&&typeof doc.provenance==='object'?doc.provenance:{}
}
function isLockedSourceDocument(id){
 return LOCKED_SOURCE_IDS.has(String(id||''))
}
function mustHoldLessonPublication(payload,id){
 const raw=payload&&typeof payload==='object'?payload:{}
 const doc=documentOf(raw)
 const origins=[doc.provenance,raw.provenance].filter(x=>x&&typeof x==='object')
 return isLockedSourceDocument(id)||
   ['staged_verified','source_review','source_review_required'].includes(
     String(raw.status||doc.status||'').toLowerCase())||
   origins.some(p=>PRIVATE_MARKERS.has(String(p.marker||'').trim())||
     String(p.academicPublication||'').toUpperCase()==='BLOCKED')
}
function privateLessonMutationAllowed(existing,proposed,id){
 if(isLockedSourceDocument(id))return false
 if(!mustHoldLessonPublication(existing,id))return true
 if(!mustHoldLessonPublication(proposed,id))return false
 const previous=documentOf(existing),next=documentOf(proposed)
 const a=provenanceOf(existing),b=provenanceOf(proposed)
 for(const key of ['marker','sourceZipSha256','weeklyKey','termKey','dailyKey','sourceArchiveScope','sourceApplicability','academicPublication']){
   if(String(a[key]||'')!==String(b[key]||''))return false
 }
 if(String(b.academicPublication||'').toUpperCase()!=='BLOCKED')return false
 for(const key of ['classLevel','section','planningType','startDate','endDate']){
   if(String(previous[key]||'')!==String(next[key]||''))return false
 }
 return true
}
module.exports={
 PRIVATE_MARKERS,isLockedSourceDocument,mustHoldLessonPublication,
 privateLessonMutationAllowed
}
