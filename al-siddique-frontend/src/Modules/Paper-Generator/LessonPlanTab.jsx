// LessonPlanTab.jsx — Al Siddique Smart School OS
// Full Bloom's taxonomy + Weekly/Annual planner + Auto-generate + Portal send

import { useState, useMemo } from 'react'
import { Edit, Trash2, X, Send, BookOpen, Plus, Printer, Check } from 'lucide-react'
import Portal from '../../components/Portal'
import { useAcademicStore } from '../../services/useAcademicStore'
import { usePaperStore } from './usePaperStore'

//  Storage 
const LP_KEY = 'al_siddique_lesson_plans'
function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}
const loadPlans = () => { try { return JSON.parse(getStorage()?.getItem(LP_KEY)) || [] } catch { return [] } }
const storePlans = (plans) => {
 const storage = getStorage()
 try { storage?.setItem(LP_KEY, JSON.stringify(plans)) } catch {}
}

//  Palette 
const C = {
 card: 'rgba(11,44,77,0.92)',
 gold: '#C8991A', goldL: '#e8b420',
 silver: '#C0C8D8', muted: '#8892A4',
 green: '#30D158', red: '#FF375F',
 blue: '#0A84FF', purple:'#BF5AF2',
 orange: '#FF9F0A',
 border: 'rgba(148,163,184,0.18)',
}

const BLOOM = [
 { key:'remember', label:'Remember', color:'#FF375F', emoji:'', verbs:'List, Define, Recall, Name, Identify, Memorise' },
 { key:'understand', label:'Understand', color:'#FF9F0A', emoji:'', verbs:'Explain, Summarise, Describe, Classify, Interpret' },
 { key:'apply', label:'Apply', color:'#30D158', emoji:'', verbs:'Use, Solve, Demonstrate, Calculate, Execute' },
 { key:'analyze', label:'Analyse', color:'#0A84FF', emoji:'', verbs:'Compare, Examine, Differentiate, Break down' },
 { key:'evaluate', label:'Evaluate', color:'#BF5AF2', emoji:'', verbs:'Judge, Justify, Critique, Assess, Defend' },
 { key:'create', label:'Create', color:'#C8991A', emoji:'', verbs:'Design, Construct, Compose, Plan, Produce' },
]

const PHASES = [
 { key:'intro', label:'Introduction / Set Induction', min:5, icon:'IN', color:'#0A84FF', tip:'Hook students, state objectives, activate prior knowledge' },
 { key:'present', label:'Presentation / Main Teaching', min:20, icon:'TE', color:'#30D158', tip:'Deliver new content, explain concepts, model & demonstrate' },
 { key:'practice', label:'Guided / Independent Practice', min:10, icon:'PR', color:'#BF5AF2', tip:'Students practise — with teacher support or independently' },
 { key:'closure', label:'Closure / Summary', min:5, icon:'CL', color:'#C8991A', tip:'Summarise key points, check understanding, preview next lesson' },
]

const METHODS = ['Direct Instruction','Class Discussion','Q&A (Questioning)','Demonstration','Group Work','Pair Work','Story / Anecdote','Video / Visual Aid','Hands-on Activity','Role Play','Brainstorming','Think-Pair-Share']
const ASSESSMENT_TYPES = ['Oral Q&A','Written Quiz','Exit Ticket','Class Observation','Peer Assessment','Assignment','Practical / Demo']
const PERIODS = ['1st','2nd','3rd','4th','5th','6th','7th','8th']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PLANNING_SCOPES = [
 { key:'daily', label:'Daily', hint:'Single day lesson plan' },
 { key:'weekly', label:'Weekly', hint:'One plan per week' },
 { key:'monthly', label:'Monthly', hint:'One plan per month' },
 { key:'term', label:'Term-wise', hint:'Term coverage plan' },
 { key:'annual', label:'Annual', hint:'Full year plan' },
]

const scopeLabel = (scope) => PLANNING_SCOPES.find(s => s.key === scope)?.label || 'Daily'
const isoDate = (date) => new Date(date).toISOString().slice(0, 10)

function planRangeLabel(scope, date, index = 0) {
 const d = new Date(date)
 if (scope === 'weekly') return `Week ${index + 1} - ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
 if (scope === 'monthly') return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
 if (scope === 'term') return `Term Week ${index + 1}`
 if (scope === 'annual') return `${d.getFullYear()} Annual Plan`
 return `Daily Plan - ${isoDate(d)}`
}

function buildPlanDates(startDate, scope, count) {
 const dates = []
 const start = new Date(startDate)

 if (scope === 'monthly' || scope === 'annual') {
 const total = scope === 'annual' ? 12 : count
 for (let i = 0; i < total; i += 1) {
 const d = new Date(start)
 d.setMonth(start.getMonth() + i)
 dates.push(isoDate(d))
 }
 return dates
 }

 const d = new Date(start)
 const needed = scope === 'daily' ? count * 5 : count
 while (dates.length < needed) {
 const dow = d.getDay()
 const ok = scope === 'daily' ? dow >= 1 && dow <= 5 : dow === 1
 if (ok) dates.push(isoDate(d))
 d.setDate(d.getDate() + 1)
 if (d - start > 365 * 86400000) break
 }
 return dates
}

//  Blank Plan Factory 
function blankPlan(overrides = {}) {
 return {
 id: `lp_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
 title: '',
 subject: '',
 classLevel: '',
 chapter: '',
 teacher: '',
 date: new Date().toISOString().slice(0, 10),
 planningScope: 'daily',
 planRangeLabel: '',
 endDate: '',
 period: '1st',
 duration: 40,
 objectives: ['Students will be able to '],
 bloom: [],
 materials: ['Textbook', 'Board & Marker'],
 priorKnowledge: '',
 phases: PHASES.map(p => ({ key: p.key, duration: p.min, method: '', teacherDoes: '', studentDoes: '' })),
 assessmentType: 'Oral Q&A',
 assessmentDesc: '',
 homework: '',
 advanced: '',
 struggling: '',
 reflection: '',
 sentToPortal: false,
 createdAt: new Date().toISOString(),
 ...overrides,
 }
}

