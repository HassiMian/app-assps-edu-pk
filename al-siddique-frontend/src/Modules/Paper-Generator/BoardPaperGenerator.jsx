import React, { useState, useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Printer, Edit3, Check, ArrowLeft, Trash2, Plus } from 'lucide-react'

// Colors to match the SaaS theme
const C = {
  bg: '#071e34', card: 'rgba(15,23,42,0.58)',
  gold: '#C8991A', goldL: '#e8b420',
  silver: '#C0C8D8', muted: '#8892A4',
  border: 'rgba(148,163,184,0.18)',
}

// Inline input for editing text inline
const InlineInput = ({ value, onChange, placeholder = '', style = {}, multiline = false }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [val, setVal] = useState(value)

  if (isEditing) {
    const commonStyle = {
      width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff',
      border: `1px solid ${C.gold}`, borderRadius: 4, padding: '4px 8px', outline: 'none',
      fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', ...style
    }
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
        {multiline ? (
          <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} style={{ ...commonStyle, minHeight: 60 }} />
        ) : (
          <input autoFocus value={val} onChange={e => setVal(e.target.value)} style={commonStyle} />
        )}
        <button onClick={() => { onChange(val); setIsEditing(false) }} style={{ background: C.gold, color: '#000', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}><Check size={14} /></button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <span style={{ flex: 1, whiteSpace: 'pre-wrap', minHeight: 20, ...style }}>{value || placeholder}</span>
      <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex' }}><Edit3 size={12} /></button>
    </div>
  )
}

