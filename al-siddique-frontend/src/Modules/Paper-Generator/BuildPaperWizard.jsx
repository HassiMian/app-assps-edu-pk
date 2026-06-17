// BuildPaperWizard.jsx — Al Siddique-style dynamic paper builder
import { useState, useMemo, useEffect } from 'react'
import { usePaperStore } from './usePaperStore'
import { classLevelsMatch } from '../../services/useAcademicStore'

const C = {
 navy:'#071e34', dark:'#0b1e33', card:'rgba(11,44,77,0.6)',
 gold:'#C8991A', goldL:'#e8b420', silver:'#C0C8D8', muted:'#8892A4',
 green:'#30D158', red:'#FF375F', orange:'#FF9F0A', blue:'#0A84FF',
 border:'rgba(148,163,184,0.18)',
}

//  Constants 
const SYLLABUSES = [
 { id:'ptb', label:'PTB', sub:'Syllabus' },
 { id:'snc', label:'Afaq SNC', sub:'Syllabus' },
]

const PTS_CLASSES = [
 { label:'STARTER', value:'starter' }, { label:'MOVER', value:'mover' },
 { label:'FLYER', value:'flyer' }, { label:'ONE', value:'1' }, { label:'TWO', value:'2' },
 { label:'THREE', value:'3' }, { label:'FOUR', value:'4' },
 { label:'5TH', value:'5' }, { label:'6TH', value:'6' },
 { label:'7TH', value:'7' }, { label:'8TH', value:'8' },
 { label:'PRE NINE', value:'pre-nine' }, { label:'HIFAZ', value:'hifaz' },
]

const PRIORITIES = [
 { value:'all', label:'All selected' },
 { value:'exercise', label:'Exercise' },
 { value:'past', label:'Past Papers' },
 { value:'additional', label:'Additional' },
]

const MEDIUMS = ['DUAL MEDIUM','URDU MEDIUM','ENGLISH MEDIUM']

const SUBJ_COLORS = [
 '#1565C0','#2E7D32','#6A1B9A','#C62828','#00838F',
 '#558B2F','#AD1457','#EF6C00','#37474F','#0277BD',
 '#283593','#4E342E',
]

const SUBJ_ICONS = {
 'Mathematics':'MATH','English':'ENG','Urdu':'UR','Science':'SCI',
 'Biology':'BIO','Chemistry':'CHEM','Physics':'PHY','Computer Science':'CS',
 'Computer':'CS','Islamiyat':'ISL','Pakistan Studies':'PST',
 'Social Studies':'SST','Arts':'ART','Physical Education':'PE',
 'General Science':'GSC','History':'HIS',
}

const subjIcon = n => SUBJ_ICONS[n] || 'SUB'
const classLabel = v => PTS_CLASSES.find(c => c.value === v)?.label || v

