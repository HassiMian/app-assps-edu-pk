// QuestionBank.jsx — Al Siddique Smart School OS · Advanced Question Bank v2
import { extractQuestionsFromFile, MODEL_OPTIONS, DEFAULT_MODEL, getAiConfig, testAiConnection, generateWithGemini } from './geminiService'
import { CHAPTERS, SUBJECTS } from './data/questionBank'
import PaperAiJobsPanel from './PaperAiJobsPanel'
import api from '../../services/api'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import Portal from '../../components/Portal'
import { usePaperStore } from './usePaperStore'
import { classLevelLabel, classLevelsMatch, normalizeClassLevel, sortClassLevels, useAcademicStore } from '../../services/useAcademicStore'
import {
 BookOpen, Plus, Trash2, Edit2, Search, Upload,
 X, Save, FileText, List, AlignLeft, Image, Download,
 Sparkles, ToggleLeft, Columns, PenLine, FileUp, CheckSquare,
 Square, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp,
 // New icons for advanced question types
 ArrowLeftRight, Repeat, Shuffle, BookMarked, Scissors,
 MessageSquare, Globe, ScrollText, Mail, Zap, HelpCircle,
 Calculator, BarChart3, Tag,
} from 'lucide-react'
import { REGISTRY_MAP, STRUCTURED_DATA_FORM_TYPES, URDU_DEFAULT_TYPES, SHOW_ANSWER_FIELD } from './data/questionTypeRegistry'

//  Design tokens 

const C = {
 gold: '#C8991A', goldL: '#e8b420',
 blue: '#0A84FF', green: '#30D158', purple: '#BF5AF2',
 red: '#FF375F', orange: '#FF9F0A', cyan: '#64D2FF',
 muted: '#8892A4', silver: '#C0C8D8',
}

const card = {
 background: 'rgba(11,44,77,0.92)',
 backdropFilter: 'blur(20px)',
 border: '1px solid rgba(148,163,184,0.18)',
 borderRadius: 20,
}

//  Type & priority configs 

const TYPE_CONFIG = {
 // Objective
 mcq: { icon: <List size={13} />, color: C.blue, label: 'MCQ' },
 true_false: { icon: <ToggleLeft size={13} />, color: C.cyan, label: 'True / False' },
 fill: { icon: <PenLine size={13} />, color: C.orange, label: 'Fill Blanks' },
 columns: { icon: <Columns size={13} />, color: '#FF6B6B', label: 'Match Columns' },
 // Subjective
 short: { icon: <FileText size={13} />, color: C.green, label: 'Short' },
 long: { icon: <AlignLeft size={13} />, color: C.purple, label: 'Long' },
 definition: { icon: <HelpCircle size={13} />, color: '#98FB98', label: 'Definition' },
 // Science / Math
 numerical: { icon: <Calculator size={13} />, color: '#20B2AA', label: 'Numerical' },
 diagram: { icon: <Image size={13} />, color: '#9370DB', label: 'Diagram' },
 // Shared English
 comprehension: { icon: <BookOpen size={13} />, color: '#FFB347', label: 'Comprehension' },
 translation: { icon: <Globe size={13} />, color: '#C8A2C8', label: 'Translation' },
 essay: { icon: <ScrollText size={13} />, color: '#87CEEB', label: 'Essay' },
 letter: { icon: <Mail size={13} />, color: '#DDA0DD', label: 'Letter' },
 // Urdu grammar
 wahid_jama: { icon: <ArrowLeftRight size={13} />, color: '#FF9F0A', label: 'Singular / Plural' },
 mutradif: { icon: <Repeat size={13} />, color: '#BF5AF2', label: 'Synonyms' },
 mutzad: { icon: <Shuffle size={13} />, color: '#FF375F', label: 'Antonyms' },
 alfaz_maani: { icon: <BookMarked size={13} />, color: '#64D2FF', label: 'Vocabulary' },
 sentence_correction: { icon: <Scissors size={13} />, color: '#FF6B6B', label: 'Sentence Correction' },
 sentence_usage: { icon: <MessageSquare size={13} />, color: '#A8E6CF', label: 'Sentence Usage' },
 muhawara: { icon: <Zap size={13} />, color: '#F0E68C', label: 'Idioms' },
 grammar: { icon: <Tag size={13} />, color: '#A8E6CF', label: 'Grammar' },
}

const getTypeCfg = type => TYPE_CONFIG[type] || TYPE_CONFIG.short

// Type group colours for the type selector in QuestionModal
const TYPE_GROUP_COLOR = {
 objective: '#0A84FF',
 subjective: '#30D158',
 science: '#64D2FF',
 urdu: '#BF5AF2',
 english: '#FF9F0A',
}

const PRIORITY_CFG = {
 exercise: { label: 'Exercise', color: C.green, icon: <BookOpen size={13} /> },
 past: { label: 'Past Paper', color: C.purple, icon: <FileText size={13} /> },
 additional: { label: 'Additional', color: C.orange, icon: <Sparkles size={13} /> },
 all: { label: 'General', color: C.muted, icon: <Tag size={13} /> },
}
const getPriCfg = v => PRIORITY_CFG[v] || PRIORITY_CFG.all

const PRIORITIES = [
 { value: 'all', label: 'All / General' },
 { value: 'exercise', label: 'Exercise' },
 { value: 'past', label: 'Past Papers' },
 { value: 'additional', label: 'Additional' },
]

const isDual = cls => classLevelsMatch(cls, 'pre-nine')
const defaultMediumForClass = cls => isDual(cls) ? 'dual' : 'english'
const MEDIUM_OPTIONS = [
 { value: 'english', label: 'English only' },
 { value: 'urdu', label: 'Urdu only' },
 { value: 'dual', label: 'Dual medium' },
]
const mediumLabel = v => MEDIUM_OPTIONS.find(m => m.value === v)?.label || 'English only'

//  Primitive UI components 

function Badge({ children, color = C.gold }) {
 return (
 <span style={{
 background: `${color}22`, color, border: `1px solid ${color}55`,
 borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
 }}>{children}</span>
 )
}

function PriorityTag({ priority }) {
 if (!priority || priority === 'all') return null
 const p = getPriCfg(priority)
 return (
 <span style={{
 background: `${p.color}22`, color: p.color, border: `1px solid ${p.color}55`,
 borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700,
 display: 'inline-flex', alignItems: 'center', gap: 4,
 }}>{p.icon} {p.label}</span>
 )
}

function Input({ label, style: s = {}, ...props }) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 {label && <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>{label}</label>}
 <input style={{
 background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.25)',
 borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none', ...s,
 }} {...props} />
 </div>
 )
}

function Textarea({ label, style: s = {}, ...props }) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 {label && <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>{label}</label>}
 <textarea style={{
 background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.25)',
 borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none',
 resize: 'vertical', minHeight: 70, ...s,
 }} {...props} />
 </div>
 )
}

function Select({ label, options, value, onChange }) {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
 {label && <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>{label}</label>}
 <select
 value={value}
 onChange={onChange}
 style={{
 width: '100%',
 background: 'rgba(11,44,77,0.9)',
 border: '1px solid rgba(200,153,26,0.25)',
 borderRadius: 8,
 padding: '8px 12px',
 color: '#fff',
 fontSize: 14,
 cursor: 'pointer',
 outline: 'none',
 }}
 >
 {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 </div>
 )
}

function Btn({ children, onClick, variant = 'gold', size = 'md', style: s = {}, disabled = false }) {
 const variants = {
 gold: { background: C.gold, color: '#0B2C4D' },
 red: { background: 'rgba(255,55,95,0.15)', color: C.red, border: '1px solid rgba(255,55,95,0.3)' },
 ghost: { background: 'rgba(255,255,255,0.06)', color: C.silver, border: '1px solid rgba(255,255,255,0.1)' },
 blue: { background: 'rgba(10,132,255,0.15)', color: C.blue, border: '1px solid rgba(10,132,255,0.3)' },
 green: { background: 'rgba(48,209,88,0.15)', color: C.green, border: '1px solid rgba(48,209,88,0.3)' },
 ai: { background: 'linear-gradient(135deg,#BF5AF2,#7B2FBE)', color: '#fff' },
 }
 const sizes = {
 sm: { padding: '5px 12px', fontSize: 12 },
 md: { padding: '8px 16px', fontSize: 13 },
 lg: { padding: '11px 22px', fontSize: 14 },
 }
 return (
 <button
 onClick={onClick}
 disabled={disabled}
 style={{
 borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
 fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
 opacity: disabled ? 0.5 : 1,
 ...variants[variant], ...sizes[size], ...s,
 }}
 >{children}</button>
 )
}

//  Subject Modal 

