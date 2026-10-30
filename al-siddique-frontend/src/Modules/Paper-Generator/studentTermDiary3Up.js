/**
 * ASSPS approved print geometry: A4 landscape, 3 portrait student cards per sheet.
 * Client-side view only: all student IDs are fetched by the authenticated SaaS API.
 * The caller MUST provide an authenticated roster; no synthetic students or serials.
 */
const e = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const norm = value => String(value ?? '').trim()
const arr = value => Array.isArray(value) ? value : []
const hasUrdu = value => /[\u0600-\u06ff]/.test(String(value ?? ''))
const PALETTES = {
  green:['#e8f6ec','#3f8059'],red:['#fff0ee','#b65360'],purple:['#f2edfc','#7961ac'],
  pink:['#fff0f7','#b67d9b'],yellow:['#fff8e7','#a9833c'],orange:['#fff2e8','#c7814e'],blue:['#ebf3fc','#5e8eba']
}
const CLASS_COLOR = {starter:'green',mover:'purple',flyer:'pink',one:'yellow',two:'orange',three:'red',four:'blue',five:'blue',six:'blue',seven:'blue'}
const getStudent = (s,key,alt) => norm(s?.[key] ?? s?.[alt])
const normalizedSubject = s => norm(s).toLowerCase().replace(/\s+/g,' ')
const isLegacyMigrationRef = gr => /^MIG[\d-]/i.test(gr)

export function studentTermDiaryIdentity(student) {
  const name = getStudent(student,'name','student_name') || getStudent(student,'full_name')
  const father = getStudent(student,'father_name','fatherName')
  const section = getStudent(student,'section','section_name')
  const roll = getStudent(student,'roll_number','roll_no')
  const gr = getStudent(student,'gr_number','gr_no')
  if (!norm(student?.id ?? student?.student_id) || !name) throw new Error('Authenticated student id and name are required')
  const grLabel = gr ? (isLegacyMigrationRef(gr) ? 'SaaS Ref' : 'GR') : 'GR'
  return {id:String(student.id ?? student.student_id),name,father,section,roll,gr,grLabel}
}

export function studentTermDiaryColor(classLevel,section) {
  const c=normalizedSubject(classLevel).replace(/^class\s+/,'')
  const fallback=CLASS_COLOR[c]||'blue'
  // Respect school section colors, but avoid pink/red substitutions for Mover.
  const key=normalizedSubject(section)
  const color=c==='mover'?'purple':c==='starter'?'green':c==='flyer'?'pink':(PALETTES[key]?key:fallback)
  return PALETTES[color]
}

export function studentTermDiarySubjects(plan) {
  const coverage=arr(plan?.termCoverageRows).filter(x=>norm(x.subject)&&norm(x.detail))
  if(coverage.length) return coverage.map(x=>({subject:norm(x.subject),lesson:norm(x.detail)}))
  const result=[]
  for(const subject of arr(plan?.subjects)) {
    const name=norm(subject.subject)
    if(!name) continue
    const textParts=[]
    for(const unit of arr(subject.units)) {
      const label=norm(unit.label)||norm(unit.title)
      const range=norm(unit.pageRange)||(unit.pageFrom&&unit.pageTo?`Pages ${unit.pageFrom}–${unit.pageTo}`:'')
      if(label||range)textParts.push([label,range].filter(Boolean).join(' — '))
    }
    for(const lesson of arr(subject.lessons)) {
      const text=norm(lesson.title || lesson.unitLabel || lesson.topic)
      if(text && !textParts.includes(text))textParts.push(text)
    }
    if(textParts.length)result.push({subject:name,lesson:textParts.join('. ')})
  }
  return result
}

