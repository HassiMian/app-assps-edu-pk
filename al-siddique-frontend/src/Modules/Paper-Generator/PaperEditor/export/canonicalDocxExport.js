import {
  AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
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

const imageTypeFromMime = mime => {
  const value=String(mime||'').toLowerCase()
  if(value.includes('jpeg')||value.includes('jpg'))return 'jpg'
  if(value.includes('gif'))return 'gif'
  if(value.includes('bmp'))return 'bmp'
  if(value.includes('svg'))return 'svg'
  return 'png'
}
const dataUrlToBytes = dataUrl => {
  const match=String(dataUrl||'').match(/^data:([^;,]+)?;base64,(.+)$/i)
  if(!match)return null
  const base64=match[2]
  if(typeof globalThis.Buffer!=='undefined')return Uint8Array.from(globalThis.Buffer.from(base64,'base64'))
  const binary=atob(base64)
  return Uint8Array.from(binary,c=>c.charCodeAt(0))
}
const imageTransformation = block => {
  const rawWidth=Number(block.widthPx)||320
  const rawHeight=Number(block.heightPx)||Math.round(rawWidth*0.625)
  const width=Math.max(48,Math.min(560,rawWidth))
  const height=Math.max(24,Math.round(rawHeight*(width/rawWidth)))
  return {width,height}
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
  if(block.kind==='vertical_math'){
    const lines=[]
    ;(block.operands||[]).forEach((v,i)=>lines.push(`${i===(block.operands||[]).length-1&&block.operator?block.operator+' ':''}${v}`))
    if(block.result)lines.push(`= ${block.result}`)
    return [new Paragraph({alignment:AlignmentType.RIGHT,children:lines.map((line,i)=>new TextRun({text:line,font:'Courier New',size:24,bold:true,break:i?1:0})),spacing:{after:120}})]
  }
  if(block.kind==='math_capability'){
    return [new Paragraph({
      alignment:block.display==='inline'?AlignmentType.LEFT:AlignmentType.CENTER,
      children:[new TextRun({text:String(block.source||''),font:'Cambria Math',size:24})],
      spacing:{before:40,after:100},
    })]
  }
  if(block.kind==='image_capability'){
    const bytes=dataUrlToBytes(block.contentDataUrl)
    if(!bytes||!bytes.length){
      const label=block.altText||block.description||`Image ${block.assetId||''}`
      return [para(`[Image: ${label}]`,{size:20,italics:true,center:true,after:90})]
    }
    const title=block.altText||block.description||'Assessment image'
    return [new Paragraph({
      alignment:AlignmentType.CENTER,
      children:[new ImageRun({
        data:bytes,
        type:imageTypeFromMime(block.mimeType),
        transformation:imageTransformation(block),
        altText:{title,description:block.description||title,name:block.assetId||title},
      })],
      spacing:{before:50,after:100},
    })]
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