function SubjectModal({ subject, onSave, onClose, activeClasses = [] }) {
 const classOptions = useMemo(() => {
 const base = activeClasses.length > 0
 ? activeClasses
 : ['starter','mover','flyer','1','2','3','4','5','6','7','8','pre-nine','hifaz'].map(level => ({
 level,
 name: classLevelLabel(level),
 }))
 const seen = new Set()
 return base
 .map(c => ({ value: normalizeClassLevel(c.level || c.name), label: c.name || classLevelLabel(c.level) }))
 .filter(c => {
 if (!c.value || seen.has(c.value)) return false
 seen.add(c.value)
 return true
 })
 }, [activeClasses])

 const [form, setForm] = useState({
 name: subject?.name || '', nameUrdu: subject?.nameUrdu || '',
 publisher: subject?.publisher || '', classLevel: subject?.classLevel || '', cover: subject?.cover || null,
 })
 const fileRef = useRef()

 function handleCover(e) {
 const file = e.target.files[0]
 if (!file) return
 const reader = new FileReader()
 reader.onload = ev => setForm(f => ({ ...f, cover: ev.target.result }))
 reader.readAsDataURL(file)
 }

 return (
 <Portal>
 <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.72)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
 <div onClick={(e) => e.stopPropagation()} className="super-module-card" style={{ ...card, padding: 24, width: 'min(460px, calc(100vw - 32px))', display: 'flex', flexDirection: 'column', gap: 14, borderRadius: 22, maxHeight: '92vh', overflowY: 'auto' }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>
 <h3 style={{ color: C.gold, margin: 0, fontSize: 18 }}>{subject ? 'Edit Subject' : 'Add Subject'}</h3>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
 Keep the subject identity clean and easy to scan.
 </div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer' }}><X /></button>
 </div>
 <Input label="Subject Name (English)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
 <Input label="Subject Name (Urdu)" value={form.nameUrdu} onChange={e => setForm(f => ({ ...f, nameUrdu: e.target.value }))} placeholder="ریاضی" dir="rtl" />
 <Input label="Publisher" value={form.publisher} onChange={e => setForm(f => ({ ...f, publisher: e.target.value }))} placeholder="Punjab Text Book Board" />
 <Select label="Class Level" value={form.classLevel} onChange={e => setForm(f => ({ ...f, classLevel: e.target.value }))}
 options={[{ value: '', label: 'All Classes' }, ...classOptions]} />
 <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
 {form.cover
 ? <img src={form.cover} alt="cover" style={{ width: 54, height: 68, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(200,153,26,0.3)' }} />
 : <div style={{ width: 54, height: 68, background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px dashed rgba(200,153,26,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={20} color={C.gold} /></div>
 }
 <Btn variant="ghost" size="sm" onClick={() => fileRef.current.click()}><Upload size={13} /> Upload Cover</Btn>
 <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCover} />
 </div>
 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.12)' }}>
 <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
 <Btn variant="gold" onClick={() => { if (form.name.trim()) onSave(form) }}><Save size={14} /> Save</Btn>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  Question Modal (full type support) 

function QuestionModal({ question, subjectId, subjectClassLevel, existingChapters, questionTypes = [], onSave, onClose }) {
 const allTypes = questionTypes.length > 0 ? questionTypes : Object.entries(TYPE_CONFIG).map(([value, cfg]) => ({ value, ...cfg }))

 const initType = question?.type || (allTypes[0]?.value || 'mcq')
 const initMedium = question?.medium
 || (URDU_DEFAULT_TYPES.has(initType) ? 'urdu' : (question?.textUrdu ? 'dual' : defaultMediumForClass(subjectClassLevel)))

 const [form, setForm] = useState({
 type: initType,
 medium: initMedium,
 text: question?.text || '',
 textUrdu: question?.textUrdu || '',
 marks: question?.marks || 1,
 answer: question?.answer || '',
 chapter: question?.chapter || '',
 topic: question?.topic || '',
 priority: question?.priority || 'all',
 structuredData: question?.structuredData || null,
 options: question?.options?.length ? question.options : [
 { label: 'A', text: '', textUrdu: '' },
 { label: 'B', text: '', textUrdu: '' },
 { label: 'C', text: '', textUrdu: '' },
 { label: 'D', text: '', textUrdu: '' },
 ],
 leftColumn: question?.leftColumn || ['', ''],
 rightColumn: question?.rightColumn || ['', ''],
 })

 const showEnglish = form.medium !== 'urdu'
 const showUrdu = form.medium !== 'english'

 // Registry info for current type (for custom labels, hints, etc.)
 const regEntry = REGISTRY_MAP[form.type] || {}

 // canSave: structured-data types just need the structured data; others need text
 const canSave = STRUCTURED_DATA_FORM_TYPES.has(form.type)
 ? true
 : (form.medium === 'urdu' ? form.textUrdu.trim() : form.text.trim())

 function setOpt(idx, field, val) {
 setForm(f => { const opts = [...f.options]; opts[idx] = { ...opts[idx], [field]: val }; return { ...f, options: opts } })
 }

 function setColumnItem(side, idx, val) {
 setForm(f => {
 const arr = [...f[side]]; arr[idx] = val; return { ...f, [side]: arr }
 })
 }

 function addColumnItem(side) {
 setForm(f => ({ ...f, [side]: [...f[side], ''] }))
 }

 function removeColumnItem(side, idx) {
 setForm(f => ({ ...f, [side]: f[side].filter((_, i) => i !== idx) }))
 }

 function handleTypeChange(typeValue) {
 const t = allTypes.find(x => x.value === typeValue)
 const reg = REGISTRY_MAP[typeValue] || {}
 const newMedium = (URDU_DEFAULT_TYPES.has(typeValue) && form.medium === 'english')
 ? 'urdu'
 : form.medium
 setForm(f => ({
 ...f,
 type: typeValue,
 marks: f.type === typeValue ? f.marks : (t?.marks || reg.defaultMarks || 1),
 medium: newMedium,
 answer: typeValue === 'true_false' ? 'True' : f.answer,
 structuredData: null, // reset structured data when switching types
 }))
 }

 const typeCfg = getTypeCfg(form.type)

 return (
 <Portal>
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999,
 display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px 0' }}>
 <div className="super-module-card" style={{ ...card, padding: 24, width: 'min(720px, calc(100vw - 32px))', maxHeight: '92vh', overflowY: 'auto', margin: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>
 <h3 style={{ color: C.gold, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
 <span style={{ color: typeCfg.color }}>{typeCfg.icon}</span>
 {question ? 'Edit Question' : 'Add Question'}
 </h3>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
 Keep the question, answer, marks, and chapter details tidy in one place.
 </div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer' }}><X /></button>
 </div>

 {/* Type selector */}
 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 14 }}>
 {allTypes.map(t => {
 const tc = getTypeCfg(t.value)
 return (
 <button key={t.value} onClick={() => handleTypeChange(t.value)}
 style={{
 padding: '7px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
 fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5,
 background: form.type === t.value ? tc.color : 'rgba(255,255,255,0.06)',
 color: form.type === t.value ? '#0B2C4D' : C.silver,
 }}>
 {tc.icon}{t.label}
 </button>
 )
 })}
 </div>

 <Select
 label="Question Medium"
 value={form.medium}
 onChange={e => setForm(f => ({ ...f, medium: e.target.value }))}
 options={MEDIUM_OPTIONS}
 />

 {/* English / generic question text */}
 {showEnglish && !STRUCTURED_DATA_FORM_TYPES.has(form.type) && (
 <div>
 <Textarea
 label={regEntry.fieldLabelText || (form.type === 'fill' ? 'Question — use [blank] where answer goes' : 'Question (English) *')}
 value={form.text}
 onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
 placeholder={form.type === 'fill' ? 'The capital of Pakistan is [blank].' : 'Type question here...'}
 />
 {form.type === 'fill' && (
 <div style={{ marginTop: 4, padding: '6px 10px', background: 'rgba(255,153,10,0.08)', borderRadius: 6, fontSize: 11, color: C.orange }}>
  Use [blank] in the question text where the answer should go.
 </div>
 )}
 {regEntry.hint && (
 <div style={{ marginTop: 4, padding: '6px 10px', background: 'rgba(100,210,255,0.06)', borderRadius: 6, fontSize: 11, color: C.cyan }}>
  {regEntry.hint}
 </div>
 )}
 <div style={{ color: 'rgba(192,200,216,0.4)', fontSize: 11, marginTop: 4 }}>{form.text.length} chars</div>
 </div>
 )}

 {/* Urdu question text */}
 {showUrdu && !STRUCTURED_DATA_FORM_TYPES.has(form.type) ? (
 <Textarea
 label={regEntry.fieldLabelText
 ? `${regEntry.fieldLabelText} (Urdu)`
 : (form.type === 'fill' ? 'Question (Urdu) — [blank] استعمال کریں' : 'Question (Urdu) — اردو سوال')}
 value={form.textUrdu}
 onChange={e => setForm(f => ({ ...f, textUrdu: e.target.value }))}
 placeholder={form.type === 'fill' ? 'پاکستان کا دارالحکومت [blank] ہے۔' : 'اردو میں سوال لکھیں...'}
 dir="rtl"
 style={{ fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: 16, lineHeight: 2 }}
 />
 ) : !STRUCTURED_DATA_FORM_TYPES.has(form.type) && (
 <div style={{ background: 'rgba(255,153,10,0.06)', border: '1px solid rgba(255,153,10,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'rgba(255,153,10,0.7)' }}>
 ℹ Urdu translation: select "Dual medium" or "Urdu only" above.
 </div>
 )}

 {/* Comprehension passage (special: always show both fields) */}
 {form.type === 'comprehension' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 <Textarea
 label="Passage (Urdu) — عبارت اردو"
 value={form.textUrdu}
 onChange={e => setForm(f => ({ ...f, textUrdu: e.target.value }))}
 placeholder="یہاں اردو عبارت لکھیں..."
 dir="rtl"
 style={{ fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: 15, lineHeight: 2.2, minHeight: 100 }}
 />
 <Textarea
 label="Passage (English) — optional"
 value={form.text}
 onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
 placeholder="Write English passage here (optional)..."
 style={{ minHeight: 80 }}
 />
 </div>
 )}

 {/* Structured Data Editor — for wahid_jama, sentence_usage, numerical, diagram */}
 {STRUCTURED_DATA_FORM_TYPES.has(form.type) && form.type !== 'comprehension' && (
 <StructuredDataEditor
 type={form.type}
 data={form.structuredData}
 onChange={data => setForm(f => ({ ...f, structuredData: data }))}
 />
 )}
 {form.type === 'comprehension' && (
 <StructuredDataEditor
 type="comprehension"
 data={form.structuredData}
 onChange={data => setForm(f => ({ ...f, structuredData: data }))}
 />
 )}

 {/* MCQ options */}
 {form.type === 'mcq' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>Options (A–D)</label>
 {form.options.map((opt, i) => (
 <div key={opt.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
 <span style={{ color: C.gold, fontWeight: 700, width: 16, flexShrink: 0 }}>{opt.label}.</span>
 {showEnglish && (
 <input value={opt.text} onChange={e => setOpt(i, 'text', e.target.value)}
 placeholder={`Option ${opt.label}`}
 style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '6px 10px', color: '#fff', fontSize: 13, outline: 'none' }} />
 )}
 {showUrdu && (
 <input value={opt.textUrdu} onChange={e => setOpt(i, 'textUrdu', e.target.value)}
 placeholder={`اردو ${opt.label}`} dir="rtl"
 style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 7, padding: '6px 10px', color: C.silver, fontSize: 13, outline: 'none', fontFamily: 'Noto Nastaliq Urdu, serif' }} />
 )}
 </div>
 ))}
 <Select label="Correct Answer" value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
 options={form.options.filter(o => showEnglish ? o.text : o.textUrdu).map(o => ({ value: o.label, label: `${o.label}: ${(showEnglish ? o.text : o.textUrdu).slice(0, 45)}` }))} />
 </div>
 )}

 {/* True/False */}
 {form.type === 'true_false' && (
 <div>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500, display: 'block', marginBottom: 8 }}>Correct Answer</label>
 <div style={{ display: 'flex', gap: 10 }}>
 {['True', 'False'].map(v => (
 <button key={v} onClick={() => setForm(f => ({ ...f, answer: v }))}
 style={{
 flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 14,
 border: 'none', cursor: 'pointer',
 background: form.answer === v
 ? (v === 'True' ? 'rgba(48,209,88,0.3)' : 'rgba(255,55,95,0.3)')
 : 'rgba(255,255,255,0.06)',
 color: form.answer === v ? (v === 'True' ? C.green : C.red) : C.silver,
 outline: form.answer === v ? `2px solid ${v === 'True' ? C.green : C.red}` : 'none',
 }}>
 {v === 'True' ? ' True' : ' False'}
 </button>
 ))}
 </div>
 </div>
 )}

 {/* Answer field — shown for all types except MCQ, T/F, match-columns, wahid_jama, sentence_usage */}
 {SHOW_ANSWER_FIELD.has(form.type) && (
 <Textarea
 label={regEntry.fieldLabelAnswer || (form.type === 'fill' ? 'Answer (what goes in the blank)' : 'Model Answer / Answer Key (optional)')}
 value={form.answer}
 onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
 placeholder={
 form.type === 'fill' ? 'e.g. Islamabad' :
 form.type === 'numerical' ? 'Final Answer: e.g. F = 10 N' :
 'Write the expected answer...'
 }
 dir={['mutradif','mutzad','alfaz_maani','sentence_correction','muhawara','translation'].includes(form.type) ? 'rtl' : undefined}
 style={{
 minHeight: 60,
 fontFamily: ['mutradif','mutzad','alfaz_maani','sentence_correction','muhawara'].includes(form.type) ? 'Noto Nastaliq Urdu, serif' : undefined,
 fontSize: ['mutradif','mutzad','alfaz_maani','sentence_correction','muhawara'].includes(form.type) ? 14 : undefined,
 }}
 />
 )}

 {/* Match Columns */}
 {form.type === 'columns' && (
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 {[
 { side: 'leftColumn', label: 'Column A (Items)' },
 { side: 'rightColumn', label: 'Column B (Matches)' },
 ].map(({ side, label }) => (
 <div key={side}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500, display: 'block', marginBottom: 6 }}>{label}</label>
 {form[side].map((item, idx) => (
 <div key={idx} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
 <span style={{ color: C.gold, fontWeight: 700, width: 18, flexShrink: 0, paddingTop: 8 }}>{idx + 1}.</span>
 <input
 value={item}
 onChange={e => setColumnItem(side, idx, e.target.value)}
 placeholder={`Item ${idx + 1}`}
 style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }}
 />
 {form[side].length > 2 && (
 <button onClick={() => removeColumnItem(side, idx)}
 style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: '0 4px' }}>
 <X size={13} />
 </button>
 )}
 </div>
 ))}
 <button onClick={() => addColumnItem(side)}
 style={{ fontSize: 11, background: 'rgba(200,153,26,0.1)', border: '1px dashed rgba(200,153,26,0.3)', borderRadius: 6, padding: '4px 10px', color: C.gold, cursor: 'pointer', width: '100%' }}>
 + Add Item
 </button>
 </div>
 ))}
 <div style={{ gridColumn: '1/-1' }}>
 <Input
 label='Answer Key (e.g. "1-C, 2-A, 3-B")'
 value={form.answer}
 onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
 placeholder="1-C, 2-A, 3-B"
 />
 </div>
 </div>
 )}

 {/* Chapter + Topic + Priority */}
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>Chapter</label>
 <input value={form.chapter} onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}
 placeholder="e.g. Chapter 1" list="chapter-suggestions"
 style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.25)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' }} />
 {existingChapters?.length > 0 && (
 <datalist id="chapter-suggestions">{existingChapters.map(ch => <option key={ch} value={ch} />)}</datalist>
 )}
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>Topic</label>
 <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
 placeholder="e.g. 1.2 Levels of Org"
 style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.25)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' }} />
 </div>
 <Select label="Priority / Source" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} options={PRIORITIES} />
 </div>

 {/* Marks */}
 <Input label="Marks" type="number" min={1} max={20} value={form.marks}
 onChange={e => setForm(f => ({ ...f, marks: Number(e.target.value) }))}
 style={{ width: 110 }} />

 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.12)' }}>
 <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
 <Btn variant="gold" disabled={!canSave} onClick={() => {
 if (!canSave) return
 const isUrduOnly = form.medium === 'urdu'
 onSave({
 ...form,
 subjectId,
 text: isUrduOnly ? form.textUrdu : form.text,
 textUrdu: showUrdu ? form.textUrdu : '',
 structuredData: form.structuredData,
 leftColumn: form.leftColumn,
 rightColumn: form.rightColumn,
 options: form.options.map(o => ({
 ...o,
 text: showEnglish ? o.text : o.textUrdu,
 textUrdu: showUrdu ? o.textUrdu : '',
 })),
 })
 }}>
 <Save size={14} /> Save Question
 </Btn>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  Bulk Import Modal (text + .txt file upload) 