/** Keep printed assessment subject rows aligned with the actual teacher source. */
export function studentTermDiaryAssessmentSubjects(plan, lessonSubjects) {
  const supplied=arr(plan?.assessments).map(x=>norm(x.subject)).filter(Boolean)
  const distinct=new Map()
  for(const item of supplied)if(!distinct.has(normalizedSubject(item)))distinct.set(normalizedSubject(item),item)
  const rows=[]
  const seen=new Set()
  const add = name => {const k=normalizedSubject(name);if(k&&!seen.has(k)){rows.push(name);seen.add(k)}}
  for(const {subject} of lessonSubjects) {
    const m=/^(english|urdu)\s*(?:\(\s*a\s*[+&]\s*b\s*\)|a\s*[+&]\s*b)$/i.exec(norm(subject))
    if(m && [...distinct.keys()].some(key=>key===`${m[1].toLowerCase()} a`||key===`${m[1].toLowerCase()} b`)) {
      add(m[1]+' A')
      add(m[1]+' B')
    } else add(subject)
  }
  // Explicit teacher source subjects not on the merged lesson row must never vanish.
  for(const name of distinct.values())add(name)
  return rows
}
function validAssessmentDate(date) {
  if(/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const value=new Date(date+'T12:00:00Z')
    return Number.isFinite(value.getTime()) && value.toISOString().slice(0,10)===date
  }
  if(/^\d{2}-\d{2}-\d{4}$/.test(date)) {
    const [d,m,y]=date.split('-')
    return validAssessmentDate(`${y}-${m}-${d}`)
  }
  return false
}
function assessmentDates(plan, subject) {
  const list=arr(plan?.assessments).filter(a=>normalizedSubject(a.subject)===normalizedSubject(subject))
  if(list.length>5)throw new Error(`More than five assessment entries for ${subject}; cannot silently discard dates`)
  const result=Array(5).fill('')
  const occupied=Array(5).fill(false)
  for(let i=0;i<list.length;i++) {
    const a=list[i], n=Number(a.number)
    const at=Number.isInteger(n)&&n>=1&&n<=5?n-1:i
    if(occupied[at])throw new Error(`Duplicate assessment number for ${subject}`)
    occupied[at]=true
    const date=norm(a.date)
    if(date&&!validAssessmentDate(date))throw new Error(`Unverified assessment date for ${subject}`)
    result[at]=date
  }
  return result
}

const TABLE_NOTE='ہفتہ وار اور ماہانہ اسیسمنٹس اور ورک شیٹس اسکول کے روزانہ شیڈول اور روزانہ کی لیسن پلاننگ کے مطابق کروائی جائیں گی۔'

