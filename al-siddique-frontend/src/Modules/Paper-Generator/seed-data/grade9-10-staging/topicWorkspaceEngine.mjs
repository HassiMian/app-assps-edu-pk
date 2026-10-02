// Isolated IX/X curriculum authoring projection. NO live store or network calls.
export const AUTHORING_TYPES=Object.freeze(['mcq','short','long','numerical','diagram','fill','grammar','comprehension']);
export const ORIGIN_TYPES=Object.freeze(['exercise','additional','conceptual']);
export const VIEW_LANGUAGES=Object.freeze(['en','ur','dual','hi']);
const text=v=>typeof v==='string'?v.trim():'';
const groupedKey=(chapterId,topicId)=>chapterId+'::'+topicId;
export function getTopicNode(ledger,chapterId,topicId){
 const ch=(ledger?.chapters||[]).find(ch=>ch.id===chapterId);
 const topic=ch?.topics?.find(t=>t.id===topicId);
 return ch&&topic?{chapter:ch,topic}:null;
}
// Exercise reference must be assigned to a verified topic via an independently reviewed mapping.
// Counts of exercise placeholders are NOT approved questions and have no presumptive topic.
export function newTopicDraft({id,ledger,chapterId,topicId,type='short',origin='additional',
 en='',ur='',hi='',answerEn='',answerUr='',answerHi='',marks=2,importance=false,
 importanceReason='',traditional=false,difficulty='medium',evidencePage=null,exerciseRef=null,
 optEn=['','','',''],optUr=['','','',''],optHi=['','','',''],correctOptionId='A'}){
 const node=getTopicNode(ledger,chapterId,topicId);
 const errors=[];
 if(!text(id))errors.push('Permanent question ID required');
 if(!node)errors.push('Choose a verified chapter/topic identity');
 if(!AUTHORING_TYPES.includes(type))errors.push('Unsupported type');
 if(!ORIGIN_TYPES.includes(origin))errors.push('Invalid origin');
 if(!Number.isFinite(marks)||marks<=0)errors.push('Marks must be positive');
 if(!['easy','medium','difficult'].includes(difficulty))errors.push('Difficulty must be Easy, Medium or Difficult');
 if(!Number.isInteger(evidencePage)||evidencePage<1||evidencePage>ledger?.source?.pdfPages)
  errors.push('All original and exercise drafts need a physical source page within the verified PDF');
 if(importance&&!text(importanceReason))errors.push('Importance requires a rationale');
 if(origin==='exercise'){
  if(!text(exerciseRef))errors.push('Exercise additionally needs an individually checked source reference');
 }else if(exerciseRef)errors.push('Original topic-authored work must not claim exercise origin');
 if(!text(en)) errors.push('An English draft question is required');
 if(type!=='mcq'&&!text(answerEn)) errors.push('An English draft answer is required');
 if(type!=='mcq'&&text(ur)&&!text(answerUr))errors.push('A drafted Urdu question requires its Urdu answer');
 if(type!=='mcq'&&text(hi)&&!text(answerHi))errors.push('A drafted Hindi question requires its Hindi answer');
 if(type==='mcq'){
  if(!Array.isArray(optEn)||optEn.length!==4||optEn.some(o=>!text(o))) errors.push('MCQ requires four real English options');
  if(!['A','B','C','D'].includes(correctOptionId)) errors.push('MCQ correct option must be A, B, C or D');
  if(text(ur)&&(!Array.isArray(optUr)||optUr.length!==4||optUr.some(o=>!text(o)))) errors.push('Urdu MCQ must have four aligned option translations');
  if(text(hi)&&(!Array.isArray(optHi)||optHi.length!==4||optHi.some(o=>!text(o)))) errors.push('Hindi MCQ must have four aligned option translations');
 }
 if(errors.length)return {valid:false,errors,question:null};
 const question={id,chapter:{id:chapterId,number:node.chapter.number},topicId,
  type,origin,marks,difficulty,importance:{selected:importance,reason:importanceReason},
  editorial:{traditional:!!traditional},source:{catalogRecordId:ledger.source.catalogRecordId,
   pdfSha256:ledger.source.pdfSha256,page:evidencePage,exerciseRef:origin==='exercise'?exerciseRef:null,
   topicIndexEvidence:'TABLE_OF_CONTENTS_FIRST_PASS'},
  curriculum:{authority:'PECTAA',grade:9,subjectId:'biology',edition:ledger.curriculum.catalogEditionLabel,
   languageSource:'en'},correctOptionId:type==='mcq'?correctOptionId:null,
  content:Object.fromEntries(['en','ur','hi'].map((l)=>{
   const stem={en,ur,hi}[l],answer={en:answerEn,ur:answerUr,hi:answerHi}[l];
   const options={en:optEn,ur:optUr,hi:optHi}[l];
   const value={stem:stem.trim(),answer:type==='mcq'?text(options['ABCD'.indexOf(correctOptionId)]):text(answer)};
   if(type==='mcq')value.options=options.map((o,i)=>({id:'ABCD'[i],text:text(o)}));
   return [l,value];
  })),
  review:{status:'draft',checks:{source:false,academic:false,answer:false,english:false,
   urdu:false,translation:false,syllabus:false,duplicate:false,hindi:false}},
  syllabusScope:{alpStatus:'unverified'},boardEvidence:[]};
 return {valid:true,errors:[],question};
}
export function viewLanguage(q,language){
 if(language==='dual')return !!text(q?.content?.en?.stem)&&!!text(q?.content?.ur?.stem);
 if(!VIEW_LANGUAGES.includes(language))return false;
 if(language==='hi')return !!text(q?.content?.hi?.stem); // Authoring preview only; publication requires Hindi review.
 return !!text(q?.content?.[language]?.stem);
}
export function projectTopicTree({ledger,questions=[],type='short',origin='all',importantOnly=false,
 traditionalOnly=false,language='en',showEmptyTopics=true,search=''}={}){
 if(!ledger?.chapters||!AUTHORING_TYPES.includes(type)||!VIEW_LANGUAGES.includes(language))return [];
 const qlist=Array.isArray(questions)?questions:[];
 const term=text(search).toLocaleLowerCase();
 return ledger.chapters.map(ch=>{
  const topics=ch.topics.map(t=>{
   const questionsInTopic=qlist.filter(q=>q.chapter?.id===ch.id&&q.topicId===t.id&&q.type===type
    &&(origin==='all'||q.origin===origin)&&(!importantOnly||q.importance?.selected===true)
    &&(!traditionalOnly||q.editorial?.traditional===true)
    &&viewLanguage(q,language)&&(!term||[t.title,q.content?.en?.stem,q.content?.ur?.stem,q.content?.hi?.stem]
     .some(s=>String(s||'').toLocaleLowerCase().includes(term))));
   return {id:t.id,title:t.title,chapterId:ch.id,indexPage:t.tocPage,questions:questionsInTopic};
  }).filter(t=>showEmptyTopics||t.questions.length>0);
  return {id:ch.id,number:ch.number,title:ch.title,topics,count:topics.reduce((n,t)=>n+t.questions.length,0)};
 }).filter(ch=>ch.topics.length>0);
}
export function validateQuestionBlocks(blocks,questions,{language='en'}={}){
 const ids=new Set(),errors=[],sections=[];
 for(const [i,b] of (Array.isArray(blocks)?blocks:[]).entries()){
  const members=(b.questionIds||[]).map(id=>questions.find(q=>q.id===id));
  if(!b.type||!AUTHORING_TYPES.includes(b.type))errors.push('Block '+(i+1)+' missing type');
  if(members.length===0)errors.push('Block '+(i+1)+' is empty');
  if(members.some(q=>!q)){errors.push('Block '+(i+1)+' references a missing question');continue;}
  if(members.some(q=>q.type!==b.type))errors.push('Block '+(i+1)+' mixes question types');
  for(const q of members){
   if(ids.has(q.id))errors.push('Duplicate question identity: '+q.id);
   ids.add(q.id);
   if(!viewLanguage(q,language))errors.push('Missing '+language+' content: '+q.id);
   if(!Number.isFinite(q.marks)||q.marks<=0)errors.push('Invalid marks: '+q.id);
  }
  const attempt=Number(b.attemptAny??members.length);
  if(!Number.isInteger(attempt)||attempt<1||attempt>members.length)errors.push('Block '+(i+1)+' has invalid attempt count');
  const marksSet=new Set(members.map(q=>q.marks));
  if(marksSet.size!==1)errors.push('Block '+(i+1)+' requires uniform marks for attempt-any calculations');
  sections.push({type:b.type,questionIds:members.map(q=>q.id),offered:members.length,
   attemptAny:attempt,marksEach:marksSet.size===1?members[0].marks:null,
   totalMarks:marksSet.size===1&&Number.isInteger(attempt)&&attempt>0&&attempt<=members.length
    ?attempt*members[0].marks:null});
 }
 return {valid:errors.length===0,errors,totalMarks:errors.length?null:sections.reduce((sum,s)=>sum+s.totalMarks,0),sections};
}
export const topicIdentity=(q)=>groupedKey(q.chapter?.id,q.topicId);