function BulkImportModal({ subjectId, subjectClassLevel, questionTypes = [], onImport, onClose }) {
 const [raw, setRaw] = useState('')
 const [type, setType] = useState(questionTypes[0]?.value || 'mcq')
 const [medium, setMedium] = useState(defaultMediumForClass(subjectClassLevel))
 const [count, setCount] = useState(null)
 const fileRef = useRef()

 const showUrdu = medium !== 'english'

 const templateMCQ =
`Q: What is the capital of Pakistan?
${showUrdu ? 'UR: پاکستان کا دارالحکومت کیا ہے؟\n' : ''}A: Karachi
B: Lahore
C: Islamabad
D: Peshawar
ANS: C
MARKS: 1
CHAP: Chapter 1
PRI: exercise
---
Q: The national language of Pakistan is?
${showUrdu ? 'UR: پاکستان کی قومی زبان کون سی ہے؟\n' : ''}A: Punjabi
B: Sindhi
C: Pashto
D: Urdu
ANS: D
MARKS: 1
CHAP: Chapter 1
PRI: past`

 const templateColumns =
`Q: Match Column A with Column B
LEFT: Photosynthesis|Respiration|Transpiration
RIGHT: Food-making process|Energy release|Water evaporation
ANS: 1-A, 2-B, 3-C
MARKS: 3
CHAP: Chapter 2
PRI: exercise
---
Q: Match the following terms
LEFT: Nucleus|Cytoplasm|Cell wall
RIGHT: Control center|Jelly-like fluid|Outer rigid layer
ANS: 1-A, 2-B, 3-C
MARKS: 3
CHAP: Chapter 2
PRI: exercise`

 const templateFill =
`Q: The capital of Pakistan is [blank].
${showUrdu ? 'UR: پاکستان کا دارالحکومت [blank] ہے۔\n' : ''}ANS: Islamabad
MARKS: 1
CHAP: Chapter 1
PRI: exercise
---
Q: Water boils at [blank] degrees Celsius.
ANS: 100
MARKS: 1
CHAP: Chapter 3
PRI: exercise`

 const templateShort =
`Q: Define photosynthesis.
${showUrdu ? 'UR: ضیاء ترکیب کی تعریف کریں۔\n' : ''}ANS: Process by which plants make food using sunlight, water, and CO2.
MARKS: 2
CHAP: Chapter 3
PRI: exercise
---
Q: Write any two uses of water.
${showUrdu ? 'UR: پانی کے کوئی دو استعمال لکھیں۔\n' : ''}ANS: Drinking, cooking, agriculture, sanitation.
MARKS: 2
CHAP: Chapter 4
PRI: all`

 const templateTrueFalse =
`Q: The sun rises in the east.
${showUrdu ? 'UR: سورج مشرق سے طلوع ہوتا ہے۔\n' : ''}ANS: True
MARKS: 1
CHAP: Chapter 1
PRI: exercise
---
Q: Water is a compound of carbon and oxygen.
ANS: False
MARKS: 1
CHAP: Chapter 2
PRI: exercise`

 const templates = { mcq: templateMCQ, short: templateShort, long: templateShort, fill: templateFill, true_false: templateTrueFalse, columns: templateColumns, grammar: templateShort }
 const template = templates[type] || templateShort

 function downloadTemplate() {
 const blob = new Blob([template], { type: 'text/plain;charset=utf-8' })
 const url = URL.createObjectURL(blob)
 const a = document.createElement('a'); a.href = url
 a.download = `template_${type}${showUrdu ? '_dual' : ''}.txt`
 a.click(); URL.revokeObjectURL(url)
 }

 function handleFileLoad(e) {
 const file = e.target.files[0]
 if (!file) return
 if (!file.name.endsWith('.txt')) {
 alert('Only .txt files are supported here. For PDF, use "AI Textbook Import".')
 return
 }
 const reader = new FileReader()
 reader.onload = ev => setRaw(prev => prev ? prev + '\n---\n' + ev.target.result : ev.target.result)
 reader.readAsText(file)
 e.target.value = ''
 }

 function handleImport() {
 const n = onImport(subjectId, raw, type, '', medium)
 setCount(n); setRaw('')
 }

 return (
 <Portal>
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999,
 display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
 <div className="super-module-card" style={{ ...card, padding: 24, width: 'min(700px, calc(100vw - 32px))', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
 <div>
 <h3 style={{ color: C.gold, margin: 0, fontSize: 18 }}> Bulk Import — Text Format</h3>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
 Paste structured text or load a .txt template to import questions quickly.
 </div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer' }}><X /></button>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
 <Select label="Question Type" value={type} onChange={e => setType(e.target.value)}
 options={questionTypes.map(t => ({ value: t.value, label: t.label }))} />
 <Select label="Question Medium" value={medium} onChange={e => setMedium(e.target.value)}
 options={MEDIUM_OPTIONS} />
 </div>

 {/* Template preview */}
 <div>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>Format Template</label>
 <div style={{ display: 'flex', gap: 8 }}>
 <Btn variant="ghost" size="sm" onClick={() => fileRef.current.click()}><FileUp size={12} /> Load .txt</Btn>
 <Btn variant="green" size="sm" onClick={downloadTemplate}><Download size={12} /> Download</Btn>
 </div>
 </div>
 <input ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleFileLoad} />
 <div style={{ background: 'rgba(200,153,26,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 12, padding: 12,
 fontSize: 12, color: C.silver, fontFamily: 'monospace', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto' }}>
 {template}
 </div>
 {type === 'columns' && (
 <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(100,210,255,0.08)', borderRadius: 6, fontSize: 11, color: C.cyan }}>
  Columns format: LEFT: item1|item2|item3 and RIGHT: match1|match2|match3 separated by |
 </div>
 )}
 </div>

 <Textarea label="Paste Questions Here" value={raw} onChange={e => setRaw(e.target.value)}
 style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 12 }}
 placeholder={`Q: Sample question\nANS: Answer\nMARKS: 1\nCHAP: Chapter 1\nPRI: exercise\n---`} />

 {count !== null && (
 <div style={{ background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 10, padding: '10px 14px', color: C.green, fontSize: 13 }}>
  {count} question{count !== 1 ? 's' : ''} imported successfully!
 </div>
 )}

 <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid rgba(148,163,184,0.12)' }}>
 <Btn variant="ghost" onClick={onClose}>Close</Btn>
 <Btn variant="gold" disabled={!raw.trim()} onClick={handleImport}><Upload size={14} /> Import Questions</Btn>
 </div>
 </div>
 </div>
 </Portal>
 )
}

//  AI Textbook Import Modal (star feature) 

const AI_MESSAGES = [
 'Analyzing document structure...',
 'Reading all chapters and sections...',
 'Identifying MCQ questions...',
 'Extracting short answer questions...',
 'Finding fill-in-the-blank items...',
 'Detecting True/False statements...',
 'Processing match-the-column exercises...',
 'Classifying exercise vs past paper questions...',
 'Adding chapter and priority tags...',
 'Organizing final question bank...',
]

function AITextbookModal({ subjectId, subjectClassLevel, subjects, questionTypes, onImported, onClose }) {
 const { paperSettings, updatePaperSettings } = usePaperStore()
 const [phase, setPhase] = useState('upload')
 const [file, setFile] = useState(null)
 const [rawText, setRawText] = useState('')
 const [medium, setMedium] = useState(defaultMediumForClass(subjectClassLevel))
 const [subject, setSubject] = useState('')
 const [classLevel, setClassLevel] = useState(subjectClassLevel || '')
 const [structureMode, setStructureMode] = useState('standard')
 const [error, setError] = useState('')
 const [progress, setProgress] = useState({ msg: '', pct: 0 })
 const [extracted, setExtracted] = useState([])
 const [selected, setSelected] = useState(new Set())
 const [expandedId, setExpandedId] = useState(null)
 const [filterType, setFilterType] = useState('all')
 const [defaultCategory, setDefaultCategory] = useState(questionTypes[0]?.value || 'short')
 const [showApiKey, setShowApiKey] = useState(false)
 const [modelInput, setModelInput] = useState(paperSettings.geminiModel || DEFAULT_MODEL)
 const [aiConfig, setAiConfig] = useState(null)
 const [testingAi, setTestingAi] = useState(false)
 const [chapterNumber, setChapterNumber] = useState('')
 const [chapterName, setChapterName] = useState('')
 const fileRef = useRef()

 useEffect(() => {
 const firstType = questionTypes[0]?.value || 'short'
 if (!questionTypes.some(t => t.value === defaultCategory)) {
 setDefaultCategory(firstType)
 }
 }, [questionTypes, defaultCategory])

 // State for Textbook Topic Selection Tab
 const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'topics'
 const [selectedChapters, setSelectedChapters] = useState(new Set())
 const [selectedTopics, setSelectedTopics] = useState(new Set())
 const [mcqCount, setMcqCount] = useState(10)
 const [shortCount, setShortCount] = useState(5)
 const [longCount, setLongCount] = useState(2)
 const [expandedChapters, setExpandedChapters] = useState(new Set())

 // Autofill subject name on subjects list loaded
 useEffect(() => {
   if (subjectId && subjects?.length > 0) {
     const sub = subjects.find(s => s.id === subjectId)
     if (sub) {
       setSubject(sub.name)
     }
   }
 }, [subjectId, subjects])

 // Filter PTB curriculum standard chapters matching current subject & class level
 const standardChapters = useMemo(() => {
   if (!subject || !classLevel) return []
   const clsNorm = String(classLevel).trim().toLowerCase()
   const classId = clsNorm.includes('9') ? 'nine' : clsNorm.includes('10') ? 'ten' : clsNorm
   
   return CHAPTERS.filter(ch => {
     const sub = SUBJECTS.find(s => s.id === ch.subjectId)
     if (!sub) return false
     const subNameMatch = sub.name.toLowerCase().includes(subject.toLowerCase()) || 
                          subject.toLowerCase().includes(sub.name.toLowerCase())
     const classMatch = sub.classId === classId
     return subNameMatch && classMatch
   })
 }, [subject, classLevel])

 const toggleChapter = (chapterId) => {
   setSelectedChapters(prev => {
     const next = new Set(prev)
     const ch = standardChapters.find(c => c.id === chapterId)
     if (!ch) return prev
     
     if (next.has(chapterId)) {
       next.delete(chapterId)
       setSelectedTopics(tPrev => {
         const tNext = new Set(tPrev)
         ch.topics.forEach(t => tNext.delete(t.id))
         return tNext
       })
     } else {
       next.add(chapterId)
       setSelectedTopics(tPrev => {
         const tNext = new Set(tPrev)
         ch.topics.forEach(t => tNext.add(t.id))
         return tNext
       })
     }
     return next
   })
 }

 const toggleTopic = (chapterId, topicId) => {
   setSelectedTopics(prev => {
     const next = new Set(prev)
     if (next.has(topicId)) {
       next.delete(topicId)
       const ch = standardChapters.find(c => c.id === chapterId)
       if (ch) {
         const hasAny = ch.topics.some(t => next.has(t.id))
         if (!hasAny) {
           setSelectedChapters(cPrev => {
             const cNext = new Set(cPrev)
             cNext.delete(chapterId)
             return cNext
           })
         }
       }
     } else {
       next.add(topicId)
       setSelectedChapters(cPrev => {
         const cNext = new Set(cPrev)
         cNext.add(chapterId)
         return cNext
       })
     }
     return next
   })
 }

 async function handleGenerateFromTopics() {
   const targetChapters = []
   
   standardChapters.forEach(ch => {
     if (selectedChapters.has(ch.id)) {
       const topicsList = ch.topics
         .filter(t => selectedTopics.has(t.id))
         .map(t => t.en)
         
       if (topicsList.length > 0) {
         targetChapters.push(`Chapter ${ch.n} (${ch.en}) topics: [${topicsList.join(', ')}]`)
       } else {
         targetChapters.push(`Chapter ${ch.n} (${ch.en})`)
       }
     }
   })
   
   if (targetChapters.length === 0) {
     setError('Please select at least one chapter or topic to generate questions.')
     return
   }
   
   setError('')
   setPhase('extracting')
   setProgress({ msg: 'AI is generating advanced textbook questions from selected topics...', pct: 15 })
   
   try {
     setProgress({ msg: 'Contacting Gemini AI server...', pct: 35 })
     const config = {
       classLevel: classLevel || '10',
       subject: subject || 'Biology',
       chapters: targetChapters,
       mcqCount,
       shortCount,
       longCount,
       medium,
     }
     
     const { result, model } = await generateWithGemini(config, paperSettings.geminiModel || DEFAULT_MODEL)
     
     setProgress({ msg: 'Formatting generated questions...', pct: 85 })
     
     const questions = []
     const formatQ = (q, bucket) => ({
       ...q,
       id: q.id || `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
       type: bucket,
       chapter: q.chapter || targetChapters[0] || '',
     })
     
     ;(result.mcq || []).forEach(q => questions.push(formatQ(q, 'mcq')))
     ;(result.short || []).forEach(q => questions.push(formatQ(q, 'short')))
     ;(result.long || []).forEach(q => questions.push(formatQ(q, 'long')))
     
     if (questions.length === 0) {
       setError('Gemini did not return any questions. Please check your AI configuration or select fewer topics.')
       setPhase('upload')
       return
     }
     
     setExtracted(questions)
     setSelected(new Set(questions.map(q => q.id)))
     setPhase('preview')
   } catch (err) {
     setError(err.message || 'Textbook AI generation failed. Please try again.')
     setPhase('upload')
   }
 }

 useEffect(() => {
   getAiConfig().then(setAiConfig).catch(() => setAiConfig(null))
 }, [])

 async function runTestAiConnection() {
 setTestingAi(true)
 try {
 const result = await testAiConnection(paperSettings.geminiModel || DEFAULT_MODEL)
 alert(result.message || 'Connected successfully!')
 } catch (err) {
 alert(err.message || 'AI connection test failed.')
 } finally {
 setTestingAi(false)
 }
 }

 // No interval needed — progress comes from backend job polling

 function handleFile(e) {
 const f = e.target.files[0]
 if (!f) return
 e.target.value = ''
 setError('')
 setFile(f); setRawText('')
 }

 async function handleExtract() {
 if (!file && !rawText.trim()) { setError('Please upload a file or paste text.'); return }
 setError(''); setPhase('extracting'); setProgress({ msg: 'Starting AI extraction...', pct: 0 })
 try {
 const payload = await extractQuestionsFromFile(
 { subject, classLevel, medium, chapterNumber, chapterName, structureMode, defaultCategory, questionTypes },
 file,
 rawText,
 (msg, pct) => setProgress({ msg: msg || '', pct: pct || 0 }),
 paperSettings.geminiModel || DEFAULT_MODEL
 )

 if (structureMode === 'board_pattern') {
     // Save the raw board pattern JSON
     if (!payload || !payload.sections) {
        setError('No board pattern found. Ensure the text is formatted correctly.')
        setPhase('upload'); return
     }
     setExtracted([payload]) // Wrap in array to reuse existing state mechanics if possible
     setSelected(new Set([payload.id || 'board_1']))
     setPhase('preview')
     return
  }

 const questions = payload.map(q => ({ ...q, type: q.type || defaultCategory }))
 if (!questions || questions.length === 0) {
 setError('No questions found. Try a different file or paste the text directly.')
 setPhase('upload'); return
 }
 setExtracted(questions)
 setSelected(new Set(questions.map(q => q.id)))
 setPhase('preview')
 } catch (e) {
 const msg = e.message || ''
 setError(msg || 'Extraction failed. Please try again.')
 setPhase('upload')
 }
 }

 function toggleQ(id) {
 setSelected(prev => {
 const s = new Set(prev)
 s.has(id) ? s.delete(id) : s.add(id)
 return s
 })
 }

 function selectByType(type) {
 if (type === 'all') {
 setSelected(new Set(filtered.map(q => q.id)))
 } else {
 setSelected(prev => {
 const s = new Set(prev)
 filtered.filter(q => q.type === type).forEach(q => s.add(q.id))
 return s
 })
 }
 }

 function deselectAll() { setSelected(new Set()) }
 function selectAll() { setSelected(new Set(extracted.map(q => q.id))) }
 function updateExtractedQuestion(id, changes) {
 setExtracted(prev => prev.map(q => q.id === id ? { ...q, ...changes } : q))
 }

 const filtered = filterType === 'all' ? extracted : extracted.filter(q => q.type === filterType)

 function handleImport() {
 const toImport = extracted.filter(q => selected.has(q.id))
 if (toImport.length === 0) return
 // Resolve which subject to save into
 // Priority: 1) explicitly passed subjectId 2) subjectId from props
 const resolvedSubjectId = subjectId || null
 const chapterVal = chapterName.trim() ? (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}: ${chapterName.trim()}` : chapterName.trim()) : (chapterNumber.trim() ? `Chapter ${chapterNumber.trim()}` : '')
 const updatedQuestions = toImport.map(q => ({
   ...q,
   type: q.type || defaultCategory,
   chapter: chapterVal || q.chapter || '',
   topic: q.topic || ''
 }))
 onImported(resolvedSubjectId, updatedQuestions, subject.trim(), classLevel.trim())
 }



 // Group by type for stats
 const byType = useMemo(() => {
 const g = {}
 extracted.forEach(q => { g[q.type] = (g[q.type] || 0) + 1 })
 return g
 }, [extracted])

 return (
 <Portal>
 {showApiKey && (
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
 <div style={{ background: '#071e34', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 20, padding: 32, width: 480, boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
 <div style={{ color: '#C8991A', fontWeight: 800, fontSize: 18, marginBottom: 6 }}> Server AI Configuration</div>
 <div style={{ color: '#8892A4', fontSize: 13, marginBottom: 8 }}>
 AI extraction runs server-side only. No API key is stored in the browser.
 </div>
 <div style={{ color: '#C0C8D8', fontSize: 13, marginBottom: 12 }}>
 Current model: <strong style={{ color: '#fff' }}>{paperSettings.geminiModel || DEFAULT_MODEL}</strong>
 </div>
 <div style={{ marginBottom: 16 }}>
 <div style={{ fontSize: 11, color: '#8892A4', fontWeight: 600, marginBottom: 5 }}>Preferred Model</div>
 <select value={modelInput} onChange={e => setModelInput(e.target.value)}
 style={{ width: '100%', background: 'rgba(11,44,77,0.7)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10, color: '#C0C8D8', padding: '9px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
 {MODEL_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
 </select>
 </div>
 <div style={{ display: 'flex', gap: 10 }}>
 <button onClick={() => setShowApiKey(false)} style={{ flex: 1, background: 'rgba(15,23,42,0.46)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: 10, padding: '10px 0', color: '#C0C8D8', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
 <button onClick={() => { updatePaperSettings({ geminiModel: modelInput }); setShowApiKey(false) }}
 style={{ flex: 1, background: 'linear-gradient(135deg,#C8991A,#e8b420)', border: 'none', borderRadius: 10, padding: '10px 0', color: '#071e34', fontWeight: 600, cursor: 'pointer' }}>Save</button>
 </div>
 <button onClick={runTestAiConnection} disabled={testingAi}
 style={{ width: '100%', marginTop: 12, background: 'rgba(10,132,255,0.15)', border: '1px solid rgba(10,132,255,0.3)', borderRadius: 10, padding: '10px 0', color: '#0A84FF', fontWeight: 700, cursor: 'pointer' }}>
 {testingAi ? 'Testing...' : 'Test AI Connection'}
 </button>
 {aiConfig?.configured === false && (
 <div style={{ marginTop: 10, color: '#FF375F', fontSize: 12 }}>
 Server AI is not configured yet. Ask an admin to set the backend AI env vars.
 </div>
 )}
 </div>
 </div>
 )}
 <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
 display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
 <div className="super-module-card" style={{
 ...card, borderColor: 'rgba(191,90,242,0.4)', borderRadius: 22,
 width: '100%', maxWidth: 780, maxHeight: '95vh',
 display: 'flex', flexDirection: 'column', overflow: 'hidden',
 }}>
 {/* Header */}
 <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(191,90,242,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexShrink: 0 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
 <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#BF5AF2,#7B2FBE)', display: 'grid', placeItems: 'center' }}>
 <Sparkles size={20} color="#fff" />
 </div>
 <div>
 <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>AI Textbook Import</h3>
 <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Upload a PDF or paste text — large, scanned, and text PDFs are processed page by page automatically</p>
 </div>
 </div>
 <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.silver, cursor: 'pointer' }}><X size={20} /></button>
 </div>

 {/* Body */}
 <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

  {/* Tab selectors */}
  {phase === 'upload' && (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(191,90,242,0.15)', marginBottom: 20, gap: 16 }}>
      <button 
        onClick={() => { setActiveTab('upload'); setError('') }}
        style={{
          background: 'none', border: 'none',
          borderBottom: `2px solid ${activeTab === 'upload' ? C.purple : 'transparent'}`,
          color: activeTab === 'upload' ? '#fff' : C.muted,
          padding: '8px 12px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        PDF & Text Upload
      </button>
      <button 
        onClick={() => { setActiveTab('topics'); setError('') }}
        style={{
          background: 'none', border: 'none',
          borderBottom: `2px solid ${activeTab === 'topics' ? C.purple : 'transparent'}`,
          color: activeTab === 'topics' ? '#fff' : C.muted,
          padding: '8px 12px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        Textbook Topics
      </button>
    </div>
  )}

 {/*  Phase: Upload  */}
 {phase === 'upload' && activeTab === 'upload' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
 {/* Drag & drop zone */}
 <div
 onClick={() => fileRef.current.click()}
 style={{
 border: `2px dashed ${file ? 'rgba(191,90,242,0.6)' : 'rgba(191,90,242,0.25)'}`,
 borderRadius: 16, padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
 background: file ? 'rgba(191,90,242,0.06)' : 'rgba(191,90,242,0.03)',
 transition: 'all 0.2s',
 }}>
 <input ref={fileRef} type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFile} />
 <div style={{ fontSize: 36, marginBottom: 10 }}>
 {file ? '' : ''}
 </div>
 {file ? (
 <>
 <div style={{ color: C.purple, fontWeight: 700, fontSize: 15 }}>{file.name}</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB — click to change</div>
 </>
 ) : (
 <>
 <div style={{ color: C.silver, fontWeight: 600, fontSize: 15 }}>Click to upload PDF or TXT</div>
 <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>Supported: .pdf (text, scanned, or large books), .txt (pasted content)</div>
 </>
 )}
 </div>

 <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 12, marginBottom: 12 }}>— or paste text directly —</div>

 <Textarea
 label="Paste book/paper content here"
 value={rawText}
 onChange={e => { setRawText(e.target.value); setFile(null) }}
 style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12, marginBottom: 16 }}
 placeholder="Paste any textbook content, exercise questions, past paper — AI will extract and classify everything..."
 />

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
 <Input label="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" />
 <Input label="Class Level (optional)" value={classLevel} onChange={e => setClassLevel(e.target.value)} placeholder="e.g. 9" />
 <Select label="Medium" value={medium} onChange={e => setMedium(e.target.value)} options={MEDIUM_OPTIONS} />
 <Select label="Default Category" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} options={questionTypes.map(t => ({ value: t.value, label: t.label }))} />
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
 <Input label="Chapter No. (optional)" value={chapterNumber} onChange={e => setChapterNumber(e.target.value)} placeholder="e.g. 7" />
 <Input label="Chapter Name (optional)" value={chapterName} onChange={e => setChapterName(e.target.value)} placeholder="e.g. Bioenergetics" />
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 4 }}>
 <Select label="Extraction Mode" value={structureMode} onChange={e => setStructureMode(e.target.value)} options={[
      { label: 'Standard Bank Questions (MCQ, Short, Long)', value: 'standard' },
      { label: 'Board Pattern Format (Preserve Sections & Hierarchy)', value: 'board_pattern' }
  ]} />
 </div>

 {error && (
 <div style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13 }}>
  {error}
 </div>
 )}

 <div style={{ padding: '12px 16px', background: 'rgba(191,90,242,0.06)', border: '1px solid rgba(191,90,242,0.15)', borderRadius: 10, fontSize: 12, color: C.silver }}>
 <strong style={{ color: C.purple }}>How it works:</strong> AI reads PDFs (digital or scanned), images, and text — extracting MCQ, Short, Long, Fill, True/False, Match-Columns tagged with chapter and priority automatically. Supports files up to 100MB+.
 </div>

 {/* AI Status */}
 <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px',
 background: aiConfig?.configured ? 'rgba(48,209,88,0.06)' : 'rgba(255,55,95,0.06)',
 border: `1px solid ${aiConfig?.configured ? 'rgba(48,209,88,0.25)' : 'rgba(255,55,95,0.25)'}`, borderRadius: 10 }}>
 <span style={{ fontSize: 18 }}>{aiConfig?.configured ? '⚡' : '⚠️'}</span>
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 13, color: aiConfig?.configured ? '#30D158' : C.red, fontWeight: 700 }}>
 {aiConfig?.configured ? `AI Ready (${paperSettings.geminiModel || aiConfig?.models?.primary || DEFAULT_MODEL})` : 'Backend AI Not Configured'}
 </div>
 <div style={{ fontSize: 11, color: C.muted }}>
 {aiConfig?.configured ? 'AI extraction ready. Auto-fallback enabled on the server.' : 'Set GEMINI_API_KEY on the backend to enable AI features.'}
 </div>
 </div>
 <button onClick={() => { setModelInput(paperSettings.geminiModel || DEFAULT_MODEL); setShowApiKey(true) }}
 style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 14px', color: C.silver, fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
  AI Config
 </button>
 </div>

 <PaperAiJobsPanel title="Import Jobs" />

 <Btn variant="ai" size="lg" disabled={!file && !rawText.trim()} onClick={handleExtract}
 style={{ justifyContent: 'center', padding: '14px' }}>
 <Sparkles size={16} /> Extract All Questions with AI
 </Btn>
 </div>
 )}

 {/*  Phase: Upload - Textbook Topics  */}
 {phase === 'upload' && activeTab === 'topics' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
     <Input label="Subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" />
     <Input label="Class Level" value={classLevel} onChange={e => setClassLevel(e.target.value)} placeholder="e.g. 9" />
     <Select label="Medium" value={medium} onChange={e => setMedium(e.target.value)} options={MEDIUM_OPTIONS} />
   </div>

   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: '14px 18px', background: 'rgba(11,44,77,0.4)', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 14 }}>
     <Input type="number" label="MCQs" value={mcqCount} onChange={e => setMcqCount(Math.max(0, parseInt(e.target.value) || 0))} />
     <Input type="number" label="Short Qs" value={shortCount} onChange={e => setShortCount(Math.max(0, parseInt(e.target.value) || 0))} />
     <Input type="number" label="Long Qs" value={longCount} onChange={e => setLongCount(Math.max(0, parseInt(e.target.value) || 0))} />
   </div>

   <div>
     <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Textbook Chapters & Topics</div>
     
     {standardChapters.length === 0 ? (
       <div style={{ padding: '24px 16px', textAlign: 'center', background: 'rgba(15,23,42,0.4)', border: `1px solid ${C.border}`, borderRadius: 16, color: C.muted, fontSize: 13 }}>
         No predefined chapters found for "{subject}" (Class {classLevel}).
         <div style={{ fontSize: 11, marginTop: 4 }}>
           Try entering a standard Class 9/10 subject (e.g. Biology, Chemistry, Physics, Mathematics) or use the upload tab to parse a document.
         </div>
       </div>
     ) : (
       <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 6 }}>
         {standardChapters.map(ch => {
           const isChSelected = selectedChapters.has(ch.id)
           const isChExpanded = expandedChapters.has(ch.id)
           const toggleExpand = (e) => {
             e.stopPropagation()
             setExpandedChapters(prev => {
               const next = new Set(prev)
               next.has(ch.id) ? next.delete(ch.id) : next.add(ch.id)
               return next
             })
           }
           return (
             <div key={ch.id} style={{ border: '1px solid rgba(148,163,184,0.12)', borderRadius: 12, overflow: 'hidden', background: 'rgba(15,23,42,0.25)' }}>
               <div 
                 onClick={() => toggleChapter(ch.id)}
                 style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: 'rgba(15,23,42,0.2)', transition: 'all 0.2s' }}
               >
                 <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: isChSelected ? C.purple : C.muted, display: 'flex', alignItems: 'center', padding: 0 }}>
                   {isChSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                 </button>
                 <div style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: 600 }}>
                   Chapter {ch.n}: {ch.en} {ch.ur && <span style={{ color: C.muted, fontSize: 12, float: 'right', fontFamily: 'Noto Nastaliq Urdu, serif' }}>{ch.ur}</span>}
                 </div>
                 <button 
                   onClick={toggleExpand}
                   style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.silver, display: 'flex', alignItems: 'center', padding: 4 }}
                 >
                   {isChExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                 </button>
               </div>

               {isChExpanded && (
                 <div style={{ padding: '8px 14px 12px 36px', borderTop: '1px solid rgba(148,163,184,0.08)', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(11,44,77,0.15)' }}>
                   {ch.topics.map(topic => {
                     const isTSelected = selectedTopics.has(topic.id)
                     return (
                       <div 
                         key={topic.id} 
                         onClick={(e) => { e.stopPropagation(); toggleTopic(ch.id, topic.id) }}
                         style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                       >
                         <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: isTSelected ? C.blue : C.muted, display: 'flex', alignItems: 'center', padding: 0 }}>
                           {isTSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                         </button>
                         <div style={{ color: C.silver, fontSize: 12 }}>
                           {topic.en} {topic.ur && <span style={{ color: C.muted, fontSize: 11, marginLeft: 8, fontFamily: 'Noto Nastaliq Urdu, serif' }}>{topic.ur}</span>}
                         </div>
                       </div>
                     )
                   })}
                 </div>
               )}
             </div>
           )
         })}
       </div>
     )}
   </div>

   {error && (
     <div style={{ background: 'rgba(255,55,95,0.1)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 8, padding: '10px 14px', color: C.red, fontSize: 13 }}>
       {error}
     </div>
   )}

   {/* AI Status */}
   <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px',
   background: aiConfig?.configured ? 'rgba(48,209,88,0.06)' : 'rgba(255,55,95,0.06)',
   border: `1px solid ${aiConfig?.configured ? 'rgba(48,209,88,0.25)' : 'rgba(255,55,95,0.25)'}`, borderRadius: 10 }}>
     <span style={{ fontSize: 18 }}>{aiConfig?.configured ? '⚡' : '⚠️'}</span>
     <div style={{ flex: 1 }}>
       <div style={{ fontSize: 13, color: aiConfig?.configured ? '#30D158' : C.red, fontWeight: 700 }}>
         {aiConfig?.configured ? `AI Ready (${paperSettings.geminiModel || aiConfig?.models?.primary || DEFAULT_MODEL})` : 'Backend AI Not Configured'}
       </div>
       <div style={{ fontSize: 11, color: C.muted }}>
         {aiConfig?.configured ? 'AI extraction ready. Auto-fallback enabled on the server.' : 'Set GEMINI_API_KEY on the backend to enable AI features.'}
       </div>
     </div>
     <button onClick={() => { setModelInput(paperSettings.geminiModel || DEFAULT_MODEL); setShowApiKey(true) }}
     style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 14px', color: C.silver, fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
       AI Config
     </button>
   </div>

   <Btn variant="ai" size="lg" disabled={selectedChapters.size === 0} onClick={handleGenerateFromTopics}
   style={{ justifyContent: 'center', padding: '14px' }}>
     <Sparkles size={16} /> Generate Textbook Questions with AI
   </Btn>
 </div>
 )}

 {/*  Phase: Extracting  */}
 {phase === 'extracting' && (
 <div style={{ textAlign: 'center', padding: '40px 20px' }}>
 <div style={{ fontSize: 56, marginBottom: 16, animation: 'spin 2s linear infinite' }}></div>
 <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>AI is analyzing your content...</div>
 <div style={{ color: C.purple, fontSize: 13, minHeight: 22, marginBottom: 24 }}>{progress.msg || 'Processing...'}</div>
 {/* Progress bar */}
 <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', background: 'rgba(191,90,242,0.12)', borderRadius: 20, height: 10, overflow: 'hidden' }}>
 <div style={{ height: '100%', borderRadius: 20, background: `linear-gradient(90deg,#7B2FBE,#BF5AF2)`, width: `${progress.pct || 5}%`, transition: 'width 0.5s ease' }} />
 </div>
 <div style={{ marginTop: 8, color: C.muted, fontSize: 12 }}>{progress.pct || 0}% complete</div>
 <div style={{ marginTop: 20, color: C.muted, fontSize: 11 }}>Large PDFs may take a few minutes — please wait</div>
 <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
 </div>
 )}

 {/*  Phase: Preview  */}
 {phase === 'preview' && (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
 {/* Stats summary */}
 <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(191,90,242,0.06)', border: '1px solid rgba(191,90,242,0.2)', borderRadius: 14 }}>
 <span style={{ color: C.silver, fontSize: 13, fontWeight: 600, alignSelf: 'center' }}>Extracted {extracted.length} questions:</span>
 {Object.entries(byType).map(([type, n]) => {
 const tc = getTypeCfg(type)
 return (
 <span key={type} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20,
 background: `${tc.color}22`, color: tc.color, border: `1px solid ${tc.color}44`, fontWeight: 600 }}>
 {tc.label}: {n}
 </span>
 )
 })}
 </div>

 {/* Controls */}
 <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '2px 0 4px' }}>
 <span style={{ fontSize: 12, color: C.muted }}>Filter:</span>
 {[{ value: 'all', label: `All (${extracted.length})` }, ...Object.entries(byType).map(([t, n]) => ({ value: t, label: `${getTypeCfg(t).label} (${n})` }))].map(opt => (
 <button key={opt.value} onClick={() => setFilterType(opt.value)}
 style={{
 padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
 background: filterType === opt.value ? C.purple : 'rgba(255,255,255,0.07)',
 color: filterType === opt.value ? '#fff' : C.silver,
 }}>{opt.label}</button>
 ))}
 <span style={{ flex: 1 }} />
 <Btn variant="ghost" size="sm" onClick={selectAll}>Select All</Btn>
 <Btn variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Btn>
 <span style={{ fontSize: 12, color: C.gold, fontWeight: 700 }}>{selected.size} selected</span>
 </div>

 {/* Question cards */}
 {filtered.map(q => {
 const tc = getTypeCfg(q.type)
 const isSelected = selected.has(q.id)
 const isExpanded = expandedId === q.id
 return (
 <div key={q.id} style={{
 ...card, padding: '14px 16px', cursor: 'pointer', borderRadius: 18,
 borderColor: isSelected ? `${tc.color}55` : 'rgba(148,163,184,0.18)',
 background: isSelected ? `${tc.color}0A` : 'rgba(15,23,42,0.5)',
 }}>
 <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
 {/* Checkbox */}
 <button onClick={() => toggleQ(q.id)}
 style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSelected ? tc.color : C.muted, flexShrink: 0, marginTop: 2 }}>
 {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
 </button>

 <div style={{ flex: 1 }}>
 {/* Badges row */}
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
 <select
 value={q.type || defaultCategory}
 onChange={e => updateExtractedQuestion(q.id, { type: e.target.value, marks: questionTypes.find(t => t.value === e.target.value)?.marks || q.marks || 2 })}
 onClick={e => e.stopPropagation()}
 style={{ background: `${tc.color}18`, border: `1px solid ${tc.color}44`, color: '#fff', borderRadius: 20, padding: '3px 8px', fontSize: 11, fontWeight: 700, outline: 'none' }}
 >
 {questionTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
 </select>
 <Badge color={C.gold}>{q.marks} mk</Badge>
 {q.chapter && <Badge color={C.blue}>{q.chapter}</Badge>}
 <PriorityTag priority={q.priority} />
 </div>

 {/* Question text */}
 <div style={{ color: '#fff', fontSize: 13, lineHeight: 1.5 }}>{q.text || q.textUrdu}</div>
 {q.textUrdu && q.text && (
 <div style={{ color: C.muted, fontSize: 13, direction: 'rtl', marginTop: 4, fontFamily: 'Noto Nastaliq Urdu, serif', lineHeight: 1.8 }}>{q.textUrdu}</div>
 )}

 {/* Expand for details */}
 {(q.type === 'mcq' || q.type === 'columns') && (
 <button onClick={e => { e.stopPropagation(); setExpandedId(isExpanded ? null : q.id) }}
 style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
 {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
 {isExpanded ? 'Hide' : 'Show'} details
 </button>
 )}

 {isExpanded && q.type === 'mcq' && q.options?.length > 0 && (
 <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
 {q.options.map(o => (
 <span key={o.label} style={{ fontSize: 12, color: o.label === q.answer ? C.green : C.muted }}>
 {o.label === q.answer ? ' ' : ''}{o.label}. {o.text}
 </span>
 ))}
 </div>
 )}

 {isExpanded && q.type === 'columns' && (
 <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
 <div>
 {(q.leftColumn || []).map((item, i) => (
 <div key={i} style={{ fontSize: 12, color: C.silver }}>{i + 1}. {item}</div>
 ))}
 </div>
 <div>
 {(q.rightColumn || []).map((item, i) => (
 <div key={i} style={{ fontSize: 12, color: C.cyan }}>{String.fromCharCode(65 + i)}. {item}</div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )
 })}
 </div>
 )}
 </div>

 {/* Footer */}
 {phase === 'preview' && (
 <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(191,90,242,0.2)', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
 <Btn variant="ghost" onClick={() => { setPhase('upload'); setExtracted([]); setSelected(new Set()) }}>
 <RefreshCw size={13} /> Start Over
 </Btn>
 <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
 <span style={{ color: C.muted, fontSize: 13 }}>{selected.size} questions selected</span>
 <Btn variant="ai" size="lg" disabled={selected.size === 0} onClick={handleImport}>
 <CheckSquare size={16} /> Import {selected.size} Questions
 </Btn>
 </div>
 </div>
 )}
 </div>
 </div>
 </Portal>
 )
}

function readFileAsBase64(file) {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = ev => resolve(ev.target.result.split(',')[1])
 reader.onerror = reject
 reader.readAsDataURL(file)
 })
}

