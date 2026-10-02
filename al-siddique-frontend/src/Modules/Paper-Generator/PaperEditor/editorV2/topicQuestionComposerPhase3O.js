// Phase3O isolated topic-wise question selection; dormant until reviewed.
const QUESTION_TYPES = Object.freeze(['mcq','short','long','fill','true_false','definition','numerical','diagram','grammar','translation','essay','letter']);
const LANGUAGES = Object.freeze(['en','ur','hi']);
const trim = v => typeof v === 'string' ? v.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase() : '';
const valid = v => typeof v === 'string' && v.trim().length > 0;
const reject = reason => { throw new Error('Phase3O refused: ' + reason); };

const unique = (arr, name) => {
 const seen = new Set();
 for (const x of arr) {
  if (!valid(x?.id) || seen.has(x.id)) reject('duplicate/invalid ' + name + ' ID');
  seen.add(x.id);
 }
};
const translated = (x,medium) => medium === 'ur' ? x.ur : medium === 'hi' ? x.hi : x.en;
const exact = (value,choices) => valid(value) && choices.some(v=>valid(v)&&trim(v)===trim(value));
// Menu is based on ONLY REGISTERED chapters/topics. Legacy unmatched questions
// remain visible separately and never silently inherit a guessed topic.
function buildRegisteredTopicMenu({subjects=[],chapters=[],questions=[],subjectId,type='mcq',medium='en'}={}) {
 if (![subjects,chapters,questions].every(Array.isArray) ||
     !valid(subjectId) || !QUESTION_TYPES.includes(type) || !LANGUAGES.includes(medium))
  reject('registered subject, type, language and arrays required');
 unique(subjects,'subject'); unique(chapters,'chapter'); unique(questions,'question');
 const subject=subjects.find(s=>s.id===subjectId);
 if (!subject || !valid(subject.syllabusId) || !valid(subject.classId)) reject('unknown school subject/syllabus/class');
 const matches=chapters.filter(ch=>ch.subjectId===subjectId);
 const groups=matches.map(ch=>{
  if (!Array.isArray(ch.topics)) reject('registered topic array missing');
  unique(ch.topics,'topic');
  return {id:ch.id,title:translated(ch,medium)||ch.en||ch.ur,
   meta:ch,topics:ch.topics.map(t=>({id:t.id,title:translated(t,medium)||t.en||t.ur,
    meta:t,questions:[]})),unmapped:[]};
 });
 const topicIds=groups.flatMap(g=>g.topics.map(t=>t.id));
 if (new Set(topicIds).size!==topicIds.length) reject('cross-chapter duplicate topic IDs');
 const outside=[];
 for (const q of questions.filter(q=>q.subjectId===subjectId&&q.type===type)) {
  const found=groups.filter(g=>exact(q.chapterId||q.chapter,
   [g.id,g.meta.en,g.meta.ur,g.meta.hi,String(g.meta.n)]));
  if (found.length!==1) {outside.push({id:q.id,reason:'UNMAPPED_CHAPTER'});continue;}
  const g=found[0], topic=g.topics.filter(t=>exact(q.topicId||q.topic,
   [t.id,t.meta.en,t.meta.ur,t.meta.hi]));
  if (topic.length!==1) {g.unmapped.push({id:q.id,reason:'UNMAPPED_TOPIC'});continue;}
  topic[0].questions.push(q);
 }
 return {subjectId,classId:subject.classId,syllabusId:subject.syllabusId,
  medium,type,chapters:groups,outside,missingVerifiedChapterCatalog:groups.length===0,
  needsMapping:outside.length+groups.reduce((n,g)=>n+g.unmapped.length,0)};
}

function composeTopicPaperBlocks({subjects=[],chapters=[],questions=[],subjectId,medium='en',blocks=[]}={}) {
 if (!Array.isArray(blocks)||blocks.length<1||blocks.length>24) reject('1–24 independently editable blocks required');
 const used=new Set(),blockIds=new Set(),items=[];
 for (let index=0;index<blocks.length;index++) {
  const b=blocks[index];
  if (!valid(b?.id)||blockIds.has(b.id)||!QUESTION_TYPES.includes(b.type)||
      !Array.isArray(b.questionIds)||b.questionIds.length<1||b.questionIds.length>80)
   reject('unique block ID, type, nonempty question selection required');
  blockIds.add(b.id);
  const menu=buildRegisteredTopicMenu({subjects,chapters,questions,subjectId,type:b.type,medium});
  const registered=new Map(menu.chapters.flatMap(ch=>ch.topics.flatMap(topic=>
   topic.questions.map(q=>[q.id,{q,chapterId:ch.id,topicId:topic.id}]))));
  const selected=b.questionIds.map((id,j)=>{
   if (!valid(id)||used.has(id)||!registered.has(id))
    reject('duplicate, unknown or unmapped question selection');
   used.add(id);
   const {q,chapterId,topicId}=registered.get(id);
   const text=medium==='ur'?q.textUrdu:medium==='hi'?q.textHindi:q.text;
   if (!valid(text)) reject('unavailable original question language: '+id);
   if (!Number.isSafeInteger(q.marks)||q.marks<1||q.marks>100) reject('invalid original question marks');
   const optionKey=medium==='ur'?'textUrdu':medium==='hi'?'textHindi':'text';
   if (b.type==='mcq'&&(!Array.isArray(q.options)||q.options.length!==4||
       !q.options.every(o=>valid(o?.[optionKey]))))
    reject('four explicitly authored '+medium+' MCQ options required');
   return {number:j+1,questionId:id,chapterId,topicId,
    text,marks:q.marks,type:q.type,
    options:b.type==='mcq'?q.options.map(o=>({label:o.label,text:o[optionKey]})):[]};
  });
  if (!Number.isSafeInteger(b.attemptAny)||b.attemptAny<1||b.attemptAny>selected.length)
   reject('attemptAny must be between 1 and selected questions');
  const per=selected[0].marks;
  if (selected.some(q=>q.marks!==per)||
      (b.marksPerQuestion!==undefined&&b.marksPerQuestion!==per))
   reject('mixed/changed marks require a separate original-question block');
  items.push({id:b.id,order:index+1,type:b.type,medium,
   instruction:b.attemptAny===selected.length?'Attempt all':'Attempt any '+b.attemptAny,
   selectedCount:selected.length,attemptAny:b.attemptAny,
   marksPerQuestion:per,totalMarks:b.attemptAny*per,questions:selected});
 }
 return {schema:'assps-phase3o-topic-paper-selection',version:1,
  status:'UNSAVED_COMPOSITION_ONLY',subjectId,medium,blocks:items,
  totalMarks:items.reduce((n,b)=>n+b.totalMarks,0),
  sourcePaperUpdated:false,existingQuestionBankMutated:false,printerOrProductionApproved:false};
}
export {QUESTION_TYPES as PHASE3O_QUESTION_MENU,LANGUAGES as PHASE3O_LANGUAGES,
 buildRegisteredTopicMenu,composeTopicPaperBlocks};
