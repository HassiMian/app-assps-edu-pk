import { RESULT_TEMPLATES, PREMIUM_IDS, termFields } from './premiumResultCardData'
import {resolveAssetUrl} from '../../services/api'
import { ResultCardPreview as LegacyPreview, ResultCardTemplateSelector as LegacySelector, ResultCardPrintToolbar as LegacyToolbar, ResultStudentInfoBlock, ResultSignatureFooter } from './resultCardTemplates'

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
 const toggle = key => props.setOptions(prev=>({...prev,[key]:!prev[key],autoTermColumns:false,includeCharts:true}))
 return <div className="result-print-toolbar premium-print-toolbar no-print">
  <div className="toolbar-row"><label>Print Size</label><div className="premium-print-size">A4 Portrait · print-certified</div></div>
  <div className="premium-chart-policy"><label><input type="checkbox" checked={!!props.options.autoTermColumns} onChange={e=>props.setOptions(prev=>({...prev,autoTermColumns:e.target.checked}))} /> Auto-match each card to its exam term</label></div>
  <div className="toolbar-checks">
   {!props.options.autoTermColumns && [['includeAssessment','Assessment Marks'],['includeFirstTerm','First Term'],['includeSecondTerm','Second Term'],['includeThirdTerm','Third Term'],['includeFinalTerm','Final Term']].map(([key,label])=><label key={key}><input type="checkbox" checked={!!props.options[key]} onChange={()=>toggle(key)}/>{label}</label>)}
   {[['includeAttendance','Attendance'],['includeTeacherRemarks','Teacher Feedback']].map(([key,label])=><label key={key}><input type="checkbox" checked={!!props.options[key]} onChange={()=>toggle(key)}/>{label}</label>)}
  </div>
  <div className="premium-chart-policy" role="note">Both analytics charts are included on every card. Every printed student uses one A4 portrait sheet.</div>
  <div className="premium-printer-guide" role="note"><strong>Choose your connected printer</strong> — select any installed USB, Wi-Fi, or shared/network printer in the system Print dialog. Check A4 / Portrait / Actual Size (100%). No printer model is locked to this template.</div>
  <div className="toolbar-actions"><button type="button" onClick={props.onPrint}>Print · Choose Printer</button><button type="button" onClick={props.onExportPdf}>Save as PDF</button></div>
 </div>
}

