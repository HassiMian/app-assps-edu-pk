import { useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, Users, GraduationCap, BookOpen, Zap, Target, Loader2, Activity } from 'lucide-react'

// --- Pure SVG Radar Chart Component ---
const RadarChart = ({ data, size = 360 }) => {
 const center = size / 2
 const radius = (size / 2) * 0.7
 const angleStep = (Math.PI * 2) / data.length

 const getPoint = (value, index) => {
 const angle = index * angleStep - Math.PI / 2
 const dist = (value / 100) * radius
 return {
 x: center + dist * Math.cos(angle),
 y: center + dist * Math.sin(angle)
 }
 }

 const pointsA = data.map((d, i) => getPoint(d.A, i)).map(p => `${p.x},${p.y}`).join(' ')
 const pointsB = data.map((d, i) => getPoint(d.B, i)).map(p => `${p.x},${p.y}`).join(' ')

 return (
 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} preserveAspectRatio="xMidYMid meet" style={{ width:'100%', maxWidth:size, height:'auto', display:'block' }}>
 {/* Grid Lines */}
 {[20, 40, 60, 80, 100].map(r => (
 <polygon key={r} points={data.map((_, i) => {
 const p = getPoint(r, i); return `${p.x},${p.y}`
 }).join(' ')} fill="none" stroke="rgba(148, 163, 184, 0.1)" />
 ))}
 {/* Axis Lines */}
 {data.map((d, i) => {
 const p = getPoint(100, i)
 return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(148, 163, 184, 0.1)" />
 })}
 {/* Data Polygons */}
 <polygon points={pointsB} fill="rgba(16, 185, 129, 0.12)" stroke="#10b981" strokeWidth="3" />
 <polygon points={pointsA} fill="rgba(59, 130, 246, 0.22)" stroke="#3b82f6" strokeWidth="3" />
 {/* Labels */}
 {data.map((d, i) => {
 const p = getPoint(115, i)
 return <text key={i} x={p.x} y={p.y} fill="#94a3b8" fontSize="10.5" fontWeight="800" textAnchor="middle" alignmentBaseline="middle">{d.subject}</text>
 })}
 </svg>
 )
}

// --- Pure SVG Bar Chart Component ---
const BarChart = ({ data }) => {
 const maxVal = 100
 return (
 <div className="h-full min-h-[250px] flex items-stretch gap-4 px-1 pt-3 pb-1">
 {data.map((d, i) => {
 const h1 = (d.avg / maxVal) * 100
 const h2 = (d.aiTarget / maxVal) * 100
 return (
 <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-3 group">
 <div className="relative w-full flex-1 min-h-[210px] flex items-end gap-1.5 rounded-xl border border-slate-700/40 bg-slate-950/20 px-2 pt-8 pb-2 overflow-hidden">
 <div className="absolute inset-x-2 bottom-2 top-8 flex flex-col justify-between pointer-events-none">
 {[0, 1, 2, 3].map((line) => (
 <span key={line} className="border-t border-slate-600/20" />
 ))}
 </div>
 <div
 style={{ height: `${h1}%` }}
 className="relative z-10 flex-1 min-w-[10px] bg-gradient-to-t from-blue-600 to-blue-300 rounded-t-md shadow-lg shadow-blue-500/20"
 title={`Current ${d.avg}%`}
 />
 <div
 style={{ height: `${h2}%` }}
 className="relative z-10 flex-1 min-w-[10px] bg-gradient-to-t from-emerald-600 to-emerald-300 rounded-t-md shadow-lg shadow-emerald-500/10"
 title={`AI Target ${d.aiTarget}%`}
 />
 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
 {d.avg}/{d.aiTarget}
 </span>
 </div>
 <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{d.grade}</span>
 </div>
 )
 })}
 </div>
 )
}

