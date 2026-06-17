import { useEffect, useMemo, useState } from 'react'
import { usePaperStore } from './usePaperStore'
import { classLevelLabel, classLevelsMatch, useAcademicStore } from '../../services/useAcademicStore'
import { useAuth } from '../../context/AuthContext'
import { DEFAULT_MODEL, generateWithGemini, getAiConfig, testAiConnection } from './geminiService'

const C = {
  card: 'rgba(11,44,77,0.92)', gold: '#C8991A', goldL: '#e8b420',
  silver: '#C0C8D8', muted: '#8892A4', green: '#30D158',
  red: '#FF375F', blue: '#0A84FF', purple: '#BF5AF2',
  border: 'rgba(148,163,184,0.18)',
}

const EXAM_TYPES = ['Mid Term','Final Term','Monthly Test','Weekly Test','Unit Test','Assessment']
const PRIORITIES = [
  { v: 'all', l: 'All Questions' },
  { v: 'exercise', l: 'Exercise Only' },
  { v: 'past', l: 'Past Papers' },
  { v: 'additional', l: 'Additional' },
]

const isDual = (cls) => classLevelsMatch(cls, 'pre-nine')

const PAPER_TEMPLATES = {
  'Mid Term': { mcq: 10, short: 5, long: 2, mcqM: 1, shortM: 2, longM: 5 },
  'Final Term': { mcq: 20, short: 8, long: 3, mcqM: 1, shortM: 2, longM: 5 },
  'Monthly Test': { mcq: 10, short: 5, long: 1, mcqM: 1, shortM: 2, longM: 5 },
  'Weekly Test': { mcq: 10, short: 0, long: 0, mcqM: 1, shortM: 2, longM: 5 },
  'Unit Test': { mcq: 10, short: 5, long: 2, mcqM: 1, shortM: 2, longM: 5 },
  'Assessment': { mcq: 5, short: 5, long: 2, mcqM: 1, shortM: 2, longM: 5 },
}

const shuffle = arr => [...arr].sort(() => Math.random() - 0.5)

function Inp({ label, style = {}, ...p }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 5, letterSpacing: '0.05em' }}>{label}</div>}
      <input {...p} style={{ width: '100%', background: 'rgba(11,44,77,0.7)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', ...style }} />
    </div>
  )
}

function Sel({ label, children, ...p }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 5, letterSpacing: '0.05em' }}>{label}</div>}
      <select {...p} style={{ width: '100%', background: 'rgba(11,44,77,0.7)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '9px 12px', fontSize: 13, outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
        {children}
      </select>
    </div>
  )
}