//  Shared UI Atoms 
const GCard = ({ children, style = {} }) => (
 <div className="super-module-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, ...style }}>{children}</div>
)
const Lbl = ({ children, sub }) => (
 <label style={{ color: C.muted, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
 {children}
 {sub && <span style={{ color: 'rgba(136,146,164,0.6)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>{sub}</span>}
 </label>
)
const Inp = ({ style = {}, ...props }) => (
 <input {...props} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style }} />
)
const Sel = ({ children, style = {}, ...props }) => (
 <select {...props} style={{ width: '100%', background: '#0b2c4d', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 14px', fontSize: 14, outline: 'none', cursor: 'pointer', boxSizing: 'border-box', ...style }}>{children}</select>
)
const Txt = ({ style = {}, ...props }) => (
 <textarea {...props} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 14px', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', minHeight: 80, lineHeight: 1.6, ...style }} />
)
const Btn = ({ children, onClick, variant = 'gold', style: s = {}, disabled = false }) => {
 const v = {
 gold: { background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', border: 'none' },
 ghost: { background: 'rgba(15,23,42,0.46)', color: C.silver, border: `1px solid ${C.border}` },
 red: { background: 'rgba(255,55,95,0.15)', color: C.red, border: '1px solid rgba(255,55,95,0.3)' },
 blue: { background: 'rgba(10,132,255,0.15)', color: C.blue, border: '1px solid rgba(10,132,255,0.3)' },
 green: { background: 'rgba(48,209,88,0.15)', color: C.green, border: '1px solid rgba(48,209,88,0.3)' },
 purple: { background: 'rgba(191,90,242,0.15)', color: C.purple, border: '1px solid rgba(191,90,242,0.3)' },
 }
 return (
 <button onClick={onClick} disabled={disabled}
 style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, fontWeight: 600, fontSize:13, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace:'nowrap', opacity: disabled ? 0.5 : 1, ...v[variant], ...s }}>{children}</button>
 )
}
const SectionHead = ({ icon, title, color = C.gold }) => (
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
 <span style={{ fontSize:22 }}>{icon}</span>
 <h3 style={{ margin:0, color, fontSize:16, fontWeight:800 }}>{title}</h3>
 </div>
)

//  Toast 
function Toast({ message, color = C.green, onClose }) {
 return (
  <Portal>
  <div className="super-module-card" style={{ position:'fixed', bottom:28, right:28, zIndex:9999, background:'rgba(7,30,52,0.98)', border:`1px solid ${color}55`, borderRadius:14, padding:'14px 20px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', maxWidth:360 }}>
  <div className="super-module-card" style={{ width:36, height:36, borderRadius:'50%', background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', color, flexShrink:0 }}><Check size={18} /></div>
  <div className="super-module-card" style={{ flex:1 }}>
  <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{message}</div>
  </div>
  <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:4 }}><X size={16} /></button>
  </div>
  </Portal>
 )
}

//  Auto-Generate Modal 
function AutoGenModal({ onGenerate, onClose }) {
 const { activeClasses, subjectsForClass } = useAcademicStore()
 const { getChaptersForSubject } = usePaperStore()

 const [classLevel, setClassLevel] = useState('')
 const [subject, setSubject] = useState('')
 const [teacher, setTeacher] = useState('')
 const [selChapters,setSelChapters] = useState([])
 const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10))
 const [frequency, setFrequency] = useState('daily')
 const [weeks, setWeeks] = useState(4)
 const [period, setPeriod] = useState('1st')
 const [duration, setDuration] = useState(40)

 const availChapters = useMemo(() => getChaptersForSubject(subject, classLevel), [subject, classLevel])
 const subjects = useMemo(() => subjectsForClass(classLevel), [classLevel])

 const chaptersToUse = selChapters.length > 0 ? selChapters : availChapters
 const scheduleDates = useMemo(() => buildPlanDates(startDate, frequency, weeks), [startDate, frequency, weeks])
 const plannedCount = Math.max(scheduleDates.length, chaptersToUse.length || 1)
 const periodLabel = frequency === 'monthly' ? 'Number of Months' : frequency === 'annual' ? 'Annual Months' : 'Number of Weeks'

 function generate() {
 if (!classLevel || !subject) return
 const targets = chaptersToUse.length > 0 ? chaptersToUse : ['Chapter 1']
 const dates = scheduleDates.length > 0 ? scheduleDates : [startDate]
 const count = Math.max(dates.length, targets.length)
 const plans = Array.from({ length: count }, (_, i) => {
 const date = dates[i % dates.length]
 const chapter = targets[i % targets.length]
 return blankPlan({
 id: `lp_auto_${Date.now()}_${i}`,
 classLevel, subject, chapter, teacher,
 date,
 planningScope: frequency,
 planRangeLabel: planRangeLabel(frequency, date, i),
 period, duration,
 title: `${subject} — ${chapter}`,
 })
 })

 if (plans.length === 0) {
 alert('Could not generate plans. Please check date range and chapters.')
 return
 }
 onGenerate(plans)
 onClose()
 }

 return (
 <Portal>
 <div className="super-module-card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
 <div className="super-module-card" style={{ background:'#071e34', border:`1px solid ${C.border}`, borderRadius:20, padding:28, width:560, maxHeight:'90vh', overflowY:'auto' }}>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
 <div>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:800, fontSize:18 }}> Auto-Generate Lesson Plans</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12, marginTop:3 }}>Creates daily, weekly, monthly, term-wise, or annual plans from your chapters.</div>
 </div>
 <button onClick={onClose} style={{ background:'rgba(255,55,95,0.12)', border:'1px solid rgba(255,55,95,0.3)', borderRadius:8, color:C.red, cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'6px 12px', fontWeight: 600 }}><X size={14} /> Close</button>
 </div>

 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
 <div>
 <Lbl>Class *</Lbl>
 <Sel value={classLevel} onChange={e => { setClassLevel(e.target.value); setSubject(''); setSelChapters([]) }}>
 <option value="">Select Class</option>
 {activeClasses.length > 0
 ? activeClasses.map(c => <option key={c.level} value={c.level}>{c.name}</option>)
 : ['1','2','3','4','5','6','7','8','9','10'].map(n => <option key={n} value={n}>Class {n}</option>)
 }
 </Sel>
 </div>
 <div>
 <Lbl>Subject *</Lbl>
 <Sel value={subject} onChange={e => { setSubject(e.target.value); setSelChapters([]) }}>
 <option value="">{classLevel ? 'Select Subject' : 'Select class first'}</option>
 {subjects.map(s => <option key={s} value={s}>{s}</option>)}
 {subjects.length === 0 && classLevel && <option value={classLevel+' Subject'}>General Subject</option>}
 </Sel>
 </div>
 <div>
 <Lbl>Teacher Name</Lbl>
 <Inp value={teacher} onChange={e => setTeacher(e.target.value)} placeholder="e.g. Mr. Ahmad" />
 </div>
 <div>
 <Lbl>Start Date *</Lbl>
 <Inp type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
 </div>
 <div>
 <Lbl>Planning Scope</Lbl>
 <Sel value={frequency} onChange={e => {
 const next = e.target.value
 setFrequency(next)
 if (next === 'annual') setWeeks(12)
 if (next === 'term') setWeeks(12)
 if (next === 'monthly') setWeeks(6)
 }}>
 <option value="daily">Daily (Mon–Fri)</option>
 <option value="weekly">Weekly (Mondays only)</option>
 <option value="monthly">Monthly</option>
 <option value="term">Term-wise</option>
 <option value="annual">Annual</option>
 </Sel>
 </div>
 <div>
 <Lbl>{periodLabel}</Lbl>
 <Sel value={weeks} onChange={e => setWeeks(Number(e.target.value))}>
 {[1,2,3,4,6,8,10,12,16,20,24,36].map(n => <option key={n} value={n}>{n} {frequency === 'monthly' || frequency === 'annual' ? `month${n>1?'s':''}` : `week${n>1?'s':''}`}</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Period</Lbl>
 <Sel value={period} onChange={e => setPeriod(e.target.value)}>
 {PERIODS.map(p => <option key={p} value={p}>{p} Period</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Duration</Lbl>
 <Sel value={duration} onChange={e => setDuration(Number(e.target.value))}>
 {[30,35,40,45,50,60,80].map(d => <option key={d} value={d}>{d} min</option>)}
 </Sel>
 </div>
 </div>

 {availChapters.length > 0 && (
 <div className="super-module-card" style={{ marginTop:16 }}>
 <Lbl>Chapters to cover <span style={{ color:C.muted, fontWeight:400, textTransform:'none' }}>(leave blank for all)</span></Lbl>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
 <button onClick={() => setSelChapters(selChapters.length === availChapters.length ? [] : [...availChapters])}
 style={{ fontSize:11, padding:'4px 10px', borderRadius:8, border:`1px solid ${C.border}`, background: selChapters.length === availChapters.length ? 'rgba(200,153,26,0.2)' : 'rgba(15,23,42,0.46)', color:C.gold, cursor:'pointer', fontWeight:700 }}>
 All ({availChapters.length})
 </button>
 {availChapters.map(ch => {
 const sel = selChapters.includes(ch)
 return (
 <button key={ch} onClick={() => setSelChapters(sel ? selChapters.filter(c=>c!==ch) : [...selChapters, ch])}
 style={{ fontSize:11, padding:'4px 10px', borderRadius:8, border:`1px solid ${sel?C.gold:C.border}`, background: sel?'rgba(200,153,26,0.2)':'rgba(15,23,42,0.46)', color: sel?C.gold:C.silver, cursor:'pointer' }}>
 {ch}
 </button>
 )
 })}
 </div>
 </div>
 )}

 <div className="super-module-card" style={{ marginTop:18, padding:'12px 16px', background:'rgba(200,153,26,0.08)', border:`1px solid rgba(200,153,26,0.2)`, borderRadius:10, fontSize:12, color:C.gold }}>
 Will generate <strong>{plannedCount}</strong> {scopeLabel(frequency).toLowerCase()} lesson plan{plannedCount>1?'s':''} starting {startDate}
 </div>

 <div className="super-module-card" style={{ display:'flex', gap:10, marginTop:20 }}>
 <Btn variant="ghost" onClick={onClose} style={{ flex:1, justifyContent:'center' }}>Cancel</Btn>
 <Btn variant="gold" onClick={generate} disabled={!classLevel || !subject} style={{ flex:2, justifyContent:'center' }}> Generate Plans</Btn>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  Plan List Card 
function PlanCard({ plan, onEdit, onPreview, onDelete, onSendPortal }) {
 const totalMin = plan.phases.reduce((s, p) => s + (p.duration || 0), 0)
 return (
 <div className="super-module-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden' }}>
 <div className="super-module-card" style={{ height: 4, background: `linear-gradient(90deg, ${C.blue}, ${C.purple})` }} />
 <div className="super-module-card" style={{ padding: '18px 20px' }}>
 <div className="super-module-card" style={{ color: '#fff', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
 {plan.title || `${plan.subject} — ${plan.chapter || 'Lesson Plan'}`}
 </div>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
 {plan.classLevel && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(200,153,26,0.12)', color:C.gold, border:`1px solid rgba(200,153,26,0.3)`, fontWeight:600 }}>Class {plan.classLevel}</span>}
 {plan.subject && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(10,132,255,0.1)', color:C.blue, border:'1px solid rgba(10,132,255,0.2)', fontWeight:600 }}>{plan.subject}</span>}
 {plan.chapter && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(192,200,216,0.08)', color:C.muted, border:`1px solid ${C.border}` }}>{plan.chapter}</span>}
 <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(191,90,242,0.1)', color:C.purple, border:'1px solid rgba(191,90,242,0.22)', fontWeight:700 }}>{scopeLabel(plan.planningScope)}{plan.planRangeLabel ? ` · ${plan.planRangeLabel}` : ''}</span>
 {plan.sentToPortal && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(48,209,88,0.12)', color:C.green, border:'1px solid rgba(48,209,88,0.3)', fontWeight:700 }}> Sent to Portal</span>}
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:12, fontSize:12, color:C.muted, marginBottom:12, flexWrap:'wrap' }}>
 {plan.teacher && <span> {plan.teacher}</span>}
 <span> {plan.date}</span>
 <span> {plan.duration} min</span>
 <span> {totalMin} min planned</span>
 </div>
 {plan.bloom.length > 0 && (
 <div className="super-module-card" style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:12 }}>
 {plan.bloom.map(k => {
 const b = BLOOM.find(x => x.key === k)
 return b ? <span key={k} style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:`${b.color}18`, color:b.color, border:`1px solid ${b.color}44`, fontWeight:700 }}>{b.emoji} {b.label}</span> : null
 })}
 </div>
 )}
 <div className="super-module-card" style={{ display:'flex', gap:8, marginTop:4, flexWrap:'wrap' }}>
  <Btn variant="gold" onClick={() => onPreview(plan)} style={{ flex:1, justifyContent:'center' }}><Printer size={14} style={{ marginRight: 4 }} /> Preview / Print</Btn>
  <Btn variant="purple" onClick={() => onSendPortal(plan)} style={{ justifyContent:'center' }}><Send size={14} style={{ marginRight: 4 }} /> Portal</Btn>
  <Btn variant="ghost" onClick={() => onEdit(plan)} style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Edit size={14} /> Edit</Btn>
  <Btn variant="red" onClick={() => onDelete(plan.id)} style={{ display:'inline-flex', alignItems:'center', gap:4 }}><Trash2 size={14} /> Delete</Btn>
 </div>
 </div>
 </div>
 )
}

//  Mini Plan Card (for Weekly view) 
function MiniPlanCard({ plan, onPreview, onEdit }) {
 return (
 <div onClick={() => onPreview(plan)} style={{ background:'rgba(10,132,255,0.08)', border:'1px solid rgba(10,132,255,0.2)', borderRadius:8, padding:'8px 10px', cursor:'pointer', marginBottom:4 }}
 onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,132,255,0.15)'}
 onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,132,255,0.08)'}>
 <div className="super-module-card" style={{ color:'#fff', fontSize:11, fontWeight:700, marginBottom:2, lineHeight:1.3 }}>
 {plan.title || plan.subject || 'Lesson Plan'}
 </div>
 {plan.chapter && <div className="super-module-card" style={{ color:C.muted, fontSize:10 }}>{plan.chapter}</div>}
 {plan.period && <div className="super-module-card" style={{ color:C.blue, fontSize:10 }}>{plan.period} Period · {plan.duration}min</div>}
 {plan.sentToPortal && <div className="super-module-card" style={{ color:C.green, fontSize:9, marginTop:2 }}> Sent</div>}
 </div>
 )
}

//  Weekly View 
function WeeklyView({ plans, onEdit, onPreview, onSendPortal, onNew }) {
 const [weekOffset, setWeekOffset] = useState(0)

 const weekStart = useMemo(() => {
 const today = new Date()
 const dow = today.getDay()
 const mon = new Date(today)
 mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7)
 mon.setHours(0,0,0,0)
 return mon
 }, [weekOffset])

 const weekDates = Array.from({length:6}, (_,i) => {
 const d = new Date(weekStart)
 d.setDate(weekStart.getDate() + i)
 return d
 })

 const plansByDate = useMemo(() => {
 const map = {}
 plans.forEach(p => { map[p.date] = [...(map[p.date]||[]), p] })
 return map
 }, [plans])

 const weekLabel = `${weekDates[0].getDate()} ${MONTH_NAMES[weekDates[0].getMonth()]} — ${weekDates[5].getDate()} ${MONTH_NAMES[weekDates[5].getMonth()]} ${weekDates[0].getFullYear()}`
 const todayStr = new Date().toISOString().slice(0,10)

 const totalThisWeek = weekDates.reduce((s,d) => s + (plansByDate[d.toISOString().slice(0,10)]?.length||0), 0)

 return (
 <div>
 {/* Week navigation */}
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
 <button onClick={() => setWeekOffset(p=>p-1)} style={{ background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 16px', color:C.silver, cursor:'pointer', fontWeight: 600 }}>← Prev</button>
 <div className="super-module-card" style={{ flex:1, textAlign:'center' }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:800, fontSize:15 }}>Week of {weekLabel}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12 }}>{totalThisWeek} plan{totalThisWeek!==1?'s':''} this week</div>
 </div>
 <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset===0 ? 'rgba(200,153,26,0.2)':'rgba(15,23,42,0.46)', border:`1px solid ${weekOffset===0?C.gold:C.border}`, borderRadius:10, padding:'8px 14px', color: weekOffset===0?C.gold:C.silver, cursor:'pointer', fontWeight: 600, fontSize:12 }}>Today</button>
 <button onClick={() => setWeekOffset(p=>p+1)} style={{ background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 16px', color:C.silver, cursor:'pointer', fontWeight: 600 }}>Next →</button>
 </div>

 {/* Day columns */}
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:10 }}>
 {weekDates.map((date, i) => {
 const dateStr = date.toISOString().slice(0,10)
 const dayPlans = plansByDate[dateStr] || []
 const isToday = dateStr === todayStr
 return (
 <div key={i}>
 {/* Day header */}
 <div className="super-module-card" style={{ textAlign:'center', marginBottom:8, padding:'8px 4px', borderRadius:10,
 background: isToday ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.38)',
 border: `1px solid ${isToday ? C.gold : C.border}` }}>
 <div className="super-module-card" style={{ color: isToday ? C.gold : C.silver, fontWeight:800, fontSize:12 }}>{DAY_NAMES[date.getDay()]}</div>
 <div className="super-module-card" style={{ color: isToday ? C.goldL : C.muted, fontSize:20, fontWeight:900 }}>{date.getDate()}</div>
 </div>
 {/* Plans */}
 {dayPlans.map(p => (
 <MiniPlanCard key={p.id} plan={p} onPreview={onPreview} onEdit={onEdit} />
 ))}
 {/* Add button */}
 <button onClick={() => onNew(dateStr)}
 style={{ width:'100%', background:'rgba(11,44,77,0.2)', border:`1px dashed ${C.border}`, borderRadius:8, padding:'6px 0', color:C.muted, cursor:'pointer', fontSize:11 }}>
 + Add
 </button>
 </div>
 )
 })}
 </div>
 </div>
 )
}

