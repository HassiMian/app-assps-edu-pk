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


// Synthetic pagination/RTL layout test fixture. No official paper source is changed.
const rtlOddOverflowPaper = {
 id:'synthetic-rtl-odd-print-20261008',name:'Synthetic Urdu Odd Column Print',
 documentFormat:'pts-native-v13',printReadiness:'READY',
 editorSettings:{shortLayout:'2-column-balanced'},
 config:{className:'7',classLevel:'7',subjectName:'Urdu',subject:'Urdu',language:'urdu',
   paperCode:'ODD-RTL-PRINT',timeAllowed:'2 Hours',examDate:'2026-10-08',totalMarks:25,title:'Synthetic Print Proof'},
 official_section:[{
  id:'rtl-odd-short',sourceOrder:1,medium:'urdu',type:'official_section',layoutPreset:'short',
  heading:'سوال نمبر 1: مختصر سوالات کے جواب دیں۔ (25)',marks:25,
  content:Array.from({length:25},(_,i)=>`${i+1}. ${i===0?'ط'.repeat(420):'مختصر سوال کے جواب میں دلیل اور مثال پیش کریں۔'.repeat(5)} [PRINT-PROOF-${String(i+1).padStart(2,'0')}]`).join('\n'),
 }],
}

// Synthetic bilingual-print adversarial fixture; independent of official papers.
const bilingualTableOverflowPaper = {
 id:'synthetic-bilingual-short-table-print-20261008',name:'Bilingual Two Column Table Print Fixture',
 documentFormat:'pts-native-v13',printReadiness:'READY',
 editorSettings:{shortLayout:'table-2-column'},
 config:{className:'6',classLevel:'6',subjectName:'Social Studies',subject:'Social Studies',language:'urdu',
  paperCode:'BILINGUAL-TABLE-PRINT',timeAllowed:'60 Minutes',examDate:'2026-10-08',totalMarks:9,title:'Synthetic Bilingual Print'},
 official_section:[{
  id:'bilingual-table-short',type:'official_section',sourceOrder:1,layoutPreset:'short',medium:'urdu',
  heading:'سوال نمبر 1: مختصر سوالات کے جواب دیں۔ (9)',marks:9,
  content:Array.from({length:9},(_,i)=>`${i+1}. ${i===0?'LONGMATHSOURCETOKEN'.repeat(34):i===1?'ب'.repeat(200):'پاکستان میں موسم کے متعلق ایک مختصر جواب لکھیں۔ English climate observations '+String(i+1)} [BILINGUAL-TABLE-${String(i+1).padStart(2,'0')}]`).join('\n'),
 }],
}

// Synthetic bilingual matrix-MCQ stress test, never an official paper.
const bilingualMatrixOverflowPaper = {
 id:'synthetic-mcq-matrix-overflow-20261008',name:'Matrix MCQ Bilingual Print Stress Fixture',
 documentFormat:'pts-native-v13',printReadiness:'READY',editorSettings:{mcqLayout:'matrix-table'},
 config:{className:'7',classLevel:'7',subjectName:'Science',subject:'Science',language:'urdu',
   paperCode:'MCQ-MATRIX-PRINT',timeAllowed:'45 minutes',examDate:'2026-10-08',totalMarks:3,title:'Synthetic MCQ Print'},
 official_section:[{id:'synthetic-mcq-matrix',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'mcq',
  heading:'سوال نمبر 1: درست جواب منتخب کریں۔ (3)',marks:3,content:[
   `1. ${'LONGENGLISHSCIENTIFICMEASUREMENT'.repeat(24)} [MCQ-STEM-01]`,
   `A) Yes B) No C) Depends D) Never`,
   `2. پاکستان کے کس موسم میں بارش ہوتی ہے؟ [MCQ-STEM-02]`,
   `A) ${'VERYUNBROKENOPTIONWORD'.repeat(25)} B) Autumn C) Winter D) Spring`,
   `3. ${'ب'.repeat(220)} [MCQ-STEM-03]`,
   `A) Yes B) No C) Maybe D) None`,
  ].join('\n'),
 }],
}

