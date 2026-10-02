import {auditPublicationCandidate} from './releaseAudit.mjs';
const has=v=>typeof v==='string'&&v.trim().length>0;
const legacyPriority=origin=>origin==='exercise'?'exercise':origin==='additional'?'additional':'all';
export function toStructuredBankCandidate(question,{manifest,subjectId,syllabusMode='full',examYear}={}){
 const audit=auditPublicationCandidate(question,manifest,{syllabusMode,examYear});
 if(!audit.valid)return {ok:false,id:question?.id??null,errors:audit.errors};
 if(!has(subjectId))return {ok:false,id:question.id,errors:['Target Question Bank subject ID is required.']};
 const options=question.type==='mcq'?(question.content.en.options||[]).map((o,i)=>({
  id:o.id,label:o.id,text:o.text,textUrdu:question.content.ur.options?.[i]?.text||''
 })):[];
 return {ok:true,candidate:{
  id:question.id,subjectId,type:question.type,medium:'dual',
  text:question.content.en.stem,textUrdu:question.content.ur.stem,
  answer:question.type==='mcq'?question.correctOptionId:question.content.en.answer,
  answerUrdu:question.type==='mcq'?question.correctOptionId:question.content.ur.answer,
  marks:question.marks,chapterId:question.chapter.id,chapterNumber:question.chapter.number,
  topicId:question.topicId,origin:question.origin,priority:legacyPriority(question.origin),
  importance:question.importance,difficulty:question.difficulty,options,
  correctOptionId:question.type==='mcq'?question.correctOptionId:null,
  curriculumQuestion:question,source:'assps-curriculum-approved-v2'
 }};
}
export function analyzeLegacySupervisedCompatibility(candidate){
 const reasons=[
  'Current supervised commit generates a new random q_* ID instead of preserving the permanent curriculum question ID.',
  'Current legacy Question Bank record does not retain the full curriculum/source/ALP/review provenance object.',
  'Current legacy priority field cannot faithfully represent conceptual origin plus independent importance/difficulty metadata.'
 ];
 if(candidate.type!=='mcq')reasons.push('Current legacy record has one answer field and would lose the reviewed Urdu answer.');
 return {lossless:false,reasons};
}
export function buildCurriculumSupervisedReview({questions=[],manifest,subjectId,syllabusMode='full',examYear}={}){
 const ready=[],rejected=[];
 for(const q of Array.isArray(questions)?questions:[]){
  const built=toStructuredBankCandidate(q,{manifest,subjectId,syllabusMode,examYear});
  if(!built.ok){rejected.push({id:built.id,errors:built.errors});continue}
  const compatibility=analyzeLegacySupervisedCompatibility(built.candidate);
  ready.push({id:q.id,candidate:built.candidate,legacyCompatibility:compatibility});
 }
 return {mode:'SUPERVISED_REVIEW_ONLY_NO_COMMIT',directCommitAllowed:false,
  bankCoverage:'full-textbook',selection:{syllabusMode,examYear:syllabusMode==='alp'?examYear:null},
  counts:{input:Array.isArray(questions)?questions.length:0,academicallyReady:ready.length,rejected:rejected.length,
   losslessLegacyCommit:ready.filter(r=>r.legacyCompatibility.lossless).length},
  ready,rejected,
  requiredBeforeCommit:[
   'Preserve permanent curriculum question ID in bank storage.',
   'Persist bilingual answer data, not only one answer string.',
   'Persist origin, importance, difficulty, curriculum edition, source checksum/page, ALP, board evidence and review status.',
   'Run tenant-scoped duplicate/conflict dry-run immediately before atomic import.',
   'Keep full structured academic record while exposing legacy-compatible display fields to existing UI.'
  ]};
}