/** Returns a printable HTML document; NEVER sends data to an external URL. */
export function buildStudentTermDiary3Up({students,plan,classLevel,section,schoolName,logoUrl}) {
  const cls=norm(classLevel || plan?.classLevel)
  if(/^(?:class\s*)?(?:eight|8|pre.?9|nine|9)$/i.test(cls))throw new Error('No Second Term student diary for this class')
  if(!cls)throw new Error('Select the class before printing')
  if (plan?.planningType !== 'term') throw new Error('Consolidate the saved weekly plan into Second Term before printing student term diaries')
  if (norm(plan?.classLevel) && normalizedSubject(plan.classLevel).replace(/^class\s+/,'') !== normalizedSubject(cls).replace(/^class\s+/,'')) throw new Error('Saved term plan belongs to a different class')
  if (norm(plan?.section) && norm(section) && normalizedSubject(plan.section) !== normalizedSubject(section)) throw new Error('Saved term plan belongs to a different section')
  const subjects=studentTermDiarySubjects(plan)
  if(!subjects.length)throw new Error('No verified syllabus entered for this class; do not print placeholder chapters')
  if(subjects.length>10)throw new Error('More than ten subjects need editorial review for 3-up printing')
  const roster=arr(students)
  if(!roster.length)throw new Error('SaaS student roster unavailable; printing blocked to prevent unlabeled cards')
  if(roster.length>400)throw new Error('Too many students for one class')
  const studentsIdentity=roster.map(studentTermDiaryIdentity)
  const ids=new Set(studentsIdentity.map(x=>x.id))
  if(ids.size!==studentsIdentity.length)throw new Error('Duplicate student IDs in SaaS roster')
  for(let i=0;i<roster.length;i++) {
    const s=roster[i],c=norm(s.class || s.class_name)
    if(c&&normalizedSubject(c).replace(/^class\s+/,'')!==normalizedSubject(cls).replace(/^class\s+/,'')) throw new Error(`Cross-class student in roster: ${studentsIdentity[i].id}`)
    if(norm(plan?.section) && norm(s.section) && normalizedSubject(plan.section) !== normalizedSubject(s.section)) throw new Error(`Term plan's section does not match the SaaS roster: ${studentsIdentity[i].id}`)
    if(s.is_active===false)throw new Error('Inactive student cannot be printed in active roster')
  }
  const [defaultTint,defaultAccent]=studentTermDiaryColor(cls,section)
  const safeLogo=/^(?:\/[^/]|https?:\/\/)/i.test(norm(logoUrl))?norm(logoUrl):''
  const headLogo=safeLogo?`<img class="crest" src="${e(safeLogo)}" alt="School crest"/>`:''
  const assessmentSubjects=studentTermDiaryAssessmentSubjects(plan,subjects)
  if(assessmentSubjects.length>11)throw new Error('Too many assessment subjects for safe 3-up print; review syllabus grouping')
  const assessmentRows=assessmentSubjects.map((subject,i)=>`<tr><td>${i+1}</td><th>${e(subject)}</th>${assessmentDates(plan,subject).map(date=>`<td>${e(date)}</td>`).join('')}</tr>`).join('')
  const lessons=subjects.map(({subject,lesson})=>`<tr><th>${e(subject)}</th><td class="${hasUrdu(lesson)?'urdu':''}">${e(lesson)}</td></tr>`).join('')
  const pageCount=Math.ceil(studentsIdentity.length/3)
  const pages=[]
  for(let start=0;start<studentsIdentity.length;start+=3) {
    const group=studentsIdentity.slice(start,start+3)
    pages.push(`<div class="sheet">${group.map(s=>{
      const [tint,accent]=studentTermDiaryColor(cls,s.section || section)
      return `<article class="card" style="--tint:${tint};--accent:${accent}"><header>${headLogo}<div class="school"><strong>${e(schoolName||'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL')}</strong><small>SECOND TERM 2026–27 · LEARNING PLAN</small></div></header><div class="class-row"><b>${e(cls.toUpperCase())}</b><span>STUDENT DIARY</span></div><table class="identity"><tr><th>STUDENT</th><td>${e(s.name)}</td></tr><tr><th>FATHER</th><td>${e(s.father)}</td></tr><tr><th>SECTION</th><td>${e(s.section||section)}</td></tr><tr><th>ROLL / GR</th><td>${s.roll?`Roll: ${e(s.roll)}${s.gr?' · ':''}`:''}${s.gr?`${e(s.grLabel)}: ${e(s.gr)}`:(!s.roll?'—':'')}</td></tr></table><table class="lessons"><colgroup><col style="width:24%"><col style="width:76%"></colgroup><thead><tr><th>SUBJECT</th><th>LESSON &amp; CLASSWORK</th></tr></thead><tbody>${lessons}</tbody></table><table class="assess"><thead><tr><th>No.</th><th>Subject</th><th>Assess.1</th><th>Assess.2</th><th>Assess.3</th><th>Assess.4</th><th>Assess.5</th></tr></thead><tbody>${assessmentRows}</tbody></table><div class="note" dir="rtl"><b>اہم نوٹ</b><span>${TABLE_NOTE}</span></div></article>`
    }).join('')}</div>`)
  }
  const css=`@page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:white;color:#111;font-family:'Times New Roman',serif}.sheet{width:297mm;height:210mm;padding:1.7mm 2mm;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.5mm;break-after:page}.sheet:last-child{break-after:auto}.card{min-width:0;height:206.6mm;border:.35mm solid #4d5964;border-top:.65mm solid var(--accent);border-radius:1.1mm;display:flex;flex-flow:column nowrap;overflow:hidden}header{height:19mm;display:flex;gap:2mm;align-items:center;padding:1.2mm 2mm;border-bottom:.25mm solid #374452}.crest{width:15mm;height:15mm;object-fit:contain}.school strong{display:block;font-size:10.4pt;line-height:1.08;color:#18324a}.school small{display:block;margin-top:1mm;font-size:6.9pt;font-weight:bold}.class-row{height:8.5mm;display:flex;align-items:center;justify-content:space-between;padding:0 2mm;background:var(--tint);border-bottom:.3mm solid var(--accent)}.class-row b{font-size:12pt}.class-row span{font-size:7.8pt;font-weight:bold}table{width:100%;table-layout:fixed;border-collapse:collapse}.identity{height:27.5mm}.identity tr{height:6.8mm}.identity th,.identity td{border:.23mm solid #4c5965;text-align:left;padding:.6mm 1.2mm;font-weight:bold;vertical-align:middle}.identity th{width:25%;font-size:7.5pt;background:#f5f8fa}.identity td{font-size:8.9pt;overflow-wrap:anywhere}.lessons{height:110mm;margin-top:1mm}.lessons thead{height:8mm}.lessons thead th{background:var(--tint);font-size:8.5pt;text-align:left}.lessons th,.lessons td{border:.26mm solid #334555;vertical-align:middle;padding:.65mm 1.1mm}.lessons tbody th{background:#f7f9fb;text-align:left;font-size:9pt}.lessons tbody td{font-size:8.5pt;line-height:1.18;overflow-wrap:break-word}.urdu,.note{font-family:'Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif;direction:rtl;text-align:right}.lessons tbody td.urdu{font-size:9pt;line-height:1.85}.assess{height:31mm;margin-top:1.5mm}.assess th,.assess td{border:.25mm solid #364553;text-align:center;padding:.25mm;font-size:7.1pt;line-height:1.1}.assess thead{background:var(--tint)}.assess tbody th{text-align:left;font-size:7.7pt}.assess tr>*:nth-child(1){width:7%}.assess tr>*:nth-child(2){width:27%}.note{height:12mm;margin-top:1mm;border:.2mm solid #56626c;display:flex;align-items:center;gap:1mm;padding:.8mm;font-weight:bold}.note b{min-width:14mm;font-size:9pt}.note span{font-size:8pt;line-height:1.5}@media screen{body{background:#eee}.sheet{margin:4mm auto;background:white;box-shadow:0 0 4mm #999}}@media print{html,body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.sheet{margin:0}}`
  return {html:`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ASSPS ${e(cls)} Student Term Diaries</title><style>${css}</style></head><body>${pages.join('')}</body></html>`,students:studentsIdentity.length,pages:pageCount,subjects:subjects.length,colors:[defaultTint,defaultAccent]}
}

