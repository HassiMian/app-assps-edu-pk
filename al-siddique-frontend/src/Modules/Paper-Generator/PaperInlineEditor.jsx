import { useEffect, useRef, useState } from 'react'

export const INLINE_FONTS = [
 ['Default',''], ['Times New Roman','Times New Roman'], ['Arial','Arial'],
 ['Georgia','Georgia'], ['Cambria Math','Cambria Math'],
 ['Jameel Noori Nastaleeq','Jameel Noori Nastaleeq'], ['Noto Nastaliq Urdu','Noto Nastaliq Urdu'],
]
export const INLINE_SIZES = [8,9,10,11,12,13,14,16,18,20,22,24,28,32]
const selectionCache = new Map()
const liveFieldHandles = new WeakMap()
let lastActualSelection = null
const cacheKey = (sectionId='',fieldKey='') => String(sectionId)+'::'+String(fieldKey)
const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','S','SPAN','SUP','SUB','BR'])
const ALLOWED_STYLE = new Set(['font-family','font-size','color','background-color','font-weight','font-style','text-decoration','text-decoration-line','vertical-align','display','transform'])
const FONT_RE = /^(?:Times New Roman|Arial|Georgia|Cambria Math|Jameel Noori Nastaleeq|Noto Nastaliq Urdu)(?:\s*,\s*(?:serif|sans-serif))?$/i
const SIZE_RE = /^(?:(?:[8-9]|1\d|2\d|3[0-2])(?:px|pt)|0\.85em)$/
const COLOR_RE = /^(?:#[0-9a-f]{3,8}|rgb(?:a)?\([^)]{3,40}\)|[a-z]{3,20})$/i

function escapeHtml(value='') {
 return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
}
function textHtml(value='') { return escapeHtml(value).replace(/\r?\n/g,'<br>') }
// The official Urdu heading may include a literal (✓). The static Nastaleeq
// face gives Latin parentheses an exaggerated calligraphic shape. Isolate ONLY
// this token in a compact neutral font; preserve its actual text and selection.
function normalizeHeadingPunctuation(html,fieldKey) {
 if(fieldKey!=='question-heading'||!String(html).includes('✓')||typeof document==='undefined')return html
 const template=document.createElement('template')
 template.innerHTML=html
 const walker=document.createTreeWalker(template.content,NodeFilter.SHOW_TEXT)
 const nodes=[]
 let node
 while((node=walker.nextNode()))nodes.push(node)
 for(const textNode of nodes) {
  const original=textNode.textContent||''
  const matches=[...original.matchAll(/\(\s*✓\s*\)/gu)]
  if(!matches.length)continue
  let parent=textNode.parentElement
  let decorated=false
  while(parent) {
   if(parent.tagName==='SPAN'&&parent.getAttribute('dir')==='ltr'&&
      /Arial/i.test(parent.style?.fontFamily||'')&&parent.style?.fontSize==='0.85em'){
    decorated=true;break
   }
   parent=parent.parentElement
  }
  if(decorated)continue
  const frag=document.createDocumentFragment()
  let pos=0
  for(const match of matches){
   if(match.index>pos)frag.appendChild(document.createTextNode(original.slice(pos,match.index)))
   const symbol=document.createElement('span')
   symbol.dir='ltr'
   symbol.style.fontFamily='Arial, sans-serif'
   symbol.style.fontSize='0.85em'
   symbol.textContent=match[0]
   frag.appendChild(symbol)
   pos=match.index+match[0].length
  }
  if(pos<original.length)frag.appendChild(document.createTextNode(original.slice(pos)))
  textNode.replaceWith(frag)
 }
 return template.innerHTML
}
function safeStyleValue(name,value='') {
 const clean=String(value).trim()
 if(name==='font-family') return FONT_RE.test(clean.replace(/["']/g,''))?clean:''
 if(name==='font-size') return SIZE_RE.test(clean)?clean:''
 if(name==='color'||name==='background-color') return COLOR_RE.test(clean)?clean:''
 if(name==='font-weight') return /^(?:normal|bold|[1-9]00)$/.test(clean)?clean:''
 if(name==='font-style') return /^(?:normal|italic)$/.test(clean)?clean:''
 if(name==='text-decoration'||name==='text-decoration-line') return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(clean)?clean:''
 if(name==='vertical-align') return /^(?:baseline|super|sub)$/.test(clean)?clean:''
 // Allow ONLY the editor-generated optical italic correction for Urdu fonts;
 // never accept arbitrary CSS transform or layout from pasted/untrusted HTML.
 if(name==='display') return clean==='inline-block'?clean:''
 if(name==='transform') return /^skewX\(-8deg\)$/i.test(clean)?'skewX(-8deg)':''
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
   for(const attr of [...child.attributes]) {
    if(attr.name==='dir'&&child.tagName==='SPAN'&&/^(?:ltr|rtl)$/.test(attr.value))continue
    if(attr.name!=='style')child.removeAttribute(attr.name)
   }
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
 const html=normalizeHeadingPunctuation(richHtml?sanitizeInlineHtml(richHtml):textHtml(text),fieldKey)
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
   lastActualSelection={element:el,sectionId:String(sectionId),fieldKey:String(fieldKey),snapshot,savedAt:Date.now()}
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
 },[editMode,sectionId,fieldKey])
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
 const currentHandle=()=>({
  element:ref.current,fieldKey,sectionId,commit,commitElement,getElement:()=>ref.current,
  getSelectionSnapshot:()=>savedSelection.current||selectionCache.get(cacheKey(sectionId,fieldKey))||null,
  rememberSelection,
 })
 const handleGetter=useRef(currentHandle)
 handleGetter.current=currentHandle
 useEffect(()=>{
  const el=ref.current
  if(!el||!editMode) return
  liveFieldHandles.set(el,()=>handleGetter.current())
  return ()=>{
   liveFieldHandles.delete(el)
   if(lastActualSelection?.element===el) lastActualSelection=null
  }
 },[editMode,sectionId,fieldKey])
 const activate=()=>{
  const el=ref.current
  if(el) liveFieldHandles.set(el,()=>handleGetter.current())
  onActivate?.(currentHandle())
 }
 return <Tag ref={ref}
  className={('paper-inline-editable '+className).trim()}
  data-paper-inline-editable={editMode?'true':undefined}
  data-edit-field={fieldKey||undefined} data-section-id={sectionId||undefined}
  contentEditable={editMode} suppressContentEditableWarning dir={direction}
  aria-label={ariaLabel||undefined} spellCheck={false}
  style={{...style,outline:editMode?'none':undefined,cursor:editMode?'text':undefined}}
  onFocus={()=>{
   focused.current=true
   if(lastActualSelection?.element!==ref.current) lastActualSelection=null
   activate()
  }}
  onBlur={event=>{
   rememberSelection()
   focused.current=false
   // A native select/color picker within the floating toolbar may take focus.
   // That is not the end of an editing transaction; let its change handler
   // apply the selected formatting before committing the field.
   if(event.relatedTarget?.closest?.('[data-inline-selection-toolbar]')) return
   if(event.relatedTarget) lastActualSelection=null
   commit()
  }}
  onMouseUp={rememberSelection} onKeyUp={rememberSelection}
  onInput={()=>{if(ref.current)semanticHistory.delete(ref.current)}}
  onKeyDown={event=>{ if(singleLine&&event.key==='Enter'){event.preventDefault();ref.current?.blur()} }}
  dangerouslySetInnerHTML={{__html:html}} />
}

// A toolbar action must bind to the DOM field that actually owns the selection.
// A stale React "activeEditable" object may belong to a previous marks/heading field.
function ownerOfSelectionNode(node) {
 const el=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement
 return el?.closest?.('[data-paper-inline-editable]')||null
}
function resolveActionTarget(active) {
 const selection=window.getSelection?.()
 if(selection?.rangeCount&&!selection.isCollapsed){
  const range=selection.getRangeAt(0)
  const start=ownerOfSelectionNode(range.startContainer)
  const end=ownerOfSelectionNode(range.endContainer)
  if(!start||start!==end||!start.contains(range.commonAncestorContainer)) return null
  const handle=liveFieldHandles.get(start)?.()
  const snapshot=selectionOffsets(start,range)
  if(!handle||!snapshot||snapshot.end<=snapshot.start) return null
  lastActualSelection={element:start,sectionId:String(handle.sectionId),fieldKey:String(handle.fieldKey),snapshot,savedAt:Date.now()}
  return {el:start,handle,range:range.cloneRange(),snapshot}
 }
 const previous=lastActualSelection
 if(!previous||Date.now()-previous.savedAt>30000||!document.body.contains(previous.element)) return null
 const focusedField=ownerOfSelectionNode(document.activeElement)
 if(focusedField&&focusedField!==previous.element) return null
 const handle=liveFieldHandles.get(previous.element)?.()
 if(!handle||String(handle.sectionId)!==previous.sectionId||String(handle.fieldKey)!==previous.fieldKey) return null
 const range=rangeFromOffsets(previous.element,previous.snapshot)
 return range?{el:previous.element,handle,range,snapshot:previous.snapshot}:null
}
function resolveActiveRange(active) {
 return resolveActionTarget(active)?.range||null
}
function exec(active,command,value=null,requireSelection=true) {
 if((command==='undo'||command==='redo')&&replaySemanticHistory(active,command))return
 const target=resolveActionTarget(active)
 const el=target?.el||(!requireSelection?findActiveElement(active):null)
 const handle=target?.handle||active
 if(!el||requireSelection&&!target) return
 const selection=window.getSelection?.()
 el.focus({preventScroll:true})
 if(target?.snapshot&&selection){
  const restored=rangeFromOffsets(el,target.snapshot)
  if(restored){selection.removeAllRanges();selection.addRange(restored)}
 }
 document.execCommand('styleWithCSS',false,false)
 document.execCommand(command,false,value)
 handle?.rememberSelection?.()
 handle?.commitElement?.(el)
}

// Normalize legacy nested <b>/<u>/<span style> markup into per-text-run attributes.
// Editing one selected range never affects another editable, number, marks or section.
const MARK_NAMES=['bold','italic','underline','strikeThrough']
const semanticHistory=new WeakMap()
function readInlineRuns(el) {
 const runs=[]
 function visit(node,inherited){
  if(node.nodeType===Node.TEXT_NODE){
   if(node.textContent) runs.push({text:node.textContent,fmt:{...inherited,extra:{...inherited.extra}}})
   return
  }
  if(node.nodeType!==Node.ELEMENT_NODE) return
  if(node.tagName==='BR'){runs.push({br:true});return}
  const fmt={...inherited,extra:{...inherited.extra}}
  if(['B','STRONG'].includes(node.tagName))fmt.bold=true
  if(['I','EM'].includes(node.tagName))fmt.italic=true
  if(node.tagName==='U')fmt.underline=true
  if(['S','STRIKE','DEL'].includes(node.tagName))fmt.strikeThrough=true
  if(node.tagName==='SUP')fmt.extra.verticalAlign='super'
  if(node.tagName==='SUB')fmt.extra.verticalAlign='sub'
  if(node.style?.fontWeight)fmt.bold=/^(bold|[6-9]00)$/i.test(node.style.fontWeight)
  if(node.style?.fontStyle)fmt.italic=/^(italic|oblique)/i.test(node.style.fontStyle)
  const decoration=node.style?.textDecorationLine||node.style?.textDecoration||''
  if(decoration){
   if(/\bnone\b/.test(decoration)){fmt.underline=false;fmt.strikeThrough=false}
   if(/\bunderline\b/.test(decoration))fmt.underline=true
   if(/\bline-through\b/.test(decoration))fmt.strikeThrough=true
  }
  if(node.tagName==='SPAN'&&node.getAttribute('dir')==='ltr')fmt.extra.dir='ltr'
  for(const name of ['fontFamily','fontSize','color','backgroundColor','verticalAlign']){
   if(node.style?.[name])fmt.extra[name]=node.style[name]
  }
  for(const child of node.childNodes)visit(child,fmt)
 }
 const base={bold:false,italic:false,underline:false,strikeThrough:false,extra:{}}
 for(const child of el.childNodes)visit(child,base)
 return runs
}
function selectedMarkStates(el,snapshot) {
 const defaults={bold:false,italic:false,underline:false,strikeThrough:false}
 if(!el||!snapshot||snapshot.end<=snapshot.start) return defaults
 const runs=readInlineRuns(el)
 if(runs.some(run=>run.br)) return defaults
 const covered=[];let offset=0
 for(const run of runs){
  const end=offset+run.text.length
  if(end>snapshot.start&&offset<snapshot.end&&run.text.trim())covered.push(run.fmt)
  offset=end
 }
 return Object.fromEntries(MARK_NAMES.map(mark=>[mark,covered.length>0&&covered.every(fmt=>fmt[mark])]))
}
function renderInlineRuns(el,runs) {
 const fragment=document.createDocumentFragment()
 for(const run of runs) {
  if(!run.text) continue
  const fmt=run.fmt
  // The installed static Jameel Nastaleeq font ignores font-style:italic for
  // Arabic glyphs. Apply a safe, small optical slant to Urdu word segments only.
  // Separate whitespace nodes keep whole-sentence selections line-wrappable.
  const parts=fmt.italic&&/[\u0600-\u06ff\u0750-\u077f]/.test(run.text)
   ?run.text.split(/(\s+)/)
   :[run.text]
  for(const part of parts) {
   if(!part)continue
   if(/^\s+$/.test(part)){fragment.appendChild(document.createTextNode(part));continue}
   const span=document.createElement('span')
   if(fmt.bold)span.style.fontWeight='bold'
   if(fmt.italic) {
    span.style.fontStyle='italic'
    if(/[\u0600-\u06ff\u0750-\u077f]/.test(part)) {
     span.style.display='inline-block'
     span.style.transform='skewX(-8deg)'
    }
   }
   if(fmt.underline||fmt.strikeThrough)span.style.textDecoration=[fmt.underline?'underline':'',fmt.strikeThrough?'line-through':''].filter(Boolean).join(' ')
   for(const [key,value] of Object.entries(fmt.extra||{}))if(value){
    if(key==='dir')span.dir=value
    else span.style[key]=value
   }
   span.textContent=part
   if(span.getAttribute('style'))fragment.appendChild(span)
   else fragment.appendChild(document.createTextNode(part))
  }
 }
 el.replaceChildren(fragment)
}
function splitAndToggleMark(el,snapshot,mark) {
 const runs=readInlineRuns(el)
 if(runs.some(run=>run.br))return null
 const states=selectedMarkStates(el,snapshot)
 const enable=!states[mark]
 const next=[];let offset=0;let found=false
 for(const run of runs){
  const end=offset+run.text.length
  const a=Math.max(0,Math.min(run.text.length,snapshot.start-offset))
  const b=Math.max(0,Math.min(run.text.length,snapshot.end-offset))
  if(a<b)found=true
  if(a>0)next.push({text:run.text.slice(0,a),fmt:run.fmt})
  if(a<b)next.push({text:run.text.slice(a,b),fmt:{...run.fmt,[mark]:enable,extra:{...run.fmt.extra}}})
  if(b<run.text.length)next.push({text:run.text.slice(Math.max(a,b)),fmt:run.fmt})
  offset=end
 }
 if(!found)return null
 const merged=[]
 for(const run of next){
  const last=merged.at(-1)
  if(last&&JSON.stringify(last.fmt)===JSON.stringify(run.fmt))last.text+=run.text
  else merged.push({...run})
 }
 const history=semanticHistory.get(el)||{past:[],future:[]}
 history.past.push(el.innerHTML)
 if(history.past.length>40)history.past.shift()
 history.future=[]
 semanticHistory.set(el,history)
 renderInlineRuns(el,merged)
 return enable
}
function toggleSemanticMark(active,command) {
 if(!MARK_NAMES.includes(command))return null
 const target=resolveActionTarget(active)
 if(!target)return null
 const {el,handle,snapshot}=target
 let result=splitAndToggleMark(el,snapshot,command)
 if(result===null){
  // Multiline fields retain native browser semantics; never touch a different field.
  el.focus({preventScroll:true})
  const range=rangeFromOffsets(el,snapshot)
  if(!range)return null
  const selection=window.getSelection?.()
  selection?.removeAllRanges();selection?.addRange(range)
  document.execCommand('styleWithCSS',false,false)
  if(!document.execCommand(command,false,null))return null
  result=Boolean(document.queryCommandState(command))
 }
 const selection=window.getSelection?.()
 const restored=rangeFromOffsets(el,snapshot)
 if(selection&&restored){selection.removeAllRanges();selection.addRange(restored)}
 lastActualSelection={element:el,sectionId:String(handle.sectionId),fieldKey:String(handle.fieldKey),snapshot,savedAt:Date.now()}
 handle.rememberSelection?.()
 handle.commitElement?.(el)
 requestAnimationFrame(()=>{
  const current=lastActualSelection
  if(!current||current.element!==el||!document.body.contains(el))return
  const r=rangeFromOffsets(el,snapshot)
  const sel=window.getSelection?.()
  if(r&&sel){sel.removeAllRanges();sel.addRange(r)}
 })
 return result
}
function replaySemanticHistory(active,direction) {
 const target=resolveActionTarget(active)
 if(!target)return false
 const {el,handle,snapshot}=target
 const history=semanticHistory.get(el)
 if(!history)return false
 const source=direction==='undo'?history.past:history.future
 const destination=direction==='undo'?history.future:history.past
 if(!source.length)return false
 const old=el.innerHTML
 const replacement=source.pop()
 destination.push(old)
 el.innerHTML=replacement
 const range=rangeFromOffsets(el,snapshot)
 const selection=window.getSelection?.()
 if(range&&selection){selection.removeAllRanges();selection.addRange(range)}
 lastActualSelection={element:el,sectionId:String(handle.sectionId),fieldKey:String(handle.fieldKey),snapshot,savedAt:Date.now()}
 handle.rememberSelection?.()
 handle.commitElement?.(el)
 window.dispatchEvent?.(new CustomEvent('paper-inline-selection-saved',{detail:{sectionId:handle.sectionId,fieldKey:handle.fieldKey,start:snapshot.start,end:snapshot.end}}))
 return true
}
function applyRangeStyle(active,styles={}) {
 const target=resolveActionTarget(active)
 if(!target)return
 const {el,handle,range,snapshot}=target
 const selection=window.getSelection?.()
 if(!selection)return
 selection.removeAllRanges();selection.addRange(range)
 const span=document.createElement('span');Object.assign(span.style,styles)
 try{range.surroundContents(span)}catch{const frag=range.extractContents();span.appendChild(frag);range.insertNode(span)}
 selection.removeAllRanges()
 const restored=rangeFromOffsets(el,snapshot)
 if(restored)selection.addRange(restored)
 handle.rememberSelection?.()
 handle.commitElement?.(el)
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
  if(next!==null){
   const target=resolveActionTarget(active)
   setMarks(target?selectedMarkStates(target.el,target.snapshot):previous=>({...previous,[command]:next}))
  }
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
    const target=resolveActionTarget(active)
    if(target){
     const section=String(detail.sectionId||'')
     const field=String(detail.fieldKey||'')
     if(section===String(target.handle.sectionId)&&field===String(target.handle.fieldKey)){
      setMarks(selectedMarkStates(target.el,target.snapshot))
     }
    }
   }
  }
  window.addEventListener('paper-inline-selection-saved',handler)
  return ()=>window.removeEventListener('paper-inline-selection-saved',handler)
 },[active])
 if(!editMode) return null
 const title=active?.fieldKey?'Editing: '+active.fieldKey:'Click text to edit'
 return <div className="no-print" data-inline-selection-toolbar data-selection-revision={selectionRev} data-selection-saved={active?.getSelectionSnapshot?.()?'true':'false'}
  onMouseDownCapture={()=>resolveActionTarget(active)}
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
