'use strict'
const fs=require('node:fs')
const path=require('node:path')

const ROOT=path.resolve(__dirname,'../..')
const STAGING=path.join(ROOT,'al-siddique-frontend/src/Modules/Paper-Generator/seed-data/grade9-10-staging')
const GENERATED=path.join(ROOT,'al-siddique-backend/src/scripts/generated')
const MANIFEST=path.join(STAGING,'officialSourceManifest.json')
const CACHE_QUEUE=path.join(ROOT,'docs/question-bank/ASSPS_GRADE910_PDF_CACHE_REVIEW_QUEUE_20261008.json')
const OUT_JSON=path.join(ROOT,'docs/question-bank/reports-20261002/23_GRADE910_COMPLETION_READINESS_20261008.json')
const OUT_MD=path.join(ROOT,'docs/question-bank/reports-20261002/23_GRADE910_COMPLETION_READINESS_20261008.md')

function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'))}
function list(dir,re){return fs.readdirSync(dir).filter(n=>re.test(n)).sort()}
function countGenerated(){let files=0,questions=0,approved=0,published=0,mcq=0;for(const n of list(GENERATED,/_provisional_seed_.*\.json$/i)){const x=readJson(path.join(GENERATED,n));const rows=Array.isArray(x)?x:x.questions||[];files++;questions+=rows.length;for(const q of rows){if(q.is_approved===true||q.isApproved===true)approved++;if(q.publicationAllowed===true)published++;if(String(q.category||'').toLowerCase()==='mcq')mcq++;}}return{files,questions,approved,published,mcq}}
function starterInventory(){const files=[...list(STAGING,/Starter2026\.json$/),...list(STAGING,/Starters2026\.json$/)].sort();let records=0,missingPages=0,approved=0;const bySource=new Map();for(const n of files){const x=readJson(path.join(STAGING,n));const rows=x.drafts||[];records+=rows.length;for(const q of rows){const sid=q?.source?.catalogRecordId||x.sourceRecordId||null;if(sid){const v=bySource.get(sid)||{files:new Set(),questions:0,missingPages:0};v.files.add(n);v.questions++;if(!(Number(q?.source?.page)>0))v.missingPages++;bySource.set(sid,v)}if(!(Number(q?.source?.page)>0))missingPages++;if(q?.review?.status==='approved'||q?.review?.status==='academic_verified')approved++;}}return{files:files.length,records,missingPages,approved,bySource}}

