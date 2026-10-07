const { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, HeadingLevel } = require('docx')

const DIRS = new Set(['ltr','rtl'])
const text = v => v == null ? '' : String(v)
const dir = (value, fallback='ltr') => DIRS.has(value) ? value : (DIRS.has(fallback) ? fallback : 'ltr')
const marks = node => node?.authoritativeNodeMarks ?? node?.operationalNodeMarks ?? null
const cleanHeading = v => text(v).replace(/^#+\s*/, '').trim()
const itemText = item => typeof item === 'object' && item !== null ? text(item.text ?? item.value ?? item.raw) : text(item)

function paragraph(node, content, direction, extra={}) {
  return { kind:'paragraph', nodeId:node?.id || null, nodeType:node?.type || null, direction, content:text(content), marks:marks(node), ...extra }
}
function table(node, columns, rows, direction, extra={}) {
  return { kind:'table', nodeId:node?.id || null, nodeType:node?.type || null, direction, columns:columns.map(text), rows:rows.map(r=>r.map(text)), marks:marks(node), ...extra }
}

function projectCanonicalNodeToDocxBlocks(node={}, sectionDirection='ltr') {
  const type = text(node.type || node.nodeType)
  const direction = dir(node.direction, sectionDirection)
  if (['short_question','long_question','essay','application','letter','translation','definition','rich_text'].includes(type)) {
    const blocks = [paragraph(node, node.stemText ?? node.text ?? node.rawText, direction)]
    for (const [i,part] of (Array.isArray(node.subparts) ? node.subparts : []).entries()) {
      blocks.push(paragraph(node, part?.text ?? part?.stemText ?? part?.rawText ?? part, direction, {subpartIndex:i+1,parentNodeId:node.id||null}))
    }
    return blocks
  }
  if (type === 'mcq') {
    const blocks = [paragraph(node, node.stemText ?? node.text, direction)]
    const options = Array.isArray(node.options) ? node.options : []
    if (options.length) blocks.push(table(node,['Option','Text'],options.map((o,i)=>[
      o?.displayLabel || o?.sourceLabel || o?.canonicalLabel || String.fromCharCode(65+i), o?.text ?? o?.value ?? ''
    ]),direction,{role:'mcq-options'}))
    return blocks
  }
  if (type === 'true_false') return [paragraph(node,node.statement ?? node.text,direction,{role:'true-false',indicator:Boolean(node.hasIndicatorBox)})]
  if (type === 'fill_blank') {
    const body = node.fullText ?? node.rawSource ?? (Array.isArray(node.segments) ? node.segments.map(s=>s?.type==='blank'?(s.value||'__________'):(s?.value||'')).join('') : '')
    const blocks = [paragraph(node,body,direction,{role:'fill-blank'})]
    if (node.wordBank) blocks.push(paragraph(node,Array.isArray(node.wordBank)?node.wordBank.join(', '):node.wordBank,direction,{role:'word-bank',parentNodeId:node.id||null}))
    return blocks
  }
  if (type === 'matching_columns') {
    const left = Array.isArray(node.leftItems) ? node.leftItems : (Array.isArray(node.leftColumn) ? node.leftColumn : [])
    const right = Array.isArray(node.rightItems) ? node.rightItems : (Array.isArray(node.rightColumn) ? node.rightColumn : [])
    const rows=[]; for(let i=0;i<Math.max(left.length,right.length);i++) rows.push([itemText(left[i]),itemText(right[i])])
    return [table(node,['Column A','Column B'],rows,direction,{role:'matching-columns'})]
  }
  if (type === 'grammar_table') {
    const columns = Array.isArray(node.columns) && node.columns.length ? node.columns : ['Column 1','Column 2']
    const rows = (Array.isArray(node.rows)?node.rows:[]).map(r=>[r?.leftText||(r?.leftIsBlank?'__________':''),r?.rightText||(r?.rightIsBlank?'__________':'')])
    return [table(node,columns,rows,direction,{role:'grammar-table'})]
  }
  if (type === 'vertical_math') {
    return [{kind:'vertical_math',nodeId:node.id||null,nodeType:type,direction:'ltr',operator:text(node.operator),operands:(Array.isArray(node.operands)?node.operands:[]).map(o=>text(o?.raw??o?.normalizedNumericValue)),result:node.result==null?'':text(node.result?.raw??node.result),marks:marks(node)}]
  }
  if (type === 'section_banner') return [paragraph(node,cleanHeading(node.bannerText??node.rawText),direction,{role:'section-banner'})]
  if (type === 'scope_header') return [paragraph(node,cleanHeading(node.headingText??node.scopeText??node.rawText),direction,{role:'scope-header'})]
  if (type === 'unknown_preserved') return [paragraph(node,node.rawText??node.provenance?.rawSourceSnapshot??'',direction,{role:'unknown-preserved'})]
  return [paragraph(node,node.rawText??node.stemText??node.text??node.provenance?.rawSourceSnapshot??'',direction,{role:'unclassified-preserved',unsupportedNodeType:type})]
}

function buildCanonicalDocxModel(doc={}) {
  const metadata = doc.metadata || {}
  const documentDirection = dir(metadata.direction, metadata.language === 'urdu' ? 'rtl' : 'ltr')
  const blocks=[]
  for (const [index,section] of (Array.isArray(doc.sections)?doc.sections:[]).entries()) {
    const sectionDirection = dir(section?.direction, documentDirection)
    blocks.push({kind:'section_heading',sectionId:section?.id||null,sectionIndex:index+1,direction:sectionDirection,title:text(section?.title??section?.heading??''),titleUrdu:text(section?.titleUrdu??''),instructions:text(section?.instructions??''),marks:section?.authoritativeSectionTotal??section?.operationalSectionTotal??null})
    for (const node of (Array.isArray(section?.nodes)?section.nodes:[])) blocks.push(...projectCanonicalNodeToDocxBlocks(node,sectionDirection).map(b=>({...b,sectionId:section?.id||null})))
  }
  return {architectureVersion:'canonical-docx-model-v1',sourceDocumentId:doc.id||null,schemaVersion:doc.schemaVersion??null,direction:documentDirection,metadata:{title:text(metadata.title),examType:text(metadata.examType),className:text(metadata.className??metadata.classLevel),subject:text(metadata.subjectName??metadata.subject),paperCode:text(metadata.paperCode),examDate:text(metadata.examDate),timeAllowed:text(metadata.timeAllowed),session:text(metadata.session),language:text(metadata.language),totalMarks:doc.authority?.authoritativePaperTotal??doc.authority?.storedConfiguredTotal??null},blocks}
}

const rtl = d => d === 'rtl'
const run = (value, opts={}) => new TextRun({text:String(value??''),size:opts.size||22,bold:Boolean(opts.bold),italics:Boolean(opts.italics),font:opts.font||(opts.rtl?'Noto Nastaliq Urdu':'Times New Roman'),rightToLeft:Boolean(opts.rtl)})
const para = (value,opts={}) => new Paragraph({heading:opts.heading,bidirectional:Boolean(opts.rtl),alignment:opts.center?AlignmentType.CENTER:(opts.rtl?AlignmentType.RIGHT:AlignmentType.LEFT),children:[run(value,{...opts,rtl:Boolean(opts.rtl)})],spacing:{before:opts.before??0,after:opts.after??100}})
const marksSuffix = value => Number.isFinite(Number(value)) ? `  [${Number(value)}]` : ''

function blockToDocx(block) {
  const isRtl = rtl(block.direction)
  if (block.kind === 'section_heading') {
    const title = block.titleUrdu || block.title || ''
    const out=[para(`${title}${marksSuffix(block.marks)}`.trim(),{rtl:isRtl,bold:true,size:24,before:140,after:80})]
    if(block.instructions)out.push(para(block.instructions,{rtl:isRtl,italics:true,size:20,after:80}))
    return out
  }
  if (block.kind === 'paragraph') return [para(`${block.content}${marksSuffix(block.marks)}`.trim(),{rtl:isRtl,size:22,after:90})]
  if (block.kind === 'vertical_math') {
    const lines=[]
    ;(block.operands||[]).forEach((v,i)=>lines.push(`${i===(block.operands||[]).length-1&&block.operator?block.operator+' ':''}${v}`))
    if(block.result)lines.push(`= ${block.result}`)
    return [new Paragraph({alignment:AlignmentType.RIGHT,children:lines.map((line,i)=>new TextRun({text:line,font:'Courier New',size:24,bold:true,break:i?1:0})),spacing:{after:120}})]
  }
  if (block.kind === 'table') {
    const cols=block.columns||[]
    const makeCell=(value,bold=false)=>new TableCell({children:[para(value,{rtl:isRtl,bold,size:20,after:0})]})
    const rows=[new TableRow({children:cols.map(c=>makeCell(c,true))}),...(block.rows||[]).map(row=>new TableRow({children:row.map(c=>makeCell(c,false))}))]
    return [new Table({width:{size:100,type:WidthType.PERCENTAGE},rows})]
  }
  return []
}

function extractCanonicalDocument(payload={}) {
  if (payload?.document && typeof payload.document === 'object' && payload.document.format === 'assps-canonical-paper') return payload.document
  return payload
}

function canonicalFilename(doc={}) {
  const meta=doc.metadata||{}
  const raw=[meta.subjectName||meta.subject||'Assessment',meta.className||meta.classLevel||''].filter(Boolean).join('_') || 'Assessment_Paper'
  const safe=raw.normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,120) || 'Assessment_Paper'
  return `${safe}.docx`
}

