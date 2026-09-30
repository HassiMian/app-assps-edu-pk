import { useEffect, useRef, useState } from 'react'

export const INLINE_FONTS = [
 ['Default',''], ['Times New Roman','Times New Roman'], ['Arial','Arial'],
 ['Georgia','Georgia'], ['Cambria Math','Cambria Math'],
 ['Jameel Noori Nastaleeq','Jameel Noori Nastaleeq'], ['Noto Nastaliq Urdu','Noto Nastaliq Urdu'],
]
export const INLINE_SIZES = [8,9,10,11,12,13,14,16,18,20,22,24,28,32]
const selectionCache = new Map()
const cacheKey = (sectionId='',fieldKey='') => String(sectionId)+'::'+String(fieldKey)
const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','S','SPAN','SUP','SUB','BR'])
const ALLOWED_STYLE = new Set(['font-family','font-size','color','background-color','font-weight','font-style','text-decoration','text-decoration-line','vertical-align'])
const FONT_RE = /^(?:Times New Roman|Arial|Georgia|Cambria Math|Jameel Noori Nastaleeq|Noto Nastaliq Urdu)(?:\s*,\s*(?:serif|sans-serif))?$/i
const SIZE_RE = /^(?:[8-9]|1\d|2\d|3[0-2])(?:px|pt)$/
const COLOR_RE = /^(?:#[0-9a-f]{3,8}|rgb(?:a)?\([^)]{3,40}\)|[a-z]{3,20})$/i

function escapeHtml(value='') {
 return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
}
function textHtml(value='') { return escapeHtml(value).replace(/\r?\n/g,'<br>') }
function safeStyleValue(name,value='') {
 const clean=String(value).trim()
 if(name==='font-family') return FONT_RE.test(clean.replace(/["']/g,''))?clean:''
 if(name==='font-size') return SIZE_RE.test(clean)?clean:''
 if(name==='color'||name==='background-color') return COLOR_RE.test(clean)?clean:''
 if(name==='font-weight') return /^(?:normal|bold|[1-9]00)$/.test(clean)?clean:''
 if(name==='font-style') return /^(?:normal|italic)$/.test(clean)?clean:''
 if(name==='text-decoration'||name==='text-decoration-line') return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(clean)?clean:''
 if(name==='vertical-align') return /^(?:baseline|super|sub)$/.test(clean)?clean:''
 return ''
}
export function sanitizeInlineHtml(html='') {
 if(typeof document==='undefined') return escapeHtml(String(html).replace(/<[^>]*>/g,''))
 const template=document.createElement('template'); template.innerHTML=String(html)
 const cleanNode=node=>{
  for(const child of [...node.childNodes]) {
   if(child.nodeType===Node.COMMENT_NODE){ child.remove(); continue }
   if(child.nodeType!==Node.ELEMENT_NODE) continue
   if(!ALLOWED_TAGS.has(child.tagName)) {
    const frag=document.createDocumentFragment()
    while(child.firstChild) frag.appendChild(child.firstChild)
    child.replaceWith(frag); cleanNode(node); continue
   }
   for(const attr of [...child.attributes]) if(attr.name!=='style') child.removeAttribute(attr.name)
   if(child.hasAttribute('style')) {
    const allowed=[]
    for(const prop of [...child.style]) {
     if(!ALLOWED_STYLE.has(prop)) continue
     const value=safeStyleValue(prop,child.style.getPropertyValue(prop))
     if(value) allowed.push(prop+':'+value)
    }
    if(allowed.length) child.setAttribute('style',allowed.join(';'))
    else child.removeAttribute('style')
   }
   cleanNode(child)
  }
 }
 cleanNode(template.content)
 return template.innerHTML
}
export function htmlToPlainText(html='') {
 if(typeof document==='undefined') return String(html).replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')
 const div=document.createElement('div'); div.innerHTML=sanitizeInlineHtml(html)
 return (div.innerText||div.textContent||'').replace(/\u00a0/g,' ').trim()
}
function selectionOffsets(el,range){
 if(!el||!range||!el.contains(range.commonAncestorContainer)) return null
 const startRange=document.createRange(); startRange.selectNodeContents(el); startRange.setEnd(range.startContainer,range.startOffset)
 const endRange=document.createRange(); endRange.selectNodeContents(el); endRange.setEnd(range.endContainer,range.endOffset)
 return {start:startRange.toString().length,end:endRange.toString().length}
}
function rangeFromOffsets(el,snapshot){
 if(!el||!snapshot||snapshot.end<=snapshot.start) return null
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
 let pos=0,startNode=null,endNode=null,startOffset=0,endOffset=0,node
 while((node=walker.nextNode())){
  const len=node.textContent?.length||0
  if(!startNode&&snapshot.start<=pos+len){startNode=node;startOffset=Math.max(0,snapshot.start-pos)}
  if(snapshot.end<=pos+len){endNode=node;endOffset=Math.max(0,snapshot.end-pos);break}
  pos+=len
 }
 if(!startNode||!endNode) return null
 const range=document.createRange(); range.setStart(startNode,Math.min(startOffset,startNode.textContent?.length||0)); range.setEnd(endNode,Math.min(endOffset,endNode.textContent?.length||0)); return range
}
function findActiveElement(active){
 const direct=active?.getElement?.()||active?.element
 if(direct&&document.body.contains(direct)) return direct
 const section=String(active?.sectionId||''), field=String(active?.fieldKey||'')
 return [...document.querySelectorAll('[data-paper-inline-editable]')].find(el=>String(el.dataset.sectionId||'')===section&&String(el.dataset.editField||'')===field)||null
}

export function InlineEditable(props) {
 const { text='', richHtml='', editMode=false, direction='ltr', className='', style,
  fieldKey='', sectionId='', onCommit, onActivate, as='span', singleLine=true, ariaLabel='' }=props
 const ref=useRef(null); const focused=useRef(false); const savedSelection=useRef(null); const Tag=as
 const html=richHtml?sanitizeInlineHtml(richHtml):textHtml(text)
 const lastCommittedHtml=useRef(html)
 useEffect(()=>{
  if(!ref.current||focused.current) return
  if(ref.current.innerHTML!==html) ref.current.innerHTML=html
  lastCommittedHtml.current=html
 },[html])
 const rememberSelection=()=>{
  const el=ref.current; const selection=window.getSelection?.()
  if(!el||!selection||!selection.rangeCount||selection.isCollapsed) return
  const range=selection.getRangeAt(0); const snapshot=selectionOffsets(el,range)
  if(snapshot){
   const previous=savedSelection.current
   savedSelection.current=snapshot
   selectionCache.set(cacheKey(sectionId,fieldKey),snapshot)
   // Never refresh the parent editor while the user is dragging a selection.
   // Parent state updates remount/rerender paper nodes and Chromium visibly
   // collapses/repaints the blue range, which is the selection blink bug.
   // Notify only the floating toolbar; it can re-render independently.
   if(!previous||previous.start!==snapshot.start||previous.end!==snapshot.end){
    window.dispatchEvent?.(new CustomEvent('paper-inline-selection-saved',{detail:{sectionId,fieldKey,start:snapshot.start,end:snapshot.end}}))
   }
  }
 }
 useEffect(()=>{
  if(!editMode) { savedSelection.current=null; selectionCache.delete(cacheKey(sectionId,fieldKey)); return }
  const handler=()=>rememberSelection()
  document.addEventListener('selectionchange',handler)
  return ()=>document.removeEventListener('selectionchange',handler)
 },[editMode])
 const commitElement=target=>{
  const el=target||ref.current
  if(!el) return
  const safe=sanitizeInlineHtml(el.innerHTML)
  if(el.innerHTML!==safe) el.innerHTML=safe
  if(safe===lastCommittedHtml.current) return
  lastCommittedHtml.current=safe
  if(onCommit) onCommit({ text:htmlToPlainText(safe), html:safe })
 }
 const commit=()=>commitElement(ref.current)
 const activate=()=>onActivate?.({
  element:ref.current,fieldKey,sectionId,commit,commitElement,getElement:()=>ref.current,
  getSelectionSnapshot:()=>savedSelection.current||selectionCache.get(cacheKey(sectionId,fieldKey))||null,
  rememberSelection,
 })
 return <Tag ref={ref}
  className={('paper-inline-editable '+className).trim()}
  data-paper-inline-editable={editMode?'true':undefined}
  data-edit-field={fieldKey||undefined} data-section-id={sectionId||undefined}
  contentEditable={editMode} suppressContentEditableWarning dir={direction}
  aria-label={ariaLabel||undefined} spellCheck={false}
  style={{...style,outline:editMode?'none':undefined,cursor:editMode?'text':undefined}}
  onFocus={()=>{ focused.current=true; activate() }}
  onBlur={event=>{
   rememberSelection()
   focused.current=false
   // A native select/color picker within the floating toolbar may take focus.
   // That is not the end of an editing transaction; let its change handler
   // apply the selected formatting before committing the field.
   if(event.relatedTarget?.closest?.('[data-inline-selection-toolbar]')) return
   commit()
  }}
  onMouseUp={rememberSelection} onKeyUp={rememberSelection}
  onKeyDown={event=>{ if(singleLine&&event.key==='Enter'){event.preventDefault();ref.current?.blur()} }}
  dangerouslySetInnerHTML={{__html:html}} />
}

function selectionInside(element) {
 const selection=window.getSelection?.()
 if(!element||!selection||!selection.rangeCount||selection.isCollapsed) return false
 const range=selection.getRangeAt(0)
 return element.contains(range.commonAncestorContainer)
}
function resolveActiveRange(active) {
 const el=findActiveElement(active); const selection=window.getSelection?.()
 if(!el) return null
 if(selection&&selection.rangeCount&&!selection.isCollapsed){
  const current=selection.getRangeAt(0)
  if(el.contains(current.commonAncestorContainer)) return current.cloneRange()
 }
 const snapshot=active?.getSelectionSnapshot?.()||selectionCache.get(cacheKey(active?.sectionId,active?.fieldKey))
 return rangeFromOffsets(el,snapshot)
}
function exec(active,command,value=null,requireSelection=true) {
 const el=findActiveElement(active)
 if(!el) return
 const selection=window.getSelection?.()
 let saved=resolveActiveRange(active)
 if(requireSelection&&!saved) return
 // Focusing a contentEditable collapses the browser selection in Chromium.
 // Focus first, then rebuild the range from the saved offsets.
 el.focus({preventScroll:true})
 if(saved&&selection){
  saved=resolveActiveRange(active) || saved
  selection.removeAllRanges(); selection.addRange(saved)
 }
 document.execCommand('styleWithCSS',false,true)
 document.execCommand(command,false,value)
 active.rememberSelection?.()
 active.commitElement?.(el)
}
function toggleSemanticMark(active, command) {
 const el=findActiveElement(active)
 const selected=resolveActiveRange(active)
 const selection=window.getSelection?.()
 if(!el||!selected||selected.collapsed||!selection||!el.contains(selected.commonAncestorContainer)) return null
 const offsets=selectionOffsets(el,selected)
 if(!offsets||offsets.end<=offsets.start) return null

 // Restore this exact field and selected text after a toolbar interaction.
 // Native contentEditable commands provide reversible mixed-format B/I/U/S
 // behaviour; nesting a new styled span on each click never did.
 if(document.activeElement!==el) el.focus({preventScroll:true})
 const target=findActiveElement(active)||el
 const range=rangeFromOffsets(target,offsets)
 if(!range||!target.contains(range.commonAncestorContainer)) return null
 selection.removeAllRanges()
 selection.addRange(range)
 document.execCommand('styleWithCSS',false,false)
 if(!document.execCommand(command,false,null)) return null

 const pressed=Boolean(document.queryCommandState(command))
 active.rememberSelection?.()
 const retained=active.getSelectionSnapshot?.()||offsets
 active.commitElement?.(target)
 requestAnimationFrame(()=>{
  const current=findActiveElement(active)
  if(!current?.isContentEditable) return
  // Never jump into a different question if the user moved elsewhere.
  if(document.activeElement!==current&&
     !document.activeElement?.closest?.('[data-inline-selection-toolbar]')) return
  const restored=rangeFromOffsets(current,retained)
  if(!restored) return
  const sel=window.getSelection?.()
  if(!sel) return
  sel.removeAllRanges()
  sel.addRange(restored)
 })
 return pressed
}
function applyRangeStyle(active,styles={}) {
 const el=findActiveElement(active); const selection=window.getSelection?.(); const range=resolveActiveRange(active)
 if(!el||!selection||!range) return
 // Do not focus before mutating the Range; focus collapses selection and can
 // invalidate text-node boundaries after a React render. The DOM Range itself
 // is sufficient for deterministic selection-only formatting.
 selection.removeAllRanges(); selection.addRange(range)
 const span=document.createElement('span'); Object.assign(span.style,styles)
 try { range.surroundContents(span) } catch { const frag=range.extractContents(); span.appendChild(frag); range.insertNode(span) }
 selection.removeAllRanges(); const next=document.createRange(); next.selectNodeContents(span); selection.addRange(next)
 active.rememberSelection?.()
 active.commitElement?.(el)
}
function TButton({label,onClick,disabled,pressed}) {
 return <button type="button" title={label} aria-pressed={pressed===undefined?undefined:Boolean(pressed)} data-format-on={pressed===undefined?undefined:(pressed?'true':'false')} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={onClick}
  style={{height:30,minWidth:30,padding:'0 8px',border:'1px solid var(--pg-border,#334155)',borderRadius:6,background:pressed?'var(--pg-gold-light,#e8b420)':'var(--pg-tool-bg,#0b1f36)',color:disabled?'var(--pg-muted,#64748b)':(pressed?'#102b4c':'var(--pg-text,#f8fafc)'),fontWeight:800,cursor:disabled?'default':'pointer'}}>{label}</button>
}
export function PaperSelectionToolbar({editMode=false,active=null}) {
 const [selectionRev,setSelectionRev]=useState(0)
 const [marks,setMarks]=useState({bold:false,italic:false,underline:false,strikeThrough:false})
 const toggleMark=command=>{
  const next=toggleSemanticMark(active,command)
  if(next!==null) setMarks(previous=>({...previous,[command]:next}))
 }
 useEffect(()=>{
  setMarks({bold:false,italic:false,underline:false,strikeThrough:false})
 },[active?.sectionId,active?.fieldKey])
 useEffect(()=>{
  if(typeof window==='undefined') return
  const handler=event=>{
   const detail=event?.detail||{}
   if(!active||(
    String(detail.sectionId||'')===String(active.sectionId||'')&&
    String(detail.fieldKey||'')===String(active.fieldKey||'')
   )) {
    setSelectionRev(value=>value+1)
    const el=findActiveElement(active)
    const sel=window.getSelection?.()
    if(el&&sel?.rangeCount&&el.contains(sel.getRangeAt(0).commonAncestorContainer)){
     setMarks({
      bold:Boolean(document.queryCommandState('bold')),
      italic: Boolean(document.queryCommandState('italic')),
      underline:Boolean(document.queryCommandState('underline')),
      strikeThrough:Boolean(document.queryCommandState('strikeThrough')),
     })
    }
   }
  }
  window.addEventListener('paper-inline-selection-saved',handler)
  return ()=>window.removeEventListener('paper-inline-selection-saved',handler)
 },[active])
 if(!editMode) return null
 const title=active?.fieldKey?'Editing: '+active.fieldKey:'Click text to edit'
 return <div className="no-print" data-inline-selection-toolbar data-selection-revision={selectionRev} data-selection-saved={active?.getSelectionSnapshot?.()?'true':'false'}
  onMouseDownCapture={()=>active?.rememberSelection?.()}
  style={{position:'fixed',left:'50%',bottom:18,transform:'translateX(-50%)',zIndex:12000,display:'flex',alignItems:'center',gap:5,padding:'7px 9px',border:'1px solid var(--pg-panel-border,#ef4444)',borderRadius:10,background:'var(--pg-panel-bg,rgba(7,25,48,.97))',color:'var(--pg-text,#f8fafc)',boxShadow:'var(--pg-panel-shadow,0 8px 26px rgba(0,0,0,.35))',fontFamily:'Arial,sans-serif',direction:'ltr'}}>
  <span style={{fontSize:11,fontWeight:900,color:'var(--pg-gold,#fca5a5)',padding:'0 5px'}}>{title}</span>
  <TButton label="B" pressed={marks.bold} disabled={!active?.element} onClick={()=>toggleMark('bold')} />
  <TButton label="I" pressed={marks.italic} disabled={!active?.element} onClick={()=>toggleMark('italic')} />
  <TButton label="U" pressed={marks.underline} disabled={!active?.element} onClick={()=>toggleMark('underline')} />
  <TButton label="S" pressed={marks.strikeThrough} disabled={!active?.element} onClick={()=>toggleMark('strikeThrough')} />
  <TButton label="x²" disabled={!active?.element} onClick={()=>applyRangeStyle(active,{verticalAlign:'super',fontSize:'9pt'})} />
  <TButton label="x₂" disabled={!active?.element} onClick={()=>applyRangeStyle(active,{verticalAlign:'sub',fontSize:'9pt'})} />
  <select aria-label="Selected text font" disabled={!active?.element} defaultValue=""
   onChange={e=>{if(e.target.value)applyRangeStyle(active,{fontFamily:e.target.value});e.target.value=''}}
   style={{height:30,maxWidth:145,border:'1px solid var(--pg-border,#334155)',borderRadius:6,background:'var(--pg-input-bg,#0b1f36)',color:'var(--pg-text,#e2e8f0)'}}>
   {INLINE_FONTS.map(([label,font])=><option key={label} value={font}>{label}</option>)}
  </select>
  <select aria-label="Selected text size" disabled={!active?.element} defaultValue=""
   onChange={e=>{if(e.target.value)applyRangeStyle(active,{fontSize:e.target.value+'pt'});e.target.value=''}}
   style={{height:30,width:70,border:'1px solid var(--pg-border,#334155)',borderRadius:6,background:'var(--pg-input-bg,#0b1f36)',color:'var(--pg-text,#e2e8f0)'}}>
   <option value="">Size</option>{INLINE_SIZES.map(size=><option key={size} value={size}>{size} pt</option>)}
  </select>
  <input title="Selected text color" aria-label="Selected text color" type="color" disabled={!active?.element}
   defaultValue="#111827" onChange={e=>applyRangeStyle(active,{color:e.target.value})}
   style={{width:30,height:30,padding:2,border:'1px solid #334155',borderRadius:6,background:'#0b1f36'}} />
  <input title="Selected text highlight" aria-label="Selected text highlight" type="color" disabled={!active?.element}
   defaultValue="#fef08a" onChange={e=>applyRangeStyle(active,{backgroundColor:e.target.value})}
   style={{width:30,height:30,padding:2,border:'1px solid #334155',borderRadius:6,background:'#0b1f36'}} />
  <TButton label="L" disabled={!active?.element} onClick={()=>exec(active,'justifyLeft')} />
  <TButton label="C" disabled={!active?.element} onClick={()=>exec(active,'justifyCenter')} />
  <TButton label="R" disabled={!active?.element} onClick={()=>exec(active,'justifyRight')} />
  <TButton label="Clear" disabled={!active?.element} onClick={()=>exec(active,'removeFormat')} />
  <TButton label="Undo" disabled={!active?.element} onClick={()=>exec(active,'undo',null,false)} />
  <TButton label="Redo" disabled={!active?.element} onClick={()=>exec(active,'redo',null,false)} />
 </div>
}
