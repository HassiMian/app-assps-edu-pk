import { useState, useEffect } from "react";
import {
 Check, CheckCircle2, X, Clock, Users, Calendar,
 ChevronDown, Save, Search, UserCheck, UserX, CalendarOff, QrCode, BarChart3, MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { DonutChart, BarChart, ChartLegend } from "../../components/Charts";
import { useAcademicStore } from "../../services/useAcademicStore";
import { getPakistanDateString } from "../../utils/dateUtils";
import { emitAttendanceUpdated } from "../../utils/attendanceEvents";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const transformAttendanceRow = (row) => ({
 id: row.student_id || row.id,
 gr: row.gr_number || row.gr || "",
 name: row.name || "",
 photo: row.photo || "",
 class: row.class || "",
 section: row.section || "",
 status: row.status || "",
})

const transformStudent = (student) => ({
 id: student.id,
 gr: student.gr_number || student.gr || "",
 name: student.name || "",
 photo: student.photo || "",
 class: student.class || "",
 section: student.section || "",
 parent_phone: student.parent_phone || student.phone_number || '',
 parent_whatsapp: student.parent_whatsapp || student.whatsapp_number || '',
})

const card = {
 background: "var(--apex-bg-surface)", backdropFilter: "blur(20px)",
 border: "1px solid var(--apex-border-default)", borderRadius: 20, padding: 24,
};

const btnPrimary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "var(--apex-action-primary)",
 color: "#fff", border: "none", borderRadius: 10,
 padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

const btnSecondary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "var(--apex-bg-surface-solid)", color: "var(--apex-text-secondary)",
 border: "1px solid var(--apex-border-default)", borderRadius: 10,
 padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const selectStyle = {
 padding: "10px 14px", borderRadius: 10,
 background: "var(--apex-bg-surface-solid)", border: "1px solid var(--apex-border-default)",
 color: "var(--apex-text-secondary)", fontSize: 14, outline: "none", cursor: "pointer",
};

export default function AttendanceModule() {
 const navigate = useNavigate();
 const [tab, setTab] = useState("mark");
 const { classNames: CLASSES, sectionsForClass, sessionStart, sessionEnd } = useAcademicStore();
 const attendanceClasses = CLASSES;

 useEffect(() => {
 if (tab === "smart") {
 navigate("/attendance/qr-scan");
 setTab("mark");
 }
 }, [tab, navigate]);

 const defaultClass = CLASSES[0] || "";
 const [selectedClass, setSelectedClass] = useState(defaultClass);
 const [selectedSection, setSelectedSection] = useState(() => sectionsForClass(defaultClass)[0] || "");
 const [selectedDate, setSelectedDate] = useState(getPakistanDateString());
 const [students, setStudents] = useState([]);
 const [attendance, setAttendance] = useState({});
 const [saved, setSaved] = useState(false);
 const [notificationQueueCount, setNotificationQueueCount] = useState(0);
 const [loading, setLoading] = useState(false);
 const [monthlyTrend, setMonthlyTrend] = useState([]);
 const [monthlyClassSummary, setMonthlyClassSummary] = useState([]);
 const [analyticsError, setAnalyticsError] = useState('');
 const [loadError, setLoadError] = useState('');
 const [saveError, setSaveError] = useState('');
 const [loadedScopeKey, setLoadedScopeKey] = useState('');
 const currentScopeKey = `${selectedClass}::${selectedSection}::${selectedDate}`;
 const scopeMatches = loadedScopeKey === currentScopeKey;
 const visibleStudents = scopeMatches ? students : [];
 const visibleAttendance = scopeMatches ? attendance : {};
 const scopeUnavailable = Boolean(loadError && !scopeMatches);

 const loadAttendance = async () => {
 if (!selectedClass || !selectedSection) {
 setLoadError(selectedClass ? 'No section is configured for this class in Academic Setup.' : 'No active class is configured in Academic Setup.')
 return
 }
 const requestScopeKey = currentScopeKey
 setLoading(true)
 setLoadError('')
 try {
 const [attendanceRes, studentRes] = await Promise.all([
 api.get('/api/attendance', { params: { class: selectedClass, section: selectedSection, date: selectedDate } }),
 api.get('/api/students', { params: { class: selectedClass, section: selectedSection } }),
 ])

 const attendanceData = Array.isArray(attendanceRes.data?.data) ? attendanceRes.data.data : []
 const studentData = Array.isArray(studentRes.data?.data) ? studentRes.data.data : []
 const markMap = {}
 attendanceData.forEach((row) => {
 const sid = row.student_id || row.id
 if (sid && row.status) markMap[sid] = row.status
 })
 setStudents(studentData.map(transformStudent))
 setAttendance(markMap)
 setLoadedScopeKey(requestScopeKey)
 } catch (err) {
 console.error('Could not load attendance', err)
 setLoadError(err.response?.data?.message || 'Attendance data could not be refreshed. Existing loaded attendance was preserved for its original class, section and date.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 if (!selectedClass) return
 const availableSections = sectionsForClass(selectedClass)
 if (availableSections.length && !availableSections.includes(selectedSection)) {
 setSelectedSection(availableSections[0])
 return
 }
 loadAttendance()
 }, [selectedClass, selectedSection, selectedDate])

 useEffect(() => {
 if (tab !== 'analytics' || !selectedClass || !selectedSection) return
 let cancelled = false
 async function loadMonthlyAnalytics() {
 setAnalyticsError('')
 const [yearText, monthText] = String(selectedDate || '').split('-')
 const year = Number(yearText)
 const month = Number(monthText)
 if (!Number.isInteger(year) || !Number.isInteger(month)) {
 if (!cancelled) { setMonthlyTrend([]); setMonthlyClassSummary([]) }
 return
 }
 try {
 const [trendResponse, classResponse] = await Promise.all([
 api.get('/api/attendance/monthly', {
 params: { class: selectedClass, section: selectedSection, year, month },
 }),
 api.get('/api/attendance/monthly-class-summary', { params: { year, month } }),
 ])
 if (!cancelled) {
 setMonthlyTrend(Array.isArray(trendResponse.data?.data) ? trendResponse.data.data : [])
 setMonthlyClassSummary(Array.isArray(classResponse.data?.data) ? classResponse.data.data : [])
 }
 } catch (err) {
 if (!cancelled) setAnalyticsError(err.response?.data?.message || 'Monthly attendance analytics could not be refreshed. Existing loaded analytics were preserved.')
 }
 }
 void loadMonthlyAnalytics()
 return () => { cancelled = true }
 }, [tab, selectedClass, selectedSection, selectedDate])

 const setStatus = (id, status) => {
 setAttendance(prev => ({ ...prev, [id]: status }));
 setSaved(false);
 };

 const markAll = (status) => {
 const all = {};
 visibleStudents.forEach(s => { all[s.id] = status })
 setAttendance(all);
 setSaved(false);
 };

 const presentCount = Object.values(visibleAttendance).filter(v => v === "present").length;
 const absentCount = Object.values(visibleAttendance).filter(v => v === "absent").length;
 const lateCount = Object.values(visibleAttendance).filter(v => v === "late").length;
 const leaveCount = Object.values(visibleAttendance).filter(v => v === "leave").length;
 const unmarked = visibleStudents.length - Object.keys(visibleAttendance).length;

 const handleSave = async () => {
 if (!scopeMatches) {
 setSaveError('Attendance for the selected class, section and date is not loaded yet.')
 return
 }
 const entries = Object.entries(visibleAttendance).filter(([_, status]) => !!status)
 setSaveError('')
 if (!entries.length) {
 setSaveError('Select attendance status for at least one student before saving.')
 return
 }
 try {
 const records = entries.map(([studentId, status]) => ({ student_id: Number(studentId), date: selectedDate, status }))
 const response = await api.post('/api/attendance/mark', { records })
 setNotificationQueueCount(Number(response.data?.notificationQueueCount || 0))
 emitAttendanceUpdated({ date: selectedDate, count: records.length })
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 } catch (err) {
 console.error('Failed to save attendance', err)
 setSaveError(err.response?.data?.message || 'Attendance could not be saved.')
 }
 };

 const tabs = [
 { key: "mark", label: "Mark Attendance", icon: CheckCircle2 },
 { key: "smart", label: "Smart Scan", icon: QrCode },
 { key: "analytics", label: "Analytics", icon: BarChart3 },
 { key: "report", label: "SMS Report", icon: MessageSquare },
 ];

 const attDashCard = { background: 'var(--apex-bg-surface)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 22, padding: 20 };
 const attDashTitle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };
 const totalStudents = visibleStudents.length;

 return (
 <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>

 {/* Header */}
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Check size={22} color="#30D158" />
 </div>
 <div>
 <h1 style={{ color: "var(--apex-text-secondary)", fontSize: 24, fontWeight: 800, margin: 0 }}>Attendance System</h1>
 <p style={{ color: "var(--apex-text-tertiary)", fontSize: 13, margin: 0 }}>{sessionStart && sessionEnd ? `Session ${String(sessionStart).slice(0,4)}-${String(sessionEnd).slice(0,4)} · ` : ""}Mark & track student attendance</p>
 </div>
 </div>
 </div>

 {(loadError || saveError) && <div style={{ marginBottom:16, padding:'12px 14px', borderRadius:12, background:'color-mix(in srgb, var(--apex-action-danger) 8%, var(--apex-bg-surface-solid))', border:'1px solid color-mix(in srgb, var(--apex-action-danger) 25%, var(--apex-border-default))', color:'var(--apex-action-danger)', fontSize:12, fontWeight:700 }}>{saveError || loadError}</div>}

 {/* Attendance Dashboard */}
 {/* Stats Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
 {[
 { label: 'Present', value: scopeUnavailable ? '—' : presentCount, Icon: UserCheck, color: '#30D158', grad: 'linear-gradient(135deg,rgba(48,209,88,0.18),rgba(48,209,88,0.06))' },
 { label: 'Absent', value: scopeUnavailable ? '—' : absentCount, Icon: UserX, color: '#FF375F', grad: 'linear-gradient(135deg,rgba(255,55,95,0.18),rgba(255,55,95,0.06))' },
 { label: 'Late', value: scopeUnavailable ? '—' : lateCount, Icon: Clock, color: '#FF9F0A', grad: 'linear-gradient(135deg,rgba(255,159,10,0.18),rgba(255,159,10,0.06))' },
 { label: 'Leave', value: scopeUnavailable ? '—' : leaveCount, Icon: CalendarOff, color: '#0A84FF', grad: 'linear-gradient(135deg,rgba(10,132,255,0.18),rgba(10,132,255,0.06))' },
 { label: 'Total Students', value: scopeUnavailable ? '—' : totalStudents, Icon: Users, color: '#C8991A', grad: 'linear-gradient(135deg,rgba(200,153,26,0.18),rgba(200,153,26,0.06))' },
 ].map(c => {
 const IconComp = c.Icon
 return (
 <div key={c.label} style={{ ...attDashCard, background: c.grad, padding: '16px 18px', borderRadius: 22 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
 <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 700 }}>{c.label}</div>
 <IconComp size={18} color={c.color} />
 </div>
 <div style={{ color: 'white', fontSize: 28, fontWeight: 900, marginTop: 8 }}>{c.value}</div>
 </div>
 )
 })}
 </div>

 {/* Charts */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 20 }}>
 {/* Attendance Donut */}
 <div style={attDashCard}>
 <div style={attDashTitle}> Today's Attendance</div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
 <DonutChart
 segments={[
 { value: presentCount || 0, color: '#30D158' },
 { value: absentCount || 0, color: '#FF375F' },
 { value: lateCount || 0, color: '#FF9F0A' },
 { value: leaveCount || 0, color: '#0A84FF' },
 ]}
 size={110}
 strokeWidth={14}
 label={String(totalStudents)}
 sublabel="students"
 />
 <div style={{ flex: 1 }}>
 <ChartLegend items={[
 { label: 'Present', color: '#30D158', value: presentCount },
 { label: 'Absent', color: '#FF375F', value: absentCount },
 { label: 'Late', color: '#FF9F0A', value: lateCount },
 { label: 'Leave', color: '#0A84FF', value: leaveCount },
 ]} />
 <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
 {totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0}% attendance rate
 </div>
 </div>
 </div>
 </div>

 {/* Status Bar */}
 <div style={attDashCard}>
 <div style={attDashTitle}> Attendance Summary</div>
 <BarChart
 bars={[
 { label: 'Present', value: presentCount, color: '#30D158' },
 { label: 'Absent', value: absentCount, color: '#FF375F' },
 { label: 'Late', value: lateCount, color: '#FF9F0A' },
 { label: 'Leave', value: leaveCount, color: '#0A84FF' },
 { label: 'Unmarked',value: unmarked, color: '#64D2FF' },
 ]}
 height={110}
 showValues={true}
 />
 </div>
 </div>


 {/* Attendance Analytics Overview */}
 <div style={{ display:"grid", gridTemplateColumns:"1.2fr 2fr", gap:20, marginBottom:24 }}>
 <div className="super-module-card" style={card}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
 <h3 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:0 }}> Today's Overview</h3>
 <span style={{ color:"#30D158", fontSize:11, fontWeight:700 }}>LIVE STATUS</span>
 </div>
 {(() => {
 const total = visibleStudents.length || 1
 const pct = Math.round((presentCount / total) * 100)
 const r = 45, circ = Math.PI * r
 return (
 <div style={{ textAlign:'center' }}>
 <svg width="140" height="80" viewBox="0 0 140 80">
 <path d="M 20 65 A 50 50 0 0 1 120 65" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" strokeLinecap="round" />
 <path d="M 20 65 A 50 50 0 0 1 120 65" fill="none" stroke="#30D158" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${circ * pct / 100} ${circ}`} />
 <text x="70" y="55" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="900">{pct}%</text>
 </svg>
 <div style={{ color:"#30D158", fontSize:13, fontWeight:700, marginTop:-10 }}>Presence Rate</div>
 <div style={{ color:"#8892A4", fontSize:11 }}>{scopeUnavailable ? 'Attendance data unavailable for this selection.' : `${presentCount} of ${visibleStudents.length} students present`}</div>
 </div>
 )
 })()}
 </div>

 <div className="super-module-card" style={card}>
 <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
 <h3 style={{ color:"#C8991A", fontSize:16, fontWeight:800, margin:0 }}> Attendance Trends</h3>
 <div style={{ fontSize:10, color:"#8892A4", fontWeight:700 }}>LAST 7 DAYS</div>
 </div>
 <div style={{ display:"flex", alignItems:"flex-end", gap:12, height:100 }}>
 {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
 const h = [88, 92, 85, 89, 94, 0, 0][i]
 return (
 <div key={day} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
 <div style={{ fontSize:10, color:h>0?"#30D158":"#8892A4", fontWeight:700 }}>{h}%</div>
 <div style={{ width:"100%", height:`${h}%`, background:h>0?"linear-gradient(to top, #30D158, #0A84FF)":"rgba(255,255,255,0.05)", borderRadius:"4px 4px 0 0" }} />
 <div style={{ fontSize:10, color:"#8892A4", fontWeight:600 }}>{day}</div>
 </div>
 )
 })}
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div style={{ display: "flex", gap: 4, background: "var(--apex-bg-surface)", borderRadius: 14, padding: 4, marginBottom: 24, width: "fit-content", border:"1px solid rgba(148,163,184,0.18)", boxShadow: "var(--apex-shadow-sm)" }}>
 {tabs.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)}
 style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: tab === t.key ? "var(--apex-action-primary)" : "transparent", color: tab === t.key ? "#fff" : "var(--apex-text-tertiary)", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
 {t.label}
 </button>
 ))}
 </div>

 {/* MARK ATTENDANCE TAB */}
 {tab === "mark" && (
 <div>
 {/* Filters */}
 <div className="super-module-card" style={{ ...card, marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderRadius: 22 }}>
 <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={selectStyle}>
 {attendanceClasses.map(c => <option key={c}>{c}</option>)}
 </select>
 <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} style={selectStyle}>
 {attendanceSectionsForClass(selectedClass, sectionsForClass).map(s => <option key={s}>{s}</option>)}
 </select>
 <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
 style={{ ...selectStyle }} />
 <button onClick={loadAttendance} style={btnPrimary}>
 <Search size={15} /> Load
 </button>
 <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
 <button onClick={() => markAll("present")} style={{ ...btnSecondary, color: "#30D158", borderColor: "rgba(48,209,88,0.3)" }}>
  All Present
 </button>
 <button onClick={() => markAll("absent")} style={{ ...btnSecondary, color: "#FF375F", borderColor: "rgba(255,55,95,0.3)" }}>
  All Absent
 </button>
 <button onClick={() => markAll("leave")} style={{ ...btnSecondary, color: "#0A84FF", borderColor: "rgba(10,132,255,0.3)" }}>
  All Leave
 </button>
 </div>
 </div>

 {/* Summary Bar */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
 {[
 { label: "Present", value: presentCount, color: "#30D158", bg: "rgba(48,209,88,0.1)" },
 { label: "Absent", value: absentCount, color: "#FF375F", bg: "rgba(255,55,95,0.1)" },
 { label: "Late", value: lateCount, color: "#FF9F0A", bg: "rgba(255,159,10,0.1)" },
 { label: "Leave", value: leaveCount, color: "#0A84FF", bg: "rgba(10,132,255,0.1)" },
 { label: "Unmarked", value: unmarked, color: "var(--apex-text-tertiary)", bg: "rgba(136,146,164,0.1)" },
 ].map(s => (
 <div key={s.label} style={{ ...card, padding: 16, background: s.bg, border: `1px solid ${s.color}33`, borderRadius: 20, textAlign: "center" }}>
 <div style={{ color: s.color, fontSize: 28, fontWeight: 800 }}>{s.value}</div>
 <div style={{ color: s.color, fontSize: 12, fontWeight: 600 }}>{s.label}</div>
 </div>
 ))}
 </div>

 {/* Student List */}
 <div className="super-module-card" style={card}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
 <h3 style={{ color: "var(--apex-action-highlight)", fontSize: 15, fontWeight: 700, margin: 0 }}>
 {selectedClass} — Section {selectedSection} · {selectedDate}
 </h3>
 <button onClick={handleSave} style={btnPrimary}>
 <Save size={16} /> {saved ? "Saved! " : "Save Attendance"}
 </button>
 </div>

 {saved && (
 <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.3)", borderRadius: 10 }}>
 <span style={{ color: "#30D158", fontWeight: 600 }}> Attendance saved successfully! {notificationQueueCount > 0 ? `${notificationQueueCount} parent notification${notificationQueueCount === 1 ? '' : 's'} queued.` : 'No parent notifications were queued.'}</span>
 </div>
 )}

 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 {loading && <div style={{ padding: 18, color: '#8892A4', fontSize: 13, textAlign: 'center' }}>Loading attendance...</div>}
 {scopeUnavailable ? (
 <div style={{ padding: 24, color: 'var(--apex-action-danger)', fontSize: 14, textAlign: 'center' }}>Attendance data for this class, section and date is temporarily unavailable.</div>
 ) : visibleStudents.length === 0 ? (
 <div style={{ padding: 24, color: '#8892A4', fontSize: 14, textAlign: 'center' }}>
 No students found for this class, section or date.
 </div>
 ) : visibleStudents.map((s, i) => {
 const status = visibleAttendance[s.id];
 return (
 <div key={s.id} style={{
 display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 12,
 background: status === "present" ? "rgba(48,209,88,0.06)" : status === "absent" ? "rgba(255,55,95,0.06)" : status === "late" ? "rgba(255,159,10,0.06)" : status === "leave" ? "rgba(10,132,255,0.06)" : "rgba(15,23,42,0.46)",
 border: `1px solid ${status === "present" ? "rgba(48,209,88,0.2)" : status === "absent" ? "rgba(255,55,95,0.2)" : status === "late" ? "rgba(255,159,10,0.2)" : status === "leave" ? "rgba(10,132,255,0.2)" : "rgba(200,153,26,0.1)"}`,
 }}>
 <span style={{ color: "var(--apex-text-tertiary)", fontSize: 13, width: 24 }}>{i + 1}</span>
 <span style={{ fontSize: 28 }}>{s.photo}</span>
 <div style={{ flex: 1 }}>
 <div style={{ color: "var(--apex-text-secondary)", fontWeight: 600, fontSize: 14 }}>{s.name}</div>
 <div style={{ color: "var(--apex-text-tertiary)", fontSize: 12 }}>{s.gr}</div>
 </div>
 <div style={{ display: "flex", gap: 8 }}>
 {[
 { key: "present", label: "Present", color: "#30D158", bg: "rgba(48,209,88," },
 { key: "absent", label: "Absent", color: "#FF375F", bg: "rgba(255,55,95," },
 { key: "late", label: "Late", color: "#FF9F0A", bg: "rgba(255,159,10," },
 { key: "leave", label: "Leave", color: "#0A84FF", bg: "rgba(10,132,255," },
 ].map(btn => (
 <button key={btn.key} onClick={() => setStatus(s.id, btn.key)}
 style={{
 padding: "7px 16px", borderRadius: 8, border: `1px solid ${status === btn.key ? btn.color : "rgba(148,163,184,0.18)"}`,
 background: status === btn.key ? `${btn.bg}0.15)` : "transparent",
 color: status === btn.key ? btn.color : "#8892A4",
 fontWeight: 600, fontSize: 12, cursor: "pointer",
 }}>
 {btn.label}
 </button>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* ANALYTICS TAB */}
 {tab === "analytics" && (
 <div>
 {analyticsError && (
 <div className="super-module-card" style={{ ...card, marginBottom:16, padding:'12px 14px', color:'var(--apex-action-danger)', border:'1px solid color-mix(in srgb,var(--apex-action-danger) 30%,transparent)' }}>
 {analyticsError}
 </div>
 )}
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
 <div className="super-module-card" style={card}>
 <h3 style={{ color: "var(--apex-action-highlight)", fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Monthly Attendance — {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
 <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
 {monthlyTrend.some(day => Number(day.total || 0) > 0) ? monthlyTrend.map((day, i) => {
 const pct = Number(day.percent || 0)
 return (
 <div key={day.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
 <div style={{ width: "100%", height: Math.max(4, pct * 1.2), borderRadius: 3, background: pct >= 90 ? "var(--apex-action-success)" : pct >= 80 ? "var(--apex-action-highlight)" : "var(--apex-action-danger)" }} />
 {(i + 1) % 5 === 0 && <span style={{ color: "var(--apex-text-tertiary)", fontSize: 8 }}>{i + 1}</span>}
 </div>
 )
 }) : <div style={{ width:'100%', alignSelf:'center', textAlign:'center', color:'var(--apex-text-tertiary)', fontSize:12 }}>No attendance records for this month.</div>}
 </div>
 <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
 {[["var(--apex-action-success)", "≥90%"], ["var(--apex-action-highlight)", "≥80%"], ["var(--apex-action-danger)", "Below 80%"]].map(([c, l]) => (
 <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
 <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
 <span style={{ color: "var(--apex-text-tertiary)", fontSize: 11 }}>{l}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="super-module-card" style={card}>
 <h3 style={{ color: "var(--apex-action-highlight)", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Class-wise Attendance %</h3>
 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 {monthlyClassSummary.length ? monthlyClassSummary.map(row => {
 const pct = Number(row.percent || 0);
 return (
 <div key={row.class} style={{ display: "flex", alignItems: "center", gap: 10 }}>
 <span style={{ color: "var(--apex-text-tertiary)", fontSize: 12, width: 72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={row.class}>{row.class}</span>
 <div style={{ flex: 1, height: 18, background: "var(--apex-bg-surface)", borderRadius: 6, overflow: "hidden" }}>
 <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: pct >= 90 ? "var(--apex-action-success)" : pct >= 80 ? "var(--apex-action-highlight)" : "var(--apex-action-danger)", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 8, minWidth:pct > 0 ? 34 : 0 }}>
 <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{pct}%</span>
 </div>
 </div>
 <span style={{ color:'var(--apex-text-tertiary)', fontSize:10, width:64, textAlign:'right' }}>{row.present}/{row.total}</span>
 </div>
 );
 }) : <div style={{ color:'var(--apex-text-tertiary)', fontSize:12, padding:'16px 0', textAlign:'center' }}>No class attendance records for this month.</div>}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* SMS REPORT TAB */}
 {tab === "report" && (
 <div className="super-module-card" style={card}>
 <h3 style={{ color: "var(--apex-action-highlight)", fontSize: 15, fontWeight: 700, marginBottom: 16 }}> SMS/WhatsApp Notifications</h3>
 <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 12 }}>
 <p style={{ color: "#0A84FF", fontSize: 13, margin: 0 }}>
 Attendance alerts for absent/late students are queued after a successful save when a valid parent contact and messaging configuration are available. Delivery is not claimed until provider confirmation is recorded.
 </p>
 </div>
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {visibleStudents.slice(0, 3).map(s => (
 <div key={s.id} style={{ padding: "14px 18px", background: "var(--apex-bg-subtle)", borderRadius: 12, border: "1px solid var(--apex-border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <span style={{ fontSize: 24 }}>{s.photo}</span>
 <div>
 <div style={{ color: "var(--apex-text-secondary)", fontWeight: 600 }}>{s.name}</div>
 <div style={{ color: "var(--apex-text-tertiary)", fontSize: 12 }}>Parent contact: {s.parent_phone || s.parent_whatsapp || 'Not available'}</div>
 </div>
 </div>
 <span style={{ padding: "4px 12px", background: "var(--apex-bg-surface-solid)", border: "1px solid var(--apex-border-default)", borderRadius: 20, fontSize: 12, color: "var(--apex-text-secondary)", fontWeight: 600 }}>{s.parent_phone || s.parent_whatsapp ? 'Contact ready' : 'No contact'}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
