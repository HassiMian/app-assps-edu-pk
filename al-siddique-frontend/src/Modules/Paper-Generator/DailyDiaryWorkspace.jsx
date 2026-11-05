import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Edit,
  Eye,
  FileText,
  Layers,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  Users,
  WandSparkles,
  X
} from 'lucide-react'
import { currentSchoolDate } from './schoolCalendarDate.js'
import api, { resolveAssetUrl } from '../../services/api'
import { useAcademicStore } from '../../services/useAcademicStore'
import { getTenantStorageItem, setTenantStorageItem } from '../../services/tenantStorage'
import { usePaperStore } from './usePaperStore'
import {
  createLessonPlan,
  generateLessonPlanDraft,
  listLessonPlans,
  parseLessonPlanningText,
  updateLessonPlan
} from './lessonPlanClient'
import {
  createEmptyLessonPlanDocument,
  deriveDiaryRowsFromLessonPlan,
  mergeParsedPlanningText,
  normalizeLessonPlanDocument,
  toLessonPlanPersistencePayload
} from './lessonPlanDomain'
import { buildStudentTermDiary3Up, validateStudentTermDiary3UpLayout } from './studentTermDiary3Up'
import './DailyDiaryWorkspace.css'

const DRAFT_KEY = 'assps_daily_diary_workspace_v3'
const CARD_COUNTS = [2, 3, 4, 5, 6, 8, 10]

const PALETTES = [
  // Eight architecturally distinct Studio editions; preserve original templates.
  { id: 31, name: '01 · Atelier Folio / Studio', premium: true, studio: true, edition: 'atelier', accent: '#54796a', soft: '#f4f7f2', line: '#c6d4c8', ink: '#1f3a35', foil: '#bb9e69' },
  { id: 32, name: '02 · Ivory Ledger / Studio', premium: true, studio: true, edition: 'ledger', accent: '#937850', soft: '#fcf8ef', line: '#d9c7a7', ink: '#42392b', foil: '#ba9863' },
  { id: 33, name: '03 · Nordic Index / Studio', premium: true, studio: true, edition: 'nordic', accent: '#608da3', soft: '#f1f7fa', line: '#c4d7df', ink: '#29465b', foil: '#a9c4d0' },
  { id: 34, name: '04 · Cambridge Folio / Studio', premium: true, studio: true, edition: 'cambridge', accent: '#93866c', soft: '#faf7f1', line: '#d8cbb6', ink: '#3c3b35', foil: '#bcaa88' },
  { id: 35, name: '05 · Jade Monogram / Studio', premium: true, studio: true, edition: 'monogram', accent: '#548f76', soft: '#f0f8f3', line: '#bad5c6', ink: '#244538', foil: '#9abbab' },
  { id: 36, name: '06 · Rose Letterpress / Studio', premium: true, studio: true, edition: 'letterpress', accent: '#ad798e', soft: '#fcf5f8', line: '#dfc7d0', ink: '#564051', foil: '#cbaaaf' },
  { id: 37, name: '07 · Architect Grid / Studio', premium: true, studio: true, edition: 'architect', accent: '#5d9094', soft: '#f0f7f6', line: '#bad0cd', ink: '#274f53', foil: '#aac6c0' },
  { id: 38, name: '08 · Pearl Horizon / Studio', premium: true, studio: true, edition: 'horizon', accent: '#847da5', soft: '#f4f4fa', line: '#d2d0e0', ink: '#373951', foil: '#baa8cf' },

  { id: 1, name: 'Navy Signature', accent: '#0b2a4a', soft: '#edf3f8', line: '#c9d7e4', ink: '#102538' },
  { id: 2, name: 'Royal Blue', accent: '#1769aa', soft: '#edf6fc', line: '#c7dcec', ink: '#12314a' },
  { id: 3, name: 'Crimson Editorial', accent: '#a4343f', soft: '#fbf0f1', line: '#e6c7cb', ink: '#3b2024' },
  { id: 4, name: 'Gold Academy', accent: '#b77b00', soft: '#fff8e8', line: '#ead7aa', ink: '#3b2c12' },

  // Eight new low-ink, print-safe editions. IDs 1-4 remain stable for saved diaries.
  { id: 21, name: 'Porcelain Jade · Premium', premium: true, accent: '#517c70', soft: '#f1f8f4', line: '#bdd5ca', ink: '#1e3540', foil: '#c4a66e' },
  { id: 22, name: 'Champagne Gold · Premium', premium: true, accent: '#a78047', soft: '#fdf8ee', line: '#e4d5ba', ink: '#31313b', foil: '#c8a469' },
  { id: 23, name: 'Powder Blue · Premium', premium: true, accent: '#578db7', soft: '#f0f7fc', line: '#c6ddec', ink: '#1d344b', foil: '#b9a780' },
  { id: 24, name: 'Blush Mauve · Premium', premium: true, accent: '#aa788c', soft: '#fcf4f7', line: '#e6d2dd', ink: '#3a2d3e', foil: '#cfad80' },
  { id: 25, name: 'Lilac Mist · Premium', premium: true, accent: '#9179ad', soft: '#f7f3fb', line: '#ddd2eb', ink: '#302c45', foil: '#c6a97c' },
  { id: 26, name: 'Elegant Sage · Premium', premium: true, accent: '#718e72', soft: '#f4f8f2', line: '#cfddcb', ink: '#293b35', foil: '#c2ac78' },
  { id: 27, name: 'Peach & Navy · Premium', premium: true, accent: '#b9795f', soft: '#fff6f0', line: '#eddbcc', ink: '#21344b', foil: '#cba176' },
  { id: 28, name: 'Silver Lavender · Premium', premium: true, accent: '#827da3', soft: '#f5f4fa', line: '#d9d8e8', ink: '#29334a', foil: '#b9b7c6' },
]

// Independent light color selections for all eight Studio layouts.
const STUDIO_COLORS = [
  { id: 'jade', name: 'Porcelain Jade', accent: '#4f8578', soft: '#f0f8f4', line: '#bad7ca', ink: '#203e3a', foil: '#b8a27b' },
  { id: 'blue', name: 'Powder Blue', accent: '#588fae', soft: '#f0f7fc', line: '#bed7e7', ink: '#253f52', foil: '#b8b1a3' },
  { id: 'champagne', name: 'Champagne', accent: '#a08053', soft: '#fcf8ef', line: '#e2d1b4', ink: '#483c30', foil: '#bda26d' },
  { id: 'lavender', name: 'Lavender Mist', accent: '#867aad', soft: '#f6f4fb', line: '#d6d0e9', ink: '#38354f', foil: '#b1a7c1' },
  { id: 'blush', name: 'Rose Quartz', accent: '#ae7d91', soft: '#fdf5f8', line: '#e4cad4', ink: '#543c4d', foil: '#c0a4a8' },
  { id: 'sand', name: 'Warm Sand', accent: '#ac826c', soft: '#fff8f1', line: '#e8d1c4', ink: '#4e3c33', foil: '#c6aa80' },
  { id: 'sea', name: 'Sea Glass', accent: '#5b9b9b', soft: '#effaf8', line: '#c0dfda', ink: '#2b5050', foil: '#a8c4b7' },
  { id: 'silver', name: 'Silver Pearl', accent: '#707f97', soft: '#f4f6fa', line: '#d1d8e3', ink: '#323e52', foil: '#b9b5bb' },
]

