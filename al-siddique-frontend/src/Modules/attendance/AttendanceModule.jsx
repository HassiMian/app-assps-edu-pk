import { useState, useEffect } from "react";
import {
 Check, X, Clock, Users, Calendar,
 ChevronDown, Save, Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { DonutChart, BarChart, ChartLegend } from "../../components/Charts";
import { useAcademicStore } from "../../services/useAcademicStore";

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
})

const card = {
 background: "rgba(11,44,77,0.92)", backdropFilter: "blur(20px)",
 border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: 24,
};

const btnPrimary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "linear-gradient(135deg, #C8991A, #e8b420)",
 color: "#071e34", border: "none", borderRadius: 10,
 padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

const btnSecondary = {
 display: "flex", alignItems: "center", gap: 8,
 background: "rgba(11,44,77,0.6)", color: "#C0C8D8",
 border: "1px solid rgba(200,153,26,0.2)", borderRadius: 10,
 padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer",
};

const selectStyle = {
 padding: "10px 14px", borderRadius: 10,
 background: "rgba(7,22,40,0.92)", border: "1px solid rgba(200,153,26,0.2)",
 color: "#C0C8D8", fontSize: 14, outline: "none", cursor: "pointer",
};

export default function AttendanceModule() {
 const navigate = useNavigate();
 const [tab, setTab] = useState("mark");
 const { classNames: CLASSES, allSections: SECTION_LIST, sectionsForClass } = useAcademicStore();

 useEffect(() => {
 if (tab === "smart") {
 navigate("/attendance/qr-scan");
 setTab("mark");
 }
 }, [tab, navigate]);

 const [selectedClass, setSelectedClass] = useState(CLASSES[0] || "Class 6");
 const [selectedSection, setSelectedSection] = useState("Blue");
 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
 const [students, setStudents] = useState([]);
 const [attendance, setAttendance] = useState({});
 const [saved, setSaved] = useState(false);
 const [loading, setLoading] = useState(false);

 const loadAttendance = async () => {
 setLoading(true)
 try {
 const attendanceRes = await api.get('/api/attendance', {
 params: { class: selectedClass, section: selectedSection, date: selectedDate },
 })
 const attendanceData = attendanceRes.data?.data || []
 if (attendanceData.length) {
 setStudents(attendanceData.map(transformAttendanceRow))
 setAttendance(attendanceData.reduce((acc, row) => { acc[row.student_id] = row.status; return acc }, {}))
 return
 }
 const studentRes = await api.get('/api/students', { params: { class: selectedClass, section: selectedSection } })
 setStudents((studentRes.data?.data || []).map(transformStudent))
 setAttendance({})
 } catch (err) {
 console.error('Could not load attendance', err)
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

 const setStatus = (id, status) => {
 setAttendance(prev => ({ ...prev, [id]: status }));
 setSaved(false);
 };

 const markAll = (status) => {
 const all = {};
 students.forEach(s => { all[s.id] = status })
 setAttendance(all);
 setSaved(false);
 };

 const presentCount = Object.values(attendance).filter(v => v === "present").length;
 const absentCount = Object.values(attendance).filter(v => v === "absent").length;
 const lateCount = Object.values(attendance).filter(v => v === "late").length;
 const leaveCount = Object.values(attendance).filter(v => v === "leave").length;
 const unmarked = students.length - Object.keys(attendance).length;

 const handleSave = async () => {
 try {
 const records = students.map((s) => ({
 student_id: s.id,
 date: selectedDate,
 status: attendance[s.id] || 'absent',
 }))
 await api.post('/api/attendance/mark', { records })
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 } catch (err) {
 console.error('Failed to save attendance', err)
 }
 };

 const tabs = [
 { key: "mark", label: "Mark Attendance", icon: "" },
 { key: "smart", label: "Smart Scan ", icon: "" },
 { key: "analytics", label: "Analytics", icon: "" },
 { key: "report", label: "SMS Report", icon: "" },
 ];

 const attDashCard = { background: 'rgba(11,44,77,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 22, padding: 20 };
 const attDashTitle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };
 const totalStudents = students.length;

 return (
 <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>

 {/* Header */}
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <div style={{ width: 42, height: 42, borderRadius: 14, background: "rgba(48,209,88,0.15)", border: "1px solid rgba(48,209,88,0.28)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Check size={22} color="#30D158" />
 </div>
 <div>
 <h1 style={{ color: "#C0C8D8", fontSize: 24, fontWeight: 800, margin: 0 }}>Attendance System</h1>
 <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>Session 2026-2027 · Mark & track student attendance</p>
 </div>
 </div>
 </div>

 {/*  Attendance Dashboard  */}
 {/* Stats Cards */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
 {[
 { label: 'Present', value: presentCount, icon: '', grad: 'linear-gradient(135deg,rgba(48,209,88,0.18),rgba(48,209,88,0.06))' },
 { label: 'Absent', value: absentCount, icon: '', grad: 'linear-gradient(135deg,rgba(255,55,95,0.18),rgba(255,55,95,0.06))' },
 { label: 'Late', value: lateCount, icon: '', grad: 'linear-gradient(135deg,rgba(255,159,10,0.18),rgba(255,159,10,0.06))' },
 { label: 'Leave', value: leaveCount, icon: '', grad: 'linear-gradient(135deg,rgba(10,132,255,0.18),rgba(10,132,255,0.06))' },
 { label: 'Total Students', value: totalStudents, icon: '', grad: 'linear-gradient(135deg,rgba(10,132,255,0.18),rgba(10,132,255,0.06))' },
 ].map(c => (
 <div key={c.label} style={{ ...attDashCard, background: c.grad, padding: '16px 18px', borderRadius: 22 }}>
 <div style={{ fontSize: 22 }}>{c.icon}</div>
 <div style={{ color: 'white', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{c.value}</div>
 <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{c.label}</div>
 </div>
 ))}
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
 const total = students.length || 1
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
 <div style={{ color:"#8892A4", fontSize:11 }}>{presentCount} of {students.length} students present</div>
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
 <div style={{ display: "flex", gap: 4, background: "rgba(7,30,52,0.5)", borderRadius: 14, padding: 4, marginBottom: 24, width: "fit-content", border:"1px solid rgba(148,163,184,0.18)", boxShadow: "0 8px 24px rgba(7,30,52,0.18)" }}>
 {tabs.map(t => (
 <button key={t.key} onClick={() => setTab(t.key)}
 style={{ padding: "10px 20px", borderRadius: 12, border: "none", cursor: "pointer", background: tab === t.key ? "linear-gradient(135deg, #C8991A, #e8b420)" : "transparent", color: tab === t.key ? "#071e34" : "#8892A4", fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>
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
 {CLASSES.map(c => <option key={c}>{c}</option>)}
 </select>
 <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} style={selectStyle}>
 {(sectionsForClass(selectedClass).length ? sectionsForClass(selectedClass) : SECTION_LIST.filter(item => item !== 'All')).map(s => <option key={s}>{s}</option>)}
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
 { label: "Unmarked", value: unmarked, color: "#8892A4", bg: "rgba(136,146,164,0.1)" },
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
 <h3 style={{ color: "#C8991A", fontSize: 15, fontWeight: 700, margin: 0 }}>
 {selectedClass} — Section {selectedSection} · {selectedDate}
 </h3>
 <button onClick={handleSave} style={btnPrimary}>
 <Save size={16} /> {saved ? "Saved! " : "Save Attendance"}
 </button>
 </div>

 {saved && (
 <div style={{ marginBottom: 16, padding: "10px 16px", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.3)", borderRadius: 10 }}>
 <span style={{ color: "#30D158", fontWeight: 600 }}> Attendance saved successfully! SMS notifications sent to absent students.</span>
 </div>
 )}

 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 {loading && <div style={{ padding: 18, color: '#8892A4', fontSize: 13, textAlign: 'center' }}>Loading attendance...</div>}
 {students.length === 0 ? (
 <div style={{ padding: 24, color: '#8892A4', fontSize: 14, textAlign: 'center' }}>
 No students found for this class, section or date.
 </div>
 ) : students.map((s, i) => {
 const status = attendance[s.id];
 return (
 <div key={s.id} style={{
 display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 12,
 background: status === "present" ? "rgba(48,209,88,0.06)" : status === "absent" ? "rgba(255,55,95,0.06)" : status === "late" ? "rgba(255,159,10,0.06)" : status === "leave" ? "rgba(10,132,255,0.06)" : "rgba(15,23,42,0.46)",
 border: `1px solid ${status === "present" ? "rgba(48,209,88,0.2)" : status === "absent" ? "rgba(255,55,95,0.2)" : status === "late" ? "rgba(255,159,10,0.2)" : status === "leave" ? "rgba(10,132,255,0.2)" : "rgba(200,153,26,0.1)"}`,
 }}>
 <span style={{ color: "#8892A4", fontSize: 13, width: 24 }}>{i + 1}</span>
 <span style={{ fontSize: 28 }}>{s.photo}</span>
 <div style={{ flex: 1 }}>
 <div style={{ color: "#C0C8D8", fontWeight: 600, fontSize: 14 }}>{s.name}</div>
 <div style={{ color: "#8892A4", fontSize: 12 }}>{s.gr}</div>
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
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
 <div className="super-module-card" style={card}>
 <h3 style={{ color: "#C8991A", fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Monthly Attendance — May 2026</h3>
 <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
 {Array.from({ length: 26 }, (_, i) => {
 const pct = Math.floor(Math.random() * 30) + 70;
 return (
 <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
 <div style={{ width: "100%", height: pct * 1.2, borderRadius: 3, background: pct >= 90 ? "#30D158" : pct >= 80 ? "#C8991A" : "#FF375F" }} />
 {(i + 1) % 5 === 0 && <span style={{ color: "#8892A4", fontSize: 8 }}>{i + 1}</span>}
 </div>
 );
 })}
 </div>
 <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
 {[["#30D158", "≥90%"], ["#C8991A", "≥80%"], ["#FF375F", "Below 80%"]].map(([c, l]) => (
 <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
 <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
 <span style={{ color: "#8892A4", fontSize: 11 }}>{l}</span>
 </div>
 ))}
 </div>
 </div>

 <div className="super-module-card" style={card}>
 <h3 style={{ color: "#C8991A", fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Class-wise Attendance %</h3>
 <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
 {CLASSES.slice(0, 7).map(c => {
 const pct = Math.floor(Math.random() * 20) + 78;
 return (
 <div key={c} style={{ display: "flex", alignItems: "center", gap: 10 }}>
 <span style={{ color: "#8892A4", fontSize: 12, width: 60 }}>{c}</span>
 <div style={{ flex: 1, height: 18, background: "rgba(11,44,77,0.92)", borderRadius: 6, overflow: "hidden" }}>
 <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#30D158" : pct >= 80 ? "#C8991A" : "#FF375F", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 8 }}>
 <span style={{ color: "white", fontSize: 10, fontWeight: 700 }}>{pct}%</span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* SMS REPORT TAB */}
 {tab === "report" && (
 <div className="super-module-card" style={card}>
 <h3 style={{ color: "#C8991A", fontSize: 15, fontWeight: 700, marginBottom: 16 }}> SMS/WhatsApp Notifications</h3>
 <div style={{ marginBottom: 20, padding: "14px 18px", background: "rgba(10,132,255,0.08)", border: "1px solid rgba(10,132,255,0.2)", borderRadius: 12 }}>
 <p style={{ color: "#0A84FF", fontSize: 13, margin: 0 }}>
 ℹ When attendance is saved, SMS is automatically sent to parents of absent students via WhatsApp Business API.
 </p>
 </div>
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {students.slice(0, 3).map(s => (
 <div key={s.id} style={{ padding: "14px 18px", background: "rgba(7,30,52,0.4)", borderRadius: 12, border: "1px solid rgba(200,153,26,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
 <span style={{ fontSize: 24 }}>{s.photo}</span>
 <div>
 <div style={{ color: "#C0C8D8", fontWeight: 600 }}>{s.name}</div>
 <div style={{ color: "#8892A4", fontSize: 12 }}>Parent: 0300-1234567</div>
 </div>
 </div>
 <span style={{ padding: "4px 12px", background: "rgba(48,209,88,0.1)", border: "1px solid rgba(48,209,88,0.3)", borderRadius: 20, fontSize: 12, color: "#30D158", fontWeight: 600 }}>SMS Sent </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
