// Phase 3Q: isolated, read-only teacher selection workspace. Never a publication/auth boundary.
// Source records and publication ownership remain with the Curriculum workstream.
import {buildRegisteredTopicMenu, PHASE3O_QUESTION_MENU} from './topicQuestionComposerPhase3O.js';
import {PHASE3P_SCHEMA,composeCurriculumPhase3PPreview} from './curriculumPhase3PBridge.js';
export const PHASE3Q_SCHEMA='assps-phase3q-curriculum-studio-v1';
const refuse=reason=>{throw new Error('Phase3Q refused: '+reason);};
const valid=x=>typeof x==='string'&&x.trim().length>0;
const approved=p=>p?.schema===PHASE3P_SCHEMA&&p.status==='READ_ONLY_APPROVED_PROJECTION'&&
 Array.isArray(p.subjects)&&p.subjects.length===1&&Array.isArray(p.chapters)&&
 Array.isArray(p.questions)&&p.questions.every(q=>valid(q.id)&&
 q.academicRecord?.id===q.id&&q.academicRecord?.review?.status==='approved');
const sourceKey=p=>JSON.stringify([p.revision??null,p.publicationLineage??null,
 p.identity,p.sourceBookIds,p.sourceChecksums,
 p.selection,p.chapters,p.questions.map(q=>[q.id,q.type,q.marks,q.chapterId,q.topicId,
 q.text,q.textUrdu,q.options,q.academicRecord?.revision??null,
 q.academicRecord?.review?.status,q.academicRecord?.source?.languages])]);
const blank=()=>({schema:PHASE3Q_SCHEMA,status:'WAITING_FOR_APPROVED_SOURCE',sourceKey:null,
 medium:'en',chapterId:null,topicId:null,activeBlockId:null,blocks:[],
 livePaperUpdated:false,legacyBankWriteAllowed:false});
