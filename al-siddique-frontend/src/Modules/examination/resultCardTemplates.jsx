import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePaperStore } from '../Paper-Generator/usePaperStore'

export const RESULT_TEMPLATES = [
 { id: 'reference', label: 'Template 1', name: 'Reference Clone' },
 { id: 'elite-navy', label: 'Template 2', name: 'Elite Navy Silver' },
 { id: 'green-academic', label: 'Template 3', name: 'Green Academic' },
 { id: 'minimal-modern', label: 'Template 4', name: 'Minimal Modern' },
 { id: 'junior-colorful', label: 'Template 5', name: 'Colorful Junior' },
 { id: 'board-pattern', label: 'Template 6', name: 'Board Pattern' },
 { id: 'performance-analytics', label: 'Template 7', name: 'Performance Analytics' },
 { id: 'modern-hexagon', label: 'Template 8', name: 'Modern Hexagon' },
 { id: 'minimal-corporate', label: 'Template 9', name: 'Minimal Corporate' },
 { id: 'playful-primary', label: 'Template 10', name: 'Playful Primary' },
]

export const DEFAULT_RESULT_OPTIONS = {
 template: 'reference',
 orientation: 'portrait',
 includeAssessment: true,
 includeFirstTerm: true,
 includeSecondTerm: true,
 includeThirdTerm: true,
 includeFinalTerm: true,
 includeAttendance: true,
 includeTeacherRemarks: true,
 teacherRemarks: 'With consistent effort and guided practice, the student can continue improving academic performance.',
 includeCharts: true,
}

const termFields = [
 ['includeAssessment', 'assessmentMarks', 'Assessment'],
 ['includeFirstTerm', 'firstTermMarks', 'First Term'],
 ['includeSecondTerm', 'secondTermMarks', 'Second Term'],
 ['includeThirdTerm', 'thirdTermMarks', 'Third Term'],
 ['includeFinalTerm', 'finalTermMarks', 'Final Term'],
]

export function gradeLabel(pct) {
 if (pct >= 90) return 'A+'
 if (pct >= 80) return 'A'
 if (pct >= 70) return 'B'
 if (pct >= 60) return 'C'
 if (pct >= 50) return 'D'
 return 'F'
}

function currentTermField(exam = {}) {
 const text = `${exam.name || ''} ${exam.type || ''}`.toLowerCase()
 if (text.includes('assessment') || text.includes('monthly') || text.includes('quiz')) return 'assessmentMarks'
 if (text.includes('first') || text.includes('1st')) return 'firstTermMarks'
 if (text.includes('second') || text.includes('2nd')) return 'secondTermMarks'
 if (text.includes('third') || text.includes('3rd')) return 'thirdTermMarks'
 return 'finalTermMarks'
}

function numberOrNull(value) {
 if (value === undefined || value === null || value === '') return null
 const n = Number(value)
 return Number.isFinite(n) ? n : null
}

