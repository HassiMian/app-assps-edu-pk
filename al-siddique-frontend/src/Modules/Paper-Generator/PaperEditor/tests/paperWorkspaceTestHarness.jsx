import React from 'react'
import ReactDOM from 'react-dom/client'
import PTSPaperGenerator from '../../PTSPaperGenerator.jsx'
import { usePaperStore } from '../../usePaperStore.js'
import { ThemeProvider, useTheme } from '@/context/ThemeContext.jsx'
import '@/index.css'
import recoverySource from '../../seed-data/exam-night-recovery-v3.json'
import officialV13 from '../../seed-data/official-first-term-2026-v13.json'
import { buildRecoverySavedPapers } from '../../seed-data/examNightRecoveryAdapter.js'

const paper = {
  id: 'workspace-urdu-acceptance-paper',
  name: 'Workspace Urdu Acceptance Paper',
  documentFormat: 'pts-native-v13',
  printReadiness: 'READY',
  config: {
    className: '8',
    classLevel: '8',
    subjectName: 'Urdu',
    subject: 'Urdu',
    language: 'urdu',
    paperCode: 'TEST-URDU',
    timeAllowed: '2 Hours',
    examDate: '2026-10-03',
    totalMarks: 20,
    title: 'FIRST TERM EXAMINATION 2026',
  },
  official_section: [
    {
      id: 'urdu-mcq',
      type: 'official_section',
      medium: 'urdu',
      sourceOrder: 1,
      heading: 'سوال نمبر 1: درست جواب پر (✓) کا نشان لگائیں۔ (5)',
      text: 'سوال نمبر 1: درست جواب پر (✓) کا نشان لگائیں۔ (5)',
      textUrdu: 'سوال نمبر 1: درست جواب پر (✓) کا نشان لگائیں۔ (5)',
      marks: 5,
      content: [
        '1. قرارداد لاہور کس سال منظور ہوئی؟',
        'الف) 1930ء میں  ب) 1932ء میں  ج) 1935ء میں  د) 1945ء میں',
      ].join('\n'),
    },
    {
      id: 'urdu-sentence-usage',
      type: 'official_section',
      medium: 'urdu',
      sourceOrder: 2,
      heading: 'سوال نمبر 2: درج ذیل الفاظ کو جملوں میں استعمال کریں۔ (5)',
      text: 'سوال نمبر 2: درج ذیل الفاظ کو جملوں میں استعمال کریں۔ (5)',
      textUrdu: 'سوال نمبر 2: درج ذیل الفاظ کو جملوں میں استعمال کریں۔ (5)',
      marks: 5,
      content: '1. کتاب\n2. وطن\n3. محنت\n4. استاد\n5. کامیابی',
    },
    {
      id: 'urdu-matching',
      type: 'official_section',
      medium: 'urdu',
      sourceOrder: 3,
      heading: 'سوال نمبر 3: کالم A کو کالم B سے ملائیں۔ (5)',
      text: 'سوال نمبر 3: کالم A کو کالم B سے ملائیں۔ (5)',
      textUrdu: 'سوال نمبر 3: کالم A کو کالم B سے ملائیں۔ (5)',
      marks: 5,
      content: '1. کتاب | Book\n2. قلم | Pen\n3. سکول | School',
    },
    {
      id: 'urdu-short',
      type: 'official_section',
      medium: 'urdu',
      sourceOrder: 4,
      layoutPreset: 'short',
      heading: 'سوال نمبر 4: مختصر سوالات کے جواب دیں۔ (5)',
      text: 'سوال نمبر 4: مختصر سوالات کے جواب دیں۔ (5)',
      textUrdu: 'سوال نمبر 4: مختصر سوالات کے جواب دیں۔ (5)',
      marks: 5,
      content: '1. پاکستان کا دارالحکومت کیا ہے؟\n2. قومی زبان کون سی ہے؟\n3. شاعر مشرق کون ہیں؟\n4. کتاب کسے کہتے ہیں؟\n5. استاد کا احترام کیوں ضروری ہے؟\n6. محنت کا فائدہ کیا ہے؟\n7. وقت کی پابندی کیوں ضروری ہے؟\n8. سچائی کیا ہے؟\n9. وطن سے محبت کیوں کرنی چاہیے؟\n10. علم کی اہمیت کیا ہے؟',
    },
  ],
  editorSettings: {
    template: 'classic',
    printMode: 'a4',
    mcqLayout: 'matrix-table',
    shortLayout: '1-column',
    questionBorder: 'none',
    pageBorder: 'thin',
    showSectionLine: true,
    englishLineHeight: 1.5,
    urduLineHeight: 2.2,
    letterSpacing: 0,
    wordSpacing: 0,
  },
}

const classEightUrduFixture = (() => {
  const recovered = buildRecoverySavedPapers(recoverySource).find(p => p.id === 'recovery-first-term-2026-class-8-urdu')
  if (!recovered) throw new Error('Class 8 Urdu recovery source unavailable')
  // Test-only fixture mirrors the already-reconciled 70/70 paper shown in the screenshot.
  return { ...recovered, config: { ...recovered.config, totalMarks: 70 }, printReadiness: 'READY' }
})()

function ThemeFixture() {
 const { theme, setTheme, toggleTheme } = useTheme()
 const { savedPapers } = usePaperStore()
 const params = new URLSearchParams(window.location.search)
 const reopenName = params.get('reopenName') || 'Phase1 Browser Urdu'
 const reopenId = params.get('reopenId') || ''
 const reopenPaper = savedPapers.find(p => p.userAuthored && (reopenId ? String(p.id)===reopenId : p.name===reopenName)) || null
 const officialId = params.get('officialId') || ''
 const officialPaper = officialId ? officialV13.papers.find(item => item.id === officialId) || null : null
 const fixture = params.has('new') ? null : params.has('reopen') ? reopenPaper : officialPaper || (params.has('recovery8') ? classEightUrduFixture : paper)
 React.useEffect(() => { setTheme('light') }, [setTheme])
 return <>
  <button hidden id="fixture-global-theme-toggle" data-current-theme={theme} onClick={toggleTheme}>Portal theme toggle</button>
  <PTSPaperGenerator loadedPaper={fixture} />
 </>
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider><ThemeFixture /></ThemeProvider>
)