function readFileAsText(file) {
 return new Promise((resolve, reject) => {
 const reader = new FileReader()
 reader.onload = ev => resolve(ev.target.result)
 reader.onerror = reject
 reader.readAsText(file)
 })
}

//  Structured Data Editor 
// Renders type-specific structured field editors inside QuestionModal.

function StructuredDataEditor({ type, data, onChange, urduFont = 'Noto Nastaliq Urdu, serif' }) {
 const d = data || {}

 //  Wahid / Jama 
 if (type === 'wahid_jama') {
 const pairs = d.pairs || [{ singular: '', plural: '' }]
 const setPair = (i, field, val) => {
 const next = [...pairs]; next[i] = { ...next[i], [field]: val }
 onChange({ ...d, pairs: next })
 }
 const addPair = () => onChange({ ...d, pairs: [...pairs, { singular: '', plural: '' }] })
 const removePair = i => onChange({ ...d, pairs: pairs.filter((_, idx) => idx !== i) })
 return (
 <div>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 600, display: 'block', marginBottom: 8 }}>
 واحد جمع — Singular / Plural Pairs
 </label>
 <div style={{ border: '1px solid rgba(200,153,26,0.25)', borderRadius: 8, overflow: 'hidden' }}>
 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', background: 'rgba(200,153,26,0.1)', padding: '5px 10px' }}>
 <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, textAlign: 'right', direction: 'rtl', fontFamily: urduFont }}>واحد (Singular)</span>
 <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, textAlign: 'right', direction: 'rtl', fontFamily: urduFont }}>جمع (Plural)</span>
 <span />
 </div>
 {pairs.map((p, i) => (
 <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
 <input value={p.singular} onChange={e => setPair(i, 'singular', e.target.value)}
 dir="rtl" placeholder={`واحد ${i + 1}`}
 style={{ background: 'rgba(255,255,255,0.05)', border: 'none', padding: '7px 10px', color: '#fff', fontSize: 14, outline: 'none', fontFamily: urduFont }} />
 <input value={p.plural} onChange={e => setPair(i, 'plural', e.target.value)}
 dir="rtl" placeholder={`جمع ${i + 1}`}
 style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '1px solid rgba(255,255,255,0.07)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)', padding: '7px 10px', color: C.silver, fontSize: 14, outline: 'none', fontFamily: urduFont }} />
 {pairs.length > 1
 ? <button onClick={() => removePair(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }}>×</button>
 : <span />}
 </div>
 ))}
 </div>
 <button onClick={addPair} style={{ marginTop: 6, background: 'rgba(200,153,26,0.08)', border: '1px dashed rgba(200,153,26,0.3)', borderRadius: 6, padding: '4px 12px', color: C.gold, cursor: 'pointer', fontSize: 11, width: '100%' }}>
 + جوڑا شامل کریں (Add Pair)
 </button>
 </div>
 )
 }

 //  Sentence Usage 
 if (type === 'sentence_usage') {
 const items = d.items || [{ word: '', sentence: '' }]
 const setItem = (i, field, val) => {
 const next = [...items]; next[i] = { ...next[i], [field]: val }
 onChange({ ...d, items: next })
 }
 const addItem = () => onChange({ ...d, items: [...items, { word: '', sentence: '' }] })
 const removeItem = i => onChange({ ...d, items: items.filter((_, idx) => idx !== i) })
 return (
 <div>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 600, display: 'block', marginBottom: 8 }}>
 الفاظ برائے جملے — Words for Sentence Usage
 </label>
 {items.map((item, i) => (
 <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 28px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
 <input value={item.word} onChange={e => setItem(i, 'word', e.target.value)}
 dir="rtl" placeholder={`لفظ ${i + 1}`}
 style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '7px 10px', color: '#fff', fontSize: 13, outline: 'none', fontFamily: urduFont }} />
 <input value={item.sentence} onChange={e => setItem(i, 'sentence', e.target.value)}
 dir="rtl" placeholder="نمونہ جملہ (Answer Key کے لیے)..."
 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '7px 10px', color: C.muted, fontSize: 12, outline: 'none', fontFamily: urduFont }} />
 {items.length > 1
 ? <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer' }}><X size={13} /></button>
 : <span />}
 </div>
 ))}
 <button onClick={addItem} style={{ background: 'rgba(200,153,26,0.08)', border: '1px dashed rgba(200,153,26,0.3)', borderRadius: 6, padding: '4px 12px', color: C.gold, cursor: 'pointer', fontSize: 11, width: '100%' }}>
 + لفظ شامل کریں (Add Word)
 </button>
 </div>
 )
 }

 //  Comprehension (passage in text field, questions in structuredData) 
 if (type === 'comprehension') {
 const questions = d.questions || [{ text: '', textUrdu: '', answer: '' }]
 const setQ = (i, field, val) => {
 const next = [...questions]; next[i] = { ...next[i], [field]: val }
 onChange({ ...d, questions: next })
 }
 const addQ = () => onChange({ ...d, questions: [...questions, { text: '', textUrdu: '', answer: '' }] })
 const removeQ = i => onChange({ ...d, questions: questions.filter((_, idx) => idx !== i) })
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 600 }}>
 Sub-Questions — تفہیم کے سوالات
 </label>
 {questions.map((sq, i) => (
 <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
 <span style={{ color: C.gold, fontWeight: 700, fontSize: 12, width: 20, paddingTop: 9, flexShrink: 0 }}>{i + 1}.</span>
 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
 <input value={sq.textUrdu} onChange={e => setQ(i, 'textUrdu', e.target.value)}
 dir="rtl" placeholder={`سوال ${i + 1} اردو میں...`}
 style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '7px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: urduFont }} />
 <input value={sq.text} onChange={e => setQ(i, 'text', e.target.value)}
 placeholder={`Question ${i + 1} in English (optional)`}
 style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '6px 10px', color: C.muted, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
 <input value={sq.answer} onChange={e => setQ(i, 'answer', e.target.value)}
 placeholder="Model answer (for answer key)..."
 style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 7, padding: '6px 10px', color: 'rgba(192,200,216,0.4)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
 </div>
 {questions.length > 1 && (
 <button onClick={() => removeQ(i)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', paddingTop: 8 }}><X size={13} /></button>
 )}
 </div>
 ))}
 <button onClick={addQ} style={{ background: 'rgba(200,153,26,0.08)', border: '1px dashed rgba(200,153,26,0.3)', borderRadius: 6, padding: '4px 12px', color: C.gold, cursor: 'pointer', fontSize: 11 }}>
 + Add Sub-Question
 </button>
 </div>
 )
 }

 //  Numerical 
 if (type === 'numerical') {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 600 }}>Numerical Data</label>
 <div>
 <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Formula / Given Values (optional)</label>
 <input value={d.formula || ''} onChange={e => onChange({ ...d, formula: e.target.value })}
 placeholder="e.g. F = ma, v = u + at, Given: m=5 kg, a=2 m/s²"
 style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '7px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Solution Steps (for answer key)</label>
 <textarea value={d.steps || ''} onChange={e => onChange({ ...d, steps: e.target.value })}
 placeholder="Step 1: Apply formula F = ma&#10;Step 2: F = 5 × 2 = 10 N"
 style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '7px 10px', color: C.muted, fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }} />
 </div>
 </div>
 )
 }

 //  Diagram / Drawing 
 if (type === 'diagram') {
 return (
 <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 600 }}>Diagram Data</label>
 <div>
 <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Drawing Instruction (optional override)</label>
 <input value={d.drawingInstruction || ''} onChange={e => onChange({ ...d, drawingInstruction: e.target.value })}
 placeholder="e.g. Draw and label the digestive system of a frog."
 style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '7px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
 </div>
 <div>
 <label style={{ fontSize: 11, color: C.muted, display: 'block', marginBottom: 4 }}>Labels (comma-separated)</label>
 <input value={(d.labels || []).join(', ')} onChange={e => onChange({ ...d, labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
 placeholder="e.g. Cell wall, Nucleus, Mitochondria, Cytoplasm"
 style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(200,153,26,0.2)', borderRadius: 7, padding: '7px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
 </div>
 <div style={{ fontSize: 11, color: C.muted, padding: '6px 10px', background: 'rgba(255,153,10,0.06)', borderRadius: 6, border: '1px solid rgba(255,153,10,0.15)' }}>
  Diagram space will be rendered as a blank box in the printed paper. Image upload coming soon.
 </div>
 </div>
 )
 }

 return null
}