export default function BoardPaperGenerator({ loadedPaper, onReturnToSource }) {
  const [paper, setPaper] = useState(() => {
    // Initialize state from loadedPaper if it exists
    if (loadedPaper && loadedPaper.sections) return loadedPaper
    // Or start with a blank board pattern
    return {
      subject: 'Subject Name',
      classLevel: '10',
      totalMarks: 75,
      timeAllowed: '2:30 Hours',
      paperTitle: 'Annual Examination',
      sections: []
    }
  })

  const printRef = useRef()
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Board Paper - ${paper.subject || 'Paper'}`,
  })

  // Deep update helper
  const updateSection = (sIdx, fields) => {
    const next = [...paper.sections]
    next[sIdx] = { ...next[sIdx], ...fields }
    setPaper({ ...paper, sections: next })
  }

  const updateMainQ = (sIdx, qIdx, fields) => {
    const next = [...paper.sections]
    const mq = [...next[sIdx].mainQuestions]
    mq[qIdx] = { ...mq[qIdx], ...fields }
    next[sIdx] = { ...next[sIdx], mainQuestions: mq }
    setPaper({ ...paper, sections: next })
  }

  const updatePart = (sIdx, qIdx, pIdx, fields) => {
    const next = [...paper.sections]
    const mq = [...next[sIdx].mainQuestions]
    const parts = [...mq[qIdx].parts]
    parts[pIdx] = { ...parts[pIdx], ...fields }
    mq[qIdx] = { ...mq[qIdx], parts }
    next[sIdx] = { ...next[sIdx], mainQuestions: mq }
    setPaper({ ...paper, sections: next })
  }

  const addMainQuestion = (sIdx) => {
    const next = [...paper.sections]
    const mq = next[sIdx].mainQuestions || []
    next[sIdx].mainQuestions = [...mq, { qNumber: `${mq.length + 1}`, text: 'New Question', marks: 10, parts: [] }]
    setPaper({ ...paper, sections: next })
  }

  const addPart = (sIdx, qIdx) => {
    const next = [...paper.sections]
    const mq = [...next[sIdx].mainQuestions]
    const parts = mq[qIdx].parts || []
    parts.push({ partId: `${parts.length + 1}`, text: 'New part', marks: 2 })
    mq[qIdx].parts = parts
    next[sIdx].mainQuestions = mq
    setPaper({ ...paper, sections: next })
  }

  return (
    <div style={{ color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Editor Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '16px 20px', background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onReturnToSource && (
             <button onClick={onReturnToSource} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', display: 'flex' }}>
               <ArrowLeft size={18} />
             </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: C.gold, fontWeight: 700 }}>Board Pattern Editor</h2>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Edit sections and questions, then print the final format.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 6, background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`, color: '#000', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            <Printer size={16} /> Print Board Paper
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* Editor Sidebar */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.silver, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>Paper Metadata</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Subject</div>
              <InlineInput value={paper.subject} onChange={v => setPaper({ ...paper, subject: v })} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Class</div>
              <InlineInput value={paper.classLevel} onChange={v => setPaper({ ...paper, classLevel: v })} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Total Marks</div>
              <InlineInput value={paper.totalMarks} onChange={v => setPaper({ ...paper, totalMarks: v })} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Time Allowed</div>
              <InlineInput value={paper.timeAllowed} onChange={v => setPaper({ ...paper, timeAllowed: v })} />
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 700, color: C.silver, marginBottom: 16, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>Sections & Questions</div>
          {paper.sections?.map((sec, sIdx) => (
            <div key={sIdx} style={{ marginBottom: 24, padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>Section {sIdx + 1}</span>
                <button onClick={() => {
                  const next = [...paper.sections]; next.splice(sIdx, 1); setPaper({...paper, sections: next})
                }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><Trash2 size={12} /></button>
              </div>
              
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: C.muted }}>Title</div>
                <InlineInput value={sec.title} onChange={v => updateSection(sIdx, { title: v })} style={{ fontWeight: 600 }} />
              </div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: C.muted }}>Instructions</div>
                <InlineInput value={sec.instructions} onChange={v => updateSection(sIdx, { instructions: v })} multiline />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: C.muted }}>Marks</div>
                <InlineInput value={sec.marks} onChange={v => updateSection(sIdx, { marks: v })} />
              </div>

              {/* Main Questions */}
              <div style={{ paddingLeft: 12, borderLeft: `2px solid rgba(255,255,255,0.05)` }}>
                {sec.mainQuestions?.map((mq, qIdx) => (
                  <div key={qIdx} style={{ marginBottom: 16, padding: 10, background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
                     <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                       <span style={{ color: C.silver, fontSize: 11, fontWeight: 600 }}>Q No:</span>
                       <InlineInput value={mq.qNumber} onChange={v => updateMainQ(sIdx, qIdx, { qNumber: v })} style={{ fontSize: 11, width: 40 }} />
                       <span style={{ marginLeft: 'auto', color: C.silver, fontSize: 11, fontWeight: 600 }}>Marks:</span>
                       <InlineInput value={mq.marks} onChange={v => updateMainQ(sIdx, qIdx, { marks: v })} style={{ fontSize: 11, width: 40 }} />
                     </div>
                     <div style={{ marginBottom: 8 }}>
                       <InlineInput value={mq.text} onChange={v => updateMainQ(sIdx, qIdx, { text: v })} multiline style={{ fontSize: 12 }} />
                     </div>

                     {/* Parts */}
                     {mq.parts?.length > 0 && (
                       <div style={{ display: 'grid', gap: 8, paddingLeft: 10, marginBottom: 8 }}>
                         {mq.parts.map((p, pIdx) => (
                           <div key={pIdx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                              <InlineInput value={p.partId} onChange={v => updatePart(sIdx, qIdx, pIdx, { partId: v })} style={{ fontSize: 11, width: 30, color: C.gold }} />
                              <div style={{ flex: 1 }}>
                                <InlineInput value={p.text} onChange={v => updatePart(sIdx, qIdx, pIdx, { text: v })} multiline style={{ fontSize: 12 }} />
                              </div>
                              <button onClick={() => {
                                const next = [...paper.sections]; const nMq = [...next[sIdx].mainQuestions]; const nParts = [...nMq[qIdx].parts]
                                nParts.splice(pIdx, 1); nMq[qIdx].parts = nParts; next[sIdx].mainQuestions = nMq; setPaper({...paper, sections: next})
                              }} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 2, opacity: 0.6 }}><Trash2 size={10} /></button>
                           </div>
                         ))}
                       </div>
                     )}
                     <button onClick={() => addPart(sIdx, qIdx)} style={{ background: 'rgba(255,255,255,0.05)', color: C.silver, border: 'none', padding: '4px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                       <Plus size={10} /> Add Part
                     </button>
                  </div>
                ))}
                <button onClick={() => addMainQuestion(sIdx)} style={{ background: `rgba(200,153,26,0.15)`, color: C.gold, border: `1px solid rgba(200,153,26,0.3)`, padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                   <Plus size={12} /> Add Main Question
                </button>
              </div>
            </div>
          ))}
          
          <button onClick={() => setPaper({ ...paper, sections: [...(paper.sections||[]), { title: 'New Section', mainQuestions: [] }] })} 
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: `1px dashed ${C.border}`, padding: '12px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            + Add Section
          </button>
        </div>

        {/* Live Print Preview Canvas */}
        <div style={{ background: '#e0e0e0', padding: 30, borderRadius: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', display: 'flex', justifyContent: 'center' }}>
          
          <div ref={printRef} style={{ background: '#fff', width: '210mm', minHeight: '297mm', padding: '15mm', color: '#000', fontFamily: '"Times New Roman", Times, serif', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
            
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 10 }}>
              <h1 style={{ margin: '0 0 5px 0', fontSize: 22, textTransform: 'uppercase' }}>{paper.paperTitle || 'Examination'}</h1>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 'bold' }}>
                <div>Class: {paper.classLevel}</div>
                <div>Subject: {paper.subject}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 4 }}>
                <div>Time Allowed: {paper.timeAllowed}</div>
                <div>Total Marks: {paper.totalMarks}</div>
              </div>
            </div>

            {/* Sections */}
            {paper.sections?.map((sec, sIdx) => (
              <div key={sIdx} style={{ marginBottom: 20 }}>
                {sec.title && (
                  <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, textDecoration: 'underline', marginBottom: 8 }}>
                    {sec.title}
                  </div>
                )}
                {sec.instructions && (
                  <div style={{ fontStyle: 'italic', fontSize: 14, marginBottom: 12 }}>
                    Note: {sec.instructions}
                  </div>
                )}

                {sec.mainQuestions?.map((mq, qIdx) => (
                  <div key={qIdx} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>
                      <div>Q.{mq.qNumber} {mq.text}</div>
                      {mq.marks && <div>({mq.marks})</div>}
                    </div>

                    {mq.parts?.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: mq.parts[0]?.options?.length > 0 ? '1fr' : '1fr 1fr', gap: '8px 20px', paddingLeft: 10 }}>
                        {mq.parts.map((p, pIdx) => (
                          <div key={pIdx} style={{ fontSize: 14, display: 'flex', gap: 6, breakInside: 'avoid' }}>
                            <span style={{ fontWeight: 'bold' }}>({p.partId})</span>
                            <div style={{ flex: 1 }}>
                              <div>{p.text}</div>
                              {p.options?.length > 0 && (
                                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                  {p.options.map((opt, oIdx) => (
                                    <div key={oIdx}>({opt.label || String.fromCharCode(65+oIdx)}) {opt.text}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            {p.marks && p.marks !== mq.marks && (
                              <div style={{ whiteSpace: 'nowrap' }}>[{p.marks}]</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            
          </div>
        </div>

      </div>
    </div>
  )
}