const FONT_STYLES = [
  { id: 'times', name: 'Times New Roman (Academic Classic)', family: "'Times New Roman', Times, 'Georgia', serif" },
  { id: 'inter', name: 'Inter (Modern Sans)', family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { id: 'serif', name: 'Georgia (Editorial Serif)', family: "'Georgia', 'Times New Roman', serif" },
  { id: 'cambria', name: 'Cambria (Scholastic Serif)', family: "'Cambria', 'Georgia', 'Times New Roman', serif" },
  { id: 'garamond', name: 'Garamond (Classic Editorial)', family: "'Garamond', 'Georgia', 'Times New Roman', serif" },
  { id: 'arial', name: 'Arial (Clean Sans)', family: "Arial, 'Helvetica Neue', sans-serif" },
  { id: 'verdana', name: 'Verdana (Readable Sans)', family: "Verdana, Geneva, sans-serif" },
  { id: 'tahoma', name: 'Tahoma (Compact Sans)', family: "Tahoma, Geneva, sans-serif" },
  { id: 'jameel', name: 'Jameel Noori Nastaleeq (Urdu)', family: "'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif" },
  { id: 'naskh', name: 'Noto Naskh Arabic', family: "'Noto Naskh Arabic', Arial, sans-serif" },
]

const DEFAULT_ROWS = [
  { id: 'english', subject: 'ENGLISH', diary: '', isUrdu: false, isBold: false, fontSize: 12, textAlign: 'left', subjectFontSize: 0, subjectBold: false },
  { id: 'urdu', subject: 'URDU', diary: '', isUrdu: true, isBold: false, fontSize: 13, textAlign: 'right', subjectFontSize: 0, subjectBold: false },
  { id: 'math', subject: 'MATH', diary: '', isUrdu: false, isBold: false, fontSize: 12, textAlign: 'left', subjectFontSize: 0, subjectBold: false },
]

const clean = value => {
  const text = String(value ?? '').trim()
  if (!text || /^(null|undefined|\[object Object\])$/i.test(text)) return ''
  return text
}

const safeSchoolName = value => {
  const text = clean(value)
  if (!text || /tenant[_-]|diary[_-]tenant|^assps[_-][a-z0-9]{8,}$/i.test(text)) return 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
  return text
}

const today = currentSchoolDate
const formatDate = value => {
  const date = new Date(`${value || today()}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const calendarDateParts = value => {
  const raw = String(value || today()).trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12) : new Date(raw)
  if (Number.isNaN(date.getTime())) return { day: '--', month: 'DATE', year: '', weekday: '' }
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year: String(date.getFullYear()),
    weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
  }
}

const studentName = student => clean(student?.name || student?.student_name || student?.full_name || [student?.first_name, student?.last_name].filter(Boolean).join(' ')) || 'Student'
const studentRoll = student => clean(student?.roll_number || student?.roll_no || student?.roll || student?.gr_number || '')
const studentSection = student => clean(student?.section || student?.section_name || '')
const studentId = student => String(student?.id || student?.student_id || student?.gr_number || `${studentName(student)}-${studentRoll(student)}`)

function computeA4Layout(count) {
  const map = {
    2: { cols: 1, rows: 2, gap: 3.4, scale: 1.25, baseSubjectSize: 13, headerScale: 1.25 },
    3: { cols: 1, rows: 3, gap: 2.6, scale: 1.15, baseSubjectSize: 12, headerScale: 1.15 },
    4: { cols: 2, rows: 2, gap: 3, scale: 1.0, baseSubjectSize: 11.5, headerScale: 1.0 },
    5: { cols: 2, rows: 3, gap: 2.4, scale: .88, baseSubjectSize: 11, headerScale: .92, lastSpan: true },
    6: { cols: 2, rows: 3, gap: 2.2, scale: .86, baseSubjectSize: 10.5, headerScale: .9 },
    8: { cols: 2, rows: 4, gap: 1.8, scale: .76, baseSubjectSize: 10, headerScale: .82 },
    10: { cols: 2, rows: 5, gap: 1.5, scale: .69, baseSubjectSize: 9.5, headerScale: .75 },
  }
  return map[count] || map[4]
}

function chunk(values, size) {
  const pages = []
  for (let i = 0; i < values.length; i += size) pages.push(values.slice(i, i + size))
  return pages
}

function robustParseDiaryText(text, knownSubjects = []) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(v => v.trim()).filter(Boolean)
  const subjects = [...new Set([...knownSubjects, 'English', 'Urdu', 'Math', 'Mathematics', 'Science', 'GK', 'General Knowledge', 'Islamiat', 'Computer', 'History', 'Geography', 'Pakistan Studies', 'Nazra'])]
  const aliases = new Map(subjects.map(subject => [subject.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, ''), subject]))
  const rows = []; let current = null
  for (const line of lines) {
    const m = line.match(/^([^:]{2,35})\s*[:-]\s*(.*)$/)
    if (m) {
      const key = m[1].toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, '')
      const subject = aliases.get(key)
      if (subject) {
        const hasUrdu = /[\u0600-\u06FF]/.test(m[2]) || /urdu|nazra|islamiat/i.test(subject)
        current = {
          id: `${subject}-${rows.length}-${Date.now()}`,
          subject: subject.toUpperCase(),
          diary: clean(m[2]),
          isUrdu: hasUrdu,
          isBold: false,
          fontSize: hasUrdu ? 13 : 12,
          textAlign: hasUrdu ? 'right' : 'left',
          subjectFontSize: 0,
          subjectBold: false
        }
        rows.push(current)
        continue
      }
    }
    const standalone = aliases.get(line.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g, ''))
    if (standalone) {
      const hasUrdu = /[\u0600-\u06FF]/.test(standalone) || /urdu|nazra|islamiat/i.test(standalone)
      current = {
        id: `${standalone}-${rows.length}-${Date.now()}`,
        subject: standalone.toUpperCase(),
        diary: '',
        isUrdu: hasUrdu,
        isBold: false,
        fontSize: hasUrdu ? 13 : 12,
        textAlign: hasUrdu ? 'right' : 'left',
        subjectFontSize: 0,
        subjectBold: false
      }
      rows.push(current)
      continue
    }
    if (current) current.diary = clean(`${current.diary} ${line}`)
  }
  return rows
}

function StudentCard({
  mode,
  student,
  palette,
  schoolName,
  logoUrl,
  classLabel,
  section,
  date,
  rows,
  footerText,
  cardsPerPage,
  indexInPage,
  subjectColWidth = 28,
  headerScalePercent = 100,
  rowHeightMm = 0,
  fontStyleId = 'times',
  headerPreset = 'standard',
  schoolNameFontSize = 0,
  logoSizeMm = 0,
  footerFontSize = 0,
  globalDiaryFontSize = 12,
  globalSubjectFontSize = 0,
  globalSubjectBold = false,
  tableHeaderFontSize = 12,
  tableHeaderBold = true
}) {
  const layout = computeA4Layout(cardsPerPage)
  const studentSec = studentSection(student) || section
  const calendar = calendarDateParts(date)
  const logo = logoUrl ? resolveAssetUrl(logoUrl) : ''
  const currentSubjectBase = layout.baseSubjectSize || 11.5
  const colRatio = `${subjectColWidth || 28}% 1fr`
  const dynamicHeaderScale = ((headerScalePercent || 100) / 100) * (layout.headerScale || 1.0)
  const isTwoCol = layout.cols >= 2
  const selectedFont = FONT_STYLES.find(f => f.id === fontStyleId) || FONT_STYLES[0]
  const headerFactor = Math.max(0.75, Math.min(1.35, (Number(headerScalePercent) || 100) / 100))
  const presetFactor = headerPreset === 'compact' ? .78 : headerPreset === 'spacious' ? 1.28 : 1
  const urduCardFont = selectedFont.id === 'naskh'
    ? "'Noto Naskh Arabic', Arial, sans-serif"
    : "'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif"

  const rowCount = rows.filter(r => clean(r.subject) || clean(r.diary)).length
  const isCompactHeader = headerPreset === 'compact' || (rowCount >= 4 && cardsPerPage >= 6)

  return <article
    className={`dd-card ${palette.premium ? 'dd-card-premium' : ''} ${palette.studio ? `dd-card-studio dd-edition-${palette.edition}` : ''} ${isTwoCol ? 'dd-card-two-col' : 'dd-card-one-col'} ${isCompactHeader ? 'dd-card-compact' : ''} dd-density-${cardsPerPage} ${layout.lastSpan && cardsPerPage === 5 && indexInPage === 4 ? 'span-last' : ''}`}
    style={{
      '--accent': palette.accent,
      '--soft': palette.soft,
      '--line': palette.line,
      '--ink': palette.ink,
      '--foil': palette.foil || palette.accent,
      '--scale': layout.scale,
      '--header-scale': dynamicHeaderScale,
      '--dd-font': selectedFont.family,
      '--dd-urdu-font': urduCardFont,
      '--dd-header-factor': headerFactor,
      '--dd-preset-factor': presetFactor,
      '--dd-school-base': (schoolNameFontSize > 0 ? schoolNameFontSize : 16) + 'px',
      '--dd-logo-base': (logoSizeMm > 0 ? logoSizeMm : 14) + 'mm',
      '--dd-row-height': rowHeightMm > 0 ? 'calc(' + rowHeightMm + 'mm * var(--scale))' : '0px',
      '--dd-row-flex': rowHeightMm > 0 ? '0 0 var(--dd-row-height)' : '1 1 auto',
      '--dd-table-head-size': 'clamp(8px, calc(' + (tableHeaderFontSize || 12) + 'px * var(--scale)), 20px)',
      '--dd-table-head-weight': tableHeaderBold ? 850 : 650,
      '--dd-footer-size': 'clamp(7.5px, calc(' + (footerFontSize || 9) + 'px * var(--scale)), 16px)',
      fontFamily: selectedFont.family
    }}
    data-student-card
  >
    <div className="dd-card-accent" />
    <header className={`dd-card-head ${isCompactHeader ? 'dd-card-head-compact' : ''}`}>
      <div className="dd-head-top">
        <div
          className="dd-logo"
          style={logoSizeMm > 0 ? { width: `calc(${logoSizeMm}mm * var(--scale))`, height: `calc(${logoSizeMm}mm * var(--scale))` } : {}}
        >
          {logo ? <img src={logo} alt="ASSPS logo" /> : <span>ASSPS</span>}
        </div>
        <div className="dd-brand">
          <strong
            className="dd-school-name"
            style={schoolNameFontSize > 0 ? { fontSize: `calc(${schoolNameFontSize}px * var(--scale))` } : {}}
          >
            {safeSchoolName(schoolName)}
          </strong>
          <div className="dd-brand-badge-row">
            <span className="dd-mode-badge">{mode === 'lesson' ? 'LESSON PLAN' : 'DAILY DIARY'}</span>
            <span className="dd-motto-tag">Official Student Academic Record</span>
          </div>
        </div>
        {palette.premium && (
          <div className="dd-premium-calendar" role="group" aria-label={'Diary date ' + formatDate(date)}>
            <span className="dd-premium-calendar-month">{calendar.month} {calendar.year}</span>
            <strong className="dd-premium-calendar-day">{calendar.day}</strong>
            <span className="dd-premium-calendar-weekday">{calendar.weekday}</span>
          </div>
        )}
      </div>
      <div className="dd-head-meta-row">
        <div className="dd-meta-pill dd-meta-class">
          <span className="dd-meta-lbl">CLASS / SECTION</span>
          <b className="dd-meta-val dd-class-val">{classLabel}{studentSec ? ` · ${studentSec}` : ''}</b>
        </div>
        <div className="dd-meta-pill dd-meta-date">
          <span className="dd-meta-lbl">DATE</span>
          <b className="dd-meta-val dd-date-val">{formatDate(date)}</b>
        </div>
      </div>
    </header>

    <div className="dd-student-strip">
      <div className="dd-student-field dd-student-name-field">
        <span className="dd-student-lbl">STUDENT:</span>
        <strong className="dd-student-val">{student ? studentName(student) : 'Student Name'}</strong>
      </div>
      {palette.premium && (
        <div className="dd-student-field dd-student-class-field">
          <span className="dd-student-lbl">CLASS:</span>
          <strong className="dd-student-val">{classLabel}{studentSec ? ' · ' + studentSec : ''}</strong>
        </div>
      )}
      <div className="dd-student-field dd-student-roll-field">
        <span className="dd-student-lbl">ROLL:</span>
        <strong className="dd-student-val">{student ? (studentRoll(student) || '—') : '—'}</strong>
      </div>
    </div>

    <div className="dd-table-head" style={{ gridTemplateColumns: colRatio }}>
      <span className="dd-th-subject">SUBJECT</span>
      <span className="dd-th-diary">{mode === 'lesson' ? 'PLANNED LEARNING / TASK' : 'HOME TASK / DIARY'}</span>
    </div>

    <div className="dd-rows">
      {rows.filter(row => clean(row.subject) || clean(row.diary)).map((row, index) => {
        const hasUrduSubject = /[\u0600-\u06FF]/.test(row.subject || '')
        const hasUrduDiary = /[\u0600-\u06FF]/.test(row.diary || '') || row.isUrdu
        const effectiveSubjSize = row.subjectFontSize || globalSubjectFontSize || currentSubjectBase
        const effectiveDiarySize = Math.max(9.5, Number(row.fontSize) || globalDiaryFontSize || 12)
        const isSubjBold = row.subjectBold ?? globalSubjectBold
        const minHeightStyle = rowHeightMm > 0 ? `calc(${rowHeightMm}mm * var(--scale))` : undefined

        return (
          <div
            className="dd-row"
            key={row.id || `${row.subject}-${index}`}
            style={{
              gridTemplateColumns: colRatio,
              minHeight: minHeightStyle
            }}
          >
            <b
              className={`dd-sub-cell ${hasUrduSubject ? 'urdu' : ''}`}
              style={{
                fontSize: `calc(${effectiveSubjSize * (hasUrduSubject ? 1.15 : 1)}px * var(--scale))`,
                fontWeight: isSubjBold ? '850' : '500',
                textAlign: row.subjectAlign || (hasUrduSubject ? 'right' : 'center'),
                justifyContent: row.subjectAlign === 'left' ? 'flex-start' : (row.subjectAlign === 'right' ? 'flex-end' : 'center')
              }}
            >
              <span>{clean(row.subject) || 'SUBJECT'}</span>
            </b>
            <div
              className={`dd-diary-cell ${hasUrduDiary ? 'urdu' : ''}`}
              style={{
                fontWeight: row.isBold ? '800' : '500',
                textAlign: row.textAlign || (hasUrduDiary ? 'right' : 'left'),
                fontSize: `calc(${effectiveDiarySize}px * var(--scale))`
              }}
            >
              {clean(row.diary) || '—'}
            </div>
          </div>
        )
      })}
    </div>

    {clean(footerText) && (
      <footer
        className={/[\u0600-\u06FF]/.test(footerText) ? 'urdu' : ''}
        style={footerFontSize > 0 ? { fontSize: `calc(${footerFontSize}px * var(--scale))` } : {}}
      >
        {clean(footerText)}
      </footer>
    )}
  </article>
}

export default function DailyDiaryWorkspace({ initialMode = 'diary', initialLessonPlanId = '', initialContext = null }) {
  const { activeClasses, subjectsForClass, sectionsForClass } = useAcademicStore()
  const { paperSettings } = usePaperStore()

  const [initialDraft] = useState(() => {
    try {
      const raw = getTenantStorageItem(DRAFT_KEY) || getTenantStorageItem('assps_daily_diary_workspace_v2')
      const draft = raw ? JSON.parse(raw) : {}
      return draft && typeof draft === 'object' && !Array.isArray(draft) ? draft : {}
    } catch { return {} }
  })

  // Navigation: 'editor' | 'library' | 'preview'
  const [activeTab, setActiveTab] = useState('editor')
  const [mode, setMode] = useState(initialMode === 'lesson' ? 'lesson' : (initialDraft.mode || 'diary'))
  const [classLevel, setClassLevel] = useState(initialDraft.classLevel || '')
  const [section, setSection] = useState(initialDraft.section || '')
  const [date, setDate] = useState(initialDraft.date || today())
  const [rows, setRows] = useState(Array.isArray(initialDraft.rows) && initialDraft.rows.length ? initialDraft.rows : DEFAULT_ROWS)
  const [cardsPerPage, setCardsPerPage] = useState(CARD_COUNTS.includes(Number(initialDraft.cardsPerPage)) ? Number(initialDraft.cardsPerPage) : 6)
  const [paletteId, setPaletteId] = useState(PALETTES.some(p => p.id === Number(initialDraft.paletteId)) ? Number(initialDraft.paletteId) : 31)
  const [studioColorId, setStudioColorId] = useState(STUDIO_COLORS.some(item => item.id === initialDraft.studioColorId) ? initialDraft.studioColorId : 'jade')
  const [footerText, setFooterText] = useState(initialDraft.footerText || 'Please review the assigned work and keep this card in the notebook.')
  const [subjectColWidth, setSubjectColWidth] = useState(Number(initialDraft.subjectColWidth) || 28)
  const [headerScalePercent, setHeaderScalePercent] = useState(Number(initialDraft.headerScalePercent) || 100)
  const [rowHeightMm, setRowHeightMm] = useState(Number(initialDraft.rowHeightMm) || 0)
  const [fontStyleId, setFontStyleId] = useState(initialDraft.fontStyleId || 'times')

  // Advanced Header & Layout Controls
  const [headerPreset, setHeaderPreset] = useState(initialDraft.headerPreset || 'standard')
  const [schoolNameFontSize, setSchoolNameFontSize] = useState(Number(initialDraft.schoolNameFontSize) || 0)
  const [logoSizeMm, setLogoSizeMm] = useState(Number(initialDraft.logoSizeMm) || 0)
  const [showHeaderSettings, setShowHeaderSettings] = useState(false)

  // Typography & Studio Sizing Controls
  const [globalDiaryFontSize, setGlobalDiaryFontSize] = useState(Number(initialDraft.globalDiaryFontSize) || 12)
  const [globalSubjectFontSize, setGlobalSubjectFontSize] = useState(Number(initialDraft.globalSubjectFontSize) || 0)
  const [globalSubjectBold, setGlobalSubjectBold] = useState(Boolean(initialDraft.globalSubjectBold ?? false))
  const [footerFontSize, setFooterFontSize] = useState(Number(initialDraft.footerFontSize) || 0)
  const [tableHeaderFontSize, setTableHeaderFontSize] = useState(Math.max(9, Math.min(20, Number(initialDraft.tableHeaderFontSize) || 12)))
  const [tableHeaderBold, setTableHeaderBold] = useState(Boolean(initialDraft.tableHeaderBold ?? true))
  const [editorFontSize, setEditorFontSize] = useState(Number(initialDraft.editorFontSize) || 13)

  // Saved Record Identity & Library State
  const [activeSavedDiaryId, setActiveSavedDiaryId] = useState(initialDraft.activeSavedDiaryId || null)
  const [savedDiariesList, setSavedDiariesList] = useState([])
  const [savedDiariesLoading, setSavedDiariesLoading] = useState(false)
  const [libraryFilterClass, setLibraryFilterClass] = useState('')
  const [libraryFilterDate, setLibraryFilterDate] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryViewArchived, setLibraryViewArchived] = useState(false)
  const [libraryPagination, setLibraryPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })

  const [pasteText, setPasteText] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [rosterStatus, setRosterStatus] = useState('')
  const [rosterVerified, setRosterVerified] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const savedDiaryIdentities = useRef(new Map())
  const diaryScopeGeneration = useRef(0)
  useEffect(() => { diaryScopeGeneration.current += 1 }, [classLevel, section, date])
  // A server record identity is only active for the exact editor school-day selection.
  const displayedSavedDiaryId = activeSavedDiaryId != null && savedDiaryIdentities.current.get(JSON.stringify([classLevel, section, date])) === Number(activeSavedDiaryId)
    ? Number(activeSavedDiaryId) : null
  const [status, setStatus] = useState('')
  const [previewZoom, setPreviewZoom] = useState(.68)
  const [lessonPlans, setLessonPlans] = useState([])
  const [lessonDoc, setLessonDoc] = useState(() => createEmptyLessonPlanDocument({ planningType: 'daily', startDate: today(), endDate: today() }))
  const [lessonPlanId, setLessonPlanId] = useState('')
  const latestLessonDocRef = useRef(lessonDoc)
  useEffect(() => { latestLessonDocRef.current = lessonDoc }, [lessonDoc])
  const [lessonPaste, setLessonPaste] = useState('')
  const [busy, setBusy] = useState('')

  const selectedClass = useMemo(() => activeClasses.find(item => String(item.level) === String(classLevel) || item.name === classLevel) || null, [activeClasses, classLevel])
  const classLabel = selectedClass?.name || classLevel || 'Class'
  const subjectOptions = useMemo(() => subjectsForClass(classLevel || selectedClass?.level || '') || [], [subjectsForClass, classLevel, selectedClass?.level])
  const sectionOptions = useMemo(() => selectedClass ? sectionsForClass(selectedClass.name) : [], [selectedClass, sectionsForClass])
  const structure = PALETTES.find(item => item.id === paletteId) || PALETTES[0]
  const studioColor = STUDIO_COLORS.find(item => item.id === studioColorId) || STUDIO_COLORS[0]
  const palette = structure.studio ? { ...structure, ...studioColor, id: structure.id, name: structure.name, studio: true, premium: true, edition: structure.edition } : structure
  const schoolName = safeSchoolName(paperSettings?.schoolName)
  const logoUrl = paperSettings?.logo || ''
  const previewRows = useMemo(() => mode === 'lesson' ? deriveDiaryRowsFromLessonPlan(lessonDoc, date).map(row => ({ ...row, fontSize: row.fontSize || globalDiaryFontSize || (row.isUrdu ? 13 : 12), isBold: false, textAlign: row.isUrdu ? 'right' : 'left', subjectFontSize: row.subjectFontSize || globalSubjectFontSize || 0, subjectBold: row.subjectBold ?? globalSubjectBold })) : rows, [mode, lessonDoc, date, rows, globalDiaryFontSize, globalSubjectFontSize, globalSubjectBold])
  const filteredStudents = useMemo(() => students.filter(student => { const hay = `${studentName(student)} ${studentRoll(student)}`.toLowerCase(); return !search || hay.includes(search.toLowerCase()) }), [students, search])
  const selectedStudents = useMemo(() => students.filter(student => selectedStudentIds.includes(studentId(student))), [students, selectedStudentIds])
  const genericCards = useMemo(() => Array.from({ length: cardsPerPage }, (_, index) => ({ __generic: index })), [cardsPerPage])
  const cardPopulation = selectedStudents.length ? selectedStudents : genericCards
  const pages = useMemo(() => chunk(cardPopulation, cardsPerPage), [cardPopulation, cardsPerPage])

  const activeLayout = useMemo(() => computeA4Layout(cardsPerPage), [cardsPerPage])

  // Save drafts locally
  useEffect(() => {
    try {
      setTenantStorageItem(DRAFT_KEY, JSON.stringify({
        mode, classLevel, section, date, rows, cardsPerPage, paletteId, studioColorId, footerText,
        subjectColWidth, headerScalePercent, rowHeightMm, fontStyleId, headerPreset,
        schoolNameFontSize, logoSizeMm, activeSavedDiaryId,
        globalDiaryFontSize, globalSubjectFontSize, globalSubjectBold,
        tableHeaderFontSize, tableHeaderBold, footerFontSize, editorFontSize
      }))
    } catch { /* Preserve editor state */ }
  }, [mode, classLevel, section, date, rows, cardsPerPage, paletteId, studioColorId, footerText, subjectColWidth, headerScalePercent, rowHeightMm, fontStyleId, headerPreset, schoolNameFontSize, logoSizeMm, activeSavedDiaryId, globalDiaryFontSize, globalSubjectFontSize, globalSubjectBold, tableHeaderFontSize, tableHeaderBold, footerFontSize, editorFontSize])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      if (initialMode === 'lesson') setMode('lesson')
      if (initialContext?.classLevel) setClassLevel(initialContext.classLevel)
      if (initialContext?.section) setSection(initialContext.section)
      if (initialContext?.date) setDate(initialContext.date)
    })
    return () => { cancelled = true }
  }, [initialMode, initialContext?.nonce, initialContext?.classLevel, initialContext?.section, initialContext?.date])

  useEffect(() => {
    if (!initialLessonPlanId || !lessonPlans.length) return
    const plan = lessonPlans.find(item => String(item.id) === String(initialLessonPlanId))
    if (!plan) return
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) { setLessonPlanId(String(initialLessonPlanId)); setLessonDoc(normalizeLessonPlanDocument(plan)); setMode('lesson') } })
    return () => { cancelled = true }
  }, [initialLessonPlanId, lessonPlans])

  useEffect(() => {
    if (!classLevel) { let cancelled = false; queueMicrotask(() => { if (!cancelled) { setStudents([]); setSelectedStudentIds([]); setRosterVerified(false) } }); return () => { cancelled = true } }
    let cancelled = false; queueMicrotask(() => { if (!cancelled) { setRosterStatus('Loading roster…'); setRosterVerified(false) } })
    api.get('/api/students', { params: { class: classLabel, active: 'true' }, skipCache: true })
      .then(response => {
        if (cancelled) return
        const list = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : []
        // An unassigned student could belong to ANY section. Never treat it as
        // a verified member of the selected section, or silently omit it.
        const unverifiedSectionRows = section ? list.filter(student => !studentSection(student)) : []
        if (unverifiedSectionRows.length) {
          setStudents([])
          setSelectedStudentIds([])
          setRosterStatus(`${unverifiedSectionRows.length} students have no verified section; print blocked until roster is corrected.`)
          setRosterVerified(false)
          return
        }
        const scoped = section ? list.filter(student => studentSection(student).toLowerCase() === section.toLowerCase()) : list
        setStudents(scoped)
        setSelectedStudentIds(scoped.map(studentId))
        setRosterStatus(`${scoped.length} students loaded`)
        setRosterVerified(true)
      })
      .catch(error => { if (cancelled) return; setRosterVerified(false); setStudents([]); setSelectedStudentIds([]); setRosterStatus(error?.response?.data?.message || 'Student roster unavailable. Retry before printing.') })
    return () => { cancelled = true }
  }, [classLevel, classLabel, section])

  useEffect(() => {
    if (!classLevel || mode !== 'lesson') return
    let cancelled = false
    listLessonPlans({ classLevel, from: date, to: date, limit: 100 }).then(plans => { if (!cancelled) setLessonPlans(Array.isArray(plans) ? plans : []) }).catch(() => { })
    return () => { cancelled = true }
  }, [classLevel, date, mode])

  // Load Saved Diaries Library from API
  const fetchSavedDiaries = useCallback(async (page = 1) => {
    setSavedDiariesLoading(true)
    try {
      const params = {
        limit: 20,
        page,
        ...(libraryFilterClass ? { class_level: libraryFilterClass } : {}),
        ...(libraryFilterDate ? { date: libraryFilterDate } : {}),
        ...(librarySearch ? { search: librarySearch } : {}),
        archived: libraryViewArchived ? 'true' : 'false'
      }
      const res = await api.get('/api/daily-diary', { params, skipCache: true })
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSavedDiariesList(res.data.data)
        if (res.data.pagination) setLibraryPagination(res.data.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch saved diaries:', err)
    } finally {
      setSavedDiariesLoading(false)
    }
  }, [libraryFilterClass, libraryFilterDate, librarySearch, libraryViewArchived])

  useEffect(() => {
    if (activeTab !== 'library') return undefined
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) void fetchSavedDiaries(1) })
    return () => { cancelled = true }
  }, [activeTab, fetchSavedDiaries])

  const updateRow = (index, patch) => setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row))
  const addRow = () => setRows(current => [...current, { id: `row-${Date.now()}`, subject: '', diary: '', isUrdu: false, isBold: false, fontSize: 12, textAlign: 'left', subjectFontSize: 0, subjectBold: false }])
  const removeRow = index => setRows(current => current.filter((_, i) => i !== index))
  const applyDiaryPaste = () => { const parsed = robustParseDiaryText(pasteText, subjectOptions); if (!parsed.length) { setStatus('No subject lines detected. Use “Subject: task” format.'); return } setRows(parsed); setPasteText(''); setStatus(`Diary auto-arranged into ${parsed.length} subject rows.`) }

  const selectPlan = planId => { setLessonPlanId(planId); const plan = lessonPlans.find(item => String(item.id) === String(planId)); if (plan) { const doc = normalizeLessonPlanDocument(plan); setLessonDoc(doc); if (doc.startDate) setDate(doc.startDate) } }
  const autoPlanToday = async () => { if (lessonDoc.planningType !== 'daily') { setStatus('Term plans cannot be replaced from Daily Diary. Open Lesson Planning workspace to edit the term.'); return } if (!classLevel) { setStatus('Select class first.'); return } setBusy('generate'); try { const result = await generateLessonPlanDraft({ planningType: 'daily', classLevel, section, startDate: date, endDate: date, subjects: subjectOptions, useAi: true, bufferRatio: .05 }); setLessonDoc(normalizeLessonPlanDocument(result.plan)); setStatus(result.ai?.used ? 'Daily multi-subject plan generated with AI enrichment.' : 'Daily plan generated from timetable/context; AI enrichment was unavailable or not needed.') } catch (error) { setStatus(error?.response?.data?.message || 'Daily plan generation failed.') } finally { setBusy('') } }
  const arrangeLessonPaste = async () => { if (lessonDoc.planningType !== 'daily') { setStatus('Term plans cannot be overwritten from Daily Diary. Open Lesson Planning workspace.'); return } if (!lessonPaste.trim()) return; setBusy('parse'); try { const parsed = await parseLessonPlanningText(lessonPaste, subjectOptions); const next = mergeParsedPlanningText({ ...lessonDoc, classLevel, section, startDate: date, endDate: date, planningType: 'daily' }, parsed); setLessonDoc(next); setLessonPaste(''); setStatus(parsed.unclassified?.length ? 'Lesson plan arranged; review preserved unclassified lines.' : 'Whole-day lesson text arranged by subject.') } catch (error) { setStatus(error?.response?.data?.message || 'Could not arrange lesson plan text.') } finally { setBusy('') } }

  const saveLessonPlan=async()=>{
    if (lessonDoc.planningType !== 'daily') { setStatus('Term plan is print-only in this Daily Diary editor. Edit/save through Lesson Planning workspace; academic content is unchanged.'); return }
    const submittedScope = diaryScopeGeneration.current
    const submittedDocument = lessonDoc
    setBusy('lesson-save')
    try {
      const payload = toLessonPlanPersistencePayload({ ...lessonDoc, classLevel, section, startDate: date, endDate: date, planningType: 'daily' })
      const saved = lessonDoc.id ? await updateLessonPlan(payload) : await createLessonPlan(payload)
      const doc = normalizeLessonPlanDocument(saved)
      if (diaryScopeGeneration.current === submittedScope && latestLessonDocRef.current === submittedDocument) {
        setLessonDoc(doc)
        setLessonPlanId(doc.id || '')
        setStatus('Lesson plan saved safely.')
      } else {
        setStatus('Previous lesson plan saved. Current editor selection was not overwritten.')
      }
      setLessonPlans(current => {
        const filtered = current.filter(item => String(item.id) !== String(saved.id))
        return [saved, ...filtered]
      })
    } catch (error) {
      setStatus(error?.response?.data?.message || 'Lesson plan save failed. Local workspace remains intact.')
    } finally {
      setBusy('')
    }
  }
  // When switching from Auto, derive the current physical row height before
  // stepping. CSS zoom affects getBoundingClientRect, so use offsetHeight.
  const changeRowHeight = direction => {
    const row = document.querySelector('.dd-card-studio .dd-row') || document.querySelector('.dd-card .dd-row')
    const scale = computeA4Layout(cardsPerPage).scale || 1
    const actualMm = row ? row.offsetHeight / (96 / 25.4) / scale : 12
    const currentMm = rowHeightMm > 0 ? rowHeightMm : actualMm
    const next = direction > 0 ? Math.ceil(currentMm) + 2 : Math.floor(currentMm) - 2
    setRowHeightMm(Math.min(26, Math.max(6, next)))
  }

  const changeGlobalDiaryFontSize = delta => {
    const next = Math.max(9, Math.min(24, (globalDiaryFontSize || 12) + delta))
    setGlobalDiaryFontSize(next)
    setRows(current => current.map(row => ({ ...row, fontSize: next })))
  }

  const changeGlobalSubjectFontSize = delta => {
    const cur = globalSubjectFontSize || activeLayout.baseSubjectSize || 11
    const next = Math.max(8, Math.min(22, cur + delta))
    setGlobalSubjectFontSize(next)
    setRows(current => current.map(row => ({ ...row, subjectFontSize: next })))
  }

  const toggleGlobalSubjectBold = () => {
    const next = !globalSubjectBold
    setGlobalSubjectBold(next)
    setRows(current => current.map(row => ({ ...row, subjectBold: next })))
  }

  const changeFooterFontSize = delta => {
    const cur = footerFontSize || 6.5
    const next = Math.max(5, Math.min(14, +(cur + delta).toFixed(1)))
    setFooterFontSize(next)
  }

  const changeEditorFontSize = delta => {
    const next = Math.max(10, Math.min(22, (editorFontSize || 13) + delta))
    setEditorFontSize(next)
  }

  const reopenSavedDiary = async () => {
    if (!classLevel || !date) { setStatus('Select a class and date before reopening a saved diary.'); return }
    let schoolId = 0
    try { const user = JSON.parse(window.localStorage.getItem('al_siddique_user') || '{}'); schoolId = Number(user.school_id || user.schoolId || 0) } catch { /* Reject unverified school identity below. */ }
    if (!Number.isSafeInteger(schoolId) || schoolId <= 0) { setStatus('Current school identity could not be verified. Sign in to reopen a diary.'); return }
    const openGeneration = diaryScopeGeneration.current
    const stillCurrent = () => diaryScopeGeneration.current === openGeneration
    const staleSelection = () => setStatus('Diary selection changed while reopening. Saved record was not loaded; editor content was preserved.')
    setBusy('diary-open')
    const matchesScope = record => Number(record.school_id) === schoolId && String(record.class_level || '') === String(classLevel) && String(record.style_settings?.section || '') === String(section) && String(record.diary_date || '').slice(0, 10) === date
    try {
      const listResponse = await api.get('/api/daily-diary', { params: { limit: 100 }, skipCache: true })
      if (!stillCurrent()) { staleSelection(); return }
      if (listResponse.data?.success !== true || !Array.isArray(listResponse.data?.data)) throw new Error('Saved diary list was not verified.')
      const matches = listResponse.data.data.filter(matchesScope)
      if (!matches.length) { setStatus('No saved diary found for this class, section and date in the accessible list.'); return }
      if (matches.length !== 1) { setStatus('Multiple saved diaries match. Select the exact record in Saved Diaries before editing.'); return }
      const id = Number(matches[0].id)
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Saved diary identity is invalid.')
      if (!window.confirm('Reopen this saved diary? This replaces unsaved fields currently in the editor.')) return
      if (!stillCurrent()) { staleSelection(); return }
      const detailResponse = await api.get(`/api/daily-diary/${id}`, { skipCache: true })
      if (!stillCurrent()) { staleSelection(); return }
      const saved = detailResponse.data?.data
      if (detailResponse.data?.success !== true || !saved || Number(saved.id) !== id || !matchesScope(saved)) throw new Error('Saved diary scope verification failed. Editor was not changed.')
      if (!Array.isArray(saved.rows)) throw new Error('Saved diary content is invalid. Editor was not changed.')

      loadDiaryRecordIntoEditor(saved)
      savedDiaryIdentities.current.set(JSON.stringify([classLevel, section, date]), id)
      setActiveSavedDiaryId(id)
      setStatus('Saved diary reopened and verified. Changes will update its original record.')
    } catch (error) { setStatus(error?.response?.data?.message || error?.message || 'Saved diary could not be reopened. Local editor remains intact.') }
    finally { setBusy('') }
  }

  const loadDiaryRecordIntoEditor = record => {
    if (!record) return
    if (record.class_level) setClassLevel(String(record.class_level))
    if (record.style_settings?.section !== undefined) setSection(String(record.style_settings.section))
    if (record.diary_date) setDate(String(record.diary_date).slice(0, 10))
    if (Array.isArray(record.rows)) setRows(record.rows)
    if (CARD_COUNTS.includes(Number(record.slips_per_page))) setCardsPerPage(Number(record.slips_per_page))
    if (PALETTES.some(p => p.id === Number(record.style_settings?.paletteId || record.template_id))) {
      setPaletteId(Number(record.style_settings?.paletteId || record.template_id))
    }
    setStudioColorId(STUDIO_COLORS.some(item => item.id === record.style_settings?.studioColorId) ? record.style_settings.studioColorId : 'jade')
    if (typeof record.footer_text === 'string') setFooterText(record.footer_text)
    if (record.style_settings?.subjectColWidth) setSubjectColWidth(Number(record.style_settings.subjectColWidth))
    if (record.style_settings?.headerScalePercent) setHeaderScalePercent(Number(record.style_settings.headerScalePercent))
    if (record.style_settings?.rowHeightMm !== undefined) setRowHeightMm(Number(record.style_settings.rowHeightMm))
    if (record.style_settings?.fontStyleId) setFontStyleId(record.style_settings.fontStyleId)
    if (Number.isFinite(Number(record.style_settings?.tableHeaderFontSize)) && Number(record.style_settings?.tableHeaderFontSize) >= 9) setTableHeaderFontSize(Math.min(20, Number(record.style_settings.tableHeaderFontSize)))
    if (typeof record.style_settings?.tableHeaderBold === 'boolean') setTableHeaderBold(record.style_settings.tableHeaderBold)
    if (record.style_settings?.headerPreset) setHeaderPreset(record.style_settings.headerPreset)
    if (record.style_settings?.schoolNameFontSize) setSchoolNameFontSize(Number(record.style_settings.schoolNameFontSize))
    if (record.style_settings?.logoSizeMm) setLogoSizeMm(Number(record.style_settings.logoSizeMm))
    if (record.style_settings?.globalDiaryFontSize) setGlobalDiaryFontSize(Number(record.style_settings.globalDiaryFontSize))
    if (record.style_settings?.globalSubjectFontSize !== undefined) setGlobalSubjectFontSize(Number(record.style_settings.globalSubjectFontSize))
    if (record.style_settings?.globalSubjectBold !== undefined) setGlobalSubjectBold(Boolean(record.style_settings.globalSubjectBold))
    if (record.style_settings?.footerFontSize !== undefined) setFooterFontSize(Number(record.style_settings.footerFontSize))
    if (record.style_settings?.editorFontSize) setEditorFontSize(Number(record.style_settings.editorFontSize))

    setActiveSavedDiaryId(Number(record.id))
    savedDiaryIdentities.current.set(JSON.stringify([String(record.class_level), String(record.style_settings?.section || ''), String(record.diary_date).slice(0, 10)]), Number(record.id))
    setActiveTab('editor')
    setStatus(`Diary #${record.id} loaded into workspace.`)
  }

  const duplicateDiaryRecord = record => {
    loadDiaryRecordIntoEditor(record)
    setDate(today())
    setActiveSavedDiaryId(null)
    setStatus(`Duplicated as new draft for today (${formatDate(today())}). Click Save to store.`)
  }

  const toggleArchiveDiary = async (record, e) => {
    e?.stopPropagation()
    const willArchive = record.style_settings?.isArchived !== true
    try {
      const res = await api.patch(`/api/daily-diary/${record.id}/archive`, { isArchived: willArchive })
      if (res.data?.success) {
        setStatus(willArchive ? `Diary #${record.id} moved to archive.` : `Diary #${record.id} restored.`)
        fetchSavedDiaries(libraryPagination.page)
      }
    } catch {
      setStatus('Failed to change archive status.')
    }
  }

  const deleteDiaryRecord = async (record, e) => {
    e?.stopPropagation()
    if (!window.confirm(`Permanently delete Diary #${record.id} for ${record.class_name || record.class_level}?`)) return
    try {
      const res = await api.delete(`/api/daily-diary/${record.id}`)
      if (res.data?.success) {
        setStatus(`Diary #${record.id} deleted.`)
        if (activeSavedDiaryId === Number(record.id)) setActiveSavedDiaryId(null)
        fetchSavedDiaries(libraryPagination.page)
      }
    } catch {
      setStatus('Failed to delete diary.')
    }
  }

  const saveDiary = async () => {
    if (saving) return
    const saveGeneration = diaryScopeGeneration.current
    setSaving(true)
    try {
      const payload = {
        template_id: paletteId,
        school_name: schoolName,
        tagline: '',
        logo_url: logoUrl,
        class_level: classLevel,
        class_name: classLabel,
        diary_date: date,
        slips_per_page: cardsPerPage,
        footer_text: footerText,
        footer_is_urdu: /[\u0600-\u06ff]/.test(footerText),
        rows,
        style_settings: {
          workspaceVersion: 3,
          section,
          paletteId,
          studioColorId,
          mode: 'diary',
          subjectColWidth,
          headerScalePercent,
          rowHeightMm,
          fontStyleId,
          headerPreset,
          schoolNameFontSize,
          logoSizeMm,
          globalDiaryFontSize,
          globalSubjectFontSize,
          globalSubjectBold,
          tableHeaderFontSize,
          tableHeaderBold,
          footerFontSize,
          editorFontSize
        }
      }
      // Validate the persisted record against the request snapshot, not a later editor selection.
      const requestedScope = [String(payload.class_level), String(payload.style_settings.section), String(payload.diary_date)]
      const scopeKey = JSON.stringify(requestedScope)
      const updateId = savedDiaryIdentities.current.get(scopeKey) || null
      const response = updateId ? await api.put(`/api/daily-diary/${updateId}`, payload) : await api.post('/api/daily-diary', payload)
      const saved = response.data?.data
      if (response.data?.success !== true || !Number.isSafeInteger(saved?.id) || saved.id <= 0) throw new Error('Unverified Diary Save response')
      if (updateId && Number(saved.id) !== Number(updateId)) throw new Error('Diary Save returned a different record identity')
      if ((saved.class_level != null && String(saved.class_level) !== requestedScope[0]) || (saved.diary_date != null && String(saved.diary_date).slice(0, 10) !== requestedScope[2]) || (saved.style_settings?.section != null && String(saved.style_settings.section) !== requestedScope[1])) throw new Error('Diary Save returned a different school-day selection')

      savedDiaryIdentities.current.set(scopeKey, Number(saved.id))
      const stillEditingRequestedScope = diaryScopeGeneration.current === saveGeneration
      if (stillEditingRequestedScope) setActiveSavedDiaryId(Number(saved.id))
      // A stale response must not clear a newer editor selection's legitimate record identity.
      setStatus(stillEditingRequestedScope ? `Daily diary saved safely (ID #${saved.id}).` : 'Previous diary selection was saved. Current editor selection was not saved.')
    } catch (error) {
      setStatus(diaryScopeGeneration.current === saveGeneration ? (error?.response?.data?.message || 'Daily diary save failed. Local recovery draft remains available.') : 'Previous diary selection could not be saved. Current editor selection was not submitted.')
    } finally { setSaving(false) }
  }

  const toggleStudent = id => setSelectedStudentIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  const selectAll = () => setSelectedStudentIds(students.map(studentId))
  const clearStudents = () => setSelectedStudentIds([])

  // Actual SaaS students + saved/planned curriculum: same locked landscape 3-up print geometry.
  // This is a print preview, NOT an academic approval or a database write.
  const printStudentTermCards = () => {
    if (!rosterVerified) { setStatus('Print blocked: authenticated class roster is not loaded. Retry the student list.'); return }
    try {
      const output = buildStudentTermDiary3Up({
        students:selectedStudents,
        plan:lessonDoc,
        classLevel:classLabel,
        section,
        schoolName,
        logoUrl:logoUrl ? resolveAssetUrl(logoUrl) : '',
      })
      const preview = window.open('', '_blank', 'width=1180,height=900')
      if (!preview) { setStatus('Allow the print preview popup to open for student term diaries.'); return }
      preview.document.open()
      preview.document.write(output.html)
      preview.document.close()
      setStatus(`Student Term Diary preview: ${output.students} authenticated student cards, ${output.pages} landscape A4 sheets.`)
      // Wait for fonts and the official school crest before invoking browser print.
      Promise.resolve(preview.document.fonts?.ready).then(async () => {
        await Promise.all(Array.from(preview.document.images).map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload=resolve; img.onerror=resolve })))
        if (preview.closed) return
        const fit = validateStudentTermDiary3UpLayout(preview.document)
        if (!fit.ok) {
          preview.close()
          setStatus(`Student term diary print prevented: ${fit.errors[0]}. Review the class content and table spacing.`)
          return
        }
        preview.focus()
        preview.print()
      })
    } catch (error) { setStatus(`Student Term Diary not printed: ${error.message}`) }
  }

  // Isolated Print Architecture
  const print = () => {
    const stageEl = document.querySelector('.dd-page-stage')
    if (!stageEl) {
      setStatus('Diary print blocked: printable diary preview is not ready.')
      return
    }
    // Fail closed instead of silently cutting off homework in dense A4 layouts.
    const overflowingCards = [...stageEl.querySelectorAll('.dd-card-studio')]
      .filter(card => card.scrollHeight > card.clientHeight + 2)
    if (overflowingCards.length) {
      setStatus(`Print blocked: ${overflowingCards.length} diary card(s) exceed A4 space. Reduce Row Height, text size, or diaries per page, then preview again.`)
      return
    }

    const selectedFont = FONT_STYLES.find(f => f.id === fontStyleId) || FONT_STYLES[0]
    const pagesHtml = stageEl.innerHTML
    const printDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AL SIDDIQUE SCHOLARS — Daily Diary</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Nastaliq+Urdu:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: ${selectedFont.family};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dd-page-stage {
      display: block;
      width: 210mm;
      margin: 0 auto;
      padding: 0;
    }
    .dd-a4-page {
      width: 210mm !important;
      height: 297mm !important;
      transform: none !important;
      margin: 0 !important;
      padding: 4mm !important;
      box-shadow: none !important;
      break-after: page !important;
      page-break-after: always !important;
      overflow: hidden !important;
      display: grid !important;
      grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)) !important;
      grid-template-rows: repeat(var(--rows, 3), minmax(0, 1fr)) !important;
      gap: var(--gap-mm, 2mm) !important;
      background: #fff !important;
    }
    .dd-a4-page:last-child {
      break-after: auto !important;
      page-break-after: auto !important;
    }
    .dd-card {
      position: relative !important;
      border: 1.2px solid var(--line) !important;
      border-radius: 2.5mm !important;
      background: #fff !important;
      color: var(--ink) !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 0 !important;
      font-size: calc(10.5px * var(--scale)) !important;
      font-family: ${selectedFont.family} !important;
      box-shadow: none !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .dd-card.span-last { grid-column: 1/-1 !important; }
    .dd-card-accent {
      height: 2.2mm !important;
      background: var(--accent) !important;
      flex: 0 0 auto !important;
    }
    .dd-card-head {
      display: flex !important;
      flex-direction: column !important;
      gap: 1mm !important;
      padding: 1.6mm 2.4mm 1.4mm !important;
      border-bottom: 1px solid var(--line) !important;
      background: linear-gradient(180deg, #ffffff 0%, var(--soft) 100%) !important;
      flex: 0 0 auto !important;
    }
    .dd-card-compact .dd-card-head {
      gap: 0.6mm !important;
      padding: 1.2mm 2mm 1mm !important;
    }
    .dd-head-top {
      display: flex !important;
      align-items: center !important;
      gap: 2mm !important;
      width: 100% !important;
    }
    .dd-logo {
      width: ${logoSizeMm > 0 ? `calc(${logoSizeMm}mm * var(--scale))` : 'calc(10mm * var(--header-scale, 1))'} !important;
      height: ${logoSizeMm > 0 ? `calc(${logoSizeMm}mm * var(--scale))` : 'calc(10mm * var(--header-scale, 1))'} !important;
      display: grid !important;
      place-items: center !important;
      flex-shrink: 0 !important;
    }
    .dd-logo img { width: 100% !important; height: 100% !important; object-fit: contain !important; }
    .dd-logo span { font-size: calc(7.5px * var(--scale)) !important; font-weight: 900 !important; color: var(--accent) !important; }
    .dd-brand { display: flex !important; flex-direction: column !important; gap: 0.3mm !important; min-width: 0 !important; flex: 1 !important; }
    .dd-school-name {
      font-size: ${schoolNameFontSize > 0 ? `calc(${schoolNameFontSize}px * var(--scale) * var(--header-scale, 1))` : 'calc(11px * var(--scale) * var(--header-scale, 1))'} !important;
      font-weight: 900 !important;
      letter-spacing: .01em !important;
      line-height: 1.12 !important;
      color: var(--accent) !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow: visible !important;
    }
    .dd-brand-badge-row { display: flex !important; align-items: center !important; gap: 1.2mm !important; flex-wrap: wrap !important; }
    .dd-mode-badge {
      display: inline-block !important;
      background: var(--accent) !important;
      color: #fff !important;
      font-size: calc(6px * var(--scale)) !important;
      font-weight: 900 !important;
      letter-spacing: .05em !important;
      padding: 0.2mm 1.4mm !important;
      border-radius: 0.6mm !important;
      text-transform: uppercase !important;
    }
    .dd-motto-tag { font-size: calc(6px * var(--scale)) !important; color: #68798b !important; font-weight: 700 !important; }
    .dd-head-meta-row { display: flex !important; justify-content: space-between !important; align-items: center !important; gap: 1.2mm !important; width: 100% !important; }
    .dd-meta-pill {
      display: flex !important;
      align-items: center !important;
      gap: 1.2mm !important;
      background: #fff !important;
      border: 1px solid var(--line) !important;
      padding: 0.4mm 1.5mm !important;
      border-radius: 1mm !important;
    }
    .dd-meta-lbl { font-size: calc(5.2px * var(--scale)) !important; font-weight: 900 !important; color: #8899a6 !important; letter-spacing: .05em !important; }
    .dd-meta-val { font-size: calc(8px * var(--scale)) !important; font-weight: 850 !important; color: var(--accent) !important; white-space: nowrap !important; }
    .dd-class-val { font-size: calc(8.6px * var(--scale)) !important; font-weight: 900 !important; }
    .dd-student-strip {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 1.5mm !important;
      padding: 0.9mm 2mm !important;
      background: var(--soft) !important;
      border-bottom: 1px solid var(--line) !important;
      flex: 0 0 auto !important;
    }
    .dd-student-field { display: flex !important; align-items: center !important; gap: 1.2mm !important; }
    .dd-student-name-field { min-width: 0 !important; flex: 1 !important; }
    .dd-student-lbl { font-size: calc(6px * var(--scale)) !important; font-weight: 900 !important; color: #5c7287 !important; }
    .dd-student-val { font-size: calc(8.5px * var(--scale)) !important; font-weight: 850 !important; color: var(--ink) !important; white-space: nowrap !important; }
    .dd-student-roll-field { background: #fff !important; border: 1px solid var(--line) !important; padding: 0.4mm 1.6mm !important; border-radius: 0.8mm !important; }
    .dd-student-roll-field .dd-student-val { color: var(--accent) !important; }
    .dd-table-head {
      display: grid !important;
      background: var(--accent) !important;
      color: #fff !important;
      margin: 0.8mm 1.5mm 0 !important;
      border-radius: 1mm !important;
      overflow: hidden !important;
      flex: 0 0 auto !important;
    }
    .dd-table-head span {
      padding: 0.8mm 1.4mm !important;
      font-size: calc(7px * var(--scale)) !important;
      font-weight: 900 !important;
      letter-spacing: .04em !important;
      text-align: center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-transform: uppercase !important;
    }
    .dd-table-head span+span { border-left: 1px solid rgba(255, 255, 255, .3) !important; }
    .dd-rows {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.6mm !important;
      padding: 0.8mm 1.5mm !important;
      flex: 1 !important;
      min-height: 0 !important;
      overflow: visible !important;
    }
    .dd-row {
      display: grid !important;
      border: 1px solid #d4e0eb !important;
      border-radius: 1mm !important;
      overflow: visible !important;
      background: #fff !important;
    }
    .dd-sub-cell {
      padding: 0.9mm 1.4mm !important;
      background: #f7fafc !important;
      color: var(--accent) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      line-height: 1.2 !important;
      border-right: 1px solid #dbe4eb !important;
      word-break: break-word !important;
    }
    .dd-diary-cell {
      padding: 0.9mm 1.8mm !important;
      line-height: 1.3 !important;
      overflow: visible !important;
      display: flex !important;
      align-items: center !important;
      word-break: break-word !important;
    }
    .urdu {
      font-family: 'ASSPS Jameel Noori', 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif !important;
      direction: rtl !important;
    }
    .dd-card footer {
      border-top: 1px solid var(--line) !important;
      background: var(--soft) !important;
      padding: 0.8mm 1.6mm !important;
      text-align: center !important;
      font-size: ${footerFontSize > 0 ? `calc(${footerFontSize}px * var(--scale))` : 'calc(6.5px * var(--scale))'} !important;
      color: #4b5d6f !important;
      font-weight: 700 !important;
      flex: 0 0 auto !important;
    }



/* Premium 8 — isolated iframe A4 print rules. Inline AFTER standard print CSS. */
@media print {
  .dd-card.dd-card-premium {border-color:var(--line)!important;border-radius:1.4mm!important;box-shadow:none!important}
  .dd-card-premium .dd-card-accent {height:.5mm!important;background:linear-gradient(to right,var(--foil) 0 13%,var(--line) 13% 100%)!important}
  .dd-card-premium .dd-card-head {gap:0!important;padding:1.1mm 2mm .85mm!important;background:#fff!important;border-bottom:.5px solid var(--line)!important}
  .dd-card-premium .dd-head-top {gap:1.65mm!important;align-items:center!important}
  .dd-card-premium .dd-logo {width:calc(8.5mm * var(--header-scale,1))!important;height:calc(8.5mm * var(--header-scale,1))!important}
  .dd-card-premium .dd-school-name {font-family:'Times New Roman',Times,Georgia,serif!important;font-size:calc(10px * var(--scale) * var(--header-scale,1))!important;font-weight:800!important;letter-spacing:.016em!important;line-height:1.06!important;color:#1b3047!important}
  .dd-card-premium .dd-brand {gap:.15mm!important}
  .dd-card-premium .dd-mode-badge {background:var(--soft)!important;color:var(--accent)!important;border-left:1.4px solid var(--foil)!important;border-radius:0!important;padding:.15mm .8mm!important;font-size:calc(5.9px * var(--scale))!important}
  .dd-card-premium .dd-motto-tag,.dd-card-premium .dd-head-meta-row {display:none!important}
  .dd-card-premium .dd-student-strip {display:grid!important;grid-template-columns:minmax(0,2.1fr) minmax(0,1.05fr) minmax(0,1.15fr) minmax(0,1fr)!important;gap:0!important;padding:.9mm 1.8mm!important;background:var(--soft)!important;border-bottom:.6px solid var(--line)!important}
  .dd-card-premium .dd-student-field {display:flex!important;flex-wrap:wrap!important;align-content:center!important;justify-content:flex-start!important;gap:.3mm .8mm!important;min-width:0!important;padding:.1mm .85mm!important;border:0!important;border-radius:0!important;background:transparent!important}
  .dd-card-premium .dd-student-field + .dd-student-field {border-left:.5px solid var(--line)!important}
  .dd-card-premium .dd-student-name-field {padding-left:.3mm!important}
  .dd-card-premium .dd-student-lbl {font-size:calc(6.3px * var(--scale))!important;color:#63727a!important;letter-spacing:.008em!important}
  .dd-card-premium .dd-student-val,.dd-card-premium .dd-student-roll-field .dd-student-val {font-family:'Times New Roman',Times,Georgia,serif!important;font-size:calc(8px * var(--scale))!important;font-weight:700!important;line-height:1.16!important;color:var(--ink)!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere!important}
  .dd-card-premium .dd-table-head {margin:.95mm 1.65mm 0!important;background:var(--soft)!important;color:var(--ink)!important;border:.8px solid var(--line)!important;border-radius:.7mm .7mm 0 0!important}
  .dd-card-premium .dd-table-head span {padding:.85mm 1mm!important;font-family:'Times New Roman',Times,Georgia,serif!important;font-size:calc(7.5px * var(--scale))!important;letter-spacing:.025em!important}
  .dd-card-premium .dd-table-head span + span {border-left:.8px solid var(--line)!important}
  .dd-card-premium .dd-rows {margin:0 1.65mm!important;padding:0!important;gap:0!important;border:.8px solid var(--line)!important;border-top:0!important;border-radius:0 0 .7mm .7mm!important;overflow:visible!important}
  .dd-card-premium .dd-row {border:0!important;border-top:.6px solid var(--line)!important;border-radius:0!important;min-height:0!important;flex:1 1 auto!important;break-inside:avoid!important}
  .dd-card-premium .dd-row:first-child {border-top:.7px solid var(--line)!important}
  .dd-card-premium .dd-sub-cell {background:var(--soft)!important;color:#23354b!important;border-right:.7px solid var(--line)!important;padding:.75mm .7mm!important}
  .dd-card-premium .dd-diary-cell {background:#fff!important;color:#1f2b3c!important;padding:.85mm 1.35mm!important;line-height:1.24!important;white-space:pre-wrap!important}
  .dd-card-premium .dd-diary-cell.urdu {line-height:1.55!important}
  .dd-card-premium footer {margin-top:.6mm!important;background:#fff!important;border-top:.5px solid var(--line)!important;padding:.8mm 1.8mm!important;color:#516170!important;text-align:left!important}
  /* ASSPS premium header reflow v2 — mirror preview in isolated iframe. */
  .dd-card-premium .dd-card-head {padding:1.35mm 2mm 1.1mm!important;background:#fff!important}
  .dd-card-premium .dd-head-top {display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:1.65mm!important}
  .dd-card-premium .dd-logo {width:calc(14mm * var(--scale))!important;height:calc(14mm * var(--scale))!important}
  .dd-card-premium .dd-school-name {font-family:'Times New Roman',Times,Georgia,serif!important;font-size:clamp(10px,calc(16px * var(--scale)),18px)!important;font-weight:900!important;line-height:1.09!important;letter-spacing:.006em!important;color:#1b3047!important}
  .dd-card-premium .dd-premium-calendar {display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;width:calc(17.5mm * var(--scale))!important;min-width:calc(17.5mm * var(--scale))!important;min-height:calc(16mm * var(--scale))!important;border:.75px solid var(--line)!important;border-radius:1.1mm!important;overflow:hidden!important;background:#fff!important;font-family:'Times New Roman',Times,serif!important;line-height:1.05!important}
  .dd-card-premium .dd-premium-calendar-month {background:var(--soft)!important;border-bottom:.5px solid var(--line)!important;color:var(--accent)!important;font-size:calc(7px * var(--scale))!important;font-weight:800!important;letter-spacing:.04em!important;width:100%!important;padding:.45mm 0!important;text-align:center!important;white-space:nowrap!important}
  .dd-card-premium .dd-premium-calendar-day {font-size:calc(18px * var(--scale))!important;font-weight:900!important;color:#1b3047!important;line-height:1!important;margin-top:.35mm!important}
  .dd-card-premium .dd-premium-calendar-weekday {font-size:calc(6.9px * var(--scale))!important;font-weight:800!important;letter-spacing:.11em!important;color:var(--accent)!important;padding-bottom:.35mm!important}
  .dd-card-premium .dd-student-strip {grid-template-columns:minmax(0,2.2fr) minmax(0,1.15fr) minmax(0,1.12fr)!important;padding:1mm 1.6mm!important}
  .dd-card-premium .dd-student-field {align-content:center!important;padding:.35mm 1.15mm!important;gap:.2mm .85mm!important}
  .dd-card-premium .dd-student-lbl {font-size:calc(7.4px * var(--scale))!important;color:#4b6170!important;font-weight:800!important}
  .dd-card-premium .dd-student-val,.dd-card-premium .dd-student-roll-field .dd-student-val {font-size:calc(13.2px * var(--scale))!important;line-height:1.12!important;font-weight:900!important;color:#1b3047!important;overflow-wrap:anywhere!important}
  .dd-card-premium footer {text-align:center!important;font-weight:700!important;display:block!important;width:100%!important}

}

/* ASSPS STUDIO EDITIONS 2026-11-04
 * Print-first designs — eight genuinely distinct structural systems.
 * The original 1-4 and premium 21-28 styles remain unchanged.
 * Only the classes dd-card-studio/dd-edition-* can activate these rules.
 */
.dd-card.dd-card-premium.dd-card-studio {
  position:relative!important;
  isolation:isolate!important;
  background:#fff!important;
  border-width:1px!important;
  border-style:solid!important;
  border-color:var(--line)!important;
  border-radius:0!important;
  box-shadow:none!important;
  overflow:hidden!important;
  font-family:'Times New Roman',Times,Georgia,serif!important;
}
.dd-card-studio .dd-card-head {z-index:1!important}
.dd-card-studio .dd-school-name {
  font-family:'Times New Roman',Times,Georgia,serif!important;
  font-weight:900!important;
  color:var(--ink)!important;
}
.dd-card-studio .dd-student-strip {
  display:grid!important;
  grid-template-columns:minmax(0,2.18fr) minmax(0,1.14fr) minmax(0,1.12fr)!important;
  align-items:center!important;
  background:#fff!important;
}
.dd-card-studio .dd-student-field {min-width:0!important;overflow:visible!important}
.dd-card-studio .dd-student-val,.dd-card-studio .dd-student-roll-field .dd-student-val {
  color:var(--ink)!important;
  font-weight:900!important;
}
.dd-card-studio .dd-premium-calendar {
  flex-shrink:0!important;
  background:#fff!important;
  box-shadow:none!important;
}
.dd-card-studio .dd-premium-calendar-day {color:var(--ink)!important}
.dd-card-studio .dd-rows {min-height:0!important;flex:1 1 auto!important;overflow:visible!important}
.dd-card-studio .dd-row {min-height:0!important;break-inside:avoid!important}
.dd-card-studio .dd-diary-cell {white-space:pre-wrap!important;word-break:normal!important;overflow-wrap:anywhere!important;line-height:1.25!important}
.dd-card-studio .dd-diary-cell.urdu {line-height:1.52!important}
.dd-card-studio footer {
  display:block!important;
  width:100%!important;
  margin-top:auto!important;
  padding:1mm 1.8mm!important;
  text-align:center!important;
  font-weight:700!important;
  background:#fff!important;
  color:var(--ink)!important;
}

/* 31 — Atelier Folio: gallery-mounted stationery; left bookbind spine */
.dd-card-studio.dd-edition-atelier {
  border:1.2px solid var(--line)!important;
  outline:1px solid var(--line)!important;
  outline-offset:-2.4mm!important;
  padding-left:1.2mm!important;
}
.dd-edition-atelier .dd-card-accent {position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:1.1mm!important;height:auto!important;background:var(--accent)!important}
.dd-edition-atelier .dd-card-head {padding:2mm 2.2mm 1.4mm!important;background:#fff!important;border-bottom:2px double var(--foil)!important}
.dd-edition-atelier .dd-school-name {letter-spacing:.035em!important;font-variant:small-caps!important;line-height:1.13!important}
.dd-edition-atelier .dd-premium-calendar {border:1px solid var(--foil)!important;border-radius:0!important}
.dd-edition-atelier .dd-premium-calendar-month {background:var(--soft)!important;color:var(--ink)!important;border-bottom:1px solid var(--foil)!important}
.dd-edition-atelier .dd-student-strip {background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-atelier .dd-table-head {background:#fff!important;border-top:1px solid var(--accent)!important;border-bottom:2px solid var(--accent)!important;color:var(--ink)!important;margin:1.3mm 2.2mm 0!important}
.dd-edition-atelier .dd-table-head span {font-variant:small-caps!important;letter-spacing:.085em!important}
.dd-edition-atelier .dd-rows {margin:0 2.2mm!important;border-color:var(--line)!important}
.dd-edition-atelier .dd-sub-cell {background:var(--soft)!important;border-right:1px solid var(--line)!important;color:var(--ink)!important}
.dd-edition-atelier .dd-row {border-top:1px solid var(--line)!important}
.dd-edition-atelier footer {border-top:2px double var(--foil)!important;margin:1mm 2.2mm 1.2mm!important;width:auto!important}

/* 32 — Ivory Ledger: audited double rule with ruled journal hierarchy */
.dd-card-studio.dd-edition-ledger {border:2px double var(--line)!important;background:var(--soft)!important}
.dd-edition-ledger .dd-card-accent {height:.4mm!important;background:var(--foil)!important}
.dd-edition-ledger .dd-card-head {background:var(--soft)!important;padding:1.5mm 2mm 1.3mm!important;border-bottom:1px solid var(--line)!important}
.dd-edition-ledger .dd-school-name {letter-spacing:.008em!important;text-decoration:none!important}
.dd-edition-ledger .dd-mode-badge {background:var(--soft)!important;color:var(--ink)!important;border:1px solid var(--line)!important;padding:.25mm 1mm!important}
.dd-edition-ledger .dd-premium-calendar {border:1px solid var(--line)!important;border-radius:0!important;background:var(--soft)!important}
.dd-edition-ledger .dd-premium-calendar-month {background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-ledger .dd-student-strip {background:var(--soft)!important;border-bottom:2px double var(--line)!important}
.dd-edition-ledger .dd-student-field+.dd-student-field {border-left:1px dashed var(--line)!important}
.dd-edition-ledger .dd-table-head {background:var(--soft)!important;border:1px solid var(--accent)!important;color:var(--ink)!important;border-radius:0!important;margin:1.2mm 1.7mm 0!important}
.dd-edition-ledger .dd-rows {border:1px solid var(--accent)!important;border-top:0!important;border-radius:0!important;margin:0 1.7mm!important}
.dd-edition-ledger .dd-row {border-top:1px solid var(--line)!important}
.dd-edition-ledger .dd-sub-cell {background:var(--soft)!important;color:var(--ink)!important;border-right:1px solid var(--accent)!important}
.dd-edition-ledger footer {background:var(--soft)!important;border-top:1px dashed var(--accent)!important}

/* 33 — Nordic Index: Scandinavian typography, edge-to-edge crisp white */
.dd-card-studio.dd-edition-nordic {border:1px solid var(--line)!important;background:#fff!important;border-radius:1mm!important}
.dd-edition-nordic .dd-card-accent {height:.7mm!important;background:linear-gradient(90deg,var(--line) 0 34%,var(--soft) 34% 100%)!important}
.dd-edition-nordic .dd-card-head {padding:1.6mm 2mm 1.5mm!important;border-bottom:0!important;background:#fff!important}
.dd-edition-nordic .dd-school-name {letter-spacing:.045em!important;text-transform:uppercase!important;color:var(--ink)!important}
.dd-edition-nordic .dd-mode-badge {background:var(--soft)!important;color:var(--ink)!important;border-left:0!important;border-bottom:1.5px solid var(--accent)!important}
.dd-edition-nordic .dd-premium-calendar {border:0!important;border-left:2px solid var(--line)!important;border-radius:0!important}
.dd-edition-nordic .dd-premium-calendar-month {border:0!important;background:var(--soft)!important;color:var(--ink)!important}
.dd-edition-nordic .dd-student-strip {background:var(--soft)!important;border-top:1px solid var(--line)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-nordic .dd-student-field+.dd-student-field {border-left:1px solid var(--line)!important}
.dd-edition-nordic .dd-table-head {background:#fff!important;color:var(--ink)!important;border:0!important;border-bottom:2px solid var(--accent)!important;margin:1.2mm 2mm 0!important;letter-spacing:.05em!important}
.dd-edition-nordic .dd-rows {border:0!important;margin:0 2mm!important}
.dd-edition-nordic .dd-row {border:0!important;border-bottom:1px solid var(--line)!important}
.dd-edition-nordic .dd-sub-cell {background:var(--soft)!important;color:var(--ink)!important;border-right:2px solid var(--line)!important}
.dd-edition-nordic footer {border-top:2px solid var(--accent)!important;margin:0 2mm!important;width:auto!important}

/* 34 — Cambridge Folio: traditional academic double-frame, centered crest/name */
.dd-card-studio.dd-edition-cambridge {border:1px solid var(--line)!important;box-shadow:inset 0 0 0 1.3mm #fff,inset 0 0 0 1.5mm var(--line)!important}
.dd-edition-cambridge .dd-card-accent {height:.5mm!important;background:var(--line)!important}
.dd-edition-cambridge .dd-card-head {padding:1.8mm 2.5mm 1.5mm!important;background:#fff!important;border-bottom:1px solid var(--line)!important}
.dd-edition-cambridge .dd-head-top {grid-template-columns:auto minmax(0,1fr) auto!important}
.dd-edition-cambridge .dd-school-name {font-variant:small-caps!important;letter-spacing:.035em!important;text-align:center!important}
.dd-edition-cambridge .dd-brand-badge-row {justify-content:center!important}
.dd-edition-cambridge .dd-mode-badge {background:var(--soft)!important;color:var(--ink)!important;border-left:0!important;border-top:1px solid var(--accent)!important;border-bottom:1px solid var(--accent)!important}
.dd-edition-cambridge .dd-premium-calendar {border:1px solid var(--line)!important;border-radius:50%!important;min-height:calc(17.5mm * var(--scale))!important}
.dd-edition-cambridge .dd-premium-calendar-month {background:transparent!important;border-bottom:1px solid var(--line)!important}
.dd-edition-cambridge .dd-student-strip {margin:0 1.4mm!important;background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-cambridge .dd-table-head {background:var(--soft)!important;border:1px solid var(--line)!important;color:var(--ink)!important;margin:1.3mm 2.3mm 0!important;border-radius:0!important}
.dd-edition-cambridge .dd-rows {border:1px solid var(--line)!important;border-top:0!important;margin:0 2.3mm!important}
.dd-edition-cambridge .dd-row {border-top:1px solid var(--line)!important}
.dd-edition-cambridge .dd-sub-cell {background:var(--soft)!important;border-right:1px solid var(--line)!important;color:var(--ink)!important}
.dd-edition-cambridge footer {border-top:1px solid var(--line)!important;margin:1mm 2.3mm!important;width:auto!important;font-style:italic!important}

/* 35 — Jade Monogram: strong architectural spine + soft asymmetric header */
.dd-card-studio.dd-edition-monogram {border:1px solid var(--line)!important;border-radius:0 2.5mm 0 2.5mm!important}
.dd-edition-monogram .dd-card-accent {height:1.0mm!important;background:linear-gradient(90deg,var(--accent) 0 13%,var(--soft) 13% 100%)!important}
.dd-edition-monogram .dd-card-head {background:linear-gradient(110deg,var(--soft) 0 75%,#fff 75% 100%)!important;border-bottom:1px solid var(--line)!important;padding:1.4mm 1.8mm 1.2mm!important}
.dd-edition-monogram .dd-logo {border:1px solid var(--accent)!important;border-radius:50%!important;padding:.5mm!important;background:#fff!important}
.dd-edition-monogram .dd-school-name {letter-spacing:.012em!important;color:var(--ink)!important}
.dd-edition-monogram .dd-mode-badge {background:#fff!important;color:var(--accent)!important;border-left:2px solid var(--accent)!important}
.dd-edition-monogram .dd-premium-calendar {border:1px solid var(--line)!important;border-radius:0 2mm 0 2mm!important}
.dd-edition-monogram .dd-premium-calendar-month {background:var(--soft)!important}
.dd-edition-monogram .dd-student-strip {background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-monogram .dd-table-head {background:var(--soft)!important;color:var(--ink)!important;border:0!important;border-left:2mm solid var(--accent)!important;margin:1.1mm 1.8mm 0!important}
.dd-edition-monogram .dd-rows {margin:0 1.8mm!important;border:1px solid var(--line)!important;border-top:0!important}
.dd-edition-monogram .dd-row {border-top:1px solid var(--line)!important}
.dd-edition-monogram .dd-sub-cell {background:var(--soft)!important;border-right:1px solid var(--line)!important;color:var(--ink)!important}
.dd-edition-monogram footer {border-top:1px solid var(--line)!important;background:var(--soft)!important}

/* 36 — Rose Letterpress: elegant typographic high-end paper, thin engraved rules */
.dd-card-studio.dd-edition-letterpress {border:1px solid var(--line)!important;background:#fff!important;border-radius:2mm 0 2mm 0!important}
.dd-edition-letterpress .dd-card-accent {height:.5mm!important;background:var(--accent)!important}
.dd-edition-letterpress .dd-card-head {padding:1.7mm 2mm 1.3mm!important;background:#fff!important;border-bottom:2px double var(--line)!important}
.dd-edition-letterpress .dd-school-name {font-style:normal!important;font-variant:small-caps!important;letter-spacing:.055em!important;color:var(--ink)!important}
.dd-edition-letterpress .dd-mode-badge {background:#fff!important;color:var(--accent)!important;border:0!important;border-bottom:1px solid var(--accent)!important;border-radius:0!important}
.dd-edition-letterpress .dd-premium-calendar {border:1px solid var(--line)!important;border-radius:2.2mm 2.2mm .5mm .5mm!important}
.dd-edition-letterpress .dd-premium-calendar-month {background:var(--soft)!important;color:var(--ink)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-letterpress .dd-student-strip {background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-letterpress .dd-table-head {background:#fff!important;color:var(--ink)!important;border:0!important;border-bottom:1px solid var(--accent)!important;margin:1.3mm 1.8mm 0!important}
.dd-edition-letterpress .dd-rows {border:0!important;margin:0 1.8mm!important}
.dd-edition-letterpress .dd-row {border:0!important;border-bottom:1px solid var(--line)!important}
.dd-edition-letterpress .dd-sub-cell {background:var(--soft)!important;color:var(--ink)!important;border-right:1px solid var(--line)!important}
.dd-edition-letterpress footer {border-top:2px double var(--line)!important;margin:0 1.8mm!important;width:auto!important;font-style:italic!important}

/* 37 — Architect Grid: crisp technical-spec sheet, numbered table-side labels */
.dd-card-studio.dd-edition-architect {border:1px solid var(--accent)!important;background:#fff!important}
.dd-edition-architect .dd-card-accent {height:.45mm!important;background:var(--accent)!important}
.dd-edition-architect .dd-card-head {padding:1.55mm 1.8mm 1.3mm!important;background:var(--soft)!important;border-bottom:1px solid var(--accent)!important}
.dd-edition-architect .dd-school-name {letter-spacing:.015em!important;color:var(--ink)!important}
.dd-edition-architect .dd-mode-badge {border:1px solid var(--line)!important;color:var(--ink)!important;background:#fff!important;padding:.25mm .75mm!important}
.dd-edition-architect .dd-premium-calendar {border:1px solid var(--accent)!important;border-radius:0!important;background:#fff!important}
.dd-edition-architect .dd-premium-calendar-month {background:var(--soft)!important;border-bottom:1px solid var(--accent)!important}
.dd-edition-architect .dd-student-strip {background:var(--soft)!important;border-top:1px solid var(--line)!important;border-bottom:1px solid var(--accent)!important}
.dd-edition-architect .dd-student-field+.dd-student-field {border-left:1px solid var(--line)!important}
.dd-edition-architect .dd-table-head {background:var(--soft)!important;color:var(--ink)!important;border:1px solid var(--accent)!important;border-radius:0!important;margin:1mm 1.7mm 0!important}
.dd-edition-architect .dd-rows {counter-reset:academic!important;border:1px solid var(--accent)!important;border-top:0!important;margin:0 1.7mm!important;border-radius:0!important}
.dd-edition-architect .dd-row {counter-increment:academic!important;border-top:1px solid var(--line)!important}
.dd-edition-architect .dd-sub-cell {background:var(--soft)!important;border-right:1px solid var(--accent)!important;color:var(--ink)!important}
.dd-edition-architect .dd-sub-cell::before {content:counter(academic, decimal-leading-zero)!important;display:inline-block!important;color:var(--accent)!important;font-size:.7em!important;margin-right:.9mm!important}
.dd-edition-architect footer {border-top:1px solid var(--accent)!important}

/* 38 — Pearl Horizon: understated architectural line, asymmetric premium composition */
.dd-card-studio.dd-edition-horizon {border:1px solid var(--line)!important;border-radius:1.5mm!important}
.dd-edition-horizon .dd-card-accent {height:.75mm!important;background:linear-gradient(90deg,var(--accent) 0 23%,var(--line) 23% 70%,var(--line) 70% 100%)!important}
.dd-edition-horizon .dd-card-head {padding:1.8mm 2mm 1.4mm!important;background:linear-gradient(120deg,var(--soft) 0 62%,#fff 62% 100%)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-horizon .dd-school-name {font-variant:small-caps!important;letter-spacing:.035em!important;color:var(--ink)!important}
.dd-edition-horizon .dd-mode-badge {background:var(--soft)!important;color:var(--ink)!important;border-left:0!important;border-right:2px solid var(--accent)!important}
.dd-edition-horizon .dd-premium-calendar {border:1px solid var(--line)!important;border-radius:1.6mm!important}
.dd-edition-horizon .dd-premium-calendar-month {background:var(--soft)!important;color:var(--ink)!important}
.dd-edition-horizon .dd-student-strip {background:var(--soft)!important;border-bottom:1px solid var(--line)!important}
.dd-edition-horizon .dd-table-head {background:var(--soft)!important;color:var(--ink)!important;border:1px solid var(--line)!important;border-radius:1.3mm 1.3mm 0 0!important;margin:1.2mm 1.8mm 0!important}
.dd-edition-horizon .dd-rows {border:1px solid var(--line)!important;border-top:0!important;border-radius:0 0 1.3mm 1.3mm!important;margin:0 1.8mm!important}
.dd-edition-horizon .dd-row {border-top:1px solid var(--line)!important}
.dd-edition-horizon .dd-sub-cell {background:var(--soft)!important;color:var(--ink)!important;border-right:1px solid var(--line)!important}
.dd-edition-horizon footer {border-top:1px solid var(--line)!important;color:var(--ink)!important}

/* Print geometry is fixed by A4 card grid; never force fixed row heights. */
@media print {
  .dd-card-studio .dd-row {break-inside:avoid!important;page-break-inside:avoid!important}
  .dd-card-studio .dd-premium-calendar {break-inside:avoid!important}
  .dd-card-studio .dd-diary-cell.urdu {font-family:'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif!important}
}

/* A195 – Daily Diary Studio typography engine.
 * Shared by preview and independent A4 print iframe; Studio editions only. */
.dd-card.dd-card-premium.dd-card-studio {font-family:var(--dd-font,'Times New Roman',serif)!important}
.dd-card-studio .dd-school-name {
  font-family:'Times New Roman',Times,Georgia,serif!important;
  font-size:clamp(10px,calc(var(--dd-school-base,16px) * var(--scale) * var(--dd-header-factor,1)),24px)!important
}
.dd-card-studio .dd-logo {
  width:calc(var(--dd-logo-base,14mm) * var(--scale) * var(--dd-header-factor,1))!important;
  height:calc(var(--dd-logo-base,14mm) * var(--scale) * var(--dd-header-factor,1))!important;
  flex-shrink:0!important
}
.dd-card-studio .dd-card-head {
  padding-top:calc(1.4mm * var(--dd-header-factor,1) * var(--dd-preset-factor,1))!important;
  padding-bottom:calc(1.25mm * var(--dd-header-factor,1) * var(--dd-preset-factor,1))!important
}
.dd-card-studio .dd-head-top {gap:calc(1.65mm * var(--dd-header-factor,1))!important}
.dd-card-studio .dd-premium-calendar {
  width:calc(17.5mm * var(--scale) * var(--dd-header-factor,1) * var(--dd-preset-factor,1))!important;
  min-width:calc(17.5mm * var(--scale) * var(--dd-header-factor,1) * var(--dd-preset-factor,1))!important;
  min-height:calc(16mm * var(--scale) * var(--dd-header-factor,1) * var(--dd-preset-factor,1))!important
}
.dd-card-studio .dd-premium-calendar-day {
  font-size:clamp(12px,calc(18px * var(--scale) * var(--dd-header-factor,1) * var(--dd-preset-factor,1)),27px)!important
}
.dd-card-studio .dd-table-head span {
  font-family:var(--dd-font,'Times New Roman',serif)!important;
  font-size:var(--dd-table-head-size,9px)!important;
  font-weight:var(--dd-table-head-weight,850)!important;
  line-height:1.15!important;
  letter-spacing:.018em!important;
  min-height:3.7mm!important;
  align-items:center!important
}
.dd-card-studio .dd-sub-cell:not(.urdu),
.dd-card-studio .dd-diary-cell:not(.urdu),
.dd-card-studio .dd-student-val,
.dd-card-studio .dd-student-roll-field .dd-student-val {
  font-family:var(--dd-font,'Times New Roman',serif)!important
}
.dd-card-studio .dd-sub-cell.urdu,
.dd-card-studio .dd-diary-cell.urdu {
  font-family:var(--dd-urdu-font,'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif)!important
}
.dd-card-studio .dd-row {
  min-height:var(--dd-row-height,0px)!important;
  flex:var(--dd-row-flex,1 1 auto)!important
}
.dd-card-studio footer {
  font-size:var(--dd-footer-size,8px)!important;
  line-height:1.12!important;
  min-height:2.4mm!important
}
.dd-card-studio footer.urdu {
  font-family:var(--dd-urdu-font,'ASSPS Jameel Noori','Jameel Noori Nastaleeq','Noto Nastaliq Urdu',serif)!important
}
.dd-sqb-table-heading .dd-sqb-label {white-space:nowrap}
.dd-sqb-table-heading .dd-sqb-stepper button {min-width:23px}
@media print {
  .dd-card-studio .dd-table-head span {break-inside:avoid!important}
  .dd-card-studio .dd-row {break-inside:avoid!important}
}

  /* A203 exact premium print preservation patch */
/* A203: PREMIUM PRESERVATION — MINOR 8-UP PRINT REPAIRS
 * Never reset a Studio edition's margins, border colors, frame, typography
 * or header. The original premium CSS stays the source of truth.
 * Widths/positions of table heading, body wrapper and subject divider
 * are intentionally UNCHANGED.
 */
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-premium-calendar {
  width:calc(16mm * var(--scale))!important;
  min-width:calc(16mm * var(--scale))!important;
  min-height:calc(14.5mm * var(--scale))!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-premium-calendar-month {
  padding:.25mm 0!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-premium-calendar-day {
  margin-top:.12mm!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-premium-calendar-weekday {
  padding-bottom:.2mm!important;
}
/* Keep original fonts and colors; reserve enough width for an actual roll ID. */
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-student-strip {
  grid-template-columns:minmax(0,2fr) minmax(0,1.05fr) minmax(0,1.55fr)!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-student-roll-field {
  flex-wrap:nowrap!important;
  gap:.3mm!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-student-roll-field .dd-student-val {
  white-space:nowrap!important;
  overflow-wrap:normal!important;
  word-break:normal!important;
  font-variant-numeric:tabular-nums!important;
}
/* No new heavy/dark frames. Use each edition's ORIGINAL --line / --accent
 * colors and grid positioning, only make subpixel print separators visible.
 * The heading already has a bottom border, so do NOT double-draw row 1.
 */
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-row {
  border-top-width:1px!important;
  -webkit-print-color-adjust:exact!important;
  print-color-adjust:exact!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-row:first-child {
  border-top-width:0!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-sub-cell {
  border-right-width:1px!important;
  -webkit-print-color-adjust:exact!important;
  print-color-adjust:exact!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 .dd-table-head span+span {
  border-left-width:1px!important;
}
.dd-card.dd-card-premium.dd-card-studio.dd-density-8 footer {
  border-top-width:0!important;
}

/* Edition 35 originally uses a 2mm accent BORDER on the heading.
 * That border reduces the heading content grid width while homework rows
 * remain full width. Preserve its colored spine as an inset visual stripe
 * so the subject/task divider physically aligns, without changing colors.
 */
.dd-card.dd-card-premium.dd-card-studio.dd-density-8.dd-edition-monogram .dd-table-head {
  border-left:0!important;
  box-shadow:inset 2mm 0 0 var(--accent)!important;
}

  </style>
</head>
<body>
  <div class="dd-page-stage">
    ${pagesHtml}
  </div>
</body>
</html>`

    let iframe = document.getElementById('dd-print-frame')
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.id = 'dd-print-frame'
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      document.body.appendChild(iframe)
    }

    try {
      const doc = iframe.contentWindow.document
      doc.open()
      doc.write(printDoc)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }, 350)
    } catch (error) {
      // Never fall back to a global print: it prints the app controls and page-break markers.
      setStatus('Diary print blocked: isolated preview failed. ' +
        (error?.message || 'Try printing from the Diary Print / PDF button again.'))
    }
  }

  return (
    <div className="dd-workspace" data-diary-workspace>
      {/* Top Professional Toolbar */}
      <div className="dd-toolbar no-print">
        <div className="dd-toolbar-title-wrap">
          <span className="dd-eyebrow">ASSPS Academic Document Studio · V3</span>
          <h2>{mode === 'diary' ? 'Daily Diary Studio' : 'Lesson Plan Studio'}</h2>
          <p className="dd-subline">Create, manage, archive, and print clean academic notebooks.</p>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="dd-nav-pills">
          <button
            type="button"
            className={activeTab === 'editor' ? 'dd-nav-pill active' : 'dd-nav-pill'}
            onClick={() => setActiveTab('editor')}
          >
            <Edit size={14} /> Diary Editor
          </button>
          <button
            type="button"
            className={activeTab === 'library' ? 'dd-nav-pill active' : 'dd-nav-pill'}
            onClick={() => setActiveTab('library')}
          >
            <Layers size={14} /> Saved Diaries Library
            {savedDiariesList.length > 0 && <span className="dd-badge-count">{libraryPagination.total || savedDiariesList.length}</span>}
          </button>
          <button
            type="button"
            className={activeTab === 'preview' ? 'dd-nav-pill active' : 'dd-nav-pill'}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={14} /> Print Preview
          </button>
        </div>

        {/* Actions */}
        <div className="dd-toolbar-actions">
          {mode === 'diary' ? (
            <>
              <button
                type="button"
                onClick={reopenSavedDiary}
                disabled={saving || busy === 'diary-open'}
                title="Reopen recent saved diary for current class & date"
              >
                <BookOpen size={14} />
                {busy === 'diary-open' ? 'Opening…' : 'Reopen Saved Diary'}
              </button>
              <button
                type="button"
                className={displayedSavedDiaryId ? 'btn-saved-synced' : 'btn-save-primary'}
                onClick={saveDiary}
                disabled={saving || busy === 'diary-open'}
              >
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Diary'}
                {displayedSavedDiaryId && <span className="dd-saved-id-pill">#{displayedSavedDiaryId}</span>}
              </button>
            </>
          ) : (
            <button type="button" onClick={saveLessonPlan} disabled={busy === 'lesson-save'}>
              <Save size={14} />
              {busy === 'lesson-save' ? 'Saving…' : 'Save Lesson Plan'}
            </button>
          )}
          {mode === 'lesson' && <button type="button" className="primary" onClick={printStudentTermCards} data-student-term-3up><Printer size={14}/> Student Term Diaries · 3-up Landscape</button>}
          <button type="button" className="primary" onClick={print}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {status && (
        <div className="dd-status no-print">
          <Check size={14} />
          <span>{status}</span>
          <button type="button" onClick={() => setStatus('')}><X size={13} /></button>
        </div>
      )}

      {/* Mode Bar */}
      <div className="dd-modebar no-print">
        <button
          type="button"
          className={mode === 'diary' ? 'active' : ''}
          onClick={() => setMode('diary')}
          data-diary-mode="diary"
        >
          <FileText size={15} /> Daily Diary
        </button>
        <button
          type="button"
          className={mode === 'lesson' ? 'active' : ''}
          onClick={() => setMode('lesson')}
          data-diary-mode="lesson"
        >
          <BookOpen size={15} /> Lesson Plan Integration
        </button>
        {displayedSavedDiaryId && (
          <div className="dd-active-record-tag">
            <Check size={12} /> Editing Server Record #{displayedSavedDiaryId} ({classLabel} · {formatDate(date)})
            <button type="button" disabled={saving} onClick={() => { savedDiaryIdentities.current.delete(JSON.stringify([classLevel, section, date])); setActiveSavedDiaryId(null); setStatus('Detached record ID. Next save will create a new entry.') }} title="Save as new entry instead">New Draft</button>
          </div>
        )}
      </div>

      {/* VIEW 1: SAVED DIARIES LIBRARY (Checkpoint 2) */}
      {activeTab === 'library' && (
        <div className="dd-library-view no-print">
          <div className="dd-library-header">
            <div>
              <h3>Saved Diaries Library</h3>
              <p>Search, review, duplicate, load or print any previously saved diary across all academic dates.</p>
            </div>
            <button type="button" className="dd-library-back-btn" onClick={() => setActiveTab('editor')}>
              <ArrowLeft size={14} /> Back to Editor
            </button>
          </div>

          {/* Filters Bar */}
          <div className="dd-library-filters">
            <div className="dd-filter-field">
              <Search size={14} />
              <input
                type="text"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                placeholder="Search subject, note or class..."
              />
            </div>
            <div className="dd-filter-field">
              <span className="dd-filter-label">Class:</span>
              <select value={libraryFilterClass} onChange={e => setLibraryFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {activeClasses.map(item => <option key={item.level} value={item.level}>{item.name}</option>)}
              </select>
            </div>
            <div className="dd-filter-field">
              <Calendar size={14} />
              <input
                type="date"
                value={libraryFilterDate}
                onChange={e => setLibraryFilterDate(e.target.value)}
              />
              {libraryFilterDate && <button type="button" onClick={() => setLibraryFilterDate('')}><X size={12} /></button>}
            </div>
            <div className="dd-archive-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={libraryViewArchived}
                  onChange={e => setLibraryViewArchived(e.target.checked)}
                />
                <span>Show Archived</span>
              </label>
            </div>
            <button type="button" className="dd-refresh-btn" onClick={() => fetchSavedDiaries(1)} disabled={savedDiariesLoading}>
              <RefreshCw size={13} className={savedDiariesLoading ? 'spin' : ''} /> Refresh
            </button>
          </div>

          {/* Cards Table / Grid */}
          {savedDiariesLoading ? (
            <div className="dd-library-loading">Loading saved diaries from server…</div>
          ) : savedDiariesList.length === 0 ? (
            <div className="dd-library-empty">
              <Layers size={36} />
              <h4>No saved diaries found</h4>
              <p>There are no saved diary records matching your search and filter criteria.</p>
              <button type="button" onClick={() => { setLibrarySearch(''); setLibraryFilterClass(''); setLibraryFilterDate(''); }}>Clear Filters</button>
            </div>
          ) : (
            <div className="dd-library-grid">
              {savedDiariesList.map(record => {
                const isCurrent = activeSavedDiaryId === Number(record.id)
                const isArchived = record.style_settings?.isArchived === true
                const rowsList = Array.isArray(record.rows) ? record.rows : []
                const subjectNames = rowsList.map(r => r.subject).filter(Boolean).join(', ')

                return (
                  <div key={record.id} className={`dd-library-card ${isCurrent ? 'active' : ''} ${isArchived ? 'archived' : ''}`}>
                    <div className="dd-lib-card-top">
                      <span className="dd-lib-badge">#{record.id}</span>
                      <span className="dd-lib-date"><Calendar size={12} /> {formatDate(record.diary_date)}</span>
                      {isArchived && <span className="dd-archived-tag">Archived</span>}
                    </div>
                    <div className="dd-lib-card-main">
                      <h4 className="dd-lib-class-title">{record.class_name || record.class_level || 'Class'} {record.style_settings?.section ? `· Sec ${record.style_settings.section}` : ''}</h4>
                      <div className="dd-lib-subjects-line">
                        <strong>{rowsList.length} Subject{rowsList.length === 1 ? '' : 's'}:</strong> {subjectNames || 'No subjects recorded'}
                      </div>
                      {record.footer_text && <p className="dd-lib-footer-snippet">“{record.footer_text}”</p>}
                    </div>
                    <div className="dd-lib-card-meta">
                      <span><Clock size={11} /> {record.created_at ? new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not recorded'}</span>
                      <span>{record.slips_per_page || 6} slips/page</span>
                    </div>
                    <div className="dd-lib-card-actions">
                      <button
                        type="button"
                        className="btn-lib-load"
                        onClick={() => loadDiaryRecordIntoEditor(record)}
                        title="Open in Workspace for editing"
                      >
                        <Edit size={13} /> {isCurrent ? 'Editing Now' : 'Load / Edit'}
                      </button>
                      <button
                        type="button"
                        className="btn-lib-dup"
                        onClick={() => duplicateDiaryRecord(record)}
                        title="Duplicate as new entry"
                      >
                        <Copy size={13} /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="btn-lib-archive"
                        onClick={e => toggleArchiveDiary(record, e)}
                        title={isArchived ? 'Restore diary' : 'Archive diary'}
                      >
                        <Archive size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-lib-del"
                        onClick={e => deleteDiaryRecord(record, e)}
                        title="Delete permanently"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {libraryPagination.totalPages > 1 && (
            <div className="dd-library-pagination">
              <button
                type="button"
                disabled={libraryPagination.page <= 1}
                onClick={() => fetchSavedDiaries(libraryPagination.page - 1)}
              >
                Previous
              </button>
              <span>Page {libraryPagination.page} of {libraryPagination.totalPages} ({libraryPagination.total} total diaries)</span>
              <button
                type="button"
                disabled={libraryPagination.page >= libraryPagination.totalPages}
                onClick={() => fetchSavedDiaries(libraryPagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SPLIT WORKSPACE (EDITOR & LIVE PREVIEW) */}
      <div className={`dd-main ${activeTab === 'library' ? 'dd-hidden-tab' : ''}`} style={{ '--editor-font-size': `${editorFontSize}px` }}>
        <aside className="dd-controls no-print">
          {/* Class & Student Selection */}
          <section>
            <div className="dd-section-title">Class & recipients</div>
            <div className="dd-grid-2">
              <label>
                <span>Class</span>
                <select data-dd-class value={classLevel} onChange={e => { setClassLevel(e.target.value); setSection('') }}>
                  <option value="">Select class</option>
                  {activeClasses.map(item => <option key={item.level} value={item.level}>{item.name}</option>)}
                </select>
              </label>
              <label>
                <span>Section</span>
                <select data-dd-section value={section} onChange={e => setSection(e.target.value)}>
                  <option value="">All / default</option>
                  {sectionOptions.map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
            </div>
            <label>
              <span>Date</span>
              <input data-dd-date type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <div className="dd-roster-head">
              <span><Users size={14} />{rosterStatus || 'Student roster'}</span>
              <div>
                <button type="button" onClick={selectAll}>All</button>
                <button type="button" onClick={clearStudents}>None</button>
              </div>
            </div>
            {students.length > 0 && (
              <>
                <div className="dd-search">
                  <Search size={14} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student / roll" />
                </div>
                <div className="dd-student-list">
                  {filteredStudents.map(student => {
                    const id = studentId(student)
                    return (
                      <label key={id}>
                        <input type="checkbox" checked={selectedStudentIds.includes(id)} onChange={() => toggleStudent(id)} />
                        <span>{studentName(student)}</span>
                        <small>{studentRoll(student) ? `Roll ${studentRoll(student)}` : '—'}{studentSection(student) ? ` · ${studentSection(student)}` : ''}</small>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {/* Subject Content Editor */}
          {mode === 'diary' ? (
            <section data-diary-editor>
              <div className="dd-section-title dd-section-title-split">
                <span>Diary content</span>
                <div className="dd-editor-font-tool" title="Editor typing font size">
                  <Type size={12} />
                  <span>Editor text:</span>
                  <button type="button" onClick={() => changeEditorFontSize(-1)} title="Smaller editor font"><Minus size={11} /></button>
                  <b>{editorFontSize}px</b>
                  <button type="button" onClick={() => changeEditorFontSize(1)} title="Larger editor font"><Plus size={11} /></button>
                </div>
              </div>
              <div className="dd-paste">
                <textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={'Paste the whole diary at once:\nEnglish: Page 21 reading practice\nUrdu: Page 25 writing\nMath: Exercise 4'}
                />
                <button type="button" onClick={applyDiaryPaste}><WandSparkles size={14} /> Auto Arrange</button>
              </div>
              <div className="dd-row-editors">
                {rows.map((row, index) => {
                  const rowSubjSize = row.subjectFontSize || activeLayout.baseSubjectSize
                  const isSubjBold = row.subjectBold === true
                  const isUrduRow = row.isUrdu || /[\u0600-\u06FF]/.test(row.subject || '') || /urdu|nazra|islamiat/i.test(row.subject || '')

                  return (
                    <div className="dd-row-editor" key={row.id || index}>
                      <div className="dd-row-top">
                        <input
                          value={row.subject || ''}
                          onChange={e => updateRow(index, { subject: e.target.value, isUrdu: /[\u0600-\u06FF]/.test(e.target.value) || /urdu|nazra|islamiat/i.test(e.target.value) })}
                          placeholder="Subject"
                          className={isUrduRow ? 'urdu' : ''}
                        />
                        <div className="dd-row-top-tools">
                          <span className="dd-tool-label">Subj:</span>
                          <button
                            type="button"
                            className={`dd-sub-bold-btn ${isSubjBold ? 'active' : ''}`}
                            title="Toggle Subject Bold (Optional)"
                            onClick={() => updateRow(index, { subjectBold: !isSubjBold })}
                          >
                            B
                          </button>
                          <button type="button" title="Decrease subject font" onClick={() => updateRow(index, { subjectFontSize: Math.max(8, rowSubjSize - 1) })}><Minus size={11} /></button>
                          <span className="dd-tool-val">{row.subjectFontSize ? `${row.subjectFontSize}px` : `${activeLayout.baseSubjectSize}px`}</span>
                          <button type="button" title="Increase subject font" onClick={() => updateRow(index, { subjectFontSize: Math.min(22, rowSubjSize + 1) })}><Plus size={11} /></button>
                          <button type="button" className="dd-del-btn" title="Delete subject" onClick={() => removeRow(index)}><X size={13} /></button>
                        </div>
                      </div>
                      <textarea
                        className={isUrduRow || /[\u0600-\u06FF]/.test(row.diary || '') ? 'urdu' : ''}
                        value={row.diary || ''}
                        onChange={e => updateRow(index, { diary: e.target.value, isUrdu: isUrduRow || /[\u0600-\u06FF]/.test(e.target.value) })}
                        placeholder="Diary / home task"
                      />
                      <div className="dd-format">
                        <span className="dd-tool-label">Text:</span>
                        <button type="button" className={row.isBold ? 'active' : ''} onClick={() => updateRow(index, { isBold: !row.isBold })}>B</button>
                        <button type="button" onClick={() => updateRow(index, { fontSize: Math.max(9, (row.fontSize || 12) - 1) })}><Minus size={12} /></button>
                        <span>{row.fontSize || 12}px</span>
                        <button type="button" onClick={() => updateRow(index, { fontSize: Math.min(22, (row.fontSize || 12) + 1) })}><Plus size={12} /></button>
                        <select value={row.textAlign || (isUrduRow ? 'right' : 'left')} onChange={e => updateRow(index, { textAlign: e.target.value })}>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="dd-add-row" onClick={addRow}><Plus size={14} /> Add Subject</button>
            </section>
          ) : (
            <section data-lesson-card-editor>
              <div className="dd-section-title">Lesson Plan source</div>
              <label>
                <span>Existing plan</span>
                <select value={lessonPlanId} onChange={e => selectPlan(e.target.value)}>
                  <option value="">Quick / new daily plan</option>
                  {lessonPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title || 'Lesson Plan'} · {plan.plan_date || plan.date || ''}</option>)}
                </select>
              </label>
              <button data-auto-plan-today type="button" className="dd-ai-button" onClick={autoPlanToday} disabled={busy === 'generate'}>
                {busy === 'generate' ? <RefreshCw className="spin" size={15} /> : <Sparkles size={15} />} Auto Plan This Day
              </button>
              <div className="dd-paste">
                <textarea
                  value={lessonPaste}
                  onChange={e => setLessonPaste(e.target.value)}
                  placeholder={'Paste all subjects together:\nEnglish: Reading comprehension\nHomework: Exercise 4\n\nScience: Photosynthesis\nActivity: Diagram work'}
                />
                <button type="button" onClick={arrangeLessonPaste} disabled={busy === 'parse'}><WandSparkles size={14} /> Arrange Plan</button>
              </div>
              <div className="dd-lesson-summary">
                {lessonDoc.subjects.length ? lessonDoc.subjects.map(subject => <div key={subject.subject}><b>{subject.subject}</b><span>{subject.lessons.filter(lesson => !date || lesson.date === date).length || subject.lessons.length} lesson slot(s)</span></div>) : <p>No lesson-plan content yet.</p>}
              </div>
            </section>
          )}

          {/* Layout, Header & Typography Controls */}
          <section>
            <div className="dd-section-title">A4 layout & style</div>
            <label>
              <span>Cards per A4 page</span>
              <div className="dd-counts">
                {CARD_COUNTS.map(count => (
                  <button
                    type="button"
                    key={count}
                    data-card-count={count}
                    className={cardsPerPage === count ? 'active' : ''}
                    onClick={() => setCardsPerPage(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </label>

            <div className="dd-config-row">
              <label>
                <span>Row Height (Expansion)</span>
                <div className="dd-stepper">
                  <button type="button" onClick={() => changeRowHeight(-1)}><Minus size={12} /></button>
                  <b>{rowHeightMm > 0 ? `${rowHeightMm}mm` : 'Auto'}</b>
                  <button type="button" onClick={() => changeRowHeight(1)}><Plus size={12} /></button>
                  {rowHeightMm > 0 ? <button type="button" className="dd-stepper-reset" onClick={() => setRowHeightMm(0)} title="Reset to auto height"><RotateCcw size={11} /></button> : null}
                </div>
              </label>
              <label>
                <span>Subject Column Width</span>
                <div className="dd-stepper">
                  <button type="button" onClick={() => setSubjectColWidth(w => Math.max(18, (w || 28) - 2))}><Minus size={12} /></button>
                  <b>{subjectColWidth || 28}%</b>
                  <button type="button" onClick={() => setSubjectColWidth(w => Math.min(45, (w || 28) + 2))}><Plus size={12} /></button>
                </div>
              </label>
            </div>

            <label>
              <span>English Card Font Family</span>
              <select className="dd-font-select" value={fontStyleId} onChange={e => setFontStyleId(e.target.value)}>
                {FONT_STYLES.map(font => <option key={font.id} value={font.id}>{font.name}</option>)}
              </select>
            </label>

            <div className="dd-config-row">
              <label>
                <span>Task Text Font Size</span>
                <div className="dd-stepper">
                  <button type="button" onClick={() => changeGlobalDiaryFontSize(-1)} title="Decrease diary font size"><Minus size={12} /></button>
                  <b>{globalDiaryFontSize}px</b>
                  <button type="button" onClick={() => changeGlobalDiaryFontSize(1)} title="Increase diary font size"><Plus size={12} /></button>
                </div>
              </label>
              <label>
                <span>Subject Row Font & Bold</span>
                <div className="dd-stepper">
                  <button
                    type="button"
                    className={`dd-sub-bold-btn ${globalSubjectBold ? 'active' : ''}`}
                    title="Toggle all subjects bold"
                    onClick={toggleGlobalSubjectBold}
                  >
                    B
                  </button>
                  <button type="button" onClick={() => changeGlobalSubjectFontSize(-1)} title="Decrease subject font size"><Minus size={12} /></button>
                  <b>{globalSubjectFontSize ? `${globalSubjectFontSize}px` : `${activeLayout.baseSubjectSize}px`}</b>
                  <button type="button" onClick={() => changeGlobalSubjectFontSize(1)} title="Increase subject font size"><Plus size={12} /></button>
                </div>
              </label>
            </div>

            {/* Expandable Header Settings (Checkpoint 4.2) */}
            <div className="dd-expandable-section">
              <button
                type="button"
                className="dd-expand-toggle"
                onClick={() => setShowHeaderSettings(v => !v)}
              >
                <span><Sliders size={13} /> Header & Branding Controls</span>
                {showHeaderSettings ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showHeaderSettings && (
                <div className="dd-expand-body">
                  <div className="dd-preset-buttons">
                    <button
                      type="button"
                      className={headerPreset === 'compact' ? 'active' : ''}
                      onClick={() => { setHeaderPreset('compact'); setHeaderScalePercent(88); setLogoSizeMm(8); }}
                    >
                      Compact
                    </button>
                    <button
                      type="button"
                      className={headerPreset === 'standard' ? 'active' : ''}
                      onClick={() => { setHeaderPreset('standard'); setHeaderScalePercent(100); setLogoSizeMm(10); }}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={headerPreset === 'spacious' ? 'active' : ''}
                      onClick={() => { setHeaderPreset('spacious'); setHeaderScalePercent(115); setLogoSizeMm(14); }}
                    >
                      Spacious
                    </button>
                  </div>

                  <div className="dd-config-row">
                    <label>
                      <span>Header Scale</span>
                      <div className="dd-stepper">
                        <button type="button" onClick={() => setHeaderScalePercent(h => Math.max(75, (h || 100) - 5))}><Minus size={12} /></button>
                        <b>{headerScalePercent || 100}%</b>
                        <button type="button" onClick={() => setHeaderScalePercent(h => Math.min(135, (h || 100) + 5))}><Plus size={12} /></button>
                        {headerScalePercent !== 100 ? <button type="button" className="dd-stepper-reset" onClick={() => setHeaderScalePercent(100)} title="Reset header scale"><RotateCcw size={11} /></button> : null}
                      </div>
                    </label>
                    <label>
                      <span>School Font Size</span>
                      <div className="dd-stepper">
                        <button type="button" onClick={() => setSchoolNameFontSize(s => Math.max(9, (s || 16) - 1))}><Minus size={12} /></button>
                        <b>{schoolNameFontSize > 0 ? `${schoolNameFontSize}px` : 'Auto'}</b>
                        <button type="button" onClick={() => setSchoolNameFontSize(s => Math.min(24, (s || 16) + 1))}><Plus size={12} /></button>
                        {schoolNameFontSize > 0 ? <button type="button" className="dd-stepper-reset" onClick={() => setSchoolNameFontSize(0)}><RotateCcw size={11} /></button> : null}
                      </div>
                    </label>
                  </div>
                  <div className="dd-config-row">
                    <label>
                      <span>Logo Size (mm)</span>
                      <div className="dd-stepper">
                        <button type="button" onClick={() => setLogoSizeMm(l => Math.max(6, (l || 10) - 1))}><Minus size={12} /></button>
                        <b>{logoSizeMm > 0 ? `${logoSizeMm}mm` : 'Auto'}</b>
                        <button type="button" onClick={() => setLogoSizeMm(l => Math.min(24, (l || 10) + 1))}><Plus size={12} /></button>
                        {logoSizeMm > 0 ? <button type="button" className="dd-stepper-reset" onClick={() => setLogoSizeMm(0)} title="Reset logo size"><RotateCcw size={11} /></button> : null}
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="dd-studio-config" data-studio-configuration>
              <div className="dd-studio-config-title">
                <strong>01 — Choose Design Structure</strong>
                <span>8 independent print layouts</span>
              </div>
              <div className="dd-studio-designs" role="group" aria-label="Studio design structure">
                {PALETTES.filter(item => item.studio).map(item => (
                  <button type="button" key={item.id} data-studio-design={item.id}
                    aria-pressed={paletteId === item.id}
                    className={'dd-studio-design-choice ' + (paletteId === item.id ? 'active' : '')}
                    onClick={() => setPaletteId(item.id)}>
                    <span className={'dd-studio-mini dd-studio-mini-' + item.edition} aria-hidden="true"><i/><i/><i/></span>
                    <span>{item.name.replace(/\s*\/ Studio$/, '')}</span>
                  </button>
                ))}
              </div>
              <div className="dd-studio-config-title">
                <strong>02 — Choose Color Palette</strong>
                <span>8 light palettes apply to any structure</span>
              </div>
              <div className="dd-studio-colors" role="group" aria-label="Studio color palette">
                {STUDIO_COLORS.map(item => (
                  <button type="button" key={item.id} data-studio-color={item.id}
                    aria-pressed={studioColorId === item.id}
                    disabled={!structure.studio}
                    className={'dd-studio-color-choice ' + (studioColorId === item.id && structure.studio ? 'active' : '')}
                    onClick={() => setStudioColorId(item.id)}
                    title={item.name}>
                    <span className="dd-studio-color-swatch" style={{ '--swatch-accent':item.accent, '--swatch-soft':item.soft, '--swatch-line':item.line }} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
              <details className="dd-classic-themes">
                <summary>Existing designs (preserved for saved diaries)</summary>
                <div className="dd-palettes">
                  {PALETTES.filter(item => !item.studio).map(item => (
                    <button type="button" key={item.id} className={paletteId === item.id ? 'active' : ''} onClick={() => setPaletteId(item.id)}>
                      <i style={{ background:item.accent }} /><span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <label>
              <span>Footer note</span>
              <input value={footerText} onChange={e => setFooterText(e.target.value)} />
            </label>

            <div className="dd-config-row">
              <label>
                <span>Footer Font Size</span>
                <div className="dd-stepper">
                  <button type="button" onClick={() => changeFooterFontSize(-0.5)} title="Decrease footer size"><Minus size={12} /></button>
                  <b>{footerFontSize > 0 ? `${footerFontSize}px` : 'Auto'}</b>
                  <button type="button" onClick={() => changeFooterFontSize(0.5)} title="Increase footer size"><Plus size={12} /></button>
                  {footerFontSize > 0 ? <button type="button" className="dd-stepper-reset" onClick={() => setFooterFontSize(0)} title="Reset footer font size"><RotateCcw size={11} /></button> : null}
                </div>
              </label>
            </div>
          </section>
        </aside>

        {/* Live A4 Preview Section */}
        <section className="dd-preview-wrap">
          <div className="dd-preview-toolbar no-print">
            <div>
              <b>Live A4 Preview</b>
              <span>{selectedStudents.length ? `${selectedStudents.length} personalized card${selectedStudents.length === 1 ? '' : 's'}` : `Generic preview · ${cardsPerPage} cards`}</span>
            </div>
            <div>
              <button type="button" onClick={() => setPreviewZoom(z => Math.max(.4, +(z - .08).toFixed(2)))}><Minus size={13} /></button>
              <span>{Math.round(previewZoom * 100)}%</span>
              <button type="button" onClick={() => setPreviewZoom(z => Math.min(1, +(z + .08).toFixed(2)))}><Plus size={13} /></button>
              <button type="button" onClick={() => setPreviewZoom(.68)}>Fit</button>
            </div>
          </div>

          {/* Studio Quick Adjustment Bar (Checkpoint: Immediate Print Tuning) */}
          <div className="dd-studio-quick-bar no-print" data-studio-quick-bar>
            <div className="dd-sqb-group">
              <span className="dd-sqb-label"><Type size={12} /> Font:</span>
              <select className="dd-sqb-select" value={fontStyleId} onChange={e => setFontStyleId(e.target.value)}>
                {FONT_STYLES.map(font => <option key={font.id} value={font.id}>{font.name.split(' (')[0]}</option>)}
              </select>
            </div>

            <div className="dd-sqb-divider" />

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Task Text:</span>
              <div className="dd-sqb-stepper">
                <button type="button" onClick={() => changeGlobalDiaryFontSize(-1)} title="Decrease diary font size"><Minus size={11} /></button>
                <b>{globalDiaryFontSize}px</b>
                <button type="button" onClick={() => changeGlobalDiaryFontSize(1)} title="Increase diary font size"><Plus size={11} /></button>
              </div>
            </div>

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Subject Row:</span>
              <div className="dd-sqb-stepper">
                <button
                  type="button"
                  className={`dd-sqb-btn-bold ${globalSubjectBold ? 'active' : ''}`}
                  onClick={toggleGlobalSubjectBold}
                  title="Toggle all subjects bold"
                >
                  B
                </button>
                <button type="button" onClick={() => changeGlobalSubjectFontSize(-1)} title="Decrease subject font size"><Minus size={11} /></button>
                <b>{globalSubjectFontSize ? `${globalSubjectFontSize}px` : `${activeLayout.baseSubjectSize}px`}</b>
                <button type="button" onClick={() => changeGlobalSubjectFontSize(1)} title="Increase subject font size"><Plus size={11} /></button>
              </div>
            </div>

            <div className="dd-sqb-divider" />

            <div className="dd-sqb-divider" />
            <div className="dd-sqb-group dd-sqb-table-heading" data-table-heading-controls>
              <span className="dd-sqb-label">Table Headings:</span>
              <div className="dd-sqb-stepper">
                <button type="button" onClick={() => setTableHeaderBold(value => !value)}
                  className={tableHeaderBold ? 'dd-sqb-btn-bold active' : 'dd-sqb-btn-bold'}
                  title="Toggle Subject and Home Task heading bold" aria-label="Toggle table headings bold">B</button>
                <button type="button" onClick={() => setTableHeaderFontSize(value => Math.max(9, value - 1))}
                  title="Decrease table heading font size" aria-label="Decrease table heading font size"><Minus size={11} /></button>
                <b>{tableHeaderFontSize}px</b>
                <button type="button" onClick={() => setTableHeaderFontSize(value => Math.min(20, value + 1))}
                  title="Increase table heading font size" aria-label="Increase table heading font size"><Plus size={11} /></button>
              </div>
            </div>

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Row Height:</span>
              <div className="dd-sqb-stepper">
                <button type="button" onClick={() => changeRowHeight(-1)} title="Decrease row height"><Minus size={11} /></button>
                <b>{rowHeightMm > 0 ? `${rowHeightMm}mm` : 'Auto'}</b>
                <button type="button" onClick={() => changeRowHeight(1)} title="Increase row height"><Plus size={11} /></button>
                {rowHeightMm > 0 && <button type="button" className="dd-sqb-reset" onClick={() => setRowHeightMm(0)} title="Reset row height"><RotateCcw size={10} /></button>}
              </div>
            </div>

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Row Width:</span>
              <div className="dd-sqb-stepper">
                <button type="button" onClick={() => setSubjectColWidth(w => Math.max(18, (w || 28) - 2))} title="Decrease subject column width"><Minus size={11} /></button>
                <b>{subjectColWidth || 28}%</b>
                <button type="button" onClick={() => setSubjectColWidth(w => Math.min(45, (w || 28) + 2))} title="Increase subject column width"><Plus size={11} /></button>
              </div>
            </div>

            <div className="dd-sqb-divider" />

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Header:</span>
              <div className="dd-sqb-stepper" title="Header scale percentage">
                <button type="button" onClick={() => setHeaderScalePercent(h => Math.max(75, (h || 100) - 5))} title="Decrease header scale"><Minus size={11} /></button>
                <b>{headerScalePercent}%</b>
                <button type="button" onClick={() => setHeaderScalePercent(h => Math.min(135, (h || 100) + 5))} title="Increase header scale"><Plus size={11} /></button>
              </div>
              <div className="dd-sqb-stepper" title="School title font size">
                <button type="button" onClick={() => setSchoolNameFontSize(s => Math.max(9, (s || 16) - 1))} title="Decrease school title font size"><Minus size={11} /></button>
                <b>{schoolNameFontSize > 0 ? `${schoolNameFontSize}px` : 'Auto'}</b>
                <button type="button" onClick={() => setSchoolNameFontSize(s => Math.min(24, (s || 16) + 1))} title="Increase school title font size"><Plus size={11} /></button>
                {schoolNameFontSize > 0 && <button type="button" className="dd-sqb-reset" onClick={() => setSchoolNameFontSize(0)} title="Reset school font size"><RotateCcw size={10} /></button>}
              </div>
            </div>

            <div className="dd-sqb-divider" />

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Footer:</span>
              <div className="dd-sqb-stepper">
                <button type="button" onClick={() => changeFooterFontSize(-0.5)} title="Decrease footer size"><Minus size={11} /></button>
                <b>{footerFontSize > 0 ? `${footerFontSize}px` : 'Auto'}</b>
                <button type="button" onClick={() => changeFooterFontSize(0.5)} title="Increase footer size"><Plus size={11} /></button>
                {footerFontSize > 0 && <button type="button" className="dd-sqb-reset" onClick={() => setFooterFontSize(0)} title="Reset footer font size"><RotateCcw size={10} /></button>}
              </div>
            </div>

            <div className="dd-sqb-group">
              <span className="dd-sqb-label">Editor:</span>
              <div className="dd-sqb-stepper" title="Editor typing text size">
                <button type="button" onClick={() => changeEditorFontSize(-1)} title="Decrease editor font size"><Minus size={11} /></button>
                <b>{editorFontSize}px</b>
                <button type="button" onClick={() => changeEditorFontSize(1)} title="Increase editor font size"><Plus size={11} /></button>
              </div>
            </div>
          </div>

          <div className="dd-page-stage" style={{ '--preview-zoom': previewZoom }}>
            {pages.map((page, pageIndex) => {
              const layout = computeA4Layout(cardsPerPage)
              return (
                <div
                  className="dd-a4-page"
                  key={pageIndex}
                  style={{ '--cols': layout.cols, '--rows': layout.rows, '--gap-mm': `${layout.gap}mm` }}
                  data-a4-page
                >
                  {page.map((student, index) => (
                    <StudentCard
                      key={student.__generic !== undefined ? `generic-${pageIndex}-${index}` : studentId(student)}
                      mode={mode}
                      student={student.__generic !== undefined ? null : student}
                      palette={palette}
                      schoolName={schoolName}
                      logoUrl={logoUrl}
                      classLabel={classLabel}
                      section={section}
                      date={date}
                      rows={previewRows}
                      footerText={footerText}
                      cardsPerPage={cardsPerPage}
                      indexInPage={index}
                      subjectColWidth={subjectColWidth}
                      headerScalePercent={headerScalePercent}
                      rowHeightMm={rowHeightMm}
                      fontStyleId={fontStyleId}
                      headerPreset={headerPreset}
                      schoolNameFontSize={schoolNameFontSize}
                      logoSizeMm={logoSizeMm}
                      footerFontSize={footerFontSize}
                      globalDiaryFontSize={globalDiaryFontSize}
                      globalSubjectFontSize={globalSubjectFontSize}
                      globalSubjectBold={globalSubjectBold}
                      tableHeaderFontSize={tableHeaderFontSize}
                      tableHeaderBold={tableHeaderBold}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