function SchoolNameLines({ name }) {
 const clean = String(name || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL').toUpperCase().replace(/\s+/g, ' ').trim()
 if (clean.includes('SCHOLARS PUBLIC SCHOOL')) {
 return <>
 <span className="rc-brand-main">AL SIDDIQUE</span>
 <span className="rc-brand-sub">SCHOLARS PUBLIC SCHOOL</span>
 </>
 }
 return <span className="rc-brand-main">{clean}</span>
}

export function buildResultCardData({ student, exam, studentMarks, options, school }) {
 const opts = { ...DEFAULT_RESULT_OPTIONS, ...options }
 const activeTerms = termFields.filter(([key]) => opts[key])
 const slot = currentTermField(exam)
 const subjects = (studentMarks || []).map((row) => {
 const perTermTotal = Number(row.total_marks || exam?.total_marks || 100)
 const subject = {
 subjectName: row.subjectName || row.subject || 'Subject',
 assessmentMarks: numberOrNull(row.assessmentMarks | row.assessment_marks),
 firstTermMarks: numberOrNull(row.firstTermMarks | row.first_term_marks),
 secondTermMarks: numberOrNull(row.secondTermMarks | row.second_term_marks),
 thirdTermMarks: numberOrNull(row.thirdTermMarks | row.third_term_marks),
 finalTermMarks: numberOrNull(row.finalTermMarks | row.final_term_marks),
 remarks: row.remarks || '',
 perTermTotal,
 }
 if (subject[slot] === null) subject[slot] = numberOrNull(row.marks_obtained | row.obtainedMarks)
 const selectedMarks = activeTerms.map(([, field]) => subject[field]).filter(v => v !== null)
 const obtainedMarks = selectedMarks.length ? selectedMarks.reduce((s, v) => s + v, 0) : Number(row.marks_obtained || 0)
 const totalMarks = selectedMarks.length ? selectedMarks.length * perTermTotal : perTermTotal
 const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
 return {
 ...subject,
 totalMarks,
 obtainedMarks,
 percentage,
 grade: row.grade || gradeLabel(percentage),
 remarks: row.remarks || (percentage >= 80 ? 'Excellent' : percentage >= 60 ? 'Good' : percentage >= 50 ? 'Satisfactory' : 'Needs improvement'),
 }
 })

 const totalMarks = subjects.reduce((s, r) => s + r.totalMarks, 0)
 const obtainedMarks = subjects.reduce((s, r) => s + r.obtainedMarks, 0)
 const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
 const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

 return {
 student: {
 name: student?.name || 'Demo Student',
 fatherName: student?.fatherName || student?.father_name || 'Father Name',
 rollNo: student?.rollNo || student?.gr_number || student?.admissionNo || 'GR-0001',
 className: student?.className || exam?.class || 'Class',
 section: student?.section || '-',
 photo: student?.photo || student?.image || student?.profile_photo || student?.profileImage || student?.profile_image || student?.photo_url || student?.image_url || '',
 admissionNo: student?.admissionNo || student?.gr_number || '',
 },
 school: {
 name: school?.name || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
 logo: school?.logo || '',
 slogan: school?.slogan || (school?.showUrduHeader === false ? '' : school?.urdu) || '',
 address: school?.address || 'Sharif Chowk, Rayya Khas',
 phone: school?.phone || '',
 email: school?.email || '',
 principalSignature: school?.principalSignature || '',
 },
 result: {
 session: exam?.session || '2026-2027',
 term: exam?.name || 'Annual Result',
 classTeacher: exam?.classTeacher || 'Class Teacher',
 issueDate: today,
 subjects,
 attendance: {
 totalDays: exam?.totalSchoolDays || 220,
 attended: exam?.attended || 205,
 absent: exam?.absent || 15,
 },
 teacherRemarks: options.teacherRemarks || exam?.teacherRemarks || DEFAULT_RESULT_OPTIONS.teacherRemarks,
 principalRemarks: exam?.principalRemarks || 'Promoted as per school assessment policy.',
 totalMarks,
 obtainedMarks,
 percentage,
 grade: gradeLabel(percentage),
 },
 options: opts,
 }
}

export function ResultCardTemplateSelector({ value, onChange }) {
 return (
 <div className="result-template-grid">
 {RESULT_TEMPLATES.map(t => (
 <button type="button" key={t.id} onClick={() => onChange(t.id)} className={`result-template-tile ${value === t.id ? 'active' : ''}`}>
 <span>{t.label}</span>
 <strong>{t.name}</strong>
 </button>
 ))}
 </div>
 )
}

export function ResultCardPrintToolbar({ options, setOptions, onPrint, onExportPdf }) {
 const toggle = (key) => setOptions(prev => ({ ...prev, [key]: !prev[key] }))
 return (
 <div className="result-print-toolbar no-print">
 <div className="toolbar-row">
 <label>Print Size</label>
 <select value={options.orientation} onChange={e => setOptions(prev => ({ ...prev, orientation: e.target.value }))}>
 <option value="portrait">A4 Portrait</option>
 <option value="landscape">A4 Landscape</option>
 </select>
 </div>
 <div className="toolbar-checks">
 {[
 ['includeAssessment', 'Assessment Marks'],
 ['includeFirstTerm', 'First Term'],
 ['includeSecondTerm', 'Second Term'],
 ['includeThirdTerm', 'Third Term'],
 ['includeFinalTerm', 'Final Term'],
 ['includeAttendance', 'Attendance'],
 ['includeTeacherRemarks', 'Teacher Remarks'],
 ['includeCharts', 'Charts'],
 ].map(([key, label]) => (
 <label key={key}><input type="checkbox" checked={!!options[key]} onChange={() => toggle(key)} /> {label}</label>
 ))}
 </div>
 <div className="toolbar-actions">
 <button type="button" onClick={onPrint}>Print</button>
 <button type="button" onClick={onExportPdf}>Export PDF</button>
 </div>
 </div>
 )
}

export function StandardReportHeader({ data, title }) {
 const { school, student } = data
 return (
 <header className="rc-standard-header">
 <div className="rc-header-logo">
 {school.logo ? <img src={school.logo.startsWith('http') || school.logo.startsWith('blob:') || school.logo.startsWith('data:') ? school.logo : (school.logo.startsWith('/') ? 'https://api.assps.edu.pk' + school.logo : 'https://api.assps.edu.pk/' + school.logo)} alt="" /> : <div className="logo-fallback"></div>}
 </div>
 <div className="rc-header-center">
 {school.slogan && <div className="rc-urdu-title">{school.slogan}</div>}
 <h1 className="rc-school-name"><SchoolNameLines name={school.name} /></h1>
 <div className="rc-school-address">{school.address} {school.phone ? ` | ${school.phone}` : ''}</div>
 <div className="rc-report-title">{title || 'Student Report Card'}</div>
 </div>
 <div className="rc-header-photo">
 <PhotoFrame student={student} />
 </div>
 </header>
 )
}

export function ResultStudentInfoBlock({ data }) {
 const { student, result } = data
 const items = [
 ['Student Name', student.name],
 ['Father Name', student.fatherName],
 ['Class/Section', `${student.className}${student.section && student.section !== '-' ? ` / ${student.section}` : ''}`],
 ['Roll No', student.rollNo],
 ['School Year', result.session],
 ['Term', result.term],
 ['Teacher Name', result.classTeacher],
 ['Date', result.issueDate],
 ]
 return (
 <div className="rc-student-info">
 {items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value || '-'}</strong></div>)}
 </div>
 )
}

