import { renderToStaticMarkup } from 'react-dom/server'
import { resolveAssetUrl } from '../../services/api'
import { RESULT_TEMPLATES as LEGACY_TEMPLATES, DEFAULT_RESULT_OPTIONS, ResultCardPreview as LegacyPreview, ResultCardTemplateSelector as LegacySelector, ResultCardPrintToolbar as LegacyToolbar, buildResultCardData as legacyBuilder, resultCardPrintCss as legacyCss, ResultStudentInfoBlock, ResultSignatureFooter } from './resultCardTemplates'

export { DEFAULT_RESULT_OPTIONS }
export const RESULT_TEMPLATES = [LEGACY_TEMPLATES[0],
 {id:'signature-editorial',label:'Flagship 01',name:'Signature Editorial'},
 {id:'swiss-grid',label:'Flagship 02',name:'Swiss Grid'},
 {id:'data-atelier',label:'Flagship 03',name:'Data Atelier'},
 ...LEGACY_TEMPLATES.slice(1)]
const PREMIUM_IDS = new Set(['signature-editorial','swiss-grid','data-atelier'])

const termFields = [
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

function buildPremiumResultCardData({ student, exam, studentMarks, options, school }) {
 const opts = { ...DEFAULT_RESULT_OPTIONS, ...options, includeCharts:true, orientation:'portrait' }
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
 const obtainedMarks = selectedMarks.length ? selectedMarks.reduce((s, v) => s + v, 0) : (activeTerms.length === 0 ? (storedCurrentTerm ?? 0) : 0)
 const totalMarks = perTermTotal === null ? 0 : (selectedMarks.length ? selectedMarks.length * perTermTotal : perTermTotal)
 const percentage = hasMarks && totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null
 return {
 ...subject,
 totalMarks,
 obtainedMarks: hasMarks ? obtainedMarks : null,
 hasMarks,
 percentage,
 grade: percentage === null ? '—' : (gradeLabel(percentage, opts.gradeBands) || '—'),
 remarks: row.remarks || '',
 }
 })

 const scoredSubjects = subjects.filter(row => row.hasMarks)
 const totalMarks = scoredSubjects.reduce((s, r) => s + r.totalMarks, 0)
 const obtainedMarks = scoredSubjects.reduce((s, r) => s + r.obtainedMarks, 0)
 const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : null
 const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

 return {
 student: {
 name: student?.name || '—',
 fatherName: student?.fatherName || student?.father_name || '—',
 rollNo: student?.rollNo || student?.gr_number || student?.admissionNo || '—',
 className: student?.className || exam?.class || '—',
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
 session: exam?.session || '—',
 term: exam?.name || '—',
 classTeacher: exam?.classTeacher || '—',
 issueDate: today,
 subjects,
 attendance: {
 totalDays: exam?.totalSchoolDays ?? '—',
 attended: exam?.attended ?? '—',
 absent: exam?.absent ?? '—',
 },
 teacherRemarks: opts.teacherRemarks || exam?.teacherRemarks || DEFAULT_RESULT_OPTIONS.teacherRemarks,
 principalRemarks: exam?.principalRemarks || '',
 totalMarks,
 obtainedMarks,
 percentage,
 grade: percentage === null ? '—' : (gradeLabel(percentage, opts.gradeBands) || '—'),
 },
 options: opts,
 }
}

export function buildResultCardData(args) {
 return PREMIUM_IDS.has(args.options?.template) ? buildPremiumResultCardData(args) : legacyBuilder(args)
}

export function ResultCardTemplateSelector({value,onChange}) {
 return <div className="premium-selector">
  <div className="premium-selector-caption">Premium design collection</div>
  <div className="premium-featured-grid">
   {RESULT_TEMPLATES.filter(t=>PREMIUM_IDS.has(t.id)).map(t=><button type="button" key={t.id} onClick={()=>onChange(t.id)} aria-pressed={value===t.id} className={'premium-featured-tile '+t.id+(value===t.id?' is-active':'')}>
    <span className="premium-tile-thumbnail"><i/><i/><i/><i/></span>
    <span className="premium-tile-label"><strong>{t.name}</strong><small>{t.label}</small></span>
   </button>)}
  </div>
  <div className="premium-selector-caption">Existing / reference templates</div>
  <LegacySelector value={value} onChange={onChange}/>
 </div>
}

