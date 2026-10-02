// Dormant visual selector: NO store or network mutation, no new live paper/print route.
import { useMemo, useState } from 'react';
import { PHASE3O_QUESTION_MENU, buildRegisteredTopicMenu,
 composeTopicPaperBlocks } from './topicQuestionComposerPhase3O.js';
export default function TopicQuestionSelectorPhase3O({
 subjects=[],chapters=[],questions=[],subjectId,medium='en',onDraft
}) {
 const [blocks,setBlocks]=useState([{id:'block-1',type:'mcq',questionIds:[],attemptAny:1}]);
 const [active,setActive]=useState('block-1');
 const [error,setError]=useState('');
 const current=blocks.find(b=>b.id===active)||blocks[0];
 const menu=useMemo(()=>{
  try{return buildRegisteredTopicMenu({subjects,chapters,questions,subjectId,
   type:current.type,medium});}catch{return null;}
 },[subjects,chapters,questions,subjectId,current.type,medium]);
 const direction=medium==='ur'?'rtl':'ltr';
 const patch=fn=>{setBlocks(prev=>prev.map(b=>b.id===active?fn(b):b));setError('');};
 const createBlock=()=>{
  const ids=new Set(blocks.map(b=>b.id));
  let n=1;while(ids.has('block-'+n))n+=1;
  const id='block-'+n;
  setBlocks(prev=>[...prev,{id,type:'short',questionIds:[],attemptAny:1}]);
  setActive(id);setError('');
 };
 const selectQuestion=id=>patch(b=>{
  const has=b.questionIds.includes(id);
  const questionIds=has?b.questionIds.filter(x=>x!==id):[...b.questionIds,id];
  return {...b,questionIds,attemptAny:Math.max(1,Math.min(b.attemptAny,questionIds.length))};
 });
 const submit=()=>{
  try {
   const draft=composeTopicPaperBlocks({subjects,chapters,questions,subjectId,medium,blocks});
   setError('');
   if(typeof onDraft==='function')onDraft(draft);
  }catch(e){setError(e.message||'Unable to assemble the selected source questions.');}
 };
 return <section dir={direction} data-phase3o-topic-selector
  style={{display:'grid',gap:12,padding:16,border:'1px solid #789',borderRadius:12}}>
  <header><strong>Topic-wise Question Selection</strong>
   <small style={{display:'block'}}>An unsigned, unsaved composition. Existing paper and bank remain unchanged.</small></header>
  <nav aria-label="Question blocks" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
   {blocks.map(b=><button type="button" key={b.id} aria-pressed={active===b.id}
    onClick={()=>setActive(b.id)}>{b.id} · {b.type.toUpperCase()} ({b.questionIds.length})</button>)}
   <button type="button" onClick={createBlock} disabled={blocks.length>=24}>+ Add block</button>
  </nav>
  <label>Question menu <select value={current.type} onChange={e=>patch(b=>({...b,type:e.target.value,questionIds:[],attemptAny:1}))}>
   {PHASE3O_QUESTION_MENU.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
  </select></label>
  <div style={{display:'grid',gap:12}}>
   {menu?.chapters.map(ch=><section key={ch.id} data-chapter-id={ch.id}>
    <strong>{ch.title}</strong>
    {ch.topics.map(topic=><div key={topic.id} data-topic-id={topic.id}
     style={{marginBlock:8,padding:8,border:'1px solid #7894',borderRadius:6}}>
     <strong>{topic.title} — {topic.questions.length}</strong>
     {topic.questions.map(q=><label key={q.id} style={{display:'block',marginBlock:6}}>
      <input type="checkbox" checked={current.questionIds.includes(q.id)}
       onChange={()=>selectQuestion(q.id)} />
      {' '}{medium==='ur'?q.textUrdu:medium==='hi'?q.textHindi:q.text||'[Original text unavailable]'}
     </label>)}
    </div>)}
    {ch.unmapped.length>0&&<small>{ch.unmapped.length} legacy questions need manual topic mapping.</small>}
   </section>)}
   {!menu&&<small>Choose an existing registered school subject and question type.</small>}
   {menu?.missingVerifiedChapterCatalog&&<small>Verified chapter/topic catalog is missing for this subject. No textbook topic will be invented.</small>}
   {menu?.outside.length>0&&<small>{menu.outside.length} questions need verified chapter mapping.</small>}
  </div>
  <label>Attempt any
   <input type="number" min="1" max={Math.max(1,current.questionIds.length)}
    value={current.attemptAny} onChange={e=>patch(b=>({...b,attemptAny:Number(e.target.value)}))} />
   / {current.questionIds.length} selected
  </label>
  {error&&<p role="alert">{error}</p>}
  <button type="button" onClick={submit}>Preview selected paper blocks (no save)</button>
 </section>;
}
