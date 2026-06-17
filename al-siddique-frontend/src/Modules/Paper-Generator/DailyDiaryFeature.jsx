import React, { useEffect, useMemo, useState } from 'react'
import api, { resolveAssetUrl } from '../../services/api'
import { useAcademicStore } from '../../services/useAcademicStore'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'
import { usePaperStore } from './usePaperStore'

const templates = [
  { id: 1, name: 'Canva Ivory Ledger', hero: 'linear-gradient(135deg,#26324a,#7b8ba8)', head: '#26324a', even: '#f5f7fb', footer: '#edf1f7' },
  { id: 2, name: 'Pearl Gold Academy', hero: 'linear-gradient(135deg,#2c2a24,#b69b5e)', head: '#2c2a24', even: '#fbf7ed', footer: '#f3ead3' },
  { id: 3, name: 'Sage Montessori Luxe', hero: 'linear-gradient(135deg,#23443b,#77a896)', head: '#23443b', even: '#f0f7f4', footer: '#dfeee8' },
  { id: 4, name: 'Ink Lilac Editorial', hero: 'linear-gradient(135deg,#2f3146,#8d86b8)', head: '#34304f', even: '#f5f3fa', footer: '#e8e4f2' },
  { id: 5, name: 'Warm Sand Junior', hero: 'linear-gradient(135deg,#514131,#c79b74)', head: '#514131', even: '#fbf4ec', footer: '#f0dfcf' },
  { id: 6, name: 'Oxford Slate Minimal', hero: 'linear-gradient(135deg,#1f2937,#64748b)', head: '#1f2937', even: '#f8fafc', footer: '#e7edf4' },
  { id: 7, name: 'Blush Rose Premium', hero: 'linear-gradient(135deg,#633143,#bd7892)', head: '#633143', even: '#fbf1f5', footer: '#f2dbe5' },
  { id: 8, name: 'Coastal Teal Glass', hero: 'linear-gradient(135deg,#244b5a,#78b9c7)', head: '#244b5a', even: '#eef8fa', footer: '#d8edf2' },
  { id: 9, name: 'Olive Linen Classic', hero: 'linear-gradient(135deg,#3e4a2f,#9caf78)', head: '#3e4a2f', even: '#f6f8ee', footer: '#e6ecd5' },
  { id: 10, name: 'Stone Platinum', hero: 'linear-gradient(135deg,#3b3834,#aaa39b)', head: '#3b3834', even: '#f7f6f4', footer: '#e6e2dd' },
  { id: 11, name: 'Pre-K Storybook Sky', hero: 'linear-gradient(135deg,#3b82a0,#8ed3dd)', head: '#22566a', even: '#eefafd', footer: '#d9f3f8', kidIcon: 'ABC' },
  { id: 12, name: 'Little Learners Meadow', hero: 'linear-gradient(135deg,#4d7c5a,#b8d99b)', head: '#355f40', even: '#f3faef', footer: '#e2f1d5', kidIcon: '123' },
  { id: 13, name: 'Tiny Scholar Peach', hero: 'linear-gradient(135deg,#b86b4b,#f3bf8f)', head: '#8b4b34', even: '#fff6ee', footer: '#f8dfc8', kidIcon: 'A+' },
  { id: 14, name: 'Rainbow Pastel Academy', hero: 'linear-gradient(135deg,#5d6bb0,#efb8d5)', head: '#49528f', even: '#f8f5ff', footer: '#f2e4f4', kidIcon: 'ART' },
  { id: 15, name: 'Playgroup Mint Blocks', hero: 'linear-gradient(135deg,#2f7d78,#9bd8c8)', head: '#23615d', even: '#effbf8', footer: '#d8f2ec', kidIcon: 'TOY' },
  { id: 16, name: 'Nursery Pencil Premium', hero: 'linear-gradient(135deg,#6d5b3f,#d6bd81)', head: '#5b4930', even: '#fbf7ec', footer: '#efe3bf', kidIcon: 'PEN' },
  { id: 17, name: 'Kinder Cloud Pearl', hero: 'linear-gradient(135deg,#63768d,#c8d8e8)', head: '#455970', even: '#f5f9fd', footer: '#e8f0f8', kidIcon: 'SUN' },
  { id: 18, name: 'Junior Garden Rose', hero: 'linear-gradient(135deg,#8b5169,#e2a7b8)', head: '#713f55', even: '#fff4f7', footer: '#f5dce5', kidIcon: 'JOY' },
  { id: 19, name: 'Early Years Ocean', hero: 'linear-gradient(135deg,#245f7a,#82c7d9)', head: '#1f4d63', even: '#eff9fc', footer: '#d8edf5', kidIcon: 'SEA' },
  { id: 20, name: 'Montessori Linen Dots', hero: 'linear-gradient(135deg,#6f6a50,#c9c198)', head: '#55503b', even: '#faf8ef', footer: '#ebe6cd', kidIcon: 'DOT' },
]

const FALLBACK_CLASSES = [
  { level: 'play', label: 'PLAY' },
  { level: 'nursery', label: 'NURSERY' },
  { level: 'prep', label: 'PREP' },
  { level: 'mover', label: 'MOVER' },
  { level: '1', label: 'CLASS 1' },
  { level: '2', label: 'CLASS 2' },
  { level: '3', label: 'CLASS 3' },
  { level: '4', label: 'CLASS 4' },
  { level: '5', label: 'CLASS 5' },
]

const FALLBACK_SUBJECTS = ['English', 'Urdu', 'Math', 'G.K.', 'Islamiat', 'Drawing', 'Computer', 'Science']
const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Aptos', value: 'Aptos, Inter, Arial, sans-serif' },
  { label: 'Segoe UI', value: "'Segoe UI', Arial, sans-serif" },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', serif" },
  { label: 'Jameel Noori Nastaleeq', value: "'Jameel Noori Nastaleeq', serif" },
  { label: 'Noto Nastaliq Urdu', value: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" },
]
const ROW_FONT_OPTIONS = FONT_OPTIONS.filter((font) => !font.value.includes('Nastaliq') && !font.value.includes('Nastaleeq'))
const URDU_FONT = "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif"

const defaultRows = [
  { id: 'eng', subject: 'ENGLISH', diary: 'Page 21 - Reading and writing practice', fontFamily: FONT_OPTIONS[0].value, fontSize: 12, lineHeight: 1.18, isBold: false, textAlign: 'left' },
  { id: 'urdu', subject: 'URDU', diary: 'Page 25 - Writing practice', isUrdu: true, fontFamily: URDU_FONT, fontSize: 12, lineHeight: 1.22, isBold: false, textAlign: 'right' },
  { id: 'math', subject: 'MATH', diary: 'Count and draw 5 medals', fontFamily: FONT_OPTIONS[0].value, fontSize: 12, lineHeight: 1.18, isBold: false, textAlign: 'left' },
  { id: 'gk', subject: 'G.K.', diary: 'Write 4 lines about myself', fontFamily: FONT_OPTIONS[0].value, fontSize: 12, lineHeight: 1.18, isBold: false, textAlign: 'left' },
]

