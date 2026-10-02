// Dormant Phase3Q UI. Approval and tenant authorization MUST be enforced by a future server provider.
import React,{useEffect,useMemo,useState} from 'react';
import {PHASE3O_QUESTION_MENU} from './topicQuestionComposerPhase3O.js';
import {createPhase3QWorkspace,phase3QSelectTopic,phase3QSetMedium,phase3QAddBlock,
 phase3QSwitchType,phase3QActivateBlock,phase3QToggleQuestion,phase3QSetAttemptAny,
 phase3QRemoveBlock,phase3QTopicMenu,phase3QPreview,
 phase3QRemoveSelectedQuestion,phase3QMoveSelectedQuestion} from './curriculumPreparationPhase3Q.js';
const surface={border:'1px solid var(--pg-border,#405269)',borderRadius:12,padding:14,
 background:'var(--pg-card,#102b4c)',color:'var(--pg-text,#eef2f7)'};
const btn={padding:'7px 10px',border:'1px solid #718096',borderRadius:7,
 background:'transparent',color:'inherit',cursor:'pointer'};
const title={fontWeight:750,fontSize:13};
export default function CurriculumPaperStudioPhase3Q({projection=null,onPreview,onBlank}){
 const [workspace,setWorkspace]=useState(()=>{try{return createPhase3QWorkspace(projection);}catch{return createPhase3QWorkspace();}});
 const [error,setError]=useState('');
 useEffect(()=>{try{setWorkspace(createPhase3QWorkspace(projection));setError('');}
  catch(e){setWorkspace(createPhase3QWorkspace());setError(e.message);}},[projection]);
 const change=fn=>{try{const next=fn(workspace);setWorkspace(next);setError('');}catch(e){setError(e.message);}};
 const ready=workspace.status==='UNSAVED_LOCAL_SELECTION';
 const menu=useMemo(()=>{if(!ready)return null;
  try{return phase3QTopicMenu(workspace,projection);}catch{return null;}
 },[workspace,projection,ready]);
 const preview=useMemo(()=>{if(!ready)return null;
  try{return phase3QPreview(workspace,projection);}catch(e){return {status:'INVALID_PREVIEW',reason:e.message};}
 },[workspace,projection,ready]);
 const block=workspace.blocks.find(b=>b.id===workspace.activeBlockId);
 const chosen=menu?.chapters.find(c=>c.id===workspace.chapterId)
  ?.topics.find(t=>t.id===workspace.topicId);
 const composed=preview?.composition;
 const sections=composed?.blocks??[];
 const direction=workspace.medium==='ur'?'rtl':'ltr';
 const selectedCount=workspace.blocks.reduce((n,b)=>n+b.questionIds.length,0);
 const handleSelect=q=>change(s=>phase3QToggleQuestion(s,projection,q.id));
 return <main data-phase3q-paper-studio style={{color:'var(--pg-text,#eef2f7)',padding:12}}>
  <header style={{...surface,marginBottom:12}}>
   <div style={{fontSize:11,letterSpacing:1.2}}>ASSPS · PHASE 3Q · ISOLATED WORKSPACE</div>
   <h2 style={{margin:'5px 0'}}>Build Your Paper</h2>
   <p style={{fontSize:12,opacity:.8,margin:0}}>Topic-wise selection, instant unsaved preview. No live bank, printer or existing paper is modified.</p>
   <div style={{fontSize:12,marginTop:8}}>
    {ready?'Class/Grade '+projection.identity?.grade+' · '+projection.identity?.subjectId:
     'Awaiting independently approved, bilingual academic questions'}
    {' · '}<strong>{selectedCount} selected</strong>
    {' · '}{ready?'Full textbook / verified ALP per source selection':'No demo questions shown'}
   </div>
  </header>
  {!ready?<section style={surface} role="status">
   <strong>Approved source is not ready.</strong>
   <p>Curriculum workstream must publish a verified, authorized read-only snapshot. Unapproved drafts are not selectable here.</p>
   {error&&<p role="alert">{error}</p>}
   {typeof onBlank==='function'&&<button type="button" style={btn} onClick={onBlank}>Open independent Blank Paper workflow</button>}
  </section>:<>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
    <span style={{fontSize:12,alignSelf:'center'}}>Paper language:</span>
    {['en','ur'].map(lang=><button type="button" key={lang} style={{...btn,
     borderColor:workspace.medium===lang?'#c8991a':'#718096'}}
     aria-pressed={workspace.medium===lang}
     onClick={()=>change(s=>phase3QSetMedium(s,projection,lang))}>{lang==='en'?'English':'Urdu'}</button>)}
    <span style={{fontSize:12,alignSelf:'center'}}>Source: {projection.selection?.syllabusMode?.toUpperCase()}</span>
   </div>
   <nav aria-label="Question type" style={{...surface,display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
    {PHASE3O_QUESTION_MENU.map(type=><button key={type} type="button"
     aria-pressed={block?.type===type} style={{...btn,borderColor:block?.type===type?'#c8991a':'#718096'}}
     onClick={()=>change(s=>phase3QSwitchType(s,projection,type))}>{type.replace('_',' ').toUpperCase()}</button>)}
   </nav>
   <div style={{display:'grid',gridTemplateColumns:'minmax(145px,.8fr) minmax(260px,1.5fr) minmax(260px,1.2fr)',gap:12}}>
    <aside style={surface} aria-label="Verified chapters and topics">
     <div style={title}>Chapters & Topics</div>
     {menu?.chapters.map(ch=><section key={ch.id} style={{marginTop:12}}>
      <strong style={{fontSize:12}} dir={direction}>{ch.title}</strong>
      {ch.topics.map(t=><button type="button" key={t.id} data-topic-id={t.id}
       aria-pressed={workspace.chapterId===ch.id&&workspace.topicId===t.id}
       onClick={()=>change(s=>phase3QSelectTopic(s,projection,ch.id,t.id))}
       style={{...btn,display:'block',marginTop:6,width:'100%',textAlign:direction==='rtl'?'right':'left',
       borderColor:workspace.chapterId===ch.id&&workspace.topicId===t.id?'#c8991a':'#718096'}}>
       <span dir={direction}>{t.title}</span> <small>({t.questions.length})</small>
      </button>)}
     </section>)}
     {(menu?.outside.length||menu?.needsMapping)&&<p style={{fontSize:11}}>Unmapped legacy records remain excluded from the approved topic list.</p>}
    </aside>
    <section style={surface} aria-label="Approved topic questions">
     <div style={title}>{chosen?.title??'Choose a topic'} · {block?.type?.toUpperCase()}</div>
     {!chosen?.questions.length&&<p style={{fontSize:12,opacity:.7}}>No approved questions of this type in the selected topic.</p>}
     {chosen?.questions.map(q=><article key={q.id} style={{...surface,marginTop:9}} dir={direction}>
      <div style={{fontSize:12,lineHeight:1.65}}>{workspace.medium==='ur'?q.textUrdu:q.text}</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginTop:8}}>
       <small>{q.marks} mark(s)</small>
       <button type="button" style={btn} aria-pressed={block.questionIds.includes(q.id)}
        onClick={()=>handleSelect(q)}>{block.questionIds.includes(q.id)?'− Remove':'+ Add to paper'}</button>
      </div>
      <details style={{fontSize:11,marginTop:7}}><summary>Teacher: answer & source</summary>
       <p>{q.academicRecord?.content?.[workspace.medium]?.answer}</p>
       <small>Academic ID: {q.id}</small>
      </details>
     </article>)}
    </section>
    <aside style={surface} aria-label="Live unsaved paper">
     <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
      <span style={title}>Live Paper Preview</span>
      <strong>{composed?.totalMarks??0} marks</strong>
     </div>
     {workspace.blocks.map(b=><div key={b.id} style={{borderBottom:'1px solid #71809655',padding:'9px 0'}}>
      <button type="button" style={{...btn,borderColor:b.id===block?.id?'#c8991a':'#718096'}}
       onClick={()=>change(s=>phase3QActivateBlock(s,projection,b.id))}>
       {b.type.toUpperCase()} · {b.questionIds.length} selected</button>
      {b.id===block?.id&&<div style={{display:'flex',alignItems:'center',gap:5,marginTop:6,fontSize:12}}>
       <label>Attempt any <input type="number" style={{width:46}} min="1" max={b.questionIds.length}
        disabled={!b.questionIds.length} value={b.attemptAny||''}
        onChange={e=>change(s=>phase3QSetAttemptAny(s,projection,Number(e.target.value)))}/></label>
       <button type="button" style={btn} disabled={workspace.blocks.length===1}
        onClick={()=>change(s=>phase3QRemoveBlock(s,projection,b.id))}>×</button>
      </div>}
     </div>)}
     <button type="button" style={{...btn,margin:'9px 0'}} disabled={workspace.blocks.length>=24}
      onClick={()=>change(s=>phase3QAddBlock(s,projection,block?.type||'short'))}>+ Separate choice block</button>
     {sections.map(s=><section key={s.id} dir={direction} style={{...surface,marginTop:8}}>
      <strong>{s.type.toUpperCase()} · {s.instruction} · {s.totalMarks} marks</strong>
      {s.questions.map(q=><div key={q.questionId} style={{fontSize:12,margin:'8px 0'}}>
       <span>{q.number}. {q.text}</span>
       <div style={{display:'flex',gap:5,marginTop:4}}>
        <button type="button" style={btn} aria-label="Move question up"
         onClick={()=>change(w=>phase3QMoveSelectedQuestion(w,projection,s.id,q.questionId,-1))}>↑</button>
        <button type="button" style={btn} aria-label="Move question down"
         onClick={()=>change(w=>phase3QMoveSelectedQuestion(w,projection,s.id,q.questionId,1))}>↓</button>
        <button type="button" style={btn} aria-label="Remove selected question"
         onClick={()=>change(w=>phase3QRemoveSelectedQuestion(w,projection,s.id,q.questionId))}>Remove</button>
       </div>
      </div>)}
     </section>)}
     {!sections.length&&<p style={{fontSize:12,opacity:.8}}>Choose a topic and click + Add to paper. Preview updates immediately.</p>}
     {preview?.status==='INVALID_PREVIEW'&&<p role="alert">{preview.reason}</p>}
     <button type="button" style={{...btn,marginTop:12,width:'100%'}}
      disabled={!composed||typeof onPreview!=='function'}
      onClick={()=>onPreview(preview)}>Hand off unsaved source-preserving draft</button>
     <p style={{fontSize:11,opacity:.7}}>Saving, printing and live editor integration remain blocked pending new-authoring adapter and server authorization.</p>
     {error&&<p role="alert" style={{fontSize:12}}>{error}</p>}
    </aside>
   </div>
  </>}
 </main>;
}