//  Annual View 
function AnnualView({ plans, onPreview, onNew }) {
 const [year, setYear] = useState(new Date().getFullYear())

 const plansByDate = useMemo(() => {
 const map = {}
 plans.forEach(p => { map[p.date] = [...(map[p.date]||[]), p] })
 return map
 }, [plans])

 const todayStr = new Date().toISOString().slice(0,10)

 function MonthGrid({ month }) {
 const firstDay = new Date(year, month, 1)
 const daysInMonth = new Date(year, month+1, 0).getDate()
 const startDow = (firstDay.getDay() + 6) % 7 // 0=Mon
 const cells = Array.from({length: startDow + daysInMonth}, (_, i) => i < startDow ? null : i - startDow + 1)

 const totalPlans = plans.filter(p => p.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length

 return (
 <div className="super-module-card" style={{ background: C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:14 }}>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:800, fontSize:13 }}>{MONTH_NAMES[month]}</div>
 {totalPlans > 0 && <span style={{ fontSize:11, color:C.blue, background:'rgba(10,132,255,0.1)', padding:'2px 8px', borderRadius:20, fontWeight:700 }}>{totalPlans} plans</span>}
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
 {['M','T','W','T','F','S','S'].map((d,i) => (
 <div key={i} style={{ textAlign:'center', fontSize:9, color:C.muted, fontWeight:700 }}>{d}</div>
 ))}
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
 {cells.map((day, i) => {
 if (!day) return <div key={i} />
 const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
 const hasPlans = plansByDate[dateStr]?.length > 0
 const isToday = dateStr === todayStr
 return (
 <div key={i} onClick={() => hasPlans && onPreview(plansByDate[dateStr][0])}
 style={{ textAlign:'center', fontSize:10, padding:'3px 2px', borderRadius:5, cursor: hasPlans ? 'pointer' : 'default',
 color: isToday ? '#071e34' : hasPlans ? C.blue : C.muted,
 background: isToday ? C.gold : hasPlans ? 'rgba(10,132,255,0.2)' : 'transparent',
 border: hasPlans ? '1px solid rgba(10,132,255,0.3)' : '1px solid transparent',
 fontWeight: isToday || hasPlans ? 700 : 400,
 position:'relative' }}>
 {day}
 {hasPlans && plansByDate[dateStr].length > 1 && (
 <div className="super-module-card" style={{ position:'absolute', top:1, right:1, width:5, height:5, borderRadius:'50%', background:C.gold }} />
 )}
 </div>
 )
 })}
 </div>
 </div>
 )
 }

 const totalYear = plans.filter(p => p.date.startsWith(String(year))).length

 return (
 <div>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
 <button onClick={() => setYear(y=>y-1)} style={{ background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 16px', color:C.silver, cursor:'pointer', fontWeight: 600 }}>← {year-1}</button>
 <div className="super-module-card" style={{ flex:1, textAlign:'center' }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:800, fontSize:18 }}>{year} Annual Planner</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12 }}>{totalYear} lesson plan{totalYear!==1?'s':''} this year</div>
 </div>
 <button onClick={() => setYear(y=>y+1)} style={{ background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'8px 16px', color:C.silver, cursor:'pointer', fontWeight: 600 }}>{year+1} →</button>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:14 }}>
 {Array.from({length:12}, (_,m) => <MonthGrid key={m} month={m} />)}
 </div>
 </div>
 )
}