const todayForInput = () => new Date().toISOString().slice(0, 10)

const formatDateLabel = (date) => {
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

const safeRows = (rows) => {
  if (!Array.isArray(rows)) return defaultRows
  const mapped = rows.map((row, index) => ({
    id: String(row?.id || `row_${index}_${Date.now()}`),
    subject: String(row?.subject || row?.title || '').trim(),
    diary: String(row?.diary || row?.note || '').trim(),
    isUrdu: Boolean(row?.isUrdu) || /urdu/i.test(String(row?.subject || row?.title || '')),
    fontFamily: String(row?.fontFamily || '').trim() || undefined,
    fontSize: row?.fontSize !== undefined ? Number(row.fontSize) : undefined,
    lineHeight: row?.lineHeight !== undefined ? Number(row.lineHeight) : undefined,
    isBold: Boolean(row?.isBold),
    textAlign: String(row?.textAlign || (Boolean(row?.isUrdu) || /urdu/i.test(String(row?.subject || row?.title || '')) ? 'right' : 'left')),
  })).filter(row => row.subject)
  return mapped.length ? mapped : defaultRows
}

const titleCase = (input) => input.split(/\s+/).filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')
const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const slipDensityClass = (count) => count >= 14 ? ' micro-slip' : count >= 12 ? ' ultra-slip' : count >= 8 ? ' compact-slip' : ''

const normalizeDateInput = (value) => {
  const iso = value.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (iso) return iso[1]
  const dmy = value.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/)
  if (!dmy) return ''
  const day = dmy[1].padStart(2, '0')
  const month = dmy[2].padStart(2, '0')
  const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
  return `${year}-${month}-${day}`
}

const parseDiaryText = (text) => {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  let detectedDate = ''
  let detectedClass = ''
  let detectedFooter = ''
  const rows = []
  for (const line of lines) {
    if (!detectedDate) {
      const dateHit = line.match(/(?:date|day)\s*[:\-]\s*(.+)$/i) || line.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/)
      if (dateHit) detectedDate = normalizeDateInput(dateHit[1] || dateHit[0])
    }
    if (!detectedClass) {
      const classHit = line.match(/(?:class|grade)\s*[:\-]\s*(.+)$/i)
      if (classHit) detectedClass = classHit[1].trim()
    }
    if (!detectedFooter) {
      const footerHit = line.match(/^(?:footer|note|dua|parent note)\s*[:\-]\s*(.+)$/i)
      if (footerHit) detectedFooter = footerHit[1].trim()
    }
    const parts = line.split(/\s*[:|–—-]\s+/)
    if (parts.length >= 2) {
      const subject = titleCase(parts[0].trim())
      const diary = parts.slice(1).join(' - ').trim()
      if (subject && diary) rows.push({ id: `${subject}-${rows.length}`, subject: subject.toUpperCase(), diary, isUrdu: /urdu/i.test(subject) })
    }
  }
  return { rows: rows.length ? rows : defaultRows, detectedDate, detectedClass, detectedFooter }
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const robustParseDiaryText = (text, subjectHints = []) => {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const parsed = parseDiaryText(text)
  const hints = Array.from(new Set([...subjectHints, ...FALLBACK_SUBJECTS].map((item) => String(item || '').trim()).filter(Boolean)))
  const subjectPattern = hints.length ? new RegExp(`^(${hints.map(escapeRegExp).join('|')})\\b[\\s:.-]*(.*)$`, 'i') : null
  const rows = []
  let currentRow = null

  const pushCurrent = () => {
    if (currentRow?.subject && currentRow.diary) rows.push(currentRow)
    currentRow = null
  }

  for (const line of lines) {
    if (/^(date|day|class|grade|footer|note|dua|parent note)\s*[:\-]/i.test(line)) continue

    const subjectMatch = subjectPattern?.exec(line)
    if (subjectMatch) {
      pushCurrent()
      const subject = titleCase(subjectMatch[1].trim())
      currentRow = {
        id: `${subject}-${rows.length}`,
        subject: subject.toUpperCase(),
        diary: subjectMatch[2].trim(),
        isUrdu: /urdu/i.test(subject),
        fontFamily: /urdu/i.test(subject) ? URDU_FONT : FONT_OPTIONS[0],
        fontSize: 13,
        lineHeight: 1.18,
      }
      continue
    }

    const parts = line.split(/\s*[:|–—-]\s+/)
    if (parts.length >= 2) {
      pushCurrent()
      const subject = titleCase(parts[0].trim())
      currentRow = {
        id: `${subject}-${rows.length}`,
        subject: subject.toUpperCase(),
        diary: parts.slice(1).join(' - ').trim(),
        isUrdu: /urdu/i.test(subject),
        fontFamily: /urdu/i.test(subject) ? URDU_FONT : FONT_OPTIONS[0],
        fontSize: 13,
        lineHeight: 1.18,
      }
      continue
    }

    if (currentRow) currentRow.diary = `${currentRow.diary} ${line}`.trim()
  }

  pushCurrent()
  return { rows: rows.length ? rows : [], detectedDate: parsed.detectedDate, detectedClass: parsed.detectedClass, detectedFooter: parsed.detectedFooter }
}

