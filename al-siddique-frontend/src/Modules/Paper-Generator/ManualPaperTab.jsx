import { useEffect, useMemo, useState } from 'react'
import { usePaperStore } from './usePaperStore'
import { classLevelsMatch, useAcademicStore } from '../../services/useAcademicStore'
import { buildManualPaperTitle, parseManualPaperDraftPair } from './manualPaperParser'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'

const C = {
  card:'rgba(11,44,77,0.97)', gold:'#C8991A', goldL:'#e8b420',
  silver:'#C0C8D8', muted:'#8892A4', blue:'#0A84FF', green:'#30D158',
  border:'rgba(148,163,184,0.18)',
}

const fieldStyle = {
  width:'100%', background:'rgba(11,44,77,0.7)', border:`1px solid ${C.border}`,
  borderRadius:10, color:C.silver, padding:'10px 12px', fontSize:13,
  outline:'none', boxSizing:'border-box',
}

const Input = ({ label, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{label}</div>}
    {children || <input {...props} style={fieldStyle} />}
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    {label && <div style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{label}</div>}
    <select {...props} style={{ ...fieldStyle, cursor:'pointer' }}>{children}</select>
  </div>
)

const SECTION_HELP = [
  'Headings are optional: MCQ, Short Questions, Long Questions, Objective, Part A/B/C are understood.',
  'Numbered questions and inline A/B/C/D options are accepted even without blank lines.',
  'Urdu board-paper style is accepted: Ø­ØµÛ Ø§ÙˆÙ‘Ù„/Ø¯ÙˆÙ…ØŒ Ù…Ø¹Ø±ÙˆØ¶ÛŒØŒ Ø§Ø´Ø¹Ø§Ø± Ú©ÛŒ ØªØ´Ø±ÛŒØ­ØŒ Ø®Ù„Ø§ØµÛØŒ Ù…Ø±Ú©Ø²ÛŒ Ø®ÛŒØ§Ù„ØŒ Ø¯Ø±Ø®ÙˆØ§Ø³ØªØŒ Ú©ÛØ§Ù†ÛŒ.',
  'English and Urdu can be pasted separately, then merged in Dual Medium preview.',
]

const URDU_BOARD_PLACEHOLDER = `Ø­ØµÛ Ù…Ø¹Ø±ÙˆØ¶ÛŒ
1- Ù„Ø§Ø²Ù…ÛŒ Ú©Ø§ Ù…ØªØ¶Ø§Ø¯ Ú©ÛŒØ§ ÛÛ’ØŸ (A) Ù†ÙÛŒ (B) Ø±Ø´ØªÛ (C) Ù…Ø±Ú†ÛŒÚº (D) Ú¯Ø±Ù… Ù…ØµØ§Ù„Ø­Û
2- Ø³Ù„ÛŒÙ… Ú©Ø§ Ú¯Ú¾Ø± Ø¬Ù†Ú¯Ù„Û” (A) Ù…ÛŒØ¯Ø§Ù† ÛÛ’ (B) Ø­Ø¶Ø±Øª Ù†Û’ (C) Ù…Ù†ØµÙˆØ¨Û’ (D) Ù…Ø§Úº Ù†Û’

Ø­ØµÛ Ø§ÙˆÙ‘Ù„
2- Ù…Ù†Ø¯Ø±Ø¬Û Ø°ÛŒÙ„ Ø§Ø´Ø¹Ø§Ø± Ú©ÛŒ ØªØ´Ø±ÛŒØ­ Ú©Ø±ÛŒÚºÛ”
(i) Ø­Ù‚ ØªÛŒØ±Ø§ Ø§Ø¯Ø§ Ú©Ø±Ù†Ø§ Ø¨Ù†Ø¯Û’ Ø³Û’ Ù…Ú¯Ø± ÛÙˆÚ¯Ø§ Ù†ÛÛŒÚº
(ii) ØªÛŒØ±ÛŒ Ø±Ø§Û Ù…ÛŒÚº Ø®Ø§Ú© ÛÙˆ Ø¬Ø§Ø¦ÛŒÚº Ù…Ú¯Ø± Ø³Ø± Ú©Ø± Ù†ÛÛŒÚº

4- Ú©ÙˆØ¦ÛŒ Ù¾Ø§Ù†Ú† Ø³ÙˆØ§Ù„Ø§Øª Ú©Û’ Ù…Ø®ØªØµØ± Ø¬ÙˆØ§Ø¨ Ø¯ÛŒØ¬Ø¦Û’Û”
(i) Ù…Ø±Ø§Ù‚Ø¨Û Ø®ØªÙ… Ú©ÛŒØ³Û’ ÛÙˆØ§ØŸ
(ii) Ù‚ÙˆÙ… Ú©ÛŒ Ø¨ÛØªØ±ÛŒ Ú©ÛŒØ³Û’ Ù…Ù…Ú©Ù† ÛÛ’ØŸ

Ø­ØµÛ Ø¯ÙˆÙ…
5- Ù…Ù†Ø¯Ø±Ø¬Û Ø°ÛŒÙ„ Ù…ÛŒÚº Ø³Û’ Ú©Ø³ÛŒ Ø§ÛŒÚ© Ú©Ø§ Ø®Ù„Ø§ØµÛ Ù„Ú©Ú¾ÛŒÚº: Ø§Ù…Ø§Ù†Øª / Ù¾Ù†Ø¬Ø§ÛŒØª
6- Ø´Ø§Ù…Ù„ Ù†ØµØ§Ø¨ Ù†Ø¸Ù… "Ø­Ù…Ø¯" Ú©Ø§ Ù…Ø±Ú©Ø²ÛŒ Ø®ÛŒØ§Ù„ Ø§Ù¾Ù†Û’ Ø§Ù„ÙØ§Ø¸ Ù…ÛŒÚº Ù„Ú©Ú¾ÛŒÚºÛ”`