export function ResultMarksTable({ data }) {
 const activeTerms = termFields.filter(([key]) => data.options[key])
 return (
 <table className="rc-marks-table">
 <thead>
 <tr>
 <th>Subject</th>
 {activeTerms.map(([, , label]) => <th key={label}>{label}</th>)}
 <th>Total</th>
 <th>Obtained</th>
 <th>%</th>
 <th>Grade</th>
 <th>Remarks</th>
 </tr>
 </thead>
 <tbody>
 {data.result.subjects.map(row => (
 <tr key={row.subjectName}>
 <td>{row.subjectName}</td>
 {activeTerms.map(([, field]) => <td key={field}>{row[field] | '-'}</td>)}
 <td>{row.totalMarks}</td>
 <td>{row.obtainedMarks}</td>
 <td>{row.percentage}%</td>
 <td><b>{row.grade}</b></td>
 <td>{row.remarks}</td>
 </tr>
 ))}
 <tr className="total-row">
 <td>Total</td>
 {activeTerms.map(([, , label]) => <td key={label}></td>)}
 <td>{data.result.totalMarks}</td>
 <td>{data.result.obtainedMarks}</td>
 <td>{data.result.percentage}%</td>
 <td>{data.result.grade}</td>
 <td>{data.result.percentage >= 50 ? 'Pass' : 'Needs review'}</td>
 </tr>
 </tbody>
 </table>
 )
}