//  Print HTML Generator 
function buildPaperHTML({ selections={}, questionTypes=[], subject, classVal, medium,
 pBubble, pSyllabus, pAnswers, chapNames,
 lineH=1.5, urduFS=12, engFS=11, fontBold='Normal', fontColor='Black',
 borderSt='No Border', paperSettings={} }) {
 const school = paperSettings
 const sName = school.schoolName || 'YOUR SCHOOL NAME HERE'
 const sAddr = school.address || 'School Address'
 const clsLbl = classLabel(classVal)
 const subjName= subject?.name || ''
 const chaps = [...chapNames].join(', ') || 'All Chapters'
 const isDual = medium === 'DUAL MEDIUM'
 const isUrdu = medium === 'URDU MEDIUM'
 
 // Calculate total marks from all categories
 let totalM = 0
 Object.values(selections).forEach(qs => {
 qs.forEach(q => totalM += (q.marks || 1))
 })

 const bdr = borderSt !== 'No Border' ? '1px solid #333' : 'none'

 //  Type-aware question body renderer 
 function renderQuestionBody(q, typeValue) {
 const UF = `'Noto Nastaliq Urdu',serif`
 const FS_U = `font-size:${urduFS}pt`
 const FS_E = `font-size:${engFS}pt`
 const sd = q.structuredData || {}

 // Plain text helper (handles dual/urdu/english)
 function qText(forceUrdu) {
 const useUrdu = forceUrdu || isUrdu
 if (isDual && q.text && q.textUrdu)
 return `<div class="dual-q"><div class="eng-col" style="${FS_E}">${q.text}</div><div class="urd-col" dir="rtl" style="font-family:${UF};${FS_U}">${q.textUrdu}</div></div>`
 if (useUrdu)
 return `<div dir="rtl" style="font-family:${UF};${FS_U};line-height:2">${q.textUrdu || q.text || ''}</div>`
 return `<div style="${FS_E}">${q.text || q.textUrdu || ''}</div>`
 }

 switch (typeValue) {

 case 'mcq': {
 const opts = (q.options || []).filter(o => o && (o.text || o.textUrdu))
 if (!opts.length) return qText()
 const optHtml = opts.map((o, j) => {
 const lbl = o.label || ['A','B','C','D'][j]
 const txt = isUrdu ? (o.textUrdu || o.text || '') : (o.text || o.textUrdu || '')
 return `<span class="opt"><b>(${lbl})</b>${isUrdu ? `<span dir="rtl" style="font-family:${UF};${FS_U}">` : '<span style="'+ FS_E +'">'} ${txt}</span></span>`
 }).join('')
 return `${qText()}<div class="opts">${optHtml}</div>`
 }

 case 'fill': {
 // Replace [blank] with underline span
 const replace = raw => (raw || '').replace(/\[blank\]/g, '<span class="q-blank">___________</span>')
 if (isDual)
 return `<div class="dual-q"><div class="eng-col" style="${FS_E}">${replace(q.text)}</div><div class="urd-col" dir="rtl" style="font-family:${UF};${FS_U}">${replace(q.textUrdu || q.text)}</div></div>`
 if (isUrdu)
 return `<div dir="rtl" style="font-family:${UF};${FS_U};line-height:2">${replace(q.textUrdu || q.text)}</div>`
 return `<div style="${FS_E}">${replace(q.text)}</div>`
 }

 case 'true_false': {
 const stmt = isUrdu ? (q.textUrdu || q.text) : q.text
 return `<div class="tf-row"><span class="tf-box"></span><span${isUrdu?` dir="rtl" style="font-family:${UF};${FS_U}"`:` style="${FS_E}"`}>${stmt}</span></div>`
 }

 case 'columns': {
 const L = q.leftColumn || []; const R = q.rightColumn || []
 const rows = Math.max(L.length, R.length)
 if (!rows) return qText()
 const trs = Array.from({ length: rows }, (_, i) =>
 `<tr><td class="col-a-cell">${i+1}. ${L[i] || ''}</td><td class="col-b-cell">${String.fromCharCode(65+i)}. ${R[i] || ''}</td></tr>`
 ).join('')
 return `${qText()}<table class="match-table"><tr><th class="col-th">Column A</th><th class="col-th">Column B</th></tr>${trs}</table>`
 }

 case 'wahid_jama': {
 const pairs = sd.pairs || []
 if (!pairs.length) return qText()
 const trs = pairs.map((p, i) =>
 `<tr><td class="wj-cell" dir="rtl" style="font-family:${UF};${FS_U}">${i+1}. ${p.singular || ''}</td><td class="wj-cell wj-blank">&nbsp;</td></tr>`
 ).join('')
 return `<table class="wj-table" dir="rtl">
 <tr><th class="wj-th" style="font-family:${UF};${FS_U}">واحد</th><th class="wj-th" style="font-family:${UF};${FS_U}">جمع</th></tr>
 ${trs}</table>`
 }

 case 'mutradif':
 case 'mutzad':
 case 'alfaz_maani':
 case 'muhawara': {
 const word = q.textUrdu || q.text || ''
 return `<div class="wblank-row"><span dir="rtl" style="font-family:${UF};${FS_U};font-weight:bold">${word}</span><span class="wblank-line"></span></div>`
 }

 case 'sentence_correction': {
 const stmt = q.textUrdu || q.text || ''
 return `<div>
 <div dir="rtl" style="font-family:${UF};${FS_U};line-height:2">${stmt}</div>
 <div class="blank-line" style="margin-top:8px"></div>
 </div>`
 }

 case 'sentence_usage': {
 const items = sd.items || []
 if (!items.length) return qText()
 const trs = items.map((it, i) =>
 `<tr><td class="su-word" dir="rtl" style="font-family:${UF};${FS_U};font-weight:bold">${i+1}. ${it.word || ''}</td><td class="su-blank">&nbsp;</td></tr>`
 ).join('')
 return `<table class="su-table">
 <tr><th class="su-th" dir="rtl" style="font-family:${UF};${FS_U}">لفظ</th><th class="su-th" dir="rtl" style="font-family:${UF};${FS_U}">جملہ</th></tr>
 ${trs}</table>`
 }

 case 'comprehension': {
 const passage = isUrdu ? (q.textUrdu || q.text || '') : (q.text || '')
 const passDir = isUrdu ? `dir="rtl" style="font-family:${UF};${FS_U};line-height:2.2"` : `style="${FS_E};line-height:1.7"`
 const qs2 = sd.questions || []
 const qHtml = qs2.map((sq, i) => {
 const sqTxt = isUrdu ? (sq.textUrdu || sq.text || '') : (sq.text || sq.textUrdu || '')
 return `<div class="comp-q"><span style="font-weight:bold;margin-right:6px">${i+1}.</span><span${isUrdu?` dir="rtl" style="font-family:${UF};${FS_U}"`:` style="${FS_E}"`}>${sqTxt}</span>
 <div class="blank-line"></div><div class="blank-line"></div></div>`
 }).join('')
 return `<div class="comp-passage" ${passDir}>${passage}</div>${qHtml}`
 }

 case 'translation': {
 const src = q.text || q.textUrdu || ''
 return `<div>
 <div${isUrdu?` dir="rtl" style="font-family:${UF};${FS_U};line-height:2"`:` style="${FS_E}"`}>${src}</div>
 <div class="blank-line" style="margin-top:10px"></div>
 <div class="blank-line" style="margin-top:6px"></div>
 </div>`
 }

 case 'numerical': {
 const formula = sd.formula ? `<div style="font-size:${engFS-1}pt;color:#555;margin:4px 0 6px">Given / Formula: ${sd.formula}</div>` : ''
 return `<div>${qText()}${formula}${Array(5).fill('<div class="blank-line" style="margin-top:6px"></div>').join('')}</div>`
 }

 case 'diagram': {
 const instr = sd.drawingInstruction || ''
 const lbls = sd.labels?.length ? `<div style="font-size:${engFS-1}pt;color:#555;margin-top:4px">Labels: ${sd.labels.join(', ')}</div>` : ''
 return `<div>${qText()}${instr?`<div style="font-size:${engFS-1}pt;color:#555;margin-top:4px">${instr}</div>`:''}${lbls}
 <div class="diagram-box">Drawing Space</div></div>`
 }

 case 'essay':
 case 'letter':
 return `<div>${qText()}${Array(8).fill('<div class="blank-line" style="margin-top:9px"></div>').join('')}</div>`

 default: {
 const blanks = q.blankLines || (q.marks <= 2 ? 2 : q.marks <= 5 ? 4 : 6)
 return `<div>${qText()}${Array(blanks).fill('<div class="blank-line"></div>').join('')}</div>`
 }
 }
 }
 // 

 // Bubble sheet only for MCQs
 const selMCQ = selections['mcq'] || []
 const bubbleHtml = pBubble && selMCQ.length > 0 ? `
 <table class="bubble-table"><tr>${
 selMCQ.map((_,i)=>`<td class="brow"><span class="bnum">${i+1}-</span>${['A','B','C','D'].map(o=>`<span class="bub">${o}</span>`).join('')}</td>`).join('')
 }</tr></table>` : ''

 // Generate sections for each question type
 let sectionsHtml = ''
 let qNumber = 1

 questionTypes.forEach(type => {
 const qs = selections[type.value] || []
 if (qs.length === 0) return

 const typeMarks = qs.reduce((s,q) => s + (q.marks || 1), 0)

 sectionsHtml += `
 <div class="section">
 <table class="q-head-row"><tr>
 <td class="qnum-cell">${qs[0].marks}×${qs.length}=${typeMarks}</td>
 <td class="qtext-cell${isDual?' dual-head':''}">
 ${isDual?`<span class="ur-h">سوال نمبر ${qNumber}: ${type.labelUrdu || type.label}</span>`:''}
 <span class="en-h">Q.${qNumber}: ${type.label}</span>
 </td>
 </tr></table>
 <table class="q-table">${qs.map((q,i)=>`
 <tr class="q-row">
 <td class="q-num">${i+1}.</td>
 <td class="q-body">${renderQuestionBody(q, type.value)}</td>
 </tr>`).join('')}</table>
 </div>`
 
 qNumber++
 })

 const answerHtml = pAnswers && selMCQ.length > 0 ? `
 <div style="page-break-before:always;padding:20px">
 <h3 style="text-align:center;margin-bottom:12px">ANSWER KEY (MCQs)</h3>
 <table border="1" style="width:100%;border-collapse:collapse;font-size:10pt">
 <tr>${selMCQ.map((_,i)=>`<td style="padding:4px 8px;text-align:center">${i+1}</td>`).join('')}</tr>
 <tr>${selMCQ.map(q=>`<td style="padding:4px 8px;text-align:center;font-weight:bold">${q.answer||'—'}</td>`).join('')}</tr>
 </table>
 </div>` : ''

 return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:14mm 12mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans',Arial,sans-serif;font-size:${engFS}pt;color:${fontColor.toLowerCase()};line-height:${lineH};background:#fff}
.urdu,.ur-h,.urd-col{font-family:'Noto Nastaliq Urdu',serif;font-size:${urduFS}pt;direction:rtl}
.school-hdr{text-align:center;padding-bottom:8px;margin-bottom:8px;border-bottom:2px solid #333}
.s-name{font-size:20pt;font-weight:bold;color:#cc0000}
.s-addr{font-size:9pt;margin-top:2px}
.info-table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:9pt}
.info-table td{border:${bdr};border:1px solid #333;padding:4px 8px}
.bubble-table{width:100%;margin-bottom:8px;border:1px solid #333}
.brow{padding:3px 6px;white-space:nowrap;display:inline-flex;align-items:center;gap:3px}
.bnum{font-size:8pt;min-width:18px}
.bub{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;border:1px solid #333;font-size:7pt}
.section{margin-bottom:12px}
.q-head-row{width:100%;border-collapse:collapse;margin-bottom:6px}
.q-head-row td{padding:4px 8px;border-bottom:1.5px solid #333;font-weight:bold;font-size:${engFS}pt}
.qnum-cell{width:80px;color:#555}
.dual-head{display:flex;justify-content:space-between}
.ur-h{font-family:'Noto Nastaliq Urdu',serif;font-size:${urduFS}pt;direction:rtl}
.en-h{font-size:${engFS}pt}
.q-table{width:100%;border-collapse:collapse}
.q-row{}
.q-num{padding:4px 6px;vertical-align:top;font-weight:bold;white-space:nowrap;width:24px;font-size:${engFS}pt}
.q-body{padding:4px 8px 8px;vertical-align:top}
.dual-q{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.eng-col{font-size:${engFS}pt}
.urd-col{font-size:${urduFS}pt;font-family:'Noto Nastaliq Urdu',serif;text-align:right}
.opts{display:flex;flex-wrap:wrap;gap:6px 20px;margin-top:4px;font-size:${engFS-1}pt}
.opt{}
.blank-line{border-bottom:1px solid #aaa;margin-top:18px;height:22px}
/*  New type renderers  */
.q-blank{display:inline-block;border-bottom:1.5px solid #333;min-width:70px;vertical-align:bottom;margin:0 3px}
.tf-row{display:flex;align-items:center;gap:10px;padding:2px 0}
.tf-box{display:inline-block;width:22px;height:22px;border:1.5px solid #333;flex-shrink:0;vertical-align:middle}
.match-table{border-collapse:collapse;width:100%;margin-top:6px}
.col-th{padding:5px 8px;background:#f5f5f5;border:1px solid #ccc;font-weight:bold;font-size:${engFS}pt}
.col-a-cell,.col-b-cell{padding:5px 8px;border:1px solid #ccc;font-size:${engFS}pt}
.col-b-cell{background:#fafafa}
.wj-table{border-collapse:collapse;width:65%;margin:4px auto;direction:rtl}
.wj-th{padding:6px 10px;background:#f5f5f5;border:1px solid #ccc;font-weight:bold;text-align:right}
.wj-cell{padding:6px 10px;border:1px solid #ccc;text-align:right;min-width:90px}
.wj-blank{min-width:110px;background:#fff}
.wblank-row{display:flex;align-items:flex-end;gap:16px;direction:rtl;padding:3px 0}
.wblank-line{flex:1;border-bottom:1px solid #555;min-width:90px;height:18px;display:inline-block}
.su-table{border-collapse:collapse;width:100%;margin-top:6px}
.su-th{padding:6px 10px;background:#f5f5f5;border:1px solid #ccc;font-weight:bold;text-align:right}
.su-word{padding:6px 10px;border:1px solid #ccc;text-align:right;min-width:90px;font-weight:bold}
.su-blank{padding:6px 10px;border:1px solid #ccc;min-width:200px;background:#fefefe}
.comp-passage{border:1.5px solid #888;padding:10px 14px;border-radius:4px;background:#fafafa;margin-bottom:12px;line-height:2}
.comp-q{margin-bottom:10px;padding-left:6px}
.diagram-box{border:1.5px dashed #aaa;width:80%;min-height:110px;margin:10px auto;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:10pt}
</style></head><body>
<div class="school-hdr">
 <div class="s-name">${sName}</div>
 <div class="s-addr">${sAddr}</div>
</div>
<table class="info-table">
 <tr>
 <td>Student Name: ________________________</td>
 <td>Roll Num: _______________</td>
 <td>Class Name: <b>${clsLbl}</b></td>
 <td>Paper Code: _______________</td>
 </tr>
 <tr>
 <td>Subject Name: <b>${subjName}</b></td>
 <td>Time Allowed: _______________</td>
 <td>Total Marks: <b>${totalM}</b></td>
 <td>Exam Date: _______________</td>
 </tr>
 ${pSyllabus ? `<tr><td colspan="4">Exam Syllabus: ${chaps}</td></tr>` : ''}
</table>
${bubbleHtml}
${sectionsHtml}${answerHtml}
<`+'scr'+'ipt>window.onload=()=>setTimeout(()=>window.print(),300)<\/scr'+'ipt>'+`
</body></html>`
}

function openPrint(params) {
 const html = buildPaperHTML(params)
 const w = window.open('', '_blank', 'width=900,height=700')
 if (w) { w.document.write(html); w.document.close() }
}

//  Small shared UI 
const GCard = ({ children, style={} }) => (
 <div className="super-module-card" style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:20, ...style }}>{children}</div>
)

const Breadcrumb = ({ items=[], onBack }) => (
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
 {onBack && (
 <button onClick={onBack} style={{ background:'rgba(11,44,77,0.6)', border:`1px solid ${C.border}`, color:C.silver, padding:'6px 14px', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:13 }}>← Go Back</button>
 )}
 <div className="super-module-card" style={{ color:C.muted, fontSize:13 }}>
 {items.map((it,i) => (
 <span key={i}>
 {i>0 && <span style={{ margin:'0 5px' }}>/</span>}
 <span style={{ color: i===items.length-1 ? C.silver : C.muted }}>{it}</span>
 </span>
 ))}
 </div>
 </div>
)

const SelectionCard = ({ onClick, children, style={} }) => (
 <div onClick={onClick} style={{
 background:C.card, border:`1px solid ${C.border}`, borderRadius:12,
 cursor:'pointer', overflow:'hidden', transition:'border-color 0.15s',
 ...style,
 }} onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold}
 onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
 {children}
 </div>
)

const Arrow = () => (
 <div className="super-module-card" style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#071e34', fontWeight:900, fontSize:16, flexShrink:0 }}>›</div>
)

//  Step 0: Syllabus 
function SyllabusStep({ onSelect }) {
 return (
 <div>
 <Breadcrumb items={['Select Syllabus']} />
 <div className="super-module-card" style={{ display:'flex', gap:20, flexWrap:'wrap', justifyContent:'center', marginTop:30 }}>
 {SYLLABUSES.map(s => (
 <SelectionCard key={s.id} onClick={() => onSelect(s.id)} style={{ width:200, textAlign:'center', padding:'32px 20px' }}>
 <div className="super-module-card" style={{ fontSize:48, marginBottom:12 }}></div>
 <div className="super-module-card" style={{ color:C.gold, fontWeight:800, fontSize:20, marginBottom:4 }}>{s.label}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:13, marginBottom:16 }}>{s.sub}</div>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'center' }}><Arrow /></div>
 </SelectionCard>
 ))}
 </div>
 </div>
 )
}

//  Step 1: Class 
function ClassStep({ syllabusId, onSelect, onBack }) {
 const sLabel = syllabusId === 'ptb' ? 'PTB' : 'Afaq SNC'
 return (
 <div>
 <Breadcrumb items={[sLabel, 'Select Class']} onBack={onBack} />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, maxWidth:640 }}>
 {PTS_CLASSES.map(cls => (
 <SelectionCard key={cls.value} onClick={() => onSelect(cls.value)} style={{ textAlign:'center', padding:'18px 12px' }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:800, fontSize:18, marginBottom:4 }}>{cls.label}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11, marginBottom:10 }}>{sLabel}</div>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'center' }}><Arrow /></div>
 </SelectionCard>
 ))}
 </div>
 </div>
 )
}

//  Step 2: Subject 
function SubjectStep({ classVal, subjects, syllabusId, onSelect, onBack }) {
 const clsLbl = classLabel(classVal)
 const sLabel = syllabusId === 'ptb' ? 'PTB' : 'Afaq SNC'

 if (subjects.length === 0) {
 return (
 <div>
 <Breadcrumb items={[sLabel, clsLbl, 'Select Subject']} onBack={onBack} />
 <GCard style={{ textAlign:'center', padding:50 }}>
 <div className="super-module-card" style={{ fontSize:48, marginBottom:16 }}></div>
 <div className="super-module-card" style={{ color:C.silver, fontWeight:600, marginBottom:8 }}>No subjects for Class {clsLbl}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:13 }}>Add subjects & questions via <strong style={{color:C.gold}}>Paper Generator → Question Bank</strong></div>
 </GCard>
 </div>
 )
 }

 return (
 <div>
 <Breadcrumb items={[sLabel, clsLbl, 'Select Subject']} onBack={onBack} />
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:14 }}>
 {subjects.map((sub, i) => {
 const color = SUBJ_COLORS[i % SUBJ_COLORS.length]
 return (
 <SelectionCard key={sub.id} onClick={() => onSelect(sub)}>
 <div className="super-module-card" style={{ height:90, background:`linear-gradient(135deg,${color},${color}bb)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>
 {subjIcon(sub.name)}
 </div>
 <div className="super-module-card" style={{ padding:'12px 14px' }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{sub.name}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11, marginTop:2 }}>{sub.publisher || sLabel} {clsLbl}</div>
 <div className="super-module-card" style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}><Arrow /></div>
 </div>
 </SelectionCard>
 )
 })}
 </div>
 </div>
 )
}

//  Step 3: Chapters 
function ChaptersStep({ classVal, subject, chapters, selChaps, setSelChaps, syllabusId, onBack, onNext }) {
 const clsLbl = classLabel(classVal)
 const sLabel = syllabusId === 'ptb' ? 'PTB' : 'Afaq SNC'
 const allSel = chapters.length > 0 && chapters.every(c => selChaps.has(c))

 const toggleAll = () => setSelChaps(allSel ? new Set() : new Set(chapters))
 const toggleChap = ch => setSelChaps(prev => { const n=new Set(prev); n.has(ch)?n.delete(ch):n.add(ch); return n })

 return (
 <div>
 <Breadcrumb items={[sLabel, clsLbl, subject?.name, 'Select Chapters']} onBack={onBack} />
 <GCard>
 {/* Select All */}
 <label style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, cursor:'pointer', color:C.silver, fontWeight:600 }}>
 <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ width:15, height:15, accentColor:C.gold }} />
 SELECT ALL CHAPTERS
 <span style={{ color:C.muted, fontWeight:400, fontSize:13, marginLeft:8 }}>{selChaps.size}/{chapters.length} selected</span>
 </label>

 {chapters.length === 0 ? (
 <div className="super-module-card" style={{ color:C.muted, fontSize:13, textAlign:'center', padding:20 }}>
 No chapters found. Add questions with chapter names in Question Bank, then they appear here.
 </div>
 ) : (
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
 {chapters.map((ch, i) => {
 const on = selChaps.has(ch)
 return (
 <label key={ch} style={{
 display:'flex', alignItems:'flex-start', gap:10, padding:'12px 14px', borderRadius:10, cursor:'pointer',
 background: on ? 'rgba(200,153,26,0.1)' : 'rgba(15,23,42,0.46)',
 border: `1px solid ${on ? C.gold : C.border}`, transition:'all 0.12s',
 }}>
 <input type="checkbox" checked={on} onChange={() => toggleChap(ch)} style={{ marginTop:2, width:15, height:15, accentColor:C.gold }} />
 <div>
 <div className="super-module-card" style={{ color: on ? C.gold : C.silver, fontWeight:600, fontSize:13 }}>
 CHAP {i+1}: {ch}
 </div>
 </div>
 </label>
 )
 })}
 </div>
 )}

 <div className="super-module-card" style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
 <button onClick={onNext} style={{ padding:'11px 28px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', fontSize:14 }}>
 Select Questions →
 </button>
 </div>
 </GCard>
 </div>
 )
}

//  Step 4: Question Selection 
function QuestionsStep({
 classVal, subject, chapters, syllabusId, selChaps, questionTypes=[],
 qType, setQType, priority, setPriority, medium, setMedium,
 required, setRequired, ignore, setIgnore, qMarks, setQMarks,
 blankLines, setBlankLines, perLine2, setPerLine2, longParts, setLongParts,
 searched, poolQ, selections,
 onSearch, onRandomSelect, onAddQuestions, onNext, onBack,
}) {
 const clsLbl = classLabel(classVal)
 const sLabel = syllabusId === 'ptb' ? 'PTB' : 'Afaq SNC'
 const isUrdu = medium === 'URDU MEDIUM'
 const isDual = medium === 'DUAL MEDIUM'

 const currentSel = selections[qType] || []
 const totalAll = Object.values(selections).reduce((acc, curr) => acc + curr.length, 0)

 const Inp2 = (props) => (
 <input {...props} style={{ width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`, borderRadius:8, color:C.silver, padding:'7px 10px', fontSize:13, outline:'none', ...props.style }} />
 )
 const Sel2 = ({ children, ...props }) => (
 <select {...props} style={{ width:'100%', background:'#0a1e35', border:`1px solid ${C.border}`, borderRadius:8, color:C.silver, padding:'7px 10px', fontSize:13, outline:'none', cursor:'pointer', ...props.style }}>
 {children}
 </select>
 )

 return (
 <div>
 <Breadcrumb items={[sLabel, clsLbl, subject?.name, 'Select Questions']} onBack={onBack} />

 {/* Header: book cover + selected chapters */}
 <GCard style={{ marginBottom:14, padding:'12px 18px' }}>
 <div className="super-module-card" style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
 <div className="super-module-card" style={{ width:60, height:72, borderRadius:8, background:`linear-gradient(135deg,${SUBJ_COLORS[0]},${SUBJ_COLORS[3]})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
 {subjIcon(subject?.name)}
 </div>
 <div className="super-module-card" style={{ flex:1 }}>
 <div className="super-module-card" style={{ color:'#fff', fontWeight:700, fontSize:15 }}>Select Your Questions Here… {clsLbl} - {subject?.name}</div>
 <div className="super-module-card" style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
 {[...selChaps].slice(0,6).map(ch => (
 <span key={ch} style={{ padding:'3px 10px', borderRadius:20, background:'rgba(148,163,184,0.18)', border:`1px solid rgba(200,153,26,0.3)`, color:C.gold, fontSize:11 }}> {ch}</span>
 ))}
 {selChaps.size > 6 && <span style={{ color:C.muted, fontSize:11 }}>+{selChaps.size-6} more</span>}
 </div>
 </div>
 </div>
 </GCard>

 <GCard style={{ marginBottom:14 }}>
 {/* Filter row */}
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:10, marginBottom:12 }}>
 <Sel2 value={qType} onChange={e=> {
 const val = e.target.value
 setQType(val)
 const typeObj = questionTypes.find(t => t.value === val)
 if (typeObj) setQMarks(typeObj.marks || 1)
 }}>
 {questionTypes.map(t=><option key={t.value} value={t.value} style={{background:'#0a1e35'}}>{t.label}</option>)}
 </Sel2>
 <Sel2 value={priority} onChange={e=>setPriority(e.target.value)}>
 {PRIORITIES.map(p=><option key={p.value} value={p.value} style={{background:'#0a1e35'}}>{p.label}</option>)}
 </Sel2>
 <Sel2 value={medium} onChange={e=>setMedium(e.target.value)}>
 {MEDIUMS.map(m=><option key={m} value={m} style={{background:'#0a1e35'}}>{m}</option>)}
 </Sel2>
 <button onClick={onSearch} style={{ padding:'8px 22px', borderRadius:9, border:'none', background:'#1b5e20', color:'#fff', fontWeight: 600, cursor:'pointer', whiteSpace:'nowrap', fontSize:14 }}>
  SEARCH
 </button>
 </div>

 {/* Controls row */}
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:10 }}>
 <div><label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>Required Questions *</label><Inp2 type="number" value={required} onChange={e=>setRequired(e.target.value)} min={0} /></div>
 <div><label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>Ignore Questions</label><Inp2 type="number" value={ignore} onChange={e=>setIgnore(e.target.value)} min={0} /></div>
 <div><label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>Each Q Marks *</label><Inp2 type="number" value={qMarks} onChange={e=>setQMarks(e.target.value)} min={1} /></div>
 <div><label style={{ color:C.muted, fontSize:11, display:'block', marginBottom:4 }}>Blank Lines</label><Inp2 type="number" value={blankLines} onChange={e=>setBlankLines(e.target.value)} min={0} /></div>
 </div>
 <div className="super-module-card" style={{ display:'flex', gap:20, alignItems:'center' }}>
 <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:C.silver, fontSize:13 }}>
 <input type="checkbox" checked={perLine2} onChange={e=>setPerLine2(e.target.checked)} style={{ accentColor:C.gold }} />
 2 Questions Per Line
 </label>
 <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:C.silver, fontSize:13 }}>
 <input type="checkbox" checked={longParts} onChange={e=>setLongParts(e.target.checked)} style={{ accentColor:C.gold }} />
 Long Questions Parts
 </label>
 {searched && (
 <span style={{ marginLeft:'auto', color:C.muted, fontSize:13 }}>
 Selected: <strong style={{ color:C.gold }}>{currentSel.length}</strong> Question(s) From <strong style={{ color:C.silver }}>{poolQ.length}</strong>
 </span>
 )}
 </div>
 </GCard>

 {/* Questions Pool */}
 {searched && (
 <GCard style={{ marginBottom:14, maxHeight:420, overflowY:'auto', padding:0 }}>
 {poolQ.length === 0 ? (
 <div className="super-module-card" style={{ padding:32, textAlign:'center', color:C.muted }}>No questions found for the selected filters.</div>
 ) : (
 <table style={{ width:'100%', borderCollapse:'collapse' }}>
 <tbody>
 {poolQ.map((q, i) => {
 const inSel = currentSel.some(s=>s.id===q.id)
 return (
 <tr key={q.id} style={{ background: inSel ? 'rgba(200,153,26,0.08)' : i%2===0?'transparent':'rgba(11,44,77,0.2)', borderBottom:`1px solid rgba(200,153,26,0.07)` }}>
 <td style={{ padding:'10px 14px', width:40, color:C.muted, fontSize:12, fontWeight:700 }}>{i+1}.</td>
 <td style={{ padding:'10px 14px' }}>
 {isDual ? (
 <div className="super-module-card" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
 <div className="super-module-card" style={{ color:C.silver, fontSize:13 }}>{q.text}</div>
 <div className="super-module-card" style={{ color:C.silver, fontSize:13, direction:'rtl', fontFamily:'Noto Nastaliq Urdu,serif' }}>{q.textUrdu||q.text}</div>
 </div>
 ) : isUrdu ? (
 <div className="super-module-card" style={{ color:C.silver, fontSize:13, direction:'rtl', fontFamily:'Noto Nastaliq Urdu,serif' }}>{q.textUrdu||q.text}</div>
 ) : (
 <div className="super-module-card" style={{ color:C.silver, fontSize:13 }}>{q.text}</div>
 )}
 {q.type==='mcq' && q.options?.length > 0 && (
 <div className="super-module-card" style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
 {q.options.map((opt,j)=>(
 <span key={j} style={{ color:C.muted, fontSize:12 }}><b style={{ color:C.gold }}>({['A','B','C','D'][j]})</b> {opt.text || opt}</span>
 ))}
 </div>
 )}
 </td>
 <td style={{ padding:'10px 14px', width:60, textAlign:'center' }}>
 {inSel ? (
 <span style={{ color:C.green, fontSize:11, fontWeight:700 }}> Added</span>
 ) : (
 <span style={{ color:C.muted, fontSize:11 }}>—</span>
 )}
 </td>
 </tr>
 )
 })}
 </tbody>
 </table>
 )}
 </GCard>
 )}

 {/* Action buttons */}
 {searched && poolQ.length > 0 && (
 <div className="super-module-card" style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
 <button onClick={onRandomSelect} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:'#c62828', color:'#fff', fontWeight: 600, cursor:'pointer', fontSize:14 }}>
 RANDOM SELECT ›
 </button>
 <button onClick={onAddQuestions} style={{ flex:1, padding:'12px', borderRadius:10, border:'none', background:'#1565C0', color:'#fff', fontWeight: 600, cursor:'pointer', fontSize:14 }}>
 ADD QUESTION'S ›
 </button>
 </div>
 )}

 {/* Selection summary */}
 {totalAll > 0 && (
 <GCard style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
 <div className="super-module-card" style={{ display:'flex', gap:16, flexWrap: 'wrap' }}>
 {questionTypes.map(type => {
 const count = (selections[type.value] || []).length
 if (count === 0) return null
 return (
 <div key={type.value} style={{ textAlign:'center' }}>
 <div className="super-module-card" style={{ fontSize:20, fontWeight:800, color: type.value === 'mcq' ? C.blue : type.value === 'short' ? C.orange : C.gold }}>{count}</div>
 <div className="super-module-card" style={{ color:C.muted, fontSize:11 }}>{type.label}</div>
 </div>
 )
 })}
 </div>
 <button onClick={onNext} style={{ padding:'11px 26px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', fontWeight: 600, cursor:'pointer', fontSize:14 }}>
 Generate Paper →
 </button>
 </GCard>
 )}
 </div>
 )
}

//  Step 5: Preview & Print 
function PreviewStep({
 selections, questionTypes, subject, classVal, medium, selChaps,
 lineH, setLineH, urduFS, setUrduFS, engFS, setEngFS,
 fontBold, setFontBold, fontColor, setFontColor, borderSt, setBorderSt,
 pSyllabus, setPSyllabus, pBubble, setPBubble, pAnswers, setPAnswers,
 onBack, onCancel, paperSettings,
}) {
 const [iframeSrc, setIframeSrc] = useState('')

 const paperParams = useMemo(() => ({
 selections, questionTypes, subject, classVal, medium,
 pBubble, pSyllabus, pAnswers, chapNames: selChaps,
 lineH, urduFS, engFS, fontBold, fontColor, borderSt, paperSettings,
 }), [selections, questionTypes, subject, classVal, medium, pBubble, pSyllabus, pAnswers, selChaps, lineH, urduFS, engFS, fontBold, fontColor, borderSt, paperSettings])

 useEffect(() => {
 const html = buildPaperHTML(paperParams)
 const blob = new Blob([html], { type:'text/html' })
 const url = URL.createObjectURL(blob)
 setIframeSrc(url)
 return () => URL.revokeObjectURL(url)
 }, [paperParams])

 const Sel3 = ({ children, value, onChange }) => (
 <select value={value} onChange={onChange} style={{ background:'#0a1e35', border:`1px solid ${C.border}`, borderRadius:6, color:C.silver, padding:'4px 8px', fontSize:12, outline:'none', cursor:'pointer' }}>
 {children}
 </select>
 )
 const Num3 = ({ value, onChange }) => (
 <input type="number" value={value} onChange={onChange} style={{ width:52, background:'#0a1e35', border:`1px solid ${C.border}`, borderRadius:6, color:C.silver, padding:'4px 6px', fontSize:12, outline:'none', textAlign:'center' }} />
 )
 const SideItem = ({ icon, label, onClick, color=C.silver }) => (
 <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 16px', cursor:'pointer', color, fontSize:13, fontWeight:600, borderBottom:`1px solid rgba(200,153,26,0.1)`, transition:'background 0.12s' }}
 onMouseEnter={e=>e.currentTarget.style.background='rgba(200,153,26,0.08)'}
 onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
 <span>{icon}</span>{label}
 </div>
 )

 return (
 <div className="super-module-card" style={{ display:'flex', height:'calc(100vh - 180px)', minHeight:600, borderRadius:14, overflow:'hidden', border:`1px solid ${C.border}` }}>

 {/*  Left sidebar  */}
 <div className="super-module-card" style={{ width:200, background:'#061525', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flexShrink:0 }}>
 <div className="super-module-card" style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, color:C.gold, fontWeight:700, fontSize:13 }}>
 ≡ Question's Menu
 </div>
 <div className="super-module-card" style={{ padding:'8px 0', color:C.muted, fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', paddingLeft:16 }}>Paper Options</div>
 <SideItem icon="EDIT" label="Manual Editing" onClick={() => alert('Click inside the preview to edit — or regenerate from previous steps.')} />
 <SideItem icon="" label="Print Paper Single" onClick={() => openPrint(paperParams)} color={C.gold} />
 <SideItem icon="" label="Print Paper Double" onClick={() => openPrint({ ...paperParams, doubleSided:true })} />
 <SideItem icon="" label="Print Paper Half" onClick={() => openPrint({ ...paperParams, halfSize:true })} />
 <div className="super-module-card" style={{ flex:1 }} />
 <SideItem icon="" label="Save Paper" onClick={() => {
 const name = prompt('Enter Paper Name:', `${subject?.name} - ${classLabel(classVal)}`)
 if (!name) return
 const saved = usePaperStore().savePaper({
 name,
 config: { subject: subject?.name, classLevel: classVal, medium },
 selectedQuestions: selections,
 settings: { lineH, urduFS, engFS, fontBold, fontColor, borderSt }
 })
 if (saved) {
 alert('Paper saved successfully!')
 } else {
 alert('Failed to save paper: Storage limit reached.')
 }
 }} color={C.green} />

 <SideItem icon="" label="Cancel Paper" onClick={onCancel} color={C.red} />
 </div>

 {/*  Right: toolbar + preview  */}
 <div className="super-module-card" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

 {/* Top toolbar */}
 <div className="super-module-card" style={{ background:'#0a1a2e', borderBottom:`1px solid ${C.border}`, padding:'8px 14px', display:'flex', gap:14, flexWrap:'wrap', alignItems:'center' }}>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 Line Height <Num3 value={lineH} onChange={e=>setLineH(e.target.value)} />
 </label>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 Urdu Font Size <Num3 value={urduFS} onChange={e=>setUrduFS(e.target.value)} />
 </label>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 English Font Size <Num3 value={engFS} onChange={e=>setEngFS(e.target.value)} />
 </label>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 Font Bold
 <Sel3 value={fontBold} onChange={e=>setFontBold(e.target.value)}>
 {['Normal','Bold'].map(v=><option key={v} value={v} style={{background:'#0a1e35'}}>{v}</option>)}
 </Sel3>
 </label>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 Font Color
 <Sel3 value={fontColor} onChange={e=>setFontColor(e.target.value)}>
 {['Black','Blue','Dark Blue'].map(v=><option key={v} value={v} style={{background:'#0a1e35'}}>{v}</option>)}
 </Sel3>
 </label>
 <label style={{ color:C.muted, fontSize:11, display:'flex', alignItems:'center', gap:5 }}>
 Border Style
 <Sel3 value={borderSt} onChange={e=>setBorderSt(e.target.value)}>
 {['No Border','Thin Border','Full Border'].map(v=><option key={v} value={v} style={{background:'#0a1e35'}}>{v}</option>)}
 </Sel3>
 </label>
 <div className="super-module-card" style={{ marginLeft:'auto', display:'flex', gap:8 }}>
 <button onClick={onBack} style={{ padding:'6px 14px', borderRadius:8, border:`1px solid ${C.border}`, background:'rgba(11,44,77,0.92)', color:C.silver, cursor:'pointer', fontSize:12 }}>← Back</button>
 <button onClick={() => openPrint(paperParams)} style={{ padding:'6px 18px', borderRadius:8, border:'none', background:'#1b5e20', color:'#fff', fontWeight: 600, cursor:'pointer', fontSize:13 }}> Print Paper</button>
 </div>
 </div>

 {/* Checkboxes bar */}
 <div className="super-module-card" style={{ background:'#0d1f32', borderBottom:`1px solid ${C.border}`, padding:'6px 14px', display:'flex', gap:20 }}>
 {[
 { label:'Print Exam Syllabus', val:pSyllabus, set:setPSyllabus },
 { label:'Print Bubble Sheet', val:pBubble, set:setPBubble },
 { label:'Print Answer Keys', val:pAnswers, set:setPAnswers },
 ].map(cb => (
 <label key={cb.label} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', color:C.silver, fontSize:12 }}>
 <input type="checkbox" checked={cb.val} onChange={e=>cb.set(e.target.checked)} style={{ accentColor:C.gold }} />
 {cb.label}
 </label>
 ))}
 </div>

 {/* Paper Preview iframe */}
 <iframe
 src={iframeSrc}
 style={{ flex:1, border:'none', background:'white' }}
 title="Paper Preview"
 />
 </div>
 </div>
 )
}

//  Main Wizard Component 
export default function BuildPaperWizard({ paperSettings }) {
 const { subjects, questions, getChaptersForSubject, questionTypes } = usePaperStore()

 const [step, setStep] = useState(0)
 const [syllabusId, setSyllabusId] = useState(null)
 const [classVal, setClassVal] = useState(null)
 const [subject, setSubject] = useState(null)
 const [chapters, setChapters] = useState([])
 const [selChaps, setSelChaps] = useState(new Set())

 const [qType, setQType] = useState(questionTypes[0]?.value || 'mcq')
 const [priority, setPriority] = useState('all')
 const [medium, setMedium] = useState('DUAL MEDIUM')
 const [required, setRequired] = useState(10)
 const [ignore, setIgnore] = useState(0)
 const [qMarks, setQMarks] = useState(1)
 const [blankLines, setBlankLines] = useState(0)
 const [perLine2, setPerLine2] = useState(true)
 const [longParts, setLongParts] = useState(false)
 const [searched, setSearched] = useState(false)
 const [poolQ, setPoolQ] = useState([])

 const [selections, setSelections] = useState({}) // { [typeValue]: [questions] }

 const [lineH, setLineH] = useState(1.5)
 const [urduFS, setUrduFS] = useState(12)
 const [engFS, setEngFS] = useState(11)
 const [fontBold, setFontBold] = useState('Normal')
 const [fontColor, setFontColor] = useState('Black')
 const [borderSt, setBorderSt] = useState('No Border')
 const [pSyllabus, setPSyllabus] = useState(true)
 const [pBubble, setPBubble] = useState(true)
 const [pAnswers, setPAnswers] = useState(false)

 const classSubjects = useMemo(() =>
 classVal ? subjects.filter(s => !s.classLevel || classLevelsMatch(s.classLevel, classVal)) : [],
 [subjects, classVal]
 )

 function doSearch() {
 const pool = questions.filter(q => {
 const sub = subjects.find(s => s.id === q.subjectId)
 if (!sub || sub.name !== subject?.name || !classLevelsMatch(sub.classLevel, classVal)) return false
 if (q.type !== qType) return false
 if (selChaps.size > 0 && q.chapter && !selChaps.has(q.chapter)) return false
 if (priority !== 'all' && q.priority !== priority) return false
 return true
 })
 setPoolQ(pool); setSearched(true)
 }

 function randomSelect() {
 const shuffled = [...poolQ].sort(() => Math.random() - 0.5)
 const picked = shuffled.slice(Number(ignore)||0, (Number(ignore)||0)+(Number(required)||10))
 .map(q => ({ ...q, marks: Number(qMarks)||1, blankLines: Number(blankLines)||0 }))
 
 setSelections(prev => ({
 ...prev,
 [qType]: picked
 }))
 }

 function addQuestions() {
 const wm = poolQ.map(q => ({ ...q, marks: Number(qMarks)||1, blankLines: Number(blankLines)||0 }))
 const dedup = (a=[], b) => [...new Map([...a,...b].map(q=>[q.id,q])).values()]
 
 setSelections(prev => ({
 ...prev,
 [qType]: dedup(prev[qType], wm)
 }))
 }

 function cancelPaper() {
 setStep(0); setClassVal(null); setSubject(null)
 setSelections({})
 setSearched(false); setPoolQ([])
 }

 //  Renders 
 if (step === 0) return <SyllabusStep onSelect={s => { setSyllabusId(s); setStep(1) }} />

 if (step === 1) return (
 <ClassStep syllabusId={syllabusId} onBack={() => setStep(0)}
 onSelect={c => { setClassVal(c); setSubject(null); setStep(2) }} />
 )

 if (step === 2) return (
 <SubjectStep classVal={classVal} subjects={classSubjects} syllabusId={syllabusId}
 onBack={() => setStep(1)}
 onSelect={sub => {
 setSubject(sub)
 const ch = getChaptersForSubject(sub.name, classVal)
 setChapters(ch); setSelChaps(new Set(ch))
 setSearched(false); setPoolQ([])
 setStep(3)
 }} />
 )

 if (step === 3) return (
 <ChaptersStep classVal={classVal} subject={subject} chapters={chapters}
 selChaps={selChaps} setSelChaps={setSelChaps}
 syllabusId={syllabusId} onBack={() => setStep(2)} onNext={() => setStep(4)} />
 )

 if (step === 4) return (
 <QuestionsStep
 classVal={classVal} subject={subject} chapters={chapters}
 syllabusId={syllabusId} selChaps={selChaps}
 questionTypes={questionTypes}
 qType={qType} setQType={setQType}
 priority={priority} setPriority={setPriority}
 medium={medium} setMedium={setMedium}
 required={required} setRequired={setRequired}
 ignore={ignore} setIgnore={setIgnore}
 qMarks={qMarks} setQMarks={setQMarks}
 blankLines={blankLines} setBlankLines={setBlankLines}
 perLine2={perLine2} setPerLine2={setPerLine2}
 longParts={longParts} setLongParts={setLongParts}
 searched={searched} poolQ={poolQ}
 selections={selections}
 onSearch={doSearch} onRandomSelect={randomSelect} onAddQuestions={addQuestions}
 onBack={() => setStep(3)} onNext={() => setStep(5)}
 />
 )

 if (step === 5) return (
 <PreviewStep
 selections={selections}
 questionTypes={questionTypes}
 subject={subject} classVal={classVal} medium={medium} selChaps={selChaps}
 lineH={lineH} setLineH={setLineH}
 urduFS={urduFS} setUrduFS={setUrduFS}
 engFS={engFS} setEngFS={setEngFS}
 fontBold={fontBold} setFontBold={setFontBold}
 fontColor={fontColor} setFontColor={setFontColor}
 borderSt={borderSt} setBorderSt={setBorderSt}
 pSyllabus={pSyllabus} setPSyllabus={setPSyllabus}
 pBubble={pBubble} setPBubble={setPBubble}
 pAnswers={pAnswers} setPAnswers={setPAnswers}
 onBack={() => setStep(4)} onCancel={cancelPaper}
 paperSettings={paperSettings}
 />
 )

 return null
}
