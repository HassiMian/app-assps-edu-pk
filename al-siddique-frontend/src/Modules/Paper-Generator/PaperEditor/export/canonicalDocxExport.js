import {
  AlignmentType, Document, HeadingLevel, ImageRun, Math as OfficeMath, MathRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx'
import { buildCanonicalDocxModel } from './canonicalDocxModel.js'

const rtl = d => d === 'rtl'
const run = (value, opts={}) => new TextRun({ text:String(value??''), size:opts.size||22, bold:Boolean(opts.bold), italics:Boolean(opts.italics), font:opts.font || (opts.rtl ? 'Noto Nastaliq Urdu' : 'Times New Roman'), rightToLeft:Boolean(opts.rtl) })
const para = (value, opts={}) => new Paragraph({
  heading: opts.heading,
  bidirectional:Boolean(opts.rtl),
  alignment: opts.center ? AlignmentType.CENTER : (opts.rtl ? AlignmentType.RIGHT : AlignmentType.LEFT),
  children:[run(value,{...opts,rtl:Boolean(opts.rtl)})],
  spacing:{before:opts.before??0,after:opts.after??100},
})
const marksSuffix = value => Number.isFinite(Number(value)) ? `  [${Number(value)}]` : ''
const imageTypeFromMime = mime => ({'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/gif':'gif','image/bmp':'bmp'}[String(mime||'').toLowerCase()] || null)
function decodeEmbeddedDataUrl(dataUrl=''){
  const match=String(dataUrl).match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/)
  if(!match)return null
  const binary=globalThis.atob ? globalThis.atob(match[2].replace(/\s+/g,'')) : null
  if(binary===null)return null
  const bytes=new Uint8Array(binary.length)
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
  return {mimeType:match[1].toLowerCase(),bytes}
}
function imageSize(block={}){
  const width=Math.max(1,Number(block.widthPx)||320)
  const height=Math.max(1,Number(block.heightPx)||200)
  const maxWidth=560
  const scale=Math.min(1,maxWidth/width)
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}
}

function blockToDocx(block){
  const isRtl=rtl(block.direction)
  if(block.kind==='section_heading'){
    const title=block.titleUrdu || block.title || ''
    const value=`${title}${marksSuffix(block.marks)}`.trim()
    const out=[para(value,{rtl:isRtl,bold:true,size:24,before:140,after:80})]
    if(block.instructions)out.push(para(block.instructions,{rtl:isRtl,italics:true,size:20,after:80}))
    return out
  }
  if(block.kind==='paragraph')return [para(`${block.content}${marksSuffix(block.marks)}`.trim(),{rtl:isRtl,size:22,after:90})]
  if(block.kind==='math_capability'){
    const source=String(block.source||'')
    if(!source.trim())return []
    return [new Paragraph({alignment:block.display==='inline'?AlignmentType.LEFT:AlignmentType.CENTER,children:[new OfficeMath({children:[new MathRun(source)]})],spacing:{after:100}})]
  }
  if(block.kind==='image_asset'){
    const decoded=block.storage==='embedded'?decodeEmbeddedDataUrl(block.contentDataUrl):null
    const type=imageTypeFromMime(block.mimeType||decoded?.mimeType)
    if(!decoded||!type)return [para(block.altText||block.description||'Image asset',{center:true,italics:true,size:18,after:80})]
    const size=imageSize(block)
    const image=new ImageRun({data:decoded.bytes,type,transformation:size,altText:{title:block.altText||block.assetId||'Assessment image',description:block.description||block.altText||'',name:block.assetId||'assessment-image'}})
    return [new Paragraph({alignment:AlignmentType.CENTER,children:[image],spacing:{after:100}})]
  }
  if(block.kind==='vertical_math'){
    const lines=[]
    ;(block.operands||[]).forEach((v,i)=>lines.push(`${i===(block.operands||[]).length-1&&block.operator?block.operator+' ':''}${v}`))
    if(block.result)lines.push(`= ${block.result}`)
    return [new Paragraph({alignment:AlignmentType.RIGHT,children:lines.map((line,i)=>new TextRun({text:line,font:'Courier New',size:24,bold:true,break:i?1:0})),spacing:{after:120}})]
  }
  if(block.kind==='table'){
    const cols=block.columns||[]
    const makeCell=(value,bold=false)=>new TableCell({children:[para(value,{rtl:isRtl,bold,size:20,after:0})]})
    const rows=[new TableRow({children:cols.map(c=>makeCell(c,true))}),...(block.rows||[]).map(row=>new TableRow({children:row.map(c=>makeCell(c,false))}))]
    return [new Table({width:{size:100,type:WidthType.PERCENTAGE},rows})]
  }
  return []
}

export function buildCanonicalDocxDocument(paper={}){
  const model=buildCanonicalDocxModel(paper)
  const m=model.metadata||{}
  const docRtl=rtl(model.direction)
  const children=[]
  if(m.title)children.push(para(m.title,{rtl:docRtl,bold:true,size:30,center:true,after:80,heading:HeadingLevel.TITLE}))
  if(m.examType&&m.examType!==m.title)children.push(para(m.examType,{rtl:docRtl,bold:true,size:24,center:true,after:100}))
  const metaRows=[
    ['Class',m.className],['Subject',m.subject],['Date',m.examDate],['Time',m.timeAllowed],['Total Marks',m.totalMarks],['Paper Code',m.paperCode],['Session',m.session],
  ].filter(([,v])=>v!==''&&v!==null&&v!==undefined)
  if(metaRows.length){
    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:metaRows.map(([k,v])=>new TableRow({children:[new TableCell({children:[para(k,{bold:true,size:20,after:0})]}),new TableCell({children:[para(v,{rtl:docRtl,size:20,after:0})]})]}))}))
    children.push(para('',{after:60}))
  }
  for(const block of model.blocks||[])children.push(...blockToDocx(block))
  return {model,document:new Document({styles:{default:{document:{run:{font:'Times New Roman',size:22},paragraph:{spacing:{after:100}}}}},sections:[{properties:{},children}]})}
}

export async function packCanonicalDocx(paper={}, {as='blob'}={}){
  const {document}=buildCanonicalDocxDocument(paper)
  return as==='buffer' ? Packer.toBuffer(document) : Packer.toBlob(document)
}

export async function downloadCanonicalDocx(paper={}, filename='assessment-paper.docx'){
  const blob=await packCanonicalDocx(paper,{as:'blob'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url;a.download=String(filename).toLowerCase().endsWith('.docx')?filename:`${filename}.docx`
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)
  return true
}