const BOARD_SECTION_HELP = [
  'Headings are optional: MCQ, Short Questions, Long Questions, Objective, Part A/B/C are understood.',
  'Numbered questions and inline A/B/C/D options are accepted even without blank lines.',
  'Urdu board-paper style is accepted: objective MCQs, subjective sections, poetry explanation, summary, central idea, application, story, grammar.',
  'English and Urdu can be pasted separately, then merged in Dual Medium preview.',
]

const URDU_BOARD_PLACEHOLDER_CLEAN = `حصہ معروضی
1- لازمی کا متضاد کیا ہے؟ (A) نفی (B) رشتہ (C) مرچیں (D) گرم مصالحہ
2- سلیم کا گھر جنگل۔ (A) میدان ہے (B) حضرت نے (C) منصوبے (D) ماں نے

حصہ اوّل
2- مندرجہ ذیل اشعار کی تشریح کریں۔
(i) حق تیرا ادا کرنا بندے سے مگر ہوگا نہیں
(ii) تیری راہ میں خاک ہو جائیں مگر سر کر نہیں

4- کوئی پانچ سوالات کے مختصر جواب دیجئے۔
(i) مراقبہ ختم کیسے ہوا؟
(ii) قوم کی بہتری کیسے ممکن ہے؟

حصہ دوم
5- مندرجہ ذیل میں سے کسی ایک کا خلاصہ لکھیں: امانت / پنجایت
6- شامل نصاب نظم "حمد" کا مرکزی خیال اپنے الفاظ میں لکھیں۔`

