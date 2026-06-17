import { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Trophy, Plus, Save, Printer, BarChart2, FileText, Bookmark } from "lucide-react";
import { DonutChart, BarChart, ChartLegend } from "../../components/Charts";
import { useAcademicStore } from "../../services/useAcademicStore";
const EXAMS = [
 { id: 1, name: "Mid-Term 2026", type: "TE", date: "2026-05-15", session: "2026-2027" },
 { id: 2, name: "Assessment 1", type: "AS", date: "2026-03-10", session: "2026-2027" },
 { id: 3, name: "Annual Exam 2025", type: "TE", date: "2025-11-20", session: "2025-2026" },
];
// Removed hardcoded SUBJECTS
const STUDENTS = [
 { id: 1, gr: "GR-001", name: "Ahmed Ali", photo: "" },
 { id: 2, gr: "GR-002", name: "Fatima Noor", photo: "" },
 { id: 3, gr: "GR-003", name: "Usman Tariq", photo: "" },
 { id: 4, gr: "GR-004", name: "Ayesha Bibi", photo: "" },
 { id: 5, gr: "GR-005", name: "Hamza Ijaz", photo: "" },
 { id: 6, gr: "GR-006", name: "Zainab Malik", photo: "" },
];

const cardStyle = {
 background: 'rgba(11,44,77,0.62)',
 backdropFilter: 'blur(18px)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 22,
 padding: 24,
};
const headerStyle = {
 color: '#C0C8D8',
 fontSize: 19,
 fontWeight: 650,
};
const accentText = {
 color: '#C8991A',
};
const btnPrimary = {
 display: 'flex', alignItems: 'center', gap: 8,
 background: 'linear-gradient(135deg,#C8991A,#e8b420)',
 color: '#071e34', border: 'none', borderRadius: 12,
 padding: '12px 20px', fontWeight: 500, fontSize: 14, cursor: 'pointer',
};
const btnSecondary = {
 display: 'flex', alignItems: 'center', gap: 8,
 background: 'rgba(11,44,77,0.45)', color: '#C0C8D8',
 border: '1px solid rgba(200,153,26,0.2)', borderRadius: 12,
 padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
};
const inputStyle = {
 width: '100%', padding: '12px 14px', borderRadius: 12,
 background: 'rgba(7,30,52,0.65)', border: '1px solid rgba(148,163,184,0.18)',
 color: '#C0C8D8', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const selectStyle = {
 ...inputStyle,
 appearance: 'none',
 cursor: 'pointer',
};

function getGrade(pct) {
 if (pct >= 90) return { g: 'A+', c: '#30D158' };
 if (pct >= 80) return { g: 'A', c: '#30D158' };
 if (pct >= 70) return { g: 'B', c: '#C8991A' };
 if (pct >= 60) return { g: 'C', c: '#C8991A' };
 if (pct >= 50) return { g: 'D', c: '#FF9F0A' };
 return { g: 'F', c: '#FF375F' };
}

const esc = (value) => String(value || '')
  .replaceAll('&', '&')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

function printExamResultCard({ student, marks, subjects, examName }) {
 const totalObtained = subjects.reduce((sum, subject) => sum + (parseInt(marks[student.id]?.[subject]) || 0), 0)
 const totalMax = subjects.length * 100
 const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0
 const { g, c } = getGrade(pct)
 const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
 const rows = subjects.map((subject, index) => {
 const obtained = parseInt(marks[student.id]?.[subject]) || 0
 const { g: sg, c: sc } = getGrade(obtained)
 return `<tr>
 <td>${index + 1}</td>
 <td>${esc(subject)}</td>
 <td>100</td>
 <td><strong>${obtained}</strong></td>
 <td style="color:${sc};font-weight:800">${sg}</td>
 </tr>`
 }).join('')

 const html = `<!doctype html><html><head><meta charset="UTF-8"><title>Result Card - ${esc(student.name)}</title>
 <style>
 @page{size:A4 portrait;margin:10mm}
 *{box-sizing:border-box}
 body{margin:0;background:#eef2f7;color:#101827;font-family:Arial,sans-serif}
 .toolbar{position:sticky;top:0;display:flex;align-items:center;gap:12px;padding:10px 14px;background:#071e34;color:#d9dee8;box-shadow:0 6px 18px rgba(15,23,42,.22)}
 .toolbar strong{color:#e8b420}.toolbar button{margin-left:auto;border:0;border-radius:7px;padding:9px 18px;background:#c8991a;color:#071e34;font-weight:800;cursor:pointer}
 .card{width:190mm;min-height:270mm;margin:14px auto;background:white;border:2px solid #0b2c4d;padding:12mm;display:flex;flex-direction:column}
 header{text-align:center;border-bottom:2px solid #c8991a;padding-bottom:10px;margin-bottom:14px}
 h1{margin:0;color:#0b2c4d;font-size:23px;letter-spacing:.02em} h2{margin:8px 0 0;color:#c8991a;font-size:18px}
 .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:14px 0;padding:12px;background:#f8fafc;border:1px solid #d9dee8}
 .meta div{font-size:12px}.meta strong{color:#0b2c4d}
 table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #cbd5e1;padding:8px 10px;font-size:12px;text-align:center}th{background:#0b2c4d;color:white}td:nth-child(2),th:nth-child(2){text-align:left}
 .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.box{border:1px solid #d9dee8;background:#f8fafc;padding:10px;text-align:center}.box b{display:block;color:#0b2c4d;font-size:20px}.box span{font-size:10px;color:#64748b;text-transform:uppercase}
 .remarks{margin-top:14px;background:#fff8e1;border-left:4px solid #c8991a;padding:10px 12px;font-size:12px}
 .signatures{margin-top:auto;padding-top:30mm;display:flex;justify-content:space-between}.sig{text-align:center;color:#475569;font-size:11px}.sig:before{content:"";display:block;width:42mm;border-top:1px solid #0b2c4d;margin:0 auto 6px}
 footer{text-align:center;color:#64748b;font-size:10px;margin-top:12px}
 @media print{body{background:white}.toolbar{display:none}.card{margin:0 auto;border-color:#0b2c4d;box-shadow:none}}
 </style></head><body>
 <div class="toolbar"><strong>Result Card Print Preview</strong><span>${esc(student.name)} - ${esc(examName)}</span><button onclick="window.print()">Print / Save PDF</button></div>
 <main class="card">
 <header><h1>Al Siddique Scholars Public School</h1><h2>Result Card</h2></header>
 <section class="meta">
 <div>Student: <strong>${esc(student.name)}</strong></div>
 <div>GR No: <strong>${esc(student.gr)}</strong></div>
 <div>Exam: <strong>${esc(examName)}</strong></div>
 <div>Date: <strong>${esc(today)}</strong></div>
 </section>
 <table><thead><tr><th>S.No</th><th>Subject</th><th>Total</th><th>Obtained</th><th>Grade</th></tr></thead><tbody>${rows}</tbody></table>
 <section class="summary">
 <div class="box"><b>${totalObtained}</b><span>Obtained</span></div>
 <div class="box"><b>${totalMax}</b><span>Total</span></div>
 <div class="box"><b style="color:${c}">${g}</b><span>Grade</span></div>
 <div class="box"><b style="color:${pct >= 50 ? '#15803d' : '#b91c1c'}">${pct}%</b><span>Percentage</span></div>
 </section>
 <div class="remarks"><strong>Remarks:</strong> ${pct >= 50 ? 'Passed. Keep up the good work.' : 'Needs improvement and guided practice.'}</div>
 <section class="signatures"><div class="sig">Class Teacher</div><div class="sig">Principal</div></section>
 <footer>Generated: ${esc(today)}</footer>
 </main>
 </body></html>`

 const w = window.open('', '_blank', 'width=900,height=760')
 if (!w) return alert('Popup blocked. Please allow popups in your browser and try printing again.')
 w.document.open()
 w.document.write(html)
 w.document.close()
 w.focus()
}

function AddExamModal({ onClose, onAdd }) {
 const [form, setForm] = useState({ name: '', type: 'TE', date: '', session: '2026-2027' });
 const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
 const labelStyle = { color: '#8892A4', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: 0.6 };
 const fieldStyle = { width: '100%', padding: '12px 14px', borderRadius: 12, background: 'rgba(7,30,52,0.65)', border: '1px solid rgba(148,163,184,0.18)', color: '#C0C8D8', fontSize: 14, outline: 'none' };

 return createPortal(
 <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,30,52,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
 <div className="super-module-card" style={{ ...cardStyle, width: '100%', maxWidth: 520 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
 <div>
 <div style={{ ...accentText, fontSize: 18, fontWeight: 800 }}>Add New Exam</div>
 <div style={{ color: '#8892A4', fontSize: 12 }}>Create a new exam schedule for the session</div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C0C8D8', fontSize: 24, cursor: 'pointer' }}></button>
 </div>

 <div style={{ display: 'grid', gap: 16 }}>
 <div><label style={labelStyle}>Exam Name</label><input style={fieldStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mid-Term 2026" /></div>
 <div>
 <label style={labelStyle}>Exam Type</label>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
 {[[ 'TE', 'Term Exam' ], [ 'AS', 'Assessment' ]].map(([value, label]) => (
 <button key={value} onClick={() => set('type', value)} style={{ padding: 12, borderRadius: 12, border: `1px solid ${form.type === value ? '#C8991A' : 'rgba(148,163,184,0.18)'}`, background: form.type === value ? 'rgba(148,163,184,0.18)' : 'rgba(11,44,77,0.35)', color: form.type === value ? '#C8991A' : '#C0C8D8', fontWeight: 600, cursor: 'pointer' }}>{label}</button>
 ))}
 </div>
 </div>
 <div><label style={labelStyle}>Exam Date</label><input type="date" style={fieldStyle} value={form.date} onChange={e => set('date', e.target.value)} /></div>
 <div><label style={labelStyle}>Session</label><select style={fieldStyle} value={form.session} onChange={e => set('session', e.target.value)}>{['2026-2027','2025-2026','2024-2025'].map(session => <option key={session}>{session}</option>)}</select></div>
 </div>

 <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
 <button onClick={onClose} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>Cancel</button>
 <button onClick={() => { if (form.name && form.date) { onAdd({ ...form, id: Date.now() }); onClose(); } }} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}><Plus size={16} />Add Exam</button>
 </div>
 </div>
 </div>,
 document.body
 );
}

function ResultCard({ student, marks, subjects, examName, onClose }) {
 const totalObtained = subjects.reduce((sum, subject) => sum + (parseInt(marks[student.id]?.[subject]) || 0), 0);
 const totalMax = subjects.length * 100;
 const pct = Math.round((totalObtained / totalMax) * 100);
 const { g, c } = getGrade(pct);

 return createPortal(
 <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(7,30,52,0.94)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
 <div style={{ width: '100%', maxWidth: 560, borderRadius: 24, overflow: 'hidden', background: '#071e34', border: '1px solid rgba(200,153,26,0.25)' }}>
 <div style={{ padding: 24, background: '#0b2c4d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
 <div>
 <div style={{ ...accentText, fontSize: 18, fontWeight: 800 }}>Result Card</div>
 <div style={{ color: '#C0C8D8', fontSize: 12, marginTop: 4 }}>{examName}</div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#C0C8D8', fontSize: 24, cursor: 'pointer' }}></button>
 </div>

 <div style={{ padding: 24, color: '#C0C8D8', display: 'grid', gap: 18 }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 13 }}>
 <div>Student: <strong>{student.name}</strong></div>
 <div>GR No: <strong>{student.gr}</strong></div>
 <div>Exam: <strong>{examName}</strong></div>
 <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
 </div>

 <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
 <thead>
 <tr style={{ background: 'rgba(11,44,77,0.95)', color: '#C8991A' }}>
 <th style={{ padding: '10px', textAlign: 'left' }}>Subject</th>
 <th style={{ padding: '10px', textAlign: 'center' }}>Obtained</th>
 <th style={{ padding: '10px', textAlign: 'center' }}>Total</th>
 <th style={{ padding: '10px', textAlign: 'center' }}>Grade</th>
 </tr>
 </thead>
 <tbody>
 {subjects.map((subject, index) => {
 const obtained = parseInt(marks[student.id]?.[subject]) || 0;
 const { g: sg, c: sc } = getGrade(obtained);
 return (
 <tr key={subject} style={{ background: index % 2 === 0 ? 'rgba(11,44,77,0.35)' : 'rgba(11,44,77,0.18)' }}>
 <td style={{ padding: '10px' }}>{subject}</td>
 <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{obtained}</td>
 <td style={{ padding: '10px', textAlign: 'center' }}>100</td>
 <td style={{ padding: '10px', textAlign: 'center', color: sc, fontWeight: 700 }}>{sg}</td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr style={{ background: 'rgba(11,44,77,0.95)', color: '#C0C8D8', fontWeight: 700 }}>
 <td style={{ padding: '10px' }}>Total</td>
 <td style={{ padding: '10px', textAlign: 'center' }}>{totalObtained}</td>
 <td style={{ padding: '10px', textAlign: 'center' }}>{totalMax}</td>
 <td style={{ padding: '10px', textAlign: 'center', color: c }}>{g} ({pct}%)</td>
 </tr>
 </tfoot>
 </table>

 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
 <div style={{ padding: '14px 18px', borderRadius: 20, background: c === '#30D158' ? 'rgba(48,209,88,0.14)' : 'rgba(200,153,26,0.14)', color: '#C0C8D8', fontWeight: 700 }}>Status: {pct >= 50 ? 'PASS' : 'FAIL'}</div>
 <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320 }}>
 <button onClick={() => printExamResultCard({ student, marks, subjects, examName })} style={{ ...btnPrimary, flex: 1, justifyContent: 'center' }}><Printer size={16} />Print</button>
 <button onClick={onClose} style={{ ...btnSecondary, flex: 1, justifyContent: 'center' }}>Close</button>
 </div>
 </div>
 </div>
 </div>
 </div>,
 document.body
 );
}

export default function ExaminationModule() {
 const { classNames: CLASSES, allSections: SECTIONS, subjectsForClass, subjects: rawSubjects, activeClasses } = useAcademicStore();
 const location = useLocation();
 const navigate = useNavigate();
 const [exams, setExams] = useState(EXAMS);
 const [showAdd, setShowAdd] = useState(false);
 const [selectedExam, setSelectedExam] = useState(EXAMS[0] || null);
 const [selectedClass, setSelectedClass] = useState(CLASSES[0] || 'Starter');
 const [selectedSection, setSelectedSection] = useState(SECTIONS[0] || 'Blue');
 const [marks, setMarks] = useState({});
 const [saved, setSaved] = useState(false);
 const [viewCard, setViewCard] = useState(null);

 const subjects = subjectsForClass(selectedClass) || [];
 const path = location.pathname.replace(/\/$/, '');
 const activeTab = path === '/examination' || path === '/examination/manage' ? 'exams' : path === '/examination/marks' ? 'marks' : path === '/examination/results' ? 'results' : path === '/examination/cards' ? 'cards' : 'exams';

 const setMark = (studentId, subject, value) => {
 const parsed = Math.min(100, Math.max(0, parseInt(value) || 0));
 setMarks(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [subject]: parsed } }));
 setSaved(false);
 };

 const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

 const tabs = [
 { key: 'exams', label: 'Manage Exams', icon: <Trophy size={14} />, path: '/examination/manage' },
 { key: 'marks', label: 'Enter Marks', icon: <Bookmark size={14} />, path: '/examination/marks' },
 { key: 'results', label: 'Results', icon: <BarChart2 size={14} />, path: '/examination/results' },
 { key: 'cards', label: 'Result Cards', icon: <FileText size={14} />, path: '/examination/cards' },
 ];

 const resultsData = STUDENTS.map(student => {
 const total = subjects.reduce((sum, subject) => sum + (parseInt(marks[student.id]?.[subject]) || 0), 0);
 const pct = Math.round((total / (subjects.length * 100)) * 100);
 const grade = getGrade(pct);
 return { student, total, pct, grade };
 });

 // Dashboard computed values
 const examTypeCounts = EXAMS.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + 1; return acc; }, {});
 const uniqueTypes = [...new Set(EXAMS.map(e => e.type))].length;
 const totalSubjectsCount = rawSubjects.length;

 const subjectPerClassBars = activeClasses
 .map((cls, i) => ({
 label: cls.name.replace('Class ', 'C'),
 value: subjectsForClass(cls.name).length,
 color: ['#0A84FF','#30D158','#C8991A','#BF5AF2','#FF375F','#64D2FF'][i % 6],
 }));

 const examDashCard = { background: 'rgba(11,44,77,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 18, padding: 20 };
 const examDashTitle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };

 return (
 <div style={{ minHeight: '100%', background: '#071e34', color: '#C0C8D8', padding: 24 }}>
 <div style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 24 }}>

 <div className="super-module-card" style={{ ...cardStyle, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
 <div style={{ width: 52, height: 52, borderRadius: 20, background: 'rgba(148,163,184,0.18)', display: 'grid', placeItems: 'center' }}>
 <Trophy size={24} color="#C8991A" />
 </div>
 <div>
 <div style={headerStyle}>Examination Module</div>
 <div style={{ color: '#8892A4', fontSize: 13 }}>Manage exams, enter marks, review results, and print result cards.</div>
 </div>
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
 {(activeTab === 'exams' || activeTab === 'marks') && (
 <button onClick={() => activeTab === 'exams' ? setShowAdd(true) : handleSave()} style={btnPrimary}>
 {activeTab === 'exams' ? <Plus size={16} /> : <Save size={16} />}
 {activeTab === 'exams' ? 'Add Exam' : saved ? 'Saved ' : 'Save Marks'}
 </button>
 )}
 </div>
 </div>

 {/*  Examination Dashboard  */}
 {/* Stats Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
 {[
 { label: 'Total Exams', value: EXAMS.length, icon: '', grad: 'linear-gradient(135deg,rgba(148,163,184,0.18),rgba(200,153,26,0.06))' },
 { label: 'Exam Types', value: uniqueTypes, icon: '', grad: 'linear-gradient(135deg,rgba(13,148,136,0.18),rgba(13,148,136,0.06))' },
 { label: 'Total Students', value: STUDENTS.length, icon: '', grad: 'linear-gradient(135deg,rgba(10,132,255,0.18),rgba(10,132,255,0.06))' },
 { label: 'Total Subjects', value: totalSubjectsCount, icon: '', grad: 'linear-gradient(135deg,rgba(191,90,242,0.18),rgba(191,90,242,0.06))' },
 ].map(c => (
 <div key={c.label} style={{ ...examDashCard, background: c.grad, padding: '16px 18px' }}>
 <div style={{ fontSize: 22 }}>{c.icon}</div>
 <div style={{ color: 'white', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{c.value}</div>
 <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{c.label}</div>
 </div>
 ))}
 </div>

 {/* Charts Row */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
 {/* Exam Type Donut */}
 <div style={examDashCard}>
 <div style={examDashTitle}> Exam Type Breakdown</div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
 <DonutChart
 segments={[
 { value: examTypeCounts['TE'] || 0, color: '#C8991A' },
 { value: examTypeCounts['AS'] || 0, color: '#0D9488' },
 ]}
 size={110}
 strokeWidth={14}
 label={String(EXAMS.length)}
 sublabel="exams"
 />
 <ChartLegend items={[
 { label: 'Term Exam', color: '#C8991A', value: examTypeCounts['TE'] || 0 },
 { label: 'Assessment', color: '#0D9488', value: examTypeCounts['AS'] || 0 },
 ]} />
 </div>
 </div>

 {/* Subjects per Class Bar */}
 <div style={examDashCard}>
 <div style={examDashTitle}> Subjects per Class</div>
 <BarChart bars={subjectPerClassBars} height={110} showValues={true} />
 </div>
 </div>



 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(7,30,52,0.55)', borderRadius: 20, padding: 6 }}>
 {tabs.map(item => (
 <button key={item.key} onClick={() => navigate(item.path)} style={{
 display: 'flex', alignItems: 'center', gap: 8,
 padding: '12px 18px', borderRadius: 14, border: 'none', cursor: 'pointer',
 color: activeTab === item.key ? '#071e34' : '#C0C8D8',
 background: activeTab === item.key ? 'linear-gradient(135deg,#C8991A,#e8b420)' : 'transparent',
 fontWeight: 700,
 }}>
 {item.icon} {item.label}
 </button>
 ))}
 </div>

 {activeTab === 'exams' && (
 <div style={{ display: 'grid', gap: 16 }}>
 {exams.length ? exams.map(exam => (
 <div key={exam.id} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, alignItems: 'center' }}>
 <div>
 <div style={{ ...accentText, fontSize: 16, fontWeight: 800 }}>{exam.name}</div>
 <div style={{ color: '#8892A4', fontSize: 13, marginTop: 6 }}>Session {exam.session} · {exam.date}</div>
 </div>
 <div style={{ color: exam.type === 'TE' ? '#C8991A' : '#0A84FF', fontWeight: 700, minWidth: 110, textAlign: 'center', padding: '10px 14px', borderRadius: 14, background: exam.type === 'TE' ? 'rgba(200,153,26,0.12)' : 'rgba(10,132,255,0.12)' }}>
 {exam.type === 'TE' ? 'Term Exam' : 'Assessment'}
 </div>
 <button onClick={() => { setSelectedExam(exam); navigate('/examination/marks'); }} style={btnSecondary}>Enter Marks</button>
 <button onClick={() => setExams(prev => prev.filter(item => item.id !== exam.id))} style={{ ...btnSecondary, background: 'rgba(255,55,95,0.12)', color: '#FF375F' }}>Delete</button>
 </div>
 )) : (
 <div className="super-module-card" style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
 <div style={{ ...accentText, fontSize: 20, fontWeight: 800, marginBottom: 12 }}>No exams created yet</div>
 <div style={{ color: '#8892A4' }}>Start by adding a new exam using the button above.</div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'marks' && (
 <div style={{ display: 'grid', gap: 16 }}>
 <div className="super-module-card" style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 16 }}>
 <select value={selectedExam?.id || ''} onChange={e => setSelectedExam(exams.find(ex => ex.id === parseInt(e.target.value)))} style={selectStyle}>
 <option value="">Select Exam</option>
 {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
 </select>
 <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={selectStyle}>
 {CLASSES.map(cls => <option key={cls}>{cls}</option>)}
 </select>
 <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} style={selectStyle}>
 {SECTIONS.map(sec => <option key={sec}>{sec}</option>)}
 </select>
 </div>

 <div className="super-module-card" style={{ ...cardStyle, overflowX: 'auto' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
 <div>
 <div style={{ ...accentText, fontWeight: 800, fontSize: 15 }}>{selectedExam?.name || 'Select an exam'}</div>
 <div style={{ color: '#8892A4', fontSize: 13 }}>{selectedClass} · {selectedSection}</div>
 </div>
 {saved && <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(48,209,88,0.14)', border: '1px solid rgba(48,209,88,0.3)', color: '#30D158', fontWeight: 700 }}> Marks saved successfully</div>}
 </div>
 <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
 <thead>
 <tr style={{ borderBottom: '2px solid rgba(200,153,26,0.3)' }}>
 <th style={{ padding: '10px 12px', textAlign: 'left', color: '#8892A4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Student</th>
 {subjects.map(sub => (
 <th key={sub} style={{ padding: '10px 8px', textAlign: 'center', color: '#8892A4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', minWidth: 80 }}>{sub}</th>
 ))}
 <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8892A4', fontSize: 11, fontWeight: 700 }}>Total</th>
 <th style={{ padding: '10px 12px', textAlign: 'center', color: '#8892A4', fontSize: 11, fontWeight: 700 }}>Grade</th>
 </tr>
 </thead>
 <tbody>
 {STUDENTS.map((s, i) => {
 const total = subjects.reduce((sum, sub) => sum + (parseInt(marks[s.id]?.[sub]) || 0), 0);
 const pct = Math.round((total / (subjects.length * 100)) * 100);
 const { g, c } = getGrade(pct);
 return (
 <tr key={s.id} style={{ borderBottom: '1px solid rgba(200,153,26,0.06)', background: i % 2 === 0 ? 'transparent' : 'rgba(11,44,77,0.2)' }}>
 <td style={{ padding: '10px 12px' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 <span style={{ fontSize: 20 }}>{s.photo}</span>
 <div>
 <div style={{ color: '#C0C8D8', fontWeight: 600, fontSize: 13 }}>{s.name}</div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>{s.gr}</div>
 </div>
 </div>
 </td>
 {subjects.map(sub => (
 <td key={sub} style={{ padding: '6px 8px', textAlign: 'center' }}>
 <input type="number" min={0} max={100}
 value={marks[s.id]?.[sub] ?? ''}
 onChange={e => setMark(s.id, sub, e.target.value)}
 onFocus={e => e.target.select()}
 placeholder="—"
 style={{ ...inputStyle, width: 60 }} />
 </td>
 ))}
 <td style={{ padding: '10px 12px', textAlign: 'center', color: '#C8991A', fontWeight: 800, fontSize: 15 }}>{total}</td>
 <td style={{ padding: '10px 12px', textAlign: 'center' }}>
 <span style={{ padding: '3px 10px', background: `${c}22`, border: `1px solid ${c}55`, borderRadius: 20, fontSize: 12, color: c, fontWeight: 700 }}>{g}</span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {activeTab === 'results' && (
 <div>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
 {[
 { label: 'Total Students', value: STUDENTS.length, color: '#0A84FF' },
 { label: 'Pass', value: STUDENTS.filter(s => { const t = subjects.reduce((sum, sub) => sum + (parseInt(marks[s.id]?.[sub]) || 0), 0); return (t / (subjects.length * 100)) * 100 >= 50; }).length, color: '#30D158' },
 { label: 'Fail', value: STUDENTS.filter(s => { const t = subjects.reduce((sum, sub) => sum + (parseInt(marks[s.id]?.[sub]) || 0), 0); return (t / (subjects.length * 100)) * 100 < 50; }).length, color: '#FF375F' },
 ].map(s => (
 <div key={s.label} style={cardStyle}>
 <div style={{ color: s.color, fontSize: 32, fontWeight: 800 }}>{s.value}</div>
 <div style={{ color: '#8892A4', fontSize: 13 }}>{s.label}</div>
 </div>
 ))}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
 {STUDENTS.map(s => {
 const total = subjects.reduce((sum, sub) => sum + (parseInt(marks[s.id]?.[sub]) || 0), 0);
 const pct = Math.round((total / (subjects.length * 100)) * 100);
 const { g, c } = getGrade(pct);
 return (
 <div key={s.id} style={{ ...cardStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
 <span style={{ fontSize: 28 }}>{s.photo}</span>
 <div style={{ flex: 1 }}>
 <div style={{ color: '#C0C8D8', fontWeight: 700, fontSize: 15 }}>{s.name}</div>
 <div style={{ color: '#8892A4', fontSize: 12 }}>{s.gr} · {selectedClass}</div>
 </div>
 <div style={{ textAlign: 'center', marginRight: 16 }}>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 20 }}>{total}/{subjects.length*100}</div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>Total Marks</div>
 </div>
 <div style={{ textAlign: 'center', marginRight: 16 }}>
 <div style={{ color: c, fontWeight: 800, fontSize: 20 }}>{pct}%</div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>Percentage</div>
 </div>
 <span style={{ padding: '4px 14px', background: `${c}22`, border: `1px solid ${c}55`, borderRadius: 20, fontSize: 13, color: c, fontWeight: 700, marginRight: 12 }}>{g}</span>
 <button onClick={() => setViewCard(s)} style={btnSecondary}><Printer size={14}/> Result Card</button>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {activeTab === 'cards' && (
 <div style={{ display: 'grid', gap: 16 }}>
 <div className="super-module-card" style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 16 }}>
 <div>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 16 }}>Active Exam</div>
 <div style={{ color: '#C0C8D8', marginTop: 8 }}>{selectedExam?.name || 'Select an exam'}</div>
 </div>
 <div>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 16 }}>Class</div>
 <div style={{ color: '#C0C8D8', marginTop: 8 }}>{selectedClass}</div>
 </div>
 <div>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 16 }}>Section</div>
 <div style={{ color: '#C0C8D8', marginTop: 8 }}>{selectedSection}</div>
 </div>
 </div>

 <div style={{ display: 'grid', gap: 12 }}>
 {resultsData.map(item => (
 <div key={item.student.id} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
 <div>
 <div style={{ color: '#C0C8D8', fontWeight: 700 }}>{item.student.name}</div>
 <div style={{ color: '#8892A4', fontSize: 12 }}>{item.student.gr}</div>
 <div style={{ color: '#C8991A', marginTop: 10, fontWeight: 700 }}>{item.grade.g} • {item.pct}%</div>
 </div>
 <button onClick={() => setViewCard(item.student)} style={{ ...btnPrimary, justifyContent: 'center' }}><Printer size={16} /> Print Result</button>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>

 {showAdd && <AddExamModal onClose={() => setShowAdd(false)} onAdd={exam => { setExams(prev => [...prev, exam]); setSelectedExam(exam); }} />}
 {viewCard && <ResultCard student={viewCard} marks={marks} subjects={subjects} examName={selectedExam?.name || 'Exam'} onClose={() => setViewCard(null)} />}
 </div>
 );
}