function DiarySlip({ template, schoolName, tagline, logoUrl, classLabel, date, rows, footerText, footerIsUrdu, slipsPerPage, fontFamily, radius, fontSize, lineHeight, wordSpacing, letterSpacing, showWatermark, schoolNameFontSize, footerFontSize, dateClassFontSize, tableHeadFontSize }) {
  return (
    <div className={`diary-card${slipDensityClass(slipsPerPage)}`} style={{ borderRadius: radius, fontSize, lineHeight, wordSpacing, letterSpacing, fontFamily }}>
      <div className="hero" style={{ background: template.hero }}>
        <div className="logo-box">{logoUrl ? <img src={logoUrl.startsWith('http') || logoUrl.startsWith('blob:') || logoUrl.startsWith('data:') ? logoUrl : (logoUrl.startsWith('/') ? 'https://api.assps.edu.pk' + logoUrl : 'https://api.assps.edu.pk/' + logoUrl)} alt="School logo" /> : <span>ASS</span>}</div>
        <div className="school-info">
          <div className="school-name" style={schoolNameFontSize ? { fontSize: `${schoolNameFontSize}px` } : {}}>{schoolName}</div>
          <div className="tagline">{tagline}</div>
        </div>
        <div className="date-box" style={dateClassFontSize ? { fontSize: `${dateClassFontSize}px` } : {}}><b>{formatDateLabel(date)}</b><span>CLASS: {classLabel}</span></div>
        {template.kidIcon && <div className="kid-badge">{template.kidIcon}</div>}
      </div>
      <div className="diary-table">
        <div className="table-head">
          <div style={{ background: template.head, ...(tableHeadFontSize ? { fontSize: `${tableHeadFontSize}px` } : {}) }}>SUBJECT</div>
          <div style={{ background: template.head, ...(tableHeadFontSize ? { fontSize: `${tableHeadFontSize}px` } : {}) }}>HOME TASK / DIARY</div>
        </div>
        {rows.map((row, index) => (
          <div className="table-row" key={row.id}>
            <div
              className="subject-pill"
              style={{
                background: index % 2 ? template.even : '#ffffff',
                fontFamily,
                fontSize: `${Math.max(9, fontSize - 1)}px`,
                lineHeight,
                fontWeight: row.isBold ? '1000' : '750',
              }}
            >
              {row.subject}
            </div>
            <div
              className={row.isUrdu ? 'task-pill urdu-text' : 'task-pill'}
              style={{
                background: index % 2 ? template.even : '#ffffff',
                fontFamily: row.isUrdu ? URDU_FONT : (row.fontFamily || fontFamily),
                fontSize: `${row.fontSize || fontSize}px`,
                lineHeight: row.lineHeight || lineHeight,
                fontWeight: row.isBold ? '900' : (row.isUrdu ? 'normal' : '700'),
                textAlign: row.textAlign || (row.isUrdu ? 'right' : 'left'),
              }}
            >
              {row.diary || '-'}
            </div>
          </div>
        ))}
      </div>
      <div className={footerIsUrdu ? 'footer-note urdu-text' : 'footer-note'} style={{ background: template.footer, ...(footerFontSize ? { fontSize: `${footerFontSize}px` } : {}) }}>{footerText}</div>
      {showWatermark && <div className="watermark">ASS</div>}
    </div>
  )
}

