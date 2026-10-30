// Pure marks-entry contract. No production writes or fake examination records.
import { OFFICIAL_FIRST_TERM_SUBJECTS_2026 } from './officialFirstTerm2026Subjects.js'
import { compareSchoolClasses } from '../../services/schoolClassOrder.js'
const CLASS_ORDINALS = {
  '1':'One','2':'Two','3':'Three','4':'Four','5':'Five',
  '6':'Six','7':'Seven','8':'Eight','9':'Nine','10':'Ten',
}
export const normalizeMarksClass = value => {
  const raw = String(value ?? '').trim().replace(/^class\s+/i,'').replace(/[_-]/g,' ').replace(/\s+/g,' ')
  if (/^pre nine$/i.test(raw)) return 'Pre Nine'
  return CLASS_ORDINALS[raw] || raw
}
export const equivalentMarksClass = (a,b) =>
  normalizeMarksClass(a).toLocaleLowerCase('en') === normalizeMarksClass(b).toLocaleLowerCase('en')

export const normalizeMarksExam = exam => ({
  ...exam,
  type: exam?.type === 'TE' ? 'Term Exam' : exam?.type === 'AS' ? 'Assessment' : String(exam?.type || '').trim(),
  class: /^all classes$/i.test(String(exam?.class || '')) ? 'All Classes' : normalizeMarksClass(exam?.class),
  session: String(exam?.session || '').trim(),
})
export const matchesMarksExam = (exam, type, className) =>
  (!type || exam.type === type) &&
  (!className || /^all classes$/i.test(exam.class) || equivalentMarksClass(exam.class,className))

export const pickMarksExam = (exams, type, className, preferredId='') => {
  const possible = exams.filter(e=>matchesMarksExam(e,type,className))
  const prior = possible.find(e=>String(e.id) === String(preferredId))
  if (prior) return prior
  // Favor the actual saved First Term record over an unrelated assessment.
  return possible.find(e=>/\bfirst\s+term\b/i.test(e.name || '')) || possible[0] || null
}

export const uniqueMarksClasses = (academicClasses=[], exams=[]) => {
  const seen=new Set()
  return [...academicClasses,...exams.map(e=>e.class)].map(normalizeMarksClass)
    .filter(name=>name && !/^all classes$/i.test(name))
    .filter(name=>{const key=name.toLocaleLowerCase('en');if(seen.has(key))return false;seen.add(key);return true})
    .sort(compareSchoolClasses)
}

export const OFFICIAL_FIRST_TERM_CLASSES = [
 'Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight'
]
export const marksEntryClasses = (academicClasses=[], exams=[]) => {
 // Even when academic setup is only partially configured, do not hide the
 // already-approved Starter–Eight First Term paper classes. Other enrolled
 // classes remain visible only when genuinely configured, never fabricated.
 const isFirstTerm=exams.some(ex=>/\bfirst\s+term\b/i.test(String(ex.name||'')))
 return uniqueMarksClasses([
   ...academicClasses, ...(isFirstTerm ? OFFICIAL_FIRST_TERM_CLASSES : [])
 ], exams)
}