export function ResultPerformancePieChart({ data }) {
 const pct = Math.max(0, Math.min(100, data.result.percentage))
 const remaining = 100 - pct
 const dash = `${pct} ${remaining}`
 return (
 <div className="rc-chart-card pie">
 <h3>Performance Summary</h3>
 <svg viewBox="0 0 42 42" className="rc-pie">
 <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#D9DEE8" strokeWidth="7" />
 <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--accent)" strokeWidth="7" strokeDasharray={dash} strokeDashoffset="25" />
 <text x="21" y="20" textAnchor="middle">{pct}%</text>
 <text x="21" y="26" textAnchor="middle">{data.result.grade}</text>
 </svg>
 <div className="rc-chart-legend"><span>Obtained {data.result.obtainedMarks}</span><span>Remaining {Math.max(0, data.result.totalMarks - data.result.obtainedMarks)}</span></div>
 </div>
 )
}

export function ResultGrowthBarChart({ data }) {
 const max = Math.max(...data.result.subjects.map(s => s.totalMarks), 1)
 return (
 <div className="rc-chart-card bars">
 <h3>Subject-wise Performance</h3>
 <div className="rc-bars">
 {data.result.subjects.slice(0, 8).map(s => (
 <div className="rc-bar" key={s.subjectName}>
 <span style={{ height: `${Math.max(6, (s.obtainedMarks / max) * 100)}%` }}></span>
 <small>{s.subjectName.slice(0, 8)}</small>
 </div>
 ))}
 </div>
 </div>
 )
}

export function ResultSignatureFooter({ data }) {
 const { school, result, options } = data
 const sigImg = school?.principalSignature || null
 return (
 <div className="rc-footer">
 {options.includeAttendance && (
 <div className="rc-attendance">
 <span>Total School Days: <b>{result.attendance.totalDays}</b></span>
 <span>Attended: <b>{result.attendance.attended}</b></span>
 <span>Absent: <b>{result.attendance.absent}</b></span>
 </div>
 )}
 <div className="rc-signatures">
 <span>Teacher Signature</span>
 <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
 <div style={{ height:42, display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:2 }}>
 {sigImg && <img src={sigImg} alt="Principal Signature" style={{ height:40, maxWidth:130, objectFit:'contain', mixBlendMode:'multiply' }} />}
 </div>
 <div style={{ width:130, height:0, borderTop:'1.5px solid var(--navy)', marginBottom:3 }} />
 Principal Signature
 </span>
 </div>
 <p>{school.address}{school.phone ? ` | ${school.phone}` : ''}{school.email ? ` | ${school.email}` : ''}</p>
 </div>
 )
}

function PhotoFrame({ student }) {
 return <div className="rc-photo">{student.photo ? <img src={student.photo} alt="" /> : <span>Photo</span>}</div>
}

function AnalyticsRow({ data }) {
 if (!data.options.includeCharts) return null
 return <div className="rc-analytics"><ResultGrowthBarChart data={data} /><ResultPerformancePieChart data={data} /></div>
}

function Remarks({ data }) {
 if (!data.options.includeTeacherRemarks) return null
 return <div className="rc-remarks"><strong>Teacher Feedback:</strong><p>{data.result.teacherRemarks}</p></div>
}

function BaseTemplate({ data, templateClass, children }) {
 return (
 <section className={`result-card-a4 ${data.options.orientation === 'landscape' ? 'landscape' : ''} ${templateClass}`}>
 {children}
 </section>
 )
}

