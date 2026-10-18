/**
 * ASSPS protected academic presentation layer.
 * Source teacher text, chapter/unit numbers, page ranges and dates are NEVER changed
 * by this module. A concise display instruction is derived deterministically.
 * Unknown concepts are not silently translated or invented.
 */
const txt = x => String(x ?? '').replace(/\s+/g,' ').trim()
const unique = items => [...new Set(items)]
const containsUrdu = /[\u0600-\u06ff]/
export function lessonLanguage(subject) {
  return /urdu|islamiyat|islamiat|nazra|quran|قرآن|اردو|اسلامیات|مطالعہ|pakistan studies/i.test(String(subject)) ? 'ur' : 'en'
}
export function immutableAcademicRefs(subject, rawNotes=[], pages=[]) {
  const notes=rawNotes.map(txt).filter(Boolean)
  const pageRefs=pages.filter(p=>p&&Number.isSafeInteger(+p.from)&&Number.isSafeInteger(+p.to)&&+p.from>0&&+p.to>=+p.from&&+p.to<10000)
  const unitNumbers=unique(notes.flatMap(s=>[...s.matchAll(/\b(?:unit|chapter|ch(?:apter)?\.?|باب)\s*(?:no\.?|number|#|نمبر)?\s*[:.#-]?\s*(\d{1,3})\b/giu)].map(m=>Number(m[1]))))
  return {pageFrom:pageRefs.length?String(Math.min(...pageRefs.map(p=>+p.from))):'',
    pageTo:pageRefs.length?String(Math.max(...pageRefs.map(p=>+p.to))):'',
    units:unitNumbers, originalTeacherNotes:[...notes] }
}
function namedWriting(notes,language) {
 const joined=notes.join(' ').toLowerCase()
 if(language==='en') {
   const bits=[]
   if(/sick\s*leave|leave\s*application/.test(joined))bits.push('Application: Sick Leave.')
   if(/my\s*book/.test(joined))bits.push('Essay: My Book.')
   return bits
 }
 const bits=[]
 if(/bimari|beemari|bemari|sick\s*leave|بیماری/.test(joined)&&/darkhwast|darkhast|درخواست|application/.test(joined))bits.push('درخواست: بیماری کی درخواست۔')
 if(/meri\s*kitab|mera\s*kitab|my\s*book|میری\s*کتاب/.test(joined))bits.push('مضمون: میری کتاب۔')
 return bits
}
export function composeTeachingStatement({subject,notes=[],pages=[]}={}) {
 const lang=lessonLanguage(subject)
 const refs=immutableAcademicRefs(subject,notes,pages)
 const text=refs.originalTeacherNotes.join(' ').toLowerCase()
 const named=namedWriting(refs.originalTeacherNotes,lang)
 const isEnglish=lang==='en'
 const questions=/question|answer|q\.?\s*&\s*a|سوال|جواب|مشق کے سوال/.test(text)
 const writing=/essay|application|write|writing|copy|class.?work|home.?work|مضمون|درخواست|لکھ|تحریر|کاپی|کام/.test(text)
 const exercises=/exercise|complete|choose|fill|مشق|مکمل|حل کریں/.test(text)
 const reading=/read|reading|learn|پڑھ|یاد/.test(text)
 let instruction
 if (isEnglish) {
   if(questions) instruction='Read the lesson and complete the questions and answers.'
   else if(writing && !exercises && !reading) instruction='Practise the assigned writing work.'
   else if(exercises || writing) instruction='Read the lesson and complete the classwork and exercises.'
   else if(reading) instruction='Read the lesson and learn the assigned work.'
   else instruction='Read the assigned lesson and complete the relevant work.'
 } else {
   if(questions) instruction='سبق پڑھیں، سوالات کے جواب لکھیں اور مشق مکمل کریں۔'
   else if(writing && !exercises && !reading) instruction='دی گئی تحریری مشق مکمل کریں۔'
   else if(exercises || writing) instruction='سبق پڑھیں اور دی گئی مشق مکمل کریں۔'
   else if(reading) instruction='متعلقہ سبق پڑھیں اور یاد کریں۔'
   else instruction='متعلقہ سبق پڑھیں اور مشق مکمل کریں۔'
 }
 const units=refs.units
 const title=units.length ? (isEnglish ? (units.length===1?'Unit #':'Units #') : (units.length===1?'یونٹ نمبر ':'یونٹ نمبر '))+units.join(', ') : ''
 const pageText=refs.pageFrom && refs.pageTo ?
  (isEnglish ? 'Pages '+refs.pageFrom+'–'+refs.pageTo : 'صفحہ نمبر '+refs.pageFrom+' تا '+refs.pageTo) : ''
 const content=named.length ?
   [[title,pageText].filter(Boolean).join(' — '),...named,instruction].filter(Boolean).join('\n') :
   [title,pageText,instruction].filter(Boolean).join(' — ')
 return {...refs,language:lang,statement:content,
   needsLanguageReview:lang==='ur'&&!containsUrdu.test(refs.originalTeacherNotes.join(' '))&&named.length===0&&refs.originalTeacherNotes.length>0}
}
const isoDay = value=> {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null
 const d=new Date(value+'T00:00:00Z')
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d:null
}
const ym=d=>String(d).slice(0,7)
const distinctDates=rows=>unique((rows||[]).map(x=>x.date).filter(d=>isoDay(d)))
/**
 * A school-proposed MONTHLY schedule only. Verified source/manual dates take
 * priority. Never overwrite source dates or pretend proposals are original.
 */
export function proposeTwiceMonthlyAssessments({weeks=[],start,end,existing=[],octoberFirstWeeks=true}={}) {
 const first=isoDay(start),last=isoDay(end)
 if(!first||!last||last<first)return []
 // The original week END must stay untouched. A proposed assessment is
 // on its final available teaching day, never on a Sunday in image metadata.
 const teachingWeeks=weeks.flatMap(w=>{
   const last=isoDay(w.end)
   if(!last)return []
   const day=last.getUTCDay()===0?new Date(last.getTime()-86400000):last
   const date=day.toISOString().slice(0,10)
   return date>=w.start&&date>=start&&date<=end?[{...w,assessmentDate:date}]:[]
 })
 const months=unique(teachingWeeks.map(w=>ym(w.assessmentDate)).filter(m=>/^\d{4}-\d{2}$/.test(m)))
 const fixed=distinctDates(existing)
 const result=[]
 for(const m of months){
   const protectedDates=fixed.filter(d=>ym(d)===m)
   const slots=Math.max(0,2-protectedDates.length)
   if(!slots)continue
   const eligible=teachingWeeks.filter(w=>ym(w.assessmentDate)===m)
     .filter(w=>!protectedDates.includes(w.assessmentDate))
   let selected
   if(octoberFirstWeeks&&m==='2026-10'&&start<='2026-10-17'&&end>='2026-10-24'){
     selected=['2026-10-17','2026-10-24'].filter(d=>eligible.some(w=>w.assessmentDate===d))
   }else {
     // Two-week spacing; the second and fourth teaching weeks in a complete month.
     selected=[eligible[1]?.assessmentDate,eligible[3]?.assessmentDate].filter(Boolean)
     if(!selected.length) selected=[eligible.at(-1)?.assessmentDate].filter(Boolean)
   }
   for(const date of selected.filter(d=>!fixed.includes(d)).slice(0,slots)) {
     if(!result.some(a=>a.date===date))result.push({id:'proposed:'+date,date,
       name:'Chapter-wise Assessment',subject:'',origin:'SCHOOL_POLICY_PROPOSAL',
       originalDate:'',sourceId:'',academicApproval:false})
   }
 }
 return result.sort((a,b)=>a.date.localeCompare(b.date))
}
