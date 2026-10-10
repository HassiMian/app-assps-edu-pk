import { inferExamTermKey, resolveResultPrintOptions } from './resultPrintPlanning'
import { RESULT_TEMPLATES as LEGACY_TEMPLATES, DEFAULT_RESULT_OPTIONS, buildResultCardData as legacyBuilder } from './resultCardTemplates'

export { DEFAULT_RESULT_OPTIONS }
export const RESULT_TEMPLATES = [LEGACY_TEMPLATES[0],
 {id:'signature-editorial',label:'Flagship 01',name:'Signature Editorial'},
 {id:'swiss-grid',label:'Flagship 02',name:'Swiss Grid'},
 {id:'data-atelier',label:'Flagship 03',name:'Data Atelier'},
 {id:'regal-linework',label:'Signature 04',name:'Regal Linework'},
 {id:'young-scholars',label:'Signature 05',name:'Young Scholars'},
 {id:'academic-heritage',label:'Signature 06',name:'Academic Heritage'},
 {id:'airframe-geometry',label:'Signature 07',name:'Airframe Geometry'},
 {id:'corporate-ledger',label:'Signature 08',name:'Corporate Ledger'},
 {id:'examination-dossier',label:'Signature 09',name:'Examination Dossier'},
 ...LEGACY_TEMPLATES.slice(1)]
export const PREMIUM_IDS = new Set(['signature-editorial','swiss-grid','data-atelier','regal-linework','young-scholars','academic-heritage','airframe-geometry','corporate-ledger','examination-dossier'])

export const termFields = [
 ['includeAssessment', 'assessmentMarks', 'Assessment'],
 ['includeFirstTerm', 'firstTermMarks', 'First Term'],
 ['includeSecondTerm', 'secondTermMarks', 'Second Term'],
 ['includeThirdTerm', 'thirdTermMarks', 'Third Term'],
 ['includeFinalTerm', 'finalTermMarks', 'Final Term'],
]

export function gradeLabel(pct, bands = []) {
 const value = Math.max(0, Math.min(100, Number(pct) || 0))
 const match = (Array.isArray(bands) ? bands : []).find(row => value >= Number(row.from) && value <= Number(row.to))
 return match?.label || ''
}

function currentTermField(exam = {}) {
 const key = inferExamTermKey(exam)
 return ({includeAssessment:'assessmentMarks',includeFirstTerm:'firstTermMarks',includeSecondTerm:'secondTermMarks',includeThirdTerm:'thirdTermMarks',includeFinalTerm:'finalTermMarks'})[key] || 'finalTermMarks'
}

function numberOrNull(value) {
 if (value === undefined || value === null || value === '') return null
 const n = Number(value)
 return Number.isFinite(n) ? n : null
}