export function createPhase3QWorkspace(projection){
 if(!projection)return blank();
 if(!approved(projection))refuse('complete reviewed Phase3P projection required');
 if(projection.questions.length===0)return blank();
 const first=projection.chapters.find(c=>c.topics?.length);
 if(!first)refuse('verified canonical chapter/topic catalog is required');
 return {...blank(),status:'UNSAVED_LOCAL_SELECTION',sourceKey:sourceKey(projection),
  chapterId:first.id,topicId:first.topics[0].id,activeBlockId:'block-1',
  blocks:[{id:'block-1',type:'mcq',questionIds:[],attemptAny:0}]};
}
function checked(state,projection){
 if(!approved(projection)||!state||state.schema!==PHASE3Q_SCHEMA||
    state.status!=='UNSAVED_LOCAL_SELECTION'||state.sourceKey!==sourceKey(projection))
  refuse('missing, stale or unapproved selection snapshot');
 return state;
}
const patchBlock=(state,id,fn)=>({...state,blocks:state.blocks.map(b=>b.id===id?fn(b):b)});
const nextId=blocks=>{let n=1;while(blocks.some(b=>b.id==='block-'+n))n++;return 'block-'+n;};
export function phase3QSelectTopic(state,projection,chapterId,topicId){
 checked(state,projection);
 if(!projection.chapters.some(c=>c.id===chapterId&&c.topics.some(t=>t.id===topicId)))
  refuse('topic not registered in approved canonical catalog');
 return {...state,chapterId,topicId};
}
export function phase3QSetMedium(state,projection,medium){
 checked(state,projection);if(!['en','ur'].includes(medium))refuse('only reviewed EN/UR supported');
 return {...state,medium};
}
export function phase3QAddBlock(state,projection,type='short'){
 checked(state,projection);
 if(!PHASE3O_QUESTION_MENU.includes(type)||state.blocks.length>=24)refuse('invalid type or block limit');
 const id=nextId(state.blocks);
 return {...state,activeBlockId:id,blocks:[...state.blocks,{id,type,questionIds:[],attemptAny:0}]};
}
export function phase3QSwitchType(state,projection,type){
 checked(state,projection);
 if(!PHASE3O_QUESTION_MENU.includes(type))refuse('unsupported question type');
 const prior=[...state.blocks].reverse().find(b=>b.type===type);
 return prior?{...state,activeBlockId:prior.id}:phase3QAddBlock(state,projection,type);
}
export function phase3QActivateBlock(state,projection,id){
 checked(state,projection);if(!state.blocks.some(b=>b.id===id))refuse('unknown question block');
 return {...state,activeBlockId:id};
}
export function phase3QToggleQuestion(state,projection,questionId){
 checked(state,projection);
 const block=state.blocks.find(b=>b.id===state.activeBlockId);
 if(!block)refuse('choose a question block first');
 const menu=buildRegisteredTopicMenu({subjects:projection.subjects,chapters:projection.chapters,
  questions:projection.questions,subjectId:projection.subjects[0].id,type:block.type,medium:state.medium});
 const q=menu.chapters.find(c=>c.id===state.chapterId)?.topics.find(t=>t.id===state.topicId)
  ?.questions.find(x=>x.id===questionId);
 if(!q)refuse('question is outside the visible, approved topic/type');
 if(state.blocks.some(b=>b.id!==block.id&&b.questionIds.includes(questionId)))
  refuse('one question cannot be counted in separate paper blocks');
 const was=block.questionIds.includes(questionId);
 const previous=block.questionIds.length?projection.questions.find(x=>x.id===block.questionIds[0]):null;
 if(!was&&previous&&previous.marks!==q.marks)refuse('different marks need a separate block');
 if(!was&&block.questionIds.length>=80)refuse('maximum 80 questions per block');
 const ids=was?block.questionIds.filter(id=>id!==questionId):[...block.questionIds,questionId];
 return patchBlock(state,block.id,b=>({...b,questionIds:ids,
  attemptAny:ids.length?Math.min(ids.length,Math.max(1,b.attemptAny)):0}));
}
export function phase3QSetAttemptAny(state,projection,count){
 checked(state,projection);const block=state.blocks.find(b=>b.id===state.activeBlockId);
 if(!block||!Number.isSafeInteger(count)||count<1||count>block.questionIds.length)
  refuse('Attempt Any must be within the selected question count');
 return patchBlock(state,block.id,b=>({...b,attemptAny:count}));
}
export function phase3QRemoveBlock(state,projection,id){
 checked(state,projection);
 if(!state.blocks.some(b=>b.id===id))refuse('unknown block');
 const remaining=state.blocks.filter(b=>b.id!==id);
 if(!remaining.length)refuse('at least one editable block must remain');
 return {...state,blocks:remaining,activeBlockId:state.activeBlockId===id?remaining[0].id:state.activeBlockId};
}
export function phase3QTopicMenu(state,projection){
 checked(state,projection);const b=state.blocks.find(x=>x.id===state.activeBlockId);
 if(!b)refuse('active block missing');
 return buildRegisteredTopicMenu({subjects:projection.subjects,chapters:projection.chapters,
  questions:projection.questions,subjectId:projection.subjects[0].id,type:b.type,medium:state.medium});
}
export function phase3QPreview(state,projection){
 checked(state,projection);
 const populated=state.blocks.filter(b=>b.questionIds.length);
 if(!populated.length)return {status:'EMPTY_UNSAVED_PREVIEW',totalMarks:0,blocks:[],
  sourcePaperUpdated:false,legacyBankWriteAllowed:false,printApproved:false};
 return composeCurriculumPhase3PPreview({projection,blocks:populated,medium:state.medium});
}
export function phase3QRemoveSelectedQuestion(state,projection,blockId,questionId){
 checked(state,projection);
 const block=state.blocks.find(b=>b.id===blockId);
 if(!block||!block.questionIds.includes(questionId))refuse('unknown selected question');
 const ids=block.questionIds.filter(id=>id!==questionId);
 return patchBlock(state,blockId,b=>({...b,questionIds:ids,
  attemptAny:ids.length?Math.min(b.attemptAny,ids.length):0}));
}
export function phase3QMoveSelectedQuestion(state,projection,blockId,questionId,direction){
 checked(state,projection);
 if(![-1,1].includes(direction))refuse('invalid move direction');
 const block=state.blocks.find(b=>b.id===blockId),from=block?.questionIds.indexOf(questionId)??-1;
 if(from<0)refuse('unknown selected question');
 const to=from+direction;if(to<0||to>=block.questionIds.length)return state;
 return patchBlock(state,blockId,b=>{const ids=[...b.questionIds];
  [ids[from],ids[to]]=[ids[to],ids[from]];return {...b,questionIds:ids};});
}
