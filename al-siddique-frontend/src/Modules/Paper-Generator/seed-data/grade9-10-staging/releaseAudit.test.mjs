import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {auditPublicationCandidate,dryRunStaging,recordDigest} from './releaseAudit.mjs';
// All examples below are fabricated TEST FIXTURES, never academic content or real verification.
const H='a'.repeat(64),E='b'.repeat(64);
const makeBook=(language)=>({recordId:'TEST-'+language,grade:9,subjectId:'biology',
 syllabusVersion:'ix-2025-26',edition:'2025-26',medium:language,
 pdfUrl:'https://example.org/not-a-real-book.pdf',pdfSha256:H,
 downloadStatus:'VERIFIED_PDF',chapterIndexStatus:'VERIFIED',exerciseIndexStatus:'VERIFIED',
 chapterIndex:[{id:'CH1',number:1,topics:[{id:'T1',pageStart:8,pageEnd:12,
 exerciseRefs:['EX1-Q1']}]}]});
const manifest=()=>({entries:[makeBook('en'),makeBook('ur')]});
const candidate=()=>({
 id:'TEST-ONLY-001',authorId:'test-author',
 curriculum:{authority:'PECTAA',grade:9,subjectId:'biology',textbookId:'TEST-PAIR',
  catalogRecordIds:{en:'TEST-en',ur:'TEST-ur'},edition:'2025-26',syllabusVersion:'ix-2025-26'},
 chapter:{id:'CH1',number:1},topicId:'T1',type:'short',origin:'exercise',
 difficulty:'easy',difficultyRationale:'One-step recall from supplied test topic.',marks:2,medium:'dual',
 source:{officialUrl:'https://example.org/not-a-real-book.pdf',page:10,exerciseRef:'EX1-Q1',
  languages:{en:{pdfSha256:H,page:10,exerciseRef:'EX1-Q1'},
             ur:{pdfSha256:H,page:10,exerciseRef:'EX1-Q1'}}},
 content:{en:{stem:'Synthetic test prompt?',answer:'Synthetic answer.'},
          ur:{stem:'نمونہ سوال؟',answer:'نمونہ جواب۔'}},
 importance:{selected:false,reason:''},boardEvidence:[],
 syllabusScope:{examYear:2026,alpStatus:'included',
  evidenceUrl:'https://example.org/not-real-alp.pdf',evidenceSha256:E,verifiedBy:'test-syllabus'},
 review:{status:'approved',checks:{source:true,academic:true,answer:true,originality:true,
  english:true,urdu:true,translation:true,syllabus:true,duplicate:true},
  reviewers:{source:'test-source',academic:'test-academic',answer:'test-answer',
   english:'test-english',urdu:'test-urdu',translation:'test-translator',syllabus:'test-syllabus'}}
});
test('strict synthetic bilingual fixture passes isolated release audit',()=>{
 assert.deepEqual(auditPublicationCandidate(candidate(),manifest()).errors,[]);
});
test('real catalog currently has ZERO verified textbooks and cannot release synthetic question',()=>{
 const actual=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url)));
 assert.equal(actual.entries.filter(e=>e.downloadStatus==='VERIFIED_PDF').length,0);
 assert.equal(auditPublicationCandidate(candidate(),actual).valid,false);
});
test('a missing independent Urdu reviewer blocks release',()=>{
 const q=candidate();delete q.review.reviewers.urdu;
 assert.match(auditPublicationCandidate(q,manifest()).errors.join('|'),/named urdu reviewer/);
});
test('a wrong Urdu source checksum and exercise map block release',()=>{
 const q=candidate();q.source.languages.ur.pdfSha256='c'.repeat(64);
 q.source.languages.ur.exerciseRef='EX9-Q9';
 const e=auditPublicationCandidate(q,manifest()).errors.join('|');
 assert.match(e,/checksum/);assert.match(e,/exercise reference/);
});
test('old-edition or incomplete textbook manifest never passes',()=>{
 const m=manifest();m.entries[0].edition='2020';m.entries[1].chapterIndexStatus='PENDING';
 const e=auditPublicationCandidate(candidate(),m).errors.join('|');
 assert.match(e,/cohort/);assert.match(e,/indices/);
});
test('question origin, ALP and keyed board evidence are separate validations',()=>{
 const q=candidate();q.origin='additional';q.boardEvidence=[{
 board:'Lahore',year:2026,session:'First Annual',paperUrl:'https://example.org/test',
 questionRef:'Q2',matchType:'conceptual'}];
 const e=auditPublicationCandidate(q,manifest()).errors.join('|');
 assert.match(e,/Non-exercise/);assert.match(e,/Board appearance/);
 q.origin='exercise';q.boardEvidence=[];q.syllabusScope.evidenceSha256='';
 assert.equal(auditPublicationCandidate(q,manifest()).valid,true);
 assert.match(auditPublicationCandidate(q,manifest(),{syllabusMode:'alp',examYear:2026}).errors.join('|'),/ALP evidence/);
});
test('dry-run counts unchanged payloads, ID conflicts, semantic duplicates and rejects',()=>{
 const good=candidate(),identical=structuredClone(good),modified=structuredClone(good);
 modified.content.en.answer='Changed key';
 const repeated=structuredClone(good);repeated.id='TEST-OTHER-ID';
 const bad=structuredClone(good);bad.id='TEST-BAD';bad.review.checks.translation=false;
 const r=dryRunStaging({staged:[good,identical,modified,repeated,bad],manifest:manifest()});
 assert.equal(r.mode,'DRY_RUN_ONLY');assert.deepEqual(r.counts,{
  wouldInsert:1,duplicates:1,conflicts:2,rejected:1,existingCount:0,existingWrites:0});
 assert.equal(r.rollback.executed,false);
});
test('existing records are read only: matched ID never becomes an insert',()=>{
 const q=candidate(),before=recordDigest(q);
 const report=dryRunStaging({staged:[structuredClone(q)],existing:[q],manifest:manifest()});
 assert.equal(report.counts.wouldInsert,0);
 assert.equal(report.counts.existingWrites,0);
 assert.equal(report.counts.duplicates,1);
 assert.equal(recordDigest(q),before);
});
test('null input is rejected without crashing or becoming selectable',()=>{
 const r=dryRunStaging({staged:[null],manifest:manifest()});
 assert.equal(r.counts.rejected,1);assert.equal(r.counts.wouldInsert,0);
});
test('previous-board label needs exact independently registered paper evidence',()=>{
 const q=candidate();
 q.boardEvidence=[{board:'Lahore',year:2026,session:'First Annual',
  paperUrl:'https://example.org/fake-test-paper.pdf',paperId:'TEST-PAPER',paperSha256:E,
  paperPage:2,questionRef:'Q2',matchType:'exact',verifiedBy:'test-reviewer',matchReviewedBy:'test-2'}];
 const m=manifest();
 assert.match(auditPublicationCandidate(q,m).errors.join('|'),/absent from verified paper manifest/);
 m.boardPapers=[{id:'TEST-PAPER',status:'VERIFIED_PAPER',sha256:E,
  board:'Lahore',year:2026,session:'First Annual',url:q.boardEvidence[0].paperUrl,pageCount:3}];
 assert.equal(auditPublicationCandidate(q,m).valid,true);
});