export default function DailyDiaryFeature() {
  const { activeClasses, subjectsForClass } = useAcademicStore()
  const { paperSettings } = usePaperStore()
  const [templateId, setTemplateId] = useState(1)
  const [schoolName, setSchoolName] = useState('AL SIDDIQUE SCHOLARS PUBLIC SCHOOL')
  const [tagline, setTagline] = useState('Learn - Grow - Shine Every Day')
  const [logoUrl, setLogoUrl] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [date, setDate] = useState(todayForInput())
  const [slipsPerPage, setSlipsPerPage] = useState(8)
  const [footerText, setFooterText] = useState('Please review and sign the diary daily.')
  const [footerIsUrdu, setFooterIsUrdu] = useState(false)
  const [rows, setRows] = useState(defaultRows)
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0])
  const [radius, setRadius] = useState(24)
  const [fontSize, setFontSize] = useState(13)
  const [lineHeight, setLineHeight] = useState(1.18)
  const [wordSpacing, setWordSpacing] = useState(0)
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [showWatermark, setShowWatermark] = useState(true)
  const [pasteText, setPasteText] = useState('')
  const [savedDiaryId, setSavedDiaryId] = useState(null)
  const [savedDiaries, setSavedDiaries] = useState([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  
  // Font sizes for specific areas
  const [schoolNameFontSize, setSchoolNameFontSize] = useState(undefined)
  const [footerFontSize, setFooterFontSize] = useState(undefined)
  const [dateClassFontSize, setDateClassFontSize] = useState(undefined)
  const [tableHeadFontSize, setTableHeadFontSize] = useState(undefined)

  const template = useMemo(() => templates.find((t) => t.id === templateId) || templates[0], [templateId])
  const classOptions = activeClasses.length ? activeClasses.map((item) => ({ level: String(item.level), label: item.name })) : FALLBACK_CLASSES
  const selectedClass = useMemo(() => classOptions.find((item) => String(item.level) === String(classLevel)) || classOptions[0], [classLevel, classOptions])
  const classLabel = selectedClass?.label || classLevel || 'MOVER'
  const subjectOptions = useMemo(() => {
    const fromStore = subjectsForClass(classLevel || selectedClass?.level || '')
    return fromStore.length ? fromStore : FALLBACK_SUBJECTS
  }, [classLevel, selectedClass?.level, subjectsForClass])
  const slips = Array.from({ length: slipsPerPage }, (_, i) => i)

  const hydrateDiary = (record) => {
    setSavedDiaryId(typeof record.id === 'number' ? record.id : null)
    if (record.template_id || record.templateId) setTemplateId(Number(record.template_id || record.templateId))
    if (record.school_name) setSchoolName(String(record.school_name))
    if (record.tagline) setTagline(String(record.tagline))
    if (record.logo_url) setLogoUrl(String(record.logo_url))
    if (record.class_level || record.class_name) setClassLevel(String(record.class_level || record.class_name))
    if (record.diary_date) setDate(String(record.diary_date).slice(0, 10))
    if (record.slips_per_page) setSlipsPerPage(Number(record.slips_per_page))
    if (record.footer_text !== undefined) setFooterText(String(record.footer_text))
    if (record.footer_is_urdu !== undefined) setFooterIsUrdu(Boolean(record.footer_is_urdu))
    const style = record.style_settings || {}
    if (style.radius !== undefined) setRadius(Number(style.radius))
    if (style.fontSize !== undefined) setFontSize(Number(style.fontSize))
    if (style.fontFamily !== undefined) setFontFamily(String(style.fontFamily))
    if (style.lineHeight !== undefined) setLineHeight(Number(style.lineHeight))
    if (style.wordSpacing !== undefined) setWordSpacing(Number(style.wordSpacing))
    if (style.letterSpacing !== undefined) setLetterSpacing(Number(style.letterSpacing))
    if (style.showWatermark !== undefined) setShowWatermark(Boolean(style.showWatermark))
    if (style.schoolNameFontSize !== undefined) setSchoolNameFontSize(Number(style.schoolNameFontSize))
    if (style.footerFontSize !== undefined) setFooterFontSize(Number(style.footerFontSize))
    if (style.dateClassFontSize !== undefined) setDateClassFontSize(Number(style.dateClassFontSize))
    if (style.tableHeadFontSize !== undefined) setTableHeadFontSize(Number(style.tableHeadFontSize))
    if (record.rows) setRows(safeRows(record.rows))
  }

  async function loadSavedDiaries() {
    const res = await api.get('/api/daily-diary?limit=10')
    return Array.isArray(res.data?.data) ? res.data.data : []
  }

  useEffect(() => {
    if (!classLevel && selectedClass?.level) setClassLevel(String(selectedClass.level))
  }, [classLevel, selectedClass?.level])

  useEffect(() => {
    const savedPaperSettings = paperSettings || {}
    if (savedPaperSettings.schoolName) setSchoolName(savedPaperSettings.schoolName)
    if (savedPaperSettings.logo) setLogoUrl(savedPaperSettings.logo)
  }, [paperSettings])

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      try {
        const local = typeof window !== 'undefined' ? getTenantStorageItem('dailyDiaryDraft', { migrateLegacy: true }) : null
        if (local) {
          const parsed = JSON.parse(local)
          if (!cancelled) hydrateDiary(parsed)
        }
      } catch {}

      try {
        const publicParams = paperSettings?.schoolCode ? { school_code: paperSettings.schoolCode } : undefined
        const res = await api.get('/settings/public', { params: publicParams })
        const settings = res.data?.data || {}
        if (cancelled) return
        if (settings.school_name) setSchoolName(String(settings.school_name))
        if (settings.school_logo) setLogoUrl(resolveAssetUrl(String(settings.school_logo)))
      } catch {}

      try {
        const diaries = await loadSavedDiaries()
        if (cancelled) return
        setSavedDiaries(diaries)
        const latest = diaries[0]
        if (latest && typeof window !== 'undefined' && !getTenantStorageItem('dailyDiaryDraft', { migrateLegacy: true })) hydrateDiary(latest)
      } catch {}
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  const updateRow = (id, key, value) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)))
  const setRowFontFamily = (id, value) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, fontFamily: value } : row)))
  const nudgeRowFontSize = (id, delta) => setRows((prev) => prev.map((row) => (row.id === id ? { ...row, fontSize: Math.min(18, Math.max(11, (row.fontSize || fontSize) + delta)) } : row)))
  const applyGlobalFontFamily = (value) => {
    setFontFamily(value)
  }
  const applyGlobalFontSize = (value) => {
    setFontSize(value)
  }
  const applyGlobalLineHeight = (value) => {
    setLineHeight(value)
  }
  const addSubject = (subject) => {
    const normalized = subject.trim()
    if (!normalized) return
    if (rows.some((row) => row.subject.toLowerCase() === normalized.toLowerCase())) return
    const isUrdu = normalized.toLowerCase() === 'urdu'
    setRows((prev) => [...prev, { id: `${normalized}-${Date.now()}`, subject: normalized.toUpperCase(), diary: '', isUrdu, fontFamily: isUrdu ? URDU_FONT : fontFamily, fontSize, lineHeight }])
  }
  const removeRow = (id) => setRows((prev) => prev.filter((row) => row.id !== id))

  const applyPasteText = () => {
    const parsed = robustParseDiaryText(pasteText, subjectOptions)
    if (parsed.detectedDate) setDate(parsed.detectedDate)
    if (parsed.detectedClass) setClassLevel(parsed.detectedClass)
    if (parsed.detectedFooter) setFooterText(parsed.detectedFooter)
    if (!parsed.rows.length) {
      setStatus('No diary rows detected. Use lines like "English: ..." or add rows manually.')
      window.setTimeout(() => setStatus(''), 3500)
      return
    }
    setRows(parsed.rows)
    setStatus(`Diary arranged into ${parsed.rows.length} row${parsed.rows.length === 1 ? '' : 's'}.`)
    window.setTimeout(() => setStatus(''), 2500)
  }

  const saveDailyDiary = async () => {
    const payload = {
      id: savedDiaryId || undefined,
      template_id: templateId,
      school_name: schoolName,
      tagline,
      logo_url: logoUrl,
      class_level: classLevel,
      class_name: classLabel,
      diary_date: date,
      slips_per_page: slipsPerPage,
      footer_text: footerText,
      footer_is_urdu: footerIsUrdu,
      rows,
      style_settings: { radius, fontSize, fontFamily, lineHeight, wordSpacing, letterSpacing, showWatermark, schoolNameFontSize, footerFontSize, dateClassFontSize, tableHeadFontSize },
    }
    if (typeof window !== 'undefined') setTenantStorageItem('dailyDiaryDraft', JSON.stringify(payload))
    setSaving(true)
    setStatus('Saving...')
    try {
      const response = savedDiaryId ? await api.put(`/api/daily-diary/${savedDiaryId}`, payload) : await api.post('/api/daily-diary', payload)
      const saved = response.data?.data
      if (saved?.id) {
        setSavedDiaryId(Number(saved.id))
        if (typeof window !== 'undefined') setTenantStorageItem('dailyDiaryDraft', JSON.stringify({ ...payload, id: saved.id }))
      }
      const diaries = await loadSavedDiaries().catch(() => [])
      if (Array.isArray(diaries)) setSavedDiaries(diaries)
      setStatus('Draft saved successfully.')
    } catch {
      setStatus('Saved locally. Server save is unavailable right now.')
    } finally {
      setSaving(false)
      window.setTimeout(() => setStatus(''), 4000)
    }
  }

  const handleLogoUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const handlePrintDiary = () => {
    if (typeof window === 'undefined') return
    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) return

    const slipsHtml = Array.from({ length: slipsPerPage }, () => `
      <div class="diary-card${slipDensityClass(slipsPerPage)}" style="border-radius:${radius}px;font-size:${fontSize}px;line-height:${lineHeight};word-spacing:${wordSpacing}px;letter-spacing:${letterSpacing}px;font-family:${fontFamily.replace(/"/g, "'")}">
        <div class="hero" style="background:${template.hero}">
          <div class="logo-box">${logoUrl ? `<img src="${escapeHtml(logoUrl.startsWith('http') || logoUrl.startsWith('blob:') || logoUrl.startsWith('data:') ? logoUrl : (logoUrl.startsWith('/') ? 'https://api.assps.edu.pk' + logoUrl : 'https://api.assps.edu.pk/' + logoUrl))}" alt="School logo" />` : '<span>ASS</span>'}</div>
          <div class="school-info">
            <div class="school-name" ${schoolNameFontSize ? `style="font-size:${schoolNameFontSize}px;"` : ''}>${escapeHtml(schoolName)}</div>
            <div class="tagline">${escapeHtml(tagline)}</div>
          </div>
          <div class="date-box" ${dateClassFontSize ? `style="font-size:${dateClassFontSize}px;"` : ''}><b>${escapeHtml(formatDateLabel(date))}</b><span>CLASS: ${escapeHtml(classLabel)}</span></div>
          ${template.kidIcon ? `<div class="kid-badge">${escapeHtml(template.kidIcon)}</div>` : ''}
        </div>
        <div class="diary-table">
          <div class="table-head">
            <div style="background:${template.head};${tableHeadFontSize ? `font-size:${tableHeadFontSize}px;` : ''}">SUBJECT</div>
            <div style="background:${template.head};${tableHeadFontSize ? `font-size:${tableHeadFontSize}px;` : ''}">HOME TASK / DIARY</div>
          </div>
          ${rows.map((row, index) => `
            <div class="table-row">
              <div class="subject-pill" style="background:${index % 2 ? template.even : '#ffffff'};font-family:${fontFamily.replace(/"/g, "'")};font-size:${Math.max(9, fontSize - 1)}px;line-height:${lineHeight};font-weight:${row.isBold ? '1000' : '750'}">${escapeHtml(row.subject)}</div>
              <div class="${row.isUrdu ? 'task-pill urdu-text' : 'task-pill'}" style="background:${index % 2 ? template.even : '#ffffff'};font-family:${(row.isUrdu ? URDU_FONT : (row.fontFamily || fontFamily)).replace(/"/g, "'")};font-size:${row.fontSize || fontSize}px;line-height:${row.lineHeight || lineHeight};font-weight:${row.isBold ? '900' : (row.isUrdu ? 'normal' : '700')};text-align:${row.textAlign || (row.isUrdu ? 'right' : 'left')}">${escapeHtml(row.diary || '-')}</div>
            </div>
          `).join('')}
        </div>
        <div class="${footerIsUrdu ? 'footer-note urdu-text' : 'footer-note'}" style="background:${template.footer};${footerFontSize ? `font-size:${footerFontSize}px;` : ''}">${escapeHtml(footerText)}</div>
        ${showWatermark ? '<div class="watermark">ASS</div>' : ''}
      </div>
    `).join('')

    const printHtml = `<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Daily Diary Print</title>
          <style>${css}</style>
          <style>
            body{margin:0;background:#fff}
            .print-toolbar{position:sticky;top:0;z-index:9999;display:flex;align-items:center;gap:12px;padding:10px 14px;background:#071e34;color:#d8e2f0;font-family:Inter,Arial,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.18)}
            .print-toolbar strong{color:#e8b420}
            .print-toolbar button{margin-left:auto;border:0;border-radius:10px;padding:9px 18px;background:linear-gradient(135deg,#C8991A,#e8b420);color:#071e34;font-weight:900;cursor:pointer}
            @media print{.print-toolbar{display:none!important}}
          </style>
        </head>
        <body>
          <div class="print-toolbar"><strong>Daily Diary Print Preview</strong><span>Click Print if dialog does not open automatically.</span><button onclick="window.print()">Print / Save PDF</button></div>
          <div class="daily-diary-feature">
            <div class="print-sheet" style="grid-template-columns:repeat(2,minmax(0,1fr))">
              ${slipsHtml}
            </div>
          </div>
          <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},600)}</script>
        </body>
      </html>`
    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
  }

  const openSavedDiary = (record) => {
    hydrateDiary(record)
    setStatus(`Loaded diary ${record.id || ''}`.trim())
    window.setTimeout(() => setStatus(''), 3000)
  }

  const deleteSavedDiary = async (record) => {
    if (!record.id) return
    if (!window.confirm('Delete this saved diary draft?')) return
    try {
      await api.delete(`/api/daily-diary/${record.id}`)
      const diaries = await loadSavedDiaries().catch(() => [])
      setSavedDiaries(Array.isArray(diaries) ? diaries : [])
      if (savedDiaryId === record.id) setSavedDiaryId(null)
      setStatus('Draft deleted.')
      window.setTimeout(() => setStatus(''), 2500)
    } catch {
      setStatus('Could not delete the selected draft.')
      window.setTimeout(() => setStatus(''), 3500)
    }
  }

  return (
    <div className="daily-diary-feature">
      <style>{css}</style>

      <div className="no-print page-header">
        <div>
          <div className="eyebrow">Daily Diary Generator</div>
          <h1>Daily Diary Generator</h1>
          <p>Paste diary content, auto-arrange subjects, fine tune typography, and print a clean A4 sheet without changing the provided template styles.</p>
        </div>
        <div className="actions">
          <button onClick={saveDailyDiary} disabled={saving}>{saving ? 'Saving...' : 'Save Diary'}</button>
          <button onClick={handlePrintDiary} className="primary">Print Preview</button>
        </div>
      </div>

      {status && <div className="no-print status-bar">{status}</div>}

      <div className="no-print designer-layout">
        <div className="stack-column left-column">
          <section className="panel accent-panel">
            <div className="panel-title"><h2>Branding</h2><span>School header and date</span></div>
            <label>School Name</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
              <input style={{ flex: 1, margin: 0 }} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
              <div className="font-size-tools" style={{ flexShrink: 0, marginTop: 0 }}>
                <button type="button" onClick={() => setSchoolNameFontSize(Math.max(8, (schoolNameFontSize || 14) - 1))}>A-</button>
                <span>{schoolNameFontSize || 14}px</span>
                <button type="button" onClick={() => setSchoolNameFontSize(Math.min(32, (schoolNameFontSize || 14) + 1))}>A+</button>
              </div>
            </div>
            <label>Tagline<input value={tagline} onChange={(e) => setTagline(e.target.value)} /></label>
            <div className="helper-copy">School logo is pulled from your SaaS settings automatically.</div>
            <div className="two-col">
              <label>Class
                <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}>
                  {classOptions.map((item) => <option key={item.level} value={item.level}>{item.label}</option>)}
                </select>
              </label>
              <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>Class & Date Size</span>
              <div className="font-size-tools" style={{ marginTop: 0 }}>
                <button type="button" onClick={() => setDateClassFontSize(Math.max(6, (dateClassFontSize || 9) - 1))}>A-</button>
                <span>{dateClassFontSize || 9}px</span>
                <button type="button" onClick={() => setDateClassFontSize(Math.min(24, (dateClassFontSize || 9) + 1))}>A+</button>
              </div>
            </div>
          </section>

          <section className="panel accent-panel">
            <div className="panel-title"><h2>Layout</h2><span>Templates, fonts, and spacing</span></div>
            <label>Template
              <select value={templateId} onChange={(e) => setTemplateId(Number(e.target.value))}>
                {templates.map((item) => <option value={item.id} key={item.id}>{item.id}. {item.name}</option>)}
              </select>
            </label>
            <label>Font Family
              <select value={fontFamily} onChange={(e) => applyGlobalFontFamily(e.target.value)}>
                {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
              </select>
            </label>
            <label>Slips per Portrait A4
              <select value={slipsPerPage} onChange={(e) => setSlipsPerPage(Number(e.target.value))}>
                <option value={4}>4</option><option value={6}>6</option><option value={8}>8 - Default</option><option value={10}>10 - Compact</option><option value={12}>12 - Dense</option><option value={14}>14 - Ultra Compact</option>
                <option value={16}>16 - Micro</option><option value={18}>18 - Tiny</option><option value={20}>20 - Extreme</option>
              </select>
            </label>
            <div className="slider-grid">
              <label>Border Radius<input type="range" min="12" max="34" value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></label>
              <label>Font Size<input type="range" min="10" max="18" value={fontSize} onChange={(e) => applyGlobalFontSize(Number(e.target.value))} /></label>
              <label>Line Space<input type="range" min="0.95" max="1.7" step="0.02" value={lineHeight} onChange={(e) => applyGlobalLineHeight(Number(e.target.value))} /></label>
              <label>Word Space<input type="range" min="-2" max="8" value={wordSpacing} onChange={(e) => setWordSpacing(Number(e.target.value))} /></label>
              <label>Letter Space<input type="range" min="-1" max="3" step="0.1" value={letterSpacing} onChange={(e) => setLetterSpacing(Number(e.target.value))} /></label>
            </div>
            <label className="check"><input type="checkbox" checked={showWatermark} onChange={(e) => setShowWatermark(e.target.checked)} /> Show watermark</label>
            <div className="panel-title" style={{ marginTop: '20px' }}><h2>Table Headers</h2><span>Subject & Home Task</span></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 700 }}>Header Size</span>
              <div className="font-size-tools" style={{ marginTop: 0 }}>
                <button type="button" onClick={() => setTableHeadFontSize(Math.max(5, (tableHeadFontSize || 8) - 1))}>A-</button>
                <span>{tableHeadFontSize || 8}px</span>
                <button type="button" onClick={() => setTableHeadFontSize(Math.min(20, (tableHeadFontSize || 8) + 1))}>A+</button>
              </div>
            </div>
          </section>
        </div>

        <div className="stack-column right-column">
          <section className="panel accent-panel drafts-panel">
            <div className="panel-title"><h2>Saved Diaries</h2><span>Open or delete saved diaries</span></div>
            <div className="draft-list">
              {savedDiaries.length ? savedDiaries.map((record) => (
                <div key={record.id} className="draft-item">
                  <button type="button" onClick={() => openSavedDiary(record)} className="draft-open">
                    <div className="draft-title">{record.class_name || record.class_level || 'Diary'} - {record.diary_date ? formatDateLabel(record.diary_date) : 'No date'}</div>
                    <div className="draft-meta">Template {record.template_id || record.templateId || 1} - {record.footer_text ? 'Has footer note' : 'No footer note'}</div>
                  </button>
                  <button type="button" onClick={() => deleteSavedDiary(record)} className="danger draft-delete">Delete</button>
                </div>
              )) : <div className="empty-copy">No saved diaries yet. Save a diary to see it here.</div>}
            </div>
          </section>

          <section className="panel accent-panel">
            <div className="panel-title"><h2>Diary Composer</h2><span>Paste content or edit rows manually</span></div>
            <div className="compose-grid">
              <div className="compose-box">
                <label>Paste Diary Text
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'Example:\nDate: 22/05/2026\nClass: Nursery\nEnglish: Page 21 - Reading and writing practice\nUrdu: Page 25 - Writing practice\nMath: Count and draw 5 medals\nG.K.: Write 4 lines about myself\nFooter: Please review and sign the diary daily.'}
                  />
                </label>
                <div className="compose-actions">
                  <button type="button" onClick={applyPasteText} className="primary">Auto Arrange</button>
                  <button type="button" onClick={() => setRows(defaultRows)} className="ghost">Reset Rows</button>
                </div>
                {status.includes('No diary rows detected') && <div className="compose-warning">{status}</div>}
              </div>
              <div className="subject-panel">
                <div className="subject-buttons">
                  {subjectOptions.map((subject) => <button key={subject} onClick={() => addSubject(subject)} type="button">+ {subject}</button>)}
                </div>
                <div className="rows-editor">
                  {rows.map((row) => (
                    <div className="edit-row" key={row.id}>
                      <input value={row.subject} onChange={(e) => updateRow(row.id, 'subject', e.target.value)} />
                      <textarea value={row.diary} onChange={(e) => updateRow(row.id, 'diary', e.target.value)} />
                      <div className="row-tools">
                        <select
                          value={row.isUrdu ? URDU_FONT : (row.fontFamily || fontFamily)}
                          onChange={(e) => setRowFontFamily(row.id, e.target.value)}
                          disabled={row.isUrdu}
                          title={row.isUrdu ? 'Urdu rows keep the Urdu font' : 'Row font family'}
                        >
                          {ROW_FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                          <option value={URDU_FONT}>Noto Nastaliq Urdu</option>
                        </select>
                        <div className="font-size-tools">
                          <button type="button" onClick={() => nudgeRowFontSize(row.id, -1)} aria-label="Decrease font size">A-</button>
                          <span>{row.fontSize || fontSize}px</span>
                          <button type="button" onClick={() => nudgeRowFontSize(row.id, 1)} aria-label="Increase font size">A+</button>
                        </div>
                      </div>
                      <div className="edit-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: 0 }}>
                        <label className="check small"><input type="checkbox" checked={!!row.isUrdu} onChange={(e) => {
                          const checked = e.target.checked
                          updateRow(row.id, 'isUrdu', checked)
                          if (checked) {
                            setRowFontFamily(row.id, URDU_FONT)
                            updateRow(row.id, 'textAlign', 'right')
                          } else {
                            updateRow(row.id, 'textAlign', 'left')
                          }
                        }} /> Urdu</label>
                        <button type="button" style={{ padding: '6px 10px', fontSize: '11px', background: row.isBold ? 'rgba(200,153,26,0.2)' : 'rgba(255,255,255,0.05)', color: row.isBold ? '#C8991A' : '#d8e2f0', border: `1px solid ${row.isBold ? 'rgba(200,153,26,0.3)' : 'transparent'}`, borderRadius: '10px' }} onClick={() => updateRow(row.id, 'isBold', !row.isBold)}><b>B</b></button>
                        <button type="button" style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }} onClick={() => updateRow(row.id, 'textAlign', row.textAlign === 'right' ? 'left' : 'right')}>{row.textAlign === 'right' ? 'RTL' : 'LTR'}</button>
                        <button onClick={() => removeRow(row.id)} type="button" className="danger" style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '10px' }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <label>Footer / Dua / Fee Note / Parent Note</label>
            <textarea style={{ marginBottom: '8px' }} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <label className="check"><input type="checkbox" checked={footerIsUrdu} onChange={(e) => setFooterIsUrdu(e.target.checked)} /> Use Urdu font</label>
              <div className="font-size-tools" style={{ marginTop: 0 }}>
                <button type="button" onClick={() => setFooterFontSize(Math.max(6, (footerFontSize || 9) - 1))}>A-</button>
                <span>{footerFontSize || 9}px</span>
                <button type="button" onClick={() => setFooterFontSize(Math.min(24, (footerFontSize || 9) + 1))}>A+</button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="print-sheet" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {slips.map((n) => (
          <DiarySlip
            key={n}
            template={template}
            schoolName={schoolName}
            tagline={tagline}
            logoUrl={logoUrl}
            classLabel={classLabel}
            date={date}
            rows={rows}
            footerText={footerText}
            footerIsUrdu={footerIsUrdu}
            slipsPerPage={slipsPerPage}
            fontFamily={fontFamily}
            radius={radius}
            fontSize={fontSize}
            lineHeight={lineHeight}
            wordSpacing={wordSpacing}
            letterSpacing={letterSpacing}
            showWatermark={showWatermark}
            schoolNameFontSize={schoolNameFontSize}
            footerFontSize={footerFontSize}
            dateClassFontSize={dateClassFontSize}
            tableHeadFontSize={tableHeadFontSize}
          />
        ))}
      </div>
    </div>
  )
}

