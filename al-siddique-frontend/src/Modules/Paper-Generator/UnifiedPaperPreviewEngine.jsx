// PaperPreviewEngine.jsx — Al Siddique Smart School OS
// 3 Templates + Print Options + Bubble Sheet + Save + Half/Double Print

import { useState, useRef } from 'react'
import Portal from '../../components/Portal'
import { usePaperStore } from './usePaperStore'

const C = {
 card: 'rgba(11,44,77,0.92)', gold: '#C8991A', goldL: '#e8b420',
 silver: '#C0C8D8', muted: '#8892A4', green: '#30D158',
 border: 'rgba(148,163,184,0.18)', blue: '#0A84FF',
}

const URDU_FONT = "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif"
const FONT_FAMILIES = {
 classic: "'Times New Roman', Times, serif",
 modern: "'Segoe UI', Arial, sans-serif",
 elite: "'Georgia', 'Times New Roman', serif",
 formal: "'Cambria', 'Times New Roman', serif",
 clean: "'Calibri', 'Segoe UI', Arial, sans-serif",
 exam: "'Book Antiqua', Georgia, serif",
}

function classLevelNumber(value) {
 const num = Number(String(value || '').replace(/[^\d]/g, ''))
 return Number.isFinite(num) ? num : 0
}

function resolveUnifiedDefaults(classLevel) {
 const senior = classLevelNumber(classLevel) >= 9
 return {
   template: senior ? 'elite' : 'classic',
   blankLines: senior ? 0 : 2,
   longLines: senior ? 0 : 7,
   showShortAnswerLines: !senior,
   showLongAnswerLines: !senior,
 }
}

function resolveBodyFont(language, printOpts, fallbackKey) {
 if (language === 'urdu') return URDU_FONT
 const selected = FONT_FAMILIES[printOpts.fontFamily] || printOpts.fontFamily
 return selected || FONT_FAMILIES[fallbackKey] || FONT_FAMILIES.classic
}

const BASE_PRINT = `
@media print {
 .ppe-toolbar, .ppe-edit-banner, .ppe-save-bar, .no-print { display: none !important; }
 body { background: white !important; margin: 0; padding: 0; }
 .ppe-bg { padding: 0 !important; background: white !important; border-radius: 0 !important; box-shadow: none !important; }
 .ppe-paper { box-shadow: none !important; margin: 0 !important; }
 [contenteditable] { outline: none !important; border: none !important; background: transparent !important; }
}
@media print and (-webkit-min-device-pixel-ratio:0) {
 .print-half-wrap { display: grid; grid-template-columns: 1fr 1fr; width: 100%; gap: 0; }
 .print-half-wrap .ppe-paper { zoom: 0.5; }
}
@page { size: A4 portrait; margin: 4mm 4mm; }
`

function fmtDate(str) {
 if (!str) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
 try { return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }
 catch { return str }
}

function calcTotals(mcq, short, lng) {
 const m = mcq.reduce((s,q) => s + (Number(q.marks)||1), 0)
 const s = short.reduce((t,q) => t + (Number(q.marks)||2), 0)
 const l = lng.reduce((t,q) => t + (Number(q.marks)||5), 0)
 return { mcqTotal: m, shortTotal: s, longTotal: l, grandTotal: m+s+l }
}

function AnsLines({ count=4, color='#bbb', mt=16 }) {
 return <>{Array.from({length:count}).map((_,i) => <div key={i} style={{borderBottom:`1px solid ${color}`,marginTop:mt}} />)}</>
}

function LogoWatermark({ logo, show, opacity = 0.08, scale = 1 }) {
 if (!show || !logo) return null
 return (
 <div style={{
 position: 'absolute',
 left: '50%',
 top: '54%',
 transform: 'translate(-50%, -50%)',
 width: `${38 * scale}%`,
 maxWidth: 300 * scale,
 height: `${38 * scale}%`,
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 pointerEvents: 'none',
 zIndex: 0,
 opacity,
 }}>
 <img src={logo} alt="School watermark" style={{
 width: '100%',
 maxHeight: '100%',
 objectFit: 'contain',
 filter: 'grayscale(1) brightness(1.18)',
 }} />
 </div>
 )
}

function getBodyBorderStyle(style) {
 if (style === 'none') return { border: 'none' }
 if (style === 'thin') return { border: '1.5px solid #111' }
 if (style === 'word-blue') return { border: '2px solid #1f4e79', boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 6px rgba(31,78,121,0.35)' }
 if (style === 'word-gold') return { border: '2px solid #b38600', boxShadow: 'inset 0 0 0 4px #fff, inset 0 0 0 6px rgba(179,134,0,0.35)' }
 if (style === 'word-frame') return { border: '1.5px solid #111', outline: '3px double #111', outlineOffset: 3 }
 return { border: '3px double #111' }
}

//  Editable span 
function E({ children, style={}, block=false, edit }) {
 const Tag = block ? 'div' : 'span'
 if (!edit) return <Tag style={style}>{children}</Tag>
 return <Tag contentEditable suppressContentEditableWarning style={{ outline:'1.5px dashed #C8991A', borderRadius:2, minWidth:24, display:block?'block':'inline-block', ...style }}>{children}</Tag>
}

//  Bubble Sheet 
function BubbleSheet({ count, perRow = 5 }) {
 if (!count) return null
 return (
 <div style={{ marginBottom: 10 }}>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
 {Array.from({length:count}).map((_,i) => (
 <span key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
 <strong style={{ fontSize: 10 }}>{i+1}-</strong>
 {['A','B','C','D'].map(l => (
 <span key={l} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: '1.5px solid #000', fontSize: 8, fontWeight: 700 }}>{l}</span>
 ))}
 </span>
 ))}
 </div>
 </div>
 )
}

