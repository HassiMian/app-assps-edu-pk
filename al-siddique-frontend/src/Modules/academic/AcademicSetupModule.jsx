// AcademicSetupModule.jsx — Al Siddique Smart School OS

import { useState } from 'react'
import { GraduationCap, Plus, Trash2, Edit2, Check, X, Building2 } from 'lucide-react'

function slugifyLevel(name) {
  const clean = String(name || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean || `c_${Date.now()}`
}

//  Academic data (classes, subjects, calendar) stored separately 
const AK = 'al_siddique_academic'

function getStorage() {
 try {
 return typeof window !== 'undefined' ? window.localStorage : null
 } catch {
 return null
 }
}

const DEFAULT_ACADEMIC = {
 localities: ['Rayya Khas', 'Tharpal Sharif', 'Garoowal', 'Matteke', 'Fattoke', 'Jeewan Bhinder', 'Kulla Mandiala', 'Baddomalhi', 'Narowal', 'Lahore'],
 classes: [
 { level:'starter', name:'Starter', active:true, sections:['Blue'] },
 { level:'mover', name:'Mover', active:true, sections:['Blue'] },
 { level:'flyer', name:'Flyer', active:true, sections:['Blue'] },
 { level:'1', name:'One', active:true, sections:['Blue'] },
 { level:'2', name:'Two', active:true, sections:['Blue'] },
 { level:'3', name:'Three', active:true, sections:['Blue'] },
 { level:'4', name:'Four', active:true, sections:['Blue'] },
 { level:'5', name:'Five', active:true, sections:['Blue'] },
 { level:'6', name:'Six', active:true, sections:['Blue'] },
 { level:'7', name:'Seven', active:true, sections:['Blue'] },
 { level:'8', name:'Eight', active:true, sections:['Blue'] },
 { level:'pre-nine', name:'Pre Nine', active:true, sections:['Fatima','Usman','Blue'] },
 { level:'hifaz', name:'Hifaz Class', active:true, sections:['Abubakar'] },
 ],
 subjects: [
 { id:'sb1', name:'Mathematics', nameUrdu:'ریاضی', compulsory:true, classes:['1','2','3','4','5','6','7','8','9','10'] },
 { id:'sb2', name:'English', nameUrdu:'انگریزی', compulsory:true, classes:['1','2','3','4','5','6','7','8','9','10'] },
 { id:'sb3', name:'Urdu', nameUrdu:'اردو', compulsory:true, classes:['1','2','3','4','5','6','7','8','9','10'] },
 { id:'sb4', name:'Science', nameUrdu:'سائنس', compulsory:true, classes:['1','2','3','4','5','6','7','8'] },
 { id:'sb5', name:'Islamiyat', nameUrdu:'اسلامیات', compulsory:true, classes:['1','2','3','4','5','6','7','8','9','10'] },
 { id:'sb6', name:'Social Studies', nameUrdu:'معاشرتی علوم', compulsory:true, classes:['1','2','3','4','5','6','7','8'] },
 { id:'sb7', name:'Computer', nameUrdu:'کمپیوٹر', compulsory:false, classes:['5','6','7','8','9','10'] },
 { id:'sb8', name:'Physics', nameUrdu:'طبیعیات', compulsory:true, classes:['9','10'] },
 { id:'sb9', name:'Chemistry', nameUrdu:'کیمیا', compulsory:true, classes:['9','10'] },
 { id:'sb10',name:'Biology', nameUrdu:'حیاتیات', compulsory:false, classes:['9','10'] },
 { id:'sb11',name:'General Science',nameUrdu:'عمومی سائنس', compulsory:true, classes:['9','10'] },
 { id:'sb12',name:'Quran / Nazra', nameUrdu:'قرآن / ناظرہ', compulsory:true, classes:['1','2','3','4','5','6','7','8'] },
 ],
 sessionStart: '2026-04-01',
 sessionEnd: '2027-03-31',
 periodsPerDay: 8,
 periodDuration: 40,
 holidays: [
 { id:'h1', name:'Independence Day', date:'2026-08-14' },
 { id:'h2', name:'Iqbal Day', date:'2026-11-09' },
 { id:'h3', name:'Quaid-e-Azam Day', date:'2026-12-25' },
 { id:'h4', name:'Pakistan Day', date:'2027-03-23' },
 ],
}

const REAL_CLASS_NAMES = DEFAULT_ACADEMIC.classes.map(cls => cls.name)

function isLegacyDefaultClass(cls) {
 const name = String(cls?.name || '')
 return !REAL_CLASS_NAMES.includes(name) || ['Nursery', 'KG', 'Play Group', 'Prep'].includes(name) || /^Class\s+\d+$/i.test(name)
}

function mergeClasses(savedClasses = []) {
  if (!Array.isArray(savedClasses) || savedClasses.length === 0) {
    return DEFAULT_ACADEMIC.classes
  }
  return savedClasses.map((item, idx) => ({
    level: String(item.level || `c_${idx + 1}`),
    name: String(item.name || `Class ${idx + 1}`).trim(),
    active: item.active !== false,
    sections: Array.isArray(item.sections) && item.sections.length > 0 ? item.sections : ['Blue'],
  }))
}

function loadAcademic() {
  try {
    const saved = JSON.parse(getStorage()?.getItem(AK))
    if (!saved) return DEFAULT_ACADEMIC
    return {
      ...DEFAULT_ACADEMIC,
      ...saved,
      localities: Array.isArray(saved.localities) ? [...new Set([...DEFAULT_ACADEMIC.localities, ...saved.localities])] : DEFAULT_ACADEMIC.localities,
      classes: Array.isArray(saved.classes) ? mergeClasses(saved.classes) : DEFAULT_ACADEMIC.classes,
    }
  }
  catch { return DEFAULT_ACADEMIC }
}
function saveAcademic(d) {
  const storage = getStorage()
  try { storage?.setItem(AK, JSON.stringify(d)) } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'))
  }
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

const GCard = ({ children, style={} }) => (
 <div className="super-module-card" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:22, padding:24, ...style }}>{children}</div>
)
const Lbl = ({ children }) => (
 <label style={{ color:C.muted, fontSize:12, fontWeight:700, display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:'0.06em' }}>{children}</label>
)
const Inp = ({ style={}, ...p }) => (
 <input {...p} style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:14, outline:'none', boxSizing:'border-box', ...style }} />
)
const Btn = ({ children, onClick, variant='gold', style:s={} }) => {
 const v = {
 gold: { background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none' },
 ghost: { background:'rgba(15,23,42,0.46)', color:C.silver, border:`1px solid ${C.border}` },
 red: { background:'rgba(255,55,95,0.15)', color:C.red, border:'1px solid rgba(255,55,95,0.3)' },
 blue: { background:'rgba(10,132,255,0.15)', color:C.blue, border:'1px solid rgba(10,132,255,0.3)' },
 green: { background:'rgba(48,209,88,0.15)', color:C.green, border:'1px solid rgba(48,209,88,0.3)' },
 purple:{ background:'rgba(191,90,242,0.15)', color:C.purple, border:'1px solid rgba(191,90,242,0.3)' },
 }
 return <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:10, fontWeight: 600, fontSize:13, cursor:'pointer', ...v[variant], ...s }}>{children}</button>
}
const SHead = ({ icon, title, sub, color=C.gold }) => (
 <div className="super-module-card" style={{ marginBottom:20, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10 }}>
 <span style={{ fontSize:22 }}>{icon}</span>
 <h3 style={{ margin:0, color, fontSize:16, fontWeight:800 }}>{title}</h3>
 </div>
 {sub && <p style={{ margin:'6px 0 0 32px', color:C.muted, fontSize:13 }}>{sub}</p>}
 </div>
)

