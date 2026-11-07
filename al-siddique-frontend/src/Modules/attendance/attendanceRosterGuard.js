// Preserve school grade identity in attendance; Pre Nine is not Nine.
export function attendanceCanonicalClass(value) {
 const text=String(value??'').normalize('NFKC').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ')
 if(text==='9') return 'nine'
 if(text==='pre 9'||text==='pre9') return 'pre nine'
 return text
}
const sectionKey=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ')
export function attendanceStudentMatchesScope(student, className, section) {
 if(!student||typeof student!=='object') return false
 const klass=student.class??student.class_name
 const actualSection=student.section??student.section_name
 const wanted=attendanceCanonicalClass(className)
 const sensitive=wanted==='pre nine'||wanted==='nine'
 if(sensitive&&(!String(klass??'').trim()||!String(actualSection??'').trim())) return false
 if(klass!=null&&String(klass).trim()&&attendanceCanonicalClass(klass)!==wanted) return false
 if(actualSection!=null&&String(actualSection).trim()&&sectionKey(actualSection)!==sectionKey(section)) return false
 return true
}
export function reconcileAttendanceRoster(studentRows,markRows,className,section) {
 if(!Array.isArray(studentRows)||!Array.isArray(markRows)) throw Error('ATTENDANCE_RESPONSE_INVALID')
 if(!className||!section) throw Error('ATTENDANCE_SCOPE_REQUIRED')
 const roster=new Set(),students=[]
 for(const student of studentRows){
  if(!attendanceStudentMatchesScope(student,className,section)) throw Error('ATTENDANCE_ROSTER_SCOPE_MISMATCH')
  const id=Number(student.id)
  if(!Number.isSafeInteger(id)||id<=0||roster.has(id)) throw Error('ATTENDANCE_ROSTER_IDENTIFIER_INVALID')
  roster.add(id);students.push(student)
 }
 const marks={}
 const allowedStatuses=new Set(['present','absent','late','leave','half-day','half_day'])
 for(const row of markRows){
  const id=Number(row?.student_id??row?.id)
  if(!Number.isSafeInteger(id)||!roster.has(id)) continue
  const status=String(row?.status??'').toLowerCase().trim()
  if(!allowedStatuses.has(status)) continue
  if(row?.class!==undefined&&attendanceCanonicalClass(row.class)!==attendanceCanonicalClass(className)) continue
  if(row?.section!==undefined&&sectionKey(row.section)!==sectionKey(section)) continue
  marks[id]=status
 }
 return {students,marks}
}
