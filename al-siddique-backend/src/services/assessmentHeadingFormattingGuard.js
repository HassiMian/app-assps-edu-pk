'use strict'
// Paper Studio owns optional rich heading fragments. They are presentation
// only: plain canonical headings, numeric marks, and question IDs are authority.
// Do not silently strip/repair user-submitted rich HTML before hashing an
// immutable revision. Reject invalid fragments before INSERT instead.
const TAGS=new Set(['b','strong','i','em','u','s','span','sup','sub','br'])
const PROPS=new Set(['font-family','font-size','color','background-color','font-weight','font-style','text-decoration','text-decoration-line','vertical-align','display','transform'])
const FONT=/^(?:Times New Roman|Arial|Georgia|Cambria Math|Jameel Noori Nastaleeq|Noto Nastaliq Urdu)(?:\s*,\s*(?:serif|sans-serif))?$/i
const SIZE=/^(?:(?:[8-9]|1\d|2\d|3[0-2])(?:px|pt)|0\.85em)$/
const COLOR=/^(?:#[0-9a-f]{3,8}|rgb(?:a)?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|0?\.\d+|1))?\s*\)|[a-z]{3,20})$/i
function styleValueAllowed(prop,value){
 if(prop==='font-family')return FONT.test(value.replace(/["']/g,''))
 if(prop==='font-size')return SIZE.test(value)
 if(prop==='color'||prop==='background-color')return COLOR.test(value)
 if(prop==='font-weight')return /^(?:normal|bold|[1-9]00)$/.test(value)
 if(prop==='font-style')return /^(?:normal|italic)$/.test(value)
 if(prop==='text-decoration'||prop==='text-decoration-line')return /^(?:none|underline|line-through)(?:\s+(?:underline|line-through))*$/.test(value)
 if(prop==='vertical-align')return /^(?:baseline|super|sub)$/.test(value)
 if(prop==='display')return value==='inline-block'
 if(prop==='transform')return /^skewX\(-8deg\)$/i.test(value)
 return false
}
function parseStyle(css){
 if(!css||css.length>1200||css.includes('/*')||css.includes('\\'))return false
 const seen=new Set()
 for(const part of css.split(';')){
  if(!part.trim())continue
  const match=/^\s*([a-z-]+)\s*:\s*([^;]+?)\s*$/.exec(part)
  if(!match)return false
  const prop=match[1],value=match[2].trim()
  if(!PROPS.has(prop)||seen.has(prop)||!styleValueAllowed(prop,value))return false
  seen.add(prop)
 }
 return seen.size>0
}
function validateFragment(html){
 if(typeof html!=='string'||html.length>16000)return false
 const tokens=/<[^>]*>/g, stack=[]
 let cursor=0,match
 while((match=tokens.exec(html))!==null){
  if(html.slice(cursor,match.index).includes('<'))return false
  cursor=tokens.lastIndex
  const part=/^<\s*(\/?)\s*([A-Za-z]+)([^<>]*?)\s*(\/?)>$/.exec(match[0])
  if(!part)return false
  const close=!!part[1],tag=part[2].toLowerCase(),tail=part[3],selfClose=!!part[4]
  if(!TAGS.has(tag))return false
  if(close){
   if(tail.trim()||selfClose||stack.pop()!==tag)return false
   continue
  }
  if(selfClose&&tag!=='br')return false
  let attrs=tail
  const used=new Set()
  while(attrs.trim()){
   const attr=/^\s+([a-z-]+)\s*=\s*(["'])(.*?)\2/s.exec(attrs)
   if(!attr)return false
   const name=attr[1],value=attr[3]
   if(used.has(name))return false
   if(name==='dir'){
    if(tag!=='span'||!['rtl','ltr'].includes(value))return false
   } else if(name==='style'){
    if(!parseStyle(value))return false
   } else return false
   used.add(name);attrs=attrs.slice(attr[0].length)
  }
  if(tag!=='br'&&!selfClose)stack.push(tag)
 }
 return !html.slice(cursor).includes('<')&&stack.length===0
}
function validateCanonicalHeadingFormatting(document){
 if(!Array.isArray(document?.sections))return null
 for(let i=0;i<document.sections.length;i++){
  const format=document.sections[i]?.headingFormatting
  if(format===undefined)continue
  if(!format||typeof format!=='object'||Array.isArray(format)||
     Object.keys(format).some(key=>!['questionSerial','headingInstruction'].includes(key)))
   return `sections[${i}].headingFormatting contains unrecognized fields`
  for(const key of ['questionSerial','headingInstruction']){
   if(!validateFragment(format[key]))return `sections[${i}].headingFormatting.${key} contains invalid rich HTML`
  }
 }
 return null
}
module.exports={validateCanonicalHeadingFormatting,validateFragment}
