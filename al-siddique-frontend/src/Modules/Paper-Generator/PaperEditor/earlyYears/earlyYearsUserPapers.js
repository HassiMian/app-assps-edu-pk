// Independent, tenant-scoped USER-OWNED Early Years documents. Never writes source V1/V2 or overlays.
import { getTenantStorageItem, setTenantStorageItem } from '../../../../services/tenantStorage.js'
import { getAllSketchAssets } from './assets/SketchAssetRegistry.js'
export const USER_EARLY_YEARS_KEY = 'assps-early-years-user-papers-v1'
export const ACTIVITY_TYPES = Object.freeze([
 ['TraceGlyphGrid','Trace letters / numbers'],['AlphabetWritingArea','Handwriting lines'],
 ['UrduAlphabetWritingArea','Urdu handwriting'],['VisualMatchingColumns','Matching columns'],
 ['PictureColoringBlock','Picture colouring'],['CircleChoiceGrid','Circle the letter / number'],
 ['MissingLetterGrid','Missing letters / words'],['BeforeAfterGrid','Before / after numbers'],
 ['DrawingResponseArea','Sketch / drawing response'],['StandardTextResponse','Question with answer lines']
])
const stageNames={starter:'Starter',mover:'Mover',flyer:'Flyer'}
const clone=value=>JSON.parse(JSON.stringify(value))
const trimmed=value=>String(value??'').trim()
const values=text=>trimmed(text).split(/[,\n]+/).map(x=>x.trim()).filter(Boolean)
function newId(prefix) {
 const uuid=typeof globalThis.crypto?.randomUUID==='function' ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
 return `${prefix}-${uuid}`
}
export function createUserEarlyYearsPaper(input={}) {
 const classStage=trimmed(input.classStage).toLowerCase()
 if(!stageNames[classStage]) throw new Error('Select Starter, Mover or Flyer.')
 const subject=trimmed(input.subject)
 if(!subject) throw new Error('Subject is required.')
 const language=['urdu','english'].includes(input.language)?input.language:'english'
 const rawTotal=trimmed(input.targetMarks)
 const totalMarks=rawTotal===''?null:Number(rawTotal)
 if(totalMarks!==null&&(!Number.isFinite(totalMarks)||totalMarks<0)) throw new Error('Target marks must be non-negative.')
 const name=trimmed(input.name)||`${stageNames[classStage]} ${subject} — My Paper`
 return {id:null,documentFormat:'early-years-user-v1',userAuthored:true,status:'DRAFT',revision:0,
  name,classStage,classDisplayName:stageNames[classStage],subject,language,questions:[],design:{templateId:''},
  headerSource:{schoolName:'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',campus:'Sharif Chowk, Rayya Khas, Narowal',
   class:stageNames[classStage],subject,title:trimmed(input.title)||'Practice Worksheet',totalMarks,
   examDate:trimmed(input.examDate),timeAllowed:trimmed(input.timeAllowed)||'1 Hour'},
  createdAt:null,updatedAt:null}
}
const allowed=new Set(ACTIVITY_TYPES.map(([key])=>key))
export function parseActivityContent(type,text,options={}) {
 const rows=trimmed(text).split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
 const lineCount=Math.max(1,Math.min(12,Number(options.lineCount)||3))
 if(type==='TraceGlyphGrid') return {glyphs:trimmed(text).split(/[,\s]+/).filter(Boolean),gridColumns:Math.min(6,Math.max(2,Number(options.columns)||5)),practiceLane:true}
 if(type==='AlphabetWritingArea'||type==='UrduAlphabetWritingArea') return {lineCount}
 if(type==='PictureColoringBlock') {
  const registry=getAllSketchAssets().filter(asset=>asset.source==='BUILTIN')
  const items=values(text).map(label=>{
   const match=registry.find(s=>s.id.toLowerCase()===label.toLowerCase()||s.name.toLowerCase()===label.toLowerCase())
   if(!match) throw new Error(`Unknown picture: ${label}. Choose a picture from the built-in sketch library.`)
   return {sketchId:match.id,label:match.name}
  })
  return {items,layout:'stacked'}
 }
 if(type==='VisualMatchingColumns') {if(rows.some(r=>!r.includes('|')||!r.split('|')[0].trim()||!r.split('|')[1]?.trim())) throw new Error('Each matching row needs LEFT | RIGHT.');return {leftItems:rows.map((r,i)=>({id:`l${i}`,text:r.split('|')[0]?.trim()||''})),
  rightItems:rows.map((r,i)=>({id:`r${i}`,text:r.split('|')[1]?.trim()||''}))}}
 if(type==='CircleChoiceGrid') return {letterGrid:rows.map(row=>values(row))}
 if(type==='MissingLetterGrid') return {items:rows}
 if(type==='BeforeAfterGrid') return {items:values(text).map(target=>({target})),mode:options.mode==='after'?'after':'before'}
 if(type==='DrawingResponseArea') return {hint:trimmed(text),height:'50mm'}
 if(type==='StandardTextResponse') return {text:trimmed(text),lineCount}
 throw new Error('Unsupported Early Years activity.')
}
export function displayActivityContent(question) {
 const c=question?.content||{},type=question?.presentationType
 if(type==='TraceGlyphGrid') return (c.glyphs||[]).join(', ')
 if(type==='PictureColoringBlock') return (c.items||[]).map(i=>i.label||i.sketchId).join(', ')
 if(type==='VisualMatchingColumns') return (c.leftItems||[]).map((i,n)=>`${i.text||''} | ${c.rightItems?.[n]?.text||''}`).join('\n')
 if(type==='CircleChoiceGrid') return (c.letterGrid||[]).map(r=>r.join(', ')).join('\n')
 if(type==='MissingLetterGrid') return (c.items||[]).join('\n')
 if(type==='BeforeAfterGrid') return (c.items||[]).map(i=>i.target).join(', ')
 return c.text||c.hint||''
}
export function addUserActivity(paper,type,attrs={}) {
 if(!allowed.has(type)) throw new Error('Unknown activity type.')
 const marks=attrs.marks===''||attrs.marks==null?null:Number(attrs.marks)
 if(marks!==null&&(!Number.isFinite(marks)||marks<0)) throw new Error('Activity marks cannot be negative.')
 const content=parseActivityContent(type,attrs.text||'',attrs)
 const question={id:newId('eyuq'),presentationType:type,instruction:trimmed(attrs.instruction)||ACTIVITY_TYPES.find(([key])=>key===type)[1],
  marks,content}
 return {...paper,questions:renumber([...(paper.questions||[]),question])}
}
export function renumber(questions) {
 return questions.map((q,i)=>({...q,questionNumber:i+1,label:`Q${i+1}`}))
}
export function updateUserActivity(paper,id,changes={}) {
 if(!(paper.questions||[]).some(q=>q.id===id)) throw new Error('Activity not found.')
 return {...paper,questions:renumber(paper.questions.map(q=>q.id!==id?q:{...q,...changes,id:q.id}))}
}
export function validateUserEarlyYearsPaper(paper) {
 const issues=[]
 if(!stageNames[paper?.classStage]||!trimmed(paper?.subject)) issues.push('Missing class or subject.')
 if(!(paper?.questions||[]).length) issues.push('Add an activity before printing.')
 for(const q of paper?.questions||[]) {
  if(!allowed.has(q.presentationType)) issues.push(`${q.label}: unsupported activity.`)
  if(q.marks==null||!Number.isFinite(Number(q.marks))||Number(q.marks)<0) issues.push(`${q.label}: enter valid marks.`)
  if(!trimmed(q.instruction)) issues.push(`${q.label}: instruction is required.`)
  if(q.presentationType==='StandardTextResponse'&&!trimmed(q.content?.text)) issues.push(`${q.label}: question text is required.`)
  if(['TraceGlyphGrid','PictureColoringBlock','MissingLetterGrid','VisualMatchingColumns','CircleChoiceGrid','BeforeAfterGrid'].includes(q.presentationType)
    && !Object.values(q.content||{}).some(v=>Array.isArray(v)&&v.length)) issues.push(`${q.label}: content is empty.`)
 }
 const sum=(paper?.questions||[]).reduce((n,q)=>n+(Number(q.marks)||0),0)
 const target=paper?.headerSource?.totalMarks
 if(target!=null&&Number(target)!==sum) issues.push(`Header ${target} / question sum ${sum}: reconcile marks.`)
 return {valid:issues.length===0,issues,questionMarks:sum,targetMarks:target}
}
export function listUserEarlyYearsPapers() {
 const raw=getTenantStorageItem(USER_EARLY_YEARS_KEY)
 if(raw===null) return []
 const list=JSON.parse(raw)
 if(!Array.isArray(list)) throw new Error('Saved Early Years library is not a valid array; no data overwritten.')
 return list.filter(p=>p?.userAuthored===true&&p?.documentFormat==='early-years-user-v1'&&String(p.id).startsWith('eyu-'))
}
export function saveUserEarlyYearsPaper(paper) {
 if(!paper?.userAuthored||paper.documentFormat!=='early-years-user-v1'||!stageNames[paper.classStage]) throw new Error('Only user-created Early Years documents may be saved here.')
 const library=listUserEarlyYearsPapers(), index=library.findIndex(p=>p.id===paper.id)
 if(paper.id&&index<0) throw new Error('The existing draft was not found. Refusing to overwrite another paper.')
 if(index>=0&&library[index].revision!==paper.revision) throw new Error('Another version was saved. Reopen before editing to prevent data loss.')
 const now=new Date().toISOString()
 const record={...clone(paper),id:index<0?newId('eyu'):paper.id,
  revision:(index<0?0:library[index].revision)+1,createdAt:index<0?now:library[index].createdAt,updatedAt:now,status:'DRAFT'}
 if(index<0) library.unshift(record);else library[index]=record
 setTenantStorageItem(USER_EARLY_YEARS_KEY,JSON.stringify(library))
 return clone(record)
}
export function duplicateUserEarlyYearsPaper(paper) {
 if(!paper?.userAuthored||paper.documentFormat!=='early-years-user-v1') throw new Error('Reference papers cannot be duplicated by the user library.')
 return {...clone(paper),id:null,name:`${paper.name} (Copy)`,revision:0,createdAt:null,updatedAt:null,
  questions:renumber(paper.questions.map(q=>({...clone(q),id:newId('eyuq')}))),status:'DRAFT'}
}

export function deleteUserEarlyYearsPaper(id,revision) {
 const library=listUserEarlyYearsPapers(), index=library.findIndex(p=>p.id===id)
 if(index<0||library[index].revision!==revision) throw new Error('Paper changed or was already removed; refresh first.')
 library.splice(index,1)
 setTenantStorageItem(USER_EARLY_YEARS_KEY,JSON.stringify(library))
 return true
}
