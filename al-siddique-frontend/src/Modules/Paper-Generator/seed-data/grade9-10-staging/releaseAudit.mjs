// Strict, isolated Grade IX/X release audit. It NEVER imports into the live bank.
import {createHash} from 'node:crypto';
import {validateQuestion} from './questionContract.mjs';
const has=v=>typeof v==='string'&&v.trim().length>0;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
export const recordDigest=q=>createHash('sha256').update(JSON.stringify(canonical(q))).digest('hex');
const meaning=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
const meaningKey=q=>[q.curriculum?.grade,q.curriculum?.subjectId,q.curriculum?.edition,
 q.chapter?.id,q.type,meaning(q.content?.en?.stem),meaning(q.content?.ur?.stem)].join('::');

function checkBook(q,language,manifest,errors){
 const recordId=q.curriculum?.catalogRecordIds?.[language];
 const evidence=q.source?.languages?.[language]||{};
 const book=(manifest?.entries||[]).find(e=>e.recordId===recordId);
 if(!has(recordId)||!book){errors.push(language+': no identified textbook manifest entry');return;}
 if(book.grade!==q.curriculum.grade||book.subjectId!==q.curriculum.subjectId||
    book.syllabusVersion!==q.curriculum.syllabusVersion||book.edition!==q.curriculum.edition)
   errors.push(language+': textbook cohort/edition/subject mismatch');
 if(book.medium!==language) errors.push(language+': textbook language mismatch');
 if(book.downloadStatus!=='VERIFIED_PDF'||!hash(book.pdfSha256)||!has(book.pdfUrl)||
    book.chapterIndexStatus!=='VERIFIED'||book.exerciseIndexStatus!=='VERIFIED')
   errors.push(language+': PDF bytes, SHA-256 or indices are not verified');
 if(!hash(evidence.pdfSha256)||evidence.pdfSha256!==book.pdfSha256)
   errors.push(language+': question source checksum does not bind to textbook');
 const ch=book.chapterIndex?.find(c=>c.id===q.chapter?.id&&c.number===q.chapter?.number);
 if(!ch){errors.push(language+': chapter not verified in source index');return;}
 const topic=ch.topics?.find(t=>t.id===q.topicId);
 if(!topic){errors.push(language+': topic absent from verified chapter index');return;}
 if(!Number.isInteger(topic.pageStart)||!Number.isInteger(topic.pageEnd)||
    topic.pageEnd<topic.pageStart||!Number.isInteger(evidence.page)||
    evidence.page<topic.pageStart||evidence.page>topic.pageEnd)
   errors.push(language+': source page outside verified topic map');
 if(q.origin==='exercise'&&!topic.exerciseRefs?.includes(evidence.exerciseRef))
   errors.push(language+': exercise reference absent from verified ledger');
 if(q.origin!=='exercise'&&has(evidence.exerciseRef))
   errors.push(language+': non-exercise item is misclassified');
}