//  Plan Editor 
function GroupedPlanView({ plans, mode, onPreview, onEdit, onNew }) {
 const groups = useMemo(() => {
 const map = {}
 plans.forEach(plan => {
 const d = new Date(plan.date || new Date())
 const key = mode === 'monthly'
 ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
 : (plan.planRangeLabel || `${scopeLabel(plan.planningScope)} Plans`)
 const title = mode === 'monthly' ? `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` : key
 map[key] = map[key] || { title, items: [] }
 map[key].items.push(plan)
 })
 return Object.values(map).sort((a, b) => (a.items[0]?.date || '').localeCompare(b.items[0]?.date || ''))
 }, [plans, mode])

 return (
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:16 }}>
 {groups.length === 0 ? (
 <GCard style={{ gridColumn:'1/-1', textAlign:'center', padding:48 }}>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:800, fontSize:18, marginBottom:8 }}>No {mode === 'monthly' ? 'monthly' : 'term-wise'} plans yet</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:13, marginBottom:18 }}>Create one manually or use Auto-Generate with {mode === 'monthly' ? 'Monthly' : 'Term-wise'} scope.</div>
 <Btn variant="gold" onClick={() => onNew()} style={{ margin:'0 auto' }}>+ New Plan</Btn>
 </GCard>
 ) : groups.map(group => (
 <GCard key={group.title}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
 <div>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:900, fontSize:16 }}>{group.title}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:12 }}>{group.items.length} lesson plan{group.items.length!==1?'s':''}</div>
 </div>
 <button onClick={() => onNew(group.items[0]?.date)} style={{ background:'rgba(200,153,26,0.12)', border:`1px solid ${C.gold}44`, color:C.gold, borderRadius:10, padding:'7px 10px', cursor:'pointer', fontWeight: 600 }}>+ Add</button>
 </div>
 {group.items.map(plan => <MiniPlanCard key={plan.id} plan={plan} onPreview={onPreview} onEdit={onEdit} />)}
 </GCard>
 ))}
 </div>
 )
}

