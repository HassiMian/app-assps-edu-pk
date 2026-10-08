import { useEffect, useRef, useState } from 'react'
import { escapeHtml, sanitizeInlineHtml } from './inlineHtmlSanitizer.js'
export { sanitizeInlineHtml } from './inlineHtmlSanitizer.js'

export const INLINE_FONTS = [
 ['Default',''], ['Times New Roman','Times New Roman'], ['Arial','Arial'],
 ['Georgia','Georgia'], ['Cambria Math','Cambria Math'],
 ['Jameel Noori Nastaleeq','Jameel Noori Nastaleeq'], ['Noto Nastaliq Urdu','Noto Nastaliq Urdu'],
]
export const INLINE_SIZES = [8,9,10,11,12,13,14,16,18,20,22,24,28,32]
const selectionCache = new Map()
const liveFieldHandles = new WeakMap()
let lastActualSelection = null
let crossPointerStart = null
let lastCrossQuestionSelection = null
const crossQuestionHistory = new WeakMap()

const cacheKey = (sectionId='',fieldKey='') => String(sectionId)+'::'+String(fieldKey)
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
  fieldKey='', sectionId='', onCommit, onActivate, as='span', singleLine=true, ariaLabel='', sharedSelectionRoot=false }=props
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
  contentEditable={editMode&&sharedSelectionRoot?undefined:editMode} suppressContentEditableWarning dir={direction}
  aria-label={ariaLabel||undefined} spellCheck={false}
  style={{...style,outline:editMode?'none':undefined,cursor:editMode?'text':undefined}}
  onFocus={()=>{
   focused.current=true
   if(lastActualSelection?.element!==ref.current) lastActualSelection=null
   if(lastCrossQuestionSelection && ref.current!==lastCrossQuestionSelection.serial && ref.current!==lastCrossQuestionSelection.heading) lastCrossQuestionSelection=null
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
// A native mouse drag crossing the two independently editable question roots
// cannot be treated as a selection inside either owner. Keep an explicit,
// bounded two-field range and never include the sibling marks editable.
function selectionPointAt(x,y) {
 const point=document.caretRangeFromPoint?.(x,y)
 if(point)return {node:point.startContainer,offset:point.startOffset}
 const pos=document.caretPositionFromPoint?.(x,y)
 return pos?{node:pos.offsetNode,offset:pos.offset}:null
}
function positionWithin(el,point){
 if(!point||!el?.contains(point.node))return null
 const range=document.createRange()
 range.selectNodeContents(el)
 try{range.setEnd(point.node,point.offset)}catch{return null}
 return range.toString().length
}
export function activateQuestionHeadingField(event,onActivate){
 const el=event.target?.closest?.('[data-paper-inline-editable]')
 const handle=el&&liveFieldHandles.get(el)?.()
 if(handle)onActivate?.(handle)
}
export function commitQuestionHeadingGroup(event){
 if(event.relatedTarget?.closest?.('[data-inline-selection-toolbar]'))return
 for(const el of event.currentTarget?.querySelectorAll?.('[data-paper-inline-editable]')||[]){
  liveFieldHandles.get(el)?.()?.commitElement?.(el)
 }
}
export function guardQuestionHeadingEdit(event){
 const selection=window.getSelection?.()
 if(!selection?.rangeCount)return
 const range=selection.getRangeAt(0)
 const start=ownerOfSelectionNode(range.startContainer)
 const end=ownerOfSelectionNode(range.endContainer)
 const isSame=(field,el)=>el?.dataset.editField===field
 const withinRoot=el=>el?.closest('[data-question-heading]')===event.currentTarget
 if(!withinRoot(start)||!withinRoot(end))return
 // Editing across an independent serial/instruction boundary would destroy
 // document structure. Native selection remains legal for bounded formatting.
 if(start!==end){event.preventDefault();return}
 if(!range.collapsed)return
 const offset=positionWithin(start,{node:range.startContainer,offset:range.startOffset})
 const input=String(event.inputType||(event.key==='Backspace'?'deleteContentBackward':event.key==='Delete'?'deleteContentForward':''))
 if((isSame('question-heading',start)&&offset===0&&input==='deleteContentBackward')||
    (isSame('question-number',start)&&offset===(start.textContent?.length||0)&&input==='deleteContentForward')){
  event.preventDefault()
 }
}
export function beginQuestionHeadingDrag(event){
 const el=event.target?.closest?.('[data-paper-inline-editable]')
 const field=el?.dataset?.editField
 crossPointerStart=field==='question-number'||field==='question-heading'
  ? {el,sectionId:el.dataset.sectionId,point:selectionPointAt(event.clientX,event.clientY),x:event.clientX}:null
 lastCrossQuestionSelection=null
}
export function finishQuestionHeadingDrag(event){
 const started=crossPointerStart;crossPointerStart=null
 if(!started)return false
 const endEl=event.target?.closest?.('[data-paper-inline-editable]')
 if(!endEl||started.el===endEl||started.sectionId!==endEl.dataset.sectionId)return false
 const roots=[started.el,endEl]
 if(!roots.every(el=>['question-number','question-heading'].includes(el.dataset.editField)))return false
 const holder=started.el.closest('[data-question-heading]')
 if(!holder||endEl.closest('[data-question-heading]')!==holder)return false
 const serial=roots.find(el=>el.dataset.editField==='question-number')
 const heading=roots.find(el=>el.dataset.editField==='question-heading')
 const ended=selectionPointAt(event.clientX,event.clientY)
 const approximateOffset=(el,x)=>{
  // Chromium may return a caret outside a nested RTL span. Resolve the
  // actual glyph boundary rather than assuming uniform character widths.
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT)
  const rtl=el.getAttribute('dir')==='rtl'
  let pos=0,best=null,node
  while((node=walker.nextNode())){
   const length=node.textContent?.length||0
   for(let i=0;i<length;i++){
    const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1)
    const box=r.getBoundingClientRect()
    if(!box.width)continue
    const edge=rtl?box.right:box.left
    const d=Math.abs(x-edge)
    if(best===null||d<best.distance)best={offset:pos+i,distance:d}
   }
   pos+=length
  }
  return best?.offset??null
 }
 const startOffset=positionWithin(started.el,started.point)??approximateOffset(started.el,started.x)
 const endOffset=positionWithin(endEl,ended)??approximateOffset(endEl,event.clientX)
 if(startOffset===null||endOffset===null)return false
 const serialSpan=started.el===serial?{start:startOffset,end:serial.textContent.length}:{start:endOffset,end:serial.textContent.length}
 const headingSpan=started.el===heading?{start:0,end:startOffset}:{start:0,end:endOffset}
 if(serialSpan.end<=serialSpan.start||headingSpan.end<=headingSpan.start)return false
 lastCrossQuestionSelection={serial,heading,serialSpan,headingSpan,sectionId:started.sectionId,serialText:serial.textContent,headingText:heading.textContent,savedAt:Date.now()}
 restoreCrossQuestionRange(lastCrossQuestionSelection)
 return true
}
function restoreCrossQuestionRange(cross){
 const s=rangeFromOffsets(cross.serial,cross.serialSpan)
 const h=rangeFromOffsets(cross.heading,cross.headingSpan)
 if(!s||!h)return false
 const range=document.createRange()
 range.setStart(s.startContainer,s.startOffset)
 range.setEnd(h.endContainer,h.endOffset)
 const selection=window.getSelection?.()
 if(!selection)return false
 selection.removeAllRanges();selection.addRange(range)
 return true
}
function resolveCrossQuestionSelection(){
 const native=window.getSelection?.()
 if(native?.rangeCount&&!native.isCollapsed){
  const range=native.getRangeAt(0)
  const start=ownerOfSelectionNode(range.startContainer)
  const end=ownerOfSelectionNode(range.endContainer)
  if(start&&end&&start!==end&&start.dataset.sectionId===end.dataset.sectionId){
   if(start.dataset.editField==='question-number'&&end.dataset.editField==='question-heading'){
    const serialSpan={start:positionWithin(start,{node:range.startContainer,offset:range.startOffset}),end:start.textContent.length}
    const headingSpan={start:0,end:positionWithin(end,{node:range.endContainer,offset:range.endOffset})}
    if(serialSpan.start!==null&&headingSpan.end!==null&&serialSpan.end>serialSpan.start&&headingSpan.end>0){
     lastCrossQuestionSelection={serial:start,heading:end,serialSpan,headingSpan,sectionId:start.dataset.sectionId,serialText:start.textContent,headingText:end.textContent,savedAt:Date.now()}
    }
   }
  }
 }
 const cross=lastCrossQuestionSelection
 if(!cross||Date.now()-cross.savedAt>30000||!document.body.contains(cross.serial)||!document.body.contains(cross.heading))return null
 if(cross.serial.dataset.sectionId!==cross.sectionId||cross.heading.dataset.sectionId!==cross.sectionId)return null
 if(cross.serial.textContent!==cross.serialText||cross.heading.textContent!==cross.headingText)return null
 return cross
}
function toggleCrossQuestionMark(mark){
 const cross=resolveCrossQuestionSelection()
 if(!cross)return null
 const {serial,heading,serialSpan,headingSpan,sectionId}=cross
 const serialHandle=liveFieldHandles.get(serial)?.()
 const headingHandle=liveFieldHandles.get(heading)?.()
 if(!serialHandle||!headingHandle)return null
 const state=selectedMarkStates(serial,serialSpan)[mark]&&selectedMarkStates(heading,headingSpan)[mark]
 const enable=!state
 const before={serial:serial.innerHTML,heading:heading.innerHTML}
 const first=splitAndToggleMark(serial,serialSpan,mark,enable)
 const second=splitAndToggleMark(heading,headingSpan,mark,enable)
 if(first===null||second===null){serial.innerHTML=before.serial;heading.innerHTML=before.heading;return null}
 serialHandle.commitElement?.(serial)
 headingHandle.commitElement?.(heading)
 // Commit may sanitize HTML. Undo/redo snapshots must track the canonical
 // post-sanitization DOM, not the intermediate execCommand markup.
 const after={serial:serial.innerHTML,heading:heading.innerHTML}
 const history=crossQuestionHistory.get(serial)||{past:[],future:[]}
 history.past.push({before,after});if(history.past.length>30)history.past.shift();history.future=[]
 crossQuestionHistory.set(serial,history)
 cross.savedAt=Date.now()
 restoreCrossQuestionRange(cross)
 requestAnimationFrame(()=>restoreCrossQuestionRange(cross))
 return enable
}
function replayCrossQuestionHistory(direction){
 const cross=resolveCrossQuestionSelection()
 if(!cross)return false
 const history=crossQuestionHistory.get(cross.serial)
 const from=direction==='undo'?history?.past:history?.future
 const to=direction==='undo'?history?.future:history?.past
 if(!from?.length)return false
 const entry=from[from.length-1]
 const expected=direction==='undo'?entry.after:entry.before
 if(cross.serial.innerHTML!==expected.serial||cross.heading.innerHTML!==expected.heading){
  history.past=[];history.future=[];return false
 }
 from.pop();to.push(entry)
 const html=direction==='undo'?entry.before:entry.after
 cross.serial.innerHTML=html.serial;cross.heading.innerHTML=html.heading
 liveFieldHandles.get(cross.serial)?.()?.commitElement?.(cross.serial)
 liveFieldHandles.get(cross.heading)?.()?.commitElement?.(cross.heading)
 restoreCrossQuestionRange(cross)
 requestAnimationFrame(()=>restoreCrossQuestionRange(cross))
 return true
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
function splitAndToggleMark(el,snapshot,mark,forceState=null) {
 const runs=readInlineRuns(el)
 if(runs.some(run=>run.br))return null
 const states=selectedMarkStates(el,snapshot)
 const enable=forceState===null?!states[mark]:forceState
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
 const crossResult=toggleCrossQuestionMark(command)
 if(crossResult!==null)return crossResult
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
 if(replayCrossQuestionHistory(direction))return true
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
