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
  const list=topicTags(notes)
  if(!list.length)return ''
  // Match the *teacher's source script*, not merely the subject label.
  // No automatic translation or class/topic rewriting is permitted.
  const sourceHasUrdu=list.some(t=>/[؀-ۿ]/u.test(t))
  const sourceHasLatin=list.some(t=>/[A-Za-z]/.test(t))
  const urdu=sourceHasUrdu?true:sourceHasLatin?false:isUrdu(subject)
  const cw=has(list,/\bclass\s*work\b|\bclasswork\b|کلاس\s*ورک/i)
  const ex=has(list,/\bexercise\b|\bexercises\b|\bcopy\s*work\b|مشق|سوال/i)
  const rev=has(list,/\brevis(?:e|ion)\b|دہرائی/i)
  const read=has(list,/\bread(?:ing)?\b|قرأت|مطالعہ/i)
  const assessment=has(list,/\bassessment\b|\btest\b|جائزہ|اسسمنٹ/i)
  if(urdu){
    const tasks=[
      cw?'دیے گئے اسباق کا کلاس ورک مکمل کریں':'',
      ex?'متعلقہ مشقوں کو درست انداز میں حل کریں':'',
      read?'منتخب متن کی پڑھائی کریں':'',
      rev?'مقررہ کام کی دہرائی کریں':'',
    ].filter(Boolean)
    if(!tasks.length)tasks.push('استاد کے دیے ہوئے اسباق کا کام مکمل کریں')
    return tasks.slice(0,2).join('؛ ')+'۔'+(assessment?' مقررہ جائزے کی تیاری کریں۔':'')
  }
  const tasks=[
    cw?'Complete the assigned classwork accurately':'',
    ex?'finish the prescribed exercises carefully':'',
    read?'read the assigned passages attentively':'',
    rev?'revise the covered work':''
  ].filter(Boolean)
  if(!tasks.length)tasks.push('Complete the teacher-assigned syllabus work')
  const sentence=tasks.slice(0,2).join('; ')
  return sentence[0].toUpperCase()+sentence.slice(1)+'.'+(assessment?' Prepare for the recorded assessment.':'')
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
