// Pure marks-entry contract. No production writes or fake examination records.
const CLASS_ORDINALS = {
  '1':'One','2':'Two','3':'Three','4':'Four','5':'Five',
  '6':'Six','7':'Seven','8':'Eight','9':'Nine','10':'Ten',
}
export const normalizeMarksClass = value => {
  const raw = String(value ?? '').trim().replace(/^class\s+/i,'').replace(/\s+/g,' ')
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
}

export const OFFICIAL_FIRST_TERM_CLASSES = [
 'Starter','Mover','Flyer','One','Two','Three','Four','Five','Six','Seven','Eight'
]
export const marksEntryClasses = (academicClasses=[], exams=[]) => {
 const configured=uniqueMarksClasses(academicClasses,exams)
 return configured.length ? configured :
   exams.some(ex=>/\bfirst\s+term\b/i.test(String(ex.name||''))) ? OFFICIAL_FIRST_TERM_CLASSES : []
}

export const filterMarksStudents = (rows, className) =>
  (Array.isArray(rows)?rows:[]).filter(row=>equivalentMarksClass(row.class,className))

export const validateMarksBatch = ({exam, students, subject, marks, totalMarks, passMarks}) => {
  if (!exam?.id) return {error:'Select the saved First Term Exam record before entering marks.',rows:[]}
  if (!String(subject||'').trim()) return {error:'Select a subject before saving.',rows:[]}
  const total=Number(totalMarks), pass=Number(passMarks)
  if (String(totalMarks).trim()==='' || !Number.isFinite(total) || total<=0 ||
      String(passMarks).trim()==='' || !Number.isFinite(pass) || pass<0 || pass>total)
    return {error:'Enter valid total and passing marks before saving.',rows:[]}
  const rows=[]
  for(const student of students||[]){
    const entered=marks?.[student.id]
    if(entered===undefined || entered===null || String(entered).trim()==='')continue
    const value=Number(entered)
    if(!Number.isFinite(value) || value<0 || value>total){
      return {error:`Invalid marks for ${student.name || 'student'}: enter 0 to ${total}.`,rows:[]}
    }
    rows.push({exam_id:Number(exam.id),student_id:Number(student.id),
      subject:String(subject).trim(),marks_obtained:value,total_marks:total,pass_marks:pass})
  }
  if(!rows.length)return {error:'Enter at least one student mark before saving. Blank marks are not zero.',rows:[]}
  return {error:'',rows}
}
