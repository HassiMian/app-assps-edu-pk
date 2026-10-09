#!/usr/bin/env node
'use strict'
// Read-only across authored-question records. Does not change school/approval ledgers.
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const {analyze}=require('./build-grade910-adoption-evidence-docket.cjs')
const ROOT=path.resolve(__dirname,'../..')
const INPUT=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const DATA=path.join(ROOT,'al-siddique-backend/src/data')
const DEST=path.join(ROOT,'docs/question-bank')
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex')
const label=value=>String(value??'').trim()
const stem=q=>label(q.stem||q.question_text||q.questionText||q.content?.en?.stem||q.content?.ur?.stem)
function examine({documents,registry,adoptions,physical}){
 if(!Array.isArray(documents)||!Array.isArray(registry?.entries))throw Error('FULL_EVIDENCE_INVALID_INPUT')
 const map=new Map(registry.entries.map(s=>[s.recordId,s]))
 const starter=[],supplement=[],excluded=[]
 const secondaryReferences=new Map()
 const filenames=new Set()
 let bilingualDrafts=0,secondaryReferencesChecked=0
 for(const d of documents){
  if(filenames.has(d.filename))throw Error('FULL_EVIDENCE_DUPLICATE_FILE:'+d.filename)
  filenames.add(d.filename)
  const rows=d.data?.drafts||d.data?.items||[]
  if(!rows.length)continue
  const authored=rows.filter(q=>q&&label(q.id)&&stem(q))
  if(!authored.length){
   // Authoring queues and exercise-index maps are not publishable questions.
   excluded.push({filename:d.filename,evidenceOnlyRecords:rows.length})
   continue
  }
  if(authored.length!==rows.length)throw Error('FULL_EVIDENCE_PARTIAL_AUTHORSHIP:'+d.filename)
  if(d.data.publicationAllowed!==false||d.data.liveImportAllowed!==false)
   throw Error('FULL_EVIDENCE_UNSAFE_PUBLISH_FLAG:'+d.filename)
  const normalized={filename:d.filename,fileSha256:d.fileSha256,
    data:{...d.data,drafts:authored}}
  if(d.filename.endsWith('Starter2026.json'))starter.push(normalized)
  else supplement.push(normalized)
  for(const q of authored){
   const languages=q.source?.languages||{}
   if(q.medium==='dual')bilingualDrafts++
   if(languages&&typeof languages==='object'&&!Array.isArray(languages)){
    for(const [lang,proof] of Object.entries(languages)){
     if(!['en','ur'].includes(lang))throw Error('FULL_EVIDENCE_UNKNOWN_LANGUAGE:'+q.id)
     const claimedSource=map.get(proof?.catalogRecordId)
     if(!claimedSource||label(proof.pdfSha256)!==label(claimedSource.pdfSha256))
      throw Error('FULL_EVIDENCE_LANGUAGE_SOURCE_HASH_DRIFT:'+q.id+':'+lang)
     secondaryReferencesChecked++
     secondaryReferences.set(lang+':'+claimedSource.recordId,
      (secondaryReferences.get(lang+':'+claimedSource.recordId)||0)+1)
    }
   }
  }
 }
 const start=analyze({registry,adoptions,physical,documents:starter})
 const additional=analyze({registry,adoptions,physical,documents:supplement})
 const full=analyze({registry,adoptions,physical,documents:[...starter,...supplement]})
 const sum=start.totals.starterDraftQuestions+additional.totals.starterDraftQuestions
 if(full.totals.starterDraftQuestions!==sum)throw Error('FULL_EVIDENCE_COHORT_COUNT_DISCREPANCY')
 const totalReasons=['nonExplicitEditionDrafts','draftEditionSourceDisagreements',
  'unresolvedSourceGradeDrafts','unresolvedSourceMediumDrafts']
 for(const key of totalReasons)
  if(start.totals[key]+additional.totals[key]!==full.totals[key])
   throw Error('FULL_EVIDENCE_COUNT_MISMATCH:'+key)
 // Do not imply source/adoption or human verification from a matching label/hash.
 return {
  schemaVersion:'assps-grade910-full-candidate-evidence-reconciliation-v1',
  scope:'ALL_AUTHORED_CANDIDATES_METADATA_ONLY_RESEARCH_NO_APPROVAL',
  teachingSession:adoptions.teachingSession,
  input:{starterFiles:starter.length,supplementalAuthoredFiles:supplement.length,
    sourceRegistryRecords:registry.entries.length,
    excludedEvidenceOnlyFiles:excluded,
    noSchoolAdoptionCertificate:adoptions.schoolBookAndExamYearApplicabilityCertified!==true,
    noPhysicalPageCertificate:physical.academicPageEvidenceCertified!==true},
  totals:{...full.totals,
    originalResearchCandidates:full.totals.starterDraftQuestions,
    starterCandidateQuestions:start.totals.starterDraftQuestions,
    supplementalCandidateQuestions:additional.totals.starterDraftQuestions,
    bilingualDeclaredQuestionDrafts:bilingualDrafts,
    secondaryLanguageSourceClaimsChecked:secondaryReferencesChecked},
  supplementalCohorts:additional.cohorts,
  fullCohorts:full.cohorts,
  secondaryLanguageSources:[...secondaryReferences].sort(([a],[b])=>a.localeCompare(b))
   .map(([source,count])=>({source,questionLanguageClaims:count})),
  sourceIdentityIntegrity:{
   questionIdsUnique:full.totals.distinctQuestionIds===full.totals.starterDraftQuestions,
   allDeclaredPrimaryPdfHashesMatchRegistry:true,
   allDeclaredSecondaryLanguageHashesMatchRegistry:true,
   independentPdfByteRehashInThisReport:false,
   schoolTextbookEditionIndependentlyCertified:false,
   physicalPageEvidenceIndependentlyVerified:false,
   humanQuestionApprovals:0,
  },
  caveats:[
   'This is source identity/metacatalog reconciliation of existing authored draft questions, NOT verified academic questions.',
   'The 58 excluded items are queue/exercise evidence MAP records; they are not authored question texts.',
   'Draft and source edition labels may disagree; grammar source grade 0 cannot automatically be assigned 9 or 10.',
   'Blocker counts overlap and cannot be added to compute a unique blocked population.',
   'A matching PDF SHA claimed by a draft is not a fresh rehash of book bytes or proof of school textbook adoption.',
   'Bilingual source identity is not independent English/Urdu semantic equivalence.',
  ],
 }
}
function format(result){
 const m=result
 const text=[
  '# ASSPS Grade IX–X — Full candidate cohort and adoption evidence (9 October 2026)',
  '',
  '**ALL RECORDS PROVISIONAL. Read-only research; no book/page certification, academic approval, production import or published questions.**',
  '',
  '## Exact scope and exclusions',
  '',
  `- **${m.totals.originalResearchCandidates.toLocaleString('en-US')} original authored question candidates**: ${m.totals.starterCandidateQuestions.toLocaleString('en-US')} previously covered Starter2026 questions plus ${m.totals.supplementalCandidateQuestions} additional authored questions in ${m.input.supplementalAuthoredFiles} files.`,
  `- **${m.input.starterFiles+m.input.supplementalAuthoredFiles} authored files**. **${m.input.excludedEvidenceOnlyFiles.reduce((s,x)=>s+x.evidenceOnlyRecords,0)} non-question records** in ${m.input.excludedEvidenceOnlyFiles.length} evidence/authoring queue files deliberately excluded.`,
  `- ${m.totals.referencedSourceRecords} canonical primary source IDs among ${m.input.sourceRegistryRecords} source registry entries. ${m.totals.bilingualDeclaredQuestionDrafts} bilingual-declared drafts; ${m.totals.secondaryLanguageSourceClaimsChecked} separately checked source-language PDF hash claims.`,
  '',
  '## Unresolved school adoption and textbook evidence',
  '',
  `- Explicit edition label ineligible for original academic review: **${m.totals.nonExplicitEditionDrafts}** candidate questions.`,
  `- Draft edition label differs from canonical source ledger: **${m.totals.draftEditionSourceDisagreements}** candidate questions.`,
  `- Unresolved grade association: **${m.totals.unresolvedSourceGradeDrafts}** candidate questions; medium unresolved/mismatched: **${m.totals.unresolvedSourceMediumDrafts}**.`,
  '- These are **overlapping evidence flags**, not mutually exclusive counts.',
  '- Actual ASSPS teaching-session/book/board-year adoption remains uncertified; printed book page/exercise evidence remains uncertified; human source/answer/translation reviewer signoff remains absent.',
  '- **Human source verified 0; independently reviewed 0; approved 0; academically verified published 0.**',
  '',
  '## Supplemental 485 candidates — source/cohort mapping',
  '',
  '| Source ID | Grade | Subject | Medium | Edition label | Supplemental drafts | Blockers |',
  '|---|---:|---|---|---|---:|---|',
 ]
 const esc=v=>String(v??'').replace(/\|/g,'\\|')
 for(const x of m.supplementalCohorts){
  text.push(`| ${esc(x.sourceRecordId)} | ${esc(x.grade)} | ${esc(x.subject)} | ${esc(x.medium)} | ${esc(x.editionLabel)} | ${x.stagedDrafts} | ${x.blockers.filter(x=>x!=='INDEPENDENT_HUMAN_ANSWER_AND_TEXTBOOK_REVIEW_REQUIRED').join(', ')} |`)
 }
 text.push('','## Required next academic actions','',
 '1. Obtain an actual signed ASSPS adoption record for grade, subject, medium, textbook title/edition and board examination year. Do not mistake catalog PDF publication for adoption.',
 '2. Verify independent scanned/printed chapter and exercise page identity, exercise number and physical PDF page, with genuine human reviewer evidence.',
 '3. Resolve provisional source medium/grade/edition ambiguities and bilingual Biology source mapping; never silently assign the unknown Urdu grammar source grade.',
 '4. Bind each correctly authored question to its independently reviewed answer, originality, difficulty and exact immutable revision; only then consider academic approval.',
 '5. Paper Studio must keep Grade IX/X academically verified selector disabled/empty until SaaS Core completes release and tenant/RLS certification.',
 '','**No production deployment.**')
 return text.join('\n')+'\n'
}
function run(){
 const raw=fs.readdirSync(INPUT).filter(f=>f.endsWith('.json')).sort().map(filename=>{
  const bytes=fs.readFileSync(path.join(INPUT,filename))
  return {filename,fileSha256:sha(bytes),data:JSON.parse(bytes)}
 })
 const read=name=>JSON.parse(fs.readFileSync(path.join(DATA,name)))
 const result=examine({documents:raw,registry:read('verifiedGrade910SourceRegistry.json'),
  adoptions:read('asspsGrade910SchoolAdoptions.json'),
  physical:read('asspsGrade910PhysicalPageEvidence.json')})
 fs.writeFileSync(path.join(DEST,'ASSPS_GRADE910_FULL_2581_CANDIDATE_EVIDENCE_20261009.json'),JSON.stringify(result,null,2)+'\n')
 fs.writeFileSync(path.join(DEST,'ASSPS_GRADE910_FULL_2581_CANDIDATE_EVIDENCE_20261009.md'),format(result))
 console.log(JSON.stringify({input:result.input,totals:result.totals,sourceIdentityIntegrity:result.sourceIdentityIntegrity}))
}
if(require.main===module)run()
module.exports={examine,format}