export function ResultCardPrintToolbar(props) {
 const premium = PREMIUM_IDS.has(props.options?.template)
 if (!premium) return <LegacyToolbar {...props}/>
 const toggle = key => props.setOptions(prev=>({...prev,[key]:!prev[key],includeCharts:true}))
 return <div className="result-print-toolbar premium-print-toolbar no-print">
  <div className="toolbar-row"><label>Print Size</label><div className="premium-print-size">A4 Portrait · print-certified</div></div>
  <div className="toolbar-checks">{[
   ['includeAssessment','Assessment Marks'],['includeFirstTerm','First Term'],['includeSecondTerm','Second Term'],['includeThirdTerm','Third Term'],['includeFinalTerm','Final Term'],['includeAttendance','Attendance'],['includeTeacherRemarks','Teacher Feedback']
  ].map(([key,label])=><label key={key}><input type="checkbox" checked={!!props.options[key]} onChange={()=>toggle(key)}/>{label}</label>)}</div>
  <div className="premium-chart-policy" role="note">Subject performance + percentage chart are always included in premium templates.</div>
  <div className="toolbar-actions"><button type="button" onClick={props.onPrint}>Print</button><button type="button" onClick={props.onExportPdf}>Export PDF</button></div>
 </div>
}

function PremiumMarksTable({ data }) {
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
 {activeTerms.map(([, field]) => <td key={field}>{row[field] ?? '—'}</td>)}
 <td>{row.totalMarks}</td>
 <td>{row.obtainedMarks ?? '—'}</td>
 <td>{row.percentage === null ? '—' : row.percentage + '%'}</td>
 <td><b>{row.grade}</b></td>
 <td>{row.remarks}</td>
 </tr>
 ))}
 <tr className="total-row">
 <td>Total</td>
 {activeTerms.map(([, , label]) => <td key={label}></td>)}
 <td>{data.result.totalMarks}</td>
 <td>{data.result.obtainedMarks}</td>
 <td>{data.result.percentage === null ? '—' : data.result.percentage + '%'}</td>
 <td>{data.result.grade}</td>
 <td>{data.result.percentage === null ? 'Pending marks' : (data.result.percentage >= 50 ? 'Pass' : 'Needs review')}</td>
 </tr>
 </tbody>
 </table>
 )
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

function PremiumSchoolHeader({ data, title }) {
 const school = data.school || {}
 const student = data.student || {}
 // Only the tenant's saved SaaS settings provide school branding. Never replace
 // it with APEX's product identity or with a generated/hardcoded school crest.
 const configuredLogo = resolveAssetUrl(school.logo)
 const schoolName = school.name || '—'
 return <header className="rc-standard-header">
  <div className="rc-header-logo">{configuredLogo ? <img src={configuredLogo} alt="School emblem configured in SaaS settings" /> : <div className="logo-fallback" aria-label="School logo not configured" />}</div>
  <div className="rc-header-center">
   {school.slogan && <div className="rc-urdu-title">{school.slogan}</div>}
   <h1 className="rc-school-name">{schoolName}</h1>
   <div className="rc-school-address">{school.address}{school.phone ? ` | ${school.phone}` : ''}</div>
   <div className="rc-report-title">{title}</div>
  </div>
  <div className="rc-header-photo"><div className="rc-photo">{student.photo ? <img src={student.photo} alt="Student photograph"/> : <span>Photo</span>}</div></div>
 </header>
}

