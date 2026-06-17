import { useState, useEffect } from 'react'
import { GraduationCap, CheckCircle2, CreditCard, Users, BarChart3, Book, MessageCircle, Trophy, Calendar, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '../services/api'

const ATTENDANCE_DATA = [
 { day: 'Mon', pct: 94 },
 { day: 'Tue', pct: 88 },
 { day: 'Wed', pct: 78 },
 { day: 'Thu', pct: 90 },
 { day: 'Fri', pct: 60 },
 { day: 'Sat', pct: 72 },
]

const QUICK_ACTIONS = [
 { label: 'Add Student', icon: <GraduationCap size={18} />, path: '/students' },
 { label: 'Mark Attendance', icon: <CheckCircle2 size={18} />, path: '/attendance' },
 { label: 'Create Challan', icon: <CreditCard size={18} />, path: '/fees' },
 { label: 'Generate Paper', icon: <Book size={18} />, path: '/paper-generator' },
 { label: 'Add Employee', icon: <Users size={18} />, path: '/employees' },
 { label: 'View Reports', icon: <BarChart3 size={18} />, path: '/examination' },
 { label: 'Send Message', icon: <MessageCircle size={18} />, path: '/messages' },
 { label: 'Library', icon: <Book size={18} />, path: '/library' },
]

const EVENTS = [
 { title: 'Mid-Term Exams', date: 'May 15, 2026', icon: <Book size={16} /> },
 { title: 'Fee Due Date', date: 'May 10, 2026', icon: <CreditCard size={16} /> },
 { title: 'Parent Meeting', date: 'May 20, 2026', icon: <MessageCircle size={16} /> },
 { title: 'Sports Day', date: 'May 25, 2026', icon: <Trophy size={16} /> },
]

export default function Dashboard() {
 const [date, setDate] = useState(new Date())
 const [stats, setStats] = useState(null)
 const [students, setStudents] = useState([])
 const [classData, setClassData] = useState([])
 const [loading, setLoading] = useState(true)

 // Clock
 useEffect(() => {
 const t = setInterval(() => setDate(new Date()), 60000)
 return () => clearInterval(t)
 }, [])

 // Fetch data
 useEffect(() => {
 const fetchData = async () => {
 try {
 const [statsRes, studentsRes, classRes] = await Promise.all([
 api.get('/stats'),
 api.get('/students'),
 api.get('/classes'),
 ])
 setStats(statsRes.data)
 setStudents(studentsRes.data)
 setClassData(classRes.data)
 } catch (error) {
 console.error('Failed to fetch dashboard data:', error)
 } finally {
 setLoading(false)
 }
 }
 fetchData()
 }, [])

 if (loading) {
 return (
 <div className="min-h-screen bg-slate-900 flex items-center justify-center">
 <div className="text-yellow-400 text-xl font-semibold">Loading Al Siddique OS...</div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
 <div className="max-w-[1320px] mx-auto space-y-6">
 {/* Header */}
 <div className="flex justify-between items-center gap-4 flex-wrap">
 <div>
 <h1 className="text-3xl font-bold text-yellow-400">Dashboard</h1>
 <p className="text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
 </div>
 <div className="text-right">
 <div className="text-2xl font-mono text-yellow-400">{date.toLocaleTimeString()}</div>
 <div className="text-sm text-slate-400">{date.toLocaleDateString()}</div>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-slate-400 text-sm">Total Students</p>
 <p className="text-2xl font-bold text-yellow-400">{stats?.totalStudents || 0}</p>
 </div>
 <Users className="text-blue-400" size={32} />
 </div>
 </div>
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-slate-400 text-sm">Today's Attendance</p>
 <p className="text-2xl font-bold text-green-400">{stats?.attendanceToday || 0}%</p>
 </div>
 <CheckCircle2 className="text-green-400" size={32} />
 </div>
 </div>
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-slate-400 text-sm">Pending Fees</p>
 <p className="text-2xl font-bold text-red-400">Rs. {stats?.pendingFees || 0}</p>
 </div>
 <CreditCard className="text-red-400" size={32} />
 </div>
 </div>
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-slate-400 text-sm">Active Exams</p>
 <p className="text-2xl font-bold text-purple-400">{stats?.activeExams || 0}</p>
 </div>
 <Book className="text-purple-400" size={32} />
 </div>
 </div>
 </div>

 {/* Quick Actions & Attendance Chart */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <h3 className="text-xl font-semibold text-yellow-400 mb-4">Quick Actions</h3>
 <div className="grid grid-cols-2 gap-3">
 {QUICK_ACTIONS.map((action, index) => (
 <button
 key={index}
 className="flex items-center gap-3 p-3 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors text-left"
 onClick={() => window.location.href = action.path}
 >
 {action.icon}
 <span className="text-sm font-medium">{action.label}</span>
 </button>
 ))}
 </div>
 </div>

 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <h3 className="text-xl font-semibold text-yellow-400 mb-4">Weekly Attendance</h3>
 <div className="flex items-end justify-between h-32">
 {ATTENDANCE_DATA.map((day, index) => (
 <div key={index} className="flex flex-col items-center flex-1">
 <div
 className="bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t w-full mb-2 transition-all"
 style={{ height: `${day.pct}%` }}
 ></div>
 <span className="text-xs text-slate-400">{day.day}</span>
 <span className="text-xs text-yellow-400 font-semibold">{day.pct}%</span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Recent Events & Alerts */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-2xl p-6">
 <h3 className="text-xl font-semibold text-yellow-400 mb-4">Upcoming Events</h3>
 <div className="space-y-3">
 {EVENTS.map((event, index) => (
 <div key={index} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
 <div className="text-yellow-400">{event.icon}</div>
 <div>
 <p className="font-medium text-slate-200">{event.title}</p>
 <p className="text-sm text-slate-400">{event.date}</p>
 </div>
 </div>
 ))}
 </div>
 </div>

 <div className="bg-slate-800/50 backdrop-blur-sm border border-yellow-400/20 rounded-xl p-6">
 <h3 className="text-xl font-semibold text-yellow-400 mb-4">Alerts & Notifications</h3>
 <div className="space-y-3">
 <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-400/20 rounded-lg">
 <AlertTriangle className="text-red-400 mt-0.5" size={16} />
 <div>
 <p className="font-medium text-red-300">Fee Defaulters</p>
 <p className="text-sm text-slate-400">12 students have pending fees</p>
 </div>
 </div>
 <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-400/20 rounded-lg">
 <TrendingUp className="text-yellow-400 mt-0.5" size={16} />
 <div>
 <p className="font-medium text-yellow-300">Exam Results</p>
 <p className="text-sm text-slate-400">Class 10 results are ready</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}