export function auditPublicationCandidate(q,manifest,{syllabusMode='full',examYear}={}){
 if(!q||typeof q!=='object') return {valid:false,errors:['Invalid staged record']};
 const errors=[...validateQuestion(q,{forPublication:true,syllabusMode,examYear}).errors];
 if(q?.medium!=='dual') errors.push('One identity must include both reviewed languages');
 for(const language of ['en','ur']){
   if(!has(q?.content?.[language]?.stem)||!has(q?.content?.[language]?.answer))
     errors.push(language+': reviewed question and answer both required');
   checkBook(q,language,manifest,errors);
 }
 if(!has(q?.difficultyRationale)) errors.push('Difficulty needs cognitive-demand rationale');
 if(!has(q?.authorId)) errors.push('Author identity missing');
 const c=q?.review?.checks||{};
 for(const k of ['english','urdu','translation','syllabus','duplicate'])
   if(c[k]!==true) errors.push('Missing '+k+' independent review');
 const reviewers=q?.review?.reviewers||{};
 for(const k of ['source','academic','answer','english','urdu','translation','syllabus'])
   if(!has(reviewers[k])) errors.push('Missing named '+k+' reviewer');
 if(has(q?.authorId)&&reviewers.academic===q.authorId)
   errors.push('Author cannot independently approve own academic item');
 if(has(reviewers.english)&&reviewers.english===reviewers.urdu)
   errors.push('Independent language reviewer identities required');
 // Full-book syllabus review is bound to the verified bilingual textbook indices above.
 // Exam-year ALP evidence is required only by the optional ALP selection policy.
 for(const [i,b] of (Array.isArray(q?.boardEvidence)?q.boardEvidence:[]).entries()){
   if(!b||typeof b!=='object'){errors.push('Malformed board evidence '+i);continue;}
   if(!hash(b.paperSha256)||!Number.isInteger(b.paperPage)||b.paperPage<1||
      !has(b.verifiedBy)||!has(b.paperId)||!has(b.matchReviewedBy))
     errors.push('Board appearance '+i+' lacks paper checksum/page/reviewer/identity');
   const matched=(manifest?.boardPapers||[]).some(p=>p.id===b.paperId&&
     p.status==='VERIFIED_PAPER'&&p.sha256===b.paperSha256&&
     p.board===b.board&&p.year===b.year&&p.session===b.session&&
     p.url===b.paperUrl&&Number.isInteger(p.pageCount)&&b.paperPage<=p.pageCount);
   if(!matched) errors.push('Board appearance '+i+' absent from verified paper manifest');
 }
 if(q?.type==='mcq'){
   const en=q.content?.en?.options||[],ur=q.content?.ur?.options||[];
   if(en.length!==4||ur.length!==4||en.some((o,i)=>o.id!==ur[i]?.id)||
      !en.some(o=>o.id===q.correctOptionId))
     errors.push('MCQ bilingual answer/option identity invalid');
 }
 if(q?.type==='numerical'&&(!has(q.content?.en?.solution)||!has(q.content?.ur?.solution)))
   errors.push('Numerical requires reviewed bilingual worked solution');
 return {valid:errors.length===0,errors:[...new Set(errors)]};
}

// Preview only: no storage, network calls, mutation, commits, or seed action.
export function dryRunStaging({staged=[],existing=[],manifest={entries:[]},syllabusMode='full',examYear}={}){
 const inserts=[],duplicates=[],conflicts=[],rejected=[];
 const ids=new Map(existing.map(q=>[q.id,{digest:recordDigest(q),kind:'existing'}]));
 const meanings=new Map(existing.map(q=>[meaningKey(q),q.id]));
 for(const q of staged){
   const review=auditPublicationCandidate(q,manifest,{syllabusMode,examYear});
   if(!review.valid){rejected.push({id:q?.id??null,reasons:review.errors});continue;}
   const digest=recordDigest(q), found=ids.get(q.id);
   if(found){
     (found.digest===digest?duplicates:conflicts).push({id:q.id,reason:found.digest===digest?'same-id-same-payload':'same-id-different-payload'});
     continue;
   }
   const prior=meanings.get(meaningKey(q));
   if(prior){conflicts.push({id:q.id,reason:'same-academic-question-different-id',existingId:prior});continue;}
   ids.set(q.id,{digest,kind:'staged'});
   meanings.set(meaningKey(q),q.id);
   inserts.push({id:q.id,digest,edition:q.curriculum.edition});
 }
 return {mode:'DRY_RUN_ONLY',bankCoverage:'full-textbook',selection:{syllabusMode,examYear:syllabusMode==='alp'?examYear:null},counts:{wouldInsert:inserts.length,duplicates:duplicates.length,
   conflicts:conflicts.length,rejected:rejected.length,existingCount:existing.length,
   existingWrites:0},inserts,duplicates,conflicts,rejected,
   rollback:{strategy:'versioned snapshot and hash verification BEFORE separately authorized import',
     executed:false}};
}
