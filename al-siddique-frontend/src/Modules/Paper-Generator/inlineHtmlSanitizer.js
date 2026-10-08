// Shared DOM allowlist sanitizer: editor view, canonical payload, and server reopen.
const ALLOWED_TAGS = new Set(['B','STRONG','I','EM','U','S','SPAN','SUP','SUB','BR'])
const ALLOWED_STYLE = new Set(['font-family','font-size','color','background-color','font-weight','font-style','text-decoration','text-decoration-line','vertical-align','display','transform'])
const FONT_RE = /^(?:Times New Roman|Arial|Georgia|Cambria Math|Jameel Noori Nastaleeq|Noto Nastaliq Urdu)(?:\s*,\s*(?:serif|sans-serif))?$/i
const SIZE_RE = /^(?:(?:[8-9]|1\d|2\d|3[0-2])(?:px|pt)|0\.85em)$/
const COLOR_RE = /^(?:#[0-9a-f]{3,8}|rgb(?:a)?\([^)]{3,40}\)|[a-z]{3,20})$/i

export function escapeHtml(value='') {
 return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
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