function PlanEditor({ initial, onSave, onCancel }) {
 const [plan, setPlan] = useState(() => JSON.parse(JSON.stringify(initial)))
 const { activeClasses, subjectsForClass } = useAcademicStore()
 const [activeSection, setActiveSection] = useState(0)

 const set = (key, val) => setPlan(p => ({ ...p, [key]: val }))
 const addObjective = () => set('objectives', [...plan.objectives, 'Students will be able to '])
 const setObjective = (i, v) => { const o = [...plan.objectives]; o[i] = v; set('objectives', o) }
 const delObjective = (i) => set('objectives', plan.objectives.filter((_, idx) => idx !== i))
 const [matInput, setMatInput] = useState('')
 const addMaterial = () => { if (matInput.trim()) { set('materials', [...plan.materials, matInput.trim()]); setMatInput('') } }
 const delMaterial = (i) => set('materials', plan.materials.filter((_, idx) => idx !== i))
 const toggleBloom = (k) => set('bloom', plan.bloom.includes(k) ? plan.bloom.filter(x => x !== k) : [...plan.bloom, k])
 const setPhase = (key, field, val) => set('phases', plan.phases.map(p => p.key === key ? { ...p, [field]: val } : p))

 const totalMin = plan.phases.reduce((s, p) => s + Number(p.duration || 0), 0)
 const timeOk = totalMin === Number(plan.duration)

 const SECTIONS = [' Basic Info', ' Objectives', ' Activities', ' Assessment', ' Notes & Diff']

 return (
 <div>
 <div className="super-module-card" style={{ display:'flex', gap:12, marginBottom:24, alignItems:'center', flexWrap:'wrap' }}>
 <Btn variant="ghost" onClick={onCancel}>← Back</Btn>
 <h2 style={{ margin:0, color:'#fff', fontSize:18, fontWeight:800, flex:1 }}>{plan.title || 'New Lesson Plan'}</h2>
 <Btn variant="gold" onClick={() => onSave(plan)}> Save Plan</Btn>
 </div>

 <div className="super-module-card" style={{ display:'flex', gap:8, marginBottom:24, overflowX:'auto', paddingBottom:4 }}>
 {SECTIONS.map((s, i) => (
 <button key={i} onClick={() => setActiveSection(i)}
 style={{ padding:'8px 16px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, whiteSpace:'nowrap',
 background: activeSection === i ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(11,44,77,0.92)',
 color: activeSection === i ? '#071e34' : C.muted,
 boxShadow: activeSection === i ? '0 4px 16px rgba(200,153,26,0.3)' : 'none' }}>{s}</button>
 ))}
 </div>

 {/* Section 0: Basic Info */}
 {activeSection === 0 && (
 <GCard>
 <SectionHead icon="" title="Basic Information" />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
 <div className="super-module-card" style={{ gridColumn:'1/-1' }}>
 <Lbl>Lesson Title / Topic *</Lbl>
 <Inp value={plan.title} onChange={e => set('title', e.target.value)} placeholder="e.g. The Water Cycle — Formation of Clouds" />
 </div>
 <div>
 <Lbl>Planning Type</Lbl>
 <Sel value={plan.planningScope || 'daily'} onChange={e => set('planningScope', e.target.value)}>
 {PLANNING_SCOPES.map(s => <option key={s.key} value={s.key}>{s.label} - {s.hint}</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Plan Range / Label</Lbl>
 <Inp value={plan.planRangeLabel || ''} onChange={e => set('planRangeLabel', e.target.value)} placeholder="e.g. Week 1, May 2026, First Term, Annual 2026" />
 </div>
 <div>
 <Lbl>Class *</Lbl>
 <Sel value={plan.classLevel} onChange={e => set('classLevel', e.target.value)}>
 <option value="">Select Class</option>
 {activeClasses.length > 0
 ? activeClasses.map(c => <option key={c.level} value={c.level}>{c.name}</option>)
 : ['1','2','3','4','5','6','7','8','9','10'].map(n => <option key={n} value={n}>Class {n}</option>)
 }
 </Sel>
 </div>
 <div>
 <Lbl>Subject *</Lbl>
 <Sel value={plan.subject} onChange={e => set('subject', e.target.value)}>
 <option value="">Select Subject</option>
 {subjectsForClass(plan.classLevel).map(s => <option key={s} value={s}>{s}</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Chapter / Unit</Lbl>
 <Inp value={plan.chapter} onChange={e => set('chapter', e.target.value)} placeholder="e.g. Chapter 4 — Water" />
 </div>
 <div>
 <Lbl>Teacher Name</Lbl>
 <Inp value={plan.teacher} onChange={e => set('teacher', e.target.value)} placeholder="e.g. Mr. Usman Ahmad" />
 </div>
 <div>
 <Lbl>Date</Lbl>
 <Inp type="date" value={plan.date} onChange={e => set('date', e.target.value)} />
 </div>
 <div>
 <Lbl>Period</Lbl>
 <Sel value={plan.period} onChange={e => set('period', e.target.value)}>
 {PERIODS.map(p => <option key={p} value={p}>{p} Period</option>)}
 </Sel>
 </div>
 <div>
 <Lbl>Duration <span style={{ color: timeOk ? C.green : C.orange, fontWeight:800 }}>({plan.duration} min)</span></Lbl>
 <Sel value={plan.duration} onChange={e => set('duration', Number(e.target.value))}>
 {[30,35,40,45,50,60,80,90].map(d => <option key={d} value={d}>{d} minutes</option>)}
 </Sel>
 </div>
 </div>
 <div className="super-module-card" style={{ marginTop:20 }}>
 <Lbl>Prior Knowledge</Lbl>
 <Txt value={plan.priorKnowledge} onChange={e => set('priorKnowledge', e.target.value)} placeholder="What do students already know that connects to this lesson?" style={{ minHeight:80 }} />
 </div>
 <div className="super-module-card" style={{ marginTop:20 }}>
 <Lbl>Resources & Materials</Lbl>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:10 }}>
 {plan.materials.map((m, i) => (
 <span key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 12px', borderRadius:20, background:'rgba(10,132,255,0.12)', border:'1px solid rgba(10,132,255,0.25)', color:C.blue, fontSize:13, fontWeight:600 }}>
 {m}
 <button onClick={() => delMaterial(i)} style={{ background:'none', border:'none', color:C.blue, cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>×</button>
 </span>
 ))}
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:8 }}>
 <Inp value={matInput} onChange={e => setMatInput(e.target.value)} placeholder="Add material..." onKeyDown={e => e.key === 'Enter' && addMaterial()} style={{ flex:1 }} />
 <Btn variant="blue" onClick={addMaterial}>+ Add</Btn>
 </div>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
 {['Textbook','Board & Marker','Charts / Posters','Projector','Lab Equipment','Worksheets','Flashcards'].filter(s => !plan.materials.includes(s)).map(s => (
 <button key={s} onClick={() => set('materials', [...plan.materials, s])}
 style={{ padding:'4px 10px', borderRadius:20, fontSize:11, border:`1px dashed ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer' }}>+ {s}</button>
 ))}
 </div>
 </div>
 </GCard>
 )}

 {/* Section 1: Objectives */}
 {activeSection === 1 && (
 <div className="super-module-card" style={{ display:'grid', gap:20 }}>
 <GCard>
 <SectionHead icon="" title="Learning Objectives" />
 <div className="super-module-card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {plan.objectives.map((obj, i) => (
 <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
 <span style={{ color:C.gold, fontWeight:800, fontSize:15, marginTop:11, flexShrink:0 }}>{i + 1}.</span>
 <Inp value={obj} onChange={e => setObjective(i, e.target.value)} placeholder="Students will be able to..." style={{ flex:1 }} />
 {plan.objectives.length > 1 && (
 <button onClick={() => delObjective(i)} style={{ background:'rgba(255,55,95,0.12)', border:'1px solid rgba(255,55,95,0.25)', borderRadius:8, color:C.red, cursor:'pointer', padding:'9px 12px', fontWeight: 600 }}></button>
 )}
 </div>
 ))}
 </div>
 <button onClick={addObjective} style={{ marginTop:12, background:'rgba(200,153,26,0.1)', border:`1px dashed ${C.gold}`, borderRadius:10, padding:'9px 0', color:C.gold, cursor:'pointer', width:'100%', fontWeight: 600, fontSize:13 }}>
 + Add Objective
 </button>
 </GCard>
 <GCard>
 <SectionHead icon="" title="Bloom's Taxonomy — Cognitive Levels" color={C.purple} />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
 {BLOOM.map(b => {
 const active = plan.bloom.includes(b.key)
 return (
 <div key={b.key} onClick={() => toggleBloom(b.key)}
 style={{ cursor:'pointer', borderRadius:14, padding:'14px 16px', border:`2px solid ${active ? b.color : C.border}`, background: active ? `${b.color}18` : 'rgba(7,30,52,0.4)', transition:'all 0.15s' }}>
 <div className="super-module-card" style={{ fontSize:24, marginBottom:6 }}>{b.emoji}</div>
 <div className="super-module-card" style={{ color: active ? b.color : C.silver, fontWeight:800, fontSize:13, marginBottom:4 }}>{b.label}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:10, lineHeight:1.5 }}>{b.verbs}</div>
 </div>
 )
 })}
 </div>
 </GCard>
 </div>
 )}

 {/* Section 2: Activities */}
 {activeSection === 2 && (
 <div className="super-module-card" style={{ display:'grid', gap:20 }}>
 <GCard style={{ padding:'16px 24px' }}>
 <div className="super-module-card" style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
 <span style={{ color:C.muted, fontSize:13 }}> Time Distribution:</span>
 {plan.phases.map(ph => {
 const cfg = PHASES.find(x => x.key === ph.key)
 return (
 <span key={ph.key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:cfg.color, fontWeight:700 }}>
 <span style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
 {cfg.icon} {ph.duration}min
 </span>
 )
 })}
 <span style={{ fontSize:13, fontWeight:800, color: timeOk ? C.green : C.orange, marginLeft:'auto' }}>
 {timeOk ? '' : ''} Total: {totalMin} / {plan.duration} min
 </span>
 </div>
 </GCard>
 {plan.phases.map(ph => {
 const cfg = PHASES.find(x => x.key === ph.key)
 return (
 <GCard key={ph.key} style={{ borderLeft:`4px solid ${cfg.color}` }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
 <span style={{ fontSize:28 }}>{cfg.icon}</span>
 <div className="super-module-card" style={{ flex:1 }}>
 <div className="super-module-card" style={{ color:cfg.color, fontWeight:800, fontSize:15 }}>{cfg.label}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{cfg.tip}</div>
 </div>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8 }}>
 <span style={{ color:C.muted, fontSize:12 }}>Duration:</span>
 <input type="number" min={1} max={plan.duration} value={ph.duration}
 onChange={e => setPhase(ph.key, 'duration', Number(e.target.value))}
 style={{ width:60, background:'rgba(11,44,77,0.8)', border:`1px solid ${cfg.color}55`, borderRadius:8, color:cfg.color, padding:'6px 10px', fontSize:14, outline:'none', fontWeight:800, textAlign:'center' }} />
 <span style={{ color:C.muted, fontSize:12 }}>min</span>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
 <div>
 <Lbl>Teaching Method</Lbl>
 <Sel value={ph.method} onChange={e => setPhase(ph.key, 'method', e.target.value)}>
 <option value="">Select method...</option>
 {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
 </Sel>
 </div>
 <div />
 </div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:12 }}>
 <div>
 <Lbl> Teacher Activity</Lbl>
 <Txt value={ph.teacherDoes} onChange={e => setPhase(ph.key, 'teacherDoes', e.target.value)} style={{ minHeight:90 }} />
 </div>
 <div>
 <Lbl> Student Activity</Lbl>
 <Txt value={ph.studentDoes} onChange={e => setPhase(ph.key, 'studentDoes', e.target.value)} style={{ minHeight:90 }} />
 </div>
 </div>
 </GCard>
 )
 })}
 </div>
 )}

 {/* Section 3: Assessment */}
 {activeSection === 3 && (
 <div className="super-module-card" style={{ display:'grid', gap:20 }}>
 <GCard>
 <SectionHead icon="" title="Assessment Strategy" color={C.green} />
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
 {ASSESSMENT_TYPES.map(t => (
 <button key={t} onClick={() => set('assessmentType', t)}
 style={{ padding:'7px 14px', borderRadius:20, border:`1px solid ${plan.assessmentType === t ? C.green : C.border}`, background: plan.assessmentType === t ? 'rgba(48,209,88,0.15)' : 'rgba(15,23,42,0.46)', color: plan.assessmentType === t ? C.green : C.muted, cursor:'pointer', fontWeight:600, fontSize:12 }}>
 {t}
 </button>
 ))}
 </div>
 <Txt value={plan.assessmentDesc} onChange={e => set('assessmentDesc', e.target.value)} style={{ minHeight:100 }} />
 </GCard>
 <GCard>
 <SectionHead icon="" title="Homework / Assignment" color={C.orange} />
 <Txt value={plan.homework} onChange={e => set('homework', e.target.value)} style={{ minHeight:90 }} />
 </GCard>
 </div>
 )}

 {/* Section 4: Notes & Differentiation */}
 {activeSection === 4 && (
 <div className="super-module-card" style={{ display:'grid', gap:20 }}>
 <GCard>
 <SectionHead icon="" title="Differentiation" color={C.purple} />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
 <div>
 <Lbl> Advanced Learners</Lbl>
 <Txt value={plan.advanced} onChange={e => set('advanced', e.target.value)} style={{ minHeight:100 }} />
 </div>
 <div>
 <Lbl> Struggling Learners</Lbl>
 <Txt value={plan.struggling} onChange={e => set('struggling', e.target.value)} style={{ minHeight:100 }} />
 </div>
 </div>
 </GCard>
 <GCard>
 <SectionHead icon="" title="Post-Lesson Reflection" color={C.blue} />
 <Txt value={plan.reflection} onChange={e => set('reflection', e.target.value)} style={{ minHeight:120 }} />
 </GCard>
 </div>
 )}

 <div className="super-module-card" style={{ display:'flex', justifyContent:'space-between', marginTop:24 }}>
 <Btn variant="ghost" onClick={() => setActiveSection(s => Math.max(0, s-1))} style={{ opacity: activeSection===0?0.3:1, pointerEvents: activeSection===0?'none':'auto' }}>← Previous</Btn>
 <Btn variant="gold" onClick={() => onSave(plan)}> Save Plan</Btn>
 <Btn variant="ghost" onClick={() => setActiveSection(s => Math.min(4, s+1))} style={{ opacity: activeSection===4?0.3:1, pointerEvents: activeSection===4?'none':'auto' }}>Next →</Btn>
 </div>
 </div>
 )
}

//  Print Preview 
function PlanPreview({ plan, onBack, settings }) {
 const totalMin = plan.phases.reduce((s, p) => s + (p.duration || 0), 0)
 const [studentName, setStudentName] = useState('')

 const td = (content, style = {}) => (
 <td style={{ border:'1px solid #bbb', padding:'8px 10px', verticalAlign:'top', fontSize:13, color:'#222', lineHeight:1.6, ...style }}>{content}</td>
 )
 const th = (content, style = {}) => (
 <th style={{ border:'1px solid #bbb', padding:'7px 10px', background:'#f0ece3', fontSize:12, fontWeight:700, color:'#3d2b00', textAlign:'left', letterSpacing:'0.04em', ...style }}>{content}</th>
 )

 function doPrint() {
 const area = document.getElementById('lp-print-area')
 if (!area) return
 const old = document.getElementById('__lp_print_frame')
 if (old) old.remove()
 const iframe = document.createElement('iframe')
 iframe.id = '__lp_print_frame'
 iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:210mm;height:297mm;border:0;background:white'
 document.body.appendChild(iframe)
 const doc = iframe.contentDocument || iframe.contentWindow.document
 doc.open()
 doc.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">
<style>
 *,*::before,*::after{box-sizing:border-box}
 html,body{margin:0;padding:0;background:white;font-family:'Times New Roman',serif}
 @page{size:A4 portrait;margin:12mm}
 table{border-collapse:collapse;width:100%}
 th,td{border:1px solid #bbb;padding:7px 10px;font-size:12px}
 th{background:#f0ece3;font-weight:700;color:#3d2b00}
</style>
</head><body>${area.innerHTML}</body></html>`)
 doc.close()
 setTimeout(() => {
 try { iframe.contentWindow.focus(); iframe.contentWindow.print() }
 catch(e) {}
 setTimeout(() => { if (document.body.contains(iframe)) iframe.remove() }, 3000)
 }, 800)
 }

 return (
 <div>
 <style>{`@media print { body { display: none !important; } }`}</style>
 <div className="super-module-card" style={{ display:'flex', gap:12, marginBottom:24, alignItems:'center' }}>
 <Btn variant="ghost" onClick={onBack}>← Back to Edit</Btn>
 <h3 style={{ margin:0, color:'#fff', flex:1 }}>{plan.title || 'Lesson Plan'}</h3>
 <Inp value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Student name for print..." style={{ maxWidth:240 }} />
 <Btn variant="green" onClick={doPrint}> Print / Save PDF</Btn>
 </div>

 <div id="lp-print-area" style={{ background:'#fff', color:'#000', padding:'32px 36px', maxWidth:780, margin:'0 auto', borderRadius:8, fontFamily:'Times New Roman, serif', fontSize:13, lineHeight:1.6, boxShadow:'0 8px 40px rgba(0,0,0,0.4)' }}>
 <div style={{ textAlign:'center', marginBottom:16, borderBottom:'2px solid #8B6914', paddingBottom:12 }}>
 {settings?.logo && <img src={settings.logo} alt="logo" style={{ height:60, objectFit:'contain', display:'block', margin:'0 auto 8px' }} />}
 {settings?.showUrduHeader !== false && <div style={{ fontFamily:'Noto Nastaliq Urdu, serif', fontSize:20, direction:'rtl', marginBottom:4 }}>{settings?.schoolUrdu || 'الصدیق اسکالرز پبلک اسکول'}</div>}
 <div style={{ fontSize:20, fontWeight:700 }}>{settings?.schoolName || 'Al Siddique Scholars Public School'}</div>
 <div style={{ fontSize:11, color:'#555' }}>{settings?.address || 'Sharif Chowk, Rayya Khas, Narowal'}</div>
 <div style={{ fontSize:17, fontWeight:700, marginTop:8, color:'#5a3e00', letterSpacing:2, textTransform:'uppercase' }}>{scopeLabel(plan.planningScope)} Lesson Plan</div>
 <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{plan.planRangeLabel || planRangeLabel(plan.planningScope || 'daily', plan.date)}</div>
 </div>

 {studentName.trim() && (
 <div style={{ border:'1px solid #bbb', background:'#f8f5ed', padding:'8px 12px', marginBottom:12, fontSize:13 }}>
 <strong>Student Name:</strong> {studentName.trim()}
 </div>
 )}

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <tbody>
 <tr>
 {th('Subject',{width:'15%'})}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontWeight:700, fontSize:13, width:'35%' }}>{plan.subject||'—'}</td>
 {th('Class',{width:'15%'})}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontWeight:700, fontSize:13, width:'35%' }}>{plan.classLevel?`Class ${plan.classLevel}`:'—'}</td>
 </tr>
 <tr>
 {th('Teacher')}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontSize:13 }}>{plan.teacher||'—'}</td>
 {th('Date')}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontSize:13 }}>{plan.date}</td>
 </tr>
 <tr>
 {th('Topic / Title')}
 <td colSpan={3} style={{ border:'1px solid #bbb', padding:'7px 10px', fontWeight:700, fontSize:13 }}>{plan.title||'—'}</td>
 </tr>
 <tr>
 {th('Chapter')}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontSize:13 }}>{plan.chapter||'—'}</td>
 {th('Period / Duration')}
 <td style={{ border:'1px solid #bbb', padding:'7px 10px', fontSize:13 }}>{plan.period} Period · {plan.duration} min (Planned: {totalMin} min)</td>
 </tr>
 </tbody>
 </table>

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead><tr><th colSpan={2} style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left' }}> Learning Objectives</th></tr></thead>
 <tbody><tr><td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13, lineHeight:1.8 }}><ol style={{ margin:0, paddingLeft:18 }}>{plan.objectives.filter(o=>o.trim()).map((o,i)=><li key={i}>{o}</li>)}</ol></td></tr></tbody>
 </table>

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead>
 <tr>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Bloom's Levels</th>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Resources & Materials</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>
 {plan.bloom.length>0 ? plan.bloom.map(k=>BLOOM.find(x=>x.key===k)).filter(Boolean).map(b=><span key={b.key} style={{ display:'inline-block', marginRight:8 }}>{b.emoji} {b.label}</span>) : '—'}
 </td>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.materials.join(' · ')}</td>
 </tr>
 </tbody>
 </table>

 {plan.priorKnowledge && (
 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead><tr><th colSpan={2} style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left' }}> Prior Knowledge</th></tr></thead>
 <tbody><tr><td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.priorKnowledge}</td></tr></tbody>
 </table>
 )}

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead>
 <tr style={{ background:'#e8e0cc' }}>
 {th('Phase', { width:'22%' })}
 {th('Time', { width:'8%', textAlign:'center' })}
 {th('Method', { width:'15%' })}
 {th('Teacher Activity', { width:'27.5%' })}
 {th('Student Activity', { width:'27.5%' })}
 </tr>
 </thead>
 <tbody>
 {plan.phases.map(ph => {
 const cfg = PHASES.find(x => x.key === ph.key)
 return (
 <tr key={ph.key}>
 {td(<span style={{ fontWeight:700 }}>{cfg.icon} {cfg.label}</span>)}
 {td(`${ph.duration} min`, { textAlign:'center', fontWeight:700 })}
 {td(ph.method||'—')}
 {td(ph.teacherDoes||'—')}
 {td(ph.studentDoes||'—')}
 </tr>
 )
 })}
 </tbody>
 </table>

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead>
 <tr>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Assessment ({plan.assessmentType})</th>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Homework / Assignment</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.assessmentDesc||'—'}</td>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.homework||'—'}</td>
 </tr>
 </tbody>
 </table>

 {(plan.advanced || plan.struggling) && (
 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:14 }}>
 <thead>
 <tr>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Advanced Learners</th>
 <th style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left', width:'50%' }}> Struggling Learners</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.advanced||'—'}</td>
 <td style={{ border:'1px solid #bbb', padding:'10px 14px', fontSize:13 }}>{plan.struggling||'—'}</td>
 </tr>
 </tbody>
 </table>
 )}

 <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
 <thead><tr><th colSpan={2} style={{ border:'1px solid #bbb', padding:'7px 12px', background:'#e8e0cc', fontSize:13, fontWeight:700, color:'#3d2b00', textAlign:'left' }}> Post-Lesson Reflection</th></tr></thead>
 <tbody><tr><td style={{ border:'1px solid #bbb', padding:'18px 14px', fontSize:13, minHeight:60 }}>{plan.reflection||' '}</td></tr></tbody>
 </table>

 <div style={{ display:'flex', justifyContent:'space-between', marginTop:32, borderTop:'1px solid #ccc', paddingTop:20 }}>
 {['Teacher\'s Signature','Head Teacher\'s Signature','Principal\'s Signature'].map(s => (
 <div key={s} style={{ textAlign:'center', width:200 }}>
 <div style={{ borderBottom:'1px solid #555', marginBottom:6, height:40 }} />
 <div style={{ fontSize:12, color:'#555' }}>{s}</div>
 </div>
 ))}
 </div>

 <div style={{ textAlign:'center', fontSize:10, color:'#aaa', marginTop:16 }}>
 Al Siddique Scholars Public School OS · Lesson Plan · {plan.date}
 </div>
 </div>
 </div>
 )
}

