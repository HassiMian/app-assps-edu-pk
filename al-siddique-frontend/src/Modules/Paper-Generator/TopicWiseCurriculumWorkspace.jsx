// Isolated IX/X curriculum preview — drafts never write to the production Question Bank.
import {useMemo,useState} from 'react'
import {Plus,ChevronDown,ChevronRight,Download,CheckCircle2,AlertTriangle,X,RefreshCw,RotateCcw,Trash2} from 'lucide-react'
import biologyLedger from './seed-data/grade9-10-staging/biology9EnglishEvidenceLedger.json'
import biologyUrduLedger from './seed-data/grade9-10-staging/biology9UrduEvidenceLedger.json'
import reviewedPendingExamples from './seed-data/grade9-10-staging/biology9TopicResearchDrafts.json'
import {AUTHORING_TYPES,ORIGIN_TYPES,newTopicDraft,projectTopicTree,validateQuestionBlocks}
 from './seed-data/grade9-10-staging/topicWorkspaceEngine.mjs'
import {loadTopicDraftLibrary,saveTopicDraftLibrary,rollbackTopicDraftLibrary} from './topicDraftBrowserStore.js'
const tone={bg:'#0b233c',panel:'#122e49',stroke:'#31516c',text:'#eef5ff',muted:'#adbed0',gold:'#e4bd5a'}
const base={background:tone.panel,border:'1px solid '+tone.stroke,borderRadius:12,padding:12,color:tone.text}
const button=(active=false)=>({border:'1px solid '+(active?tone.gold:tone.stroke),
 background:active?'#514328':tone.panel,color:active?'#fff6db':tone.text,padding:'8px 12px',
 borderRadius:9,cursor:'pointer',fontSize:12,fontWeight:650})
const inputStyle={...base,width:'100%',boxSizing:'border-box',outline:'none',fontSize:13}
const languageLabels={en:'English',ur:'اردو',dual:'Dual EN / UR',hi:'हिन्दी (preview)'}
const emptyForm=()=>({en:'',ur:'',hi:'',answerEn:'',answerUr:'',answerHi:'',origin:'additional',
 exerciseRef:'',evidencePage:'',urduEvidencePage:'',marks:2,difficulty:'medium',traditional:false,
 important:false,importanceReason:'',optEn:['','','',''],optUr:['','','',''],optHi:['','','',''],correctOptionId:'A'})