export function ResultCardTemplateReference({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-reference">
 <div className="curve top"></div><div className="curve side"></div>
 <StandardReportHeader data={data} title="Student Report Card" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <AnalyticsRow data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateEliteNavy({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-elite">
 <StandardReportHeader data={data} title={`Academic Result Card | ${data.result.term}`} />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <AnalyticsRow data={data} />
 <Remarks data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateGreenAcademic({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-green">
 <div className="green-ribbon"></div>
 <StandardReportHeader data={data} title="Student Report Card" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <AnalyticsRow data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateMinimalModern({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-minimal">
 <StandardReportHeader data={data} title="Student Report Card" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <AnalyticsRow data={data} />
 <Remarks data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateJuniorColorful({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-junior">
 <StandardReportHeader data={data} title="Student Report Card" />
 <div className="junior-badge">Great Work, {data.student.name}!</div>
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <AnalyticsRow data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateBoardPattern({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-board">
 <div className="board-watermark">BOARD EXAM</div>
 <StandardReportHeader data={data} title="Detailed Marks Certificate" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplatePerformanceAnalytics({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-analytics">
 <StandardReportHeader data={data} title="Performance Analytics Report" />
 <ResultStudentInfoBlock data={data} />
 <div className="analytics-hero">
 <ResultPerformancePieChart data={data} />
 <ResultGrowthBarChart data={data} />
 </div>
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateModernHexagon({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-hexagon">
 <div className="hex-bg"></div>
 <StandardReportHeader data={data} title="Student Report Card" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <AnalyticsRow data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplateMinimalCorporate({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-corporate">
 <StandardReportHeader data={data} title="Academic Transcript" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardTemplatePlayfulPrimary({ data }) {
 return (
 <BaseTemplate data={data} templateClass="template-playful">
 <StandardReportHeader data={data} title="My Progress Report" />
 <ResultStudentInfoBlock data={data} />
 <ResultMarksTable data={data} />
 <Remarks data={data} />
 <AnalyticsRow data={data} />
 <ResultSignatureFooter data={data} />
 </BaseTemplate>
 )
}

export function ResultCardPreview({ data }) {
 const map = {
 reference: ResultCardTemplateReference,
 'elite-navy': ResultCardTemplateEliteNavy,
 'green-academic': ResultCardTemplateGreenAcademic,
 'minimal-modern': ResultCardTemplateMinimalModern,
 'junior-colorful': ResultCardTemplateJuniorColorful,
 'board-pattern': ResultCardTemplateBoardPattern,
 'performance-analytics': ResultCardTemplatePerformanceAnalytics,
 'modern-hexagon': ResultCardTemplateModernHexagon,
 'minimal-corporate': ResultCardTemplateMinimalCorporate,
 'playful-primary': ResultCardTemplatePlayfulPrimary,
 }
 const Template = map[data.options.template] || ResultCardTemplateReference
 return <Template data={data} />
}

export const resultCardPrintCss = `
 @page { size: A4; margin: 0; }
 * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
 body { margin: 0; background: #eef2f7; font-family: Arial, Helvetica, sans-serif; color: #0B1F3A; }
 .result-card-a4 { --navy:#0B1F3A; --navy2:#102A4C; --silver:#D9DEE8; --accent:#F39C12; --green:#8CC63F; position: relative; width: 210mm; min-height: 297mm; height: 297mm; margin: 0 auto; padding: 12mm; background: #fff; overflow: hidden; border: 1px solid #D9DEE8; display: flex; flex-direction: column; }
 .result-card-a4.landscape { width: 297mm; min-height: 210mm; height: 210mm; padding: 10mm; }
 .rc-photo { width: 20mm; height: 25mm; border: 1.5px solid var(--silver); background: #f4f7fb; display: flex; align-items: center; justify-content: center; color: #8b95a8; font-size: 8pt; font-weight: 700; flex: 0 0 auto; overflow: hidden; }
 .rc-standard-header { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 4mm; margin-bottom: 5mm; flex: 0 0 auto; }
 .rc-header-logo { width: 22mm; height: 22mm; flex-shrink: 0; }
 .rc-header-logo img { width: 100%; height: 100%; object-fit: contain; }
 .rc-header-logo .logo-fallback { width: 100%; height: 100%; border: 1px solid var(--navy); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10mm; color: var(--navy); }
 .rc-header-center { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; }
 .rc-urdu-title { font-family: 'Noto Nastaliq Urdu', serif; font-size: 15pt; direction: rtl; color: var(--navy); margin-bottom: 2px; line-height: 1; }
 .rc-school-name { margin: 0; font-size: 16pt; font-weight: 900; color: var(--navy); text-transform: uppercase; line-height: 1.1; letter-spacing: 0.5px; }
 .rc-school-name .rc-brand-main, .rc-school-name .rc-brand-sub { display: block; white-space: nowrap; font-weight: 900; line-height: 1; }
 .rc-school-name .rc-brand-sub { font-size: 0.8em; letter-spacing: 0.4px; }
 .rc-school-address { font-size: 7.5pt; color: #555; margin: 3px 0 6px; font-weight: 600; }
 .rc-report-title { display: inline-block; font-size: 10pt; font-weight: 800; color: #fff; background: var(--navy); padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; box-shadow: 0 2px 8px rgba(11,31,58,0.15); }
 .rc-header-photo { width: 22mm; display: flex; justify-content: flex-end; }
 .rc-header-photo .rc-photo { width: 19mm; height: 24mm; border: 1.5px solid var(--silver); border-radius: 4px; }
 .rc-student-info { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 4mm; flex: 0 0 auto; }
 .rc-student-info div { border: 1px solid var(--silver); padding: 1.8mm 2.2mm; background: rgba(255,255,255,.86); min-height: 10mm; }
 .rc-student-info span { display: block; color: #667085; font-size: 7pt; text-transform: uppercase; font-weight: 700; margin-bottom: 1mm; }
 .rc-student-info strong { display: block; color: var(--navy); font-size: 9pt; line-height: 1.15; }
 .rc-marks-table { position: relative; z-index: 2; width: 100%; border-collapse: collapse; margin-bottom: 3.5mm; table-layout: fixed; flex: 0 0 auto; }
 .rc-marks-table th { background: var(--navy); color: #fff; border: 1px solid var(--navy); padding: 2.2mm 1.8mm; font-size: 7.4pt; text-align: center; }
 .rc-marks-table th:first-child, .rc-marks-table td:first-child { text-align: left; width: 27mm; }
 .rc-marks-table td { border: 1px solid #7d8797; padding: 2mm 1.8mm; font-size: 7.8pt; text-align: center; line-height: 1.15; word-break: break-word; }
 .rc-marks-table tbody tr:nth-child(even) td { background: #F7F9FC; }
 .rc-marks-table .total-row td { background: #E9EEF6; color: var(--navy); font-weight: 800; }
 .rc-remarks { position: relative; z-index: 2; border: 1px solid var(--silver); padding: 2.6mm 4mm; margin-bottom: 3.5mm; background: #FAFBFD; min-height: 15mm; flex: 0 0 auto; }
 .rc-remarks strong { color: var(--navy); font-size: 9pt; }
 .rc-remarks p { margin: 1.5mm 0 0; color: #3f4a5c; font-size: 8pt; line-height: 1.45; }
 .rc-analytics { position: relative; z-index: 2; display: grid; grid-template-columns: 1.45fr .8fr; gap: 4mm; margin-top: 1mm; margin-bottom: 4mm; flex: 0 0 auto; }
 .rc-chart-card { border: 1px solid var(--silver); background: #fff; min-height: 36mm; padding: 3mm; }
 .rc-chart-card h3 { margin: 0 0 2mm; color: var(--navy); font-size: 9pt; text-transform: uppercase; }
 .rc-bars { height: 27mm; display: flex; align-items: end; gap: 2.5mm; border-left: 1px solid var(--silver); border-bottom: 1px solid var(--silver); padding: 1mm 2mm 0; }
 .rc-bar { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: end; gap: 1mm; min-width: 0; }
 .rc-bar span { width: 70%; min-height: 4mm; background: linear-gradient(180deg, var(--accent), var(--navy)); display: block; border-radius: 1.5mm 1.5mm 0 0; }
 .rc-bar small { font-size: 6.3pt; color: #4b5563; white-space: nowrap; max-width: 100%; overflow: hidden; }
 .rc-pie { width: 29mm; height: 29mm; display: block; margin: 0 auto; }
 .rc-pie text:first-of-type { font-size: 7px; font-weight: 800; fill: var(--navy); }
 .rc-pie text:last-of-type { font-size: 4px; fill: #667085; font-weight: 700; }
 .rc-chart-legend { display: flex; justify-content: space-between; gap: 2mm; font-size: 6.5pt; color: #667085; margin-top: 1mm; }
 .rc-footer { position: relative; z-index: 2; margin-top: auto; flex: 0 0 auto; }
 .rc-attendance { display: flex; gap: 7mm; color: var(--navy); font-size: 8pt; margin-bottom: 9mm; }
 .rc-signatures { display: flex; justify-content: space-between; align-items: flex-end; gap: 20mm; margin-bottom: 5mm; padding: 0 10mm; }
 .rc-signatures span { min-width: 34mm; border-top: 1px solid var(--navy); padding-top: 2mm; text-align: center; color: var(--navy); font-size: 8pt; font-weight: 700; }
 .rc-footer p { margin: 0; text-align: center; color: #667085; font-size: 7pt; border-top: 4mm solid #D9DEE8; padding-top: 2mm; }
 .curve.top { position:absolute; left:-20mm; top:-35mm; width:150mm; height:70mm; background:linear-gradient(135deg,#374151,#2D9CDB); border-radius:0 0 90% 0; z-index:0; }
 .curve.side { position:absolute; left:-45mm; top:18mm; width:80mm; height:90mm; border-radius:50%; border:12mm solid #2D9CDB; z-index:0; }
 .template-reference { padding-top: 13mm; }
 .template-reference .rc-logo-mark { width:26mm; height:26mm; border-color:#2D9CDB; }
 .template-reference .rc-header { margin-top: 0; }
 .template-elite { --accent:#C7CEDA; border: 5mm solid var(--navy); padding: 11mm; }
 .template-elite .rc-student-info div { border-left: 3px solid var(--accent); box-shadow: inset 0 0 0 1px #EEF1F6; }
 .template-green { --accent:#8CC63F; border-left: 10mm solid var(--green); }
 .green-ribbon { position:absolute; right:-12mm; top:-25mm; width:35mm; height:160mm; background:linear-gradient(180deg,#8CC63F,#102A4C); transform:rotate(-28deg); opacity:.92; }
 .template-green .rc-marks-table th { background:#246B3A; border-color:#246B3A; }
 .template-minimal { --accent:#0B1F3A; border: none; padding: 18mm; }
 .template-minimal .rc-logo-mark { border-radius: 8px; }
 .minimal-grade { width:26mm; height:26mm; border-radius: 50%; background:var(--navy); color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:18pt; font-weight:900; }
 .minimal-grade small { font-size:8pt; color:#D9DEE8; }
 .template-junior { --accent:#F39C12; background:linear-gradient(180deg,#fff 0%,#fff 72%,#FFF4E2 100%); border: 2mm solid #BFE3FF; border-radius: 7mm; }
 .template-junior .rc-student-info div, .template-junior .rc-chart-card, .template-junior .rc-remarks { border-radius: 4mm; }
 .junior-badge { display:inline-block; margin-bottom:4mm; padding:2mm 5mm; border-radius:999px; background:#E8F6FF; color:#0B5C99; font-weight:900; font-size:11pt; }
 .template-junior .rc-marks-table th { background:#0B5C99; border-color:#0B5C99; }
 .landscape .rc-student-info { grid-template-columns: repeat(8, 1fr); }
 .landscape .rc-marks-table td, .landscape .rc-marks-table th { font-size: 7pt; padding: 1.7mm 1.4mm; }
 .landscape .rc-analytics { grid-template-columns: 1fr 1fr; }
 
 .template-board { border: 8px double #1a1a1a; padding: 10mm; position: relative; }
 .board-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; color: rgba(0,0,0,0.03); font-weight: 900; z-index: 1; pointer-events: none; white-space: nowrap; }
 .template-board .rc-marks-table th { background: #333; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
 .template-board .rc-marks-table td { border-color: #333; font-weight: 600; }
 .template-board .rc-student-info div { border-color: #333; border-width: 2px; }
 
 .template-analytics { background: #fdfdfd; }
 .template-analytics .analytics-hero { display: grid; grid-template-columns: 1fr 2fr; gap: 4mm; margin-bottom: 4mm; position: relative; z-index: 2; }
 .template-analytics .rc-marks-table th { background: #4F46E5; }
 
 .template-hexagon { position: relative; }
 .template-hexagon .hex-bg { position: absolute; top: 0; right: 0; width: 150mm; height: 150mm; background: radial-gradient(circle at top right, rgba(236,72,153,0.1) 0%, transparent 70%); z-index: 0; pointer-events: none; }
 .template-hexagon .rc-marks-table th { background: linear-gradient(135deg, #EC4899, #8B5CF6); }
 .template-hexagon .rc-photo { clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); width: 24mm; height: 26mm; border: none; }
 .template-hexagon .rc-header-photo { width: 24mm; }
 
 .template-corporate { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; }
 .template-corporate .rc-marks-table th { background: #111; color: #fff; font-weight: 600; font-size: 7pt; border: none; }
 .template-corporate .rc-marks-table td { border: none; border-bottom: 1px solid #ddd; }
 .template-corporate .rc-student-info div { border: none; background: #f5f5f5; border-radius: 4px; }
 
 .template-playful { background: #FFFAF0; border: 4mm solid #FFDEE9; border-radius: 12mm; }
 .template-playful .rc-marks-table th { background: #FF9A9E; border: none; border-radius: 6px 6px 0 0; }
 .template-playful .rc-marks-table td { border-color: #FFDEE9; }
 .template-playful .rc-student-info div { background: #fff; border: 2px dashed #FF9A9E; border-radius: 8px; }
 .template-playful .rc-photo { border-radius: 50%; border: 3px solid #FF9A9E; }
 @media print {
 body { background: #fff; }
 .no-print { display: none !important; }
 .result-card-a4 { margin: 0; border-color: transparent; page-break-inside: avoid; break-inside: avoid; box-shadow: none !important; }
 .result-card-a4.landscape { width: 297mm; min-height: 210mm; }
 }
`

export function openResultPrintWindow(data, exportMode = false) {
 const cards = Array.isArray(data) ? data : [data]
 const first = cards[0]
 if (!first) return
 const pageRule = first.options.orientation === 'landscape'
 ? '@page { size: A4 landscape; margin: 0; }'
 : '@page { size: A4 portrait; margin: 0; }'
 const cardMarkup = cards.map(card => renderToStaticMarkup(<ResultCardPreview data={card} />)).join('')
 const title = cards.length > 1 ? `Result Cards - ${cards.length} Students` : `Result Card - ${first.student.name}`
 const batchCss = `
 .result-card-a4 { page-break-after: always; break-after: page; }
 .result-card-a4:last-child { page-break-after: auto; break-after: auto; }
 `
 const html = `<!doctype html><html><head><meta charset="UTF-8"><title>${title}</title><style>${resultCardPrintCss.replace('@page { size: A4; margin: 0; }', pageRule)}${batchCss}</style></head><body>${cardMarkup}<script>window.onload=function(){window.focus();window.print();}</script></body></html>`
 const w = window.open('', '_blank', 'width=1100,height=900')
 if (!w) return
 w.document.write(html)
 w.document.close()
 if (exportMode) w.document.title = cards.length > 1 ? `Export PDF - ${cards.length} Result Cards` : `Export PDF - ${first.student.name}`
}
