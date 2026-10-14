export const CLASS_ORDER=Object.freeze(['Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight','Pre-Nine'])
export const LABELS=Object.freeze({Starter:'Starter · Playgroup',Mover:'Mover · Nursery',Flyer:'Flyer · Prep'})
export const escapeReviewHtml=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export function classSubjectGroups(items=[]){
 const byClass=new Map(CLASS_ORDER.map(cls=>[cls,[]]))
 for(const record of items){
   if(!record||typeof record!=='object')continue
   const className=record.className||record.classLevel||record.proposed_class_level
   const subject=record.subject||record.source_subject_label
   if(!byClass.has(className)||typeof subject!=='string'||!subject.trim())continue
   byClass.get(className).push({...record,className,subject})
 }
 return CLASS_ORDER.filter(cls=>byClass.get(cls).length).map(className=>({
   className,label:LABELS[className]||'Class '+className,
   subjects:byClass.get(className).sort((a,b)=>a.subject.localeCompare(b.subject,'en'))
 }))
}
export function extractOriginalEvidence(payload){
 const source=payload?.sourceSubmissions||payload?.source_detail_records||[]
 if(!Array.isArray(source))return []
 return source.flatMap(record=>{
   if(!record||typeof record!=='object')return []
   const pieces=Array.isArray(record.source_excerpt_pieces)?record.source_excerpt_pieces:[]
   return pieces.map(piece=>({
     sourceId:String(record.source_id||''),receivedAt:String(record.received_at||''),
     lineFrom:piece?.source_start_line??null,lineTo:piece?.source_end_line??null,
     verbatim:String(piece?.verbatim||'')
   }))
 })
}
export function classPrintHtml(groups,options={}){
 const generated=escapeReviewHtml(options.generatedAt||'')
 let pages=''
 for(const group of groups){
   let content=''
   for(const item of group.subjects){
     const source=item.source||item.payload||item
     const lines=extractOriginalEvidence(source)
     let evidence=''
     for(const line of lines){
       evidence+='<p class="source" dir="auto">'+escapeReviewHtml(line.verbatim)+'</p>'
       evidence+='<small>'+escapeReviewHtml(line.sourceId)+' · lines '+escapeReviewHtml(line.lineFrom??'?')+'–'+escapeReviewHtml(line.lineTo??'?')+'</small>'
     }
     const corrections=Array.isArray(source.corrections)?source.corrections:[]
     for(const correction of corrections){
       evidence+='<p class="proposal"><b>Proposed (not approved):</b> '+escapeReviewHtml(correction.proposedText)+' ('+escapeReviewHtml(correction.decision||'PENDING')+')</p>'
     }
     content+='<section class="subject"><h3>'+escapeReviewHtml(item.subject)+'</h3><p class="warning">PRIVATE SOURCE REVIEW — NOT PUBLISHED</p>'
       +(evidence||'<p>Original source is not available for this selection.</p>')+'</section>'
   }
   pages+='<article class="class"><h2>'+escapeReviewHtml(LABELS[group.className]||'Class '+group.className)+'</h2>'+content+'</article>'
 }
 const school='AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
 return '<!doctype html><html><head><meta charset="utf-8"/><title>'+school+' Academic Review</title><style>'+
 '@page{size:A4;margin:15mm}body{font-family:"Times New Roman",serif;color:#152337;line-height:1.6}'+
 'h1{font-size:19pt;border-bottom:2px solid #0b305e}h2{font-size:15pt;border-bottom:1px solid #bbb}h3{font-size:12pt}'+
 '.class{page-break-before:always}.class:first-of-type{page-break-before:auto}.subject{break-inside:avoid;padding-bottom:14pt}'+
 '.source{font-family:"Jameel Noori Nastaleeq","Times New Roman",serif;white-space:pre-wrap;unicode-bidi:plaintext;font-size:12pt}'+
 'small{color:#555}.warning{font:9pt sans-serif;color:#9b2c2c}.proposal{border-left:2px solid #555;padding-left:8px}'+
 '</style></head><body><h1>'+school+'</h1><p>Private academic review · '+generated+'</p>'+pages+'</body></html>'
}
