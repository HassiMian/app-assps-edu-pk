// PaperDocument.js — Canonical versioned document model for ASSPS Paper Generator
export const SCHEMA_VERSION = 2

export function createId(prefix = 'node') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function createPaperQuestion(overrides = {}) {
  const type = overrides.type || 'short'
  return {
    id: overrides.id || createId('q'),
    qNumber: overrides.qNumber ?? 1,
    type, // 'mcq' | 'short' | 'long' | 'true-false' | 'fill' | 'custom'
    marks: Number.isFinite(Number(overrides.marks)) ? Number(overrides.marks) : 1,
    direction: overrides.direction || 'auto', // 'ltr' | 'rtl' | 'auto'
    stemText: overrides.stemText || overrides.text || '',
    stemUrdu: overrides.stemUrdu || overrides.textUrdu || '',
    // Rich document representation for Tiptap / ProseMirror
    stemRich: overrides.stemRich || null,
    // MCQ specific options
    options: Array.isArray(overrides.options)
      ? overrides.options.map((opt, idx) => ({
          id: opt.id || createId('opt'),
          label: String(opt.label || String.fromCharCode(65 + idx)).toUpperCase(),
          displayLabel: opt.displayLabel || '',
          text: opt.text || opt.en || opt.content || '',
          textUrdu: opt.textUrdu || opt.ur || '',
          richContent: opt.richContent || null,
          isCorrect: Boolean(opt.isCorrect || opt.correct),
        }))
      : [],
    // For questions requiring printed lines or writing space
    answerLines: Number.isFinite(Number(overrides.answerLines)) ? Math.max(0, Number(overrides.answerLines)) : 0,
    columnSpan: Number.isFinite(Number(overrides.columnSpan)) ? Number(overrides.columnSpan) : 1,
    // Extra metadata (chapter, SLO, difficulty, questionBankId)
    questionBankId: overrides.questionBankId || null,
    metadata: { ...(overrides.metadata || {}) },
  }
}

export function createPaperSection(overrides = {}) {
  const type = overrides.type || 'short'
  const defaultLayout = type === 'mcq'
    ? { layoutMode: 'compact-grid', columns: 4, borderStyle: 'box', direction: 'auto' }
    : (type === 'short'
        ? { layoutMode: '2-column-balanced', columns: 2, borderStyle: 'none', direction: 'auto' }
        : { layoutMode: '1-column', columns: 1, borderStyle: 'none', direction: 'auto' })

  return {
    id: overrides.id || createId('sec'),
    type, // 'mcq' | 'short' | 'long' | 'comprehension' | 'table' | 'official_section' | 'custom'
    sectionNumber: overrides.sectionNumber ?? 1,
    title: overrides.title || overrides.heading || (type === 'mcq' ? 'Multiple Choice Questions' : (type === 'short' ? 'Short Questions' : 'Long Questions')),
    titleUrdu: overrides.titleUrdu || (type === 'mcq' ? 'حصہ معروضی' : (type === 'short' ? 'مختصر سوالات' : 'تفصیلی سوالات')),
    instructions: overrides.instructions || '',
    marksPerQuestion: Number.isFinite(Number(overrides.marksPerQuestion)) ? Number(overrides.marksPerQuestion) : (type === 'mcq' ? 1 : (type === 'short' ? 2 : 5)),
    totalMarks: Number.isFinite(Number(overrides.totalMarks)) ? Number(overrides.totalMarks) : null,
    layout: {
      ...defaultLayout,
      ...(overrides.layout || {}),
    },
    // Raw rich-text block if the section is a free-form document block
    richContent: overrides.richContent || null,
    questions: Array.isArray(overrides.questions)
      ? overrides.questions.map((q, idx) => createPaperQuestion({ ...q, qNumber: q.qNumber ?? idx + 1, type: q.type || type }))
      : [],
  }
}