export default function AIAnalytics() {
 const [loading] = useState(false)
 const [timeRange, setTimeRange] = useState('30d')

 const radarData = [
 { subject: 'Math', A: 85, B: 78 },
 { subject: 'Physics', A: 72, B: 68 },
 { subject: 'Chemistry', A: 80, B: 75 },
 { subject: 'Biology', A: 76, B: 82 },
 { subject: 'CS', A: 92, B: 88 },
 { subject: 'English', A: 88, B: 84 },
 { subject: 'Urdu', A: 90, B: 86 },
 ]

 const gradeData = [
 { grade: 'G-6', avg: 78, aiTarget: 80 },
 { grade: 'G-7', avg: 74, aiTarget: 78 },
 { grade: 'G-8', avg: 71, aiTarget: 75 },
 { grade: 'G-9', avg: 76, aiTarget: 78 },
 { grade: 'G-10', avg: 82, aiTarget: 80 },
 { grade: 'G-11', avg: 85, aiTarget: 82 },
 { grade: 'G-12', avg: 88, aiTarget: 85 },
 ]

 const insights = [
 { id: '1', type: 'risk', title: 'At-Risk Students Detected', description: '23 students showing declining performance across multiple subjects. Immediate intervention recommended.', studentCount: 23, severity: 'high', grade: 'Grade 10' },
 { id: '2', type: 'performance', title: 'Top Performers Cluster', description: '156 students consistently scoring above 90%. Consider advanced placement programs.', studentCount: 156, severity: 'low', grade: 'All Grades' },
 { id: '3', type: 'behavior', title: 'Attendance Pattern Anomaly', description: 'Unusual spike in absenteeism on Fridays in Grade 9. Investigate potential causes.', studentCount: 45, severity: 'medium', grade: 'Grade 9' },
 { id: '4', type: 'recommendation', title: 'AI Tutor Engagement Low', description: 'Only 34% of students actively using AI homework help. Marketing campaign suggested.', studentCount: 820, severity: 'medium', grade: 'All Grades' },
 ]

 const typeConfig = {
 performance: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Performance' },
 risk: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Risk Alert' },
 behavior: { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Behavior' },
 recommendation: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', label: 'Recommendation' },
 }

 const severityColors = {
 low: 'text-emerald-400',
 medium: 'text-amber-400',
 high: 'text-orange-400',
 critical: 'text-red-400',
 }

 return (
 <div className="animate-fade-in-up" style={{ display:'flex', flexDirection:'column', gap:22, width:'100%', maxWidth:1280, margin:'0 auto', minWidth:0 }}>
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div className="flex items-center gap-3">
 <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 bg-opacity-20 shadow-lg shadow-cyan-500/20">
 <Brain className="w-6 h-6 text-cyan-400" />
 </div>
 <div>
 <h3 className="text-white font-bold text-2xl tracking-tight">AI Analytics & Insights</h3>
 <p className="text-slate-400 text-sm">Real-time machine learning analysis of Al-Siddique OS data</p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
 <option value="7d">Last 7 Days</option>
 <option value="30d">Last 30 Days</option>
 <option value="90d">Last 3 Months</option>
 </select>
 <button className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
 <Activity className="w-5 h-5" />
 </button>
 </div>
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5" style={{ alignItems:'stretch' }}>
 <div className="glass-card p-5 border-l-4 border-blue-500" style={{ minHeight:360, display:'flex', flexDirection:'column', overflow:'hidden' }}>
 <div className="flex justify-between items-start gap-4 mb-6" style={{ flexShrink:0 }}>
 <div>
 <h3 className="text-lg font-bold text-white">Subject Performance Radar</h3>
 <p className="text-slate-400 text-xs mt-1">Current Average vs AI Benchmark</p>
 </div>
 <div className="flex gap-4 text-[10px] uppercase font-bold tracking-wider">
 <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Current</span>
 <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> AI Target</span>
 </div>
 </div>
 <div className="flex items-center justify-center" style={{ minHeight:260, flex:1 }}>
 <RadarChart data={radarData} size={340} />
 </div>
 </div>

 <div className="glass-card p-5 border-l-4 border-emerald-500" style={{ minHeight:360, display:'flex', flexDirection:'column', overflow:'hidden' }}>
 <div className="flex justify-between items-start gap-4 mb-6" style={{ flexShrink:0 }}>
 <div>
 <h3 className="text-lg font-bold text-white">Grade-Level Comparison</h3>
 <p className="text-slate-400 text-xs mt-1">Institutional scoring trends across grades</p>
 </div>
 <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider">
 <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Average</span>
 <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> AI Target</span>
 </div>
 </div>
 <div style={{ minHeight:250, flex:1 }}>
 <BarChart data={gradeData} />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" style={{ clear:'both' }}>
 {[
 { label: 'Insights Generated', value: 47, icon: Brain, color: 'from-cyan-500 to-blue-500' },
 { label: 'Predictions Accuracy', value: '91.2%', icon: Target, color: 'from-emerald-500 to-teal-500' },
 { label: 'At-Risk Detected', value: 23, icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
 { label: 'Recommendations', value: 18, icon: Zap, color: 'from-amber-500 to-orange-500' },
 ].map((stat, idx) => (
 <div key={idx} className="glass-card p-5 flex items-center gap-4 group" style={{ minHeight:96, overflow:'hidden' }}>
 <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 transition-transform group-hover:scale-110`}><stat.icon className="w-6 h-6 text-white" /></div>
 <div style={{ minWidth:0 }}><p className="text-slate-400 text-sm font-medium leading-snug">{stat.label}</p><p className="text-2xl font-bold text-white">{stat.value}</p></div>
 </div>
 ))}
 </div>

 <div className="glass-card p-5 md:p-6" style={{ overflow:'hidden', width:'100%' }}>
 <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
 <Zap className="w-5 h-5 text-amber-400" />
 AI Generated Insights & Recommendations
 </h3>
 {loading ? (
 <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /></div>
 ) : (
 <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
 {insights.map((insight) => {
 const config = typeConfig[insight.type];
 const Icon = config.icon;
 return (
 <div key={insight.id} className={`p-5 rounded-xl border ${config.bg} grid grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-start group cursor-pointer hover:bg-slate-800/40 transition-all`} style={{ minHeight:112, overflow:'hidden' }}>
 <div className={`p-3 rounded-xl ${config.bg} ${config.color}`} style={{ gridRow:'span 2' }}>
 <Icon className="w-5 h-5" />
 </div>
 <div className="flex-1" style={{ minWidth:0 }}>
 <div className="flex flex-wrap items-center gap-2 mb-2">
 <h4 className="text-white font-bold text-base leading-tight">{insight.title}</h4>
 <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${severityColors[insight.severity]} border-current opacity-70`}>{insight.severity}</span>
 </div>
 <p className="text-slate-300 text-sm md:text-[15px] leading-relaxed mb-3 max-w-[980px]">{insight.description}</p>
 <div className="flex gap-x-5 gap-y-2 text-xs text-slate-500 font-medium" style={{ flexWrap:'wrap' }}>
 <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {insight.studentCount} students impacted</span>
 {insight.grade && <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {insight.grade}</span>}
 {insight.subject && <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> {insight.subject}</span>}
 </div>
 </div>
 <div className="col-start-2 lg:col-start-auto lg:justify-self-end opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
 <button className="text-cyan-400 text-xs font-bold underline whitespace-nowrap">Take Action</button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 )
}