async function buildCanonicalDocxBuffer(doc={}) {
  const model=buildCanonicalDocxModel(doc)
  const m=model.metadata||{}, docRtl=rtl(model.direction), children=[]
  if(m.title)children.push(para(m.title,{rtl:docRtl,bold:true,size:30,center:true,after:80,heading:HeadingLevel.TITLE}))
  if(m.examType&&m.examType!==m.title)children.push(para(m.examType,{rtl:docRtl,bold:true,size:24,center:true,after:100}))
  const metaRows=[['Class',m.className],['Subject',m.subject],['Date',m.examDate],['Time',m.timeAllowed],['Total Marks',m.totalMarks],['Paper Code',m.paperCode],['Session',m.session]].filter(([,v])=>v!==''&&v!==null&&v!==undefined)
  if(metaRows.length){children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:metaRows.map(([k,v])=>new TableRow({children:[new TableCell({children:[para(k,{bold:true,size:20,after:0})]}),new TableCell({children:[para(v,{rtl:docRtl,size:20,after:0})]})]}))}));children.push(para('',{after:60}))}
  for(const block of model.blocks||[])children.push(...blockToDocx(block))
  const document=new Document({styles:{default:{document:{run:{font:'Times New Roman',size:22},paragraph:{spacing:{after:100}}}}},sections:[{properties:{},children}]})
  return {buffer:await Packer.toBuffer(document),model,filename:canonicalFilename(doc)}
}

function assessCanonicalDocxEligibility(review={}) {
  const eligible=review.family==='historical-v13'&&review.reviewStatus==='SOURCE_VALIDATED'&&review.reviewedContract==='PaperDocumentV2'
  return {eligible,family:review.family||'unsupported',reviewStatus:review.reviewStatus||'UNSUPPORTED',snapshotHash:review.snapshotHash||null,reason:eligible?null:'CANONICAL_DOCX_REQUIRES_SOURCE_VALIDATED_V13'}
}

module.exports={projectCanonicalNodeToDocxBlocks,buildCanonicalDocxModel,buildCanonicalDocxBuffer,extractCanonicalDocument,canonicalFilename,assessCanonicalDocxEligibility}
