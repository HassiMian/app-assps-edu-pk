import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, CheckCircle, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Flag, Send } from 'lucide-react'
import api from '../../services/api'

const GRADE_LABELS = [
 { min: 90, label: 'A+', color: '#10b981' },
 { min: 80, label: 'A', color: '#34d399' },
 { min: 70, label: 'B', color: '#3b82f6' },
 { min: 60, label: 'C', color: '#f59e0b' },
 { min: 50, label: 'D', color: '#f97316' },
 { min: 0, label: 'F', color: '#ef4444' },
]
const getGrade = (pct) => GRADE_LABELS.find(g => pct >= g.min) || GRADE_LABELS[GRADE_LABELS.length - 1]

const MOCK_EXAM = {
 id: 'demo',
 title: 'Mathematics — Chapter 3 Test',
 subject: 'Mathematics',
 class: 'Class 10',
 duration: 30,
 total_marks: 20,
 questions: [
 { id: 1, text: 'What is the value of π (pi) to 2 decimal places?', type: 'mcq', options: ['3.12', '3.14', '3.16', '3.18'], correct: '3.14', marks: 1 },
 { id: 2, text: 'Solve for x: 3x + 9 = 0', type: 'mcq', options: ['x = 3', 'x = -3', 'x = 9', 'x = -9'], correct: 'x = -3', marks: 2 },
 { id: 3, text: 'What is the square root of 144?', type: 'mcq', options: ['11', '12', '13', '14'], correct: '12', marks: 1 },
 { id: 4, text: 'If a triangle has sides 3, 4, 5 — is it a right triangle?', type: 'mcq', options: ['Yes', 'No', 'Cannot determine', 'Only sometimes'], correct: 'Yes', marks: 2 },
 { id: 5, text: 'What is 15% of 200?', type: 'mcq', options: ['25', '30', '35', '40'], correct: '30', marks: 1 },
 { id: 6, text: 'Simplify: (x² – 4) ÷ (x + 2)', type: 'short', correct: 'x - 2', marks: 3 },
 { id: 7, text: 'Find the area of a circle with radius 7 cm. (Use π = 22/7)', type: 'short', correct: '154', marks: 3 },
 { id: 8, text: 'A car travels 120 km in 2 hours. What is its speed in km/h?', type: 'short', correct: '60', marks: 2 },
 { id: 9, text: 'What is the HCF of 24 and 36?', type: 'mcq', options: ['6', '8', '12', '18'], correct: '12', marks: 2 },
 { id: 10, text: 'Convert 0.75 to a fraction in simplest form.', type: 'short', correct: '3/4', marks: 3 },
 ]
}

function formatTime(secs) {
 const m = Math.floor(secs / 60).toString().padStart(2, '0')
 const s = (secs % 60).toString().padStart(2, '0')
 return `${m}:${s}`
}

