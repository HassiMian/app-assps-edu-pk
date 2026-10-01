import { isOfficialFirstTermExam, requiredFirstTermPassMarks } from './firstTermMarksPolicy.js'

const NUMBER_NAMES = ['','one','two','three','four','five','six','seven','eight','nine']
export const subjectKey = value => String(value || '').trim().toLowerCase().replace(/\s+/g,' ')
export function classKey(value) {
 const raw = subjectKey(value).replace(/^class\s+/,'')
 return /^\d+$/.test(raw) ? NUMBER_NAMES[Number(raw)] || raw : raw
}
const sectionKey = value => subjectKey(value)

export function gradeFromPercentage(pct) {
 if (pct >= 90) return 'A+'
 if (pct >= 80) return 'A'
 if (pct >= 70) return 'B'
 if (pct >= 60) return 'C'
 if (pct >= 50) return 'D'
 return 'E'
}

// No assumed 100-mark subject, no defaulting blank marks to zero.
// Scheduled subject totals/pass thresholds are the authoritative scheme.
export function evaluateFirstTermStudent({ exam, student, rows = [], scheduledSubjects }) {
 const official = isOfficialFirstTermExam(exam)
 if (!official) {
   return { complete:rows.length > 0, status:rows.length ? 'Legacy exam' : 'Incomplete',
     missing:[], expectedCount:rows.length, enteredCount:rows.length, rows }
 }
 if (!Array.isArray(scheduledSubjects)) {
   return { complete:false, status:'Schedule unavailable', missing:[], expectedCount:0, enteredCount:0, rows:[] }
 }
 const expected = scheduledSubjects.filter(s => classKey(s.class_name) === classKey(student?.class || student?.className)
   && sectionKey(s.section) === sectionKey(student?.section))
 if (!expected.length) {
   return { complete:false, status:'Schedule unavailable', missing:[], expectedCount:0, enteredCount:0, rows:[] }
 }
 const missing = [], resolved = []
 for (const scheduled of expected) {
   const key = subjectKey(scheduled.subject)
   const matched = rows.filter(r => subjectKey(r.subject) === key)
   const row = matched.length === 1 ? matched[0] : null
   const total = Number(scheduled.total_marks)
   const passing = Number(scheduled.pass_marks)
   const configured = scheduled.total_marks != null && scheduled.pass_marks != null
     && Number.isFinite(total) && Number.isFinite(passing) && total > 0 && passing >= 0 && passing <= total
   const valid = row && row.marks_obtained !== null && row.marks_obtained !== undefined
     && row.marks_obtained !== '' && Number.isFinite(Number(row.marks_obtained))
     && Number(row.marks_obtained) >= 0 && Number(row.marks_obtained) <= total
     && Number(row.total_marks) === total && configured
   if (!valid) {
     missing.push(scheduled.subject)
     continue
   }
   const obtained = Number(row.marks_obtained)
   const percentage = (obtained / total) * 100
   const passed = obtained >= passing
   const selectedPercentage = scheduled.pass_percentage == null ? null : Number(scheduled.pass_percentage)
   // When percentage is present it must match the stored threshold; otherwise block publication.
   if (selectedPercentage !== null
       && requiredFirstTermPassMarks(total, selectedPercentage) !== passing) {
     missing.push(scheduled.subject)
     continue
   }
   resolved.push({
     ...row, subject:scheduled.subject, total_marks:total, pass_marks:passing,
     pass_percentage:selectedPercentage, grade:passed ? gradeFromPercentage(percentage) : 'F',
     subject_status:passed ? 'Pass' : 'Fail',
   })
 }
 const complete = missing.length === 0 && resolved.length === expected.length
 return {
   complete, status:complete ? (resolved.every(r=>r.subject_status==='Pass') ? 'Pass' : 'Fail') : 'Incomplete',
   missing, expectedCount:expected.length, enteredCount:resolved.length,
   rows:resolved,
 }
}