export default function ManualPaperTab({ onProceedToPreview }) {
  const { subjects, paperSettings } = usePaperStore()
  const { activeClasses } = useAcademicStore()

  const [classLevel, setClassLevel] = useState(() => { try { return getTenantStorageItem('pg_manual_class', { migrateLegacy: true }) || '' } catch { return '' } })
  const [subject, setSubject] = useState(() => { try { return getTenantStorageItem('pg_manual_subject', { migrateLegacy: true }) || '' } catch { return '' } })
  const [publisher, setPublisher] = useState(() => { try { return getTenantStorageItem('pg_manual_publisher', { migrateLegacy: true }) || '' } catch { return '' } })
  const [title, setTitle] = useState(() => { try { return getTenantStorageItem('pg_manual_title', { migrateLegacy: true }) || '' } catch { return '' } })
  const [titleTouched, setTitleTouched] = useState(() => { try { return getTenantStorageItem('pg_manual_title_touched', { migrateLegacy: true }) === '1' } catch { return false } })
  const [contentMode, setContentMode] = useState(() => { try { return getTenantStorageItem('pg_manual_mode', { migrateLegacy: true }) || 'english' } catch { return 'english' } })
  const [content, setContent] = useState(() => { try { return getTenantStorageItem('pg_manual_content', { migrateLegacy: true }) || '' } catch { return '' } })
  const [urduContent, setUrduContent] = useState(() => { try { return getTenantStorageItem('pg_manual_urdu', { migrateLegacy: true }) || '' } catch { return '' } })
  const [previewCount, setPreviewCount] = useState(null)

  const publishers = useMemo(() => [...new Set(subjects.map(s => s.publisher).filter(Boolean))], [subjects])
  const subjectSuggestions = useMemo(() => {
    const byClass = classLevel ? subjects.filter(s => !s.classLevel || classLevelsMatch(s.classLevel, classLevel)) : subjects
    return [...new Set(byClass.map(s => s.name).filter(Boolean))]
  }, [subjects, classLevel])
  const classOptions = useMemo(() => {
    if (activeClasses?.length) return activeClasses
    return ['1','2','3','4','5','6','7','8','9','10'].map(level => ({ level, name: `Class ${level}` }))
  }, [activeClasses])

  useEffect(() => {
    if (titleTouched) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setTitle(buildManualPaperTitle({ classLevel, subject, publisher }))
    })
    return () => { cancelled = true }
  }, [classLevel, subject, publisher, titleTouched])

  useEffect(() => {
    try {
      setTenantStorageItem('pg_manual_class', classLevel)
      setTenantStorageItem('pg_manual_subject', subject)
      setTenantStorageItem('pg_manual_publisher', publisher)
      setTenantStorageItem('pg_manual_title', title)
      setTenantStorageItem('pg_manual_title_touched', titleTouched ? '1' : '0')
      setTenantStorageItem('pg_manual_mode', contentMode)
      setTenantStorageItem('pg_manual_content', content)
      setTenantStorageItem('pg_manual_urdu', urduContent)
    } catch { /* This optional operation may fail; preserve the existing editor state and fallback behavior. */ }
  }, [classLevel, subject, publisher, title, titleTouched, contentMode, content, urduContent])

  function handlePreview() {
    if (!classLevel || !subject) {
      alert('Please select Class and Subject before previewing.')
      return
    }
    const englishDraft = contentMode === 'urdu' ? '' : content
    const urduDraft = contentMode === 'english' ? '' : urduContent
    const parsed = parseManualPaperDraftPair(englishDraft, urduDraft)
    const total = parsed.mcq.length + parsed.short.length + parsed.long.length
    setPreviewCount({ total, ...parsed })
    if (!total) return
    const hasUrdu = Boolean(urduDraft.trim())
    onProceedToPreview?.({
      selectedMCQ: parsed.mcq,
      selectedShort: parsed.short,
      selectedLong: parsed.long,
      config: {
        title: title.trim() || buildManualPaperTitle({ classLevel, subject, publisher }),
        classLevel,
        subject,
        publisher,
        examType: 'Manual Draft',
        language: hasUrdu ? (englishDraft.trim() ? 'mixed' : 'urdu') : 'english',
      },
      questionBankSubjectMeta: { name: subject, classLevel, publisher },
      importToQuestionBank: true,
      paperSource: 'manual-draft',
    })
  }

  const total = previewCount ? previewCount.total : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, minHeight: '70vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ color: C.gold, fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Manual Draft Studio</div>
          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>Paste a full paper draft, choose class and subject, then preview and refine before saving.</div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <Select label="Class" value={classLevel} onChange={e => setClassLevel(e.target.value)}>
              <option value="">Select Class</option>
              {classOptions.map(c => <option key={c.level} value={c.level}>{c.name}</option>)}
            </Select>
            <Input label="Subject">
              <input list="manual-subject-suggestions" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mathematics" style={fieldStyle} />
              <datalist id="manual-subject-suggestions">{subjectSuggestions.map(s => <option key={s} value={s} />)}</datalist>
            </Input>
            <Input label="Publisher">
              <input list="manual-publisher-suggestions" value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="e.g. Punjab Text Book Board" style={fieldStyle} />
              <datalist id="manual-publisher-suggestions">{publishers.map(p => <option key={p} value={p} />)}</datalist>
            </Input>
            <Input label="Paper Name">
              <input value={title} onChange={e => { setTitleTouched(true); setTitle(e.target.value) }} placeholder="Manual Draft Paper" style={fieldStyle} />
              <button type="button" onClick={() => { setTitleTouched(false); setTitle(buildManualPaperTitle({ classLevel, subject, publisher })) }} style={{ marginTop:8, alignSelf:'flex-start', background:'rgba(10,132,255,0.12)', color:C.blue, border:'1px solid rgba(10,132,255,0.28)', borderRadius:8, padding:'6px 10px', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                Auto name
              </button>
            </Input>
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, flex: 1 }}>
          <div style={{ color: C.gold, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Paste Paper Content</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12 }}>
            {[['english','English Window'], ['urdu','Urdu Window'], ['dual','Dual Medium']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setContentMode(mode)} style={{ background: contentMode === mode ? `linear-gradient(135deg,${C.gold},${C.goldL})` : 'rgba(15,23,42,0.46)', color: contentMode === mode ? '#071e34' : C.silver, border: contentMode === mode ? 'none' : `1px solid ${C.border}`, borderRadius:10, padding:'10px 8px', fontSize:12, fontWeight:800, cursor:'pointer' }}>{label}</button>
            ))}
          </div>
          {(contentMode === 'english' || contentMode === 'dual') && (
            <>
              <div style={{ color: C.blue, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>English Paper Window</div>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={`MCQ
1. What is 2 + 2? A. 3 B. 4 C. 5 D. 6
Short Questions
1. Define noun.
Long Questions
1. Explain the water cycle.`} style={{ ...fieldStyle, minHeight: 320, resize:'vertical', borderRadius:14, padding:'14px 16px', lineHeight:1.7 }} />
            </>
          )}
          {(contentMode === 'urdu' || contentMode === 'dual') && (
            <>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 13, marginTop: contentMode === 'dual' ? 14 : 0, marginBottom: 8 }}>Urdu Paper Window</div>
              <textarea value={urduContent} onChange={e => setUrduContent(e.target.value)} placeholder={URDU_BOARD_PLACEHOLDER_CLEAN} dir="rtl" style={{ ...fieldStyle, minHeight: 260, resize:'vertical', borderRadius:14, padding:'14px 16px', fontSize:14, lineHeight:1.9, fontFamily:'Noto Nastaliq Urdu, Jameel Noori Nastaleeq, serif' }} />
            </>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={handlePreview} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldL})`, color:'#071e34', border:'none', borderRadius:12, padding:'12px 20px', fontWeight:800, cursor:'pointer' }}>Preview Draft</button>
            <button onClick={() => { setContent(''); setUrduContent(''); setPreviewCount(null) }} style={{ background:'rgba(15,23,42,0.46)', color:C.silver, border:`1px solid ${C.border}`, borderRadius:12, padding:'12px 18px', fontWeight:700, cursor:'pointer' }}>Clear Content</button>
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 10, lineHeight: 1.7 }}>{BOARD_SECTION_HELP.map(line => <div key={line}>- {line}</div>)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, minHeight: 180 }}>
          <div style={{ color: C.green, fontWeight: 800, fontSize: 16, marginBottom: 14 }}>Draft Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              ['MCQ', previewCount?.mcq?.length || 0, C.blue],
              ['Short', previewCount?.short?.length || 0, C.gold],
              ['Long', previewCount?.long?.length || 0, '#BF5AF2'],
              ['Total', total, C.green],
            ].map(([label, value, color]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ color, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 14, lineHeight: 1.7 }}>Preview opens in the paper editor, where final edits and printing happen.</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, flex: 1 }}>
          <div style={{ color: C.gold, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Quick Rules</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['Flexible paste', 'Strict format is no longer required; common paper formats and Urdu board papers are normalized.'],
              ['Separate windows', 'English and Urdu content stay separate unless Dual Medium is selected.'],
              ['Save flow', 'Preview first, then save from the editor.'],
              ['Question bank', 'Questions are stored by class, subject and publisher.'],
            ].map(([ruleTitle, desc]) => (
              <div key={ruleTitle} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                <div style={{ color: C.silver, fontWeight: 700, fontSize: 12 }}>{ruleTitle}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, color: C.blue, fontSize: 12, fontWeight: 700 }}>Default save target: {paperSettings?.schoolName || 'School'} paper vault</div>
        </div>
      </div>
    </div>
  )
}
