import {improveWeeklyStatement} from './sourceFaithfulPlanningCopy.js'
// ASSPS evidence-first, non-destructive week planner.
// Never interpret generated teaching schedule as quoted WhatsApp instructions.
export const CLASS_INCHARGES=Object.freeze({
  Starter:['Miss Mubeen'],Mover:['Miss Laiba','Miss Abida'],Flyer:['Miss Mubeen'],
  One:['Miss Amna'],Two:['Miss Aasia'],Three:['Miss Alisha']
})
const monthNames={october:10,oct:10,اکتوبر:10,november:11,nov:11,نومبر:11,
 december:12,dec:12,دسمبر:12,january:1,jan:1,جنوری:1,february:2,feb:2,فروری:2}
const pattern=Object.keys(monthNames).sort((a,b)=>b.length-a.length).join('|')
const DAY=86400000
export const normalDigits=s=>String(s||'').replace(/[٠-٩۰-۹]/g,c=>
 String(c.charCodeAt(0)>1750?c.charCodeAt(0)-1776:c.charCodeAt(0)-1632))
export const clean=s=>normalDigits(String(s||'').replace(/\*/g,'').replace(/[‐‑‒–—]/g,'-')).trim()
const mkDate=(y,m,d)=>{const z=new Date(Date.UTC(y,m-1,d));return z.getUTCFullYear()===y&&z.getUTCMonth()+1===m&&z.getUTCDate()===d?z:null}
export const iso=d=>d?.toISOString().slice(0,10)||''
const shift=(d,n)=>new Date(d.getTime()+n*DAY)
const month=s=>monthNames[String(s||'').toLowerCase()]||null
const asWeeks=(from,to)=>{
 const result=[];let cur=new Date(from)
 while(cur<=to&&result.length<36){
  if(cur.getUTCDay()===0){cur=shift(cur,1);continue}
  let last=new Date(cur)
  while(last<to&&last.getUTCDay()!==6)last=shift(last,1)
  if(last>to)last=new Date(to)
  result.push({start:iso(cur),end:iso(last)})
  cur=shift(last,1)
 }
 return result
}
export const sourceLines=c=>(c?.source_detail_records||[]).flatMap(r=>
 (r.source_excerpt_pieces||[]).flatMap(p=>String(p.verbatim||'').split(/\r?\n/).map(x=>({
  text:clean(x),sourceId:r.source_id
 })))).filter(x=>x.text)
