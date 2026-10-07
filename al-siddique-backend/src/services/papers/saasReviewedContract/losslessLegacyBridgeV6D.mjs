// V6-C transitional bridge. Does NOT confer canonical or source approval.
// A paper's original JSON survives a no-op round-trip byte-for-byte as data.
// Edits are constrained to fields this legacy storage layout can represent.
const clone = input => JSON.parse(JSON.stringify(input))
const hasOwn = (v,k) => Object.prototype.hasOwnProperty.call(v,k)
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const toHtml = s => String(s??'').split('\n').map(line=>`<p>${esc(line)}</p>`).join('')
const unescapeText = text => String(text).replace(/&nbsp;/gi,'\u00a0').replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&amp;/gi,'&')
const htmlToPlain = html => {
  const source=String(html??'')
  // The legacy source stores plain EN/UR fields. Do not pretend rich marks,
  // embedded tables, images or font styling will survive HTML->plain storage.
  const tags=[...source.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)]
  if(tags.some(match=>!['p','br'].includes(match[1].toLowerCase()) || /<p\s+[^>]+>/i.test(match[0])))
    refuse('rich text requires the canonical rich-text PaperDocument renderer')
  return unescapeText(source.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p>\s*<p>/gi,'\n').replace(/<\/?p>/gi,'')).trim()
}
const eq = (a,b) => JSON.stringify(a)===JSON.stringify(b)
const refuse = why => { throw new Error(`V6-C legacy bridge refused: ${why}`) }
const safeType = value => typeof value==='string' && /^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(value)
const finiteMarks = value => Number.isFinite(value) && value>=0

export function classifyLegacyEditablePaper(source) {
  if(!source || typeof source!=='object'||Array.isArray(source))return {compatible:false,reason:'not an object'}
  if(source.format==='assps-canonical-paper'||source.format==='assps-new-authoring-paper')return {compatible:false,reason:'reviewed SaaS formats require their own editor'}
  if(source.format) return {compatible:false,reason:'unknown source discriminator'}
  if(source.corpusId || source.structureMode==='board_pattern' || source.documentFormat==='canonical-v2')return {compatible:false,reason:'specialist source requires dedicated lossless adapter'}
  if(!Array.isArray(source.numberedQuestionTypes))return {compatible:false,reason:'legacy numbered-question descriptors unavailable'}
  const seen=new Set()
  for(const type of source.numberedQuestionTypes){
    if(!safeType(type?.value)||seen.has(type.value))return {compatible:false,reason:'duplicate/unsafe category identifier'}
    if(!Array.isArray(source[type.value]))return {compatible:false,reason:`missing question array for ${type.value}`}
    if(source[type.value].some(item=>!item||typeof item!=='object'||Array.isArray(item)))return {compatible:false,reason:`unsupported question item in ${type.value}`}
    seen.add(type.value)
  }
  return {compatible:true,reason:null}
}

export function legacyPaperToWorkingDocument(source){
  const support=classifyLegacyEditablePaper(source)
  if(!support.compatible)refuse(support.reason)
  const blocks=[]
  const types=[...source.numberedQuestionTypes].sort((a,b)=>Number(a.questionNo||0)-Number(b.questionNo||0))
  for(const type of types){
    source[type.value].forEach((item,index)=>{
      const marks=hasOwn(item,'marks')?Number(item.marks):Number(source[`${type.value}_marks`]??type.marks??1)
      if(!finiteMarks(marks))refuse(`non-numeric marks for ${type.value} item ${index}`)
      blocks.push({
        id:`${type.value}::${index}`, sourceType:type.value,sourceIndex:index,
        sourceItemId:item.id??null,
        questionNo:blocks.length+1,
        label:type.label||type.labelUrdu||`Question ${type.questionNo||index+1}`,
        marks,marksScope:hasOwn(item,'marks')?'item':'type',
        layout:type.layout||'block',
        contentHtml:toHtml(item.en??item.text??''),
        contentUrduHtml:toHtml(item.ur??item.textUrdu??''),
        answer:item.answer??'',markingNotes:item.markingNotes??'',
        // Full fidelity is held in the base paper and never copied into a
        // flattened editor block; options, bank IDs and custom fields survive.
      })
    })
  }
  return {version:'assps-connect-legacy-working-v6c',
    authority:'LEGACY_COMPATIBILITY_ONLY',printApproved:false,canonicalWriteAllowed:false,
    meta:{subject:source.config?.subjectName??source.config?.subject??'',
      classLevel:source.config?.className??source.config?.classLevel??'',
      section:source.config?.section??'',paperCode:source.config?.paperCode??'',
      language:source.config?.language??source.printPrefs?.language??'english',
      schoolName:source.manualPreviewSettings?.schoolName??'',
      address:source.manualPreviewSettings?.address??''},blocks}
}

