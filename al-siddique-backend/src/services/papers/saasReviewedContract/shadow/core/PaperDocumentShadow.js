// Phase 3: NON-RENDERING, lossless read adapter. Never normalize teacher content into a new visual layout.
// Preserve the existing Canonical PaperDocumentV2 (schema 3), PTS and Early Years renderers.
import {sha256Sync} from '../migration/hashUtils.js'
import {classifyPaperDocument,DOCUMENT_CLASSIFICATIONS} from '../migration/classifyPaperDocument.js'

export const SHADOW_DOCUMENT_FORMAT='assps-source-preserving-paper-shadow'
export const SHADOW_SCHEMA_VERSION=1
export const SOURCE_NATIVE_RENDER_ONLY='SOURCE_NATIVE_RENDER_ONLY'
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key)
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value))
const asArray=v=>Array.isArray(v)?v:[]
const rawMarks=value=>{
 if(value===null||value===undefined||value==='')return {value:null,evidence:'UNSTATED'}
 const parsed=Number(value)
 return Number.isFinite(parsed)&&parsed>=0?{value:parsed,evidence:'EXPLICIT'}:{value:null,evidence:'INVALID',raw:clone(value)}
}
const direction=lang=>lang==='urdu'?'rtl':lang==='english'?'ltr':'auto'
function resolveType(paper){
 if(!paper||typeof paper!=='object'||Array.isArray(paper))throw new Error('An individual source paper object is required.')
 const classified=classifyPaperDocument(paper)
 if(classified===DOCUMENT_CLASSIFICATIONS.CANONICAL_V2)return 'CANONICAL_V2_SCHEMA3'
 if(paper.userAuthored===true&&paper.documentFormat==='early-years-user-v1')return 'EARLY_YEARS_USER'
 if(paper.corpusId==='early-years-first-term-2026'||paper.id?.startsWith?.('ey-')&&paper.classStage&&Array.isArray(paper.questions))return 'EARLY_YEARS_REFERENCE'
 if(paper.recoverySourceManaged===true&&paper.documentFormat==='pts-native-v13'&&Array.isArray(paper.official_section))return 'RECOVERY_SAVED_V13'
 if(classified===DOCUMENT_CLASSIFICATIONS.OFFICIAL_V13_PAPER)return 'OFFICIAL_V13'
 if(paper.documentFormat==='official-v12'&&Array.isArray(paper.official_section))return 'OFFICIAL_V12'
 if(Array.isArray(paper.sections)&&paper.classLevel!==undefined&&paper.subject!==undefined&&paper.totalMarks!==undefined&&!paper.config&&!paper.metadata)return 'RECOVERY_RAW_SEED'
 if(classified===DOCUMENT_CLASSIFICATIONS.LEGACY_CANVAS_V2)return 'LEGACY_CANVAS_V2'
 if(paper.creationMethod==='blank'||paper.selectedQuestions||paper.selectedMCQ||paper.selectedShort||paper.selectedLong)return 'GENERIC_SAVED_OR_BLANK'
 throw new Error('Unrecognized source type. Preserve the original and use its existing editor; no inferred migration.')
}
const rendererBySource=Object.freeze({
 CANONICAL_V2_SCHEMA3:'CanonicalPaperEditorMain/CanonicalDocumentRenderer',
 OFFICIAL_V13:'PTSPaperGenerator/OfficialSectionRenderer',
 OFFICIAL_V12:'PTSPaperGenerator/OfficialSectionRenderer',
 RECOVERY_SAVED_V13:'PTSPaperGenerator/OfficialSectionRenderer',
 EARLY_YEARS_REFERENCE:'EarlyYearsWorksheetEditor/EarlyYearsPaperContainer',
 EARLY_YEARS_USER:'EarlyYearsActivityBuilder/EarlyYearsPaperContainer',
 RECOVERY_RAW_SEED:'buildRecoverySavedPapers -> PTSPaperGenerator/OfficialSectionRenderer',
 LEGACY_CANVAS_V2:'PaperEditorMain/PaperDocumentRenderer',
 GENERIC_SAVED_OR_BLANK:'PTSPaperGenerator (existing per-type sections)'
})
function itemFrom(item,index,path,kind,marksSource='marks'){
 const q=item&&typeof item==='object'&&!Array.isArray(item)?item:{content:item}
 const evidence=rawMarks(own(q,marksSource)?q[marksSource]:null)
 return {id:own(q,'id')?clone(q.id):null,sourcePath:path,sourceOrder:own(q,'questionNumber')?clone(q.questionNumber):index+1,
 kind:clone(q.presentationType??q.type??kind),language:clone(q.medium??q.language??null),
 direction:clone(q.direction??direction(q.medium??q.language)),content:clone(q.content??q.stemText??q.fullText??q.rawText??q.text??q.heading??null),
 textUrdu:clone(q.textUrdu??null),options:clone(q.options??null),instruction:clone(q.instruction??q.rawInstruction??null),
 marks:evidence.value,marksEvidence:evidence.evidence,
 marksSourcePath:evidence.evidence==='EXPLICIT'?path+'.'+marksSource:null,
 sourceFields:clone(item)}
}
function sectionFrom(raw,index,path,kind,items,sectionMarks){
 const mr=rawMarks(sectionMarks)
 return {id:clone(raw?.id??null),sourcePath:path,sourceOrder:clone(raw?.sourceOrder??raw?.sectionNumber??index+1),
 kind,heading:clone(raw?.heading??raw?.title??null),instruction:clone(raw?.instruction??raw?.instructions??null),
 medium:clone(raw?.medium??raw?.language??null),direction:clone(raw?.direction??direction(raw?.medium??raw?.language)),attemptAny:clone(raw?.attemptAny??null),
 layout:clone(raw?.layout??null),sourceSectionMarks:mr.value,sourceSectionMarksEvidence:mr.evidence,
 items,sourceFields:clone(raw)}
}
function sectionsOf(source,type){
 if(['OFFICIAL_V13','OFFICIAL_V12','RECOVERY_SAVED_V13'].includes(type)){
  return asArray(source.official_section).map((s,i)=>sectionFrom(s,i,'official_section['+i+']','official_section',
   // Official heading/content is a single native section, not N inferred questions from free text.
   [itemFrom(s,0,'official_section['+i+']','official_section')],s?.marks))
 }
 if(['EARLY_YEARS_REFERENCE','EARLY_YEARS_USER'].includes(type)){
  const questions=asArray(source.questions)
  return [sectionFrom({id:null,title:null},0,'questions','early_years_native_activities',
   questions.map((q,i)=>itemFrom(q,i,'questions['+i+']','early_years_activity')),null)]
 }
 if(type==='RECOVERY_RAW_SEED'){
  return asArray(source.sections).map((s,i)=>sectionFrom(s,i,'sections['+i+']','recovery_raw_section',
   asArray(s?.items).map((q,j)=>itemFrom(q,j,'sections['+i+'].items['+j+']',s?.type||'raw_item')),
   s?.marks))
 }
 if(type==='CANONICAL_V2_SCHEMA3'){
  return asArray(source.sections).map((s,i)=>sectionFrom(s,i,'sections['+i+']','canonical_section',
   asArray(s?.nodes).map((q,j)=>itemFrom(q,j,'sections['+i+'].nodes['+j+']',q?.type||'canonical_node','authoritativeNodeMarks')),
   s?.authoritativeSectionTotal))
 }
 if(type==='LEGACY_CANVAS_V2'){
  return asArray(source.sections).map((s,i)=>sectionFrom(s,i,'sections['+i+']',s?.type||'legacy_section',
   asArray(s?.questions).map((q,j)=>itemFrom(q,j,'sections['+i+'].questions['+j+']',s?.type||'legacy_question')),
   s?.totalMarks))
 }
 // Saved generic sections are selectedQuestions groups. Never count mirrored official_section twice.
 const selected=source.selectedQuestions&&typeof source.selectedQuestions==='object'?source.selectedQuestions:{}
 const groups=Object.entries(selected).filter(([,entry])=>Array.isArray(entry?.questions))
 if(groups.length){
  return groups.map(([kind,entry],i)=>sectionFrom({id:kind,title:kind},i,'selectedQuestions.'+kind,kind,
   entry.questions.map((q,j)=>itemFrom(q,j,'selectedQuestions.'+kind+'.questions['+j+']',kind)),null))
 }
 return ['selectedMCQ','selectedShort','selectedLong'].filter(k=>Array.isArray(source[k])&&source[k].length)
  .map((k,i)=>sectionFrom({id:k,title:k},i,k,k,
   source[k].map((q,j)=>itemFrom(q,j,k+'['+j+']',k)),null))
}
function headerOf(source,type){
 if(type==='CANONICAL_V2_SCHEMA3')return {
  declared:source.authority?.originalTeacherHeaderTotal??source.authority?.storedConfiguredTotal??null,
  authority:clone(source.authority??null),origin:'CANONICAL_SOURCE_AUTHORITY'}
 if(type==='EARLY_YEARS_USER')return {declared:source.headerSource?.totalMarks??null,authority:null,origin:'USER_HEADER'}
 if(type==='EARLY_YEARS_REFERENCE')return {declared:source.totalMarksSource?.headerTotal??null,
  authority:clone(source.totalMarksSource??null),origin:'TEACHER_SOURCE_HEADER'}
 if(type==='RECOVERY_RAW_SEED')return {declared:source.totalMarks??null,authority:null,origin:'RECOVERY_SEED_HEADER'}
 return {declared:source.config?.totalMarks??source.metadata?.totalMarks??null,authority:null,origin:'SAVED_HEADER'}
}
function metadataOf(source,type){
 const meta=['EARLY_YEARS_REFERENCE','EARLY_YEARS_USER'].includes(type)?source.headerSource||{}:
  type==='CANONICAL_V2_SCHEMA3'?source.metadata||{}:
  type==='RECOVERY_RAW_SEED'?source:source.config||source.metadata||{}
 return {id:clone(source.id??null),name:clone(source.name??null),
  title:clone(meta.title??null),classLevel:clone(meta.classLevel??source.classStage??null),
  subject:clone(meta.subject??source.subject??null),examType:clone(meta.examType??null),
  date:clone(meta.examDate??null),timeAllowed:clone(meta.timeAllowed??null),
  language:clone(meta.language??source.language??null),
  paperCode:clone(meta.paperCode??null),session:clone(meta.session??null),
  // Captures the COMPLETE explicit header; doesn't supply any new date, class or total.
  sourceHeader:clone(meta)}
}
function appearanceOf(source,type){
 const early=['EARLY_YEARS_REFERENCE','EARLY_YEARS_USER'].includes(type)
 return {renderRoute:rendererBySource[type],cutoverReady:false,renderPolicy:SOURCE_NATIVE_RENDER_ONLY,
  editorSettings:clone(source.editorSettings??null),pageSetup:clone(source.pageSetup??null),
  printSettings:clone(source.printSettings??null),
  templateId:clone(source.templateId??source.design?.templateId??source.editorSettings?.template??null),
  earlyYearsPresentation:early?{design:clone(source.design??null),
   headerSource:clone(source.headerSource??null),
   questionPresentation:asArray(source.questions).map(q=>({id:clone(q?.id??null),type:clone(q?.presentationType??null),
    content:clone(q?.content??null),instruction:clone(q?.instruction??null),label:clone(q?.label??null)}))}:null,
  canonicalPresentation:clone(source.presentation??null)}
}
export function inspectPaperMarks(shadow){
 const sections=shadow.sections||[]
 let incomplete=false,invalid=0,knownSum=0
 const sectionsLedger=sections.map(sec=>{
  if(sec.sourceSectionMarksEvidence==='INVALID')invalid++
  const explicitly=sec.sourceSectionMarksEvidence==='EXPLICIT'
  if(explicitly)return {path:sec.sourcePath,knownMarks:sec.sourceSectionMarks,origin:'EXPLICIT_SECTION'}
  const items=sec.items||[]
  if(!items.length){incomplete=true;return {path:sec.sourcePath,knownMarks:null,origin:'EMPTY_OR_UNRESOLVED'}}
  let subtotal=0,unknown=0
  for(const q of items){
   if(q.marksEvidence==='INVALID')invalid++
   if(q.marksEvidence!=='EXPLICIT'){unknown++;continue}
   subtotal+=q.marks
  }
  if(unknown){incomplete=true;return {path:sec.sourcePath,knownMarks:null,knownItemSubtotal:subtotal,unresolvedItems:unknown,
   origin:'INCOMPLETE_ITEM_EVIDENCE'}}
  return {path:sec.sourcePath,knownMarks:subtotal,origin:'SUM_OF_EXPLICIT_ITEM_MARKS'}
 })
 sectionsLedger.forEach(sec=>{if(sec.knownMarks!==null)knownSum+=sec.knownMarks})
 const header=rawMarks(shadow.header.declared)
 const total=incomplete||!sections.length?null:knownSum
 const issues=[]
 if(header.evidence==='INVALID')issues.push({severity:'error',code:'INVALID_SOURCE_HEADER_MARKS',value:clone(shadow.header.declared)})
 if(invalid)issues.push({severity:'error',code:'INVALID_SOURCE_MARKS',count:invalid})
 if(incomplete)issues.push({severity:'warning',code:'UNRESOLVED_MARKS_NO_AUTO_REPAIR'})
 if(header.value!==null&&total!==null&&header.value!==total)
  issues.push({severity:'warning',code:'EXPLICIT_SOURCE_TOTAL_CONFLICT',declared:header.value,calculated:total})
 if(shadow.sourceType==='CANONICAL_V2_SCHEMA3'&&shadow.header.authority?.paperMarksStatus?.includes('UNRESOLVED'))
  issues.push({severity:'warning',code:'CANONICAL_AUTHORITY_UNRESOLVED',status:shadow.header.authority.paperMarksStatus})
 if(shadow.sourceType==='EARLY_YEARS_REFERENCE'&&shadow.sourceSnapshot?.qaFlags?.length)
  issues.push({severity:'info',code:'TEACHER_QA_FLAGS_PRESERVED',flags:clone(shadow.sourceSnapshot.qaFlags)})
 return {headerMarks:header.value,calculatedMarks:total,knownSubtotal:knownSum,
  fullyExplicit:total!==null&&invalid===0,sections:sectionsLedger,issues,
  approvalBlocked:!sections.length||incomplete||invalid>0||header.evidence==='INVALID'||
    (header.value!==null&&total!==null&&header.value!==total)}
}
/** Call on demand ONLY. Does not mutate/store/re-render the source. */
export function createPaperDocumentShadow(source,{tenantId=null}={}){
 const type=resolveType(source),snapshot=clone(source)
 const sourceJson=JSON.stringify(snapshot)
 const shadow={format:SHADOW_DOCUMENT_FORMAT,schemaVersion:SHADOW_SCHEMA_VERSION,
  sourceType:type,sourceId:clone(source.id??null),tenantId,
  sourceHashSha256:sha256Sync(sourceJson),sourceSnapshot:snapshot,
  status:clone(source.status??source.printReadiness??(type==='EARLY_YEARS_REFERENCE'?'SOURCE_REFERENCE':'EXISTING_UNCHANGED')),
  metadata:metadataOf(source,type),header:headerOf(source,type),
  sections:sectionsOf(source,type),appearance:appearanceOf(source,type),
  revision:clone(source.revision??null),protection:{
   sourceReadOnly:['EARLY_YEARS_REFERENCE','CANONICAL_V2_SCHEMA3','OFFICIAL_V13','OFFICIAL_V12','RECOVERY_RAW_SEED','RECOVERY_SAVED_V13'].includes(type),
   canReplaceExistingRenderer:false,roundTripMode:'RESTORE_ORIGINAL_JSON_SNAPSHOT_ONLY'},
  marks:null}
 shadow.appearanceHashSha256=sha256Sync(JSON.stringify(shadow.appearance))
 shadow.marks=inspectPaperMarks(shadow)
 return shadow
}
/** Guard against caller modifications and restore exact source JSON, NOT a lossy projection. */
export function restoreSourcePaperUnchanged(shadow){
 if(shadow?.format!==SHADOW_DOCUMENT_FORMAT||shadow.schemaVersion!==SHADOW_SCHEMA_VERSION)
  throw new Error('Not a PaperDocument shadow; cannot restore.')
 const raw=JSON.stringify(shadow.sourceSnapshot)
 if(sha256Sync(raw)!==shadow.sourceHashSha256)
  throw new Error('Protected source snapshot changed; refusing to overwrite or render.')
 return clone(shadow.sourceSnapshot)
}
export function verifySourcePaperUnchanged(source,shadow){
 if(!source||!shadow)return false
 try{return JSON.stringify(source)===JSON.stringify(restoreSourcePaperUnchanged(shadow))&&
  sha256Sync(JSON.stringify(source))===shadow.sourceHashSha256}
 catch{return false}
}
export function assertNativePresentationContract(source,shadow){
 if(!verifySourcePaperUnchanged(source,shadow))throw new Error('Academic or presentation source changed. Cutover blocked.')
 if(sha256Sync(JSON.stringify(shadow.appearance))!==shadow.appearanceHashSha256)
  throw new Error('Native presentation projection changed; cutover blocked.')
 if(shadow.appearance?.renderPolicy!==SOURCE_NATIVE_RENDER_ONLY||shadow.appearance?.cutoverReady!==false)
  throw new Error('Renderer switch prohibited without golden screenshot/print approval.')
 return {sourceHashSha256:shadow.sourceHashSha256,renderer:shadow.appearance.renderRoute,
  unchanged:true,cutoverReady:false}
}