// Synthetic multilingual Markdown table; no official or tenant data.
const sourceTableOverflowPaper = {
 id:'synthetic-markdown-table-overflow-20261009',name:'Multilingual Markdown Table Print Stress',
 documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'8',classLevel:'8',subject:'Social Studies',subjectName:'Social Studies',language:'urdu',paperCode:'MD-TABLE-PRINT',timeAllowed:'1 Hour',examDate:'2026-10-08',totalMarks:5,title:'Synthetic Table Print'},
 official_section:[{id:'source-markdown-table',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'table',
 heading:'سوال نمبر 1: جدول مکمل کریں۔ (5)',marks:5,content:[
 '| موضوع | وضاحت | English explanation |',
 '| --- | --- | --- |',
 '| ماحولیات | '+('ب'.repeat(210))+' [SOURCE-CELL-01] | Short |',
 '| درجہ حرارت | Regular | '+('LONGUNBREAKABLEMEASUREMENTTOKEN'.repeat(25))+' [SOURCE-CELL-02] |',
 '| موسم | مختصر وضاحت | climate data [SOURCE-CELL-03] |',
 ].join('\n'),
 }],
}

// Synthetic matching-column RTL/English adversarial print acceptance fixture.
const matchingColumnOverflowPaper = {
 id:'synthetic-matching-column-overflow-20261009',name:'Bilingual Matching Column Print Stress',
 documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'5',classLevel:'5',subject:'General Knowledge',subjectName:'General Knowledge',language:'urdu',
  paperCode:'MATCHING-PRINT',timeAllowed:'40 Minutes',examDate:'2026-10-08',totalMarks:5,title:'Synthetic Matching Print'},
 official_section:[{id:'matching-column-overflow',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'matching',
 heading:'سوال نمبر 1: کالم الف کو کالم ب سے ملائیں۔ (5)',marks:5,
 tableHeaders:['اردو کالم A '+('ب'.repeat(75)), 'Column B '+('LONGSCIENTIFICUNBREAKABLEHEADER'.repeat(14))],
 content:[
  '1. '+('ط'.repeat(195))+' [MATCHING-CELL-01] | Climate',
  '2. Rain | '+('LONGUNBREAKABLESCIENCETOKEN'.repeat(27))+' [MATCHING-CELL-02]',
  '3. دھوپ | Sunshine [MATCHING-CELL-03]',
  '4. Temperature | درجہ حرارت [MATCHING-CELL-04]',
  '5. Cloud | بادل [MATCHING-CELL-05]',
 ].join('\n'),
 }],
}

// Synthetic Early Years sentence/pair exercise stress fixtures. No original papers edited.
const earlySentenceOverflowPaper = {
 id:'synthetic-early-sentence-20261009',name:'Urdu Sentence Table Print Test',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'3',classLevel:'3',subject:'Urdu',subjectName:'Urdu',language:'urdu',paperCode:'EARLY-SENTENCES',timeAllowed:'40 Minutes',totalMarks:4,title:'Synthetic Sentence Practice'},
 official_section:[{id:'early-sentence',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'sentence_usage',
 heading:'سوال نمبر 1: الفاظ کے جملے بنائیں۔ (4)',marks:4,
 tableHeaders:['الفاظ '+('ب'.repeat(125)), 'Long English column '+('UNBROKENMEASUREWORD'.repeat(26))],
 content:[
 '1. '+('ط'.repeat(225))+' [SENTENCE-CELL-01]',
 '2. '+('LONGENGLISHSCIENCETERM'.repeat(31))+' [SENTENCE-CELL-02]',
 '3. بادل [SENTENCE-CELL-03]',
 '4. Sunshine [SENTENCE-CELL-04]',
 ].join('\n')}],
}
const earlyPairOverflowPaper = {
 id:'synthetic-early-pair-20261009',name:'Urdu Pair Practice Table Print Test',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'4',classLevel:'4',subject:'English',subjectName:'English',language:'urdu',paperCode:'EARLY-PAIR',timeAllowed:'40 Minutes',totalMarks:4,title:'Synthetic Pair Practice'},
 official_section:[{id:'early-pair',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'pair_table',
 heading:'سوال نمبر 1: جوڑوں کے جواب لکھیں۔ (4)',marks:4,
 tableHeaders:['لفظ '+('ب'.repeat(125)), 'Long English column '+('UNBROKENMEASUREWORD'.repeat(26))],
 content:[
 '1. '+('ط'.repeat(225))+' [PAIR-CELL-01]',
 '2. '+('LONGENGLISHSCIENCETERM'.repeat(31))+' [PAIR-CELL-02]',
 '3. بادل [PAIR-CELL-03]',
 '4. Sunshine [PAIR-CELL-04]',
 ].join('\n')}],
}

