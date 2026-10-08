#!/usr/bin/env node
'use strict'
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
require('/var/www/apex-backend/node_modules/dotenv').config({path:'/var/www/apex-backend/.env',quiet:true})
const SOURCE_REGISTRY=require('../../al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json')

const CLAIM=/^PECTAA\s+(pectaa-catalog-\d+)\s*\|\s*([a-f0-9]{64})\s*\|\s*(page|chapter)\s*(\d+)\s*$/i
const GRADE_ALIASES=new Map([['9th',9],['09',9],['9',9],['9th class',9],['10th',10],['10',10]])
const canonical=v=>String(v==null?'':v).trim().toLowerCase().replace(/[\s_-]+/g,' ')
const sourceMap=new Map(SOURCE_REGISTRY.entries.map(e=>[e.recordId,e]))
const anchorPath='/root/workspace/assps-grade910-source-cache-audit-20261008/docs/question-bank/ASSPS_CHEM9_TOC_PAGE_ANCHORS_20261008.json'
const officialChemPdf='/root/workspace/qbank-source-cache/20261008/official-verified/chemistry9-pectaa-007.pdf'
const anchors=fs.existsSync(anchorPath)?JSON.parse(fs.readFileSync(anchorPath,'utf8')):null
const fileIdentity=fs.existsSync(officialChemPdf)?crypto.createHash('sha256').update(fs.readFileSync(officialChemPdf)).digest('hex'):null
const catalogChemistry=sourceMap.get('pectaa-catalog-007')
const chemistryPdfHashVerified=Boolean(fileIdentity && fileIdentity===catalogChemistry.pdfSha256 && fileIdentity===anchors?.expectedSha256)
const FLAG_ORDER=[
 'QUESTION_NOT_ACADEMICALLY_APPROVED','SOURCE_CLAIM_MISSING_OR_UNSTRUCTURED',
 'SOURCE_RECORD_UNKNOWN','SOURCE_ID_HASH_MISMATCH','SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH',
 'SOURCE_EDITION_SESSION_REVIEW_REQUIRED','SOURCE_PAGE_COLUMN_MISSING',
 'SOURCE_PAGE_NUMBER_INCONSISTENT','CHAPTER_PAGE_CLAIM_OUTSIDE_TOC',
 'CHAPTER_PAGE_INDEX_NOT_VERIFIED','TEACHING_SESSION_NOT_DECLARED','MCQ_OPTIONS_MALFORMED','MCQ_KEY_INVALID',
 'CHAPTER_NUMBER_OUTSIDE_VERIFIED_CHEM9_TOC','DUPLICATE_CANDIDATE','NO_OFFICIAL_SOURCE_PAGE_IMAGE_REVIEW'
]
function parseClaim(value){
 const raw=String(value||'').trim()
 const matched=CLAIM.exec(raw)
 if(!matched)return null
 return {recordId:matched[1].toLowerCase(),sha256:matched[2].toLowerCase(),
   type:matched[3].toLowerCase(),number:Number(matched[4])}
}
function normalizeOptions(options){
 if(Array.isArray(options))return options.map(x=>({id:canonical(x?.id).toUpperCase(),text:String(x?.text||'').trim()}))
 if(options&&typeof options==='object')
  return Object.entries(options).map(([key,value])=>({id:canonical(key).toUpperCase(),text:String(value||'').trim()}))
 return []
}
function auditRow(row,{seen}={}){
 const flags=new Set(['QUESTION_NOT_ACADEMICALLY_APPROVED','NO_OFFICIAL_SOURCE_PAGE_IMAGE_REVIEW'])
 if(!['academicSession','curriculumSession','session'].some(k=>String(row.metadata?.[k]||'').trim()))
   flags.add('TEACHING_SESSION_NOT_DECLARED')
 const grade=GRADE_ALIASES.get(canonical(row.class_level))||null
 const claim=parseClaim(row.metadata?.source)
 const registry=claim?sourceMap.get(claim.recordId):null
 if(!claim)flags.add('SOURCE_CLAIM_MISSING_OR_UNSTRUCTURED')
 if(claim&&!registry)flags.add('SOURCE_RECORD_UNKNOWN')
 if(registry){
   if(registry.pdfSha256!==claim.sha256)flags.add('SOURCE_ID_HASH_MISMATCH')
   if(registry.grade!==grade || canonical(registry.subject)!==canonical(row.subject) ||
      canonical(registry.medium)!==canonical(row.medium))
      flags.add('SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH')
   if(!/^\d{4}-\d{2}$/.test(registry.edition))
      flags.add('SOURCE_EDITION_SESSION_REVIEW_REQUIRED')
   // Even a cryptographic match to a source PDF cannot establish the question
   // location, answer quality, author's rights, or edition used in class.
 }
 const page=row.source_page_no==null?null:Number(row.source_page_no)
 if(page==null)flags.add('SOURCE_PAGE_COLUMN_MISSING')
 if(page!=null&&(!Number.isInteger(page)||page<1))flags.add('SOURCE_PAGE_NUMBER_INCONSISTENT')
 if(page!=null&&claim?.type==='page'&&claim.number!==page)
   flags.add('SOURCE_PAGE_NUMBER_INCONSISTENT')
 let chem9Plausible=null
 if(grade===9&&canonical(row.subject)==='chemistry'&&claim?.recordId==='pectaa-catalog-007'){
   const chapter=Number(row.chapter_no)
   const toc=anchors?.chapters.find(x=>x.chapter===chapter)
   if(!toc)flags.add('CHAPTER_NUMBER_OUTSIDE_VERIFIED_CHEM9_TOC')
   else if(claim.type==='page'){
     const printed=claim.number>=toc.printedPageStart&&claim.number<=toc.printedPageEnd
     const physical=claim.number>=toc.pdfPhysicalPageStart&&claim.number<=toc.pdfPhysicalPageEnd
     chem9Plausible=printed||physical
     if(!chem9Plausible)flags.add('CHAPTER_PAGE_CLAIM_OUTSIDE_TOC')
     if(printed&&physical)flags.add('CHAPTER_PAGE_INDEX_NOT_VERIFIED')
   } else flags.add('CHAPTER_PAGE_INDEX_NOT_VERIFIED')
 }
 if(canonical(row.question_type)==='mcq'){
   const options=normalizeOptions(row.options)
   const key=canonical(row.correct_option).toUpperCase()
   if(options.length!==4||new Set(options.map(x=>x.id)).size!==4||
      ['A','B','C','D'].some(k=>!options.some(x=>x.id===k&&x.text.length>0)))
      flags.add('MCQ_OPTIONS_MALFORMED')
   if(!['A','B','C','D'].includes(key)||!options.some(x=>x.id===key&&x.text))
      flags.add('MCQ_KEY_INVALID')
 }
 // The same text appearing within a tenant/grade/subject/medium is a review
 // candidate, not proof that one of the questions should be deleted.
 const fingerprint=[row.school_id,grade,canonical(row.subject),canonical(row.medium),
   canonical(row.question_text)].join('|')
 if(seen&&canonical(row.question_text)){
   if(seen.has(fingerprint))flags.add('DUPLICATE_CANDIDATE')
   else seen.add(fingerprint)
 }
 const sorted=[...flags].sort((a,b)=>FLAG_ORDER.indexOf(a)-FLAG_ORDER.indexOf(b))
 return {questionId:String(row.id),schoolId:Number(row.school_id),grade,subject:row.subject,
   medium:row.medium,chapter:String(row.chapter_no||''),questionType:row.question_type,
   claimedRecordId:claim?.recordId||'',claimedHash:claim?.sha256||'',
   claimedPageType:claim?.type||'',claimedPage:claim?.number??null,
   structuredSourcePage:page,chem9TocRangePlausible:chem9Plausible,
   officialSourceFileIdentityVerified:claim?.recordId==='pectaa-catalog-007'?chemistryPdfHashVerified:null,
   correctOption:canonical(row.correct_option).toUpperCase(),academicApprovalGranted:false,flags:sorted}
}
function summarize(items){
 const grouped=new Map()
 const flagCounts={}
 for(const q of items){
   const key=[q.schoolId,q.grade,q.subject].join('|')
   const current=grouped.get(key)||{schoolId:q.schoolId,grade:q.grade,
     subject:q.subject,total:0,claimedStructured:0,sourcePageFields:0,academicApproved:0,
     mcqCount:0,mcqKeyCounts:{A:0,B:0,C:0,D:0},
     invalidSourceClaims:0,invalidMcqs:0,duplicateCandidates:0,chemistryRangePlausible:0}
   current.total++
   if(canonical(q.questionType)==='mcq'){
     current.mcqCount++
     if(current.mcqKeyCounts[q.correctOption]!==undefined)current.mcqKeyCounts[q.correctOption]++
   }
   if(q.claimedRecordId)current.claimedStructured++
   if(q.structuredSourcePage!=null)current.sourcePageFields++
   if(q.flags.some(f=>f.startsWith('SOURCE_RECORD_')||f.includes('HASH_MISMATCH')||
     f.includes('SCOPE_MISMATCH')||f==='SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH'))current.invalidSourceClaims++
   if(q.flags.includes('MCQ_OPTIONS_MALFORMED')||q.flags.includes('MCQ_KEY_INVALID'))current.invalidMcqs++
   if(q.flags.includes('DUPLICATE_CANDIDATE'))current.duplicateCandidates++
   if(q.chem9TocRangePlausible===true)current.chemistryRangePlausible++
   grouped.set(key,current)
   for(const f of q.flags)flagCounts[f]=(flagCounts[f]||0)+1
 }
 const editorialKeyWarnings=[...grouped.values()].filter(x=>x.mcqCount>=12 &&
   Math.max(...Object.values(x.mcqKeyCounts))/x.mcqCount>=0.8).map(x=>({
     schoolId:x.schoolId,grade:x.grade,subject:x.subject,mcqCount:x.mcqCount,
     mcqKeyCounts:x.mcqKeyCounts,dominantShare:Number((Math.max(...Object.values(x.mcqKeyCounts))/x.mcqCount).toFixed(4)),
     status:'EDITORIAL_REVIEW_NO_KEY_MUTATION',
   }))
 return {questionsInspected:items.length,editorialKeyWarnings,schoolCounts:Object.fromEntries(
   [...new Set(items.map(x=>x.schoolId))].map(id=>[id,items.filter(x=>x.schoolId===id).length])),
   flags:flagCounts,bySubject:[...grouped.values()].sort((a,b)=>a.schoolId-b.schoolId||
     a.grade-b.grade||a.subject.localeCompare(b.subject))}
}
function csv(rows){
 const cols=['questionId','schoolId','grade','subject','medium','chapter','questionType',
   'claimedRecordId','claimedHash','claimedPageType','claimedPage','structuredSourcePage',
   'chem9TocRangePlausible','officialSourceFileIdentityVerified','correctOption','academicApprovalGranted','flags']
 const cell=v=>'"'+String(Array.isArray(v)?v.join(';'):v??'').replace(/"/g,'""')+'"'
 return cols.join(',')+'\n'+rows.map(row=>cols.map(col=>cell(row[col])).join(',')).join('\n')+'\n'
}
async function main(){
 const out=process.argv[2]||'/root/secure-archive/assps-academic-review-20261008'
 if(!path.isAbsolute(out))throw Error('ABSOLUTE_OUTPUT_REQUIRED')
 const {pool}=require('../../al-siddique-backend/src/config/database')
 const all=[]
 try{
   for(const [schoolId,schoolCode] of [[1,'assps'],[5,'al-siddique']]){
     const client=await pool.connect()
     try{
       await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
       await client.query('SET LOCAL ROLE apex_app_runtime')
       await client.query("SELECT set_config('app.tenant_id',$1,true)",[String(schoolId)])
       const identity=(await client.query('SELECT current_database() AS db,current_user AS role')).rows[0]
       if(identity.db!=='apexos'||identity.role!=='apex_app_runtime')throw Error('INVALID_DB_SCOPE')
       const scope=(await client.query('SELECT code FROM schools WHERE id=$1',[schoolId])).rows[0]
       if(scope?.code!==schoolCode)throw Error('TENANT_CODE_MISMATCH')
       const result=await client.query(
         "SELECT id,school_id,class_level,subject,medium,chapter_no,question_type,"+
         "question_text,options,correct_option,source_page_no,metadata,is_approved FROM question_bank "+
         "WHERE school_id=$1 AND class_level IN ('9th','10th') ORDER BY class_level,subject,chapter_no,id",
         [schoolId])
       for(const row of result.rows)if(row.is_approved===true)throw Error('QUESTION_STATE_CHANGED_REQUIRES_NEW_AUDIT')
       const seen=new Set()
       all.push(...result.rows.map(row=>auditRow(row,{seen})))
       await client.query('COMMIT')
       console.log('ACADEMIC_READ_ONLY_TENANT_INSPECTED',schoolCode,result.rowCount)
     }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}
     finally{client.release()}
   }
   const summary=summarize(all)
   const report={schemaVersion:'assps-grade910-evidence-candidate-review-v1',
     generatedAt:new Date().toISOString(),database:'apexos',effectiveRole:'apex_app_runtime',
     scope:'READ_ONLY_TENANT_ISOLATED_NOT_ACADEMIC_APPROVAL',
     printedPageMappingStatus:'CHEMISTRY9_TOC_OCR_CANDIDATE_NOT_PAGE_IMAGE_VERIFIED',
     officialChemistry9PdfIdentityMatched:chemistryPdfHashVerified,
     sourceRegistrySha256:crypto.createHash('sha256').update(fs.readFileSync(
       path.resolve(__dirname,'../../al-siddique-backend/src/data/verifiedGrade910SourceRegistry.json'))).digest('hex'),
     summary}
   fs.mkdirSync(out,{recursive:true,mode:0o700})
   fs.chmodSync(out,0o700)
   fs.writeFileSync(path.join(out,'grade910-readonly-evidence-summary.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600})
   for(const [id,label] of [[1,'assps'],[5,'al-siddique']])
     fs.writeFileSync(path.join(out,label+'-question-review-queue.csv'),
       csv(all.filter(x=>x.schoolId===id)),{mode:0o600})
   console.log('ACADEMIC_SOURCE_AUDIT_READONLY_PASS',JSON.stringify({
     questions:summary.questionsInspected,schoolCounts:summary.schoolCounts,
     officialChemistry9PdfIdentityMatched:chemistryPdfHashVerified,
     sourcePageMissing:summary.flags.SOURCE_PAGE_COLUMN_MISSING||0,
     sessionMissing:summary.flags.TEACHING_SESSION_NOT_DECLARED||0,
     answerKeyEditorialGroups:summary.editorialKeyWarnings.length,
     sourceClaimMissing:summary.flags.SOURCE_CLAIM_MISSING_OR_UNSTRUCTURED||0,
     sourceScopeMismatch:summary.flags.SOURCE_GRADE_SUBJECT_MEDIUM_MISMATCH||0,
     invalidMCQ:((summary.flags.MCQ_OPTIONS_MALFORMED||0)+(summary.flags.MCQ_KEY_INVALID||0)),
     sourceChapterRangeMismatch:summary.flags.CHAPTER_PAGE_CLAIM_OUTSIDE_TOC||0,
     approvedByThisAudit:0,privateOutput:out
   }))
 }finally{await pool.end()}
}
if(require.main===module)main().catch(e=>{console.error('ACADEMIC_SOURCE_AUDIT_FAILED',e.stack||e);process.exitCode=1})
module.exports={parseClaim,normalizeOptions,auditRow,summarize,csv,chemistryPdfHashVerified}
