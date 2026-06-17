// PaperGenerator.jsx — Al Siddique Smart School OS
import { lazy, Suspense, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePaperStore } from './usePaperStore'
import { useAcademicStore } from '../../services/useAcademicStore'
import { DonutChart, BarChart, ChartLegend } from '../../components/Charts' // used in Paper Analytics section
import PaperPreviewEngine from './PaperPreviewEngine'
import AIGeneratorTab from './AIGeneratorTab'
import ManualPaperTab from './ManualPaperTab'
import SavedPapersTab from './SavedPapersTab'
import LessonPlanTab from './LessonPlanTab'
const PTSPaperGenerator = lazy(() => import('./PTSPaperGenerator'))
const BoardPaperGenerator = lazy(() => import('./BoardPaperGenerator'))
const HandwrittenScannerTab = lazy(() => import('./HandwrittenScannerTab'))
const QuestionBank = lazy(() => import('./QuestionBank'))
const NotesMakerTab = lazy(() => import('./NotesMakerTab'))
const DailyDiaryFeature = lazy(() => import('./DailyDiaryFeature'))

const C = {
  card: 'rgba(15,23,42,0.58)',
  gold: '#C8991A', goldL: '#e8b420',
  silver: '#C0C8D8', muted: '#8892A4',
  green: '#30D158', red: '#FF375F',
  orange: '#FF9F0A', blue: '#0A84FF',
  border: 'rgba(148,163,184,0.18)',
}
const GCard = ({ children, style = {} }) => (
  <div className="super-module-card" style={{ background: C.card, backdropFilter: 'blur(20px)', border: `1px solid ${C.border}`, borderRadius: 18, padding: 24, boxShadow: '0 12px 32px rgba(7,30,52,0.28)', ...style }}>{children}</div>
)
const Lbl = ({ children }) => (
  <label style={{ color: C.muted, fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, letterSpacing: '0.06em' }}>{children}</label>
)
const Inp = ({ style = {}, ...props }) => (
  <input {...props} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.silver, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style }} />
)
const Sel = ({ style = {}, children, ...props }) => (
  <select {...props} style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.silver, padding: '11px 14px', fontSize: 14, outline: 'none', cursor: 'pointer', boxSizing: 'border-box', ...style }}>{children}</select>
)
const TabBtn = ({ active, onClick, children, style: s = {} }) => (
  <button onClick={onClick} style={{ background: active ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(15,23,42,0.46)', color: active ? '#071e34' : C.silver, fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 10, border: active ? 'none' : `1px solid ${C.border}`, cursor: 'pointer', whiteSpace: 'nowrap', ...s }}>{children}</button>
)

const EXAM_TYPES = ['Mid Term', 'Final Term', 'Monthly Test', 'Weekly Test', 'Assessment']
const isDual = cls => ['9', '10'].includes(String(cls))

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MODULE_TABS = [
  { id: 'build',         label: 'Paper Studio'     },
  { id: 'unified',       label: 'Unified Paper Generator', path: '/paper-generator/unified' },
  { id: 'board_pattern', label: 'Board Paper Mode' },
  { id: 'manual',        label: 'Manual Draft'     },
  { id: 'scan',          label: 'AI Scan'          },
  { id: 'ai',            label: 'AI Generator'     },
  { id: 'notes',         label: 'Notes Maker'      },
  { id: 'diary',         label: 'Daily Diary'      },
  { id: 'lesson',        label: 'Lesson Plans'     },
  { id: 'bank',          label: 'Question Bank'    },
  { id: 'saved',         label: 'Saved Papers'     },
]

export default function PaperGenerator() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const initialTab = MODULE_TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'build'
  const [moduleTab, setModuleTab] = useState(initialTab)
  const [mode, setMode] = useState('offline')
  const [step, setStep] = useState(0)

  const { subjects, questions, paperSettings, getQuestionsForPaper, getChaptersForSubject, loadSampleData } = usePaperStore()
  const { activeClasses, classes: acClasses, subjects: acSubjects } = useAcademicStore()

  // Calculate paper stats for the mini-dashboard
  const paperStats = useMemo(() => {
    const totalPapers = 42 // Mock or from store
    const subjectMap = {}
    subjects.forEach(s => { subjectMap[s.name] = (subjectMap[s.name] || 0) + 1 })
    const topSubjects = Object.entries(subjectMap).sort((a,b) => b[1] - a[1]).slice(0, 5)
    return { totalPapers, topSubjects }
  }, [subjects])

  const [loadedSavedPaper, setLoadedSavedPaper] = useState(null)

  const [config, setConfig] = useState({
    title: '', classLevel: '', subject: '',
    examType: 'Mid Term', duration: 60, totalMarks: 100,
    instructions: '',
    language: 'english',
    examDate: new Date().toISOString().slice(0, 10),
    paperCode: String(Math.floor(1000 + Math.random() * 9000)),
  })
  const [selectedMCQ,   setSelectedMCQ]   = useState([])
  const [selectedShort, setSelectedShort] = useState([])
  const [selectedLong,  setSelectedLong]  = useState([])


  const availableSubjects = useMemo(() =>
    [...new Set(subjects.filter(s => !config.classLevel || s.classLevel === config.classLevel).map(s => s.name))],
    [subjects, config.classLevel]
  )

  const chapters = useMemo(() =>
    getChaptersForSubject(config.subject, config.classLevel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.subject, config.classLevel, questions.length]
  )

  const mcqPool   = useMemo(() => getQuestionsForPaper({ subjectName: config.subject, classLevel: config.classLevel, type: 'mcq'   }), [config.subject, config.classLevel, questions.length]) // eslint-disable-line
  const shortPool = useMemo(() => getQuestionsForPaper({ subjectName: config.subject, classLevel: config.classLevel, type: 'short' }), [config.subject, config.classLevel, questions.length]) // eslint-disable-line
  const longPool  = useMemo(() => getQuestionsForPaper({ subjectName: config.subject, classLevel: config.classLevel, type: 'long'  }), [config.subject, config.classLevel, questions.length]) // eslint-disable-line

  const toggleQ = (q, selected, setSelected) => {
    setSelected(prev => prev.find(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, { ...q }])
  }

  const totalSelected = selectedMCQ.length + selectedShort.length + selectedLong.length
  const totalMarksSelected = [...selectedMCQ, ...selectedShort, ...selectedLong].reduce((s, q) => s + (q.marks || 1), 0)

  const cfgSet = (k) => (e) => setConfig(prev => ({ ...prev, [k]: e.target.value }))

  function handleProceedToPreview({ config: cfg, selectedMCQ: mcq, selectedShort: sh, selectedLong: lg, ...rest }) {
    const paperObj = { config: cfg, selectedMCQ: mcq || [], selectedShort: sh || [], selectedLong: lg || [], isAIGenerated: true, ...rest }
    setLoadedSavedPaper(paperObj)
    setModuleTab('build')
  }

  function handleLoadPaper(paper) {
    setLoadedSavedPaper(paper)
    if (paper?.structureMode === 'board_pattern') {
       setModuleTab('board_pattern')
    } else {
       setModuleTab('build')
    }
  }

  const openModuleTab = (tab) => {
    if (tab.path) {
      navigate(tab.path)
      return
    }
    setModuleTab(tab.id)
  }

  const ModuleWrap = ({ children }) => (
    <div style={{ minHeight:'100vh', width:'100%', background:'#071e34' }}>
      <div style={{ padding:'10px 24px', display:'flex', gap:8, borderBottom:'1px solid rgba(148,163,184,0.18)' }}>
        {MODULE_TABS.map(t => <TabBtn key={t.id} active={moduleTab === t.id} onClick={() => openModuleTab(t)}>{t.label}</TabBtn>)}
      </div>
      <Suspense fallback={<div style={{padding:40, color:C.silver}}>Loading...</div>}>{children}</Suspense>
    </div>
  )

  // PTS Build Paper tab renders as its own full-screen flow
  if (moduleTab === 'build' || moduleTab === 'board_pattern') {
    return (
      <>
        {moduleTab === 'build' && <ModuleWrap><PTSPaperGenerator loadedPaper={loadedSavedPaper} onReturnToSource={() => setModuleTab(loadedSavedPaper?.sourceTab || 'build')} /></ModuleWrap>}
        {moduleTab === 'board_pattern' && <ModuleWrap><BoardPaperGenerator loadedPaper={loadedSavedPaper} onReturnToSource={() => setModuleTab(loadedSavedPaper?.sourceTab || 'build')} /></ModuleWrap>}
      </>
    )
  }

  // Dashboard data
  const pgDashCard = { background: 'rgba(15,23,42,0.58)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 18, padding: 20 };
  const pgDashTitle = { color: '#C0C8D8', fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 };
  const EXAM_TYPE_COLORS = ['#C8991A','#0A84FF','#30D158','#BF5AF2','#FF375F'];
  const examTypeBars = EXAM_TYPES.map((et, i) => ({ label: et.split(' ')[0], value: i + 1, color: EXAM_TYPE_COLORS[i % EXAM_TYPE_COLORS.length] }));
  const paperSettingsSegments = [
    { value: 60, color: '#0A84FF' },
    { value: 30, color: '#30D158' },
    { value: 10, color: '#C8991A' },
  ];

  return (
    <div className="super-module-card" style={{ minHeight: '100vh', width:'100%', maxWidth:'100%', overflowX:'hidden', background: '#071e34', color: C.silver, fontFamily: 'Inter, sans-serif' }}>
      <div className="paper-generator-content" style={{ padding: '24px 28px' }}>

        {/* ── Paper Generator Dashboard ─────────────────────────────────────── */}
        {/* Stats Cards */}
        <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Classes',  value: acClasses?.length || 0,  icon: '🏫', grad: 'linear-gradient(135deg,rgba(148,163,184,0.18),rgba(200,153,26,0.06))' },
            { label: 'Total Subjects', value: acSubjects?.length || 0, icon: '📚', grad: 'linear-gradient(135deg,rgba(13,148,136,0.18),rgba(13,148,136,0.06))' },
            { label: 'Exam Types',     value: EXAM_TYPES.length,       icon: '📝', grad: 'linear-gradient(135deg,rgba(10,132,255,0.18),rgba(10,132,255,0.06))' },
            { label: 'Saved Papers',   value: 0,                       icon: '💾', grad: 'linear-gradient(135deg,rgba(191,90,242,0.18),rgba(191,90,242,0.06))' },
          ].map(c => (
            <div key={c.label} style={{ ...pgDashCard, background: c.grad, padding: '16px 18px' }}>
              <div className="super-module-card" style={{ fontSize: 22 }}>{c.icon}</div>
              <div className="super-module-card" style={{ color: 'white', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{c.value}</div>
              <div className="super-module-card" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{c.label}</div>
            </div>
          ))}
        </div>


        {/* ── Header + Module Tabs ─────────────────────────────────────────────── */}
        <GCard style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="super-module-card" style={{ width: 52, height: 52, borderRadius: 20, background: 'rgba(200,153,26,0.16)', border: `1px solid rgba(200,153,26,0.35)`, display: 'grid', placeItems: 'center', fontSize: 24 }}>📄</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, color: '#fff', fontFamily: "'Playfair Display',serif", fontWeight: 800 }}>Paper Generator</h1>
              <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 13 }}>Smart Assessment Management Portal</p>
            </div>
          </div>
          <div className="super-module-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {MODULE_TABS.map(t => (
              <TabBtn key={t.id} active={moduleTab === t.id} onClick={() => openModuleTab(t)}>{t.label}</TabBtn>
            ))}
          </div>
        </GCard>

        {/* ── Paper Analytics Row ──────────────────────────────────────────────── */}
        {moduleTab !== 'build' && (
          <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
            <div style={pgDashCard}>
               <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Total Papers</div>
               <div className="super-module-card" style={{ color: C.gold, fontSize: 32, fontWeight: 900 }}>{paperStats.totalPapers}</div>
               <div className="super-module-card" style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>System generated sessions</div>
            </div>
            <div style={pgDashCard}>
               <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Question Bank</div>
               <div className="super-module-card" style={{ color: C.blue, fontSize: 32, fontWeight: 900 }}>{questions.length}</div>
               <div className="super-module-card" style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Available questions</div>
            </div>
            <div className="super-module-card" style={{ ...pgDashCard, gridRow: 'span 1' }}>
               <div className="super-module-card" style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Top Subjects Distribution</div>
               <div className="super-module-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paperStats.topSubjects.map(([name, count], i) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 9, color: C.silver, width: 60, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                      <div className="super-module-card" style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                         <div className="super-module-card" style={{ width: `${(count/paperStats.topSubjects[0][1])*100}%`, height: '100%', background: [C.gold, C.blue, C.green, C.orange, C.red][i%5], borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 9, color: C.gold, fontWeight: 700 }}>{count}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* ── AI Generator ────────────────────────────────────────────────────── */}
        {moduleTab === 'ai' && <AIGeneratorTab onProceedToPreview={handleProceedToPreview} />}
        {moduleTab === 'manual' && <ManualPaperTab onProceedToPreview={handleProceedToPreview} />}
        {moduleTab === 'scan' && (
          <Suspense fallback={<div style={{ padding: 40, color: C.silver }}>Loading AI Scan...</div>}>
            <HandwrittenScannerTab onProceedToPreview={handleProceedToPreview} />
          </Suspense>
        )}
        {moduleTab === 'notes' && (
          <Suspense fallback={<div style={{ padding: 40, color: C.silver }}>Loading Notes Maker...</div>}>
            <NotesMakerTab />
          </Suspense>
        )}
        {moduleTab === 'diary' && (
          <Suspense fallback={<div style={{ padding: 40, color: C.silver }}>Loading Daily Diary...</div>}>
            <DailyDiaryFeature />
          </Suspense>
        )}
        {moduleTab === 'bank' && (
          <Suspense fallback={<div style={{ padding: 40, color: C.silver }}>Loading Question Bank...</div>}>
            <QuestionBank />
          </Suspense>
        )}

        {/* ── Saved Papers ────────────────────────────────────────────────────── */}
        {moduleTab === 'saved' && <SavedPapersTab onLoadPaper={handleLoadPaper} />}

        {/* ── Lesson Plans ─────────────────────────────────────────────────── */}
        {moduleTab === 'lesson' && <LessonPlanTab settings={paperSettings} />}

        {/* ── Build Paper ─────────────────────────────────────────────────────── */}
        {moduleTab === 'build' && (
          <>
            {/* Mode + Step bar */}
            <div className="super-module-card" style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="super-module-card" style={{ display: 'flex', gap: 8 }}>
                <TabBtn active={mode === 'offline'} onClick={() => { setMode('offline'); if (step > 2) setStep(0) }}>🖨️ Offline Paper</TabBtn>
                <TabBtn active={mode === 'online'}  onClick={() => { setMode('online');  if (step > 3) setStep(0) }}>🌐 Online Test</TabBtn>
              </div>
              <div className="super-module-card" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {(mode === 'offline' ? ['⚙️ Setup', '❓ Questions', '👁️ Preview'] : ['⚙️ Setup', '❓ Questions', '👥 Assign', '🚀 Publish']).map((label, i) => (
                  <div key={i} onClick={() => i < step && setStep(i)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12,
                    background: i === step ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : i < step ? 'rgba(48,209,88,0.12)' : 'rgba(15,23,42,0.46)',
                    border: i < step ? `1px solid rgba(48,209,88,0.3)` : `1px solid ${C.border}`,
                    color: i === step ? '#071e34' : i < step ? C.green : C.muted,
                    fontWeight: 700, fontSize: 13, cursor: i < step ? 'pointer' : 'default', whiteSpace: 'nowrap',
                  }}>
                    {i < step && <span>✓</span>}
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* ─── STEP 0: CONFIG ─────────────────────────────────────────────── */}
            {step === 0 && (
              <GCard>
                <h2 style={{ color: C.gold, fontSize: 18, fontFamily: "'Playfair Display',serif", marginBottom: 20 }}>
                  {mode === 'offline' ? 'Paper Setup' : 'Online Exam Setup'}
                </h2>
                <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  <div className="super-module-card" style={{ gridColumn: '1 / -1' }}>
                    <Lbl>{mode === 'offline' ? 'Paper Title' : 'Exam Title'}</Lbl>
                    <Inp value={config.title} onChange={cfgSet('title')} placeholder="e.g. Mid Term Mathematics Paper 2026" />
                  </div>
                  <div>
                    <Lbl>Class</Lbl>
                    <Sel value={config.classLevel} onChange={e => {
                      const cls = e.target.value
                      setConfig(prev => ({
                        ...prev,
                        classLevel: cls,
                        subject: '',
                        language: isDual(cls) ? prev.language : 'english',
                      }))
                    }}>
                      <option value="">Select Class</option>
                      {activeClasses.map(c => <option key={c.level} value={c.level}>{c.name}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <Lbl>Subject <span style={{ color: C.muted, fontSize: 10, fontWeight: 400 }}>(select or type custom)</span></Lbl>
                    <Inp
                      list="pg-subjects-list"
                      value={config.subject}
                      onChange={cfgSet('subject')}
                      placeholder="e.g. Mathematics, Physics…"
                    />
                    <datalist id="pg-subjects-list">
                      {(availableSubjects.length > 0
                        ? availableSubjects
                        : ['Mathematics', 'English', 'Urdu', 'Science', 'Islamiyat', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Pakistan Studies', 'Arts', 'Physical Education']
                      ).map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <Lbl>Exam Type</Lbl>
                    <Sel value={config.examType} onChange={cfgSet('examType')}>
                      {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <Lbl>Duration (minutes)</Lbl>
                    <Inp type="number" value={config.duration} onChange={cfgSet('duration')} min={15} max={240} />
                  </div>
                  {mode === 'offline' && (
                    <>
                      <div>
                        <Lbl>
                          Language / زبان
                          {!isDual(config.classLevel) && config.classLevel && (
                            <span style={{ color: C.orange, fontSize: 10, marginLeft: 6, fontWeight: 500 }}>• Dual medium: Class 9 & 10 only</span>
                          )}
                        </Lbl>
                        <Sel value={config.language} onChange={cfgSet('language')} disabled={!isDual(config.classLevel)}
                          style={{ opacity: isDual(config.classLevel) ? 1 : 0.6, cursor: isDual(config.classLevel) ? 'pointer' : 'not-allowed' }}>
                          <option value="english">🌐 English</option>
                          {isDual(config.classLevel) && (
                            <>
                              <option value="urdu">🌙 Urdu (اردو)</option>
                              <option value="mixed">🔀 Mixed (English + Urdu)</option>
                            </>
                          )}
                        </Sel>
                      </div>
                      <div>
                        <Lbl>Exam Date</Lbl>
                        <Inp type="date" value={config.examDate} onChange={cfgSet('examDate')} />
                      </div>
                      <div>
                        <Lbl>Paper Code</Lbl>
                        <Inp value={config.paperCode} onChange={cfgSet('paperCode')} placeholder="e.g. 7320" />
                      </div>
                      <div className="super-module-card" style={{ gridColumn: '1 / -1' }}>
                        <Lbl>Special Instructions (optional)</Lbl>
                        <textarea value={config.instructions} onChange={cfgSet('instructions')} placeholder="e.g. Attempt all questions. Write clearly..."
                          style={{ width: '100%', background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 12, color: C.silver, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: 80 }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="super-module-card" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                  <button onClick={() => setStep(1)} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                    Next: Select Questions →
                  </button>
                </div>
              </GCard>
            )}

            {/* ─── STEP 1: QUESTIONS ──────────────────────────────────────────── */}
            {step === 1 && (
              <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
                <QuestionSelector
                  config={config}
                  mcqPool={mcqPool} shortPool={shortPool} longPool={longPool}
                  chapters={chapters}
                  selectedMCQ={selectedMCQ} selectedShort={selectedShort} selectedLong={selectedLong}
                  setSelectedMCQ={setSelectedMCQ} setSelectedShort={setSelectedShort} setSelectedLong={setSelectedLong}
                  toggleQ={toggleQ}
                />
                <div className="super-module-card" style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
                  {/* Summary */}
                  <GCard>
                    <div className="super-module-card" style={{ color: C.gold, fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📊 Paper Summary</div>
                    <div className="super-module-card" style={{ display: 'grid', gap: 10 }}>
                      {[
                        ['MCQ',   selectedMCQ.length,   selectedMCQ.reduce((s, q)   => s + (q.marks || 1), 0)],
                        ['Short', selectedShort.length, selectedShort.reduce((s, q) => s + (q.marks || 2), 0)],
                        ['Long',  selectedLong.length,  selectedLong.reduce((s, q)  => s + (q.marks || 5), 0)],
                      ].map(([type, count, marks]) => (
                        <div key={type} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: 'rgba(7,30,52,0.4)' }}>
                          <span style={{ color: C.silver }}>{type} Questions</span>
                          <span style={{ color: C.gold, fontWeight: 700 }}>{count} Qs = {marks} marks</span>
                        </div>
                      ))}
                      <div className="super-module-card" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: 'rgba(200,153,26,0.08)', border: `1px solid ${C.border}` }}>
                        <span style={{ color: '#fff', fontWeight: 700 }}>Total</span>
                        <span style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>{totalSelected} Q / {totalMarksSelected} marks</span>
                      </div>
                    </div>
                    <div className="super-module-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button
                        onClick={() => { setSelectedMCQ(shuffle(selectedMCQ)); setSelectedShort(shuffle(selectedShort)); setSelectedLong(shuffle(selectedLong)) }}
                        style={{ background: 'rgba(10,132,255,0.15)', border: `1px solid rgba(10,132,255,0.3)`, borderRadius: 10, padding: '10px', color: C.blue, fontWeight: 700, cursor: 'pointer' }}>
                        🔀 Shuffle Order
                      </button>
                      <button onClick={() => setStep(2)} disabled={totalSelected === 0}
                        style={{ background: totalSelected > 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(200,153,26,0.2)', color: totalSelected > 0 ? '#071e34' : C.muted, border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: totalSelected > 0 ? 'pointer' : 'not-allowed', fontSize: 14 }}>
                        {mode === 'offline' ? '👁️ Preview Paper →' : '👥 Assign to Students →'}
                      </button>
                    </div>
                  </GCard>

                  {/* Quick Random Fill */}
                  <QuickFillCard
                    mcqPool={mcqPool} shortPool={shortPool} longPool={longPool}
                    setSelectedMCQ={setSelectedMCQ} setSelectedShort={setSelectedShort} setSelectedLong={setSelectedLong}
                  />
                </div>
              </div>
            )}

            {/* ─── STEP 2: ASSIGN (online) or PREVIEW (offline) ───────────────── */}
            {step === 2 && mode === 'online' && (
              <AssignStep config={config} selectedMCQ={selectedMCQ} selectedShort={selectedShort} selectedLong={selectedLong} onNext={() => setStep(3)} />
            )}
            {step === 2 && mode === 'offline' && (
              <PaperPreviewEngine
                config={config}
                selectedMCQ={selectedMCQ}
                selectedShort={selectedShort}
                selectedLong={selectedLong}
                settings={paperSettings}
                onBack={() => setStep(1)}
              />
            )}

            {/* ─── STEP 3: PUBLISH (online) ───────────────────────────────────── */}
            {step === 3 && mode === 'online' && (
              <PublishStep config={config} selectedMCQ={selectedMCQ} selectedShort={selectedShort} selectedLong={selectedLong}
                onReset={() => { setStep(0); setSelectedMCQ([]); setSelectedShort([]); setSelectedLong([]) }} />
            )}
          </>
        )}

      </div>
    </div>
  )
}

// ── Quick Random Fill Card ─────────────────────────────────────────────────────

function QuickFillCard({ mcqPool, shortPool, longPool, setSelectedMCQ, setSelectedShort, setSelectedLong }) {
  const [mcqN, setMcqN] = useState(10)
  const [shN,  setShN]  = useState(5)
  const [lgN,  setLgN]  = useState(3)

  function quickFill() {
    setSelectedMCQ(shuffle(mcqPool).slice(0, mcqN))
    setSelectedShort(shuffle(shortPool).slice(0, shN))
    setSelectedLong(shuffle(longPool).slice(0, lgN))
  }

  return (
    <GCard>
      <div className="super-module-card" style={{ color: C.gold, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>⚡ Quick Random Fill</div>
      <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          ['MCQ',   mcqN,  setMcqN,  mcqPool.length,   '#0A84FF'],
          ['Short', shN,   setShN,   shortPool.length,  '#30D158'],
          ['Long',  lgN,   setLgN,   longPool.length,   '#BF5AF2'],
        ].map(([label, val, setter, max, color]) => (
          <div key={label} style={{ background: 'rgba(7,30,52,0.5)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div className="super-module-card" style={{ color, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{label}</div>
            <input
              type="number" min={0} max={max} value={val}
              onChange={e => setter(Math.min(Number(e.target.value), max))}
              style={{ width: '100%', background: 'rgba(11,44,77,0.8)', border: `1px solid ${C.border}`, borderRadius: 8, color, padding: '6px 0', fontSize: 18, fontWeight: 800, textAlign: 'center', outline: 'none' }}
            />
            <div className="super-module-card" style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>of {max}</div>
          </div>
        ))}
      </div>
      <button onClick={quickFill}
        style={{ width: '100%', background: `linear-gradient(135deg, rgba(148,163,184,0.18), rgba(232,180,32,0.15))`, border: `1px solid ${C.gold}`, borderRadius: 10, padding: '11px 0', color: C.gold, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
        🎲 Random Select
      </button>
    </GCard>
  )
}

// ── Question Selector ──────────────────────────────────────────────────────────

function QuestionSelector({ config, mcqPool, shortPool, longPool, chapters, selectedMCQ, selectedShort, selectedLong, toggleQ, setSelectedMCQ, setSelectedShort, setSelectedLong }) {
  const [qTab, setQTab] = useState('mcq')
  const [search, setSearch] = useState('')
  const [filterChapters, setFilterChapters] = useState([])

  const pools   = { mcq: mcqPool,    short: shortPool,    long: longPool    }
  const selected = { mcq: selectedMCQ, short: selectedShort, long: selectedLong }
  const setters  = { mcq: setSelectedMCQ, short: setSelectedShort, long: setSelectedLong }

  function toggleChapter(ch) {
    setFilterChapters(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch])
  }

  const pool = pools[qTab].filter(q => {
    if (search && !q.text.toLowerCase().includes(search.toLowerCase())) return false
    if (filterChapters.length > 0 && !filterChapters.includes(q.chapter || '')) return false
    return true
  })

  return (
    <GCard>
      {/* Type tabs */}
      <div className="super-module-card" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['mcq', `MCQ (${mcqPool.length})`], ['short', `Short (${shortPool.length})`], ['long', `Long (${longPool.length})`]].map(([key, label]) => (
          <TabBtn key={key} active={qTab === key} onClick={() => { setQTab(key); setFilterChapters([]) }}>{label}</TabBtn>
        ))}
      </div>

      {/* Chapter filter pills */}
      {chapters.length > 0 && (
        <div className="super-module-card" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, padding: '10px 12px', background: 'rgba(7,30,52,0.4)', borderRadius: 12 }}>
          <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center', marginRight: 2 }}>Chapter:</span>
          <button onClick={() => setFilterChapters([])}
            style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
              background: filterChapters.length === 0 ? C.gold : 'rgba(11,44,77,0.6)',
              color: filterChapters.length === 0 ? '#071e34' : C.muted }}>
            All
          </button>
          {chapters.map(ch => (
            <button key={ch} onClick={() => toggleChapter(ch)}
              style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filterChapters.includes(ch) ? C.gold : C.border}`,
                background: filterChapters.includes(ch) ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.46)',
                color: filterChapters.includes(ch) ? C.gold : C.muted }}>
              {ch}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="super-module-card" style={{ marginBottom: 14 }}>
        <Inp value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search questions..." style={{ marginBottom: 0 }} />
      </div>

      {/* Question list */}
      {pool.length === 0 ? (
        <div className="super-module-card" style={{ textAlign: 'center', padding: 32, color: C.muted }}>
          <div className="super-module-card" style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
          <div>{config.subject ? `No ${qTab.toUpperCase()} questions found.` : 'Select a class & subject to filter questions.'}</div>
          <div className="super-module-card" style={{ marginTop: 8, fontSize: 12 }}>Add questions in the Question Bank first.</div>
        </div>
      ) : (
        <div className="super-module-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
          {pool.map((q, i) => {
            const isSelected = selected[qTab].find(x => x.id === q.id)
            return (
              <div key={q.id} onClick={() => toggleQ(q, selected[qTab], setters[qTab])} style={{
                padding: '14px 16px', borderRadius: 14, cursor: 'pointer',
                background: isSelected ? 'rgba(200,153,26,0.1)' : 'rgba(7,30,52,0.4)',
                border: `1px solid ${isSelected ? C.gold : C.border}`,
              }}>
                <div className="super-module-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div className="super-module-card" style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? C.gold : C.border}`, background: isSelected ? C.gold : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 2 }}>
                    {isSelected && <span style={{ color: '#071e34', fontSize: 12, fontWeight: 800 }}>✓</span>}
                  </div>
                  <div className="super-module-card" style={{ flex: 1 }}>
                    {/* Chapter / priority badges */}
                    {(q.chapter || (q.priority && q.priority !== 'all')) && (
                      <div className="super-module-card" style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                        {q.chapter && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(10,132,255,0.1)', color: '#0A84FF', border: '1px solid rgba(10,132,255,0.2)', fontWeight: 600 }}>{q.chapter}</span>}
                        {q.priority && q.priority !== 'all' && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: 'rgba(191,90,242,0.1)', color: '#BF5AF2', border: '1px solid rgba(191,90,242,0.2)', fontWeight: 600 }}>{q.priority}</span>}
                      </div>
                    )}
                    <div className="super-module-card" style={{ color: C.silver, fontSize: 13, lineHeight: 1.5 }}>Q{i + 1}. {q.text}</div>
                    {q.textUrdu && <div className="super-module-card" style={{ color: C.muted, fontSize: 13, direction: 'rtl', marginTop: 4, fontFamily: 'Noto Nastaliq Urdu, serif', lineHeight: 1.8 }}>{q.textUrdu}</div>}
                    {qTab === 'mcq' && q.options?.length > 0 && (
                      <div className="super-module-card" style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                        {q.options.filter(o => o.text).map(o => (
                          <span key={o.label} style={{ fontSize: 11, color: o.label === q.answer ? C.green : C.muted }}>
                            ({o.label}) {o.text}{o.label === q.answer ? ' ✓' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="super-module-card" style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Marks:</span>
                      {isSelected ? (
                        <input type="number" min={1} max={20} value={isSelected.marks || 1}
                          onChange={e => { e.stopPropagation(); setters[qTab](prev => prev.map(x => x.id === q.id ? { ...x, marks: Number(e.target.value) } : x)) }}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 52, padding: '4px 8px', borderRadius: 8, background: 'rgba(7,30,52,0.8)', border: `1px solid ${C.border}`, color: C.gold, fontSize: 12, outline: 'none', fontWeight: 700 }} />
                      ) : (
                        <span style={{ fontSize: 11, color: C.muted }}>{q.marks || 1}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </GCard>
  )
}

// ── Assign Step (Online Mode) ──────────────────────────────────────────────────

function AssignStep({ config, selectedMCQ, selectedShort, selectedLong, onNext }) {
  const [startTime, setStartTime] = useState('')
  const [endTime,   setEndTime]   = useState('')

  return (
    <GCard>
      <h2 style={{ color: C.gold, fontSize: 18, fontFamily: "'Playfair Display',serif", marginBottom: 20 }}>Assign to Students</h2>
      <div className="super-module-card" style={{ display: 'grid', gap: 20 }}>
        <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div><Lbl>Start Time</Lbl><Inp type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
          <div><Lbl>End Time</Lbl><Inp type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
        </div>
        <div>
          <Lbl>Assign to Class</Lbl>
          <Sel defaultValue=""><option value="">All students in {config.classLevel ? `Class ${config.classLevel}` : 'selected class'}</option></Sel>
        </div>
        <div className="super-module-card" style={{ padding: 16, borderRadius: 14, background: 'rgba(200,153,26,0.08)', border: `1px solid ${C.border}` }}>
          <div className="super-module-card" style={{ color: C.gold, fontWeight: 700, marginBottom: 10 }}>Exam Summary</div>
          {[
            ['Title', config.title || '(no title)'],
            ['Class', config.classLevel ? `Class ${config.classLevel}` : '—'],
            ['Subject', config.subject || '—'],
            ['Duration', `${config.duration} minutes`],
            ['Questions', `${selectedMCQ.length + selectedShort.length + selectedLong.length} total`],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: C.silver, fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: C.muted }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={onNext} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', border: 'none', padding: '13px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          🚀 Proceed to Publish →
        </button>
      </div>
    </GCard>
  )
}

// ── Publish Step (Online Mode) ─────────────────────────────────────────────────

function PublishStep({ config, selectedMCQ, selectedShort, selectedLong, onReset }) {
  const [published, setPublished] = useState(false)
  const total = selectedMCQ.length + selectedShort.length + selectedLong.length

  if (published) return (
    <GCard style={{ textAlign: 'center', padding: 48 }}>
      <div className="super-module-card" style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
      <div className="super-module-card" style={{ color: C.green, fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Exam Published!</div>
      <div className="super-module-card" style={{ color: C.muted, marginBottom: 24 }}>{config.title} is now live for students.</div>
      <button onClick={onReset} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', border: 'none', padding: '12px 28px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
        Create Another Paper
      </button>
    </GCard>
  )

  return (
    <GCard>
      <h2 style={{ color: C.gold, fontSize: 18, fontFamily: "'Playfair Display',serif", marginBottom: 20 }}>Publish Online Exam</h2>
      <div className="super-module-card" style={{ display: 'grid', gap: 16 }}>
        <div className="super-module-card" style={{ padding: 20, borderRadius: 20, background: 'rgba(7,30,52,0.5)', border: `1px solid ${C.border}` }}>
          {[
            ['Title',      config.title || '(no title)'],
            ['Class',      config.classLevel ? `Class ${config.classLevel}` : '—'],
            ['Subject',    config.subject || '—'],
            ['Exam Type',  config.examType],
            ['Duration',   `${config.duration} minutes`],
            ['MCQ',        `${selectedMCQ.length} questions`],
            ['Short',      `${selectedShort.length} questions`],
            ['Long',       `${selectedLong.length} questions`],
            ['Total',      total],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, color: C.silver, fontSize: 13 }}>
              <span style={{ color: C.muted }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setPublished(true)} disabled={total === 0}
          style={{ background: total > 0 ? `linear-gradient(135deg, #30D158, #25a244)` : 'rgba(48,209,88,0.15)', color: total > 0 ? '#fff' : C.muted, border: 'none', padding: '14px 0', borderRadius: 12, fontWeight: 700, cursor: total > 0 ? 'pointer' : 'not-allowed', fontSize: 15 }}>
          🌐 Publish Exam Now
        </button>
      </div>
    </GCard>
  )
}