function PremiumMarksTable({ data }) {
 const activeTerms = termFields.filter(([key]) => data.options[key])
 const compact = activeTerms.length >= 3
 const columnName = (label) => compact ? ({'Assessment':'Assess.','First Term':'Term 1','Second Term':'Term 2','Third Term':'Term 3','Final Term':'Final'})[label] || label : label
 return (
 <table className="rc-marks-table">
 <thead>
 <tr>
 <th>Subject</th>
 {activeTerms.map(([, , label]) => <th key={label} title={label}>{columnName(label)}</th>)}
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
 <td>{row.totalMarks > 0 ? row.totalMarks : '—'}</td>
 <td>{row.obtainedMarks ?? '—'}</td>
 <td>{row.percentage === null ? '—' : row.percentage + '%'}</td>
 <td><b>{row.grade}</b></td>
 <td>{row.remarks}</td>
 </tr>
 ))}
 <tr className="total-row">
 <td>Total</td>
 {activeTerms.map(([, , label]) => <td key={label}></td>)}
 <td>{data.result.totalMarks > 0 ? data.result.totalMarks : '—'}</td>
 <td>{data.result.obtainedMarks}</td>
 <td>{data.result.percentage === null ? '—' : data.result.percentage + '%'}</td>
 <td>{data.result.grade}</td>
 <td>{data.result.pendingCount ? `${data.result.pendingCount} pending` : data.result.percentage === null ? 'Pending marks' : 'Recorded'}</td>
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
 const rows = data.result.subjects || []
 const lengthy = rows.some(row => String(row.subjectName || '').length > 23)
 const dense = (rows.length >= 7 && lengthy) || (rows.length >= 10 && String(data.student?.name || '').length > 36)
 const ultraDense = rows.length >= 17 || (rows.length >= 13 && String(data.result?.teacherRemarks || '').length > 300)
 const multiTerm = termFields.filter(([key])=>data.options[key]).length >= 3
 return (
 <section className={`result-card-a4 ${data.options.orientation === 'landscape' ? 'landscape' : ''} ${templateClass}${dense || ultraDense ? ' premium-dense' : ''}${ultraDense ? ' premium-ultra-dense' : ''}${multiTerm ? ' premium-multi-term' : ''}`}>

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
  <div className="rc-header-logo">{configuredLogo ? <img src={configuredLogo} alt="School emblem configured in SaaS settings" data-result-school-logo="true" /> : <div className="logo-fallback" aria-label="School logo not configured" />}</div>
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
  <div className="premium-chart-caption">{data.result.pendingCount ? `${data.result.pendingCount} subject(s) pending · ` : ''}{data.result.obtainedMarks} / {data.result.totalMarks} verified marks</div>
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

// Independent compositions share the same verified scores, not copied sample values.
export function ResultCardTemplateRegalLinework({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-regal">
  <div className="premium-regal-crown">ACADEMIC EXCELLENCE <span>OFFICIAL · {data.result.session}</span></div>
  <PremiumSchoolHeader data={data} title="Scholastic Achievement Record" />
  <div className="premium-regal-heading">INDIVIDUAL SCHOLAR RECORD <span>{data.result.term}</span></div>
  <ResultStudentInfoBlock data={data} />
  <PremiumMarksTable data={data} />
  <PremiumInsights data={data} reverse />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateYoungScholars({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-young">
  <div className="premium-young-tokens"><span>LEARN</span><span>EXPLORE</span><span>ACHIEVE</span></div>
  <PremiumSchoolHeader data={data} title="Learning Journey · Progress Report" />
  <div className="premium-young-section"><b>01</b> Our learner</div>
  <ResultStudentInfoBlock data={data} />
  <div className="premium-young-section"><b>02</b> Subject achievements</div>
  <PremiumMarksTable data={data} />
  <div className="premium-young-section"><b>03</b> How I'm progressing</div>
  <PremiumInsights data={data} />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateAcademicHeritage({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-heritage">
  <div className="premium-heritage-seal">ACADEMIC YEAR <strong>{data.result.session}</strong></div>
  <PremiumSchoolHeader data={data} title="Official Academic Transcript" />
  <div className="premium-heritage-rule">SCHOLAR'S PARTICULARS</div>
  <ResultStudentInfoBlock data={data} />
  <div className="premium-heritage-rule">EXAMINATION REGISTER</div>
  <PremiumMarksTable data={data} />
  <PremiumInsights data={data} reverse />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateAirframeGeometry({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-airframe">
  <div className="premium-airframe-axis"><span>ASSPS / REPORT SYSTEM</span><span>R—{data.result.session}</span></div>
  <PremiumSchoolHeader data={data} title="Student Performance Overview" />
  <div className="premium-airframe-title">STUDENT <b>01—</b></div>
  <ResultStudentInfoBlock data={data} />
  <div className="premium-airframe-title">RESULTS <b>02—</b></div>
  <PremiumMarksTable data={data} />
  <PremiumInsights data={data} />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateCorporateLedger({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-ledger">
  <div className="premium-ledger-top"><span>INSTITUTIONAL PERFORMANCE</span><b>REPORT / {data.result.session}</b></div>
  <PremiumSchoolHeader data={data} title="Academic Performance Statement" />
  <div className="premium-ledger-overview"><span>RESULT PROFILE</span><b>{data.result.term}</b></div>
  <ResultStudentInfoBlock data={data} />
  <PremiumMarksTable data={data} />
  <div className="premium-ledger-overview"><span>ANALYTICS</span><b>SUBJECT DISTRIBUTION</b></div>
  <PremiumInsights data={data} reverse />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardTemplateExaminationDossier({ data }) {
 return <BaseTemplate data={data} templateClass="premium-card premium-dossier">
  <div className="premium-dossier-top"><b>ASSESSMENT DOSSIER</b><span>SESSION {data.result.session}</span></div>
  <PremiumSchoolHeader data={data} title="Official Examination Result" />
  <div className="premium-dossier-label">SECTION A — CANDIDATE INFORMATION</div>
  <ResultStudentInfoBlock data={data} />
  <div className="premium-dossier-label">SECTION B — RECORDED MARKS</div>
  <PremiumMarksTable data={data} />
  <div className="premium-dossier-label">SECTION C — PERFORMANCE ANALYSIS</div>
  <PremiumInsights data={data} />
  <Remarks data={data} />
  <ResultSignatureFooter data={data} />
 </BaseTemplate>
}

export function ResultCardPreview({data}) {
 const premium = {'signature-editorial':ResultCardTemplateSignatureEditorial,'swiss-grid':ResultCardTemplateSwissGrid,'data-atelier':ResultCardTemplateDataAtelier,'regal-linework':ResultCardTemplateRegalLinework,'young-scholars':ResultCardTemplateYoungScholars,'academic-heritage':ResultCardTemplateAcademicHeritage,'airframe-geometry':ResultCardTemplateAirframeGeometry,'corporate-ledger':ResultCardTemplateCorporateLedger,'examination-dossier':ResultCardTemplateExaminationDossier}
 const Template = premium[data.options.template]
 return Template ? <Template data={{...data, options:{...data.options,includeCharts:true,orientation:'portrait'}}}/> : <LegacyPreview data={data}/>
}