const css = `
.daily-diary-feature,.daily-diary-feature *{box-sizing:border-box}
.daily-diary-feature{background:linear-gradient(180deg,#081d34 0%,#07111f 100%);min-height:100vh;padding:22px;color:#d8e2f0;font-family:Inter,Arial,sans-serif}
.page-header{display:flex;justify-content:space-between;gap:16px;align-items:center;max-width:1480px;margin:0 auto 18px;padding:18px 22px;border:1px solid rgba(148,163,184,.12);border-radius:24px;background:rgba(11,44,77,.92);box-shadow:0 20px 50px rgba(7,17,31,.28)}
.eyebrow{color:#C8991A;font-size:11px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;margin-bottom:8px}
.page-header h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.25px;color:#fff}
.page-header p{max-width:930px;margin:8px 0 0;color:#94A3B8;line-height:1.65}
.actions{display:flex;gap:10px;align-self:flex-start;flex-wrap:wrap}
.status-bar{max-width:1480px;margin:0 auto 14px;padding:10px 14px;border-radius:14px;background:rgba(10,132,255,.14);border:1px solid rgba(10,132,255,.24);color:#7fc0ff;font-weight:700}
button{border:0;border-radius:14px;padding:10px 14px;font-weight:900;background:rgba(255,255,255,.06);color:#d8e2f0;box-shadow:0 10px 20px rgba(0,0,0,.12);cursor:pointer}
button:disabled{opacity:.65;cursor:not-allowed}
.primary{background:linear-gradient(135deg,#C8991A,#e8b420);color:#071e34}
.ghost{background:transparent;border:1px solid rgba(148,163,184,.18);box-shadow:none}
.danger{background:rgba(255,55,95,.12);border:1px solid rgba(255,55,95,.22);color:#ff7b91}
.designer-layout{max-width:1480px;margin:0 auto 18px;display:grid;grid-template-columns:minmax(280px,340px) minmax(0,1fr);gap:16px;align-items:start}
.stack-column{display:grid;gap:16px;align-content:start}
.right-column{grid-column:2}
.left-column{grid-column:1}
.panel{background:rgba(11,44,77,.92);border:1px solid rgba(148,163,184,.12);border-radius:24px;padding:18px;box-shadow:0 18px 44px rgba(7,17,31,.22)}
.accent-panel{background:linear-gradient(180deg,rgba(11,44,77,.95),rgba(9,28,50,.96))}
.panel-title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:12px}
.panel-title h2{margin:0;font-size:17px;color:#fff}
.panel-title span{font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:.08em}
.drafts-panel{margin-top:2px}
.panel label{display:block;font-size:12px;font-weight:900;color:#C0C8D8;margin-bottom:10px}
.panel input,.panel select,.panel textarea{width:100%;margin-top:6px;border:1px solid rgba(148,163,184,.18);border-radius:14px;padding:11px 12px;font:inherit;background:rgba(7,30,52,.72);color:#fff;box-sizing:border-box}
.panel textarea{min-height:78px;resize:vertical}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.check{display:flex!important;align-items:center;gap:8px}
.check input{width:auto!important;margin:0!important}
.small{font-size:11px!important;margin:0!important}
.slider-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.slider-grid label{margin-bottom:0}
.draft-list{display:grid;gap:10px}
.draft-item{padding:12px;border-radius:16px;border:1px solid rgba(148,163,184,.12);background:rgba(7,30,52,.55);display:grid;gap:10px}
.draft-open{text-align:left;background:transparent;border:0;padding:0;box-shadow:none}
.draft-title{font-weight:900;color:#fff;font-size:13px;line-height:1.4}
.draft-meta{margin-top:4px;color:#94A3B8;font-size:11px;font-weight:700}
.draft-delete{width:100%;padding:9px 12px;font-size:12px}
.empty-copy{color:#94A3B8;font-size:13px;line-height:1.65}
.compose-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px;align-items:start}
.compose-box,.subject-panel{border-radius:18px;border:1px solid rgba(148,163,184,.12);background:rgba(7,30,52,.48);padding:14px;min-width:0}
.compose-actions{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}
.compose-actions button{flex:1;min-width:140px}
.subject-buttons{display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:8px;margin-bottom:12px}
.subject-buttons button{padding:8px 10px;font-size:12px;background:rgba(255,255,255,.06);width:100%;justify-content:center}
.rows-editor{display:grid;gap:10px}
.edit-row{display:grid;grid-template-columns:minmax(0,1fr) 180px;grid-template-areas:"subject actions" "diary actions" "tools actions";gap:10px 14px;align-items:start;min-width:0;padding:12px;border:1px solid rgba(148,163,184,.08);border-radius:16px;background:rgba(255,255,255,.03)}
.edit-row input{grid-area:subject;margin-top:0}
.edit-row textarea{grid-area:diary;margin-top:0;min-height:72px;line-height:1.55;overflow-wrap:anywhere;word-break:break-word}
.row-tools{grid-area:tools;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;min-width:0}
.row-tools select,.row-tools .font-size-tools{margin-top:0}
.font-size-tools{display:flex;align-items:center;gap:8px;justify-content:space-between;border:1px solid rgba(148,163,184,.12);border-radius:12px;padding:8px 10px;background:rgba(255,255,255,.02);color:#d8e2f0}
.font-size-tools button{padding:6px 10px;border-radius:10px;font-size:12px;line-height:1;background:rgba(255,255,255,.05)}
.font-size-tools span{font-size:12px;font-weight:800;color:#94A3B8;min-width:46px;text-align:center}
.edit-actions{grid-area:actions;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.edit-actions .check{white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis;padding:6px 10px;border:1px solid rgba(148,163,184,.12);border-radius:10px;background:rgba(255,255,255,.03)}
.compose-warning{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,193,7,.2);background:rgba(255,193,7,.08);color:#ffd37a;font-size:12px;font-weight:800;line-height:1.5}
.helper-copy{font-size:11px;color:#94A3B8;line-height:1.5;margin-top:-2px;padding:10px 12px;border:1px dashed rgba(148,163,184,.12);border-radius:12px;background:rgba(255,255,255,.02)}
.print-sheet{width:207mm;min-height:287mm;background:white;margin:0 auto;padding:1mm;display:grid;gap:.65mm;box-shadow:0 20px 60px rgba(15,23,42,.12);align-items:start;justify-content:center;box-sizing:border-box;grid-auto-rows:max-content}
.diary-card{position:relative;overflow:hidden;background:#fff;border:1px solid rgba(15,23,42,.08);box-shadow:0 5px 14px rgba(15,23,42,.05);height:auto;display:flex;flex-direction:column;max-width:100%;filter:saturate(1.1) contrast(1.04)}
.compact-slip{font-size:9.6px!important}
.ultra-slip{font-size:8.8px!important}
.micro-slip{font-size:8.1px!important}
.hero{padding:5px 6px;display:flex;align-items:center;gap:5px;color:white;flex-shrink:0}
.compact-slip .hero{padding:4px 5px;gap:4px}
.ultra-slip .hero,.micro-slip .hero{padding:3px 4px;gap:3px}
.logo-box{width:42px;height:42px;min-width:42px;border-radius:15px;background:white;display:grid;place-items:center;box-shadow:0 8px 18px rgba(0,0,0,.16);overflow:hidden}
.compact-slip .logo-box{width:34px;height:34px;min-width:34px;border-radius:12px}
.ultra-slip .logo-box{width:28px;height:28px;min-width:28px;border-radius:9px}
.micro-slip .logo-box{width:24px;height:24px;min-width:24px;border-radius:8px}
.logo-box img{width:100%;height:100%;object-fit:contain}
.logo-box span{font-weight:1000;color:#111827}
.school-info{flex:1;min-width:0}
.school-name{font-size:14px;font-weight:1000;line-height:1;letter-spacing:-.3px;text-transform:uppercase}
.compact-slip .school-name{font-size:11px}
.ultra-slip .school-name{font-size:9.6px}
.micro-slip .school-name{font-size:8.6px}
.tagline{font-size:8.5px;font-weight:800;opacity:.9;margin-top:2px;text-transform:uppercase}
.ultra-slip .tagline,.micro-slip .tagline{font-size:6.7px;margin-top:1px}
.date-box{text-align:right;font-size:9px;line-height:1.3;font-weight:900}
.compact-slip .date-box{font-size:7.8px}
.ultra-slip .date-box{font-size:6.8px}
.micro-slip .date-box{font-size:6.2px}
.date-box span{display:block}
.kid-badge{width:30px;height:30px;border-radius:999px;background:rgba(255,255,255,.92);color:#1f2937;display:grid;place-items:center;font-size:8px;font-weight:1000;box-shadow:0 8px 18px rgba(15,23,42,.14);flex-shrink:0}
.compact-slip .kid-badge{width:24px;height:24px;font-size:6.8px}
.ultra-slip .kid-badge,.micro-slip .kid-badge{width:20px;height:20px;font-size:5.8px}
.diary-table{margin:1.5px 3px 1.5px;border-radius:8px;overflow:hidden;border:1px solid rgba(15,23,42,.16);flex:0 0 auto;min-height:0}
.table-head,.table-row{display:grid;grid-template-columns:minmax(45px,.22fr) minmax(0,1fr);gap:1.2px;padding:.8px}
.table-head div{padding:2px 4px;border-radius:7px;color:white;text-align:center;font-size:8px;font-weight:1000;letter-spacing:.2px}
.ultra-slip .table-head,.ultra-slip .table-row,.micro-slip .table-head,.micro-slip .table-row{grid-template-columns:minmax(39px,.2fr) minmax(0,1fr);gap:.8px;padding:.4px}
.ultra-slip .table-head div,.micro-slip .table-head div{font-size:6.2px;padding:1px 2px;border-radius:5px}
.subject-pill,.task-pill{border-radius:7px;border:1px solid rgba(15,23,42,.12);box-shadow:0 1px 4px rgba(15,23,42,.04);padding:2px 4px;min-height:14px;color:#1f2937;font-weight:750;overflow:hidden}
.ultra-slip .subject-pill,.ultra-slip .task-pill,.micro-slip .subject-pill,.micro-slip .task-pill{padding:1px 2px;min-height:10px;border-radius:5px}
.task-pill{color:#111827;font-weight:800}
.subject-pill{text-align:center;font-weight:1000;white-space:nowrap;text-overflow:clip}
.task-pill{font-weight:700;white-space:normal;overflow-wrap:anywhere;word-break:normal}
.urdu-text{font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq",serif;direction:rtl;font-size:1em;line-height:1.25}
.footer-note{margin:0 4px 3px;border-radius:7px;padding:3px 5px;text-align:center;font-weight:900;flex-shrink:0;font-size:9.2px;line-height:1.25;color:#1f2937;border:1px solid rgba(15,23,42,.08);min-height:18px;display:flex;align-items:center;justify-content:center}
.compact-slip .footer-note{font-size:8.2px;min-height:15px;padding:2px 4px}
.ultra-slip .footer-note{font-size:7.2px;min-height:12px;padding:1px 3px;margin-bottom:2px}
.micro-slip .footer-note{font-size:6.6px;min-height:10px;padding:1px 2px;margin-bottom:1px}
.watermark{position:absolute;right:-14px;bottom:-22px;font-size:78px;font-weight:1000;opacity:.03;pointer-events:none}
@media(max-width:1200px){.designer-layout{grid-template-columns:1fr}.left-column,.right-column{grid-column:auto}.compose-grid{grid-template-columns:1fr}.page-header{display:block}.actions{margin-top:12px}.print-sheet{width:100%;min-height:auto}.edit-row{grid-template-columns:1fr;grid-template-areas:"subject" "diary" "tools" "actions"}.row-tools{grid-template-columns:1fr}.font-size-tools{justify-content:flex-start}.edit-actions{grid-template-columns:1fr}.edit-actions .check{white-space:normal}}
@media print{@page{size:A4 portrait;margin:0}.no-print{display:none!important}.daily-diary-feature{padding:0;background:white;min-height:0}.print-sheet{width:210mm;min-height:0;height:auto;margin:0;padding:1mm;box-shadow:none;gap:.6mm;page-break-after:auto;break-after:auto;grid-template-columns:repeat(2,minmax(0,1fr))!important;align-items:start;justify-content:center;overflow:visible}.diary-card{box-shadow:none;break-inside:avoid;page-break-inside:avoid}.hero{print-color-adjust:exact;-webkit-print-color-adjust:exact}.table-head div,.footer-note,.subject-pill,.task-pill{print-color-adjust:exact;-webkit-print-color-adjust:exact;line-height:1.12!important}}
`
