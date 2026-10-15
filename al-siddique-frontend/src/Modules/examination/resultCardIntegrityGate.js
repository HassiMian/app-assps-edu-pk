import {schoolClassOrderKey} from '../../services/schoolClassOrder.js'

// Pure, provenance-preserving reconciler. Never create a numerical mark from an
// unavailable result. Offered subjects are sourced from the existing, authorized
// GET /api/exams?include_subjects=1 backend contract.
const key=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g,' ')
export function reconcileOfficialSubjectRoster({student,exam,rows=[]}={}){
 const classKey=schoolClassOrderKey(student?.className||student?.class||'')
 const sectionKey=key(student?.section)
 const catalog=Array.isArray(exam?.subject_offerings)?exam.subject_offerings:null
 const offeringRows=(catalog||[]).filter(x=>
   schoolClassOrderKey(x.class_name)===classKey&&key(x.section)===sectionKey)
 const configured=new Map(offeringRows.filter(x=>x.subject).map(x=>[key(x.subject),x]))
 const recorded=new Set(rows.map(x=>key(x.subject)))
 const missing=[...configured].filter(([id])=>!recorded.has(id)).map(([,offering])=>offering)
 const unexpected=[...recorded].filter(id=>configured.size>0&&!configured.has(id))
 const placeholders=missing.map(row=>({
   subject:row.subject,total_marks:row.total_marks,
   marks_obtained:null,result_status:'PENDING',
   missing_configured_subject:true,
   remarks:'Not entered — draft result'
 }))
 const missingCatalog=catalog===null || offeringRows.length===0
 const flagged=rows.some(row=>{
   const status=String(row.result_status??'').toUpperCase()
   return row.marks_obtained===null||row.marks_obtained===undefined||
     row.marks_obtained===''||(status&&status!=='SCORED')
 })
 const reasons=[
  ...(missingCatalog?['Subject roster not verified']:[]),
  ...(missing.length?[missing.length+' configured subject(s) not entered']:[]),
  ...(unexpected.length?[unexpected.length+' saved subject(s) not matched to configured roster']:[]),
  ...(flagged?['Pending, absent or excused result row(s)']:[])
 ]
 return {rows:[...rows,...placeholders],audit:{
  status:reasons.length?'DRAFT':'READY_FOR_REVIEW',
  catalogVerified:!missingCatalog,
  missingCount:missing.length,unexpectedCount:unexpected.length,
  reasons,expectedCount:configured.size,savedCount:rows.length,
  // READY_FOR_REVIEW is not academic publication or signed approval.
  approved:false
 }}
}

export function findGradeForPercent(percentage,bands=[]){
 if(typeof percentage!=='number'||!Number.isFinite(percentage)||
   percentage<0||percentage>100||!Array.isArray(bands)||!bands.length)return null
 if(!bands.every(b=>Number.isFinite(Number(b.from))&&Number.isFinite(Number(b.to))&&
   Number(b.from)<=Number(b.to)))return null
 const isWhole=bands.every(b=>Number.isInteger(Number(b.from))&&Number.isInteger(Number(b.to)))
 const pct=isWhole?Math.floor(percentage):percentage
 const matches=bands.filter(b=>pct>=Number(b.from)&&pct<=Number(b.to))
 return matches.length===1?matches[0]:null
}
