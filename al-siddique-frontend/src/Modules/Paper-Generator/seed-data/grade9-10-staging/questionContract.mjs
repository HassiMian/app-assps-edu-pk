// Grade IX/X revised curriculum STAGING CONTRACT ONLY. No production side effects.
import {syllabusSelectionErrors,matchesSyllabus} from './syllabusPolicy.mjs';
export const CONTRACT_VERSION = 'assps-qbk-grade9-10-v1';
export const ORIGINS = Object.freeze(['exercise', 'additional', 'conceptual']);
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'difficult']);
export const MEDIA = Object.freeze(['english', 'urdu', 'dual']);
export const TYPES = Object.freeze(['mcq','short','long','definition','numerical','diagram','fill','translation','comprehension','grammar','essay','letter','application','poetry','sentence_correction','muhawara','wahid_jama','mutradif','mutzad','alfaz_maani']);
export const ALP = Object.freeze(['included','excluded','not-applicable','unverified']);
const has = v => typeof v === 'string' && !!v.trim();
const validUrl = s => has(s) && /^https:\/\//i.test(s);
const clean = s => String(s ?? '').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();

export function validateQuestion(q, { forPublication = false, syllabusMode = 'full', examYear } = {}) {
  const errors = [];
  if (!q || typeof q !== 'object') return { valid:false, errors:['Question must be an object'] };
  if (!has(q.id)) errors.push('Missing stable question ID');
  const c=q.curriculum || {};
  if (c.authority !== 'PECTAA') errors.push('Incorrect curriculum authority');
  if (![9,10].includes(c.grade)) errors.push('Grade must be 9 or 10');
  for (const k of ['subjectId','textbookId','edition','syllabusVersion'])
    if (!has(c[k])) errors.push('Missing curriculum.'+k);
  if (!has(q.chapter?.id) || !Number.isInteger(q.chapter?.number) || q.chapter.number < 1)
    errors.push('Missing verified chapter ID/number');
  if (!has(q.topicId)) errors.push('Missing topic ID');
  if (!ORIGINS.includes(q.origin)) errors.push('Invalid mutually-exclusive origin');
  if (q.origin === 'exercise' && !has(q.source?.exerciseRef)) errors.push('Exercise requires exercise reference');
  if (q.origin !== 'exercise' && has(q.source?.exerciseRef)) errors.push('Non-exercise origin cannot claim exercise reference');
  if (!TYPES.includes(q.type)) errors.push('Invalid subject/question type');
  if (!DIFFICULTIES.includes(q.difficulty)) errors.push('Invalid difficulty');
  if (!Number.isFinite(q.marks) || q.marks <= 0) errors.push('Marks must be positive');
  if (!MEDIA.includes(q.medium)) errors.push('Invalid medium');
  if (q.medium !== 'urdu' && !has(q.content?.en?.stem)) errors.push('Missing English stem');
  if (q.medium !== 'english' && !has(q.content?.ur?.stem)) errors.push('Missing Urdu stem');
  if (q.importance?.selected && !has(q.importance?.reason)) errors.push('Important requires editorial rationale');
  if (!Array.isArray(q.boardEvidence)) errors.push('boardEvidence must be an array');
  for (const [i,b] of (Array.isArray(q.boardEvidence)?q.boardEvidence:[]).entries()) {
    if (!has(b.board) || !Number.isInteger(b.year) || !has(b.session) || !has(b.questionRef) ||
        !validUrl(b.paperUrl) || !['exact','conceptual'].includes(b.matchType))
      errors.push('Unverified board occurrence at index '+i);
  }
  const scope=q.syllabusScope || {};
  if (!ALP.includes(scope.alpStatus)) errors.push('Unknown ALP status');
  if (q.type === 'mcq') {
    const en=q.content?.en?.options, ur=q.content?.ur?.options;
    const active=q.medium==='urdu'?ur:en;
    const validOptions=a=>Array.isArray(a)&&a.length===4&&new Set(a.map(o=>o.id)).size===4&&a.every(o=>has(o.id)&&has(o.text));
    if (!validOptions(active)) errors.push('MCQ requires four uniquely keyed, complete options');
    if (q.medium==='dual' && (!validOptions(ur)||en.map(o=>o.id).join('|')!==ur.map(o=>o.id).join('|')))
      errors.push('Dual MCQ option identities/order mismatch');
    if (!active?.some(o=>o.id===q.correctOptionId)) errors.push('Correct option must reference stable option ID');
  }
  if (forPublication) {
    if (q.review?.status!=='approved') errors.push('Not approved');
    const checks=q.review?.checks || {};
    for (const k of ['source','academic','answer','originality','syllabus'])
      if (checks[k]!==true) errors.push('Missing '+k+' approval');
    if (q.medium==='dual' && checks.translation!==true) errors.push('Missing bilingual translation approval');
    if (!validUrl(q.source?.officialUrl)||!Number.isInteger(q.source?.page)||q.source.page<1)
      errors.push('Unverified official source URL/page');
    errors.push(...syllabusSelectionErrors(q,{syllabusMode,examYear}));
  }
  return { valid: errors.length===0, errors };
}

export function visibleTags(q) {
  const out = ORIGINS.includes(q?.origin) ? [q.origin] : [];
  if (q?.importance?.selected && has(q.importance?.reason)) out.push('important');
  if (Array.isArray(q?.boardEvidence) && q.boardEvidence.some(b=>has(b.board)&&Number.isInteger(b.year)&&validUrl(b.paperUrl)&&has(b.questionRef)&&has(b.session)&&['exact','conceptual'].includes(b.matchType))) out.push('previously-appeared');
  if (DIFFICULTIES.includes(q?.difficulty)) out.push(q.difficulty);
  return out;
}

// Strict conjunction: missing fields NEVER pass a selected chapter/origin/medium filter.
export function selectApprovedQuestions(records, query={}) {
  const keys=['subjectId','textbookId','edition','grade','chapterId','type','origin','difficulty'];
  return (Array.isArray(records)?records:[]).filter(q=>{
    if (!validateQuestion(q,{forPublication:true}).valid) return false;
    for (const k of keys) {
      if (query[k]===undefined || query[k]===null || query[k]==='') continue;
      const actual=k==='chapterId'?q.chapter?.id:k==='grade'?q.curriculum?.grade:['subjectId','textbookId','edition'].includes(k)?q.curriculum?.[k]:q[k];
      if (actual!==query[k]) return false;
    }
    if (query.important===true && q.importance?.selected!==true) return false;
    if (query.previousBoard===true && !visibleTags(q).includes('previously-appeared')) return false;
    if (!matchesSyllabus(q,{syllabusMode:query.syllabusMode??'full',examYear:query.examYear})) return false;
    if (query.medium==='dual' && q.medium!=='dual') return false;
    if (query.medium==='urdu' && !['urdu','dual'].includes(q.medium)) return false;
    if (query.medium==='english' && !['english','dual'].includes(q.medium)) return false;
    return true;
  });
}

export function duplicateDiagnostics(records) {
  const seenIds=new Set(), seenMeaning=new Map(), errors=[];
  for (const q of records || []) {
    if (seenIds.has(q.id)) errors.push('Duplicate ID: '+q.id);
    seenIds.add(q.id);
    const key=[q.curriculum?.grade,q.curriculum?.subjectId,q.curriculum?.edition,q.chapter?.id,q.type,
      clean(q.content?.en?.stem||q.content?.ur?.stem)].join('::');
    if (seenMeaning.has(key)) errors.push('Duplicate academic question: '+seenMeaning.get(key)+' / '+q.id);
    else seenMeaning.set(key,q.id);
  }
  return errors;
}
