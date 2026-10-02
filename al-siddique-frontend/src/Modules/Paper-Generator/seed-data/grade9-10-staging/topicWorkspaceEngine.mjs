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
export function newTopicDraft({id,ledger,urduLedger=null,chapterId,topicId,type='short',origin='additional',
 en='',ur='',hi='',answerEn='',answerUr='',answerHi='',marks=2,importance=false,
 importanceReason='',traditional=false,difficulty='medium',evidencePage=null,urduEvidencePage=null,exerciseRef=null,
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
  errors.push('All drafts need a physical English-source page within the verified PDF');
 const rangeReady=Number.isInteger(node?.topic?.verifiedPhysicalStartPage)&&Number.isInteger(node?.topic?.verifiedPhysicalEndPage)
  &&node.topic.pageAuditStatus==='VISUALLY_CHECKED';
 if(origin!=='exercise'){
  if(!rangeReady)errors.push('Topic authoring is blocked until its physical page range is independently verified');
  else if(Number.isInteger(evidencePage)&&(evidencePage<node.topic.verifiedPhysicalStartPage||evidencePage>node.topic.verifiedPhysicalEndPage))
   errors.push('English source page is outside the verified topic range');
 }
 if(importance&&!text(importanceReason))errors.push('Importance requires a rationale');
 if(origin==='exercise'){
  const section=(node?.chapter?.exercise?.sections||[]).find(s=>(s.questionSourceRefs||[]).includes(exerciseRef));
  if(!text(exerciseRef)||!section)errors.push('Exercise requires a known exercise reference');
  if(!section||section.individualQuestionPageMapStatus!=='VERIFIED')errors.push('Exercise authoring is blocked until the exact exercise item page is individually verified');
 }else if(exerciseRef)errors.push('Original topic-authored work must not claim exercise origin');
 if(!text(en)) errors.push('An English draft question is required');
 if(type!=='mcq'&&!text(answerEn)) errors.push('An English draft answer is required');
 if(type!=='mcq'&&text(ur)&&!text(answerUr))errors.push('A drafted Urdu question requires its Urdu answer');
 let urduNode=null;
 if(text(ur)){
  urduNode=(urduLedger?.chapters||[]).find(c=>c.number===node?.chapter?.number)?.topics?.find(t=>t.id===topicId)||null;
  const urduRangeReady=Number.isInteger(urduNode?.verifiedPhysicalStartPage)&&Number.isInteger(urduNode?.verifiedPhysicalEndPage)
   &&urduNode.pageAuditStatus==='VISUALLY_CHECKED';
  if(!urduRangeReady)errors.push('Urdu rendition is blocked until the matching Urdu topic page range is verified');
  if(!Number.isInteger(urduEvidencePage))errors.push('Urdu rendition needs its own physical source page');
  else if(urduRangeReady&&(urduEvidencePage<urduNode.verifiedPhysicalStartPage||urduEvidencePage>urduNode.verifiedPhysicalEndPage))
   errors.push('Urdu source page is outside the verified Urdu topic range');
 }
 if(type!=='mcq'&&text(hi)&&!text(answerHi))errors.push('A drafted Hindi question requires its Hindi answer');
 if(type==='mcq'){
  if(!Array.isArray(optEn)||optEn.length!==4||optEn.some(o=>!text(o))) errors.push('MCQ requires four real English options');
  if(!['A','B','C','D'].includes(correctOptionId)) errors.push('MCQ correct option must be A, B, C or D');
  if(text(ur)&&(!Array.isArray(optUr)||optUr.length!==4||optUr.some(o=>!text(o)))) errors.push('Urdu MCQ must have four aligned option translations');
  if(text(hi)&&(!Array.isArray(optHi)||optHi.length!==4||optHi.some(o=>!text(o)))) errors.push('Hindi MCQ must have four aligned option translations');
 }
 if(errors.length)return {valid:false,errors,question:null};
 const question={id,chapter:{id:chapterId,number:node.chapter.number},topicId,
  type,origin,marks,difficulty,medium:text(ur)?'dual':'english',importance:{selected:importance,reason:importanceReason},
  editorial:{traditional:!!traditional},source:{catalogRecordId:ledger.source.catalogRecordId,
   pdfSha256:ledger.source.pdfSha256,page:evidencePage,exerciseRef:origin==='exercise'?exerciseRef:null,
   topicIndexEvidence:'VISUALLY_VERIFIED_TOPIC_RANGE',languages:{
    en:{catalogRecordId:ledger.source.catalogRecordId,pdfSha256:ledger.source.pdfSha256,page:evidencePage,
     exerciseRef:origin==='exercise'?exerciseRef:null},
    ...(text(ur)?{ur:{catalogRecordId:urduLedger.source.catalogRecordId,pdfSha256:urduLedger.source.pdfSha256,
     page:urduEvidencePage,exerciseRef:null}}:{})}},
  curriculum:{authority:'PECTAA',grade:9,subjectId:'biology',edition:ledger.curriculum.catalogEditionLabel,
   catalogRecordIds:{en:ledger.source.catalogRecordId,...(text(ur)&&urduLedger?.source?.catalogRecordId?{ur:urduLedger.source.catalogRecordId}:{})},
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
 if(!VIEW_LANGUAGES.includes(language))return false;
 const enEvidence=q?.source?.languages?.en||(q?.source?.pdfSha256&&Number.isInteger(q?.source?.page)?q.source:null);
 const urEvidence=q?.source?.languages?.ur;
 const enReady=!!text(q?.content?.en?.stem)&&!!enEvidence?.pdfSha256&&Number.isInteger(enEvidence?.page);
 const urReady=!!text(q?.content?.ur?.stem)&&!!urEvidence?.pdfSha256&&Number.isInteger(urEvidence?.page);
 if(language==='dual')return enReady&&urReady;
 if(language==='ur')return urReady;
 if(language==='hi')return !!text(q?.content?.hi?.stem); // Authoring preview only; publication requires Hindi review.
 return enReady;
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
