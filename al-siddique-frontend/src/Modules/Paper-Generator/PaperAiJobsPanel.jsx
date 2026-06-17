import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, RotateCcw, Clock3, AlertTriangle, CheckCircle2, XCircle, Filter, Trash2, PauseCircle, PlayCircle, Activity } from 'lucide-react'
import { getPaperAiJobs, retryPaperAiJob, cancelPaperAiJob, deletePaperAiJob, clearPaperAiJobs, clearPaperAiQueueEvents, pausePaperAiQueue, resumePaperAiQueue } from './geminiService'

const STATUS = {
 queued: { color: '#0A84FF', icon: Clock3, label: 'Queued' },
 running: { color: '#64D2FF', icon: RefreshCw, label: 'Running' },
 completed: { color: '#30D158', icon: CheckCircle2, label: 'Completed' },
 failed: { color: '#FF375F', icon: XCircle, label: 'Failed' },
 cancelled: { color: '#FF9F0A', icon: AlertTriangle, label: 'Cancelled' },
}

function statusMeta(status) {
 return STATUS[status] || STATUS.queued
}

function formatLabel(job) {
 if (job?.type === 'pdf_import') return 'PDF Import'
 if (job?.type === 'handwritten_scan') return 'Handwritten Scan'
 if (job?.type === 'text_import') return 'Text Import'
 return job?.type || 'AI Job'
}

function minutesSince(iso) {
 const ts = Date.parse(iso || '')
 if (!Number.isFinite(ts)) return null
 return Math.max(0, Math.round((Date.now() - ts) / 60000))
}