const SECTION_PRESETS = [
 { label:'A / B / C', sections:['A','B','C'] },
 { label:'Blue / Red / Green', sections:['Blue','Red','Green'] },
 { label:'1 / 2 / 3', sections:['1','2','3'] },
 { label:'Rose / Jasmine', sections:['Rose','Jasmine'] },
]

//  Tab 1: Classes & Sections 
function ClassesTab({ data, setData }) {
  const [sectionInput, setSectionInput] = useState({})
  const [editingName, setEditingName] = useState({})
  const [tempName, setTempName] = useState({})
  const [newClassName, setNewClassName] = useState('')
  const [newClassSection, setNewClassSection] = useState('Blue')
  const [addingClass, setAddingClass] = useState(false)

  function toggleClass(level) {
    setData(d => ({ ...d, classes: d.classes.map(c => c.level === level ? { ...c, active: !c.active } : c) }))
  }

  function addSection(level, val) {
    if (!val.trim()) return
    setData(d => ({ ...d, classes: d.classes.map(c => c.level === level && !c.sections.includes(val.trim()) ? { ...c, sections: [...c.sections, val.trim()] } : c) }))
    setSectionInput(s => ({ ...s, [level]: '' }))
  }

  function removeSection(level, sec) {
    setData(d => ({ ...d, classes: d.classes.map(c => c.level === level ? { ...c, sections: c.sections.filter(s => s !== sec) } : c) }))
  }

  function applyPreset(level, sections) {
    setData(d => ({ ...d, classes: d.classes.map(c => c.level === level ? { ...c, sections } : c) }))
  }

  function saveClassName(level, newName) {
    const trimmed = (newName || '').trim()
    if (!trimmed) {
      setEditingName(e => ({ ...e, [level]: false }))
      return
    }
    const duplicate = data.classes.some(c => c.level !== level && c.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      alert(`Another class already has the name "${trimmed}".`)
      return
    }
    setData(d => ({
      ...d,
      classes: d.classes.map(c => c.level === level ? { ...c, name: trimmed } : c),
    }))
    setEditingName(e => ({ ...e, [level]: false }))
  }

  function addClass() {
    const trimmed = newClassName.trim()
    if (!trimmed) return
    const duplicate = data.classes.some(c => c.name.toLowerCase() === trimmed.toLowerCase())
    if (duplicate) {
      alert(`Class "${trimmed}" already exists.`)
      return
    }
    const safeLevel = slugifyLevel(trimmed)
    const finalLevel = data.classes.some(c => c.level === safeLevel) ? `${safeLevel}_${Date.now()}` : safeLevel
    const initialSec = newClassSection.trim() || 'Blue'
    const newCls = {
      level: finalLevel,
      name: trimmed,
      active: true,
      sections: [initialSec],
    }
    setData(d => ({
      ...d,
      classes: [...d.classes, newCls],
    }))
    setNewClassName('')
    setNewClassSection('Blue')
    setAddingClass(false)
  }

  function deleteClass(level, name) {
    const label = name || level
    if (!window.confirm(`Are you sure you want to remove "${label}"? This will delete the class from the setup.`)) return
    setData(d => ({
      ...d,
      classes: d.classes.filter(c => c.level !== level),
    }))
  }

  return (
    <div>
      <GCard style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Building2 size={22} color={C.gold} />
              <h3 style={{ margin: 0, color: C.gold, fontSize: 17, fontWeight: 800 }}>Classes & Sections</h3>
            </div>
            <p style={{ margin: '6px 0 0 32px', color: C.muted, fontSize: 13 }}>
              Customize class names, add new classes, remove classes, and manage sections. Changes apply school-wide.
            </p>
          </div>
          <Btn variant="gold" onClick={() => setAddingClass(a => !a)}>
            <Plus size={16} /> Add Class
          </Btn>
        </div>

        {/* Add new class panel */}
        {addingClass && (
          <div style={{ marginBottom: 20, padding: 18, background: 'rgba(200,153,26,0.08)', border: `1px solid rgba(200,153,26,0.32)`, borderRadius: 14 }}>
            <div style={{ fontWeight: 800, color: C.gold, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={16} /> Add New Class
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 220px' }}>
                <Lbl>Class Name</Lbl>
                <Inp
                  autoFocus
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addClass()}
                  placeholder="e.g. Class 9, Pre Nine, Nursery, Hifaz..."
                  maxLength={30}
                />
              </div>
              <div style={{ width: 150 }}>
                <Lbl>Initial Section</Lbl>
                <Inp
                  value={newClassSection}
                  onChange={e => setNewClassSection(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addClass()}
                  placeholder="e.g. Blue, A"
                  maxLength={15}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="gold" onClick={addClass}>Save Class</Btn>
                <Btn variant="ghost" onClick={() => { setAddingClass(false); setNewClassName(''); setNewClassSection('Blue'); }}>Cancel</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Grid of classes */}
        <div className="super-module-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 14 }}>
          {data.classes.map(cls => (
            <div key={cls.level} style={{ background: 'rgba(7,30,52,0.5)', borderRadius: 14, padding: 16, border: `1px solid ${cls.active ? C.border : 'rgba(255,55,95,0.2)'}`, opacity: cls.active ? 1 : 0.7 }}>
              <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                {/* Editable class name */}
                {editingName[cls.level] ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
                    <input
                      autoFocus
                      value={tempName[cls.level] ?? cls.name}
                      onChange={e => setTempName(t => ({ ...t, [cls.level]: e.target.value }))}
                      onBlur={() => saveClassName(cls.level, tempName[cls.level] ?? cls.name)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveClassName(cls.level, tempName[cls.level] ?? cls.name)
                        if (e.key === 'Escape') setEditingName(x => ({ ...x, [cls.level]: false }))
                      }}
                      style={{
                        background: 'rgba(11,44,77,0.95)',
                        border: `1.5px solid ${C.gold}`,
                        borderRadius: 8,
                        color: '#fff',
                        padding: '4px 8px',
                        fontSize: 14,
                        fontWeight: 800,
                        outline: 'none',
                        width: '100%',
                        maxWidth: 160,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => saveClassName(cls.level, tempName[cls.level] ?? cls.name)}
                      title="Save name"
                      style={{ background: 'rgba(48,209,88,0.2)', border: '1px solid rgba(48,209,88,0.4)', borderRadius: 6, color: C.green, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(x => ({ ...x, [cls.level]: false }))}
                      title="Cancel"
                      style={{ background: 'rgba(255,55,95,0.15)', border: '1px solid rgba(255,55,95,0.3)', borderRadius: 6, color: C.red, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>
                      {cls.name || `Class ${cls.level}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(t => ({ ...t, [cls.level]: cls.name }))
                        setEditingName(e => ({ ...e, [cls.level]: true }))
                      }}
                      title="Click to rename class"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        borderRadius: 6,
                        color: C.muted,
                        padding: '3px 5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                )}

                {/* Right controls: Active toggle & Delete class */}
                <div className="super-module-card" style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => toggleClass(cls.level)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 11,
                      background: cls.active ? 'rgba(48,209,88,0.15)' : 'rgba(255,55,95,0.15)',
                      color: cls.active ? C.green : C.red,
                    }}
                  >
                    {cls.active ? '● Active' : '○ Off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteClass(cls.level, cls.name)}
                    title={`Delete ${cls.name}`}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 7,
                      border: '1px solid rgba(255,55,95,0.25)',
                      background: 'rgba(255,55,95,0.12)',
                      color: C.red,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Sections */}
              <div className="super-module-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {cls.sections.map(sec => (
                  <span key={sec} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: 'rgba(200,153,26,0.12)', border: `1px solid rgba(200,153,26,0.25)`, color: C.gold, fontSize: 12, fontWeight: 600 }}>
                    {sec}
                    <button onClick={() => removeSection(cls.level, sec)} style={{ background: 'none', border: 'none', color: C.gold, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0, opacity: 0.6 }}>×</button>
                  </span>
                ))}
              </div>

              {/* Add section input */}
              <div className="super-module-card" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  value={sectionInput[cls.level] || ''}
                  onChange={e => setSectionInput(s => ({ ...s, [cls.level]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addSection(cls.level, sectionInput[cls.level] || '')}
                  placeholder="Add section..."
                  maxLength={10}
                  style={{ flex: 1, background: 'rgba(11,44,77,0.6)', border: `1px solid ${C.border}`, borderRadius: 8, color: C.silver, padding: '6px 10px', fontSize: 12, outline: 'none' }}
                />
                <button
                  onClick={() => addSection(cls.level, sectionInput[cls.level] || '')}
                  style={{ background: C.gold, border: 'none', borderRadius: 8, padding: '6px 12px', color: '#071e34', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                >
                  +
                </button>
              </div>

              {/* Presets */}
              <div className="super-module-card" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {SECTION_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(cls.level, p.sections)}
                    style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </GCard>
    </div>
  )
}

//  Tab 2: Subjects 
function SubjectsTab({ data, setData }) {
 const [adding, setAdding] = useState(false)
 const [newSubj, setNewSubj] = useState({ name:'', nameUrdu:'', compulsory:true, classes:[] })

 function toggleSubjClass(id, level) {
 setData(d => ({
 ...d,
 subjects: d.subjects.map(s => s.id === id
 ? { ...s, classes: s.classes.includes(level) ? s.classes.filter(c => c !== level) : [...s.classes, level].sort((a,b) => Number(a)-Number(b)) }
 : s)
 }))
 }
 function deleteSubject(id) {
 setData(d => ({ ...d, subjects: d.subjects.filter(s => s.id !== id) }))
 }
 function addSubject() {
 if (!newSubj.name.trim()) return
 const subj = { ...newSubj, id:`sb${Date.now()}` }
 setData(d => ({ ...d, subjects: [...d.subjects, subj] }))
 setNewSubj({ name:'', nameUrdu:'', compulsory:true, classes:[] })
 setAdding(false)
 }
 function toggleNewClass(level) {
 setNewSubj(s => ({ ...s, classes: s.classes.includes(level) ? s.classes.filter(c => c !== level) : [...s.classes, level] }))
 }

 const LEVELS = ['1','2','3','4','5','6','7','8','9','10']

 return (
 <div>
 <GCard>
 <SHead icon="" title="Subjects" sub="Manage all subjects and assign them to classes." />

 {/* Add subject form */}
 {adding ? (
 <div className="super-module-card" style={{ background:'rgba(200,153,26,0.06)', border:`1px solid ${C.border}`, borderRadius:14, padding:18, marginBottom:18 }}>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:700, fontSize:14, marginBottom:14 }}>New Subject</div>
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
 <div>
 <Lbl>Subject Name (English)</Lbl>
 <Inp value={newSubj.name} onChange={e => setNewSubj(s => ({ ...s, name:e.target.value }))} placeholder="e.g. Physics" />
 </div>
 <div>
 <Lbl>Subject Name (Urdu)</Lbl>
 <Inp value={newSubj.nameUrdu} onChange={e => setNewSubj(s => ({ ...s, nameUrdu:e.target.value }))} placeholder="طبیعیات" dir="rtl" style={{ fontFamily:'Noto Nastaliq Urdu, serif' }} />
 </div>
 </div>
 <div className="super-module-card" style={{ marginBottom:12 }}>
 <Lbl>Assign to Classes</Lbl>
 <div className="super-module-card" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
 {LEVELS.map(l => (
 <button key={l} onClick={() => toggleNewClass(l)}
 style={{ padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700, fontSize:12,
 background: newSubj.classes.includes(l) ? C.gold : 'rgba(11,44,77,0.92)',
 color: newSubj.classes.includes(l) ? '#071e34' : C.muted }}>
 {l}
 </button>
 ))}
 <button onClick={() => setNewSubj(s => ({ ...s, classes: LEVELS }))} style={{ padding:'5px 12px', borderRadius:20, border:`1px dashed ${C.border}`, background:'transparent', color:C.muted, cursor:'pointer', fontSize:12 }}>All</button>
 </div>
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:8, alignItems:'center' }}>
 <label style={{ display:'flex', gap:8, alignItems:'center', cursor:'pointer', color:C.silver, fontSize:13 }}>
 <input type="checkbox" checked={newSubj.compulsory} onChange={e => setNewSubj(s => ({ ...s, compulsory:e.target.checked }))} />
 Compulsory subject
 </label>
 <div className="super-module-card" style={{ marginLeft:'auto', display:'flex', gap:8 }}>
 <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
 <Btn variant="gold" onClick={addSubject}>+ Add Subject</Btn>
 </div>
 </div>
 </div>
 ) : (
 <Btn variant="gold" onClick={() => setAdding(true)} style={{ marginBottom:18 }}>+ Add Subject</Btn>
 )}

 {/* Subject list */}
 <div className="super-module-card" style={{ display:'flex', flexDirection:'column', gap:10 }}>
 {data.subjects.map(subj => (
 <div key={subj.id} style={{ background:'rgba(7,30,52,0.4)', borderRadius:12, padding:'14px 16px', border:`1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
 <div className="super-module-card" style={{ flex:1 }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
 <span style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{subj.name}</span>
 {subj.nameUrdu && <span style={{ color:C.muted, fontSize:13, direction:'rtl', fontFamily:'Noto Nastaliq Urdu, serif' }}>{subj.nameUrdu}</span>}
 <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700,
 background: subj.compulsory ? 'rgba(255,55,95,0.12)' : 'rgba(10,132,255,0.12)',
 color: subj.compulsory ? C.red : C.blue,
 border: `1px solid ${subj.compulsory ? 'rgba(255,55,95,0.3)' : 'rgba(10,132,255,0.3)'}` }}>
 {subj.compulsory ? 'Compulsory' : 'Optional'}
 </span>
 </div>
 {/* Class pills - clickable to toggle */}
 <div className="super-module-card" style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
 {LEVELS.map(l => (
 <button key={l} onClick={() => toggleSubjClass(subj.id, l)}
 style={{ padding:'2px 9px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:700,
 background: subj.classes.includes(l) ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.04)',
 color: subj.classes.includes(l) ? C.gold : 'rgba(192,200,216,0.3)' }}>
 {l}
 </button>
 ))}
 </div>
 </div>
 <button onClick={() => deleteSubject(subj.id)} style={{ background:'rgba(255,55,95,0.1)', border:'1px solid rgba(255,55,95,0.2)', borderRadius:8, padding:'6px 10px', color:C.red, cursor:'pointer', fontSize:12, flexShrink:0 }}></button>
 </div>
 </div>
 ))}
 </div>
 </GCard>
 </div>
 )
}

//  Tab 3: Academic Calendar 
function CalendarTab({ data, setData }) {
 const [newHol, setNewHol] = useState({ name:'', date:'' })

 function addHoliday() {
 if (!newHol.name.trim() || !newHol.date) return
 setData(d => ({ ...d, holidays: [...d.holidays, { id:`h${Date.now()}`, ...newHol }].sort((a,b) => a.date.localeCompare(b.date)) }))
 setNewHol({ name:'', date:'' })
 }
 function removeHoliday(id) {
 setData(d => ({ ...d, holidays: d.holidays.filter(h => h.id !== id) }))
 }

 const daysBetween = (a, b) => {
 if (!a || !b) return 0
 return Math.round((new Date(b) - new Date(a)) / 86400000)
 }

 return (
 <div className="super-module-card" style={{ display:'grid', gap:20 }}>
 <GCard>
 <SHead icon="" title="Academic Session" sub="Define the current session dates and teaching schedule." />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
 <div>
 <Lbl>Session Start Date</Lbl>
 <Inp type="date" value={data.sessionStart} onChange={e => setData(d => ({ ...d, sessionStart:e.target.value }))} />
 </div>
 <div>
 <Lbl>Session End Date</Lbl>
 <Inp type="date" value={data.sessionEnd} onChange={e => setData(d => ({ ...d, sessionEnd:e.target.value }))} />
 </div>
 </div>
 {data.sessionStart && data.sessionEnd && (
 <div className="super-module-card" style={{ background:'rgba(200,153,26,0.08)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:13, color:C.silver }}>
  Session Duration: <strong style={{ color:C.gold }}>{daysBetween(data.sessionStart, data.sessionEnd)} days</strong> · Approx <strong style={{ color:C.gold }}>{Math.round(daysBetween(data.sessionStart, data.sessionEnd) / 30)} months</strong>
 </div>
 )}
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
 <div>
 <Lbl>Periods per Day</Lbl>
 <select value={data.periodsPerDay} onChange={e => setData(d => ({ ...d, periodsPerDay:Number(e.target.value) }))}
 style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:14, outline:'none' }}>
 {[5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} periods</option>)}
 </select>
 </div>
 <div>
 <Lbl>Period Duration</Lbl>
 <select value={data.periodDuration} onChange={e => setData(d => ({ ...d, periodDuration:Number(e.target.value) }))}
 style={{ width:'100%', background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:14, outline:'none' }}>
 {[30,35,40,45,50,55,60].map(n => <option key={n} value={n}>{n} minutes</option>)}
 </select>
 </div>
 </div>
 <div className="super-module-card" style={{ marginTop:16, padding:'12px 16px', borderRadius:10, background:'rgba(10,132,255,0.06)', border:`1px solid rgba(10,132,255,0.15)`, fontSize:13, color:C.silver }}>
  Total teaching time per day: <strong style={{ color:C.blue }}>{data.periodsPerDay * data.periodDuration} minutes ({Math.round(data.periodsPerDay * data.periodDuration / 60 * 10) / 10} hours)</strong>
 </div>
 </GCard>

 <GCard>
 <SHead icon="" title="Holidays & School Closures" sub="Track all public holidays and school closure days." />
 {/* Add holiday */}
 <div className="super-module-card" style={{ display:'flex', gap:10, marginBottom:18, flexWrap:'wrap' }}>
 <Inp value={newHol.name} onChange={e => setNewHol(h => ({ ...h, name:e.target.value }))} placeholder="Holiday / Event name" style={{ flex:1, minWidth:200 }} />
 <Inp type="date" value={newHol.date} onChange={e => setNewHol(h => ({ ...h, date:e.target.value }))} style={{ width:160 }} />
 <Btn variant="gold" onClick={addHoliday}>+ Add</Btn>
 </div>

 {/* Holiday list */}
 {data.holidays.length === 0 ? (
 <div className="super-module-card" style={{ textAlign:'center', padding:32, color:C.muted, fontSize:13 }}>No holidays added yet.</div>
 ) : (
 <div className="super-module-card" style={{ display:'flex', flexDirection:'column', gap:8 }}>
 {data.holidays.map(h => {
 const d = new Date(h.date)
 const dayName = d.toLocaleDateString('en-GB', { weekday:'long' })
 const formatted = d.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })
 return (
 <div key={h.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'rgba(7,30,52,0.4)', borderRadius:10, border:`1px solid ${C.border}` }}>
 <div className="super-module-card" style={{ width:44, height:44, borderRadius:10, background:'rgba(200,153,26,0.12)', border:`1px solid rgba(200,153,26,0.25)`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:800, fontSize:16, lineHeight:1 }}>{d.getDate()}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:9, textTransform:'uppercase' }}>{d.toLocaleDateString('en-GB', { month:'short' })}</div>
 </div>
 <div className="super-module-card" style={{ flex:1 }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{h.name}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{dayName} · {formatted}</div>
 </div>
 <button onClick={() => removeHoliday(h.id)} style={{ background:'rgba(255,55,95,0.1)', border:'1px solid rgba(255,55,95,0.2)', borderRadius:8, padding:'5px 9px', color:C.red, cursor:'pointer', fontSize:12 }}></button>
 </div>
 )
 })}
 </div>
 )}
 <div className="super-module-card" style={{ marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(48,209,88,0.06)', border:'1px solid rgba(48,209,88,0.15)', fontSize:12, color:C.muted }}>
  Total Holidays: <strong style={{ color:C.green }}>{data.holidays.length}</strong>
 </div>
 </GCard>
 </div>
 )
}

//  Main Component 

const TABS = [
 { id:'classes', label:' Classes & Sections' },
 { id:'subjects', label:' Subjects' },
 { id:'calendar', label:' Academic Calendar' },
]

export default function AcademicSetupModule() {
 const [activeTab, setActiveTab] = useState('classes')
 const [data, setData] = useState(loadAcademic)

 // Persist academic data whenever it changes
 function updateData(updater) {
 setData(prev => {
 const next = typeof updater === 'function' ? updater(prev) : updater
 saveAcademic(next)
 return next
 })
 }

 return (
 <div className="super-module-card" style={{ minHeight:'100vh', background:'#071e34', color:C.silver, fontFamily:'Inter, sans-serif' }}>
 <div className="super-module-card" style={{ padding:'24px 24px' }}>

 {/* Header */}
 <GCard style={{ marginBottom:24, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
 <div className="super-module-card" style={{ width:52, height:52, borderRadius:22, background:'rgba(255,159,10,0.15)', border:'1px solid rgba(255,159,10,0.35)', display:'grid', placeItems:'center', color:C.gold }}>
 <GraduationCap size={26} />
 </div>
 <div className="super-module-card" style={{ flex:1 }}>
 <h1 style={{ margin:0, fontSize:26, color:'#fff', fontFamily:"'Playfair Display',serif", fontWeight:800 }}>Academic Setup</h1>
 <p style={{ margin:'4px 0 0', color:C.muted, fontSize:13 }}>Classes & sections · Subjects · Academic calendar</p>
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
 {TABS.map(t => (
 <button key={t.id} onClick={() => setActiveTab(t.id)}
 style={{ background: activeTab === t.id ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(15,23,42,0.46)', color: activeTab === t.id ? '#071e34' : C.silver, fontWeight: 600, fontSize:13, padding:'9px 18px', borderRadius:14, border: activeTab === t.id ? 'none' : `1px solid ${C.border}`, cursor:'pointer', whiteSpace:'nowrap' }}>
 {t.label}
 </button>
 ))}
 </div>
 </GCard>

 {activeTab === 'classes' && <ClassesTab data={data} setData={updateData} />}
 {activeTab === 'subjects' && <SubjectsTab data={data} setData={updateData} />}
 {activeTab === 'calendar' && <CalendarTab data={data} setData={updateData} />}

 </div>
 </div>
 )
}