export function createPaperDocument(overrides = {}) {
  const meta = overrides.metadata || overrides.config || {}
  const now = new Date().toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: overrides.id || createId('paper'),
    name: overrides.name || meta.title || 'Untitled Assessment Paper',
    metadata: {
      title: meta.title || 'ASSESSMENT PAPER',
      paperCode: meta.paperCode || 'AP-01',
      className: meta.className || meta.classLevel || 'Class 1',
      classLevel: meta.classLevel || '1',
      subject: meta.subject || meta.subjectName || 'General',
      subjectName: meta.subjectName || meta.subject || 'General',
      examType: meta.examType || 'First Term Examination 2026',
      session: meta.session || '2026-2027',
      language: meta.language || 'english', // 'english' | 'urdu' | 'dual'
      totalMarks: Number.isFinite(Number(meta.totalMarks)) ? Number(meta.totalMarks) : 50,
      durationMinutes: Number(meta.durationMinutes || meta.duration) || 60,
      timeAllowed: meta.timeAllowed || '1 Hour',
      examDate: meta.examDate || '',
      instructions: meta.instructions || 'Attempt all questions. Overwriting or cutting will not be awarded.',
      schoolName: meta.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
      schoolAddress: meta.schoolAddress || 'Sharif Chowk, Rayya Khas, Narowal',
      logoUrl: meta.logoUrl || null,
    },
    pageSetup: {
      pageSize: 'A4',
      orientation: 'portrait',
      margins: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm', ...(overrides.pageSetup?.margins || {}) },
      printMode: overrides.pageSetup?.printMode || 'a4', // 'a4' | 'half'
      pageBorder: overrides.pageSetup?.pageBorder || 'none', // 'none' | 'thin' | 'thick' | 'double'
      watermark: {
        enabled: Boolean(overrides.pageSetup?.watermark?.enabled),
        type: overrides.pageSetup?.watermark?.type || 'logo',
        opacity: Number(overrides.pageSetup?.watermark?.opacity ?? 0.08),
        scale: Number(overrides.pageSetup?.watermark?.scale ?? 1.0),
        text: overrides.pageSetup?.watermark?.text || 'AL SIDDIQUE',
      },
    },
    templateId: overrides.templateId || overrides.template || 'academic',
    printSettings: {
      printBubbleSheet: Boolean(overrides.printSettings?.printBubbleSheet),
      printAnswerKey: Boolean(overrides.printSettings?.printAnswerKey),
      showSectionLines: overrides.printSettings?.showSectionLines !== false,
      showUrduHeaders: overrides.printSettings?.showUrduHeaders !== false,
      showRollNumberHeader: overrides.printSettings?.showRollNumberHeader !== false,
      showStudentName: overrides.printSettings?.showStudentName !== false,
    },
    sections: Array.isArray(overrides.sections) && overrides.sections.length > 0
      ? overrides.sections.map((sec, idx) => createPaperSection({ ...sec, sectionNumber: sec.sectionNumber ?? idx + 1 }))
      : createDefaultSections(),
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    _legacySource: overrides._legacySource || null,
  }
}