export const marksSubjectsForClass = ({exam, className, academicSubjects=[]}) => {
  const name = String(exam?.name || '').trim().replace(/\s+/g,' ').toLowerCase()
  const session = String(exam?.session || '').trim()
  const type = String(exam?.type || '')
  const officialTerm = name === 'first term exam' && session === '2026-2027' &&
    (type === 'Term Exam' || type === 'TE')
  // An explicit empty offering list from the signed school API means NO subject
  // configured. Do not invent a hardcoded subject or silently use an unrelated
  // academic setup; keep the section records intact in exam.subject_offerings.
  if (Array.isArray(exam?.subject_offerings)) {
    const seen = new Set()
    const subjects = exam.subject_offerings
      .filter(row => equivalentMarksClass(row.class_name,className))
      .map(row => String(row.subject || '').trim())
      .filter(subject => {
        const key=subject.toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
    // Preserve legacy assessments that have no exam_subjects records at all:
    // only the official First Term exam's explicit missing class mapping is a
    // hard block. Do not erase configured ordinary assessment subjects.
    if (subjects.length || officialTerm) return subjects
  }
  if (officialTerm) {
    const official = OFFICIAL_FIRST_TERM_SUBJECTS_2026[normalizeMarksClass(className)]
    if (Array.isArray(official) && official.length) return official
  }
  return Array.isArray(academicSubjects) ? academicSubjects : []
}

// Legacy admissions have used written, ordinal and prefixed class labels.
 // Query each exact class value through the authenticated API; NEVER request
 // the entire school roster merely to work around a class-label mismatch.
const WRITTEN_TO_NUMERIC = Object.fromEntries(
  Object.entries(CLASS_ORDINALS).map(([number,word])=>[word,number])
)
export const marksClassQueryAliases = className => {
  const canonical = normalizeMarksClass(className)
  if (!canonical) return []
  const numeric = WRITTEN_TO_NUMERIC[canonical]
  return [...new Set([
    canonical, `Class ${canonical}`,
    ...(numeric ? [numeric,`Class ${numeric}`] : []),
  ])]
}
// New Assessments must not include struck-off students in the marks entry
// roster. Historical Term Exam records are intentionally not narrowed here:
// authorized users may still need to inspect a former student's saved result.
export const marksRosterQueryParams = (classAlias, exam) => ({
  class: classAlias,
  ...(['AS','Assessment'].includes(exam?.type) ? {active:'true'} : {}),
})

export const mergeMarksRoster = (responses, className) => {
  const seen = new Set()
  const result = []
  for (const rows of responses || []) {
    for (const student of filterMarksStudents(rows,className)) {
      const id = Number(student?.id)
      if (!Number.isSafeInteger(id) || id<=0 || seen.has(id)) continue
      seen.add(id)
      result.push(student)
    }
  }
  return result
}

export const filterMarksStudents = (rows, className) =>
  (Array.isArray(rows)?rows:[]).filter(row=>equivalentMarksClass(row.class,className))

// Reject JavaScript Number() coercions (hex, exponent, bool, arrays), while
// accepting genuine 0 and decimal fractions. This mirrors server-side
// result-state parsing without broadening accepted historical marks.
const parseEnteredDecimal = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export const validateMarksBatch = ({exam, selectedClass, students, subject, marks, totalMarks, passMarks}) => {
  if (!Number.isSafeInteger(Number(exam?.id)) || Number(exam?.id) <= 0)
    return {error:'Select a valid saved exam record before entering marks.',rows:[]}
  if (selectedClass && !matchesMarksExam(exam,exam.type,selectedClass))
    return {error:'Selected exam does not belong to the chosen class. Refresh the examination list.',rows:[]}
  if (!String(subject||'').trim()) return {error:'Select a subject before saving.',rows:[]}
  const total=parseEnteredDecimal(totalMarks), pass=parseEnteredDecimal(passMarks)
  if (total===null || total<=0 || pass===null || pass<0 || pass>total)
    return {error:'Enter valid total and passing marks before saving.',rows:[]}
  const rows=[]
  for(const student of students||[]){
    const entered=marks?.[student.id]
    if(entered===undefined || entered===null || (typeof entered === 'string' && entered.trim()===''))continue
    if (!Number.isSafeInteger(Number(student.id)) || Number(student.id) <= 0)
      return {error:'Student record has an invalid ID. Refresh the roster before saving.',rows:[]}
    if (selectedClass && !equivalentMarksClass(student.class,selectedClass))
      return {error:'Student class differs from the selected class. Refresh the roster before saving.',rows:[]}
    const value=parseEnteredDecimal(entered)
    if(value===null || value<0 || value>total){
      return {error:`Invalid marks for ${student.name || 'student'}: enter 0 to ${total}.`,rows:[]}
    }
    rows.push({exam_id:Number(exam.id),student_id:Number(student.id),
      subject:String(subject).trim(),marks_obtained:value,total_marks:total,pass_marks:pass})
  }
  if(!rows.length)return {error:'Enter at least one student mark before saving. Blank marks are not zero.',rows:[]}
  return {error:'',rows}
}