//  Structured Data Preview (question list) 
function StructuredDataPreview({ q }) {
 const sd = q.structuredData
 if (!sd) return null

 if (q.type === 'wahid_jama' && sd.pairs?.length) {
 return (
 <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 {sd.pairs.slice(0, 5).map((p, i) => (
 <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(255,153,10,0.12)', borderRadius: 10, color: C.orange, fontFamily: 'Noto Nastaliq Urdu, serif', direction: 'rtl' }}>
 {p.singular}
 </span>
 ))}
 {sd.pairs.length > 5 && <span style={{ fontSize: 11, color: C.muted }}>+{sd.pairs.length - 5} more</span>}
 </div>
 )
 }

 if (q.type === 'sentence_usage' && sd.items?.length) {
 return (
 <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
 {sd.items.slice(0, 6).map((it, i) => (
 <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(168,230,207,0.12)', borderRadius: 10, color: '#A8E6CF', fontFamily: 'Noto Nastaliq Urdu, serif', direction: 'rtl' }}>
 {it.word}
 </span>
 ))}
 {sd.items.length > 6 && <span style={{ fontSize: 11, color: C.muted }}>+{sd.items.length - 6}</span>}
 </div>
 )
 }

 if (q.type === 'comprehension' && sd.questions?.length) {
 return (
 <div style={{ marginTop: 4, fontSize: 11, color: C.muted }}>
 {sd.questions.length} sub-question{sd.questions.length !== 1 ? 's' : ''}
 </div>
 )
 }

 if (q.type === 'numerical' && sd.formula) {
 return <div style={{ fontSize: 12, color: C.cyan, marginTop: 4, fontStyle: 'italic' }}>Formula: {sd.formula}</div>
 }

 if (q.type === 'diagram' && sd.labels?.length) {
 return (
 <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
 Labels: {sd.labels.join(', ')}
 </div>
 )
 }

 return null
}