const editable=['contentHtml','contentUrduHtml','answer','markingNotes','marks','label','layout']
const setText=(item,primary,alternate,value)=>{
  if(hasOwn(item,primary)&&hasOwn(item,alternate)&&item[primary]!==item[alternate])
    refuse(`conflicting source aliases ${primary}/${alternate} need manual review`)
  if(hasOwn(item,primary))item[primary]=value
  if(hasOwn(item,alternate))item[alternate]=value
  if(!hasOwn(item,primary)&&!hasOwn(item,alternate))item[primary]=value
}
export function applyLegacyWorkingDocument(working,source){
  const baseline=legacyPaperToWorkingDocument(source)
  if(!working||working.version!==baseline.version||!Array.isArray(working.blocks))refuse('unsupported working document')
  if(!eq(working.meta,baseline.meta))refuse('metadata and institution/class identities cannot be changed through this adapter')
  if(working.blocks.length!==baseline.blocks.length)refuse('added/removed questions require the canonical editor')
  if(working.blocks.some((block,i)=>block?.id!==baseline.blocks[i]?.id))
    refuse('question reordering requires a canonical editor with explicit ordering semantics')
  const byId=new Map(baseline.blocks.map(b=>[b.id,b]))
  const seen=new Set(),next=clone(source)
  for(const block of working.blocks){
    if(!block||typeof block!=='object'||!byId.has(block.id)||seen.has(block.id))refuse('invalid or duplicate block identity')
    seen.add(block.id)
    const original=byId.get(block.id)
    for(const field of editable) if(!hasOwn(block,field)) refuse(`missing editable field: ${field}`)
    for(const field of ['contentHtml','contentUrduHtml','answer','markingNotes','label','layout'])
      if(typeof block[field]!=='string') refuse(`invalid field type: ${field}`)
    for(const key of ['sourceType','sourceIndex','sourceItemId','questionNo','marksScope','id'])if(!eq(block[key],original[key]))refuse(`protected source binding changed: ${key}`)
    for(const key of Object.keys(block))if(![...editable,'id','sourceType','sourceIndex','sourceItemId','questionNo','marksScope'].includes(key))refuse(`unsupported block field: ${key}`)
    const type=block.sourceType,index=block.sourceIndex
    const item=next[type][index]
    if(block.contentHtml!==original.contentHtml)setText(item,'en','text',htmlToPlain(block.contentHtml))
    if(block.contentUrduHtml!==original.contentUrduHtml)setText(item,'ur','textUrdu',htmlToPlain(block.contentUrduHtml))
    if(block.answer!==original.answer)item.answer=block.answer
    if(block.markingNotes!==original.markingNotes)item.markingNotes=block.markingNotes
    if(block.marks!==original.marks){
      const marks=Number(block.marks)
      if(!finiteMarks(marks))refuse('marks must be non-negative finite numbers')
      if(block.marksScope==='item')item.marks=marks
      else if(next[type].length===1){next[`${type}_marks`]=marks;const descriptor=next.numberedQuestionTypes.find(t=>t.value===type);if(descriptor)descriptor.marks=marks}
      else refuse('shared category marks cannot be changed for one of multiple questions until canonical PaperDocument editor is active')
    }
    if(block.label!==original.label){
      if(next[type].length!==1)refuse('shared category label cannot be changed per item')
      const descriptor=next.numberedQuestionTypes.find(t=>t.value===type)
      if(descriptor)descriptor.label=String(block.label)
    }
    if(block.layout!==original.layout){
      if(next[type].length!==1)refuse('shared category layout cannot be changed per item')
      const descriptor=next.numberedQuestionTypes.find(t=>t.value===type)
      if(descriptor)descriptor.layout=String(block.layout)
    }
  }
  return next
}
