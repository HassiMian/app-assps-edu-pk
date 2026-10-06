import { useEffect, useState } from 'react'
import { Brain, TrendingUp, AlertTriangle, Users, GraduationCap, BookOpen, Zap, Loader2, Activity, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

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
 const h2 = (d.threshold / maxVal) * 100
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
 title={`Pass threshold ${d.threshold}%`}
 />
 <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
 {d.avg}/{d.threshold}
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
 const navigate = useNavigate()
 const [loading, setLoading] = useState(true)
 const [timeRange, setTimeRange] = useState('30d')
 const [analytics, setAnalytics] = useState({ insights:[], subjectPerformance:[], classPerformance:[] })
 const [error, setError] = useState('')

 async function loadAnalytics(range = timeRange) {
 setLoading(true)
 setError('')
 try {
 const response = await api.get('/api/ai-analytics', { params:{ range }, skipCache:true })
 const data = response.data?.data || {}
 setAnalytics({
 insights:Array.isArray(data.insights) ? data.insights : [],
 subjectPerformance:Array.isArray(data.subjectPerformance) ? data.subjectPerformance : [],
 classPerformance:Array.isArray(data.classPerformance) ? data.classPerformance : [],
 })
 } catch (err) {
 console.error('Analytics load failed', err)
 setAnalytics({ insights:[], subjectPerformance:[], classPerformance:[] })
 setError(err.response?.data?.message || 'Live analytics could not be loaded.')
 } finally { setLoading(false) }
 }

 useEffect(() => {
 // eslint-disable-next-line react-hooks/set-state-in-effect
 void loadAnalytics(timeRange)
 }, [timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

 const radarData = analytics.subjectPerformance.slice(0, 8).map(item => ({
 subject:String(item.subject || '').slice(0, 12),
 A:Number(item.average || 0),
 B:50,
 }))
 const gradeData = analytics.classPerformance.slice(0, 12).map(item => ({
 grade:item.className || 'Class',
 avg:Number(item.average || 0),
 threshold:50,
 studentCount:Number(item.studentCount || 0),
 }))
 const insights = analytics.insights

 const typeConfig = {
 performance: { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Performance' },
 risk: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Risk Alert' },
 behavior: { icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Behavior' },
 recommendation: { icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', label: 'Recommendation' },
 }
 const severityColors = { low:'text-emerald-400', medium:'text-amber-400', high:'text-orange-400', critical:'text-red-400' }
 const assessedStudents = Math.max(0, ...gradeData.map(item => item.studentCount || 0))
 const avgPerformance = gradeData.length ? Math.round(gradeData.reduce((sum,item)=>sum+item.avg,0)/gradeData.length) : null

 const actionPath = insight => insight.type === 'risk' ? '/examination/results' : insight.type === 'performance' ? '/examination/results' : '/attendance'

 return (
 <div className="animate-fade-in-up" style={{ display:'flex', flexDirection:'column', gap:22, width:'100%', maxWidth:1280, margin:'0 auto', minWidth:0 }}>
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <div className="flex items-center gap-3">
 <div style={{ padding:12,borderRadius:16,background:'color-mix(in srgb,var(--apex-action-primary) 12%,var(--apex-bg-surface-solid))',border:'1px solid var(--apex-border-default)',boxShadow:'var(--apex-shadow-sm)' }}><Brain className="w-6 h-6" style={{ color:'var(--apex-action-primary)' }} /></div>
 <div><h3 style={{ color:'var(--apex-text-primary)',fontWeight:800,fontSize:26,letterSpacing:'-.02em',margin:0 }}>Analytics & Insights</h3><p style={{ color:'var(--apex-text-tertiary)',fontSize:13,margin:'4px 0 0' }}>Source-backed analysis from live school records. No synthetic student or result data.</p></div>
 </div>
 <div className="flex items-center gap-3">
 <select value={timeRange} onChange={e=>setTimeRange(e.target.value)} style={{ minHeight:42,padding:'8px 12px',borderRadius:12,background:'var(--apex-bg-surface-solid)',border:'1px solid var(--apex-border-default)',color:'var(--apex-text-primary)' }}><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="90d">Last 3 Months</option></select>
 <button aria-label="Refresh analytics" title="Refresh live analytics" onClick={()=>void loadAnalytics()} disabled={loading} style={{ width:42,height:42,borderRadius:12,border:'1px solid var(--apex-border-default)',background:'var(--apex-bg-surface-solid)',color:'var(--apex-text-secondary)',display:'grid',placeItems:'center',cursor:'pointer' }}>{loading?<Loader2 className="w-5 h-5 animate-spin"/>:<RefreshCw className="w-5 h-5"/>}</button>
 </div>
 </div>

 {error && <div style={{ padding:14,borderRadius:14,border:'1px solid color-mix(in srgb,var(--apex-action-danger) 28%,var(--apex-border-default))',background:'color-mix(in srgb,var(--apex-action-danger) 7%,var(--apex-bg-surface-solid))',color:'var(--apex-action-danger)',fontSize:13,fontWeight:700 }}>{error}</div>}

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {[{ label:'Classes with results', value:gradeData.length || '—', color:'var(--apex-action-primary)' },{ label:'Average performance', value:avgPerformance==null?'—':`${avgPerformance}%`, color:'var(--apex-action-success)' },{ label:'Largest assessed class set', value:assessedStudents || '—', color:'var(--apex-action-highlight)' }].map(item=><div key={item.label} style={{ padding:18,borderRadius:18,background:'var(--apex-bg-surface)',border:'1px solid var(--apex-border-default)',boxShadow:'var(--apex-shadow-sm)' }}><div style={{ color:item.color,fontSize:25,fontWeight:850 }}>{item.value}</div><div style={{ color:'var(--apex-text-tertiary)',fontSize:12,marginTop:5 }}>{item.label}</div></div>)}
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5" style={{ alignItems:'stretch' }}>
 <div style={{ minHeight:360,display:'flex',flexDirection:'column',overflow:'hidden',padding:20,borderRadius:20,background:'var(--apex-bg-surface)',border:'1px solid var(--apex-border-default)',boxShadow:'var(--apex-shadow-sm)' }}>
 <div className="flex justify-between items-start gap-4 mb-6"><div><h3 style={{ color:'var(--apex-text-primary)',fontWeight:800,fontSize:18 }}>Subject Performance</h3><p style={{ color:'var(--apex-text-tertiary)',fontSize:12,marginTop:4 }}>Live average vs 50% pass threshold</p></div><div className="flex gap-4 text-[10px] uppercase font-bold tracking-wider"><span className="flex items-center gap-1.5" style={{ color:'var(--apex-action-primary)' }}><span className="w-2 h-2 rounded-full" style={{ background:'var(--apex-action-primary)' }}></span> Current</span><span className="flex items-center gap-1.5" style={{ color:'var(--apex-action-success)' }}><span className="w-2 h-2 rounded-full" style={{ background:'var(--apex-action-success)' }}></span> Pass line</span></div></div>
 <div className="flex items-center justify-center flex-1 min-h-[250px]">{loading?<Loader2 className="w-8 h-8 animate-spin" style={{ color:'var(--apex-action-primary)' }}/>:radarData.length>=3?<RadarChart data={radarData} size={340}/>:<div style={{ color:'var(--apex-text-tertiary)',fontSize:13,textAlign:'center' }}>Not enough live subject-result data for a radar chart.</div>}</div>
 </div>

 <div style={{ minHeight:360,display:'flex',flexDirection:'column',overflow:'hidden',padding:20,borderRadius:20,background:'var(--apex-bg-surface)',border:'1px solid var(--apex-border-default)',boxShadow:'var(--apex-shadow-sm)' }}>
 <div className="flex justify-between items-start gap-4 mb-5"><div><h3 style={{ color:'var(--apex-text-primary)',fontWeight:800,fontSize:18 }}>Class Performance</h3><p style={{ color:'var(--apex-text-tertiary)',fontSize:12,marginTop:4 }}>Live examination averages by class</p></div></div>
 <div className="flex-1 min-h-[280px]">{loading?<div className="h-full grid place-items-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color:'var(--apex-action-primary)' }}/></div>:gradeData.length?<BarChart data={gradeData}/>:<div className="h-full grid place-items-center" style={{ color:'var(--apex-text-tertiary)',fontSize:13 }}>No live class result data in this period.</div>}</div>
 </div>
 </div>

 <div style={{ padding:20,borderRadius:20,background:'var(--apex-bg-surface)',border:'1px solid var(--apex-border-default)',boxShadow:'var(--apex-shadow-sm)' }}>
 <div className="flex items-center justify-between gap-4 mb-5"><div><h3 style={{ color:'var(--apex-text-primary)',fontWeight:800,fontSize:18 }}>Verified Insights</h3><p style={{ color:'var(--apex-text-tertiary)',fontSize:12,marginTop:4 }}>Threshold-based findings calculated from recorded exam results</p></div></div>
 {loading?<div className="py-10 grid place-items-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color:'var(--apex-action-primary)' }}/></div>:insights.length===0?<div style={{ padding:28,textAlign:'center',color:'var(--apex-text-tertiary)',fontSize:13 }}>No threshold-based insights are available from recorded results in this period.</div>:<div className="grid gap-3">{insights.map(insight=>{ const config=typeConfig[insight.type]||typeConfig.recommendation; const Icon=config.icon; return <div key={insight.id} className="group" style={{ display:'grid',gridTemplateColumns:'auto minmax(0,1fr) auto',gap:14,alignItems:'start',padding:16,borderRadius:16,background:'var(--apex-bg-surface-solid)',border:'1px solid var(--apex-border-subtle)' }}><div className={`p-3 rounded-xl ${config.bg} ${config.color}`}><Icon className="w-5 h-5"/></div><div><div className="flex flex-wrap items-center gap-2 mb-2"><h4 style={{ color:'var(--apex-text-primary)',fontWeight:800,fontSize:15 }}>{insight.title}</h4><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${severityColors[insight.severity]||severityColors.medium} border-current opacity-70`}>{insight.severity||'info'}</span></div><p style={{ color:'var(--apex-text-secondary)',fontSize:13,lineHeight:1.55,margin:'0 0 9px' }}>{insight.description}</p><div className="flex gap-x-5 gap-y-2 text-xs" style={{ color:'var(--apex-text-tertiary)',flexWrap:'wrap' }}><span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/> {insight.studentCount||0} students</span>{insight.grade&&<span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5"/> {insight.grade}</span>}{insight.subject&&<span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/> {insight.subject}</span>}</div></div><button onClick={()=>navigate(actionPath(insight))} style={{ alignSelf:'center',border:0,background:'transparent',color:'var(--apex-action-primary)',fontSize:12,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap' }}>Take Action</button></div>})}</div>}
 </div>
 </div>
 )
}