//  Main LessonPlanTab 
export default function LessonPlanTab({ settings }) {
 const [plans, setPlans] = useState(loadPlans)
 const [view, setView] = useState('list') // 'list' | 'editor' | 'preview'
 const [planView, setPlanView] = useState('list') // 'list' | 'weekly' | 'annual'
 const [editing, setEditing] = useState(null)
 const [search, setSearch] = useState('')
 const [confirmDel, setConfirmDel] = useState(null)
 const [autoGen, setAutoGen] = useState(false)
 const [toast, setToast] = useState(null)

 function savePlan(plan) {
 const updated = plans.find(p => p.id === plan.id)
 ? plans.map(p => p.id === plan.id ? { ...plan, updatedAt: new Date().toISOString() } : p)
 : [{ ...plan, createdAt: new Date().toISOString() }, ...plans]
 storePlans(updated)
 setPlans(updated)
 setView('list')
 }

 function deletePlan(id) {
 const updated = plans.filter(p => p.id !== id)
 storePlans(updated)
 setPlans(updated)
 setConfirmDel(null)
 }

 function openEdit(plan) {
 setEditing(JSON.parse(JSON.stringify(plan)))
 setView('editor')
 }

 function openPreview(plan) {
 setEditing(plan)
 setView('preview')
 }

 function newPlan(date) {
 setEditing(blankPlan(date ? { date } : {}))
 setView('editor')
 }

 function handleAutoGen(newPlans) {
 const updated = [...newPlans.map(p => ({ ...p, createdAt: new Date().toISOString() })), ...plans]
 storePlans(updated)
 setPlans(updated)
 setToast({ message: `${newPlans.length} lesson plan${newPlans.length>1?'s':''} generated successfully!`, color: C.green })
 setTimeout(() => setToast(null), 4000)
 }

 function sendToPortal(plan) {
 const updated = plans.map(p => p.id === plan.id ? { ...p, sentToPortal: true } : p)
 storePlans(updated)
 setPlans(updated)
 setToast({ message: `"${plan.title || plan.subject}" sent to Parent & Student Portal!`, color: C.blue })
 setTimeout(() => setToast(null), 4000)
 }

 const filtered = plans.filter(p =>
 !search || p.title?.toLowerCase().includes(search.toLowerCase()) ||
 p.subject?.toLowerCase().includes(search.toLowerCase()) ||
 p.classLevel?.includes(search) || p.chapter?.toLowerCase().includes(search.toLowerCase()) ||
 p.teacher?.toLowerCase().includes(search.toLowerCase())
 )

 return (
 <div>
 {toast && <Toast message={toast.message} color={toast.color} onClose={() => setToast(null)} />}

 {/* Delete confirm */}
 {confirmDel && (
 <Portal>
 <div className="super-module-card" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
 <div className="super-module-card" style={{ background:'#071e34', border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:340, textAlign:'center' }}>
 <div style={{ display:'flex', justifyContent:'center', marginBottom:16, color:C.red }}><Trash2 size={40} /></div>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:16, marginBottom:8 }}>Delete Lesson Plan?</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:13, marginBottom:22 }}>This action cannot be undone.</div>
 <div className="super-module-card" style={{ display:'flex', gap:10 }}>
 <Btn variant="ghost" onClick={() => setConfirmDel(null)} style={{ flex:1, justifyContent:'center' }}>Cancel</Btn>
 <Btn variant="red" onClick={() => deletePlan(confirmDel)} style={{ flex:1, justifyContent:'center' }}>Delete</Btn>
 </div>
 </div>
 </div>
 </Portal>
 )}

 {autoGen && <AutoGenModal onGenerate={handleAutoGen} onClose={() => setAutoGen(false)} />}

 {/*  LIST / WEEKLY / ANNUAL  */}
 {view === 'list' && (
 <div>
 {/* Header */}
 <GCard style={{ marginBottom:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
 <div style={{ color: C.gold }}><BookOpen size={40} /></div>
 <div className="super-module-card" style={{ flex:1 }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:800, fontSize:20 }}>Lesson Plans</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:13 }}>{plans.length} plan{plans.length!==1?'s':''} saved · Bloom's taxonomy + portal sending</div>
 </div>
 {/* View switcher */}
 <div className="super-module-card" style={{ display:'flex', gap:4 }}>
 {[['list',' List'],['weekly',' Weekly'],['annual',' Annual']].map(([v,l]) => (
 <button key={v} onClick={() => setPlanView(v)}
 style={{ padding:'7px 14px', borderRadius:10, border:`1px solid ${planView===v?C.gold:C.border}`, background: planView===v?'rgba(148,163,184,0.18)':'rgba(15,23,42,0.46)', color: planView===v?C.gold:C.muted, fontWeight:700, fontSize:12, cursor:'pointer' }}>
 {l}
 </button>
 ))}
 </div>
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder=" Search..."
 style={{ background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:12, color:C.silver, padding:'10px 16px', fontSize:13, outline:'none', width:180 }} />
 <div className="super-module-card" style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
 {[['monthly','Monthly'],['term','Term-wise']].map(([v,l]) => (
 <button key={v} onClick={() => setPlanView(v)}
 style={{ padding:'7px 14px', borderRadius:10, border:`1px solid ${planView===v?C.gold:C.border}`, background: planView===v?'rgba(148,163,184,0.18)':'rgba(15,23,42,0.46)', color: planView===v?C.gold:C.muted, fontWeight:700, fontSize:12, cursor:'pointer' }}>
 {l}
 </button>
 ))}
 </div>
 <Btn variant="blue" onClick={() => setAutoGen(true)}> Auto-Generate</Btn>
 <Btn variant="gold" onClick={() => newPlan()}>+ New Plan</Btn>
 </GCard>

 {/* Weekly view */}
 {planView === 'weekly' && (
 <WeeklyView plans={plans} onEdit={openEdit} onPreview={openPreview} onSendPortal={sendToPortal} onNew={newPlan} />
 )}

 {/* Annual view */}
 {planView === 'annual' && (
 <AnnualView plans={plans} onPreview={openPreview} onNew={newPlan} />
 )}


 {(planView === 'monthly' || planView === 'term') && (
 <GroupedPlanView
 plans={plans.filter(p => planView === 'monthly' ? p.planningScope === 'monthly' : p.planningScope === 'term')}
 mode={planView}
 onEdit={openEdit}
 onPreview={openPreview}
 onNew={newPlan}
 />
 )}
 {/* List view */}
 {planView === 'list' && (
 filtered.length === 0 ? (
 <GCard style={{ textAlign:'center', padding:60 }}>
 <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: C.muted }}><BookOpen size={52} /></div>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:700, fontSize:18, marginBottom:8 }}>
 {plans.length === 0 ? 'No lesson plans yet' : 'No plans match your search'}
 </div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:14, marginBottom:24 }}>
 {plans.length === 0 ? 'Create your first plan manually or use Auto-Generate for bulk creation.' : 'Try a different search term.'}
 </div>
 {plans.length === 0 && (
 <div className="super-module-card" style={{ display:'flex', gap:10, justifyContent:'center' }}>
 <Btn variant="blue" onClick={() => setAutoGen(true)} style={{ justifyContent:'center' }}> Auto-Generate</Btn>
 <Btn variant="gold" onClick={() => newPlan()} style={{ justifyContent:'center' }}>+ Create First Plan</Btn>
 </div>
 )}
 </GCard>
 ) : (
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:16 }}>
 {filtered.map(p => (
 <PlanCard key={p.id} plan={p}
 onEdit={openEdit}
 onPreview={openPreview}
 onDelete={(id) => setConfirmDel(id)}
 onSendPortal={sendToPortal}
 />
 ))}
 </div>
 )
 )}
 </div>
 )}

 {/*  EDITOR VIEW  */}
 {view === 'editor' && editing && (
 <PlanEditor initial={editing} onSave={savePlan} onCancel={() => setView('list')} />
 )}

 {/*  PREVIEW VIEW  */}
 {view === 'preview' && editing && (
 <PlanPreview plan={editing} settings={settings} onBack={() => setView(plans.find(p => p.id === editing.id) ? 'list' : 'editor')} />
 )}
 </div>
 )
}