function Num({ label, value, onChange, min = 0, max = 80, ...props }) {
  return (
    <div>
      {label && <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 5 }}>{label}</div>}
      <input type="number" value={value} onChange={onChange} min={min} max={max} {...props}
        style={{ width: '100%', background: 'rgba(11,44,77,0.7)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.gold, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontWeight: 700 }} />
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
      <div style={{ color: C.gold, fontWeight: 700, fontSize: 13, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

const normalizeQuestion = (q, marks, chapters = []) => ({
  ...q,
  id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  en: q.text || q.en || '',
  ur: q.textUrdu || q.ur || q.text || '',
  text: q.text || q.en || '',
  textUrdu: q.textUrdu || q.ur || '',
  marks,
  subjectId: q.subjectId || 'ai-generated',
  chapter: q.chapter || chapters[0] || '',
  options: (q.options || []).map(o => ({ ...o, en: o.text || o.en || '', ur: o.textUrdu || o.ur || '' })),
})

export default function AIGeneratorTab({ onProceedToPreview }) {
  const { subjects, questions, paperSettings, questionTypes, getQuestionsForPaper, getChaptersForSubject, getFilteredQuestionTypes, savePaper } = usePaperStore()
  const { activeClasses, subjectsForClass } = useAcademicStore()
  const { isTeacher } = useAuth()

  const [classLevel, setClassLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [chapters, setChapters] = useState([])
  const [examType, setExamType] = useState('Mid Term')
  const [medium, setMedium] = useState('english')
  const [autoBalance, setAutoBalance] = useState(true)
  const [priority, setPriority] = useState('all')
  const [paperCode, setPaperCode] = useState(String(Math.floor(1000 + Math.random() * 9000)))
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10))
  const [instructions, setInstructions] = useState('')
  const [qCounts, setQCounts] = useState({ mcq: 10, short: 5, long: 2 })
  const [qMarks, setQMarks] = useState({ mcq: 1, short: 2, long: 5 })
  const [activeType, setActiveType] = useState('mcq')
  const [typePrompts, setTypePrompts] = useState({})
  const [generating, setGenerating] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [aiError, setAiError] = useState('')
  const [aiConfig, setAiConfig] = useState(null)

  useEffect(() => {
    getAiConfig().then(setAiConfig).catch(() => setAiConfig(null))
  }, [])

  const availableSubjects = useMemo(() => {
    const academicSubs = subjectsForClass(classLevel)
    const bankSubs = [...new Set(subjects.filter(s => !classLevel || !s.classLevel || classLevelsMatch(s.classLevel, classLevel)).map(s => s.name))]
    return [...new Set([...academicSubs, ...bankSubs])]
  }, [subjects, classLevel, subjectsForClass])

  const availableChapters = useMemo(() => getChaptersForSubject(subject, classLevel), [subject, classLevel, questions])
  const availableTypes = useMemo(() => {
    const filtered = getFilteredQuestionTypes?.(subject) || questionTypes || []
    return filtered.length ? filtered : questionTypes || []
  }, [subject, questionTypes, getFilteredQuestionTypes])

  useEffect(() => {
    if (!availableTypes.some(t => t.value === activeType)) {
      setActiveType(availableTypes[0]?.value || 'mcq')
    }
  }, [availableTypes, activeType])

  useEffect(() => {
    setQCounts(prev => {
      const next = { ...prev }
      ;(questionTypes || []).forEach(t => { if (next[t.value] === undefined) next[t.value] = ['mcq','short','long'].includes(t.value) ? next[t.value] || 0 : 0 })
      return next
    })
    setQMarks(prev => {
      const next = { ...prev }
      ;(questionTypes || []).forEach(t => { if (next[t.value] === undefined) next[t.value] = Number(t.marks || 2) })
      return next
    })
  }, [questionTypes])

  const bankPool = useMemo(() => getQuestionsForPaper({ subjectName: subject, classLevel, chapters, priority }), [subject, classLevel, chapters, priority, questions])
  const bankStats = useMemo(() => {
    const stats = { total: bankPool.length }
    availableTypes.forEach(t => { stats[t.value] = bankPool.filter(q => q.type === t.value).length })
    return stats
  }, [bankPool, availableTypes])

  function updateQCount(id, val) { setQCounts(prev => ({ ...prev, [id]: Math.max(0, Number(val || 0)) })) }
  function updateQMark(id, val) { setQMarks(prev => ({ ...prev, [id]: Math.max(0, Number(val || 0)) })) }
  function updateTypePrompt(id, val) { setTypePrompts(prev => ({ ...prev, [id]: val })) }

  function applyTemplate(et) {
    setExamType(et)
    const t = PAPER_TEMPLATES[et] || PAPER_TEMPLATES['Mid Term']
    setQCounts(prev => ({ ...prev, mcq: t.mcq, short: t.short, long: t.long }))
    setQMarks(prev => ({ ...prev, mcq: t.mcqM, short: t.shortM, long: t.longM }))
  }

  function getPlan() {
    const template = PAPER_TEMPLATES[examType] || PAPER_TEMPLATES['Mid Term']
    return availableTypes.map(t => ({
      id: t.value,
      name: t.label,
      count: autoBalance && ['mcq','short','long'].includes(t.value) ? Number(template[t.value] || 0) : Number(qCounts[t.value] || 0),
      marks: autoBalance && t.value === 'mcq' ? Number(template.mcqM || qMarks[t.value] || t.marks || 1)
        : autoBalance && t.value === 'short' ? Number(template.shortM || qMarks[t.value] || t.marks || 2)
        : autoBalance && t.value === 'long' ? Number(template.longM || qMarks[t.value] || t.marks || 5)
        : Number(qMarks[t.value] || t.marks || 2),
      prompt: typePrompts[t.value] || '',
    }))
  }

  function generateFromBank() {
    setGenerating(true)
    setGenerated(null)
    setAiError('')
    setTimeout(() => {
      const plan = getPlan()
      const byType = {}
      plan.forEach(t => {
        byType[t.id] = shuffle(bankPool.filter(q => q.type === t.id)).slice(0, t.count).map(q => normalizeQuestion(q, t.marks, chapters))
      })
      setGenerated({
        ...byType,
        selectedMCQ: byType.mcq || [],
        selectedShort: byType.short || [],
        selectedLong: byType.long || [],
        categoryPlan: plan,
      })
      setGenerating(false)
    }, 500)
  }

  async function generateWithAI() {
    setAiLoading(true)
    setAiError('')
    try {
      const plan = getPlan()
      const legacy = Object.fromEntries(plan.map(t => [t.id, t.count]))
      const { result, model } = await generateWithGemini({
        classLevel, subject, chapters, medium, instructions,
        mcqCount: legacy.mcq || 0,
        shortCount: legacy.short || 0,
        longCount: legacy.long || 0,
        categories: plan,
      }, aiConfig?.models?.primary || paperSettings.geminiModel || DEFAULT_MODEL)
      const byType = {}
      plan.forEach(t => {
        const list = result[t.id] || []
        byType[t.id] = list.map(q => normalizeQuestion(q, t.marks, chapters))
      })
      setGenerated({
        ...byType,
        selectedMCQ: byType.mcq || [],
        selectedShort: byType.short || [],
        selectedLong: byType.long || [],
        fromAI: true,
        model,
        categoryPlan: plan,
      })
    } catch (e) {
      setAiError(e.message || 'AI generation failed. Please retry.')
    }
    setAiLoading(false)
  }

  const totalMarks = generated ? (generated.categoryPlan || getPlan()).reduce((sum, t) => sum + ((generated[t.id] || []).length * t.marks), 0) : 0
  const activeMeta = availableTypes.find(t => t.value === activeType) || availableTypes[0]
  const canGenerate = subject && classLevel

  function paperPayload() {
    const selectedQuestions = {}
    ;(generated.categoryPlan || getPlan()).forEach(t => { selectedQuestions[t.id] = generated[t.id] || [] })
    return {
      config: {
        title: `${subject} ${examType} ${classLevel ? classLevelLabel(classLevel) : ''}`,
        classLevel, subject, examType,
        language: medium === 'urdu' ? 'urdu' : medium === 'dual' ? 'mixed' : 'english',
        duration: examType === 'Final Term' ? 180 : examType === 'Mid Term' ? 120 : 60,
        paperCode, examDate, instructions,
      },
      selectedMCQ: generated.selectedMCQ || [],
      selectedShort: generated.selectedShort || [],
      selectedLong: generated.selectedLong || [],
      selectedQuestions,
      categoryPlan: generated.categoryPlan || getPlan(),
      mcq_marks: qMarks.mcq || 1,
      short_marks: qMarks.short || 2,
      long_marks: qMarks.long || 5,
    }
  }

  function handleProceed() {
    if (!generated) return
    onProceedToPreview(paperPayload())
  }

  async function runTestAiConnection() {
    try {
      const result = await testAiConnection(aiConfig?.models?.primary || paperSettings.geminiModel || DEFAULT_MODEL)
      setAiError(`Server AI OK: ${result.model}`)
    } catch (err) {
      setAiError(err.message || 'AI test failed.')
    }
  }

  function handleSave() {
    if (!generated) return
    const payload = paperPayload()
    const saved = savePaper({
      name: `${subject} ${examType} - ${new Date().toLocaleDateString()}`,
      ...payload,
      teacherHidden: Boolean(isTeacher),
    })
    alert(saved ? 'Paper saved successfully! It will be accessible by Admin for printing.' : 'Failed to save paper: Storage limit reached.')
  }

  return (
    <div className="ai-generator-surface" style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, minHeight: '70vh' }}>
      <style>{`.ai-generator-surface select option,.ai-generator-surface select optgroup{background:#0a1e35;color:#e6eef8}`}</style>
      <div style={{ overflowY: 'auto', paddingRight: 4 }}>
        <SectionCard title="Class & Subject">
          <div style={{ display: 'grid', gap: 12 }}>
            <Sel label="Class" value={classLevel} onChange={e => { setClassLevel(e.target.value); setSubject(''); setChapters([]) }}>
              <option value="">Select Class</option>
              {activeClasses.length > 0 ? activeClasses.map(c => <option key={c.level} value={c.level}>{c.name || classLevelLabel(c.level)}</option>) : ['1','2','3','4','5','6','7','8','9','10'].map(n => <option key={n} value={n}>Class {n}</option>)}
            </Sel>
            <Sel label="Subject" value={subject} onChange={e => { setSubject(e.target.value); setChapters([]) }}>
              <option value="">{classLevel ? 'Select Subject' : 'Select Class first'}</option>
              {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </Sel>
            {availableChapters.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 6 }}>Chapters</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button onClick={() => setChapters(chapters.length === availableChapters.length ? [] : [...availableChapters])} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: chapters.length === availableChapters.length ? 'rgba(200,153,26,0.2)' : 'rgba(15,23,42,0.46)', color: C.gold, cursor: 'pointer', fontWeight: 700 }}>All</button>
                  {availableChapters.map(ch => {
                    const sel = chapters.includes(ch)
                    return <button key={ch} onClick={() => setChapters(sel ? chapters.filter(c => c !== ch) : [...chapters, ch])} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${sel ? C.gold : C.border}`, background: sel ? 'rgba(200,153,26,0.2)' : 'rgba(15,23,42,0.46)', color: sel ? C.gold : C.silver, cursor: 'pointer' }}>{ch}</button>
                  })}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Paper Configuration">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Sel label="Exam Type" value={examType} onChange={e => applyTemplate(e.target.value)}>{EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</Sel>
              <Sel label="Priority" value={priority} onChange={e => setPriority(e.target.value)}>{PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}</Sel>
            </div>
            <Sel label={`Medium${!isDual(classLevel) ? ' (Dual available for Pre Nine)' : ''}`} value={medium} onChange={e => setMedium(e.target.value)} disabled={!isDual(classLevel)}>
              <option value="english">English Medium</option>
              {isDual(classLevel) && <option value="urdu">Urdu Medium</option>}
              {isDual(classLevel) && <option value="dual">Dual Medium</option>}
            </Sel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(7,30,52,0.4)', borderRadius: 10 }}>
              <button onClick={() => setAutoBalance(p => !p)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', background: autoBalance ? C.gold : 'rgba(255,255,255,0.15)' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: autoBalance ? 22 : 3 }} />
              </button>
              <div>
                <div style={{ color: C.silver, fontSize: 13, fontWeight: 600 }}>Auto-Balance</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{autoBalance ? `Preset counts for ${examType}` : 'Set counts manually below'}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Category Builder">
          <div style={{ display: 'grid', gap: 10 }}>
            <Sel label="Category" value={activeType} onChange={e => setActiveType(e.target.value)}>
              {availableTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Sel>
            {activeMeta && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Num label={`${activeMeta.label} Count`} value={qCounts[activeMeta.value] || 0} onChange={e => updateQCount(activeMeta.value, e.target.value)} disabled={autoBalance && ['mcq','short','long'].includes(activeMeta.value)} />
                  <Num label="Marks Each" value={qMarks[activeMeta.value] || activeMeta.marks || 2} onChange={e => updateQMark(activeMeta.value, e.target.value)} />
                </div>
                <textarea value={typePrompts[activeMeta.value] || ''} onChange={e => updateTypePrompt(activeMeta.value, e.target.value)} placeholder={`Prompt/instructions for ${activeMeta.label}`} style={{ width: '100%', minHeight: 78, resize: 'vertical', background: 'rgba(11,44,77,0.7)', border: `1px solid ${C.border}`, borderRadius: 10, color: C.silver, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </>
            )}
          </div>
        </SectionCard>

        <SectionCard title="All Category Counts">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
            {availableTypes.map(t => (
              <div key={t.value} style={{ display: 'contents' }}>
                <Num label={`${t.label} Count`} value={qCounts[t.value] || 0} onChange={e => updateQCount(t.value, e.target.value)} disabled={autoBalance && ['mcq','short','long'].includes(t.value)} />
                <Num label="Marks" value={qMarks[t.value] || t.marks || 2} onChange={e => updateQMark(t.value, e.target.value)} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Paper Details">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Inp label="Paper Code" value={paperCode} onChange={e => setPaperCode(e.target.value)} />
            <Inp label="Exam Date" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
          <div style={{ marginTop: 10 }}><Inp label="Instructions / Global Prompt" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Attempt all questions..." /></div>
        </SectionCard>

        {subject && (
          <div style={{ background: 'rgba(10,132,255,0.08)', border: '1px solid rgba(10,132,255,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 6 }}>Question Bank Available</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
              {availableTypes.slice(0, 6).map(t => <span key={t.value} style={{ color: t.value === 'mcq' ? C.blue : t.value === 'short' ? C.green : t.value === 'long' ? C.purple : C.gold }}>{t.label}: {bankStats[t.value] || 0}</span>)}
              <span style={{ color: C.muted }}>Total: {bankStats.total}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={generateFromBank} disabled={!canGenerate || generating || bankStats.total === 0} style={{ background: canGenerate && bankStats.total > 0 ? `linear-gradient(135deg, ${C.gold}, ${C.goldL})` : 'rgba(200,153,26,0.2)', color: canGenerate && bankStats.total > 0 ? '#071e34' : C.muted, border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: canGenerate && bankStats.total > 0 ? 'pointer' : 'not-allowed' }}>{generating ? 'Generating...' : 'Generate from Bank'}</button>
          <button onClick={generateWithAI} disabled={!canGenerate || aiLoading} style={{ background: canGenerate ? 'linear-gradient(135deg, #7c3aed, #a855f7)' : 'rgba(120,60,200,0.2)', color: canGenerate ? '#fff' : C.muted, border: 'none', borderRadius: 12, padding: '13px 0', fontWeight: 700, fontSize: 14, cursor: canGenerate ? 'pointer' : 'not-allowed' }}>{aiLoading ? 'Generating with AI...' : `Generate with AI${aiConfig?.models?.primary ? ` - ${aiConfig.models.primary}` : ''}`}</button>
          <button onClick={runTestAiConnection} style={{ background:'rgba(10,132,255,0.12)', color:C.blue, border:'1px solid rgba(10,132,255,0.28)', borderRadius:10, padding:'9px 0', fontWeight:700, cursor:'pointer' }}>Test AI Connection</button>
        </div>
        {aiError && <div style={{ marginTop: 10, background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 10, padding: '8px 14px', color: C.red, fontSize: 12 }}>{aiError}</div>}
      </div>

      <div>
        {!generated ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 36, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ color: C.gold, fontWeight: 800, fontSize: 20 }}>AI Paper Generator</div>
            <div style={{ color: C.muted, fontSize: 14, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>Select a category from settings, set count and marks, add category prompts, then generate from bank or AI.</div>
          </div>
        ) : (
          <div>
            <div style={{ background: generated.fromAI ? 'rgba(124,58,237,0.15)' : 'rgba(48,209,88,0.12)', border: `1px solid ${generated.fromAI ? 'rgba(168,85,247,0.4)' : 'rgba(48,209,88,0.3)'}`, borderRadius: 14, padding: '14px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: generated.fromAI ? '#a855f7' : C.green, fontWeight: 800, fontSize: 15 }}>{generated.fromAI ? 'AI Generated Successfully!' : 'Paper Generated!'}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{(generated.categoryPlan || getPlan()).map(t => `${(generated[t.id] || []).length} ${t.name}`).join(' + ')} = <strong style={{ color: C.gold }}>{totalMarks} marks</strong></div>
              </div>
              <button onClick={handleProceed} style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#071e34', border: 'none', borderRadius: 12, padding: '10px 22px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Preview Paper</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
              {(generated.categoryPlan || getPlan()).map(t => {
                const qs = generated[t.id] || []
                if (!qs.length) return null
                return <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}><div style={{ color: C.gold, fontSize: 24, fontWeight: 900 }}>{qs.length}</div><div style={{ color: C.silver, fontSize: 12, fontWeight: 600 }}>{t.name}</div><div style={{ color: C.muted, fontSize: 11 }}>{qs.length * t.marks} marks</div></div>
              })}
            </div>
            {(generated.categoryPlan || getPlan()).map(t => {
              const qs = generated[t.id] || []
              if (!qs.length) return null
              return (
                <div key={t.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: 'rgba(7,30,52,0.5)', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>{t.name}</span><span style={{ color: C.muted, fontSize: 12 }}>{qs.length} questions</span></div>
                  <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>{qs.slice(0, 3).map((q, i) => <div key={q.id || i} style={{ fontSize: 13, color: C.silver }}>{i + 1}. {q.text || q.en}<div style={{ fontSize: 12, color: C.muted }}>{q.textUrdu || q.ur}</div></div>)}</div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateFromBank} style={{ flex: 1, background: 'rgba(15,23,42,0.46)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 0', color: C.silver, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Regenerate</button>
              <button onClick={handleSave} style={{ flex: 1, background: 'rgba(48,209,88,0.12)', border: `1px solid rgba(48,209,88,0.4)`, borderRadius: 12, padding: '12px 0', color: C.green, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Save Paper</button>
              <button onClick={handleProceed} style={{ flex: 2, background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, border: 'none', borderRadius: 12, padding: '12px 0', color: '#071e34', fontWeight: 800, cursor: 'pointer', fontSize: 14 }}>Preview and Print Paper</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