export function createDefaultSections() {
  return [
    createPaperSection({
      id: 'sec_demo_mcq',
      type: 'mcq',
      sectionNumber: 1,
      title: 'Section A: Multiple Choice Questions',
      titleUrdu: 'حصہ اول: معروضی سوالات',
      marksPerQuestion: 1,
      totalMarks: 4,
      layout: {
        layoutMode: 'compact-grid',
        columns: 4,
        borderStyle: 'box',
        direction: 'ltr',
      },
      questions: [
        createPaperQuestion({
          id: 'q_demo_mcq_1',
          qNumber: 1,
          type: 'mcq',
          marks: 1,
          stemText: 'Chatbot is an example of:',
          options: [
            { id: 'opt_1_a', label: 'A', text: 'Virtual reality' },
            { id: 'opt_1_b', label: 'B', text: 'Augmented reality' },
            { id: 'opt_1_c', label: 'C', text: 'Robotics' },
            { id: 'opt_1_d', label: 'D', text: 'Artificial intelligence', isCorrect: true },
          ],
        }),
        createPaperQuestion({
          id: 'q_demo_mcq_2',
          qNumber: 2,
          type: 'mcq',
          marks: 1,
          stemText: 'Bluetooth is an important short range wireless communication system.',
          options: [
            { id: 'opt_2_a', label: 'A', text: 'High' },
            { id: 'opt_2_b', label: 'B', text: 'Low' },
            { id: 'opt_2_c', label: 'C', text: 'Mid' },
            { id: 'opt_2_d', label: 'D', text: 'Side' },
          ],
        }),
        createPaperQuestion({
          id: 'q_demo_mcq_3',
          qNumber: 3,
          type: 'mcq',
          marks: 1,
          stemText: 'GPS is a subcategory of satellite communication.',
          options: [
            { id: 'opt_3_a', label: 'A', text: 'Bluetooth' },
            { id: 'opt_3_b', label: 'B', text: 'GPS' },
            { id: 'opt_3_c', label: 'C', text: 'WiFi' },
            { id: 'opt_3_d', label: 'D', text: 'Router' },
          ],
        }),
        createPaperQuestion({
          id: 'q_demo_mcq_4',
          qNumber: 4,
          type: 'mcq',
          marks: 1,
          stemText: 'The intersection of rows and columns in a worksheet is called a cell.',
          options: [
            { id: 'opt_4_a', label: 'A', text: 'Cell' },
            { id: 'opt_4_b', label: 'B', text: 'Spreadsheet' },
            { id: 'opt_4_c', label: 'C', text: 'Table' },
            { id: 'opt_4_d', label: 'D', text: 'None of these' },
          ],
        }),
      ],
    }),
    createPaperSection({
      id: 'sec_demo_short',
      type: 'short',
      sectionNumber: 2,
      title: 'Section B: Short Questions (Answer any 8)',
      titleUrdu: 'حصہ دوم: مختصر سوالات',
      marksPerQuestion: 2,
      totalMarks: 20,
      layout: {
        layoutMode: '2-column-balanced',
        columns: 2,
        borderStyle: 'none',
        direction: 'ltr',
      },
      questions: [
        createPaperQuestion({ id: 'q_demo_s1', qNumber: 1, type: 'short', marks: 2, stemText: 'Define Artificial Intelligence and give an example.' }),
        createPaperQuestion({ id: 'q_demo_s2', qNumber: 2, type: 'short', marks: 2, stemText: 'What is the primary difference between AI and conventional computing?' }),
        createPaperQuestion({ id: 'q_demo_s3', qNumber: 3, type: 'short', marks: 2, stemText: 'Name any two common applications of AI in healthcare.' }),
        createPaperQuestion({ id: 'q_demo_s4', qNumber: 4, type: 'short', marks: 2, stemText: 'Explain the basic concept of Machine Learning.' }),
        createPaperQuestion({ id: 'q_demo_s5', qNumber: 5, type: 'short', marks: 2, stemText: 'What is Computer Vision and where is it used?' }),
        createPaperQuestion({ id: 'q_demo_s6', qNumber: 6, type: 'short', marks: 2, stemText: 'Define Natural Language Processing (NLP).' }),
        createPaperQuestion({ id: 'q_demo_s7', qNumber: 7, type: 'short', marks: 2, stemText: 'What are the main components of an autonomous robot?' }),
        createPaperQuestion({ id: 'q_demo_s8', qNumber: 8, type: 'short', marks: 2, stemText: 'Explain the term neural network in simple words.' }),
        createPaperQuestion({ id: 'q_demo_s9', qNumber: 9, type: 'short', marks: 2, stemText: 'What is meant by an Expert System in computer science?' }),
        createPaperQuestion({ id: 'q_demo_s10', qNumber: 10, type: 'short', marks: 2, stemText: 'List two ethical concerns associated with artificial intelligence.' }),
      ],
    }),
    createPaperSection({
      id: 'sec_demo_urdu',
      type: 'mcq',
      sectionNumber: 3,
      title: 'Section C: اردو حصہ (درست جواب کا انتخاب کریں)',
      titleUrdu: 'حصہ سوم: معروضی سوالات (اردو)',
      marksPerQuestion: 1,
      totalMarks: 2,
      layout: {
        layoutMode: 'compact-grid',
        columns: 4,
        borderStyle: 'box',
        direction: 'rtl',
      },
      questions: [
        createPaperQuestion({
          id: 'q_demo_urdu_1',
          qNumber: 1,
          type: 'mcq',
          marks: 1,
          direction: 'rtl',
          stemUrdu: 'کمپیوٹر کی بنیادی اکائی کیا ہے؟',
          stemText: 'کمپیوٹر کی بنیادی اکائی کیا ہے؟',
          options: [
            { id: 'opt_u1_a', label: 'A', displayLabel: 'الف', textUrdu: 'بٹ', text: 'بٹ' },
            { id: 'opt_u1_b', label: 'B', displayLabel: 'ب', textUrdu: 'بائٹ', text: 'بائٹ' },
            { id: 'opt_u1_c', label: 'C', displayLabel: 'ج', textUrdu: 'کلو بائٹ', text: 'کلو بائٹ' },
            { id: 'opt_u1_d', label: 'D', displayLabel: 'د', textUrdu: 'میگا بائٹ', text: 'میگا بائٹ' },
          ],
        }),
      ],
    }),
    createPaperSection({
      id: 'sec_demo_long',
      type: 'long',
      sectionNumber: 4,
      title: 'Section D: Long Questions',
      titleUrdu: 'حصہ چہارم: تفصیلی سوالات',
      marksPerQuestion: 5,
      totalMarks: 5,
      layout: {
        layoutMode: '1-column',
        columns: 1,
        borderStyle: 'none',
        direction: 'ltr',
      },
      questions: [
        createPaperQuestion({
          id: 'q_demo_l1',
          qNumber: 1,
          type: 'long',
          marks: 5,
          stemText: 'Describe the evolution of artificial intelligence from early rule-based systems to modern deep neural networks.',
          answerLines: 3,
        }),
      ],
    }),
  ]
}

export function calculatePaperTotalMarks(paper) {
  if (!paper || !Array.isArray(paper.sections)) return 0
  return paper.sections.reduce((sum, sec) => {
    if (Number.isFinite(Number(sec.totalMarks)) && Number(sec.totalMarks) > 0) {
      return sum + Number(sec.totalMarks)
    }
    const marksPerQ = Number(sec.marksPerQuestion) || 1
    const qCount = Array.isArray(sec.questions) ? sec.questions.length : 0
    return sum + (qCount * marksPerQ)
  }, 0)
}

export function calculatePaperQuestionCount(paper) {
  if (!paper || !Array.isArray(paper.sections)) return 0
  return paper.sections.reduce((count, sec) => count + (Array.isArray(sec.questions) ? sec.questions.length : 0), 0)
}

export function clonePaperDocument(paper) {
  return JSON.parse(JSON.stringify(paper))
}