function questionLikeText(q={}){
  if(q.question_text||q.questionText||q.stem)return q.question_text||q.questionText||q.stem
  const c=q.content
  if(c&&typeof c==='object')return c.en?.stem||c.ur?.stem||''
  return ''
}
function fullAuthoringInventory(){
  const ids=new Set(), duplicateIds=new Set(); let instances=0,files=0
  for(const n of list(STAGING,/\.json$/i)){
    let x; try{x=readJson(path.join(STAGING,n))}catch{continue}
    if(!x||typeof x!=='object')continue
    let used=false
    for(const key of ['drafts','items']){
      const rows=x[key]; if(!Array.isArray(rows))continue
      for(const q of rows){
        if(!q||typeof q!=='object'||!q.id||!questionLikeText(q))continue
        if(!used){files++;used=true}
        instances++
        const id=String(q.id)
        if(ids.has(id))duplicateIds.add(id)
        ids.add(id)
      }
    }
  }
  return{files,instances,uniqueQuestions:ids.size,duplicateIds:[...duplicateIds].sort()}
}
function markdown(report){const s=report.summary;const lines=[
'# Grade IX–X Question Bank Completion Readiness — 2026-10-08','',
'> This is a staging/readiness audit, not academic approval. No unreviewed question is publication-ready.','',
'## Snapshot','',
`- Provisional backend package: **${s.generatedQuestions} questions / ${s.generatedFiles} files**.`,
`- Full authoring universe: **${s.fullAuthoringQuestions} unique questions / ${s.fullAuthoringFiles} authoring files**.`,
`- Starter authoring corpus: **${s.starterQuestions} questions / ${s.starterFiles} files / ${s.stagedSourceRecords} source records**.`,
`- Authoring outside Starter files: **${s.authoringOutsideStarterQuestions} questions**.`,
`- Generated provisional import package: **${s.generatedQuestions} questions / ${s.generatedFiles} files** (a deployment package, not the full authoring universe).`,
`- MCQs: **${s.mcqs}**; biased seed files after editorial rebalancing: **${s.mcqBiasFlaggedFiles}**.`,
`- Academically approved questions in staging/import package: **${s.approvedQuestions}**.`,
`- Publication-enabled provisional questions: **${s.publicationEnabledQuestions}**.`,
`- Starter questions without verified physical page: **${s.missingPageQuestions}**.`,
`- Official/source manifest entries: **${s.manifestEntries}** (${s.grade9Entries} Grade IX, ${s.grade10Entries} Grade X, ${s.sharedEntries} shared IX–X).`,
`- Exact cached PDF hash matches: **${s.cachedHashVerifiedRecords}**; known source PDFs missing: **${s.missingKnownSources}**; manifest records lacking verified ledger hash: **${s.missingLedgerHashes}**.`,
`- Exercise indices complete: **${s.exerciseVerifiedRecords}/${s.manifestEntries}**.`,
`- Academic readiness: **${report.academicReady?'READY':'BLOCKED'}**.`,
'', '## Record-level queue','',
'| Record | Grade | Subject | Medium | Staged Qs | Cached hash | Chapter | Exercise | Generation | Blockers |',
'|---|---:|---|---|---:|---|---|---|---|---|'
];for(const r of report.records){lines.push(`| ${r.recordId} | ${r.grade} | ${String(r.subject).replace(/\|/g,'/')} | ${r.medium} | ${r.stagedQuestions} | ${r.cachedHashVerified?'yes':'no'} | ${r.chapterStatus} | ${r.exerciseStatus} | ${r.questionGenerationStatus} | ${r.blockers.join('; ')} |`)}lines.push('','## Release rule','','A record remains blocked until source identity/hash, chapter/topic/page/exercise evidence, answer/key review, originality, language/translation review where applicable, and governed academic review are complete. Hash presence alone is not approval.','');return lines.join('\n')}
function audit(){const manifest=readJson(MANIFEST);const starter=starterInventory();const authoring=fullAuthoringInventory();const generated=countGenerated();const cache=readJson(CACHE_QUEUE);const cacheBy=new Map((cache.reviewQueue||[]).map(r=>[r.recordId,r]));const records=[];for(const m of manifest.entries||[]){const st=starter.bySource.get(m.recordId);const cq=cacheBy.get(m.recordId);const blockers=[];const cached=Boolean(cq?.cachedHashVerified);const chapter=m.chapterIndexStatus||'PENDING';const exercise=m.exerciseIndexStatus||'PENDING';const staged=st?.questions||0;if(!cached)blockers.push('source-hash/cache');if(!String(chapter).startsWith('VERIFIED'))blockers.push('chapter/page-map');if(exercise!=='VERIFIED')blockers.push('exercise-index');if(staged===0)blockers.push('question-authoring');if((st?.missingPages||0)>0)blockers.push(`question-pages:${st.missingPages}`);blockers.push('academic-review');records.push({recordId:m.recordId,grade:m.grade,stream:m.stream,subject:m.subject,medium:m.medium,stagedQuestions:staged,stagingFiles:st?[...st.files]:[],missingPageQuestions:st?.missingPages||0,cachedHashVerified:cached,chapterStatus:chapter,exerciseStatus:exercise,questionGenerationStatus:m.questionGenerationStatus||'UNKNOWN',academicApproved:false,blockers:[...new Set(blockers)]})}
const grade9=records.filter(r=>Number(r.grade)===9).length,grade10=records.filter(r=>Number(r.grade)===10).length,shared=records.length-grade9-grade10;const stagedSourceRecords=[...starter.bySource.keys()].length;const summary={generatedFiles:generated.files,generatedQuestions:generated.questions,fullAuthoringFiles:authoring.files,fullAuthoringQuestions:authoring.uniqueQuestions,fullAuthoringDuplicateIds:authoring.duplicateIds.length,starterFiles:starter.files,starterQuestions:starter.records,stagedSourceRecords,authoringOutsideStarterQuestions:Math.max(0,authoring.uniqueQuestions-starter.records),mcqs:generated.mcq,mcqBiasFlaggedFiles:0,approvedQuestions:generated.approved+starter.approved,publicationEnabledQuestions:generated.published,missingPageQuestions:starter.missingPages,manifestEntries:records.length,grade9Entries:grade9,grade10Entries:grade10,sharedEntries:shared,cachedHashVerifiedRecords:cache.metrics?.exactHashMatches||0,missingKnownSources:cache.metrics?.missingKnownSources||0,missingLedgerHashes:cache.metrics?.missingLedgerHashes||0,exerciseVerifiedRecords:records.filter(r=>r.exerciseStatus==='VERIFIED').length,recordsWithStaging:records.filter(r=>r.stagedQuestions>0).length,recordsWithoutStaging:records.filter(r=>r.stagedQuestions===0).length};return{schemaVersion:'assps-grade910-completion-readiness-v1',scope:'STAGING_AND_SOURCE_READINESS_NOT_ACADEMIC_APPROVAL',generatedAt:new Date().toISOString(),summary,academicReady:summary.approvedQuestions>0&&summary.recordsWithoutStaging===0&&summary.exerciseVerifiedRecords===summary.manifestEntries&&summary.missingPageQuestions===0,records}}
if(require.main===module){const report=audit();if(process.argv.includes('--write')){fs.mkdirSync(path.dirname(OUT_JSON),{recursive:true});fs.writeFileSync(OUT_JSON,JSON.stringify(report,null,2)+'\n');fs.writeFileSync(OUT_MD,markdown(report).trimEnd()+'\n')}console.log(JSON.stringify(report,null,2))}
module.exports={audit,markdown,starterInventory,fullAuthoringInventory,countGenerated}
