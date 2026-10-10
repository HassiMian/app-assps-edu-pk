// Only student-linked exam result rows can supply a student's class/section.
// The exam filter "All Classes" is never a student's enrolled class.
const filled = (...values) => values.find(v => v !== null && v !== undefined && String(v).trim() !== '') || ''
export function buildResultStudents(rows = []) {
 const students = new Map()
 for (const row of Array.isArray(rows) ? rows : []) {
  if (row?.student_id === null || row?.student_id === undefined) continue
  const id = String(row.student_id)
  const studentClass = filled(row.student_class,row.class,row.class_name,row.className)
  const safeClass = /^all\s+classes$/i.test(String(studentClass).trim()) ? '' : studentClass
  const section = filled(row.student_section,row.section)
  let student = students.get(id)
  if (!student) {
   student = {
    id:row.student_id,
    name:filled(row.name,row.student_name,row.studentName) || `Student #${id}`,
    gr_number:filled(row.gr_number,row.gr),
    roll_number:filled(row.roll_number,row.rollNo),
    father_name:filled(row.father_name,row.fatherName),
    className:safeClass, section,
    photo:filled(row.photo), subjectsCount:0,
   }
   students.set(id, student)
  } else {
   // Some subject rows may omit metadata while later rows have it.
   if (!student.className && safeClass) student.className=safeClass
   if (!student.section && section) student.section=section
   if (!student.roll_number) student.roll_number=filled(row.roll_number,row.rollNo)
   if (!student.father_name) student.father_name=filled(row.father_name,row.fatherName)
  }
  student.subjectsCount++
 }
 return [...students.values()]
}