function PremiumSubjectBars({ data }) {
 return <div className="rc-chart-card premium-subject-chart">
  <h3>Subject-wise Performance</h3>
  <div className="premium-bar-list">
   {data.result.subjects.map((subject, i) => <div className="premium-bar-item" key={subject.subjectName + i}>
    <span className="premium-bar-name">{subject.subjectName}</span>
    <span className="premium-bar-track"><span className="premium-bar-fill" style={{ width: subject.percentage === null ? '0%' : Math.max(0, Math.min(100, subject.percentage)) + '%' }} /></span>
    <b>{subject.percentage === null ? '—' : subject.percentage + '%'}</b>
   </div>)}
  </div>
 </div>
}
function PremiumSummaryDonut({ data }) {
 const pct = data.result.percentage
 return <div className="rc-chart-card premium-summary-chart">
  <h3>Performance Summary</h3>
  <svg className="premium-donut" viewBox="0 0 42 42" role="img" aria-label={pct === null ? 'Marks pending' : 'Overall ' + pct + ' percent'}>
   <circle cx="21" cy="21" r="15.915" fill="none" stroke="#E5EDF2" strokeWidth="2.4" />
   <circle cx="21" cy="21" r="15.915" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeDasharray={(pct ?? 0) + ' ' + (100 - (pct ?? 0))} strokeDashoffset="25" />
   <text x="21" y="20" textAnchor="middle" className="premium-donut-value">{pct === null ? '—' : pct + '%'}</text>
   <text x="21" y="25" textAnchor="middle" className="premium-donut-label">{pct === null ? 'PENDING' : 'OVERALL'}</text>
  </svg>
  <div className="premium-chart-caption">{data.result.obtainedMarks} / {data.result.totalMarks} recorded marks</div>
 </div>
}
function PremiumInsights({ data, reverse = false }) {
 if (!data.options.includeCharts) return null
 return <div className={'rc-analytics premium-analytics' + (reverse ? ' premium-reverse' : '')}>
  {reverse ? <><PremiumSummaryDonut data={data} /><PremiumSubjectBars data={data} /></>
   : <><PremiumSubjectBars data={data} /><PremiumSummaryDonut data={data} /></>}
 </div>
}
export function ResultCardTemplateSignatureEditorial({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-signature">
  <div className="premium-topline">AL ILMUL IKHLAQ <span>OFFICIAL ACADEMIC RECORD</span></div>
  <PremiumSchoolHeader data={data} title="Student Report Card" />
  <ResultStudentInfoBlock data={data} />
  <PremiumMarksTable data={data} />
  <PremiumInsights data={data} />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateSwissGrid({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-swiss">
  <div className="premium-topline">ASSPS / ASSESSMENT STUDIO <span>{data.result.session}</span></div>
  <PremiumSchoolHeader data={data} title="Academic Performance Record" />
  <div className="premium-swiss-band">01 / STUDENT PROFILE</div>
  <ResultStudentInfoBlock data={data} />
  <div className="premium-swiss-band">02 / VERIFIED MARKS REGISTER</div>
  <PremiumMarksTable data={data} />
  <PremiumInsights data={data} />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateDataAtelier({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-atelier">
  <div className="premium-topline">THE ACADEMIC INDEX <span>{data.result.session}</span></div>
  <PremiumSchoolHeader data={data} title="Student Learning Report" />
  <ResultStudentInfoBlock data={data} />
  <div className="premium-section-label">A / VALIDATED MARKS</div>
  <PremiumMarksTable data={data} />
  <div className="premium-section-label">B / PERFORMANCE INTELLIGENCE</div>
  <PremiumInsights data={data} reverse />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardPreview({data}) {
 const premium = {'signature-editorial':ResultCardTemplateSignatureEditorial,'swiss-grid':ResultCardTemplateSwissGrid,'data-atelier':ResultCardTemplateDataAtelier}
 const Template = premium[data.options.template]
 return Template ? <Template data={{...data, options:{...data.options,includeCharts:true,orientation:'portrait'}}}/> : <LegacyPreview data={data}/>
}

export const resultCardPrintCss = legacyCss + `
/* Premium A4 foundations: subtle borders, larger branding, minimal ink */
 .premium-card { --navy:#19364D; --silver:#DDE5EB; --accent:#2E7B9D; border:0.2mm solid #E0E8EE; padding:11mm 12mm; color:#19364D; }
 .premium-card .premium-topline { display:flex; justify-content:space-between; gap:2mm; margin-bottom:5mm; padding-bottom:2mm; border-bottom:0.2mm solid #DBE5EB; font-size:7pt; font-weight:700; letter-spacing:1px; color:var(--accent); }
 .premium-card .rc-standard-header { align-items:center; gap:4mm; margin-bottom:5mm; }
 .premium-card .rc-header-center { align-items:flex-start; text-align:left; }
 .premium-card .rc-header-logo { width:26mm; height:26mm; background:transparent; }
 .premium-card .rc-header-logo img { background:transparent; object-fit:contain; border:0; }
 .premium-card .rc-school-name { font-size:19pt; letter-spacing:0; line-height:1.05; }
 .premium-card .rc-school-name .rc-brand-sub { font-size:0.67em; margin-top:1mm; }
 .premium-card .rc-school-address { font-size:7pt; margin:2mm 0 0; color:#53697A; }
 .premium-card .rc-urdu-title { font-size:10pt; }
 .premium-card .rc-report-title { font-size:8pt; letter-spacing:1px; padding:0; border-radius:0; color:var(--accent); background:transparent; box-shadow:none; margin-top:2mm; }
 .premium-card .rc-header-photo .rc-photo { background:#F8FAFB; border:0.2mm solid #D8E2EB; border-radius:1mm; }
 .premium-card .rc-student-info { gap:1.3mm; margin-bottom:4mm; }
 .premium-card .rc-student-info div { background:transparent; border:0; border-bottom:0.2mm solid #DBE5EB; padding:1.6mm 1mm; min-height:8.5mm; }
 .premium-card .rc-student-info span { font-size:6.2pt; color:#62788A; }
 .premium-card .rc-student-info strong { font-size:8.5pt; color:#1F4057; }
 .premium-card .rc-marks-table { border-collapse:collapse; margin-bottom:4mm; }
 .premium-card .rc-marks-table th { background:#F0F5F8; color:#243E52; border:0; border-top:0.3mm solid #C5D7E2; border-bottom:0.25mm solid #C5D7E2; padding:2.3mm 0.9mm; font-size:7pt; font-weight:750; }
 .premium-card .rc-marks-table td { background:transparent !important; border:0; border-bottom:0.2mm solid #E0E8ED; padding:2mm 0.85mm; font-size:7.5pt; color:#243E52; }
 .premium-card .rc-marks-table .total-row td { background:#F2F7F9 !important; border-top:0.3mm solid #BDCFDA; font-weight:800; }
 .premium-card .rc-marks-table th:first-child, .premium-card .rc-marks-table td:first-child { width:28mm; }
 .premium-card .rc-remarks { background:transparent; border:0; border-left:0.7mm solid var(--accent); padding:1.7mm 3mm; margin-bottom:3mm; min-height:10mm; }
 .premium-card .rc-footer { color:#455F72; }
 .premium-card .premium-analytics { display:grid; grid-template-columns:1.5fr 0.85fr; gap:3mm; margin:0 0 4mm; }
 .premium-card .premium-analytics.premium-reverse { grid-template-columns:0.85fr 1.5fr; }
 .premium-card .rc-chart-card { border:0.2mm solid #D9E4EB; background:transparent; min-height:36mm; padding:3mm; }
 .premium-card .rc-chart-card h3 { margin:0 0 3mm; font-size:7.5pt; color:#274154; letter-spacing:0.5px; text-transform:uppercase; }
 .premium-card .premium-bar-list { display:flex; flex-direction:column; gap:1.6mm; }
 .premium-card .premium-bar-item { display:grid; grid-template-columns:minmax(17mm,34mm) minmax(13mm,1fr) 9mm; align-items:center; gap:2mm; font-size:7pt; line-height:1.2; }
 .premium-card .premium-bar-name { overflow-wrap:anywhere; }
 .premium-card .premium-bar-track { display:block; height:1.65mm; background:#E5EDF2; border-radius:2mm; overflow:hidden; }
 .premium-card .premium-bar-fill { display:block; height:100%; background:var(--accent); border-radius:2mm; }
 .premium-card .premium-bar-item b { text-align:right; font-variant-numeric:tabular-nums; font-size:7pt; }
 .premium-card .premium-summary-chart { text-align:center; }
 .premium-card .premium-donut { display:block; width:33mm; height:33mm; margin:0 auto; max-width:100%; }
 .premium-card .premium-donut-value { font-size:6.5px; font-weight:800; fill:#223E53; }
 .premium-card .premium-donut-label { font-size:2.8px; fill:#718494; }
 .premium-card .premium-chart-caption { font-size:6.8pt; color:#607484; margin:1mm auto 0; }
 .premium-signature { --accent:#356F95; font-family:Georgia,'Times New Roman',serif; }
 .premium-signature .rc-school-name, .premium-signature .rc-marks-table, .premium-signature .rc-student-info, .premium-signature .premium-analytics { font-family:Arial,Helvetica,sans-serif; }
 .premium-signature .premium-topline { border-bottom:0.3mm solid #B7C9D6; }
 .premium-swiss { --accent:#1674D0; --navy:#183B5D; font-family:Arial,Helvetica,sans-serif; border-left:1.6mm solid #1674D0; }
 .premium-swiss .rc-school-name { font-size:20pt; }
 .premium-swiss .premium-topline { border-bottom:0.6mm solid var(--accent); }
 .premium-swiss-band { background:#F0F6FC; padding:1.7mm; margin:0.8mm 0 1.4mm; color:#24557C; font-size:7pt; font-weight:800; letter-spacing:0.5px; }
 .premium-swiss .premium-bar-track, .premium-swiss .premium-bar-fill { border-radius:0; }
 .premium-atelier { --accent:#168F9E; --navy:#1D4854; font-family:'Helvetica Neue',Arial,sans-serif; border-top:1mm solid #168F9E; }
 .premium-atelier .rc-standard-header { border-bottom:0.2mm solid #D5E5E8; padding-bottom:3mm; }
 .premium-atelier .rc-school-name { font-size:18pt; }
 .premium-atelier .rc-student-info div { background:#F3F8F8; border:0; padding:2mm; }
 .premium-atelier .rc-marks-table th { background:#EAF5F5; color:#20525B; }
 .premium-section-label { margin:1mm 0 2mm; font-size:7pt; font-weight:800; letter-spacing:1px; color:#247785; }
 /* Dense multi-subject A4: compact without removing labels or records */
 .premium-card .rc-marks-table td { padding:1.1mm 0.8mm; font-size:7.25pt; line-height:1.12; }
 .premium-card .rc-marks-table th { padding:1.35mm 0.8mm; line-height:1.12; }
 .premium-card .rc-student-info div { min-height:7.5mm; padding:1mm 1mm; }
 .premium-card .premium-bar-list { gap:0.95mm; }
 .premium-card .rc-attendance { margin-bottom:3mm; }
 .premium-card .rc-signatures { margin-bottom:2mm; padding:0 5mm; }
 .premium-card .rc-footer p { border-top:0.25mm solid #CDDDE6; padding-top:1.5mm; }

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
 const safeTitle = title.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
 const html = `<!doctype html><html><head><meta charset="UTF-8"><title>${safeTitle}</title><style>${resultCardPrintCss.replace('@page { size: A4; margin: 0; }', pageRule)}${batchCss}</style></head><body>${cardMarkup}<script>window.onload=function(){window.focus();window.print();}</script></body></html>`
 const w = window.open('', '_blank', 'width=1100,height=900')
 if (!w) return
 w.document.write(html)
 w.document.close()
 if (exportMode) w.document.title = cards.length > 1 ? `Export PDF - ${cards.length} Result Cards` : `Export PDF - ${first.student.name}`
}