const CURRICULUM_KEY='IX-BIO-EM-2025-26'
const SEED_IDS=reviewedPendingExamples.drafts.map(q=>q.id)
const clone=()=>({
 ledgerSchema:biologyLedger.schemaVersion,sourcePdfSha256:biologyLedger.source.pdfSha256,
 createdFor:'ASSPS curriculum research staging only; NOT production selectable',
 publicationAllowed:false,requireIndependentAcademicReview:true
})
export default function TopicWiseCurriculumWorkspace(){
 const [type,setType]=useState('mcq'),[language,setLanguage]=useState('en')
 const [syllabusMode,setSyllabusMode]=useState('full'),[examYear,setExamYear]=useState(2026)
 const [origin,setOrigin]=useState('all'),[importantOnly,setImportantOnly]=useState(false)
 const [traditionalOnly,setTraditionalOnly]=useState(false),[search,setSearch]=useState('')
 const [opened,setOpened]=useState([biologyLedger.chapters[0].id])
 const [boot]=useState(()=>loadTopicDraftLibrary({curriculumKey:CURRICULUM_KEY,sourcePdfSha256:biologyLedger.source.pdfSha256}))
 const [library,setLibrary]=useState(()=>boot.library)
 const [editing,setEditing]=useState(null),[form,setForm]=useState(emptyForm)
 const [notice,setNotice]=useState(()=>boot.errors?.length?'Draft library blocked: '+boot.errors.join(' · '):'')
 const [selected,setSelected]=useState([]),[attemptAny,setAttemptAny]=useState(1)
 const [showEmpty,setShowEmpty]=useState(true)
 const userDrafts=library?.drafts||[]
 const blocks=library?.blocks||[]
 const drafts=useMemo(()=>[...reviewedPendingExamples.drafts,...userDrafts],[userDrafts])
 const tree=useMemo(()=>projectTopicTree({ledger:biologyLedger,questions:drafts,type,origin,
  importantOnly,traditionalOnly,language,showEmptyTopics:showEmpty,search,syllabusMode,examYear}),
  [drafts,type,origin,importantOnly,traditionalOnly,language,showEmpty,search,syllabusMode,examYear])
 const inspected=useMemo(()=>validateQuestionBlocks(blocks,drafts,{language,syllabusMode,examYear}),[blocks,drafts,language,syllabusMode,examYear])
 const visibleQuestions=tree.flatMap(ch=>ch.topics.flatMap(t=>t.questions))
 const currentSelected=visibleQuestions.filter(q=>selected.includes(q.id))
 const setField=(key,value)=>setForm(f=>({...f,[key]:value}))
 function persistLibrary(nextUserDrafts,nextBlocks,message){
  if(!library){setNotice('Draft library is unavailable. Reload it before writing anything.');return false}
  const saved=saveTopicDraftLibrary({expectedRevision:library.revision,curriculumKey:CURRICULUM_KEY,
   sourcePdfSha256:biologyLedger.source.pdfSha256,drafts:nextUserDrafts,blocks:nextBlocks,knownExternalIds:SEED_IDS})
  if(!saved.ok){
   const prefix=saved.code==='REVISION_CONFLICT'?'Another tab changed this draft library. Reload before retrying. ':'Draft save blocked. '
   setNotice(prefix+(saved.errors||[]).join(' · '));return false
  }
  setLibrary(saved.library);setNotice(message+' · library revision '+saved.library.revision);return true
 }
 function reloadLibrary(){
  const loaded=loadTopicDraftLibrary({curriculumKey:CURRICULUM_KEY,sourcePdfSha256:biologyLedger.source.pdfSha256})
  if(!loaded.library){setNotice('Reload blocked: '+(loaded.errors||[]).join(' · '));return}
  setLibrary(loaded.library);setSelected([]);setNotice('Tenant-scoped draft library reloaded at revision '+loaded.library.revision+'.')
 }
 function rollbackPrevious(){
  const target=library?.history?.[library.history.length-1]?.revision
  if(!Number.isInteger(target)){setNotice('No earlier retained draft revision is available.');return}
  const restored=rollbackTopicDraftLibrary({expectedRevision:library.revision,targetRevision:target,
   curriculumKey:CURRICULUM_KEY,sourcePdfSha256:biologyLedger.source.pdfSha256,knownExternalIds:SEED_IDS})
  if(!restored.ok){setNotice('Rollback blocked: '+(restored.errors||[]).join(' · '));return}
  setLibrary(restored.library);setSelected([]);setNotice('Rolled back content from revision '+target+' as new revision '+restored.library.revision+'.')
 }
 function startDraft(chapterId,topicId){
  if(syllabusMode!=='full'){setNotice('Switch to Full textbook to author a question. ALP eligibility is reviewed separately.');return}
  setEditing({chapterId,topicId});setForm({...emptyForm(),marks:type==='mcq'?1:type==='long'?5:2});setNotice('')
 }
 function saveDraft(){
  if(!editing)return
  const id='ASSPS-DRAFT-'+crypto.randomUUID()
  const result=newTopicDraft({id,ledger:biologyLedger,urduLedger:biologyUrduLedger,chapterId:editing.chapterId,
   topicId:editing.topicId,type,...form,importance:form.important,evidencePage:form.evidencePage===''?null:Number(form.evidencePage),
   urduEvidencePage:form.urduEvidencePage===''?null:Number(form.urduEvidencePage),
   exerciseRef:form.exerciseRef||null,marks:Number(form.marks)})
  if(!result.valid){setNotice(result.errors.join(' · '));return}
  const next=[...userDrafts,result.question]
  if(persistLibrary(next,blocks,'Unapproved topic draft saved to tenant-scoped staging')){
   setEditing(null);setForm(emptyForm())
  }
 }
 function deleteDraft(id){
  if(!userDrafts.some(q=>q.id===id)){setNotice('Seed research examples are read-only.');return}
  const nextDrafts=userDrafts.filter(q=>q.id!==id)
  const nextBlocks=blocks.map(b=>{
   const ids=b.questionIds.filter(qid=>qid!==id)
   return {...b,questionIds:ids,attemptAny:Math.min(b.attemptAny,ids.length)}
  }).filter(b=>b.questionIds.length>0)
  if(persistLibrary(nextDrafts,nextBlocks,'Draft deleted from staging'))setSelected(prev=>prev.filter(qid=>qid!==id))
 }
 function addBlock(){
  if(!currentSelected.length){setNotice('Select questions of the active type first.');return}
  const taken=new Set(blocks.flatMap(b=>b.questionIds))
  const ids=currentSelected.map(q=>q.id).filter(id=>!taken.has(id))
  if(!ids.length){setNotice('Selected questions already belong to existing blocks.');return}
  const next=[...blocks,{id:'BLOCK-'+crypto.randomUUID(),type,questionIds:ids,
   attemptAny:Math.min(Math.max(1,Number(attemptAny)||1),ids.length)}]
  if(persistLibrary(userDrafts,next,'Preview block saved to staging'))setSelected([])
 }
 function removeBlock(id){persistLibrary(userDrafts,blocks.filter(b=>b.id!==id),'Preview block removed')}
 function updateBlockAttempt(block,value){
  const n=Number(value)
  if(!Number.isInteger(n)||n<1||n>block.questionIds.length){setNotice('Attempt Any must be between 1 and '+block.questionIds.length+'.');return}
  persistLibrary(userDrafts,blocks.map(b=>b.id===block.id?{...b,attemptAny:n}:b),'Attempt Any updated')
 }
 function exportStaging(){
  if(!drafts.length){setNotice('No topic-authored draft is available to export.');return}
  const data={...clone(),bankCoverage:'full-textbook',selection:{syllabusMode,examYear:syllabusMode==='alp'?examYear:null},
   selectionValidation:inspected,libraryRevision:library?.revision??null,draftQuestions:drafts,previewBlocks:blocks};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
  const anchor=document.createElement('a');anchor.href=url;anchor.download='assps-ix-biology-topic-drafts-review-only.json'
  anchor.click();URL.revokeObjectURL(url)
 }
 const renderStem=q=>language==='dual'
  ?<><div>{q.content.en.stem}</div><div dir="rtl" lang="ur" style={{fontFamily:'Jameel Noori Nastaleeq, serif',fontSize:16}}>{q.content.ur.stem}</div></>
  :<div dir={language==='ur'?'rtl':'ltr'} lang={language}
   style={{fontFamily:language==='ur'?'Jameel Noori Nastaleeq, serif':language==='hi'?'sans-serif':'Times New Roman, serif',fontSize:15}}>
   {q.content[language]?.stem}</div>
 return <section style={{padding:'16px 18px',background:tone.bg,color:tone.text,minHeight:580}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}>
   <div><h3 style={{margin:'0 0 5px',fontSize:19}}>Curriculum Workspace · Grade IX Biology (pilot)</h3>
    <small style={{color:tone.muted}}>6 source-grounded research examples + {userDrafts.length} tenant draft(s) · library rev {library?.revision??'blocked'} · all unapproved</small></div>
   <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
    <button type="button" onClick={reloadLibrary} style={button()}><RefreshCw size={13} style={{verticalAlign:'middle'}}/> Reload</button>
    <button type="button" onClick={rollbackPrevious} disabled={!library?.history?.length} style={{...button(),opacity:library?.history?.length?1:.5}}><RotateCcw size={13} style={{verticalAlign:'middle'}}/> Rollback</button>
    <button type="button" onClick={exportStaging} style={button()}><Download size={14} style={{verticalAlign:'middle'}}/> Export review drafts</button>
   </div>
  </div>
  <div style={{...base,margin:'14px 0',background:'#2c2a1c',borderColor:'#806d3c',fontSize:12,lineHeight:1.55}}>
   <AlertTriangle size={15} style={{verticalAlign:'middle',marginRight:6}}/> Source chapter/exercise counts are evidence placeholders, not imported questions. Original additional/conceptual prompts must be written and independently reviewed.
   English/Urdu are the prescribed release languages. Urdu/Dual questions require separate Urdu textbook page evidence. Hindi is an optional reviewed rendition and cannot silently enter the approved bank.
  </div>
  <div style={{...base,display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
   <span style={{fontSize:12,color:tone.muted}}>Question menu</span>
   {AUTHORING_TYPES.map(t=><button key={t} type="button" style={button(type===t)} onClick={()=>{setType(t);setSelected([]);setNotice('')}}>{t.toUpperCase()}</button>)}
  </div>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:14}}>
   <select aria-label="Syllabus coverage" style={{...inputStyle,maxWidth:210}} value={syllabusMode}
    onChange={e=>{setSyllabusMode(e.target.value);setSelected([]);setEditing(null);setNotice('')}}>
    <option value="full">Full textbook (default)</option><option value="alp">ALP — verified topics only</option>
   </select>
   {syllabusMode==='alp'&&<label style={{fontSize:12}}>Exam year <input aria-label="ALP examination year" style={{...inputStyle,width:90}} type="number" min="2000" value={examYear}
    onChange={e=>{setExamYear(Number(e.target.value));setSelected([])}}/></label>}
   <select aria-label="Question origin" style={{...inputStyle,maxWidth:190}} value={origin} onChange={e=>setOrigin(e.target.value)}>
    <option value="all">All source origins</option>{ORIGIN_TYPES.map(o=><option key={o} value={o}>{o}</option>)}
   </select>
   <select aria-label="Question language" style={{...inputStyle,maxWidth:190}} value={language} onChange={e=>{setLanguage(e.target.value);setSelected([])}}>
    {Object.entries(languageLabels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
   </select>
   <input aria-label="Search topics and questions" style={{...inputStyle,maxWidth:230}} placeholder="Search this type / topic…" value={search} onChange={e=>setSearch(e.target.value)}/>
   <label style={{fontSize:12}}><input type="checkbox" checked={importantOnly} onChange={e=>setImportantOnly(e.target.checked)}/> Important</label>
   <label style={{fontSize:12}}><input type="checkbox" checked={traditionalOnly} onChange={e=>setTraditionalOnly(e.target.checked)}/> Traditional</label>
   <label style={{fontSize:12}}><input type="checkbox" checked={showEmpty} onChange={e=>setShowEmpty(e.target.checked)}/> Show empty topics</label>
  </div>
  <p style={{fontSize:12,color:tone.muted}}>Full textbook coverage includes all prescribed chapters, including material outside ALP. ALP changes selection only; saved drafts and blocks remain available.</p>
  {syllabusMode==='alp'&&tree.length===0&&<div role="status" style={{...base,marginBottom:12}}>No verified ALP-eligible questions for {examYear}. Choose Full textbook to browse and author all topics.</div>}
  {notice&&<div role="status" style={{...base,color:'#ffe1a0',marginBottom:12}}>{notice}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,320px),1fr))',gap:12,alignItems:'start'}}>
   <div style={{display:'flex',flexDirection:'column',gap:9}}>
   {tree.map(ch=><div key={ch.id} style={base}>
    <button type="button" style={{display:'flex',gap:8,alignItems:'center',width:'100%',border:0,
      background:'transparent',color:tone.text,textAlign:'left',cursor:'pointer'}}
     onClick={()=>setOpened(prev=>prev.includes(ch.id)?prev.filter(x=>x!==ch.id):[...prev,ch.id])}>
     {opened.includes(ch.id)?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
     <strong>Ch {ch.number}. {ch.title}</strong><span style={{marginLeft:'auto',color:tone.muted,fontSize:11}}>{ch.count} {type.toUpperCase()} drafts</span>
    </button>
    {opened.includes(ch.id)&&<div style={{padding:'8px 0 0 14px',display:'flex',flexDirection:'column',gap:8}}>
     {ch.topics.map(t=><article key={t.id} style={{borderTop:'1px solid '+tone.stroke,paddingTop:9}}>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
       <strong style={{fontSize:13}}>{t.id} · {t.title}</strong>
       <span style={{fontSize:11,color:tone.muted}}>TOC p.{t.indexPage} · {t.questions.length} item(s)</span>
       <button disabled={syllabusMode!=='full'} style={{...button(),marginLeft:'auto',opacity:syllabusMode==='full'?1:.5}} type="button" onClick={()=>startDraft(ch.id,t.id)}>
        <Plus size={12} style={{verticalAlign:'middle'}}/> Draft {type}</button>
      </div>
      {t.questions.length===0?<p style={{fontSize:12,color:tone.muted,margin:'7px 0'}}>No reviewed or authored {type.toUpperCase()} for this topic yet.</p>:
       t.questions.map(q=><div key={q.id} style={{display:'flex',alignItems:'flex-start',gap:9,
        background:'#0a2034',borderRadius:7,marginTop:7,padding:10,fontSize:13}}>
        <input aria-label={'Select '+q.id} type="checkbox" checked={selected.includes(q.id)}
         onChange={e=>setSelected(prev=>e.target.checked?[...prev,q.id]:prev.filter(id=>id!==q.id))}/>
        <div style={{minWidth:0,flex:1}}>{renderStem(q)}{q.type==='mcq'&&<div style={{fontSize:12,marginTop:5}}>{(q.content[language==='dual'?'en':language]?.options||[]).map(o=><div key={o.id}>{o.id}. {o.text}{language==='dual'?<span dir="rtl" lang="ur" style={{display:'inline-block',marginInlineStart:12,fontFamily:'Jameel Noori Nastaleeq, serif'}}>{q.content.ur.options.find(v=>v.id===o.id)?.text}</span>:null}</div>)}</div>}
         <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:4}}><small style={{color:tone.muted}}>{q.origin}
         {q.editorial?.traditional?' · traditional':''}{q.importance?.selected?' · important':''} · {q.marks}m · unapproved</small>
         {userDrafts.some(d=>d.id===q.id)&&<button type="button" onClick={()=>deleteDraft(q.id)} style={{...button(),padding:'3px 7px',color:'#ffb4b4'}}><Trash2 size={11}/> Delete draft</button>}</div></div>
       </div>)}
      {editing?.chapterId===ch.id&&editing?.topicId===t.id&&<div style={{...base,marginTop:9,background:'#163852'}}>
       <div style={{display:'flex',justifyContent:'space-between'}}><strong>New {type} · {t.id}</strong>
        <button type="button" style={button()} onClick={()=>setEditing(null)}><X size={13}/></button></div>
       <p style={{fontSize:11,color:tone.muted}}>Write an original question based on this exact topic. Exercise origin needs individually validated exercise evidence; no automatic attribution.</p>
       <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
        <label style={{fontSize:12}}>Difficulty<select style={inputStyle} value={form.difficulty} onChange={e=>setField('difficulty',e.target.value)}>{['easy','medium','difficult'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label style={{fontSize:12}}>Origin<select style={inputStyle} value={form.origin} onChange={e=>setField('origin',e.target.value)}>
         {ORIGIN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
        <label style={{fontSize:12}}>Marks<input style={inputStyle} type="number" min="1" value={form.marks} onChange={e=>setField('marks',e.target.value)}/></label>
       </div>
       <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8,marginTop:8}}>
        <label style={{fontSize:11}}>English source physical page (required)<input style={inputStyle} type="number" min="1" max={biologyLedger.source.pdfPages} placeholder="e.g. 6 (not TOC p.2)" value={form.evidencePage} onChange={e=>setField('evidencePage',e.target.value)}/></label>
        {form.ur&&<label style={{fontSize:11}}>Urdu source physical page (required with Urdu)<input style={inputStyle} type="number" min="1" max={biologyUrduLedger.source.pdfPages} placeholder="verified Urdu topic page" value={form.urduEvidencePage} onChange={e=>setField('urduEvidencePage',e.target.value)}/></label>}
        {form.origin==='exercise'&&<label style={{fontSize:11}}>Exercise ID (unverified draft)<input style={inputStyle} placeholder="Exercise ref · review pending" value={form.exerciseRef} onChange={e=>setField('exerciseRef',e.target.value)}/></label>}
       </div>
       {['en','ur','hi'].map(l=><div key={l} style={{marginTop:8}}>
        <label style={{fontSize:12}}>{languageLabels[l]} {l==='en'?'(draft required)':'(optional review translation)'}</label>
        <textarea style={{...inputStyle,minHeight:53,fontFamily:l==='ur'?'Jameel Noori Nastaleeq, serif':'inherit'}}
         dir={l==='ur'?'rtl':'ltr'} value={form[l]} placeholder={'Question · '+l}
         onChange={e=>setField(l,e.target.value)}/>
        {type==='mcq'?<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginTop:4}}>{form['opt'+l[0].toUpperCase()+l.slice(1)].map((v,i)=><input key={i} dir={l==='ur'?'rtl':'ltr'} style={inputStyle} placeholder={'Option '+('ABCD'[i])} value={v} onChange={e=>setField('opt'+l[0].toUpperCase()+l.slice(1),form['opt'+l[0].toUpperCase()+l.slice(1)].map((v,j)=>j===i?e.target.value:v))}/>)}</div>:<textarea style={{...inputStyle,minHeight:42,marginTop:4}} dir={l==='ur'?'rtl':'ltr'}
         value={form['answer'+l[0].toUpperCase()+l.slice(1)]} placeholder={'Answer key · '+l}
         onChange={e=>setField('answer'+l[0].toUpperCase()+l.slice(1),e.target.value)}/>}
       </div>)}
       {type==='mcq'&&<label style={{fontSize:12,display:'block',marginTop:8}}>One correct option ID across every language<select style={inputStyle} value={form.correctOptionId} onChange={e=>setField('correctOptionId',e.target.value)}>{['A','B','C','D'].map(x=><option key={x}>{x}</option>)}</select></label>}
       <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',margin:'8px 0'}}>
        <label style={{fontSize:12}}><input type="checkbox" checked={form.traditional} onChange={e=>setField('traditional',e.target.checked)}/> Traditional style</label>
        <label style={{fontSize:12}}><input type="checkbox" checked={form.important} onChange={e=>setField('important',e.target.checked)}/> Important</label>
        {form.important&&<input style={inputStyle} value={form.importanceReason} placeholder="Why important? (required)" onChange={e=>setField('importanceReason',e.target.value)}/>}
       </div>
       <button type="button" style={button(true)} onClick={saveDraft}>Save unapproved draft</button>
      </div>}
     </article>)}
    </div>}
   </div>)}
   </div>
   <aside style={{...base,position:'sticky',top:8}}>
    <h4 style={{margin:'0 0 5px'}}>Paper block composer · preview</h4>
    <p style={{fontSize:12,color:tone.muted}}>Choose questions under their topics, create multiple sections for MCQ / Short / Long, then set Attempt Any separately per block. Preview is not an approved paper.</p>
    <div style={{fontSize:12,marginBottom:8}}>Selected {type}: <strong>{currentSelected.length}</strong></div>
    <label style={{fontSize:12}}>Attempt any<input style={{...inputStyle,marginTop:5}} type="number" min={1}
     max={Math.max(1,currentSelected.length)} value={attemptAny} onChange={e=>setAttemptAny(e.target.value)}/></label>
    <button style={{...button(true),marginTop:9,width:'100%'}} type="button" onClick={addBlock}>Add {type.toUpperCase()} block</button>
    {blocks.map((b,i)=><div key={b.id} style={{...base,marginTop:8,background:'#0a2034',fontSize:12}}>
     <div style={{display:'flex',justifyContent:'space-between'}}><strong>Block {i+1} · {b.type.toUpperCase()}</strong>
      <button type="button" style={button()} onClick={()=>removeBlock(b.id)}>Remove</button></div>
     <div style={{marginTop:5}}>{b.questionIds.length} offered · Attempt any <input aria-label={'Attempt any block '+(i+1)} type="number" min="1" max={b.questionIds.length} value={b.attemptAny} style={{...inputStyle,width:70,marginLeft:7}} onChange={e=>updateBlockAttempt(b,e.target.value)}/></div>
    </div>)}
    <div style={{marginTop:10,fontSize:12,color:inspected.valid?'#97e5ba':'#ffd28b'}}>
     {inspected.valid?<><CheckCircle2 size={14}/> Preview total: {inspected.totalMarks} marks</>:
       inspected.errors.length?inspected.errors.join(' · '):'Add a block to calculate marks.'}
    </div>
    <p style={{fontSize:11,color:tone.muted}}>Drafts and preview blocks are kept in tenant-scoped browser staging with optimistic revision checks and rollback history. Export JSON for supervised review. Nothing is automatically added to the school Question Bank.</p>
   </aside>
  </div>
 </section>
}
