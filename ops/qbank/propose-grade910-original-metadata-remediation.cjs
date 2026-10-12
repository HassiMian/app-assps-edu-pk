#!/usr/bin/env node
'use strict'
// Non-destructive SHAfrozen original metadata + 24 legacy MCQ answer-key *research* proposals only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const sources=require('./build-grade910-blind-faculty-packets.cjs')
const ROOT=path.resolve(__dirname,'../..')
const manifest=require(path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging/officialSourceManifest.json'))
const OUT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_50_ORIGINAL_LANGUAGE_METADATA_24_MCQ_PROPOSALS_20261012.json')
const TXT=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_ORIGINAL_METADATA_REMEDIATION_PREVIEW_20261012.md')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').replace(/[.!?۔؟。]+$/u,'').trim()
const bad=x=>{throw Error('GRADE910_METADATA_SOURCE_PROPOSAL_'+x)}
function proposal(q,sourceRow,book){
 const grade=sourceRow.gradeClaim,subject=sourceRow.subjectClaim
 const english=q.id.startsWith('IX-ENG-ORIG-')&&grade==null&&subject==null&&
  sourceRow.originalSourceFile==='english9CompetencyOriginals2026.json'
 const biology=q.id.startsWith('IX-BIO-EM-RESEARCH-')&&grade===9&&subject==='biology'&&
  sourceRow.originalSourceFile==='biology9TopicResearchDrafts.json'
 if(!english&&!biology)bad('UNEXPECTED_MISSING_LANGUAGE_ORIGINAL_ID')
 if(book.recordId!==sourceRow.originalSourceCatalogId||
  book.grade!==9||!book.pdfSha256||!['English','Biology'].includes(book.subject))
  bad('SOURCE_CONTEXT_CATALOG_MISMATCH')
 const languageEvidence=english?
  'Original English competency stem and English-only grammar answer':
  'Original English biology stem/answer present; Urdu translation may be present and needs independent semantic review'
 if(biology&&(!q.content?.en?.stem||!q.content?.en?.answer))bad('BIOLOGY_ENGLISH_CONTENT_NOT_PROVEN')
 const bilingual=Boolean(biology&&q.content?.ur?.stem&&q.content?.ur?.answer)
 if(english&&(!q.stem||!q.answer))bad('ENGLISH_SOURCE_LANGUAGE_NOT_PROVEN')
 let key=null
 if(english&&q.type==='mcq'){
  if(q.correctOptionId!=null||!Array.isArray(q.options)||q.options.length!==4)
   bad('LEGACY_MCQ_OPTION_SET_CHANGED')
  const matches=q.options.map((o,i)=>norm(o)===norm(q.answer)?i:-1).filter(i=>i>=0)
  if(matches.length!==1)bad('LEGACY_MCQ_ANSWER_NO_UNIQUE_TEXT_POSITION')
  key='ABCD'[matches[0]]
 }
 return{originalQuestionId:q.id,
  originalQuestionRevisionSha256:sourceRow.originalQuestionRevisionSha256,
  originalSourceFileSha256:sourceRow.originalSourceFileSha256,
  originalSourceCatalogRecordId:book.recordId,
  existingClaim:{grade:grade??null,subject:subject??null,medium:sourceRow.mediumClaim||null,
   questionPdfSha256:q.source?.pdfSha256||null},
  academicResearchProposalOnly:{
   grade:9,subject:english?'english':'biology',medium:bilingual?'dual':'english',
   originalMcqPositionFromMatchingAnswerText:key,
   catalogPdfSha256ForContextOnly:book.pdfSha256,
   catalogEditionLabelNotSchoolAdoption:book.edition,
   actualSchoolEditionAndExamYear:'UNVERIFIED',
   physicalTextbookPageExercise:'UNVERIFIED',
   originalAnswerAcademicallyCorrect:'UNVERIFIED',
   independentReviewerAndSubjectApproval:'REQUIRED',
   originalRevisionMutationAuthorized:false},
  evidenceBasis:languageEvidence,academicallyApproved:false,published:false}
}
function build(){
 const {queue,candidates}=sources.inventory()
 const catalogue=new Map(manifest.entries.map(x=>[x.recordId,x]))
 const rows=[]
 for(const r of queue.rows){
  if(r.mediumClaim!=null)continue
  const record=candidates.get(r.originalQuestionId)
  if(!record||sha(JSON.stringify(record.q))!==r.originalQuestionRevisionSha256)
   bad('SOURCE_FROZEN_REVISION_MISMATCH')
  rows.push(proposal(record.q,r,catalogue.get(r.originalSourceCatalogId)))
 }
 rows.sort((a,b)=>a.originalQuestionId.localeCompare(b.originalQuestionId))
 const keyProposal=rows.filter(x=>x.academicResearchProposalOnly.originalMcqPositionFromMatchingAnswerText)
 const missingPdf=rows.filter(x=>!x.existingClaim.questionPdfSha256)
 const bio=rows.filter(x=>x.academicResearchProposalOnly.subject==='biology')
 const bioDual=bio.filter(x=>x.academicResearchProposalOnly.medium==='dual')
 const bioEnglish=bio.filter(x=>x.academicResearchProposalOnly.medium==='english')
 if(rows.length!==50||keyProposal.length!==24||missingPdf.length!==44||bio.length!==6||bioDual.length!==2||bioEnglish.length!==4)
  bad('ACTUAL_50_META_24_MCQ_44_PDF_POPULATION_CHANGED')
 return{schemaVersion:'assps-50-original-meta-and-mcq-proposals-v1',
  originalUnchangedCount:2581,originalQuestionMediumUnstatedCount:50,
  sourceInferredEnglishCompetencyGradeAndSubjectCount:44,
  sourceInferredBiologyLanguageCount:6,sourceBiologyBilingualDrafts:2,sourceBiologyEnglishOnlyDrafts:4,
  originalLegacyMcqCorrectOptionResearchProposals:24,
  questionLevelPdfShaAbsentOriginals:44,
  sourceContextCatalogShaIsNotIndividualPdfClaim:true,
  academicallyApproved:0,verifiedPublished:0,
  originalQuestionsChanged:0,reviewRequired:true,
  releaseDecision:'DENY_UNTIL_INDEPENDENT_SCHOOL_SOURCE_AND_SUBJECT_SIGNOFF',
  rows}
}
function write(){
 const x=build()
 fs.writeFileSync(OUT,JSON.stringify(x,null,2)+'\n')
 fs.writeFileSync(TXT,[
 '# ASSPS IX-X original source gaps: 50 language/metadata proposals and 24 MCQ positions',
 '',
 'Research candidates preserved; no original question, answer or option changes.',
 '',
 '**44 legacy original English Grade IX candidates:** original grade/subject/medium unset; grade 9 / subject English / English medium are proposed from original English-only stems plus PECTAA catalog-004 English grade 9 context. The ORIGINAL question-level PDF SHA is missing; the catalog source SHA is provided as catalog background and MUST NOT be copied into the original question as fabricated question-level evidence.',
 '',
 '**6 Biology Grade IX originals:** original medium unset. Four have only English stems/answers; TWO contain both English and Urdu stems/answers, therefore DUAL-language proposal rather than erroneously treating all six as English-only. Urdu semantic parity and school-approved medium remain unresolved.',
 '',
 '**24 old English MCQ originals:** A–D answer positions proposed by matching existing original answer string to exactly one original option string. This verifies internal data consistency ONLY, not answer correctness/distractor quality; no keys reordered or corrected automatically.',
 '',
 'Each proposal binds exact original question revision SHA, source file SHA and original catalog record. All proposed grade, edition, chapter, medium, actual school adoption, 2027 exam relevance and academic answer correctness still need independent qualified approval. All proposed fields remain separate from original authoring.',
 '',
 '**Approved: 0; Published: 0; Original changes: 0; Release HOLD.**'
 ].join('\n')+'\n')
 return{proposals:x.rows.length,mcqPositionProposals:x.originalLegacyMcqCorrectOptionResearchProposals,
  approved:0,sourceBytesChanged:0}
}
if(require.main===module)console.log(JSON.stringify(process.argv.includes('--write')?write():build()))
module.exports={build,proposal,write,OUT,TXT}
