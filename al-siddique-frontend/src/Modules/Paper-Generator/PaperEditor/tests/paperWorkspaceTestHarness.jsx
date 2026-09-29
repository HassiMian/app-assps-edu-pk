import React from 'react'
import ReactDOM from 'react-dom/client'
import PTSPaperGenerator from '../../PTSPaperGenerator.jsx'
import '@/index.css'

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
    totalMarks: 10,
    title: 'FIRST TERM EXAMINATION 2026',
  },
  official_section: [
    {
      id: 'urdu-mcq',
      type: 'official_section',
      medium: 'urdu',
      sourceOrder: 1,
      heading: 'سوال نمبر 1: درست جواب کا انتخاب کیجئے۔ (5)',
      text: 'سوال نمبر 1: درست جواب کا انتخاب کیجئے۔ (5)',
      textUrdu: 'سوال نمبر 1: درست جواب کا انتخاب کیجئے۔ (5)',
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <PTSPaperGenerator loadedPaper={paper} />
)