/** Browser preflight: never print a cropped lesson, assessment grid, or Urdu note. */
export function validateStudentTermDiary3UpLayout(doc) {
  const cards = Array.from(doc?.querySelectorAll?.('.sheet .card') || [])
  if (!cards.length) return {ok:false,errors:['No student cards were rendered']}
  const errors=[]
  const bottom = node => node.getBoundingClientRect().bottom
  const top = node => node.getBoundingClientRect().top
  for (const [index, card] of cards.entries()) {
    const items=['header','.class-row','.identity','.lessons','.assess','.note'].map(s=>card.querySelector(s))
    if(items.some(x=>!x)) {errors.push(`Card ${index+1}: required table or section missing`);continue}
    for(let i=0;i<items.length-1;i++) {
      if(bottom(items[i])>top(items[i+1])+2)errors.push(`Card ${index+1}: content overlaps after ${i+1}`)
    }
    if(bottom(items.at(-1))>bottom(card)+2)errors.push(`Card ${index+1}: Urdu note is clipped`)
    if(card.scrollHeight>card.clientHeight+2)errors.push(`Card ${index+1}: page content exceeds portrait card`)
    for(const cell of card.querySelectorAll('td,th')) {
      if(cell.scrollHeight>cell.clientHeight+3) {
        errors.push(`Card ${index+1}: cell text overflows its table row`)
        break
      }
    }
  }
  return {ok:errors.length===0,errors}
}
