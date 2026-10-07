const DIRS=new Set(['ltr','rtl'])
const text=v=>v==null?'':String(v)
const dir=(value,fallback='ltr')=>DIRS.has(value)?value:(DIRS.has(fallback)?fallback:'ltr')
const marks=node=>node?.authoritativeNodeMarks??node?.operationalNodeMarks??null
const cleanHeading=v=>text(v).replace(/^#+\s*/,'').trim()
const itemText=item=>typeof item==='object'&&item!==null?text(item.text??item.value??item.raw):text(item)

function paragraph(node,content,direction,extra={}){return {kind:'paragraph',nodeId:node?.id||null,nodeType:node?.type||null,direction,content:text(content),marks:marks(node),...extra}}
function table(node,columns,rows,direction,extra={}){return {kind:'table',nodeId:node?.id||null,nodeType:node?.type||null,direction,columns:columns.map(text),rows:rows.map(r=>r.map(text)),marks:marks(node),...extra}}

export function projectCanonicalNodeToDocxBlocks(node={},sectionDirection='ltr'){
 const type=text(node.type||node.nodeType)
 const direction=dir(node.direction,sectionDirection)
 if(['short_question','long_question','essay','application','letter','translation','definition','rich_text'].includes(type)){
  const blocks=[paragraph(node,node.stemText??node.text??node.rawText,direction)]
  for(const [i,part] of (Array.isArray(node.subparts)?node.subparts:[]).entries()){
   blocks.push(paragraph(node,part?.text??part?.stemText??part?.rawText??part,direction,{subpartIndex:i+1,parentNodeId:node.id||null}))
  }
  return blocks
 }
 if(type==='mcq'){
  const blocks=[paragraph(node,node.stemText??node.text,direction)]
  const options=Array.isArray(node.options)?node.options:[]
  if(options.length)blocks.push(table(node,['Option','Text'],options.map((o,i)=>[o?.displayLabel||o?.sourceLabel||o?.canonicalLabel||String.fromCharCode(65+i),o?.text??o?.value??'']),direction,{role:'mcq-options'}))
  return blocks
 }
 if(type==='true_false')return [paragraph(node,node.statement??node.text,direction,{role:'true-false',indicator:Boolean(node.hasIndicatorBox)})]
 if(type==='fill_blank'){
  const body=node.fullText??node.rawSource??(Array.isArray(node.segments)?node.segments.map(s=>s?.type==='blank'?(s.value||'__________'):(s?.value||'')).join(''):'')
  const blocks=[paragraph(node,body,direction,{role:'fill-blank'})]
  if(node.wordBank)blocks.push(paragraph(node,Array.isArray(node.wordBank)?node.wordBank.join(', '):node.wordBank,direction,{role:'word-bank',parentNodeId:node.id||null}))
  return blocks
 }
 if(type==='matching_columns'){
  const left=Array.isArray(node.leftItems)?node.leftItems:(Array.isArray(node.leftColumn)?node.leftColumn:[])
  const right=Array.isArray(node.rightItems)?node.rightItems:(Array.isArray(node.rightColumn)?node.rightColumn:[])
  const rows=[];for(let i=0;i<Math.max(left.length,right.length);i++)rows.push([itemText(left[i]),itemText(right[i])])
  return [table(node,['Column A','Column B'],rows,direction,{role:'matching-columns'})]
 }
 if(type==='grammar_table'){
  const columns=Array.isArray(node.columns)&&node.columns.length?node.columns:['Column 1','Column 2']
  const rows=(Array.isArray(node.rows)?node.rows:[]).map(r=>[r?.leftText||(r?.leftIsBlank?'__________':''),r?.rightText||(r?.rightIsBlank?'__________':'')])
  return [table(node,columns,rows,direction,{role:'grammar-table'})]
 }
 if(type==='vertical_math'){
  return [{kind:'vertical_math',nodeId:node.id||null,nodeType:type,direction:'ltr',operator:text(node.operator),operands:(Array.isArray(node.operands)?node.operands:[]).map(o=>text(o?.raw??o?.normalizedNumericValue)),result:node.result==null?'':text(node.result?.raw??node.result),marks:marks(node)}]
 }
 if(type==='section_banner')return [paragraph(node,cleanHeading(node.bannerText??node.rawText),direction,{role:'section-banner'})]
 if(type==='scope_header')return [paragraph(node,cleanHeading(node.headingText??node.scopeText??node.rawText),direction,{role:'scope-header'})]
 if(type==='unknown_preserved')return [paragraph(node,node.rawText??node.provenance?.rawSourceSnapshot??'',direction,{role:'unknown-preserved'})]
 return [paragraph(node,node.rawText??node.stemText??node.text??node.provenance?.rawSourceSnapshot??'',direction,{role:'unclassified-preserved',unsupportedNodeType:type})]
}

export function buildCanonicalDocxModel(doc={}){
 const metadata=doc.metadata||{}
 const documentDirection=dir(metadata.direction,metadata.language==='urdu'?'rtl':'ltr')
 const blocks=[]
 const assetsById=new Map((Array.isArray(doc.assets)?doc.assets:[]).map(asset=>[String(asset.id),asset]))
 for(const [index,section] of (Array.isArray(doc.sections)?doc.sections:[]).entries()){
  const sectionDirection=dir(section?.direction,documentDirection)
  blocks.push({kind:'section_heading',sectionId:section?.id||null,sectionIndex:index+1,direction:sectionDirection,title:text(section?.title??section?.heading??''),titleUrdu:text(section?.titleUrdu??''),instructions:text(section?.instructions??''),marks:section?.authoritativeSectionTotal??section?.operationalSectionTotal??null})
  for(const node of (Array.isArray(section?.nodes)?section.nodes:[])){
   blocks.push(...projectCanonicalNodeToDocxBlocks(node,sectionDirection).map(b=>({...b,sectionId:section?.id||null})))
   if(node?.math&&text(node.math.source).trim())blocks.push({kind:'math_capability',sectionId:section?.id||null,nodeId:node.id||null,direction:'ltr',format:text(node.math.format||'latex'),display:text(node.math.display||'block'),source:text(node.math.source)})
   for(const assetId of (Array.isArray(node?.assetRefs)?node.assetRefs:[])){
    const asset=assetsById.get(String(assetId));if(!asset)continue
    blocks.push({kind:'image_asset',sectionId:section?.id||null,nodeId:node.id||null,direction:'ltr',assetId:String(asset.id),storage:text(asset.storage),mimeType:text(asset.mimeType),sha256:text(asset.sha256),widthPx:Number(asset.widthPx)||null,heightPx:Number(asset.heightPx)||null,altText:text(asset.altText),description:text(asset.description),contentDataUrl:asset.contentDataUrl?text(asset.contentDataUrl):null,contentRef:asset.contentRef?text(asset.contentRef):null})
   }
  }
 }
 return {architectureVersion:'canonical-docx-model-v1',sourceDocumentId:doc.id||null,schemaVersion:doc.schemaVersion??null,direction:documentDirection,metadata:{title:text(metadata.title),examType:text(metadata.examType),className:text(metadata.className??metadata.classLevel),subject:text(metadata.subjectName??metadata.subject),paperCode:text(metadata.paperCode),examDate:text(metadata.examDate),timeAllowed:text(metadata.timeAllowed),session:text(metadata.session),language:text(metadata.language),totalMarks:doc.authority?.authoritativePaperTotal??doc.authority?.storedConfiguredTotal??null},blocks}
}

export function canonicalDocxModelText(model={}){
 const out=[]
 const m=model.metadata||{}
 for(const k of ['title','examType','className','subject','paperCode','examDate','timeAllowed','session'])if(m[k])out.push(text(m[k]))
 for(const b of model.blocks||[]){
  if(b.kind==='section_heading'){if(b.title)out.push(b.title);if(b.titleUrdu&&b.titleUrdu!==b.title)out.push(b.titleUrdu);if(b.instructions)out.push(b.instructions);continue}
  if(b.kind==='paragraph'){if(b.content)out.push(b.content);continue}
  if(b.kind==='table'){for(const c of b.columns||[])if(c)out.push(c);for(const r of b.rows||[])for(const c of r||[])if(c)out.push(c);continue}
  if(b.kind==='vertical_math'){out.push(...(b.operands||[]));if(b.operator)out.push(b.operator);if(b.result)out.push(b.result);continue}
  if(b.kind==='math_capability'){if(b.source)out.push(b.source);continue}
  if(b.kind==='image_asset'){if(b.altText)out.push(b.altText);if(b.description)out.push(b.description)}
 }
 return out.join('\n')
}