const page=s=>{
 const m=clean(s).match(/(?:pages?|pgs?|صفحہ(?:\s*نمبر)?|صفحات)\s*#?\s*:?\s*(\d{1,3})(?:\s*(?:to|تا|سے|[-:])\s*(\d{1,3}))?/iu)
 if(!m)return null
 const from=Number(m[1]),to=Number(m[2]||m[1])
 return from>=1&&from<=to&&to<=500?{from,to}:null
}
const isAssessment=s=>/assessment|جائزہ|ٹیسٹ|\btest\b/iu.test(s)
const boilerplate=s=>/^(?:20\d\d-\d\d-\d\d,|english[ -]?[ab]?:?$|urdu[ -]?[ab]?:?$|al[ -]*si?dd?ique|lesson planning|final term syllabus|class\s*\d+|al.siddique|miss adiba|فائنل ٹرم|کلاس\s*[:：]|مضمون\s*[:：])/iu.test(s)
export function shortDiary(subject,pages,topic=''){
 const rtl=/Urdu|Islamiyat|Islamiat|Quran|Pakistan Studies|اردو|اسلامیات/i.test(subject)
 const p=pages?(rtl?'صفحہ نمبر ':'Pages ')+pages.from+(pages.to===pages.from?'':'–'+pages.to):''
 let detail=clean(topic).replace(/^Work\s*:/i,'').replace(/\s+/g,' ').trim()
 detail=improveWeeklyStatement(detail,subject)
 // Original teacher instructions take precedence over generic replacement.
 if(detail)return p&&!/^(?:pages?|pg|صفحہ)/iu.test(detail)?p+' — '+detail:detail
 if(p)return p
 return ''
}

const finalTeachingDay=d=>{
 let x=shift(d,-1)
 while(x.getUTCDay()===0)x=shift(x,-1)
 return x
}
function parseRange(s,ctx){
 let text=clean(s).replace(/^(?:=>|->|[•·]|\d{1,2}\s*[).])\s*/,'')
 if(/^(?:page|pg|صفحہ|unit|باب|exercise|ex:)/iu.test(text))return null
 const pat=new RegExp('^(\\d{1,2})\\s*('+pattern+')?\\s*(?:to|تا|سے|-)\\s*(\\d{1,2})\\s*('+pattern+')?','iu')
 const m=text.match(pat)
 if(!m)return null
 const a=Number(m[1]),b=Number(m[3])
 let startMonth=month(m[2])||((month(m[4])&&a<=b)?month(m[4]):null)||ctx.header
 let year=ctx.previous?.getUTCFullYear()||ctx.baseYear
 let previousMonth=ctx.previous?.getUTCMonth()+1
 if(ctx.previous&&!month(m[2])){
  const oldDay=ctx.previous.getUTCDate()
  if(a+14<oldDay)startMonth=previousMonth===12?1:previousMonth+1
  else if(a>oldDay&&ctx.header!==previousMonth&&a>=28)startMonth=previousMonth
 }
 if(startMonth<=3&&previousMonth>=9)year++
 if(startMonth>=9&&previousMonth<=3)year--
 let start=mkDate(year,startMonth,a)
 if(!start)return {invalid:'Impossible starting date'}
 let endMonth=month(m[4])||(b<a?(startMonth===12?1:startMonth+1):startMonth)
 let endYear=year;if(endMonth<startMonth)endYear++
 const end=mkDate(endYear,endMonth,b)
 if(!end||end<start||end-start>70*DAY)return {invalid:'Impossible or ambiguous ending date'}
 return {start,end,inferred:!(month(m[2])&&month(m[4])),original:text}
}
function topicsWithoutDates(c){
 const a=sourceLines(c).map(x=>x.text).filter(x=>!boilerplate(x)&&x.length>2)
 const topicLines=a.filter(x=>!/^to$|^اور$|^سے$/iu.test(x)).slice(0,16)
 const match=[...a.join(' ').matchAll(/unit\s*(?:no\.?|#|number)?\s*:?\s*(\d{1,2})/ig)].map(x=>Number(x[1]))
 if(match.length>=2&&match[1]>match[0]&&match[1]-match[0]<=8){
  return Array.from({length:match[1]-match[0]+1},(_,i)=>{
   const n=match[0]+i
   const line=a.find(x=>new RegExp('unit\\s*(?:no\\.?)?\\s*:?\\s*'+n+'\\b','i').test(x))
   return 'Unit '+n+(line?' — '+line.replace(/.*?\d+\s*/,''):'')
  })
 }
 return topicLines
}
function proposed(c,from,to){
 const topics=topicsWithoutDates(c)
 const start=mkDate(...from.split('-').map(Number))
 const end=mkDate(...to.split('-').map(Number))
 if(!start||!end||end<start)return []
 const weeks=asWeeks(start,end)
 return weeks.map((w,i)=>({
  ...w,source:'PROPOSED_WEEKLY_ALLOCATION',
  topic:topics[Math.floor(i*topics.length/weeks.length)]||'Original topic needs review',
  statement:shortDiary(c.source_subject_label,null,topics[Math.floor(i*topics.length/weeks.length)]),
  page:null,assessment:null,sourceIds:c.source_submissions||[],reviewRequired:true
 }))
}
function originalImageWeekReview(c,review){
 if(!review||!Array.isArray(review.weeks)||!['1','One'].includes(String(c.proposed_class_level)))return null
 const sub=c.source_subject_label
 const weeks=review.weeks.flatMap(row=>{
  const sourceText=row.work?.[sub]||row.work?.all||null
  if(!sourceText)return []
  const pageref=page(sourceText)
  const testWeek=/^(?:TEST|FULL REVISION TEST)$/i.test(sourceText.trim())||
   (row.week===17&&/\bTEST\b/i.test(sourceText))
  const assessment=testWeek?{date:row.end,label:'Source test week',origin:'PROPOSED_DATE_WITHIN_IMAGE_TEST_WEEK'}:null
  return [{start:row.start,end:row.end,
   source:testWeek&&!pageref?'ORIGINAL_ASSESSMENT_ONLY':'IMAGE_VISUAL_TRANSCRIPTION_NOT_APPROVED',
   sourceRange:'Image W'+row.week,
   sourceIds:c.source_submissions||[],page:pageref,
   statement:shortDiary(sub,pageref,pageref?null:sourceText),
   teacherText:sourceText,
   reviewRequired:true,assessment}]
 })
 return {mode:'IMAGE_TRANSCRIPTION_REVIEW',weeks,sourceDerived:false,
  warnings:['Transcribed original Class One image. Independent school verification required.',
    'Source image week ranges include Sundays. Do not schedule teaching on holidays.'],
  explicitAssessments:[]}
}
export function compileWeeklyPlan(c,options={}){
 const image=originalImageWeekReview(c,options.imageReview)
 if(image)return image
 const beginning=options.start||'2026-10-15'
 const ending=options.end||'2027-02-15'
 const ctx={baseYear:Number(beginning.slice(0,4)),header:10,previous:null}
 const blocks=[],warnings=[],explicitAssessments=[]
 if((c.source_detail_records||[]).length>1)warnings.push('Multiple source submissions require reconciliation before approval.')
 let active=null
 const flush=()=>{if(active){blocks.push(active);active=null}}
 for(const line of sourceLines(c)){
  const text=line.text
  const header=text.replace(/[^a-zA-Z\u0600-\u06ff]/g,'').toLowerCase()
  if(month(header)&&header.length<16){ctx.header=month(header);continue}
  if(/^(?:\d+\s*جائزہ|جائزہ|assessment|test)/iu.test(text)){
   const m=text.match(new RegExp('(\\d{1,2})\\s*('+pattern+')','iu'))
   if(m){
    const mth=month(m[2]);let year=ctx.previous?.getUTCFullYear()||ctx.baseYear
    if(mth<=3&&ctx.previous?.getUTCMonth()+1>=9)year++
    if(mth>=9&&ctx.previous?.getUTCMonth()+1<=3)year--
    const d=mkDate(year,mth,Number(m[1]))
    if(d)explicitAssessments.push({date:iso(d),sourceId:line.sourceId,label:'جائزہ / Assessment',origin:'ORIGINAL_SOURCE'})
    else warnings.push('Assessment date invalid: '+text)
   }
   continue
  }
  const result=parseRange(text,ctx)
  if(result?.invalid){warnings.push(result.invalid+': '+text);continue}
  if(result){
   flush()
   active={...result,sourceId:line.sourceId,page:page(text),body:[],hasAssessment:isAssessment(text)}
   ctx.previous=result.end
   if(result.inferred)warnings.push('Month/year inferred: '+text)
   continue
  }
  if(active){
   const paged=page(text)
   if(paged)active.page=paged
   if(isAssessment(text))active.hasAssessment=true
   if(!boilerplate(text)&&!/^page\b|^pg\b|^صفحہ/iu.test(text))active.body.push(text)
  }
 }
 flush()
 if(!blocks.length&&!sourceLines(c).length)return {
  mode:'IMAGE_REVIEW_REQUIRED',weeks:[],sourceDerived:false,
  warnings:['Original source is image-only; original text must be independently inspected.'],
  explicitAssessments
 }
 if(!blocks.length)return {
  mode:'SOURCE_UNDATED_REVIEW',weeks:[],sourceDerived:false,
  warnings:['Original weekly dates not supplied. No class allocations, chapters or dates invented.'],
  explicitAssessments
 }
 const weeks=[]
 let lastPage=null
 for(const block of blocks){
  if(block.page&&lastPage&&block.page.from<lastPage.to&&
      !/revision|دہرائی|نظر ثانی/i.test(block.body.join(' '))){
   warnings.push('Overlapping original page ranges: '+lastPage.from+'–'+lastPage.to+' / '+block.page.from+'–'+block.page.to)
  }
  if(block.page)lastPage=block.page
  const long=block.end-block.start>16*DAY
  const teachingEnd=long?finalTeachingDay(block.end):block.end
  for(const week of asWeeks(block.start,teachingEnd)){
   weeks.push({...week,source:'SOURCE_DATE_RANGE',
    sourceRange:block.original,sourceIds:[block.sourceId],page:block.page,
    statement:shortDiary(c.source_subject_label,block.page,block.body.map(t=>t.replace(/\s*\+\s*(?:Assessment|Test|جائزہ)/ig,'')).find(t=>t.trim())||''),
    // Immutable teacher-authored instruction text is retained in FULL.
    // Weekly's short visual headline is never the source of truth for Term.
    teacherText:block.body.join('\n'),
    reviewRequired:block.inferred,assessment:null})
  }
  if(block.hasAssessment && !explicitAssessments.some(a=>
   a.date>=iso(block.start)&&a.date<=iso(new Date(block.end.getTime()+7*DAY)))){
   const target=weeks.findLast(w=>w.sourceIds?.includes(block.sourceId))
   if(target)target.assessment={date:'',label:'Assessment (source date not supplied)',
     origin:'SOURCE_UNDATED_ASSESSMENT',sourceId:block.sourceId}
   warnings.push('Teacher assessment has no exact source date; none was assigned.')
  }
 }
 for(const a of explicitAssessments){
  const w=weeks.find(x=>x.start<=a.date&&x.end>=a.date)
  if(w)w.assessment=a
  else weeks.push({start:a.date,end:a.date,source:'ORIGINAL_ASSESSMENT_ONLY',
   sourceIds:[a.sourceId],sourceRange:a.raw,page:null,
   statement:'',reviewRequired:false,assessment:a})
 }
 // Repeated assessment summaries are duplicates of the earlier explicit
 // schedule, not another assessment in a future academic year.
 const uniqueAssessment=new Set()
 const spans=weeks.filter(w=>{
   if(!w.assessment||w.assessment.origin!=='ORIGINAL_SOURCE')return true
   const key=w.assessment.date+':'+w.assessment.sourceId
   if(uniqueAssessment.has(key))return false
   uniqueAssessment.add(key);return true
 }).sort((a,b)=>a.start.localeCompare(b.start))
 for(let i=1;i<spans.length;i++){
  if(spans[i].start<=spans[i-1].end&&spans[i].source!=='ORIGINAL_ASSESSMENT_ONLY'&&spans[i-1].source!=='ORIGINAL_ASSESSMENT_ONLY')
   warnings.push('Overlapping original date ranges: '+spans[i-1].sourceRange+' / '+spans[i].sourceRange)
 }
 return {mode:'SOURCE_DATED',weeks:spans,sourceDerived:true,warnings,
  explicitAssessments}
}