test('full release accepts reviewed textbook content with no ALP evidence; ALP remains opt-in',()=>{
 const q=candidate();q.syllabusScope={alpStatus:'excluded'};
 assert.equal(auditPublicationCandidate(q,manifest()).valid,true);
 assert.equal(auditPublicationCandidate(q,manifest(),{syllabusMode:'alp',examYear:2026}).valid,false);
 q.syllabusScope={alpStatus:'unverified'};
 assert.equal(auditPublicationCandidate(q,manifest()).valid,true);
 const full=dryRunStaging({staged:[q],manifest:manifest()});
 assert.equal(full.counts.wouldInsert,1);assert.equal(full.selection.syllabusMode,'full');
 const alp=dryRunStaging({staged:[q],manifest:manifest(),syllabusMode:'alp',examYear:2026});
 assert.equal(alp.counts.wouldInsert,0);assert.equal(alp.counts.rejected,1);
 q.review.checks.syllabus=false;
 assert.equal(auditPublicationCandidate(q,manifest()).valid,false);
});
test('ALP release verifies matching year and evidence without weakening source review',()=>{
 const q=candidate();
 assert.equal(auditPublicationCandidate(q,manifest(),{syllabusMode:'alp',examYear:2026}).valid,true);
 assert.equal(auditPublicationCandidate(q,manifest(),{syllabusMode:'alp',examYear:2027}).valid,false);
 assert.equal(auditPublicationCandidate(q,manifest(),{syllabusMode:'alp'}).valid,false);
 q.source.languages.ur.pdfSha256='c'.repeat(64);
 assert.equal(auditPublicationCandidate(q,manifest()).valid,false);
});