//  Settings Tab 

function SettingsTab({ store }) {
 const logoRef = useRef()

 const handleLogo = useCallback((e) => {
 const file = e.target.files[0]
 if (!file) return
 const reader = new FileReader()
 reader.onload = ev => {
 const logoData = ev.target.result
 store.updatePaperSettings({ logo: logoData })
 api.patch('/api/settings/logo', {
 school_logo: logoData,
 school_code: store.paperSettings.schoolCode || undefined,
 }).catch(() => {})
 }
 reader.readAsDataURL(file)
 }, [store])

 const logo = store.paperSettings.logo

 return (
 <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
 <div className="super-module-card" style={{ ...card, padding: 24, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18, borderRadius: 22, background: 'rgba(15,23,42,0.6)' }}>
 <h3 style={{ color: C.gold, margin: 0, fontSize: 16 }}> Paper / School Settings</h3>

 <div>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500, display: 'block', marginBottom: 10 }}>School Logo</label>
 <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
 <div style={{ width: 96, height: 96, borderRadius: 14, flexShrink: 0, background: 'rgba(255,255,255,0.04)',
 border: `2px dashed ${logo ? 'rgba(200,153,26,0.5)' : 'rgba(200,153,26,0.2)'}`,
 display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
 {logo
 ? <img src={logo} alt="School logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
 : <div style={{ textAlign: 'center', color: 'rgba(192,200,216,0.3)', fontSize: 11 }}>
 <Image size={28} style={{ marginBottom: 4, opacity: 0.4 }} /><div>No logo</div>
 </div>
 }
 </div>
 <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
 <Btn variant="gold" size="sm" onClick={() => logoRef.current.click()}>
 <Upload size={13} /> {logo ? 'Change Logo' : 'Upload Logo'}
 </Btn>
 {logo && <Btn variant="red" size="sm" onClick={() => store.updatePaperSettings({ logo: null })}><X size={13} /> Remove</Btn>}
 <div style={{ fontSize: 11, color: 'rgba(192,200,216,0.4)', lineHeight: 1.5 }}>PNG, JPG, SVG<br />Recommended: square</div>
 </div>
 </div>
 <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogo} />
 </div>

 <div style={{ borderTop: '1px solid rgba(200,153,26,0.1)', paddingTop: 2 }} />

 {[
 { key: 'schoolName', label: 'School Name (English)' },
 { key: 'schoolUrdu', label: 'School Name (Urdu) — اسکول کا نام', dir: 'rtl' },
 { key: 'address', label: 'Address / پتہ' },
 { key: 'examYear', label: 'Exam Year / Session (e.g. 2026-2027)' },
 ].map(f => (
 <Input key={f.key} label={f.label} dir={f.dir}
 value={store.paperSettings[f.key] || ''}
 onChange={e => store.updatePaperSettings({ [f.key]: e.target.value })} />
 ))}

 <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
 <label style={{ fontSize: 12, color: C.silver, fontWeight: 500 }}>Urdu Font</label>
 <select value={store.paperSettings.urduFont} onChange={e => store.updatePaperSettings({ urduFont: e.target.value })}
 style={{ background: 'rgba(11,44,77,0.9)', border: '1px solid rgba(200,153,26,0.25)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' }}>
 {['Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Mehr Nastaleeq'].map(f => <option key={f}>{f}</option>)}
 </select>
 </div>

 <div style={{ background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', borderRadius: 10, padding: '10px 14px', color: C.green, fontSize: 12 }}>
  All settings are auto-saved to localStorage
 </div>
 </div>
 </div>
 )
}

//  Main Component 

export default function QuestionBank() {
 const store = usePaperStore()
 const { activeClasses } = useAcademicStore()

 const [activeClass, setActiveClass] = useState('all')
 const [activeSubject, setActiveSubject] = useState(null)
 const [search, setSearch] = useState('')
 const [filterType, setFilterType] = useState('all')
 const [filterChapter, setFilterChapter] = useState('')
 const [filterPriority, setFilterPriority] = useState('all')
 const [tab, setTab] = useState('questions')
 const [showAnswers, setShowAnswers] = useState(false)

 const classLevels = useMemo(() => (
 sortClassLevels([...new Set([
 ...activeClasses.map(c => normalizeClassLevel(c.level || c.name)).filter(Boolean),
 ...store.subjects.map(s => normalizeClassLevel(s.classLevel)).filter(Boolean),
 ])])
 ), [store.subjects, activeClasses])

 const sidebarSubjects = useMemo(() => (
 activeClass === 'all' ? store.subjects : store.subjects.filter(s => !s.classLevel || classLevelsMatch(s.classLevel, activeClass))
 ), [store.subjects, activeClass])

 const [subjectModal, setSubjectModal] = useState(null)
 const [questionModal, setQuestionModal] = useState(null)
 const [bulkModal, setBulkModal] = useState(false)
 const [aiModal, setAiModal] = useState(false)
 const [aiImportResult, setAiImportResult] = useState(null)

 const currentSubject = store.subjects.find(s => s.id === activeSubject)
 const filteredTypes = store.getFilteredQuestionTypes(currentSubject ? currentSubject.name : null)
 const showUrdu = isDual(currentSubject?.classLevel)

 const subjectChapters = useMemo(() => (
 [...new Set(store.questions.filter(q => q.subjectId === activeSubject && q.chapter).map(q => q.chapter))].sort()
 ), [store.questions, activeSubject])

 const visibleQuestions = store.questions.filter(q => {
 if (q.subjectId !== activeSubject) return false
 if (filterType !== 'all' && q.type !== filterType) return false
 if (search && !q.text?.toLowerCase().includes(search.toLowerCase()) && !q.textUrdu?.includes(search)) return false
 if (filterChapter && q.chapter !== filterChapter) return false
 if (filterPriority !== 'all' && q.priority && q.priority !== 'all' && q.priority !== filterPriority) return false
 return true
 })

 function handleSaveSubject(form) {
 if (subjectModal === 'add') {
 const s = store.addSubject(form); setActiveSubject(s.id)
 } else {
 store.editSubject(subjectModal.id, form)
 }
 setSubjectModal(null)
 }

 function handleSaveQuestion(form) {
 if (questionModal === 'add') store.addQuestion(form)
 else store.editQuestion(questionModal.id, form)
 setQuestionModal(null)
 }

 function handleAIImport(subjectId, questions, subjectNameHint, classLevelHint) {
 // If no subjectId, try to find an existing subject by name hint,
 // otherwise create a new subject automatically
 let resolvedSubjectId = subjectId
 if (!resolvedSubjectId && subjectNameHint) {
 const found = store.subjects.find(s =>
 s.name.toLowerCase() === subjectNameHint.toLowerCase()
 )
 if (found) {
 resolvedSubjectId = found.id
 } else {
 // Create a new subject automatically
 const newSubj = store.addSubject({
 name: subjectNameHint || 'AI Imported',
 classLevel: classLevelHint || '',
 })
 resolvedSubjectId = newSubj.id
 }
 }
 if (!resolvedSubjectId) {
 // Last resort: use first subject, or create a generic one
 resolvedSubjectId = store.subjects[0]?.id
 if (!resolvedSubjectId) {
 const newSubj = store.addSubject({ name: 'AI Imported Questions', classLevel: '' })
 resolvedSubjectId = newSubj.id
 }
 }
 const resolvedSubject = store.subjects.find(s => s.id === resolvedSubjectId)
 const allowedTypes = store.getFilteredQuestionTypes(resolvedSubject?.name || subjectNameHint || '')
 const fallbackType = allowedTypes[0]?.value || 'short'
 const formattedQuestions = questions.map(q => {
 const incomingType = String(q.type || '').trim()
 const typeMeta = allowedTypes.find(t => t.value === incomingType) || allowedTypes.find(t => t.value === fallbackType)
 const resolvedType = typeMeta?.value || fallbackType
 return {
 subjectId: resolvedSubjectId,
 type: resolvedType,
 medium: q.medium || q.language || 'english',
 text: q.text || '',
 textUrdu: q.textUrdu || '',
 marks: Number(q.marks) || Number(typeMeta?.marks) || 1,
 answer: q.answer || '',
 chapter: q.chapter || '',
  topic: q.topic || '',
 priority: q.priority || 'exercise',
 options: q.options || [],
 leftColumn: q.leftColumn || [],
 rightColumn:q.rightColumn || [],
 }
 })
 store.bulkAddQuestions(formattedQuestions)

 const fullSubject = resolvedSubject || { classLevel: classLevelHint }
 const normalizedClass = normalizeClassLevel(fullSubject.classLevel)
 if (normalizedClass && classLevels.includes(normalizedClass)) {
 setActiveClass(normalizedClass)
 } else {
 setActiveClass('all')
 }

 setAiImportResult(questions.length)
 setActiveSubject(resolvedSubjectId) // Navigate to the imported subject
 setAiModal(false)
 }

 return (
 <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #071e34 0%, #0B2C4D 100%)', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

 {/* Modals */}
 {subjectModal && (
 <SubjectModal
 subject={subjectModal === 'add' ? null : subjectModal}
 activeClasses={activeClasses}
 onSave={handleSaveSubject}
 onClose={() => setSubjectModal(null)}
 />
 )}
 {questionModal && (
 <QuestionModal
 question={questionModal === 'add' ? null : questionModal}
 subjectId={activeSubject}
 subjectClassLevel={currentSubject?.classLevel}
 existingChapters={subjectChapters}
 questionTypes={filteredTypes}
 onSave={handleSaveQuestion}
 onClose={() => setQuestionModal(null)}
 />
 )}
 {bulkModal && (
 <BulkImportModal
 subjectId={activeSubject}
 subjectClassLevel={currentSubject?.classLevel}
 questionTypes={filteredTypes}
 onImport={store.bulkImportQuestions}
 onClose={() => setBulkModal(false)}
 />
 )}
 {aiModal && (
 <AITextbookModal
 subjectId={activeSubject}
 subjectClassLevel={currentSubject?.classLevel}
 subjects={store.subjects}
 questionTypes={filteredTypes}
 onImported={handleAIImport}
 onClose={() => setAiModal(false)}
 />
 )}

 <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', minHeight: '100vh' }}>

 {/*  Left: Subject Sidebar  */}
 <div style={{ width: 280, ...card, borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(7,30,52,0.98) 100%)' }}>

 {/* Sidebar header */}
 <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(200,153,26,0.12)' }}>
 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
 <BookOpen size={16} color={C.gold} />
 <span style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>Subjects</span>
 <span style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>({sidebarSubjects.length})</span>
 </div>
 <Btn variant="gold" size="sm" onClick={() => setSubjectModal('add')} style={{ padding: '4px 10px' }}>
 <Plus size={12} /> Add
 </Btn>
 </div>
 <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>
 Filter the list by class, then open a subject to manage its questions.
 </div>

 {/* Class tabs */}
 {classLevels.length > 0 && (
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: 8, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
 <button onClick={() => { setActiveClass('all'); setActiveSubject(null) }} style={{
 padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
 background: activeClass === 'all' ? C.gold : 'rgba(255,255,255,0.08)',
 color: activeClass === 'all' ? '#071e34' : C.silver,
 }}>All</button>
 {classLevels.map(lvl => (
 <button key={lvl} onClick={() => { setActiveClass(lvl); setActiveSubject(null) }} style={{
 padding: '5px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
 background: activeClass === lvl ? C.gold : 'rgba(255,255,255,0.08)',
 color: activeClass === lvl ? '#071e34' : C.silver,
 }}>{classLevelLabel(lvl)}</button>
 ))}
 </div>
 )}
 </div>

 {/* Subject list */}
 <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 12px' }}>
 {sidebarSubjects.length === 0 && (
 <div style={{ padding: 20, textAlign: 'center', color: 'rgba(192,200,216,0.35)', fontSize: 12 }}>
 {store.subjects.length === 0 ? 'No subjects yet.\nAdd one to start.' : 'No subjects in this class.'}
 </div>
 )}
 {sidebarSubjects.map(sub => {
 const qCount = store.questions.filter(q => q.subjectId === sub.id).length
 const active = sub.id === activeSubject
 return (
 <div key={sub.id}
 onClick={() => { setActiveSubject(sub.id); setFilterChapter(''); setFilterPriority('all'); setFilterType('all') }}
 style={{
 padding: '10px 11px', borderRadius: 12, marginBottom: 6, cursor: 'pointer',
 background: active ? 'rgba(200,153,26,0.14)' : 'transparent',
 border: active ? '1px solid rgba(200,153,26,0.35)' : '1px solid transparent',
 transition: 'all 0.12s',
 }}>
 <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
 {sub.cover
 ? <img src={sub.cover} alt="" style={{ width: 24, height: 32, objectFit: 'cover', borderRadius: 3 }} />
 : <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', background: active ? C.gold : 'rgba(148,163,184,0.3)', flexShrink: 0 }} />
 }
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: active ? C.gold : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.name}</div>
 <div style={{ fontSize: 11, color: 'rgba(192,200,216,0.55)', display: 'flex', gap: 4, alignItems: 'center' }}>
 <span>{qCount} Qs</span>
 {sub.classLevel && <span style={{ color: 'rgba(200,153,26,0.6)' }}>· {classLevelLabel(sub.classLevel)}</span>}
 {isDual(sub.classLevel) && <span style={{ color: C.purple }}>· UR</span>}
 </div>
 </div>
 </div>
 </div>
 )
 })}
 </div>
 </div>

 {/*  Right: Main Area  */}
 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

 {/* Header */}
 <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(200,153,26,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)' }}>
 <div style={{ minWidth: 0 }}>
 <h2 style={{ margin: 0, fontSize: 20, color: '#fff', lineHeight: 1.25 }}>
 {currentSubject ? currentSubject.name : 'Question Bank'}
 {currentSubject?.classLevel && <span style={{ color: C.gold, fontSize: 14, marginLeft: 8 }}>{classLevelLabel(currentSubject.classLevel)}</span>}
 {showUrdu && <span style={{ color: C.purple, fontSize: 12, marginLeft: 6 }}>Dual Medium</span>}
 </h2>
 <div style={{ fontSize: 12, color: 'rgba(192,200,216,0.6)', marginTop: 4, lineHeight: 1.5 }}>
 {currentSubject?.publisher || 'Manage questions, import from AI textbooks, and edit content before saving.'}
 </div>
 </div>

 <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
 <button onClick={() => setShowAnswers(!showAnswers)}
 style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px solid ${showAnswers ? C.green : 'rgba(255,255,255,0.1)'}`, background: showAnswers ? 'rgba(48,209,88,0.15)' : 'rgba(255,255,255,0.05)', color: showAnswers ? C.green : C.silver, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
 {showAnswers ? <Eye size={14} /> : <EyeOff size={14} />} Answer Key
 </button>
 <Btn variant="ai" size="sm" onClick={() => setAiModal(true)}><Sparkles size={13} /> AI Import</Btn>
 {[{ id: 'questions', label: 'Questions' }].map(t => (
 <button key={t.id} onClick={() => setTab(t.id)}
 style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
 background: tab === t.id ? C.gold : 'rgba(255,255,255,0.07)',
 color: tab === t.id ? '#0B2C4D' : C.silver }}>
 {t.label}
 </button>
 ))}
 {currentSubject && (
 <>
 <Btn variant="ghost" size="sm" onClick={() => setSubjectModal(currentSubject)}><Edit2 size={13} /> Edit</Btn>
 <Btn variant="red" size="sm" onClick={() => { if(window.confirm(`Delete "${currentSubject.name}"?`)) { store.deleteSubject(currentSubject.id); setActiveSubject(null) } }}><Trash2 size={13} /></Btn>
 </>
 )}
 </div>
 </div>

 {/* Body */}
 {!activeSubject ? (
 <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
 <BookOpen size={52} color="rgba(192,200,216,0.2)" />
 <div style={{ fontSize: 17, fontWeight: 600, color: 'rgba(192,200,216,0.5)' }}>Select a subject from the left panel</div>
 <div style={{ fontSize: 13, color: 'rgba(192,200,216,0.35)' }}>or use AI Import to extract questions from a PDF book</div>
 <Btn variant="ai" onClick={() => setAiModal(true)}><Sparkles size={14} /> AI Import from PDF</Btn>
 </div>
 ) : tab === 'settings' ? (
 <SettingsTab store={store} />

 ) : (
 <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

 {/* AI import success banner */}
 {aiImportResult !== null && (
 <div style={{ padding: '10px 24px', background: 'rgba(191,90,242,0.12)', borderBottom: '1px solid rgba(191,90,242,0.2)',
 display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
 <Sparkles size={16} color={C.purple} />
 <span style={{ color: C.purple, fontWeight: 700 }}> {aiImportResult} questions imported from AI!</span>
 <button onClick={() => setAiImportResult(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', marginLeft: 'auto' }}><X size={14} /></button>
 </div>
 )}

 {/* Toolbar — row 1: search + actions */}
 <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
 <div style={{ position: 'relative', flex: '1 1 340px', minWidth: 260 }}>
 <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(192,200,216,0.4)', pointerEvents: 'none' }} />
 <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
 style={{ width: '100%', paddingLeft: 32, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(200,153,26,0.18)', borderRadius: 12, padding: '9px 12px 9px 32px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
 </div>
 <Btn variant="ai" size="sm" onClick={() => setAiModal(true)} ><Sparkles size={13} /> AI Import</Btn>
 <Btn variant="blue" size="sm" onClick={() => setBulkModal(true)} ><Upload size={13} /> Paste Text</Btn>
 <Btn variant="gold" size="sm" onClick={() => setQuestionModal('add')}><Plus size={13} /> Add</Btn>
 </div>

 {/* Toolbar — row 2: type chips (horizontally scrollable) */}
 <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(200,153,26,0.08)' }}>
 <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}
 className="no-scrollbar">
 {[{ value: 'all', label: 'All' }, ...filteredTypes].map(t => {
 const cfg = getTypeCfg(t.value)
 const active = filterType === t.value
 return (
 <button key={t.value} onClick={() => setFilterType(t.value)}
 style={{ padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
 whiteSpace: 'nowrap', flexShrink: 0,
 background: active ? (cfg.color || C.gold) : 'rgba(255,255,255,0.07)',
 color: active ? '#071e34' : C.silver }}>
 {t.value === 'all' ? 'All' : (cfg.label || t.label)}
 </button>
 )
 })}
 </div>
 </div>

 {/* Chapter + Priority filter */}
 {subjectChapters.length > 0 && (
 <div style={{ padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid rgba(200,153,26,0.06)', flexWrap: 'wrap', background: 'rgba(255,255,255,0.01)' }}>
 <span style={{ fontSize: 11, color: 'rgba(192,200,216,0.5)', flexShrink: 0 }}>Chapter:</span>
 <button onClick={() => setFilterChapter('')}
 style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
 background: !filterChapter ? C.gold : 'rgba(255,255,255,0.07)',
 color: !filterChapter ? '#0B2C4D' : C.silver }}>All</button>
 {subjectChapters.map(ch => (
 <button key={ch} onClick={() => setFilterChapter(filterChapter === ch ? '' : ch)}
 style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
 border: `1px solid ${filterChapter === ch ? C.gold : 'rgba(200,153,26,0.2)'}`,
 background: filterChapter === ch ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.04)',
 color: filterChapter === ch ? C.gold : C.silver }}>
 {ch}
 </button>
 ))}
 <span style={{ fontSize: 11, color: 'rgba(192,200,216,0.3)', margin: '0 2px' }}>|</span>
 <span style={{ fontSize: 11, color: 'rgba(192,200,216,0.5)', flexShrink: 0 }}>Priority:</span>
 {PRIORITIES.map(p => (
 <button key={p.value} onClick={() => setFilterPriority(p.value)}
 style={{ padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
 border: `1px solid ${filterPriority === p.value ? C.purple : 'rgba(255,255,255,0.1)'}`,
 background: filterPriority === p.value ? 'rgba(191,90,242,0.15)' : 'rgba(255,255,255,0.04)',
 color: filterPriority === p.value ? C.purple : C.silver }}>
 {p.label}
 </button>
 ))}
 </div>
 )}

 {/* Stats bar — only non-zero types */}
 <div style={{ padding: '10px 20px', display: 'flex', gap: 10, borderBottom: '1px solid rgba(200,153,26,0.06)', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
 {filteredTypes.map(t => {
 const n = store.questions.filter(q => q.subjectId === activeSubject && q.type === t.value).length
 if (n === 0) return null
 const tc = getTypeCfg(t.value)
 return (
 <span key={t.value} onClick={() => setFilterType(t.value)} style={{ fontSize: 11, color: tc.color, fontWeight: 600, cursor: 'pointer', padding: '2px 7px', borderRadius: 10, background: `${tc.color}14` }}>
 {tc.label}: {n}
 </span>
 )
 })}
 <span style={{ fontSize: 11, color: 'rgba(192,200,216,0.35)', marginLeft: 'auto' }}>
 Total: {store.questions.filter(q => q.subjectId === activeSubject).length}
 {(filterChapter || filterPriority !== 'all' || search || filterType !== 'all') && (
 <span style={{ color: C.orange, marginLeft: 6 }}>· Showing: {visibleQuestions.length}</span>
 )}
 </span>
 </div>

 {/* Question list */}
 <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
 {visibleQuestions.length === 0 && (
 <div style={{ textAlign: 'center', padding: 48, color: 'rgba(192,200,216,0.4)' }}>
 {store.questions.filter(q => q.subjectId === activeSubject).length === 0
 ? <><div style={{ fontSize: 32, marginBottom: 12 }}></div><div>No questions yet.</div><div style={{ fontSize: 12, marginTop: 6 }}>Use "AI Import" to extract from a textbook, or "Add" to create one.</div></>
 : <><div>No questions match current filters.</div></>
 }
 </div>
 )}
   {(() => {
    // Group questions by topic
    const grouped = {}
    visibleQuestions.forEach(q => {
      const t = q.topic?.trim() || 'General / Other Topics'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(q)
    })

    // Sort topic names alphabetically, keeping General at the bottom
    const sortedTopics = Object.keys(grouped).sort((a, b) => {
      if (a === 'General / Other Topics') return 1
      if (b === 'General / Other Topics') return -1
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    })

    return sortedTopics.map(topicName => {
      const questionsInTopic = grouped[topicName]
      return (
        <div key={topicName} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 }}>
          {/* Styled Topic Header Band */}
          <div style={{
            padding: '8px 14px',
            background: 'linear-gradient(90deg, rgba(200,153,26,0.15) 0%, rgba(200,153,26,0.02) 100%)',
            borderLeft: `3px solid ${C.gold}`,
            borderRadius: '4px 12px 12px 4px',
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0
          }}>
            <Tag size={13} color={C.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
              Topic: {topicName}
            </span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>
              ({questionsInTopic.length} {questionsInTopic.length === 1 ? 'question' : 'questions'})
            </span>
          </div>

          {/* Cards for this topic */}
          {questionsInTopic.map(q => {
            const globalIdx = visibleQuestions.indexOf(q)
            const tc = getTypeCfg(q.type)
            return (
              <div key={q.id} style={{ ...card, padding: '14px 18px', borderRadius: 18, background: 'rgba(15,23,42,0.52)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
                  {/* Left priority switcher column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: 14, flexShrink: 0, width: 95 }}>
                    <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', marginBottom: 2 }}>Source</div>
                    {[
                      { value: 'exercise', label: 'Exercise', color: C.green },
                      { value: 'past', label: 'Past Paper', color: C.purple },
                      { value: 'additional', label: 'Additional', color: C.orange }
                    ].map(opt => {
                      const active = q.priority === opt.value
                      return (
                        <button key={opt.value} onClick={(e) => { e.stopPropagation(); store.editQuestion(q.id, { priority: opt.value }) }}
                          style={{
                            padding: '4px 6px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                            border: active ? `1px solid ${opt.color}` : '1px solid rgba(255,255,255,0.06)',
                            background: active ? `${opt.color}22` : 'rgba(255,255,255,0.02)',
                            color: active ? opt.color : 'rgba(192,200,216,0.6)',
                            transition: 'all 0.15s ease', textAlign: 'center', whiteSpace: 'nowrap'
                          }}>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Right main content area */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: 'rgba(192,200,216,0.4)', fontSize: 12 }}>Q{globalIdx + 1}.</span>
                          <Badge color={tc.color}>{tc.icon} {tc.label}</Badge>
                          <Badge color={C.gold}>{q.marks} mk</Badge>
                          <Badge color={C.cyan}>{mediumLabel(q.medium || (q.textUrdu ? 'dual' : 'english'))}</Badge>
                          {q.chapter && <Badge color={C.blue}>{q.chapter}</Badge>}
                          <PriorityTag priority={q.priority} />
                          {showAnswers && q.type === 'mcq' && q.answer && <Badge color={C.green}>Ans: {q.answer}</Badge>}
                          {showAnswers && q.type === 'true_false' && q.answer && (
                            <Badge color={q.answer === 'True' ? C.green : C.red}>{q.answer}</Badge>
                          )}
                        </div>

                        {/* Question text */}
                        <div style={{ fontSize: 14, color: '#fff', marginBottom: 4 }}>{q.text}</div>
                        {q.textUrdu && (
                          <div style={{ fontSize: 15, color: 'rgba(192,200,216,0.7)', fontFamily: 'Noto Nastaliq Urdu, serif', direction: 'rtl', lineHeight: 1.8 }}>{q.textUrdu}</div>
                        )}

                        {/* Answers for Short/Long/Grammar */}
                        {showAnswers && q.answer && q.type !== 'mcq' && q.type !== 'true_false' && q.type !== 'columns' && (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(48,209,88,0.08)', borderLeft: `3px solid ${C.green}`, borderRadius: '0 8px 8px 0' }}>
                            <div style={{ fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Answer Key</div>
                            <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{q.answer}</div>
                          </div>
                        )}

                        {/* MCQ options preview */}
                        {q.type === 'mcq' && q.options?.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {q.options.filter(o => o.text).map(o => (
                              <span key={o.label} style={{ fontSize: 12, color: o.label === q.answer ? C.green : 'rgba(192,200,216,0.6)' }}>
                                {o.label === q.answer ? ' ' : ''}{o.label}. {o.text}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Columns preview */}
                        {q.type === 'columns' && q.leftColumn?.length > 0 && (
                          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 400 }}>
                            <div>{q.leftColumn.map((item, i) => <div key={i} style={{ fontSize: 12, color: C.silver }}>{i+1}. {item}</div>)}</div>
                            <div>{q.rightColumn?.map((item, i) => <div key={i} style={{ fontSize: 12, color: C.cyan }}>{String.fromCharCode(65+i)}. {item}</div>)}</div>
                          </div>
                        )}

                        {/* Answer preview for non-MCQ */}
                        {!['mcq', 'columns', 'true_false', 'wahid_jama', 'sentence_usage'].includes(q.type) && q.answer && (
                          <div style={{ fontSize: 12, color: 'rgba(48,209,88,0.7)', marginTop: 4, fontStyle: 'italic',
                          direction: ['mutradif','mutzad','alfaz_maani','sentence_correction','muhawara'].includes(q.type) ? 'rtl' : undefined,
                          fontFamily: ['mutradif','mutzad','alfaz_maani','sentence_correction','muhawara'].includes(q.type) ? 'Noto Nastaliq Urdu, serif' : undefined }}>
                            Ans: {q.answer.slice(0, 120)}{q.answer.length > 120 ? '...' : ''}
                          </div>
                        )}

                        {/* Structured data preview */}
                        <StructuredDataPreview q={q} />
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                        <Btn variant="ghost" size="sm" onClick={() => setQuestionModal(q)}><Edit2 size={12} /></Btn>
                        <Btn variant="red" size="sm" onClick={() => { if(window.confirm('Delete this question?')) store.deleteQuestion(q.id) }}><Trash2 size={12} /></Btn>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )
    })
  })()}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )
}