// Isolated, synthetic math print stress. No protected source or school records.
const mathPracticeOverflowPaper = {
 id:'synthetic-math-practice-print-20261009',name:'Math Long Token 2-Column Print',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'6',classLevel:'6',subject:'Mathematics',subjectName:'Mathematics',language:'english',paperCode:'MATH-PRACTICE-PRINT',timeAllowed:'45 Minutes',totalMarks:6,title:'Synthetic Math Practice'},
 official_section:[{id:'synthetic-math-practice',type:'official_section',sourceOrder:1,layoutPreset:'math_compare',medium:'english',
 heading:'Q1. Compare the measurements (6)',marks:6,
 content:Array.from({length:6},(_,i)=>`${i+1}. ${i===0?'LONGUNBREAKABLEMATHEMATICALVALUE'.repeat(24):i===1?'۱۲۳۴۵۶۷۸۹۰'.repeat(145):'x² + y² = z²; compare positive integer quantities'} [MATH-PRACTICE-${String(i+1).padStart(2,'0')}]`).join('\n')}],
}
const mathTablesOverflowPaper = {
 id:'synthetic-math-table-print-20261009',name:'Math Tables Long Token Print',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'5',classLevel:'5',subject:'Mathematics',subjectName:'Mathematics',language:'english',paperCode:'MATH-TABLE-PRINT',timeAllowed:'45 Minutes',totalMarks:4,title:'Synthetic Math Tables'},
 official_section:[{id:'synthetic-math-table',type:'official_section',sourceOrder:1,layoutPreset:'math_table',medium:'english',
 heading:'Q1. Complete number tables (4)',marks:4,
 content:Array.from({length:4},(_,i)=>`${i+1}. ${i===0?'NONDIVISIBLECONSECUTIVENUMBER'.repeat(27):i===1?'۱۲۳۴۵۶۷۸۹۰'.repeat(95):'Table of 7 × 3 = 21'} [MATH-TABLE-${String(i+1).padStart(2,'0')}]`).join('\n')}],
}

// Synthetic vertical-arithmetic print stress; not a real authored/official paper.
const verticalMathOverflowPaper = {
 id:'synthetic-vertical-math-print-20261009',name:'Mathematical Vertical Arithmetic Alignment Print Stress',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'6',classLevel:'6',subject:'Mathematics',subjectName:'Mathematics',language:'english',paperCode:'VERTICAL-MATH-STRESS',timeAllowed:'40 Minutes',totalMarks:4,title:'Synthetic Vertical Maths'},
 official_section:[{id:'vertical-math-stress',type:'official_section',sourceOrder:1,layoutPreset:'vertical_math',medium:'english',
 heading:'Q1. Vertical arithmetic (4)',marks:4,content:[
 '1234567890'.repeat(82)+'   '+'9876543210'.repeat(82),
 '+'+'1122334455'.repeat(79)+'   '+'-'+'9988776655'.repeat(79),
 '[VERT-MATH-01]   [VERT-MATH-02]',
 '',
 'LONGUNBROKENMATHEMATICALTOKEN'.repeat(29)+'   '+'۹۸۷۶۵۴۳۲۱۰'.repeat(125),
 '[VERT-MATH-03]   [VERT-MATH-04]',
 ].join('\n')}],
}

// Synthetic Markdown table escaped-pipe/escaped-backslash fidelity fixture only.
const escapedPipeTablePaper = {
 id:'synthetic-escaped-pipe-table-20261009',name:'Escaped Markdown Table Fidelity',documentFormat:'pts-native-v13',printReadiness:'READY',
 config:{className:'7',classLevel:'7',subject:'Science',subjectName:'Science',language:'urdu',paperCode:'ESCAPED-PIPE',timeAllowed:'35 Minutes',totalMarks:4,title:'Synthetic Escaped Markdown'},
 official_section:[{id:'escaped-pipe-markdown',type:'official_section',sourceOrder:1,medium:'urdu',layoutPreset:'table',
 heading:'سوال نمبر 1: جدول مکمل کریں۔ (4)',marks:4,
 content:String.raw`| Formula \| Unit | عنوان | Notes |
| --- | --- | --- |
| Pressure \| Temperature [ESCAPED-01] | دباؤ \| حرارت [ESCAPED-02] | C:\\Science [ESCAPED-03] |
| Normal number | عام جواب | Value \| axis [ESCAPED-04] |` }],
}