export default function PaperAiJobsPanel({ title = 'AI Job History' }) {
 const [jobs, setJobs] = useState([])
 const [events, setEvents] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [retryingId, setRetryingId] = useState(null)
 const [cancellingId, setCancellingId] = useState(null)
 const [deletingId, setDeletingId] = useState(null)
 const [clearingHistory, setClearingHistory] = useState(false)
 const [clearingEvents, setClearingEvents] = useState(false)
 const [queuePaused, setQueuePaused] = useState(false)
 const [queueBusy, setQueueBusy] = useState(false)
 const [filter, setFilter] = useState('all')

 async function loadJobs() {
 setLoading(true)
 setError('')
 try {
 const [jobsResult] = await Promise.allSettled([getPaperAiJobs(6)])
 const data = jobsResult.status === 'fulfilled' ? jobsResult.value : null
 setJobs(Array.isArray(data?.jobs) ? data.jobs : [])
 setQueuePaused(Boolean(data?.queue?.paused))
 setEvents([])
 } catch (err) {
 setError(err.message || 'Could not load AI job history.')
 } finally {
 setLoading(false)
 }
 }

 useEffect(() => {
 loadJobs()
 }, [])

 useEffect(() => {
 const timer = setInterval(() => {
 loadJobs()
 }, 5000)
 return () => clearInterval(timer)
 }, [])

 const visibleJobs = useMemo(() => {
 if (filter === 'all') return jobs
 return jobs.filter(job => job.status === filter)
 }, [jobs, filter])

 const jobSummary = useMemo(() => {
 const counts = jobs.reduce((acc, job) => {
 acc[job.status] = (acc[job.status] || 0) + 1
 return acc
 }, {})
 return {
 total: jobs.length,
 queued: counts.queued || 0,
 running: counts.running || 0,
 failed: counts.failed || 0,
 completed: counts.completed || 0,
 cancelled: counts.cancelled || 0,
 }
 }, [jobs])

 const recentEvents = useMemo(() => events || [], [events])
 const latestEvent = recentEvents[0] || null

 const queueSignals = useMemo(() => {
 const queuedAges = jobs
 .filter(job => job.status === 'queued' || job.status === 'retrying')
 .map(job => minutesSince(job.createdAt))
 .filter(age => typeof age === 'number')
 const runningAges = jobs
 .filter(job => job.status === 'running')
 .map(job => minutesSince(job.startedAt || job.createdAt))
 .filter(age => typeof age === 'number')
 const oldestQueued = queuedAges.length ? Math.max(...queuedAges) : 0
 const oldestRunning = runningAges.length ? Math.max(...runningAges) : 0
 const stale = oldestQueued > 20 || oldestRunning > 30
 const message = stale
 ? `Queue attention: ${oldestQueued > 20 ? `oldest queued job ${oldestQueued}m` : ''}${oldestQueued > 20 && oldestRunning > 30 ? ' | ' : ''}${oldestRunning > 30 ? `oldest running job ${oldestRunning}m` : ''}`
 : ''
 return { oldestQueued, oldestRunning, stale, message }
 }, [jobs])

 async function handleRetry(job) {
 setRetryingId(job.id)
 setError('')
 try {
 await retryPaperAiJob(job.id)
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Retry failed.')
 } finally {
 setRetryingId(null)
 }
 }

 async function handleCancel(job) {
 if (!job?.id) return
 setCancellingId(job.id)
 try {
 await cancelPaperAiJob(job.id)
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Could not cancel job.')
 } finally {
 setCancellingId(null)
 }
 }

 async function handleDelete(job) {
 if (!job?.id) return
 setDeletingId(job.id)
 try {
 await deletePaperAiJob(job.id)
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Could not remove job from history.')
 } finally {
 setDeletingId(null)
 }
 }

 async function handleClearHistory() {
 setClearingHistory(true)
 setError('')
 try {
 await clearPaperAiJobs()
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Could not clear job history.')
 } finally {
 setClearingHistory(false)
 }
 }

 async function handleClearEvents() {
 setClearingEvents(true)
 setError('')
 try {
 await clearPaperAiQueueEvents()
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Could not clear queue actions.')
 } finally {
 setClearingEvents(false)
 }
 }

 async function handleToggleQueue() {
 setQueueBusy(true)
 setError('')
 try {
 if (queuePaused) {
 await resumePaperAiQueue()
 } else {
 await pausePaperAiQueue()
 }
 await loadJobs()
 } catch (err) {
 setError(err.message || 'Could not update queue state.')
 } finally {
 setQueueBusy(false)
 }
 }

 return (
 <div style={{
 background: 'rgba(15,23,42,0.46)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 14,
 padding: 14,
 display: 'flex',
 flexDirection: 'column',
 gap: 10,
 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
 <div>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 13 }}>{title}</div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>View recent imports and retry jobs that need another pass.</div>
 </div>
 <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
 <button
 type="button"
 onClick={() => setFilter('all')}
 style={{
 background: filter === 'all' ? 'rgba(10,132,255,0.16)' : 'rgba(255,255,255,0.07)',
 border: filter === 'all' ? '1px solid rgba(10,132,255,0.28)' : '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8,
 color: filter === 'all' ? '#0A84FF' : '#C0C8D8',
 padding: '6px 10px',
 cursor: 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 <Filter size={13} /> All
 </button>
 {['running', 'failed', 'completed'].map(status => (
 <button
 key={status}
 type="button"
 onClick={() => setFilter(status)}
 style={{
 background: filter === status ? 'rgba(10,132,255,0.16)' : 'rgba(255,255,255,0.07)',
 border: filter === status ? '1px solid rgba(10,132,255,0.28)' : '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8,
 color: filter === status ? '#0A84FF' : '#C0C8D8',
 padding: '6px 10px',
 cursor: 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 {status.charAt(0).toUpperCase() + status.slice(1)}
 </button>
 ))}
 <button
 type="button"
 onClick={loadJobs}
 style={{
 background: 'rgba(255,255,255,0.07)',
 border: '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8,
 color: '#C0C8D8',
 padding: '6px 10px',
 cursor: 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 <RefreshCw size={13} /> Refresh
 </button>
 <button
 type="button"
 onClick={handleToggleQueue}
 disabled={queueBusy}
 style={{
 background: queuePaused ? 'rgba(48,209,88,0.12)' : 'rgba(255,159,10,0.12)',
 border: queuePaused ? '1px solid rgba(48,209,88,0.26)' : '1px solid rgba(255,159,10,0.24)',
 borderRadius: 8,
 color: queuePaused ? '#30D158' : '#FFB84D',
 padding: '6px 10px',
 cursor: queueBusy ? 'wait' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 {queuePaused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
 {queueBusy ? (queuePaused ? 'Resuming...' : 'Pausing...') : (queuePaused ? 'Resume queue' : 'Pause queue')}
 </button>
 <button
 type="button"
 onClick={handleClearHistory}
 disabled={clearingHistory || jobSummary.total === 0}
 style={{
 background: 'rgba(255,255,255,0.05)',
 border: '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8,
 color: clearingHistory ? '#8892A4' : '#C0C8D8',
 padding: '6px 10px',
 cursor: clearingHistory || jobSummary.total === 0 ? 'not-allowed' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 <Trash2 size={13} /> {clearingHistory ? 'Clearing...' : 'Clear history'}
 </button>
 <button
 type="button"
 onClick={handleClearEvents}
 disabled={clearingEvents || recentEvents.length === 0}
 style={{
 background: 'rgba(255,255,255,0.05)',
 border: '1px solid rgba(255,255,255,0.1)',
 borderRadius: 8,
 color: clearingEvents ? '#8892A4' : '#C0C8D8',
 padding: '6px 10px',
 cursor: clearingEvents || recentEvents.length === 0 ? 'not-allowed' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 600,
 }}
 >
 <Activity size={13} /> {clearingEvents ? 'Clearing...' : 'Clear actions'}
 </button>
 </div>
 </div>

 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 {[
 ['Total', jobSummary.total, '#C8991A'],
 ['Queued', jobSummary.queued, '#0A84FF'],
 ['Running', jobSummary.running, '#64D2FF'],
 ['Failed', jobSummary.failed, '#FF375F'],
 ['Done', jobSummary.completed, '#30D158'],
 ].map(([label, value, color]) => (
 <span
 key={label}
 style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 8,
 padding: '7px 10px',
 borderRadius: 999,
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 color: '#C0C8D8',
 fontSize: 11,
 fontWeight: 700,
 }}
 >
 <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
 {label}: {value}
 </span>
 ))}
 {jobSummary.cancelled > 0 && (
 <span style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 8,
 padding: '7px 10px',
 borderRadius: 999,
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 color: '#C0C8D8',
 fontSize: 11,
 fontWeight: 700,
 }}>
 <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF9F0A' }} />
 Cancelled: {jobSummary.cancelled}
 </span>
 )}
 <span style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 8,
 padding: '7px 10px',
 borderRadius: 999,
 background: queuePaused ? 'rgba(48,209,88,0.08)' : 'rgba(255,159,10,0.08)',
 border: queuePaused ? '1px solid rgba(48,209,88,0.18)' : '1px solid rgba(255,159,10,0.18)',
 color: queuePaused ? '#30D158' : '#FFB84D',
 fontSize: 11,
 fontWeight: 700,
 }}>
 <span style={{ width: 8, height: 8, borderRadius: '50%', background: queuePaused ? '#30D158' : '#FF9F0A' }} />
 Queue {queuePaused ? 'paused' : 'running'}
 </span>
 </div>

 {queueSignals.stale && (
 <div style={{
 padding: '10px 12px',
 borderRadius: 12,
 background: 'rgba(255,159,10,0.1)',
 border: '1px solid rgba(255,159,10,0.22)',
 color: '#FFB84D',
 fontSize: 12,
 fontWeight: 700,
 lineHeight: 1.5,
 }}>
 {queueSignals.message || 'Queue attention: some AI jobs are aging.'}
 <div style={{ marginTop: 4, color: '#fff', fontWeight: 600 }}>
 Use cancel for stuck running jobs or retry for failed jobs.
 </div>
 </div>
 )}

 {recentEvents.length > 0 && (
 <div style={{
 padding: '10px 12px',
 borderRadius: 12,
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(148,163,184,0.12)',
 display: 'flex',
 flexDirection: 'column',
 gap: 8,
 }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 12 }}>
 <Activity size={13} color="#C8991A" /> Recent queue actions
 </div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>Latest {recentEvents.length}</div>
 </div>
 {latestEvent && (
 <div style={{
 padding: '8px 10px',
 borderRadius: 10,
 background: 'rgba(10,132,255,0.08)',
 border: '1px solid rgba(10,132,255,0.18)',
 color: '#C0C8D8',
 fontSize: 11,
 lineHeight: 1.5,
 }}>
 <strong style={{ color: '#fff' }}>
 {(latestEvent.eventType || 'event').replace(/_/g, ' ')}
 </strong>
 {latestEvent.message ? ` · ${latestEvent.message}` : ''}
 {latestEvent.createdAt ? ` · ${minutesSince(latestEvent.createdAt) !== null ? `${minutesSince(latestEvent.createdAt)}m ago` : new Date(latestEvent.createdAt).toLocaleTimeString()}` : ''}
 </div>
 )}
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 {recentEvents.slice(0, 6).map(event => (
 <span
 key={`${event.id || event.createdAt}-${event.eventType || 'event'}`}
 style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 padding: '6px 9px',
 borderRadius: 999,
 background: 'rgba(10,132,255,0.08)',
 border: '1px solid rgba(10,132,255,0.18)',
 color: '#C0C8D8',
 fontSize: 11,
 fontWeight: 600,
 maxWidth: '100%',
 }}
 >
 <span style={{ color: '#0A84FF', textTransform: 'capitalize' }}>
 {(event.eventType || 'event').replace(/_/g, ' ')}
 </span>
 <span style={{ color: '#8892A4' }}>{event.message || ''}</span>
 {event.createdAt && (
 <span style={{ color: '#8892A4' }}>
 {minutesSince(event.createdAt) !== null ? `${minutesSince(event.createdAt)}m ago` : new Date(event.createdAt).toLocaleTimeString()}
 </span>
 )}
 </span>
 ))}
 </div>
 </div>
 )}

 {loading ? (
 <div style={{ color: '#8892A4', fontSize: 12 }}>Loading job history...</div>
 ) : error ? (
 <div style={{
 color: '#FF375F',
 fontSize: 12,
 padding: '8px 10px',
 background: 'rgba(255,55,95,0.08)',
 border: '1px solid rgba(255,55,95,0.2)',
 borderRadius: 10,
 }}>
 {error}
 </div>
 ) : visibleJobs.length === 0 ? (
 <div style={{ color: '#8892A4', fontSize: 12 }}>No AI jobs yet.</div>
 ) : (
 visibleJobs.map(job => {
 const meta = statusMeta(job.status)
 const Icon = meta.icon
 const failedPages = Array.isArray(job?.result?.failedPages) ? job.result.failedPages : []
 const canRetry = job.status === 'failed' || (job.status === 'completed' && failedPages.length > 0)

 return (
 <div key={job.id} style={{
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(148,163,184,0.14)',
 borderRadius: 12,
 padding: 12,
 display: 'flex',
 flexDirection: 'column',
 gap: 8,
 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
 <div>
 <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{formatLabel(job)}</div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>{job.message || 'Processing'}</div>
 </div>
 <span style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 5,
 color: meta.color,
 fontSize: 11,
 fontWeight: 700,
 padding: '3px 8px',
 borderRadius: 999,
 background: `${meta.color}18`,
 border: `1px solid ${meta.color}40`,
 }}>
 <Icon size={12} /> {meta.label}
 </span>
 </div>

 <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
 <div style={{
 width: `${Math.max(0, Math.min(Number(job.progress || 0), 100))}%`,
 height: '100%',
 background: `linear-gradient(90deg, ${meta.color}, ${meta.color}CC)`,
 transition: 'width 0.3s ease',
 }} />
 </div>

 <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
 <div style={{ color: '#C0C8D8', fontSize: 11 }}>
 {new Date(job.createdAt || Date.now()).toLocaleString()}
 </div>
 <div style={{ color: '#8892A4', fontSize: 11 }}>Progress: {Math.round(Number(job.progress || 0))}%</div>
 </div>

 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
 {minutesSince(job.createdAt) !== null && (
 <span style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 color: '#C0C8D8',
 fontSize: 11,
 padding: '5px 8px',
 borderRadius: 999,
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 }}>
 <Clock3 size={11} /> Age: {minutesSince(job.createdAt)}m
 </span>
 )}
 {job.startedAt && minutesSince(job.startedAt) !== null && (
 <span style={{
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 color: '#C0C8D8',
 fontSize: 11,
 padding: '5px 8px',
 borderRadius: 999,
 background: 'rgba(255,255,255,0.04)',
 border: '1px solid rgba(255,255,255,0.08)',
 }}>
 <RefreshCw size={11} /> Running: {minutesSince(job.startedAt)}m
 </span>
 )}
 </div>

 {failedPages.length > 0 && (
 <div style={{
 color: '#FF9F0A',
 fontSize: 11,
 padding: '6px 8px',
 background: 'rgba(255,159,10,0.08)',
 border: '1px solid rgba(255,159,10,0.18)',
 borderRadius: 8,
 }}>
 Failed pages: {failedPages.join(', ')}
 </div>
 )}

 {Array.isArray(job?.result?.warnings) && job.result.warnings.length > 0 && (
 <div style={{ color: '#8892A4', fontSize: 11 }}>
 Warnings: {job.result.warnings.length}
 </div>
 )}

 {job?.error?.message && (
 <div style={{
 color: '#FF375F',
 fontSize: 11,
 padding: '6px 8px',
 background: 'rgba(255,55,95,0.08)',
 border: '1px solid rgba(255,55,95,0.16)',
 borderRadius: 8,
 }}>
 {job.error.message}
 </div>
 )}

 {canRetry && (
 <button
 type="button"
 onClick={() => handleRetry(job)}
 disabled={retryingId === job.id}
 style={{
 marginTop: 2,
 background: 'rgba(191,90,242,0.12)',
 border: '1px solid rgba(191,90,242,0.3)',
 borderRadius: 8,
 color: '#BF5AF2',
 padding: '7px 10px',
 cursor: retryingId === job.id ? 'wait' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 700,
 }}
 >
 <RotateCcw size={13} /> {retryingId === job.id ? 'Retrying...' : (failedPages.length ? 'Retry failed pages' : 'Retry job')}
 </button>
 )}

 {(['queued', 'running', 'retrying'].includes(job.status)) && (
 <button
 type="button"
 onClick={() => handleCancel(job)}
 disabled={cancellingId === job.id}
 style={{
 marginTop: 2,
 background: 'rgba(255,55,95,0.08)',
 border: '1px solid rgba(255,55,95,0.22)',
 borderRadius: 8,
 color: '#FF375F',
 padding: '7px 10px',
 cursor: cancellingId === job.id ? 'wait' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 700,
 }}
 >
 <XCircle size={13} /> {cancellingId === job.id ? 'Cancelling...' : 'Cancel job'}
 </button>
 )}

 {(['completed', 'failed', 'cancelled'].includes(job.status)) && (
 <button
 type="button"
 onClick={() => handleDelete(job)}
 disabled={deletingId === job.id}
 style={{
 marginTop: 2,
 background: 'rgba(255,255,255,0.05)',
 border: '1px solid rgba(255,255,255,0.12)',
 borderRadius: 8,
 color: '#C0C8D8',
 padding: '7px 10px',
 cursor: deletingId === job.id ? 'wait' : 'pointer',
 display: 'inline-flex',
 alignItems: 'center',
 gap: 6,
 fontSize: 12,
 fontWeight: 700,
 }}
 >
 <Trash2 size={13} /> {deletingId === job.id ? 'Removing...' : 'Clear history'}
 </button>
 )}
 </div>
 )
 })
 )}
 </div>
 )
}
