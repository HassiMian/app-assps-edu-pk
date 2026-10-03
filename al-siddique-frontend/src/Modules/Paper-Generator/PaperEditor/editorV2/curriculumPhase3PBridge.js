// Phase 3P: READ-ONLY consumer of the curriculum project's supervised review result.
// The curriculum workstream owns ingestion, identity, audit, approval and versioning.
// No import from a sibling worktree, bank save, PaperDocument mutation or network side effect.
import {PHASE3O_QUESTION_MENU, composeTopicPaperBlocks}
 from './topicQuestionComposerPhase3O.js';

export const PHASE3P_SCHEMA='assps-phase3p-curriculum-projection-v1';
const has=v=>typeof v==='string'&&v.trim().length>0;
const copy=v=>JSON.parse(JSON.stringify(v));
const refuse=why=>{throw new Error('Phase3P refused: '+why);};
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const identityFields=['authority','grade','subjectId','textbookId','edition','syllabusVersion'];
const requireUnique=(arr,label)=>{
 const ids=new Set();
 for(const v of arr){
  if(!has(v?.id)||ids.has(v.id))refuse('duplicate/missing '+label+' identity');
  ids.add(v.id);
 }
};
function checkedBook(entry,identity,lang){
 if(!entry||entry.medium!==lang||entry.downloadStatus!=='VERIFIED_PDF'||
    entry.chapterIndexStatus!=='VERIFIED'||entry.exerciseIndexStatus!=='VERIFIED'||
    !/^[a-f0-9]{64}$/i.test(entry.pdfSha256||'')||
    !has(entry.pdfUrl)||!/^https:\/\//i.test(entry.pdfUrl)||
    !has(entry.recordId)||!Array.isArray(entry.chapterIndex)||!entry.chapterIndex.length)
  refuse('both source books need independently VERIFIED PDF/chapter/exercise indices');
 for(const k of ['grade','subjectId','edition','syllabusVersion'])
  if(entry[k]!==identity[k])refuse('source book cohort/edition/subject mismatch: '+lang);
 requireUnique(entry.chapterIndex,lang+' chapter');
 return entry;
}
function alignedHierarchy(enBook,urBook,schoolSubjectId){
 if(enBook.chapterIndex.length!==urBook.chapterIndex.length)
  refuse('bilingual chapter counts differ; curriculum owner must reconcile');
 const chapters=[],chapterById=new Map(),globalTopics=new Set();
 for(const ch of enBook.chapterIndex){
  const ur=urBook.chapterIndex.find(x=>x.id===ch.id&&x.number===ch.number);
  if(!ur||!has(ch.title)||!has(ur.title)||!Array.isArray(ch.topics)||
     !Array.isArray(ur.topics)||ch.topics.length!==ur.topics.length)
   refuse('chapter identity/title/topic alignment not independently verified: '+ch.id);
  requireUnique(ch.topics,'English topic');requireUnique(ur.topics,'Urdu topic');
  const topics=ch.topics.map(t=>{
   const counterpart=ur.topics.find(x=>x.id===t.id);
   if(!counterpart||!has(t.title)||!has(counterpart.title)||globalTopics.has(t.id)||
      !Number.isInteger(t.pageStart)||!Number.isInteger(t.pageEnd)||
      !Number.isInteger(counterpart.pageStart)||!Number.isInteger(counterpart.pageEnd)||
      t.pageEnd<t.pageStart||counterpart.pageEnd<counterpart.pageStart)
    refuse('topic identity/page-range mismatch: '+t.id);
   globalTopics.add(t.id);
   return {id:t.id,en:t.title,ur:counterpart.title};
  });
  chapterById.set(ch.id,{en:ch,ur,topics:new Set(ch.topics.map(t=>t.id))});
  chapters.push({id:ch.id,subjectId:schoolSubjectId,n:ch.number,en:ch.title,ur:ur.title,topics});
 }
 return {chapters,chapterById};
}
function verifyCandidate(item,{identity,schoolSubject,books,chapterById,manifest,
 syllabusMode,examYear,auditPublicationCandidate}){
 const q=item?.candidate?.curriculumQuestion,c=item?.candidate;
 if(!q||!c||q.review?.status!=='approved'||item.id!==q.id||c.id!==q.id||
    c.source!=='assps-curriculum-approved-v2')
  refuse('only unchanged, supervised approved candidates may be projected');
 for(const k of identityFields)if(q.curriculum?.[k]!==identity[k])
  refuse('academic identity mismatch: '+k+' / '+q.id);
 if(q.curriculum.catalogRecordIds?.en!==books.en.recordId||
    q.curriculum.catalogRecordIds?.ur!==books.ur.recordId||
    c.subjectId!==schoolSubject.id||q.medium!=='dual')
  refuse('curriculum/subject/source language binding mismatch: '+q.id);
 if(!chapterById.has(q.chapter?.id)||
    chapterById.get(q.chapter.id).en.number!==q.chapter.number||
    !chapterById.get(q.chapter.id).topics.has(q.topicId))
  refuse('question does not belong to verified chapter/topic: '+q.id);
 if(!PHASE3O_QUESTION_MENU.includes(q.type)||!Number.isSafeInteger(q.marks)||
    q.marks<1||q.marks>100)
  refuse('question type/marks not supported by Phase3O: '+q.id);
 for(const lang of ['en','ur']){
  const e=q.source?.languages?.[lang],book=books[lang],
   topic=chapterById.get(q.chapter.id)[lang].topics.find(t=>t.id===q.topicId);
  if(e?.pdfSha256!==book.pdfSha256||!Number.isInteger(e.page)||
     e.page<topic.pageStart||e.page>topic.pageEnd||
     !has(q.content?.[lang]?.stem)||!has(q.content?.[lang]?.answer))
   refuse('reviewed source hash/page/content mismatch: '+q.id+' '+lang);
 }
 const audit=auditPublicationCandidate(q,manifest,{syllabusMode,examYear});
 if(audit?.valid!==true||audit.errors?.length)refuse('curriculum authority publication audit rejected '+q.id);
 if(c.type!==q.type||c.chapterId!==q.chapter.id||c.topicId!==q.topicId||
    c.marks!==q.marks||c.text!==q.content.en.stem||
    c.textUrdu!==q.content.ur.stem||
    c.answerUrdu!==(q.type==='mcq'?q.correctOptionId:q.content.ur.answer)||
    c.answer!==(q.type==='mcq'?q.correctOptionId:q.content.en.answer))
  refuse('supervised display fields changed after academic audit: '+q.id);
 let options=[];
 if(q.type==='mcq'){
  const en=q.content.en.options,ur=q.content.ur.options;
  if(!['A','B','C','D'].includes(q.correctOptionId)||
     !Array.isArray(en)||!Array.isArray(ur)||en.length!==4||ur.length!==4||
     !en.every((o,i)=>o.id===ur[i]?.id&&has(o.text)&&has(ur[i].text)))
   refuse('reviewed bilingual MCQ options missing: '+q.id);
  const correct=en.findIndex(o=>o.id===q.correctOptionId);
  if(q.content.en.answer!==en[correct]?.text||q.content.ur.answer!==ur[correct]?.text)
   refuse('MCQ reviewed answers differ from correct keyed options: '+q.id);
  options=en.map((o,i)=>({label:o.id,text:o.text,textUrdu:ur[i].text}));
  if(!identical(c.options?.map(o=>({label:o.label,text:o.text,textUrdu:o.textUrdu})),options)||
     c.correctOptionId!==q.correctOptionId)
   refuse('supervised MCQ option/correct-answer drift: '+q.id);
 }
 return {id:q.id,subjectId:schoolSubject.id,type:q.type,
  chapterId:q.chapter.id,topicId:q.topicId,marks:q.marks,
  text:q.content.en.stem,textUrdu:q.content.ur.stem,
  options,answerEn:q.content.en.answer,answerUrdu:q.content.ur.answer,
  correctOptionId:q.correctOptionId,academicRecord:copy(q)};
}
export function projectCurriculumSupervisedPhase3P({review,manifest,schoolSubject,
 identity,auditPublicationCandidate,syllabusMode='full',examYear}={}){
 if(typeof auditPublicationCandidate!=='function')refuse('curriculum-owned independent audit callback required');
 if(!identity||!schoolSubject||!has(schoolSubject.id)||!has(schoolSubject.classId)||
    !has(schoolSubject.syllabusId)||identityFields.some(k=>
     identity[k]===undefined||identity[k]===null||identity[k]==='')||
    !identical(schoolSubject.curriculumBinding,identity)||
    identity.authority!=='PECTAA'||![9,10].includes(identity.grade))
  refuse('explicit school-subject to textbook/cohort binding required');
 if(!review||review.mode!=='SUPERVISED_REVIEW_ONLY_NO_COMMIT'||
    review.directCommitAllowed!==false||review.bankCoverage!=='full-textbook'||
    !Array.isArray(review.ready)||review.selection?.syllabusMode!==syllabusMode||
    (syllabusMode==='alp'&&(!Number.isInteger(examYear)||review.selection.examYear!==examYear))||
    !['full','alp'].includes(syllabusMode))
  refuse('untrusted or mismatched supervised selection');
 const entries=manifest?.entries||[];
 const matching=entries.filter(e=>e.grade===identity.grade&&e.subjectId===identity.subjectId&&
  e.edition===identity.edition&&e.syllabusVersion===identity.syllabusVersion);
 const en=matching.filter(e=>e.medium==='en'),ur=matching.filter(e=>e.medium==='ur');
 if(en.length!==1||ur.length!==1)refuse('unambiguous verified EN/UR textbook pair required');
 const books={en:checkedBook(en[0],identity,'en'),ur:checkedBook(ur[0],identity,'ur')};
 const {chapters,chapterById}=alignedHierarchy(books.en,books.ur,schoolSubject.id);
 const seen=new Set(),meaning=new Set();
 const questions=review.ready.map(item=>{
  const q=verifyCandidate(item,{identity,schoolSubject,books,chapterById,manifest,
   syllabusMode,examYear,auditPublicationCandidate});
  if(seen.has(q.id))refuse('duplicate permanent academic question ID: '+q.id);
  seen.add(q.id);
  const key=[q.chapterId,q.type,q.text.normalize('NFKC').trim().toLowerCase()].join('::');
  if(meaning.has(key))refuse('duplicate academic question with different ID: '+q.id);
  meaning.add(key);return q;
 });
 return {schema:PHASE3P_SCHEMA,status:'READ_ONLY_APPROVED_PROJECTION',
  authoritativeOwner:'grade9-10-curriculum',identity:copy(identity),
  subjects:[{id:schoolSubject.id,classId:schoolSubject.classId,syllabusId:schoolSubject.syllabusId}],
  sourceBookIds:{en:books.en.recordId,ur:books.ur.recordId},
  sourceChecksums:{en:books.en.pdfSha256,ur:books.ur.pdfSha256},
  selection:{syllabusMode,examYear:syllabusMode==='alp'?examYear:null},
  chapters,questions,academicRecordCount:questions.length,
  legacyBankWriteAllowed:false,sourcePaperUpdated:false};
}
export function composeCurriculumPhase3PPreview({projection,blocks,medium='en'}={}){
 if(projection?.schema!==PHASE3P_SCHEMA||
    projection.status!=='READ_ONLY_APPROVED_PROJECTION'||!['en','ur'].includes(medium))
  refuse('approved read-only EN/UR projection required');
 const lineage=projection.publicationLineage??null;
 if(lineage!==null&&(
   lineage.schema!=='assps-phase3w-source-lineage-v1'||
   !Number.isSafeInteger(lineage.snapshotRevision)||lineage.snapshotRevision<1||
   projection.revision!==lineage.snapshotRevision||
   !has(lineage.publicationId)||
   !/^[a-f0-9]{64}$/i.test(lineage.recordsDigest||'')||
   lineage.clientAuthorizationState!=='UNVERIFIED_CLIENT_ONLY'))
  refuse('invalid or stale publication lineage; client hint cannot authorize saving');
 if(lineage===null&&projection.revision!==undefined)
  refuse('orphan source revision without a pinned publication identity');
 const composition=composeTopicPaperBlocks({
  subjects:projection.subjects,chapters:projection.chapters,questions:projection.questions,
  subjectId:projection.subjects[0].id,medium,blocks});
 const byId=new Map(projection.questions.map(q=>[q.id,q]));
 // Phase3O display output is intentionally flat; retain complete original records
 // in this detachable handoff rather than writing a lossy legacy bank record.
 const sourceLedger=composition.blocks.flatMap(b=>b.questions.map(x=>({
  questionId:x.questionId,blockId:b.id,chapterId:x.chapterId,topicId:x.topicId,
  academicRecord:copy(byId.get(x.questionId).academicRecord)})));
 return {schema:'assps-phase3p-source-preserving-paper-handoff-v1',
  status:'UNSAVED_PREVIEW_AWAITING_NEW_AUTHORING_PAPERDOCUMENT_ADAPTER',
  composition,sourceLedger,sourceBookIds:copy(projection.sourceBookIds),
  sourceChecksums:copy(projection.sourceChecksums),
  curriculumIdentity:copy(projection.identity),selection:copy(projection.selection),
  snapshotRevision:lineage?.snapshotRevision??null,
  publicationLineage:lineage?copy(lineage):null,
  sourcePaperUpdated:false,legacyBankWriteAllowed:false,liveEditorMounted:false,
  canonicalV13MigrationClaim:false,printApproved:false};
}