const nestedScoringPaper = {
 clientDraftId:'nested-scoring-browser-paper',
 name:'Nested Scoring Browser Paper',
 userAuthored:true,
 documentFormat:'pts-native-v13',
 config:{
  className:'7',classLevel:'7',subjectName:'Science',subject:'Science',language:'english',
  paperCode:'NESTED-SCORING',timeAllowed:'30 minutes',examDate:'2026-10-07',totalMarks:9,title:'Nested Scoring Browser Paper',
 },
 official_section:[{
  id:'nested-choice',
  type:'official_section',
  sourceOrder:1,
  heading:'Q1. Complete both groups using the stated choices. (9)',
  text:'Q1. Complete both groups using the stated choices. (9)',
  content:'Group A: choose one long question. Group B: attempt any two short questions.',
  marks:9,
  operationalMarks:9,
  listedPotentialItemMarksTotal:16,
  attemptRule:'ALL',
  choiceGroups:[
   {
    id:'long-or',
    mode:'OR',
    children:[
     {id:'long-a',maximumObtainableMarks:5,listedPotentialItemMarksTotal:5},
     {id:'long-b',maximumObtainableMarks:5,listedPotentialItemMarksTotal:5},
    ],
   },
   {
    id:'short-any',
    mode:'ATTEMPT_ANY',
    attemptCount:2,
    children:[
     {id:'short-1',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
     {id:'short-2',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
     {id:'short-3',maximumObtainableMarks:2,listedPotentialItemMarksTotal:2},
    ],
   },
  ],
 }],
}


const mathAssetsPaper = {
 name:'Math Assets Browser Fixture',
 userAuthored:true,
 documentOrigin:'USER_AUTHORED',
 assessmentType:'Weekly Assessment',
 config:{
  className:'7',classLevel:'7',subjectName:'Mathematics',subject:'Mathematics',
  language:'english',paperCode:'MATH-ASSET-BROWSER',timeAllowed:'20 minutes',
  totalMarks:4,title:'Math & Image Assessment',
 },
 official_section:[
  {
   id:'math-1',type:'official_section',sourceOrder:1,heading:'Q1. Solve the expression.',
   text:'Q1. Solve the expression.',marks:2,content:'Use the expression below.',
   layoutPreset:'math',math:{format:'latex',source:'x^2 + y^2 = z^2',display:'block'},
  },
  {
   id:'image-1',type:'official_section',sourceOrder:2,heading:'Q2. Study the diagram.',
   text:'Q2. Study the diagram.',marks:2,content:'Name the object shown.',
   layoutPreset:'image',
   asset:{
    id:'asset-image-browser-1',kind:'image',storage:'embedded',mimeType:'image/png',
    sha256:'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    byteLength:68,widthPx:1,heightPx:1,effectiveDpi:25.4,
    altText:'A one-pixel browser test image',description:'Deterministic browser fixture',
    contentDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII=',
   },
  },
 ],
}

export function ThemeFixture() {
 const { theme, setTheme, toggleTheme } = useTheme()
 const { savedPapers } = usePaperStore()
 const params = new URLSearchParams(window.location.search)
 const reopenName = params.get('reopenName') || 'Phase1 Browser Urdu'
 const reopenId = params.get('reopenId') || ''
 const reopenPaper = savedPapers.find(p => p.userAuthored && (reopenId ? String(p.id)===reopenId : p.name===reopenName)) || null
 const officialId = params.get('officialId') || ''
 const officialPaper = officialId ? officialV13.papers.find(item => item.id === officialId) || null : null
 const fixture = params.has('new') ? null : params.has('reopen') ? reopenPaper : params.has('escapedPipeTable') ? escapedPipeTablePaper : params.has('verticalMathOverflow') ? verticalMathOverflowPaper : params.has('mathPracticeOverflow') ? mathPracticeOverflowPaper : params.has('mathTablesOverflow') ? mathTablesOverflowPaper : params.has('earlySentenceOverflow') ? earlySentenceOverflowPaper : params.has('earlyPairOverflow') ? earlyPairOverflowPaper : params.has('matchingColumnOverflow') ? matchingColumnOverflowPaper : params.has('sourceTableOverflow') ? sourceTableOverflowPaper : params.has('bilingualMatrixOverflow') ? bilingualMatrixOverflowPaper : params.has('bilingualTableOverflow') ? bilingualTableOverflowPaper : params.has('rtlOddOverflow') ? rtlOddOverflowPaper : params.has('nestedScoring') ? nestedScoringPaper : params.has('mathAssets') ? mathAssetsPaper : officialPaper || (params.has('recovery8') ? classEightUrduFixture : paper)
 React.useEffect(() => { setTheme('light') }, [setTheme])
 return <>
  <button hidden id="fixture-global-theme-toggle" data-current-theme={theme} onClick={toggleTheme}>Portal theme toggle</button>
  <PTSPaperGenerator loadedPaper={fixture} />
 </>
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider><ThemeFixture /></ThemeProvider>
)