function buildPremiumResultCardData({ student, exam, studentMarks, options, school }) {
 const opts = resolveResultPrintOptions({ ...DEFAULT_RESULT_OPTIONS, ...options, autoTermColumns: options?.autoTermColumns !== false, includeCharts:true, orientation:'portrait' }, exam)
 const activeTerms = termFields.filter(([key]) => opts[key])
 const slot = currentTermField(exam)
 const subjects = (studentMarks || []).map((row) => {
 const rawTotal = row.total_marks ?? exam?.total_marks
 const perTermTotal = rawTotal === null || rawTotal === undefined || rawTotal === '' || !Number.isFinite(Number(rawTotal)) || Number(rawTotal) <= 0 ? null : Number(rawTotal)
 const subject = {
 subjectName: row.subjectName || row.subject || '—',
 assessmentMarks: numberOrNull(row.assessmentMarks ?? row.assessment_marks),
 firstTermMarks: numberOrNull(row.firstTermMarks ?? row.first_term_marks),
 secondTermMarks: numberOrNull(row.secondTermMarks ?? row.second_term_marks),
 thirdTermMarks: numberOrNull(row.thirdTermMarks ?? row.third_term_marks),
 finalTermMarks: numberOrNull(row.finalTermMarks ?? row.final_term_marks),
 remarks: row.remarks || '',
 perTermTotal,
 }
 // Fail closed: legacy or partial payloads must never render invalid marks as a grade.
 for (const [, field] of termFields) {
  if (subject[field] !== null && (perTermTotal === null || subject[field] < 0 || subject[field] > perTermTotal)) subject[field] = null
 }
 const currentRaw = numberOrNull(row.marks_obtained ?? row.obtainedMarks)
 const storedCurrentTerm = perTermTotal !== null && currentRaw !== null && currentRaw >= 0 && currentRaw <= perTermTotal ? currentRaw : null
 if (subject[slot] === null && activeTerms.some(([, field]) => field === slot)) subject[slot] = storedCurrentTerm
 const selectedMarks = activeTerms.map(([, field]) => subject[field]).filter(v => v !== null)
 const hasMarks = selectedMarks.length > 0 || (activeTerms.length === 0 && storedCurrentTerm !== null)
 const isComplete = perTermTotal !== null && (activeTerms.length ? selectedMarks.length === activeTerms.length : storedCurrentTerm !== null)
 const obtainedMarks = selectedMarks.length ? selectedMarks.reduce((sum, value) => sum + value, 0) : (activeTerms.length === 0 ? (storedCurrentTerm ?? 0) : 0)
 const totalMarks = perTermTotal === null ? 0 : ((activeTerms.length || 1) * perTermTotal)
 const rawPercentage = isComplete && totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : null
 const percentage = rawPercentage === null ? null : Math.round(rawPercentage * 10) / 10
 return {
 ...subject,
 totalMarks,
 obtainedMarks: hasMarks ? obtainedMarks : null,
 hasMarks,
 isComplete,
 pending: !isComplete,
 percentage,
 grade: rawPercentage === null ? '—' : (gradeLabel(rawPercentage, opts.gradeBands) || '—'),
 remarks: row.remarks || (!isComplete ? 'Pending marks' : ''),
 }
 })

 const scoredSubjects = subjects.filter(row => row.isComplete)
 const pendingCount = subjects.filter(row => row.pending).length
 const totalMarks = scoredSubjects.reduce((sum, row) => sum + row.totalMarks, 0)
 const obtainedMarks = scoredSubjects.reduce((sum, row) => sum + row.obtainedMarks, 0)
 const rawPercentage = pendingCount === 0 && totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : null
 const percentage = rawPercentage === null ? null : Math.round(rawPercentage * 10) / 10
 const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

 return {
 student: {
 name: student?.name || '—',
 fatherName: student?.fatherName || student?.father_name || '—',
 rollNo: student?.rollNo || student?.roll_number || student?.gr_number || student?.admissionNo || '—',
 className: student?.className || student?.class || (/^all\s+classes$/i.test(String(exam?.class || '')) ? '—' : (exam?.class || '—')),
 section: student?.section || '-',
 photo: student?.photo || student?.image || student?.profile_photo || student?.profileImage || student?.profile_image || student?.photo_url || student?.image_url || '',
 admissionNo: student?.admissionNo || student?.gr_number || '',
 },
 school: {
 name: school?.name || '—',
 logo: school?.logo || '',
 slogan: school?.slogan || (school?.showUrduHeader === false ? '' : school?.urdu) || '',
 address: school?.address || '',
 phone: school?.phone || '',
 email: school?.email || '',
 principalSignature: school?.principalSignature || '',
 },
 result: {
 session: exam?.session || exam?.academic_year || school?.academicYear || school?.examYear || '—',
 term: exam?.name || '—',
 classTeacher: exam?.classTeacher || '—',
 issueDate: today,
 subjects,
 attendance: {
 totalDays: exam?.totalSchoolDays ?? '—',
 attended: exam?.attended ?? '—',
 absent: exam?.absent ?? '—',
 },
 teacherRemarks: options?.teacherRemarksEdited === true ? String(options.teacherRemarks ?? '') : String(exam?.teacherRemarks ?? exam?.teacher_remarks ?? options?.teacherRemarks ?? DEFAULT_RESULT_OPTIONS.teacherRemarks),
 principalRemarks: exam?.principalRemarks || '',
 totalMarks,
 obtainedMarks,
 pendingCount,
 percentage,
 grade: rawPercentage === null ? '—' : (gradeLabel(rawPercentage, opts.gradeBands) || '—'),
 },
 options: opts,
 }
}

export function buildResultCardData(args) {
 return PREMIUM_IDS.has(args.options?.template) ? buildPremiumResultCardData(args) : legacyBuilder(args)
}