export default function OnlineTest() {
 const { examId } = useParams()
 const navigate = useNavigate()

 const [exam, setExam] = useState(null)
 const [loading, setLoading] = useState(true)
 const [answers, setAnswers] = useState({})
 const [flagged, setFlagged] = useState(new Set())
 const [current, setCurrent] = useState(0)
 const [timeLeft, setTimeLeft] = useState(0)
 const [submitted, setSubmitted] = useState(false)
 const [result, setResult] = useState(null)
 const [warn5, setWarn5] = useState(false)
 const [confirmEnd, setConfirmEnd] = useState(false)
 const timerRef = useRef(null)

 useEffect(() => {
 const load = async () => {
 try {
 const res = await api.get(`/api/exams/${examId}`)
 const data = res.data?.data
 if (data?.questions?.length) {
 setExam(data)
 setTimeLeft((data.duration || 30) * 60)
 } else { throw new Error('no questions') }
 } catch {
 setExam(MOCK_EXAM)
 setTimeLeft(MOCK_EXAM.duration * 60)
 }
 setLoading(false)
 }
 load()
 }, [examId])

 const submit = useCallback((auto = false) => {
 if (!exam) return
 clearInterval(timerRef.current)
 let totalScore = 0
 const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0)
 const detail = exam.questions.map(q => {
 const userAns = (answers[q.id] || '').trim().toLowerCase()
 const correct = q.correct.trim().toLowerCase()
 const isCorrect = userAns === correct
 if (isCorrect) totalScore += q.marks
 return { ...q, userAnswer: answers[q.id] || '', isCorrect }
 })
 const pct = Math.round((totalScore / totalMarks) * 100)
 setResult({ score: totalScore, total: totalMarks, pct, detail, auto })
 setSubmitted(true)
 }, [exam, answers])

 useEffect(() => {
 if (!exam || submitted) return
 timerRef.current = setInterval(() => {
 setTimeLeft(prev => {
 if (prev <= 1) { clearInterval(timerRef.current); submit(true); return 0 }
 if (prev === 300) setWarn5(true)
 return prev - 1
 })
 }, 1000)
 return () => clearInterval(timerRef.current)
 }, [exam, submitted, submit])

 if (loading) return (
 <div className="min-h-screen bg-slate-900 flex items-center justify-center">
 <div className="text-center">
 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
 <p className="text-slate-400">Loading exam...</p>
 </div>
 </div>
 )

 //  RESULT SCREEN 
 if (submitted && result) {
 const grade = getGrade(result.pct)
 const answered = Object.keys(answers).length
 return (
 <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
 <div className="max-w-2xl mx-auto">
 {result.auto && (
 <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium flex items-center gap-2">
 <AlertTriangle className="w-4 h-4" /> Time expired — exam submitted automatically.
 </div>
 )}
 <div className="bg-slate-800/70 border border-white/10 rounded-2xl p-8 text-center mb-6">
 <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center mx-auto mb-4"
 style={{ borderColor: grade.color, background: `${grade.color}18` }}>
 <span className="text-4xl font-black" style={{ color: grade.color }}>{grade.label}</span>
 </div>
 <h1 className="text-2xl font-bold text-white mb-1">Exam Complete!</h1>
 <p className="text-slate-400 mb-6">{exam.title}</p>
 <div className="grid grid-cols-3 gap-4 mb-6">
 <div className="bg-slate-700/50 rounded-xl p-4">
 <div className="text-3xl font-black" style={{ color: grade.color }}>{result.pct}%</div>
 <div className="text-slate-400 text-xs mt-1">Score</div>
 </div>
 <div className="bg-slate-700/50 rounded-xl p-4">
 <div className="text-3xl font-black text-white">{result.score}<span className="text-slate-400 text-base font-normal">/{result.total}</span></div>
 <div className="text-slate-400 text-xs mt-1">Marks</div>
 </div>
 <div className="bg-slate-700/50 rounded-xl p-4">
 <div className="text-3xl font-black text-white">{answered}<span className="text-slate-400 text-base font-normal">/{exam.questions.length}</span></div>
 <div className="text-slate-400 text-xs mt-1">Attempted</div>
 </div>
 </div>
 <button onClick={() => navigate(-1)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-colors">
 Back to Dashboard
 </button>
 </div>

 <h3 className="text-white font-bold text-lg mb-3">Answer Review</h3>
 <div className="space-y-3">
 {result.detail.map((q, i) => (
 <div key={q.id} className={`rounded-xl p-4 border ${q.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
 <div className="flex items-start gap-3">
 {q.isCorrect
 ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
 : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
 <div className="flex-1 min-w-0">
 <p className="text-white text-sm font-medium">{i+1}. {q.text}</p>
 <p className="text-slate-400 text-xs mt-1">Your answer: <span className={q.isCorrect ? 'text-emerald-400' : 'text-red-400'}>{q.userAnswer || 'Not answered'}</span></p>
 {!q.isCorrect && <p className="text-xs text-emerald-400 mt-0.5">Correct: {q.correct}</p>}
 </div>
 <span className="text-xs font-bold shrink-0" style={{ color: q.isCorrect ? '#10b981' : '#ef4444' }}>
 {q.isCorrect ? `+${q.marks}` : '0'}/{q.marks}
 </span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )
 }

 const q = exam.questions[current]
 const totalMarks = exam.questions.reduce((s, qq) => s + qq.marks, 0)
 const answeredCount = Object.keys(answers).length
 const progress = Math.round((answeredCount / exam.questions.length) * 100)
 const urgent = timeLeft < 300

 //  EXAM SCREEN 
 return (
 <div className="min-h-screen bg-slate-900 text-slate-200">
 {/* Timer bar */}
 <div className={`fixed top-0 left-0 right-0 z-50 px-6 py-3 flex items-center justify-between shadow-lg
 ${urgent ? 'bg-red-900/90 border-b border-red-500/40' : 'bg-slate-800/95 border-b border-white/10'}`}>
 <div className="font-bold text-white truncate">{exam.title}</div>
 <div className="flex items-center gap-4">
 <span className="text-slate-400 text-sm">{answeredCount}/{exam.questions.length} answered</span>
 <div className={`flex items-center gap-2 font-mono font-bold text-xl ${urgent ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
 <Clock className="w-5 h-5" />
 {formatTime(timeLeft)}
 </div>
 <button onClick={() => setConfirmEnd(true)}
 className="bg-red-600 hover:bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors">
 <Send className="w-4 h-4" /> Submit
 </button>
 </div>
 </div>

 {warn5 && (
 <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-semibold flex items-center gap-2 shadow-xl">
 <AlertTriangle className="w-4 h-4" /> 5 minutes remaining!
 </div>
 )}

 <div className="flex pt-14" style={{ minHeight: '100vh' }}>
 {/* Sidebar — question grid */}
 <aside className="w-60 shrink-0 bg-slate-800/60 border-r border-white/5 p-4 overflow-y-auto hidden md:block">
 <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Questions</div>
 <div className="grid grid-cols-5 gap-1.5 mb-4">
 {exam.questions.map((qq, i) => (
 <button key={qq.id} onClick={() => setCurrent(i)}
 className={`w-9 h-9 rounded-lg text-xs font-bold transition-all
 ${i === current ? 'ring-2 ring-blue-400' : ''}
 ${answers[qq.id] ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-700 text-slate-400'}
 ${flagged.has(qq.id) ? 'ring-1 ring-amber-400' : ''}`}>
 {i + 1}
 </button>
 ))}
 </div>
 <div className="space-y-1.5 text-xs text-slate-500">
 <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500/25 rounded" /> Answered</div>
 <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-700 rounded" /> Unanswered</div>
 <div className="flex items-center gap-2"><span className="w-3 h-3 border border-amber-400 rounded" /> Flagged</div>
 </div>
 <div className="mt-4">
 <div className="flex justify-between text-xs text-slate-400 mb-1">
 <span>Progress</span><span>{progress}%</span>
 </div>
 <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
 <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
 </div>
 </div>
 <div className="mt-3 text-xs text-slate-500">
 Total: {totalMarks} marks
 </div>
 </aside>

 {/* Main question area */}
 <main className="flex-1 p-6 md:p-10 max-w-3xl">
 <div className="flex items-center justify-between mb-6">
 <span className="text-slate-400 text-sm">Question {current + 1} of {exam.questions.length}</span>
 <div className="flex items-center gap-3">
 <span className="text-xs font-semibold bg-blue-500/15 text-blue-300 px-3 py-1 rounded-full">
 {q.marks} mark{q.marks > 1 ? 's' : ''}
 </span>
 <button onClick={() => setFlagged(prev => {
 const n = new Set(prev)
 n.has(q.id) ? n.delete(q.id) : n.add(q.id)
 return n
 })} className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-colors
 ${flagged.has(q.id) ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-slate-600 text-slate-500 hover:border-slate-500'}`}>
 <Flag className="w-3 h-3" /> {flagged.has(q.id) ? 'Flagged' : 'Flag'}
 </button>
 </div>
 </div>

 <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 mb-6">
 <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">{q.text}</h2>

 {q.type === 'mcq' ? (
 <div className="space-y-3">
 {q.options.map((opt, i) => {
 const letters = ['A', 'B', 'C', 'D']
 const selected = answers[q.id] === opt
 return (
 <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all
 ${selected ? 'bg-blue-500/15 border-blue-500/50' : 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500'}`}>
 <input type="radio" name={`q-${q.id}`} value={opt} checked={selected}
 onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
 className="sr-only" />
 <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0
 ${selected ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}`}>{letters[i]}</span>
 <span className={`text-base ${selected ? 'text-white' : 'text-slate-300'}`}>{opt}</span>
 </label>
 )
 })}
 </div>
 ) : (
 <div>
 <label className="block text-xs font-medium text-slate-400 mb-2">Your Answer</label>
 <textarea rows={4} value={answers[q.id] || ''}
 onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
 placeholder="Type your answer here..."
 className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base" />
 </div>
 )}
 </div>

 <div className="flex items-center gap-3">
 <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 hover:text-white transition-colors disabled:opacity-40">
 <ChevronLeft className="w-4 h-4" /> Previous
 </button>
 <button onClick={() => setCurrent(c => Math.min(exam.questions.length - 1, c + 1))} disabled={current === exam.questions.length - 1}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-40 ml-auto">
 Next <ChevronRight className="w-4 h-4" />
 </button>
 </div>

 {/* Mobile question dots */}
 <div className="flex gap-1 flex-wrap mt-6 md:hidden">
 {exam.questions.map((qq, i) => (
 <button key={qq.id} onClick={() => setCurrent(i)}
 className={`w-8 h-8 rounded-lg text-xs font-bold
 ${i === current ? 'ring-2 ring-blue-400' : ''}
 ${answers[qq.id] ? 'bg-emerald-500/25 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
 {i + 1}
 </button>
 ))}
 </div>
 </main>
 </div>

 {/* Confirm submit modal */}
 {confirmEnd && (
 <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
 <div className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">
 <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
 <h3 className="text-white font-bold text-xl mb-2">Submit Exam?</h3>
 <p className="text-slate-400 text-sm mb-6">
 You have answered {answeredCount} of {exam.questions.length} questions.
 {exam.questions.length - answeredCount > 0 && ` ${exam.questions.length - answeredCount} unanswered.`}
 <br />This cannot be undone.
 </p>
 <div className="flex gap-3">
 <button onClick={() => setConfirmEnd(false)} className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 hover:border-slate-500 transition-colors">Cancel</button>
 <button onClick={() => { setConfirmEnd(false); submit(false) }} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors">Submit Now</button>
 </div>
 </div>
 </div>
 )}
 </div>
 )
}