// 
// TEMPLATE 1 — AS CLASSIC
// 
function ClassicTemplate({ config, selectedMCQ, selectedShort, selectedLong, settings, showAnswers, edit, printOpts, selectedChapters=[] }) {
 const { mcqTotal, shortTotal, longTotal, grandTotal } = calcTotals(selectedMCQ, selectedShort, selectedLong)
 const isUrdu = config.language === 'urdu'
 const dir = isUrdu ? 'rtl' : 'ltr'
 const bodyFont = resolveBodyFont(config.language, printOpts, 'classic')
 const examDate = fmtDate(config.examDate)
 const logoSize = Math.round(62 * (printOpts.headerLogoScale || 1))

 const lineH = printOpts.lineHeight || 1.55
 const engFS = printOpts.engFontSize || 13
 const urdFS = printOpts.urdFontSize || 14
 const bold = printOpts.fontBold ? 700 : 400
 const clr = printOpts.fontColor || '#000'
 const bodyBorder = getBodyBorderStyle(printOpts.borderStyle || 'word-blue')

 let qNum = 0
 const nextQ = () => { qNum++; return qNum }

 return (
 <div className="ppe-paper" style={{ position:'relative', background:'#fff', color:clr, fontFamily:bodyFont, fontSize:12, lineHeight:lineH, maxWidth:794, margin:'0 auto', padding:'10px 14px 8px', direction:dir }}>
 <LogoWatermark logo={settings.logo} show={printOpts.showLogoWatermark} opacity={printOpts.watermarkOpacity} scale={printOpts.watermarkScale} />
 {/* School Name */}
 <div style={{ textAlign:'center', marginBottom:6 }}>
 {isUrdu && settings.showUrduHeader !== false ? (
 <>
 <div style={{ fontFamily:URDU_FONT, fontSize:22, fontWeight:700, lineHeight:1.8 }}><E edit={edit}>{settings.schoolUrdu||'الصدیق اسکالرز پبلک اسکول'}</E></div>
 <div style={{ fontFamily:URDU_FONT, fontSize:13 }}><E edit={edit}>شریف چوک، رائے کھاس - فون: 0300-1291959</E></div>
 </>
 ) : (
 <>
 <div style={{ fontSize:20, fontWeight:900, fontFamily:'Arial Black, Arial, sans-serif', textTransform:'uppercase' }}><E edit={edit}>{settings.schoolName||'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}</E></div>
 <div style={{ fontSize:11, color:'#333', fontFamily:'Arial, sans-serif' }}><E edit={edit}>{settings.address||'SHARIF CHOWK, RAYYA KHAS PH: 0300-1291959'}</E></div>
 </>
 )}
 </div>

 {/* Info Table */}
 <table style={{ width:'100%', borderCollapse:'collapse', border:'1.5px solid #111', marginBottom:8, tableLayout:'fixed' }}>
 <tbody>
 <tr>
 <td rowSpan={2} style={{ width:96, border:'1.5px solid #111', textAlign:'center', verticalAlign:'middle', padding:8 }}>
 {settings.logo
 ? <img src={settings.logo} style={{ width:logoSize, height:logoSize, objectFit:'contain', display:'block', margin:'0 auto' }} alt="logo" />
 : <div style={{ width:logoSize, height:logoSize, borderRadius:'50%', border:'2px solid #1a3a6b', display:'flex', alignItems:'center', justifyContent:'center', margin:'auto', fontSize:7, fontWeight:800, color:'#1a3a6b', textAlign:'center', lineHeight:1.2, fontFamily:'Arial,sans-serif' }}>AL<br/>SIDDIQUE</div>
 }
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', width:'24%' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Student Name</div>
 <div style={{ borderBottom:'1px solid #333', marginTop:6, minHeight:14 }} />
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', width:'20%' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Roll Number</div>
 <div style={{ borderBottom:'1px solid #333', marginTop:6, minHeight:14 }} />
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', width:'16%', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Class Name</div>
 <div style={{ fontWeight:800, fontSize:16, lineHeight:1.2 }}><E edit={edit}>{config.classLevel||'—'}</E></div>
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', width:'16%', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Paper Code</div>
 <div style={{ fontWeight:800, fontSize:16, lineHeight:1.2 }}><E edit={edit}>{config.paperCode||'—'}</E></div>
 </td>
 </tr>
 <tr>
 <td style={{ border:'1px solid #111', padding:'3px 8px', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Subject Name</div>
 <div style={{ fontWeight:700, fontFamily:isUrdu?URDU_FONT:'inherit', fontSize:isUrdu?urdFS:engFS }}><E edit={edit}>{config.subject||'—'}</E></div>
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Time Allowed</div>
 <div style={{ fontWeight:700 }}><E edit={edit}>{config.duration} minutes</E></div>
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Total Marks</div>
 <div style={{ fontWeight:700 }}><E edit={edit}>{grandTotal}</E></div>
 </td>
 <td style={{ border:'1px solid #111', padding:'3px 8px', textAlign:'center' }}>
 <div style={{ fontSize:9, color:'#555', fontFamily:'Arial,sans-serif' }}>Exam Date</div>
 <div style={{ fontWeight:700 }}><E edit={edit}>{examDate}</E></div>
 </td>
 </tr>
 {printOpts.showSyllabus && selectedChapters.length > 0 && (
 <tr>
 <td colSpan={5} style={{ border:'1px solid #111', padding:'3px 10px', fontSize:10, color:'#444', fontFamily:'Arial,sans-serif' }}>
 <strong>Exam Syllabus:</strong> {selectedChapters.join(' | ')}
 </td>
 </tr>
 )}
 </tbody>
 </table>

 {/* Bubble Sheet */}
 {printOpts.showBubble && selectedMCQ.length > 0 && (
 <BubbleSheet count={selectedMCQ.length} />
 )}

 {/* Paper Body */}
 <div style={{ ...bodyBorder, padding:'10px 14px' }}>
 {config.instructions && <div style={{ fontSize:11, fontStyle:'italic', color:'#444', marginBottom:8 }}><E edit={edit}>{config.instructions}</E></div>}

 {/* MCQ */}
 {selectedMCQ.length > 0 && (() => { const qn=nextQ(); const perQ=selectedMCQ[0]?.marks||1; return (
 <div style={{ marginBottom:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontWeight:bold||700, fontSize:engFS+1, borderBottom:'1.5px solid #000', paddingBottom:4, marginBottom:8 }}>
 <span>Q{qn}. <E edit={edit}>Choose the correct answer.</E></span>
 <span>({perQ} x {selectedMCQ.length} = {mcqTotal})</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 20px' }}>
 {selectedMCQ.map((q,i) => (
 <div key={q.id} style={{ marginBottom:8 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && (
 <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS, color:'#333', marginTop:1 }}>{q.textUrdu}</div>
 )}
 <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 12px', marginTop:2, fontSize:engFS-1 }}>
 {q.options?.filter(o=>o.text).map(o => (
 <span key={o.label}>
 <strong>({o.label})</strong>&nbsp;<E edit={edit}>{o.text}</E>
 {(config.language==='urdu'||config.language==='mixed') && o.textUrdu && <span style={{ fontFamily:URDU_FONT, fontSize:urdFS-1, marginRight:4 }}> {o.textUrdu}</span>}
 {showAnswers && o.label===q.answer && <strong style={{ color:'#27ae60' }}> </strong>}
 </span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 )})()}

 {/* Short Qs */}
 {selectedShort.length > 0 && (() => { const qn=nextQ(); const perQ=selectedShort[0]?.marks||2; return (
 <div style={{ marginBottom:14 }}>
 <div style={{ display:'flex', justifyContent:'space-between', fontWeight:bold||700, fontSize:engFS+1, borderBottom:'1.5px solid #000', paddingBottom:4, marginBottom:8 }}>
 <span>Q{qn}. <E edit={edit}>Write answers of the following questions.</E></span>
 <span>({perQ} x {selectedShort.length} = {shortTotal})</span>
 </div>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 20px' }}>
 {selectedShort.map((q,i) => (
 <div key={q.id} style={{ marginBottom:6 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers && q.answer && <div style={{ color:'#27ae60', fontSize:10, fontStyle:'italic' }}>Ans: {q.answer}</div>}
 {printOpts.showShortAnswerLines && <AnsLines count={printOpts.blankLines||2} color='#bbb' mt={14} />}
 </div>
 ))}
 </div>
 </div>
 )})()}

 {/* Long Qs */}
 {selectedLong.length > 0 && (() => { const qn=nextQ(); const perQ=selectedLong[0]?.marks||5; return (
 <div>
 <div style={{ display:'flex', justifyContent:'space-between', fontWeight:bold||700, fontSize:engFS+1, borderBottom:'1.5px solid #000', paddingBottom:4, marginBottom:8 }}>
 <span>Q{qn}. <E edit={edit}>Answer the following questions in detail.</E></span>
 <span>({perQ} x {selectedLong.length} = {longTotal})</span>
 </div>
 {selectedLong.map((q,i) => (
 <div key={q.id} style={{ marginBottom:20 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers && q.answer && <div style={{ color:'#27ae60', fontSize:10 }}>{q.answer}</div>}
 {printOpts.showLongAnswerLines && <AnsLines count={printOpts.longLines||7} color='#ccc' mt={18} />}
 </div>
 ))}
 </div>
 )})()}

 {!selectedMCQ.length && !selectedShort.length && !selectedLong.length && (
 <div style={{ textAlign:'center', padding:40, color:'#888', fontSize:13 }}>No questions selected.</div>
 )}
 </div>

 <div style={{ textAlign:'center', fontSize:9, color:'#888', marginTop:8, fontFamily:'Arial,sans-serif' }}>
 Page 1 of 1
 </div>
 </div>
 )
}

// 
// TEMPLATE 2 — MODERN PRO
// 
function ModernTemplate({ config, selectedMCQ, selectedShort, selectedLong, settings, showAnswers, edit, printOpts, selectedChapters=[] }) {
 const { mcqTotal, shortTotal, longTotal, grandTotal } = calcTotals(selectedMCQ, selectedShort, selectedLong)
 const isUrdu = config.language==='urdu'
 const bodyFont = resolveBodyFont(config.language, printOpts, 'modern')
 const engFS = printOpts.engFontSize||13
 const urdFS = printOpts.urdFontSize||14
 const bold = printOpts.fontBold ? 700 : 400
 const lineH = printOpts.lineHeight||1.6
 const logoSize = Math.round(64 * (printOpts.headerLogoScale || 1))

 let qNum = 0
 const nextQ = () => { qNum++; return qNum }

 const SH = ({ label, marks }) => (
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#1a3a6b', color:'#fff', borderRadius:'8px 8px 0 0', padding:'8px 16px', marginBottom:0 }}>
 <span style={{ fontWeight:700, fontSize:engFS+1 }}>{label}</span>
 <span style={{ background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'2px 10px', fontSize:11 }}>Marks: {marks}</span>
 </div>
 )

 return (
 <div className="ppe-paper" style={{ position:'relative', background:'#fff', color:'#1a1a2e', fontFamily:bodyFont, fontSize:12, lineHeight:lineH, maxWidth:794, margin:'0 auto', padding:'12px 16px', direction:isUrdu?'rtl':'ltr' }}>
 <LogoWatermark logo={settings.logo} show={printOpts.showLogoWatermark} opacity={printOpts.watermarkOpacity} scale={printOpts.watermarkScale} />
 <div style={{ background:'linear-gradient(135deg,#1a3a6b,#2d6abf)', color:'#fff', borderRadius:12, padding:'16px 24px', marginBottom:14, display:'flex', alignItems:'center', gap:16 }}>
 {settings.logo
 ? <img src={settings.logo} style={{ width:logoSize, height:logoSize, objectFit:'contain', borderRadius:0, background:'#fff', padding:4, flexShrink:0 }} alt="logo" />
 : <div style={{ width:logoSize, height:logoSize, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, flexShrink:0 }}>AS</div>
 }
 <div style={{ flex:1 }}>
 <div style={{ fontWeight:800, fontSize:19, textTransform:'uppercase' }}><E edit={edit} style={{ color:'#fff' }}>{settings.schoolName||'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}</E></div>
 <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}><E edit={edit} style={{ color:'#fff' }}>{settings.address||'Sharif Chowk, Rayya Khas'}</E></div>
 </div>
 <div style={{ textAlign:'center', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:10, padding:'10px 18px', flexShrink:0 }}>
 <div style={{ fontSize:9, opacity:0.8 }}>TOTAL MARKS</div>
 <div style={{ fontWeight:900, fontSize:26 }}>{grandTotal}</div>
 </div>
 </div>

 <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:12 }}>
 {[['Subject',config.subject],['Class',config.classLevel],['Duration',config.duration+' min'],['Date',fmtDate(config.examDate)]].map(([lbl,val]) => (
 <div key={lbl} style={{ background:'#f4f6fb', borderRadius:8, padding:'7px 12px', borderLeft:'3px solid #1a3a6b' }}>
 <div style={{ fontSize:9, color:'#666', fontWeight:700, textTransform:'uppercase' }}>{lbl}</div>
 <div style={{ fontWeight:700, fontSize:engFS, marginTop:2 }}><E edit={edit}>{val||'—'}</E></div>
 </div>
 ))}
 </div>

 {printOpts.showSyllabus && selectedChapters.length > 0 && (
 <div style={{ fontSize:10, color:'#555', marginBottom:10, padding:'4px 8px', background:'#f8f9fa', borderRadius:6 }}>
 <strong>Syllabus:</strong> {selectedChapters.join(' · ')}
 </div>
 )}

 <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:12 }}>
 {['Student Name','Roll Number','Section'].map(f => (
 <div key={f} style={{ borderBottom:'2px solid #1a3a6b', paddingBottom:4 }}>
 <div style={{ fontSize:9, color:'#888', fontWeight:600 }}>{f}</div>
 <div style={{ minHeight:18 }} />
 </div>
 ))}
 </div>

 {printOpts.showBubble && selectedMCQ.length > 0 && <BubbleSheet count={selectedMCQ.length} />}
 {config.instructions && <div style={{ background:'#fff8e1', border:'1px solid #ffc107', borderRadius:8, padding:'7px 12px', marginBottom:12, fontSize:11 }}> <E edit={edit}>{config.instructions}</E></div>}

 {selectedMCQ.length > 0 && (() => { const qn=nextQ(); return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Choose the correct answer.`} marks={mcqTotal} />
 <div style={{ border:'1px solid #dce3f0', borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
 {selectedMCQ.map((q,i) => (
 <div key={q.id} style={{ padding:8, background:i%2===0?'#f8f9fc':'#fff', borderRadius:6 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 12px', fontSize:engFS-1 }}>
 {q.options?.filter(o=>o.text).map(o => (
 <span key={o.label} style={{ color:showAnswers&&o.label===q.answer?'#27ae60':'#333' }}>
 <strong>({o.label})</strong>&nbsp;<E edit={edit}>{o.text}</E>{showAnswers&&o.label===q.answer&&' '}
 </span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )})()}

 {selectedShort.length > 0 && (() => { const qn=nextQ(); return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Write answers of the following questions.`} marks={shortTotal} />
 <div style={{ border:'1px solid #dce3f0', borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px' }}>
 {selectedShort.map((q,i) => (
 <div key={q.id} style={{ paddingBottom:10, borderBottom:'1px dashed #e2e8f0' }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers&&q.answer && <div style={{ color:'#27ae60', fontSize:10 }}>{q.answer}</div>}
 {printOpts.showShortAnswerLines && <AnsLines count={printOpts.blankLines||2} color='#ccc' mt={14} />}
 </div>
 ))}
 </div>
 </div>
 </div>
 )})()}

 {selectedLong.length > 0 && (() => { const qn=nextQ(); return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Answer the following questions in detail.`} marks={longTotal} />
 <div style={{ border:'1px solid #dce3f0', borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 {selectedLong.map((q,i) => (
 <div key={q.id} style={{ marginBottom:22 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers&&q.answer && <div style={{ color:'#27ae60', fontSize:10 }}>{q.answer}</div>}
 {printOpts.showLongAnswerLines && <AnsLines count={printOpts.longLines||7} color='#ddd' mt={20} />}
 </div>
 ))}
 </div>
 </div>
 )})()}

 <div style={{ textAlign:'center', fontSize:9, color:'#aaa', marginTop:10, borderTop:'1px solid #eee', paddingTop:6 }}>
 {settings.schoolName} - Page 1 of 1
 </div>
 </div>
 )
}

// 
// TEMPLATE 3 — ELITE PREMIUM
// 
function EliteTemplate({ config, selectedMCQ, selectedShort, selectedLong, settings, showAnswers, edit, printOpts, selectedChapters=[] }) {
 const { mcqTotal, shortTotal, longTotal, grandTotal } = calcTotals(selectedMCQ, selectedShort, selectedLong)
 const gold = '#C8991A', dark = '#071e34'
 const isUrdu = config.language === 'urdu'
 const bodyFont = resolveBodyFont(config.language, printOpts, 'elite')
 const engFS = printOpts.engFontSize||13
 const urdFS = printOpts.urdFontSize||14
 const bold = printOpts.fontBold ? 700 : 400
 const lineH = printOpts.lineHeight||1.6
 const logoSize = Math.round(78 * (printOpts.headerLogoScale || 1))

 let qNum = 0
 const nextQ = () => { qNum++; return qNum }

 const SH = ({ label, perQ, count, total }) => (
 <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:dark, color:gold, padding:'9px 16px', borderRadius:'8px 8px 0 0' }}>
 <span style={{ fontWeight:800, fontSize:engFS+1 }}>{label}</span>
 <span style={{ background:gold, color:dark, borderRadius:6, padding:'2px 12px', fontWeight:700, fontSize:11 }}>{perQ} × {count} = {total}</span>
 </div>
 )

 return (
 <div className="ppe-paper" style={{ background:'#fff', color:'#1a1a2e', fontFamily:bodyFont, fontSize:12, lineHeight:lineH, maxWidth:794, margin:'0 auto', position:'relative', overflow:'hidden' }}>
 <LogoWatermark logo={settings.logo} show={printOpts.showLogoWatermark} opacity={printOpts.watermarkOpacity} scale={printOpts.watermarkScale} />
 <div style={{ background:gold, height:7 }} />
 <div style={{ background:`linear-gradient(135deg,${dark},#0d3060)`, color:'#fff', padding:'20px 32px', position:'relative', zIndex:1 }}>
 <div style={{ display:'flex', alignItems:'center', gap:20 }}>
 {settings.logo
 ? <img src={settings.logo} style={{ width:logoSize, height:logoSize, objectFit:'contain', borderRadius:0, background:'#fff', padding:6, flexShrink:0, boxShadow:'0 8px 22px rgba(0,0,0,0.14)' }} alt="logo" />
 : <div style={{ width:logoSize, height:logoSize, borderRadius:'50%', border:`3px solid ${gold}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:gold, flexShrink:0 }}>AS</div>
 }
 <div style={{ flex:1 }}>
 <div style={{ fontWeight:800, fontSize:20, textTransform:'uppercase' }}><E edit={edit} style={{ color:'#fff' }}>{settings.schoolName||'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'}</E></div>
 <div style={{ color:gold, fontSize:12, marginTop:4 }}><E edit={edit} style={{ color:gold }}>{settings.address||'Sharif Chowk, Rayya Khas'}</E></div>
 </div>
 <div style={{ textAlign:'center', background:'rgba(148,163,184,0.18)', border:`2px solid ${gold}`, borderRadius:12, padding:'12px 20px', flexShrink:0 }}>
 <div style={{ color:gold, fontSize:9, fontWeight:700, letterSpacing:1 }}>TOTAL MARKS</div>
 <div style={{ color:'#fff', fontWeight:900, fontSize:28 }}>{grandTotal}</div>
 </div>
 </div>
 </div>
 <div style={{ background:gold, height:3 }} />

 <div style={{ padding:'16px 32px', position:'relative', zIndex:1 }}>
 <table style={{ width:'100%', borderCollapse:'collapse', border:`1.5px solid ${gold}`, marginBottom:12, tableLayout:'fixed' }}>
 <tbody>
 <tr>
 {[['SUBJECT',config.subject],['CLASS',config.classLevel],['DURATION',config.duration+' min'],['DATE',fmtDate(config.examDate)],['CODE',config.paperCode]].map(([lbl,val]) => (
 <td key={lbl} style={{ border:`1px solid ${gold}`, padding:'5px 10px', textAlign:'center', background:'#fffbf0' }}>
 <div style={{ fontSize:9, color:'#888', fontWeight:700, letterSpacing:0.5 }}>{lbl}</div>
 <div style={{ fontWeight:700, fontSize:engFS }}><E edit={edit}>{val||'—'}</E></div>
 </td>
 ))}
 </tr>
 </tbody>
 </table>

 {printOpts.showSyllabus && selectedChapters.length > 0 && (
 <div style={{ fontSize:10, color:'#666', marginBottom:10, padding:'4px 8px', background:'#fffbf0', border:`1px solid ${gold}`, borderRadius:4 }}>
 <strong>Exam Syllabus:</strong> {selectedChapters.join(' | ')}
 </div>
 )}

 <div style={{ display:'flex', gap:12, marginBottom:14 }}>
 {[['Student Name',2],['Roll Number',1],['Section',1]].map(([f,sp]) => (
 <div key={f} style={{ flex:sp, borderBottom:`2px solid ${gold}`, paddingBottom:4 }}>
 <div style={{ fontSize:9, color:'#888', fontWeight:700, letterSpacing:0.5 }}>{f.toUpperCase()}</div>
 <div style={{ minHeight:18 }} />
 </div>
 ))}
 </div>

 {printOpts.showBubble && selectedMCQ.length > 0 && <BubbleSheet count={selectedMCQ.length} />}
 {config.instructions && <div style={{ background:'#fffbf0', border:`1px solid ${gold}`, borderLeft:`4px solid ${gold}`, borderRadius:4, padding:'7px 12px', marginBottom:14, fontSize:11 }}><strong>Instructions:</strong> <E edit={edit}>{config.instructions}</E></div>}

 {selectedMCQ.length > 0 && (() => { const qn=nextQ(); const perQ=selectedMCQ[0]?.marks||1; return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Choose the correct answer.`} perQ={perQ} count={selectedMCQ.length} total={mcqTotal} />
 <div style={{ border:`1.5px solid ${gold}`, borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px' }}>
 {selectedMCQ.map((q,i) => (
 <div key={q.id} style={{ padding:'6px 8px', borderRadius:6, background:'#fafaf7', border:'1px solid #f0e8d0' }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 <div style={{ display:'flex', flexWrap:'wrap', gap:'2px 14px', marginTop:4, fontSize:engFS-1 }}>
 {q.options?.filter(o=>o.text).map(o => (
 <span key={o.label} style={{ color:showAnswers&&o.label===q.answer?'#27ae60':'#333' }}>
 <strong>({o.label})</strong>&nbsp;<E edit={edit}>{o.text}</E>{showAnswers&&o.label===q.answer&&' '}
 </span>
 ))}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )})()}

 {selectedShort.length > 0 && (() => { const qn=nextQ(); const perQ=selectedShort[0]?.marks||2; return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Write answers of the following questions.`} perQ={perQ} count={selectedShort.length} total={shortTotal} />
 <div style={{ border:`1.5px solid ${gold}`, borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px' }}>
 {selectedShort.map((q,i) => (
 <div key={q.id} style={{ paddingBottom:12, borderBottom:'1px dashed #f0e8d0' }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers&&q.answer && <div style={{ color:'#27ae60', fontSize:10 }}>{q.answer}</div>}
 {printOpts.showShortAnswerLines && <AnsLines count={printOpts.blankLines||2} color='#ddd' mt={16} />}
 </div>
 ))}
 </div>
 </div>
 </div>
 )})()}

 {selectedLong.length > 0 && (() => { const qn=nextQ(); const perQ=selectedLong[0]?.marks||5; return (
 <div style={{ marginBottom:18 }}>
 <SH label={`Q${qn}. Answer the following questions.`} perQ={perQ} count={selectedLong.length} total={longTotal} />
 <div style={{ border:`1.5px solid ${gold}`, borderTop:'none', borderRadius:'0 0 8px 8px', padding:12 }}>
 {selectedLong.map((q,i) => (
 <div key={q.id} style={{ marginBottom:22 }}>
 <div style={{ fontWeight:bold, fontSize:engFS }}>{i+1}.&nbsp;<E edit={edit}>{q.text}</E></div>
 {(config.language==='urdu'||config.language==='mixed') && q.textUrdu && <div style={{ fontFamily:URDU_FONT, direction:'rtl', fontSize:urdFS }}>{q.textUrdu}</div>}
 {showAnswers&&q.answer && <div style={{ color:'#27ae60', fontSize:10 }}>{q.answer}</div>}
 {printOpts.showLongAnswerLines && <AnsLines count={printOpts.longLines||7} color='#eee' mt={20} />}
 </div>
 ))}
 </div>
 </div>
 )})()}

 <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#aaa', marginTop:10, borderTop:'1px solid #eee', paddingTop:6 }}>
 <span>{settings.schoolName}</span>
 <span>Page 1 of 1</span>
 </div>
 </div>
 <div style={{ background:gold, height:5 }} />
 </div>
 )
}

// 
// MAIN ENGINE
// 
export default function UnifiedPaperPreviewEngine({ config, selectedMCQ, selectedShort, selectedLong, settings, showAnswers: initAns, onBack, selectedChapters=[], importToQuestionBank = false, questionBankSubjectId = '', questionBankSubjectMeta = null, paperSource = 'paper' }) {
 const { savePaper, importPaperQuestionsToBank } = usePaperStore()
 const unifiedDefaults = resolveUnifiedDefaults(config.classLevel)

 const [template, setTemplate] = useState(unifiedDefaults.template)
 const [editMode, setEditMode] = useState(false)
 const [showAnswers, setShowAnswers] = useState(initAns || false)
 const [language, setLanguage] = useState(config.language || 'english')
 const [printMode, setPrintMode] = useState('single') // single | half | double

 // Print options (mimicking PTS7 toolbar)
 const [printOpts, setPrintOpts] = useState({
 lineHeight: 1.55,
 engFontSize: 13,
 urdFontSize: 14,
 fontFamily: unifiedDefaults.template,
 fontBold: false,
 fontColor: '#000',
 borderStyle: 'word-blue',
 showBubble: selectedMCQ.length > 0,
 showSyllabus: selectedChapters.length > 0,
 showLogoWatermark: false,
 watermarkOpacity: 0.08,
 watermarkScale: 1,
 headerLogoScale: 1,
 showAnswerKey: false,
 showShortAnswerLines: unifiedDefaults.showShortAnswerLines,
 showLongAnswerLines: unifiedDefaults.showLongAnswerLines,
 blankLines: unifiedDefaults.blankLines,
 longLines: unifiedDefaults.longLines,
 })

 // Save paper modal
 const [showSave, setShowSave] = useState(false)
 const [saveName, setSaveName] = useState(`${config.subject || 'Paper'} ${config.examType || ''} Class ${config.classLevel || ''} ${new Date().toLocaleDateString('en-GB')}`.trim())
 const [saveSuccess, setSaveSuccess] = useState(false)
 const [saveQuestionsToBank, setSaveQuestionsToBank] = useState(Boolean(importToQuestionBank))
 const [retentionMode, setRetentionMode] = useState('30')
 const [retentionDate, setRetentionDate] = useState('')

 const mergedConfig = { ...config, language }
 const templateProps = { config: mergedConfig, selectedMCQ, selectedShort, selectedLong, settings, showAnswers, edit: editMode, printOpts, selectedChapters }

 function setPO(key, val) { setPrintOpts(p => ({ ...p, [key]: val })) }

 function handlePrint() {
 window.print()
 }

 function handleSave() {
 const expiresAt = retentionMode === 'custom'
 ? (retentionDate ? new Date(`${retentionDate}T23:59:59`).toISOString() : null)
 : (retentionMode === 'forever' ? null : new Date(Date.now() + Number(retentionMode) * 24 * 60 * 60 * 1000).toISOString())
 const saved = savePaper({ name: saveName, config: mergedConfig, selectedMCQ, selectedShort, selectedLong, paperSource, expiresAt })
 if (!saved) { alert('Failed to save paper: Storage limit reached.'); return; }
 
 if (saveQuestionsToBank) {
 importPaperQuestionsToBank({
 subjectId: questionBankSubjectId || '',
 subjectMeta: questionBankSubjectMeta || {
 name: mergedConfig.subject || '',
 classLevel: mergedConfig.classLevel || '',
 publisher: mergedConfig.publisher || '',
 },
 selectedMCQ,
 selectedShort,
 selectedLong,
 medium: mergedConfig.language || 'english',
 source: paperSource,
 })
 }
 setSaveSuccess(true)
 setTimeout(() => { setSaveSuccess(false); setShowSave(false) }, 1500)
 }

 const TBtn = ({ active, onClick, children, style={} }) => (
 <button onClick={onClick} style={{ background: active ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(15,23,42,0.46)', color: active ? '#071e34' : C.silver, border: active ? 'none' : `1px solid ${C.border}`, borderRadius: 9, padding: '7px 14px', fontWeight: 600, fontSize: 12, cursor: 'pointer', ...style }}>
 {children}
 </button>
 )

 const SliderOpt = ({ label, value, min, max, step=0.1, onChange }) => (
 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{label}: {value}</div>
 <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}
 style={{ width:80, accentColor:C.gold }} />
 </div>
 )

 const NumOpt = ({ label, value, min, max, onChange }) => (
 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>{label}</div>
 <input type="number" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}
 style={{ width:52, background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:6, color:C.gold, padding:'3px 6px', fontSize:12, outline:'none', fontWeight:700 }} />
 </div>
 )

 const Toggle = ({ label, checked, onChange }) => (
 <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:11, color:C.silver }}>
 <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}
 style={{ accentColor:C.gold, width:14, height:14 }} />
 {label}
 </label>
 )

 return (
 <div>
 <style>{BASE_PRINT}</style>

 {/*  Save Modal  */}
 {showSave && (
 <Portal>
 <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
 <div style={{ background:'#071e34', border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:400 }}>
 {saveSuccess ? (
 <div style={{ textAlign:'center', padding:20 }}>
 <div style={{ fontSize:40, marginBottom:12 }}></div>
 <div style={{ color:C.green, fontWeight:800, fontSize:18 }}>Paper Saved!</div>
 </div>
 ) : (
 <>
 <div style={{ color:C.gold, fontWeight:800, fontSize:18, marginBottom:16 }}> Save Paper</div>
 <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>Paper Name</div>
 <input value={saveName} onChange={e=>setSaveName(e.target.value)}
 style={{ width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:20 }} />
 <div style={{ fontSize:11, color:C.muted, marginBottom:8 }}>Keep Saved Paper</div>
 <select value={retentionMode} onChange={e=>setRetentionMode(e.target.value)}
 style={{ width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:12 }}>
 <option value="30">1 Month</option>
 <option value="90">3 Months</option>
 <option value="180">6 Months</option>
 <option value="365">1 Year</option>
 <option value="forever">Keep Until Manual Delete</option>
 <option value="custom">Custom Date</option>
 </select>
 {retentionMode === 'custom' && (
 <input type="date" value={retentionDate} onChange={e=>setRetentionDate(e.target.value)}
 style={{ width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:10, color:C.silver, padding:'10px 14px', fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:14 }} />
 )}
 <label style={{ display:'flex', alignItems:'center', gap:8, color:C.silver, fontSize:12, marginBottom:18, cursor:'pointer' }}>
 <input
 type="checkbox"
 checked={saveQuestionsToBank}
 onChange={e => setSaveQuestionsToBank(e.target.checked)}
 style={{ accentColor: C.gold, width:14, height:14 }}
 />
 Save questions to Question Bank too
 </label>
 <div style={{ display:'flex', gap:10 }}>
 <button onClick={()=>setShowSave(false)} style={{ flex:1, background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 0', color:C.silver, fontWeight: 600, cursor:'pointer' }}>Cancel</button>
 <button onClick={handleSave} style={{ flex:1, background:`linear-gradient(135deg,${C.gold},${C.goldL})`, border:'none', borderRadius:10, padding:'10px 0', color:'#071e34', fontWeight: 600, cursor:'pointer' }}>Save Paper</button>
 </div>
 </>
 )}
 </div>
 </div>
 </Portal>
 )}

 {/*  PTS7-style Print Options Bar  */}
 <div className="ppe-toolbar no-print" style={{ background:C.card, backdropFilter:'blur(20px)', border:`1px solid ${C.border}`, borderRadius:20, padding:'12px 18px', marginBottom:10, display:'flex', flexWrap:'wrap', gap:12, alignItems:'center' }}>

 {/* Template */}
 <div style={{ display:'flex', gap:6 }}>
 {[['classic',' AS Classic'],['modern',' Modern'],['elite',' Elite']].map(([k,l]) => (
 <TBtn key={k} active={template===k} onClick={()=>setTemplate(k)}>{l}</TBtn>
 ))}
 </div>

 <div style={{ width:1, height:28, background:C.border }} />

 {/* Print options row */}
 <SliderOpt label="Line Height" value={printOpts.lineHeight} min={1.0} max={2.5} onChange={v=>setPO('lineHeight',v)} />
 <NumOpt label="Urdu Size" value={printOpts.urdFontSize} min={10} max={20} onChange={v=>setPO('urdFontSize',v)} />
 <NumOpt label="Eng Size" value={printOpts.engFontSize} min={9} max={16} onChange={v=>setPO('engFontSize',v)} />
 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Font Style</div>
 <select value={printOpts.fontFamily} onChange={e=>setPO('fontFamily',e.target.value)}
 style={{ background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:6, color:C.silver, padding:'4px 8px', fontSize:11, outline:'none', cursor:'pointer' }}>
 <option value="classic">Times Classic</option>
 <option value="modern">Segoe Modern</option>
 <option value="elite">Georgia Elite</option>
 <option value="formal">Cambria Formal</option>
 <option value="clean">Calibri Clean</option>
 <option value="exam">Book Antiqua Exam</option>
 </select>
 </div>

 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Border</div>
 <select value={printOpts.borderStyle} onChange={e=>setPO('borderStyle',e.target.value)}
 style={{ background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:6, color:C.silver, padding:'4px 8px', fontSize:11, outline:'none', cursor:'pointer' }}>
 <option value="word-blue">Word Blue Frame</option>
 <option value="word-gold">Word Gold Frame</option>
 <option value="word-frame">Classic Word Frame</option>
 <option value="thin">Thin Black</option>
 <option value="none">No Border</option>
 </select>
 </div>

 <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
 <Toggle label="Bold Font" checked={printOpts.fontBold} onChange={v=>setPO('fontBold',v)} />
 <Toggle label="Bubble Sheet" checked={printOpts.showBubble} onChange={v=>setPO('showBubble',v)} />
 <Toggle label="Exam Syllabus" checked={printOpts.showSyllabus} onChange={v=>setPO('showSyllabus',v)} />
 <Toggle label="Logo Watermark" checked={printOpts.showLogoWatermark} onChange={v=>setPO('showLogoWatermark',v)} />
 <Toggle label="Short Answer Lines" checked={printOpts.showShortAnswerLines} onChange={v=>setPO('showShortAnswerLines',v)} />
 <Toggle label="Long Answer Lines" checked={printOpts.showLongAnswerLines} onChange={v=>setPO('showLongAnswerLines',v)} />
 <Toggle label="Answer Keys" checked={showAnswers} onChange={setShowAnswers} />
 </div>

 <SliderOpt label="WM Opacity" value={printOpts.watermarkOpacity} min={0.03} max={0.22} step={0.01} onChange={v=>setPO('watermarkOpacity',v)} />
 <SliderOpt label="WM Size" value={printOpts.watermarkScale} min={0.7} max={1.4} step={0.05} onChange={v=>setPO('watermarkScale',v)} />
 <SliderOpt label="Logo Size" value={printOpts.headerLogoScale} min={0.8} max={1.5} step={0.05} onChange={v=>setPO('headerLogoScale',v)} />

 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Blank Lines</div>
 <div style={{ display:'flex', gap:4 }}>
 <NumOpt label="Short" value={printOpts.blankLines} min={0} max={8} onChange={v=>setPO('blankLines',v)} />
 <NumOpt label="Long" value={printOpts.longLines} min={0} max={15} onChange={v=>setPO('longLines',v)} />
 </div>
 </div>

 <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
 <div style={{ fontSize:10, color:C.muted, fontWeight:600 }}>Language</div>
 <select value={language} onChange={e=>setLanguage(e.target.value)}
 style={{ background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:6, color:C.silver, padding:'4px 8px', fontSize:11, outline:'none', cursor:'pointer' }}>
 <option value="english">English</option>
 <option value="urdu">Urdu</option>
 <option value="mixed">Dual Medium</option>
 </select>
 </div>

 <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
 {/* Edit mode */}
 <TBtn active={editMode} onClick={()=>setEditMode(p=>!p)} style={{ fontSize:11 }}>
 {editMode ? ' Done' : ' Manual Edit'}
 </TBtn>

 {/* Back */}
 <button onClick={onBack} style={{ background:'rgba(15,23,42,0.46)', border:`1px solid ${C.border}`, borderRadius:9, padding:'7px 14px', color:C.silver, fontWeight: 600, cursor:'pointer', fontSize:12 }}>← Back</button>

 {/* Save */}
 <button onClick={()=>setShowSave(true)} style={{ background:'rgba(48,209,88,0.15)', border:'1px solid rgba(48,209,88,0.35)', borderRadius:9, padding:'7px 16px', color:C.green, fontWeight: 600, cursor:'pointer', fontSize:12 }}> Save</button>

 {/* Print mode */}
 <div style={{ display:'flex', gap:4, border:`1px solid ${C.border}`, borderRadius:9, padding:'4px' }}>
 {[['single',' Single'],['half',' Half'],['double',' Double']].map(([m,l]) => (
 <button key={m} onClick={()=>setPrintMode(m)}
 style={{ background:printMode===m?`linear-gradient(135deg,${C.gold},${C.goldL})`:'transparent', color:printMode===m?'#071e34':C.muted, border:'none', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontWeight:700, fontSize:11 }}>
 {l}
 </button>
 ))}
 </div>

 <button onClick={handlePrint} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none', borderRadius:9, padding:'7px 22px', fontWeight: 600, fontSize:12, cursor:'pointer' }}>
  Print Paper
 </button>
 </div>
 </div>

 {/* Print mode info */}
 {printMode === 'half' && (
 <div className="ppe-save-bar no-print" style={{ background:'rgba(10,132,255,0.1)', border:'1px solid rgba(10,132,255,0.2)', borderRadius:10, padding:'7px 14px', marginBottom:10, fontSize:12, color:C.blue }}>
  Half-page mode: 2 copies will print on one A4 sheet. In print dialog, set paper size to A4 Landscape.
 </div>
 )}
 {printMode === 'double' && (
 <div className="ppe-save-bar no-print" style={{ background:'rgba(48,209,88,0.08)', border:'1px solid rgba(48,209,88,0.2)', borderRadius:10, padding:'7px 14px', marginBottom:10, fontSize:12, color:C.green }}>
  Double-sided mode: Enable "Two-sided" or "Duplex" in your print dialog.
 </div>
 )}

 {/* Edit mode banner */}
 {editMode && (
 <div className="ppe-edit-banner no-print" style={{ background:'rgba(200,153,26,0.1)', border:`1px solid ${C.border}`, borderRadius:10, padding:'7px 14px', marginBottom:10, color:C.gold, fontSize:12, fontWeight:600 }}>
  Edit mode ON — click any text in the paper to edit. Changes apply to print only.
 </div>
 )}

 {/* Paper canvas */}
 <div className="ppe-bg" style={{ background:'#e8edf2', padding:'20px 0', borderRadius:12 }}>
 {printMode === 'half' ? (
 <div className="print-half-wrap" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
 <div style={{ zoom:0.5, transformOrigin:'top left' }}>
 {template==='classic' && <ClassicTemplate {...templateProps} />}
 {template==='modern' && <ModernTemplate {...templateProps} />}
 {template==='elite' && <EliteTemplate {...templateProps} />}
 </div>
 <div style={{ zoom:0.5, transformOrigin:'top left' }}>
 {template==='classic' && <ClassicTemplate {...templateProps} />}
 {template==='modern' && <ModernTemplate {...templateProps} />}
 {template==='elite' && <EliteTemplate {...templateProps} />}
 </div>
 </div>
 ) : (
 <>
 {template==='classic' && <ClassicTemplate {...templateProps} />}
 {template==='modern' && <ModernTemplate {...templateProps} />}
 {template==='elite' && <EliteTemplate {...templateProps} />}
 </>
 )}
 </div>
 </div>
 )
}
