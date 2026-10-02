import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toStructuredBankCandidate,buildCurriculumSupervisedReview,analyzeLegacySupervisedCompatibility}
 from './curriculumSupervisedAdapter.mjs';
const H='a'.repeat(64),U='b'.repeat(64),S='c'.repeat(64);
const manifest={entries:[
 {recordId:'BOOK-EN',grade:9,subjectId:'biology',syllabusVersion:'ix-2025-26',edition:'2025-26',medium:'en',
  downloadStatus:'VERIFIED_PDF',pdfSha256:H,pdfUrl:'https://example.org/en.pdf',chapterIndexStatus:'VERIFIED',
  exerciseIndexStatus:'VERIFIED',chapterIndex:[{id:'CH1',number:1,topics:[{id:'T1',pageStart:5,pageEnd:20,exerciseRefs:[]}]}]},
 {recordId:'BOOK-UR',grade:9,subjectId:'biology',syllabusVersion:'ix-2025-26',edition:'2025-26',medium:'ur',
  downloadStatus:'VERIFIED_PDF',pdfSha256:U,pdfUrl:'https://example.org/ur.pdf',chapterIndexStatus:'VERIFIED',
  exerciseIndexStatus:'VERIFIED',chapterIndex:[{id:'CH1',number:1,topics:[{id:'T1',pageStart:5,pageEnd:20,exerciseRefs:[]}]}]}
]};
const approved=(type='short')=>({
 id:'IX-BIO-APPROVED-001',authorId:'author-a',
 curriculum:{authority:'PECTAA',grade:9,subjectId:'biology',textbookId:'BIO-PAIR',edition:'2025-26',
  syllabusVersion:'ix-2025-26',catalogRecordIds:{en:'BOOK-EN',ur:'BOOK-UR'}},
 chapter:{id:'CH1',number:1},topicId:'T1',type,origin:'additional',difficulty:'medium',
 difficultyRationale:'Requires applying a defined textbook distinction.',marks:type==='mcq'?1:2,medium:'dual',
 source:{officialUrl:'https://example.org/en.pdf',page:10,languages:{
  en:{pdfSha256:H,page:10,exerciseRef:null},ur:{pdfSha256:U,page:10,exerciseRef:null}}},
 content:type==='mcq'?{
  en:{stem:'Which option is correct?',answer:'Second',options:['A','B','C','D'].map((id,i)=>({id,text:['First','Second','Third','Fourth'][i]}))},
  ur:{stem:'کون سا جواب درست ہے؟',answer:'دوسرا',options:['A','B','C','D'].map((id,i)=>({id,text:['پہلا','دوسرا','تیسرا','چوتھا'][i]}))}
 }:{
  en:{stem:'Explain the textbook distinction.',answer:'Reviewed English answer.'},
  ur:{stem:'کتابی فرق کی وضاحت کریں۔',answer:'نظرثانی شدہ اردو جواب۔'}
 },
 correctOptionId:type==='mcq'?'B':null,importance:{selected:false,reason:''},boardEvidence:[],
 syllabusScope:{examYear:2026,alpStatus:'included',evidenceUrl:'https://example.org/alp.pdf',
  evidenceSha256:S,verifiedBy:'review-syllabus'},
 review:{status:'approved',checks:{source:true,academic:true,answer:true,originality:true,english:true,urdu:true,
  translation:true,syllabus:true,duplicate:true},reviewers:{source:'review-source',academic:'review-academic',
  answer:'review-answer',english:'review-en',urdu:'review-ur',translation:'review-translation',syllabus:'review-syllabus'}}
});
test('approved curriculum candidate preserves permanent identity and both reviewed answers',()=>{
 const x=toStructuredBankCandidate(approved('short'),{manifest,subjectId:'subject-biology-9'});
 assert.equal(x.ok,true);assert.equal(x.candidate.id,'IX-BIO-APPROVED-001');
 assert.equal(x.candidate.answer,'Reviewed English answer.');
 assert.equal(x.candidate.answerUrdu,'نظرثانی شدہ اردو جواب۔');
 assert.equal(x.candidate.curriculumQuestion.review.status,'approved');
 assert.equal(x.candidate.source,'assps-curriculum-approved-v2');
});
test('legacy supervised commit is explicitly blocked when it would lose identity/provenance/bilingual answer',()=>{
 const short=toStructuredBankCandidate(approved('short'),{manifest,subjectId:'S'}).candidate;
 const mcq=toStructuredBankCandidate({...approved('mcq'),id:'IX-BIO-APPROVED-MCQ-1'},{manifest,subjectId:'S'}).candidate;
 const a=analyzeLegacySupervisedCompatibility(short),b=analyzeLegacySupervisedCompatibility(mcq);
 assert.equal(a.lossless,false);assert.equal(b.lossless,false);
 assert.match(a.reasons.join('|'),/Urdu answer/);assert.match(b.reasons.join('|'),/permanent curriculum question ID/);
});
test('batch builder is review-only and never claims legacy commit safety',()=>{
 const q1=approved('short'),q2={...approved('mcq'),id:'IX-BIO-APPROVED-MCQ-2'};
 const report=buildCurriculumSupervisedReview({questions:[q1,q2],manifest,subjectId:'S'});
 assert.equal(report.mode,'SUPERVISED_REVIEW_ONLY_NO_COMMIT');assert.equal(report.directCommitAllowed,false);
 assert.deepEqual(report.counts,{input:2,academicallyReady:2,rejected:0,losslessLegacyCommit:0});
 assert.equal(report.ready[0].candidate.id,q1.id);
});
test('current research drafts and current real manifest are correctly rejected from approved batch',()=>{
 const drafts=JSON.parse(readFileSync(new URL('./biology9TopicResearchDrafts.json',import.meta.url))).drafts;
 const real=JSON.parse(readFileSync(new URL('./officialSourceManifest.json',import.meta.url)));
 const report=buildCurriculumSupervisedReview({questions:drafts,manifest:real,subjectId:'S'});
 assert.equal(report.counts.academicallyReady,0);assert.equal(report.counts.rejected,drafts.length);
 assert.ok(report.rejected.every(x=>x.errors.length>0));
});
test('target subject is mandatory even for academically approved material',()=>{
 const x=toStructuredBankCandidate(approved(),{manifest,subjectId:''});
 assert.equal(x.ok,false);assert.match(x.errors.join('|'),/subject ID/);
});
