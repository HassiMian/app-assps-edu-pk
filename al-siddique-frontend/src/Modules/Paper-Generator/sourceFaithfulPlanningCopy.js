// Short instruction rewrite ONLY; never change class, page, unit/chapter titles,
// numbers, dates, original source IDs or assessment dates. No synthetic syllabus.
const isUrdu = (s='') => /Urdu|Islamiyat|Islamiat|Quran|Pakistan Studies|اردو|اسلامیات|قرآن|مطالعہ پاکستان/i.test(String(s))
const trim = text => String(text ?? '').replace(/[ \t]+/g,' ').trim()
const has = (all,rx) => all.some(t=>rx.test(String(t)))
const topicTags = notes=>notes.flatMap(s=>String(s).split(/\r?\n/)).map(trim).filter(Boolean)

export function improveWeeklyStatement(raw,subject=''){
  const x=trim(raw)
  if (!x) return ''
  // Rewrite ONLY a standalone generic work instruction, never a sentence
  // carrying a topic, page, chapter, exercise number or date.
  if (/^(?:complete\s*(?:and|&)\s*classwork|complete\s+classwork|classwork|c\.?\s*w\.?)\.?$/i.test(x)){
    return isUrdu(subject)
      ? 'متعلقہ کلاس ورک کو صاف اور درست انداز میں مکمل کریں۔'
      : 'Complete the assigned classwork neatly and accurately.'
  }
  if (/^(?:learn\s*(?:and|&)\s*complete\s*classwork|learn\s*(?:and|&)\s*classwork)\.?$/i.test(x)){
    return 'Learn the assigned work and complete the classwork carefully.'
  }
  // If a teacher supplied meaningful content, preserve it in full and exact
  // order rather than truncate at 80 characters or hallucinate a chapter.
  return x
}

export function summarizeTermFromOriginalNotes(notes,subject=''){
  const lines=topicTags(notes)
  if(!lines.length)return ''
  // Only factual, explicitly supplied teacher activities may be synthesized.
  // The existence of pages, dates, a subject or a Unit title is NOT evidence
  // that reading/homework/exercises were assigned.
  const sourceHasUrdu=lines.some(t=>/[\u0600-\u06FF]/u.test(t))
  const sourceHasLatin=lines.some(t=>/[A-Za-z]/.test(t))
  const urdu=sourceHasUrdu?true:sourceHasLatin?false:isUrdu(subject)
  const normalized=lines.map(t=>t.replace(/^(?:pages?|pg|صفحہ(?: نمبر)?)\s*\d+\s*(?:[-–—]|to|تا)\s*\d+\s*[-–—:]?\s*/iu,''))
  // Match only action-bearing lines; strip factual pages/unit headings from
  // the professional sentence while preserving them in provenance fields.
  const actions=normalized.filter(t=>/\b(?:read|reading|class\s*work|classwork|cw|home\s*work|homework|hw|exercise|exercises|copy\s*work|task\s*work|taskwork|revise|revision|learn|memorize|test|assessment|complete|solve|write)\b|پڑھ|قرأت|کلاس\s*ورک|گھر\s*کا\s*کام|ہوم\s*ورک|مشق|سوال|دہرائی|جائزہ|اسسمنٹ|ٹاسک|یاد|لکھ|مکمل/iu.test(t))
  if(!actions.length)return ''
  const present=(re)=>actions.some(t=>re.test(t))
  const reading=present(/\b(?:read|reading)\b|پڑھ|قرأت/i)
  const classwork=present(/\b(?:class\s*work|classwork|cw)\b|کلاس\s*ورک/i)
  const homework=present(/\b(?:home\s*work|homework|hw)\b|گھر\s*کا\s*کام|ہوم\s*ورک/i)
  const exercises=present(/\b(?:exercises?|solve)\b|مشق|سوال/i)
  const copy=present(/\b(?:copy\s*work|write|writing)\b|لکھ|تحریر/i)
  const task=present(/\b(?:task\s*work|taskwork|tasks?)\b|ٹاسک/i)
  const revision=present(/\b(?:revise|revision)\b|دہرائی/i)
  const learning=present(/\b(?:learn|memorize)\b|یاد/i)
  const assessment=present(/\b(?:test|assessment)\b|جائزہ|اسسمنٹ/i)
  if(urdu){
    const items=[
      reading?'مقررہ متن پڑھیں':'',
      classwork?'متعلقہ کلاس ورک مکمل کریں':'',
      homework?'دیے گئے ہوم ورک کو مکمل کریں':'',
      exercises?'اصل مشقیں حل کریں':'',
      copy?'مقررہ تحریری کام مکمل کریں':'',
      task?'دیے گئے ٹاسک مکمل کریں':'',
      revision?'پڑھے ہوئے کام کی دہرائی کریں':'',
      learning?'مقررہ کام یاد کریں':''
    ].filter(Boolean)
    const parts=items.slice(0,4)
    if(!parts.length)return assessment?'اصل شیڈول کے مطابق جائزے کی تیاری کریں۔':''
    return parts.join('؛ ')+'۔'+(assessment?' اصل شیڈول کے مطابق جائزے کی تیاری کریں۔':'')
  }
  const items=[
    reading?'read the assigned text':'',
    classwork?'complete the classwork':'',
    homework?'complete the given homework':'',
    exercises?'solve the specified exercises':'',
    copy?'complete the written work':'',
    task?'finish the assigned tasks':'',
    revision?'revise the covered work':'',
    learning?'learn the prescribed work':''
  ].filter(Boolean)
  const parts=items.slice(0,4)
  if(!parts.length)return assessment?'Prepare for the original recorded assessment.':''
  const sentence=parts.join('; ')
  return sentence[0].toUpperCase()+sentence.slice(1)+'.'+
    (assessment?' Prepare for the original recorded assessment.':'')
}

// Explicit teacher-given chapter/unit labels and page spans remain in the
// model's original-source fields, not in this generated pedagogic sentence.

// Verbatim teacher-given numbered chapter/unit/bab labels only. No attempt
// to guess title, convert topic into chapter, add missing names or reorder.
export function explicitTeacherChapterLabels(notes){
  const values=topicTags(notes).map(t=>t.replace(
    /^(?:pages?|pg|صفحہ(?: نمبر)?)\s*\d+\s*(?:[-–—]|to|تا)\s*\d+\s*[-–—:]\s*/iu,''))
  const headings=values.filter(t=>
    /^(?:chapter|chap\.?|unit|باب|یونٹ)\s*(?:no\.?\s*)?(?:\d+|[٠-٩۰-۹]+|[:：])/iu.test(t))
  return [...new Set(headings)]
}
