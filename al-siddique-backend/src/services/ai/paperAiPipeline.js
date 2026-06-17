const fs = require('fs')
const path = require('path')
const { createCanvas, loadImage } = require('@napi-rs/canvas')
const pdfParse = require('pdf-parse')
const {
  GeminiError,
  getAiEnvConfig,
  callWithFallback,
  parseJsonResponse,
  repairJsonResponse,
} = require('./geminiClient')

const TEXT_BATCH_CHARS = 14_000
const TEXT_BATCH_PAGES = 4
const TEXT_IMPORT_CHUNK_CHARS = 12_000
const TEXT_IMPORT_OVERLAP = 800
const VISION_BATCH_PAGES = 3
const MIN_PAGE_TEXT_CHARS = 35
const IMAGE_MAX_WIDTH = 1800
const IMAGE_QUALITY = 0.84
const ALLOW_AI_MOCK_FALLBACK = process.env.NODE_ENV !== 'production'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

function cleanText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function safeJsonParse(text) {
  if (!text) return null
  return parseJsonResponse(text)
}

function assertNotCancelled(job) {
  if (job?.status === 'cancelled') {
    throw new GeminiError('AI job cancelled.', { code: 'AI_JOB_CANCELLED', status: 409 })
  }
}

function uid(prefix = 'q') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function fingerprintQuestion(q) {
  const base = [
    q.type || '',
    q.question || q.text || '',
    q.answer || '',
    Array.isArray(q.options) ? q.options.map(o => `${o.label || ''}:${o.text || o.textUrdu || ''}`).join('|') : '',
  ].join('::')
  return base.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 180)
}

function dedupeQuestions(questions) {
  const seen = new Set()
  return questions.filter(q => {
    const key = fingerprintQuestion(q)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeQuestion(raw, defaults = {}) {
  return {
    id: raw.id || uid('q'),
    type: raw.type || defaults.type || 'short',
    question: raw.question || raw.text || '',
    text: raw.text || raw.question || '',
    textUrdu: raw.textUrdu || raw.ur || '',
    options: Array.isArray(raw.options) ? raw.options.map(o => ({
      label: o.label || '',
      text: o.text || '',
      textUrdu: o.textUrdu || '',
    })) : [],
    answer: raw.answer || '',
    difficulty: raw.difficulty || 'medium',
    marks: String(raw.marks || defaults.marks || ''),
    language: raw.language || defaults.language || 'mixed',
    chapter: raw.chapter || defaults.chapter || '',
    topic: raw.topic || defaults.topic || '',
    sourcePage: raw.sourcePage || defaults.sourcePage || '',
    confidence: Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : 0,
    priority: raw.priority || defaults.priority || 'exercise',
    leftColumn: Array.isArray(raw.leftColumn) ? raw.leftColumn : [],
    rightColumn: Array.isArray(raw.rightColumn) ? raw.rightColumn : [],
  }
}

function normalizeScannerSection(section = {}) {
  return {
    type: section.type || 'other',
    heading: section.heading || '',
    marks: String(section.marks || ''),
    questions: Array.isArray(section.questions)
      ? section.questions.map(q => normalizeQuestion(q, { type: section.type, marks: section.marks }))
      : [],
  }
}

function normalizeScannerResult(raw = {}) {
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(normalizeScannerSection)
    : []

  const legacy = {
    mcq: [],
    short: [],
    long: [],
  }

  sections.forEach(section => {
    const bucket = section.type === 'mcq' ? 'mcq' : section.type === 'long' ? 'long' : 'short'
    section.questions.forEach(q => {
      legacy[bucket].push({
        id: q.id,
        type: q.type,
        text: q.question,
        textUrdu: q.textUrdu,
        answer: q.answer,
        marks: Number(q.marks || (bucket === 'mcq' ? 1 : bucket === 'short' ? 2 : 5)),
        chapter: q.chapter,
        priority: q.priority,
        medium: q.language || 'mixed',
        options: q.options || [],
        leftColumn: q.leftColumn || [],
        rightColumn: q.rightColumn || [],
      })
    })
  })

  return {
    language: raw.language || 'mixed',
    paperTitle: raw.paperTitle || '',
    class: raw.class || '',
    subject: raw.subject || '',
    sections,
    rawText: raw.rawText || '',
    confidence: Math.max(0, Math.min(100, Number(raw.confidence || 0))),
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    ...legacy,
  }
}

function compressImageBuffer(buffer, mimeType = 'image/jpeg') {
  return Promise.resolve().then(async () => {
    const image = await loadImage(buffer)
    const width = image.width || IMAGE_MAX_WIDTH
    const scale = width > IMAGE_MAX_WIDTH ? IMAGE_MAX_WIDTH / width : 1
    const canvas = createCanvas(Math.max(1, Math.round(image.width * scale)), Math.max(1, Math.round(image.height * scale)))
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const encoded = canvas.encode(mimeType.includes('png') ? 'png' : 'jpeg', { quality: IMAGE_QUALITY })
    const out = await Promise.resolve(encoded)
    return Buffer.from(out)
  })
}

async function compressImageFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${filePath}`)
  }
  const buffer = await fs.promises.readFile(filePath)
  const out = await compressImageBuffer(buffer)
  return out.toString('base64')
}

async function renderPdfPageImage(page, mupdf, scale = 1.6) {
  const matrix = mupdf.Matrix.scale(scale, scale)
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true)
  const jpegResult = pixmap.asJPEG(78)
  const jpeg = await Promise.resolve(jpegResult)
  return Buffer.from(jpeg).toString('base64')
}

async function extractPageText(page) {
  try {
    const structured = page.toStructuredText()
    return cleanText(structured.asText())
  } catch (err) {
    return ''
  }
}

function buildHandwrittenPrompt({ classLevel, subject, language = 'mixed', paperTitle = '', chapterHint = '' }) {
  return [
    'You are a strict OCR and paper structure extraction engine for Pakistani schools.',
    'Read handwritten or printed exam paper images exactly as shown, ignoring any background watermarks.',
    `Class: ${classLevel || ''}`,
    `Subject: ${subject || ''}`,
    `Language preference: ${language}`,
    paperTitle ? `Paper title hint: ${paperTitle}` : '',
    chapterHint ? `Chapter hint: ${chapterHint}` : '',
    '',
    'Rules:',
    '- Do not invent missing text.',
    '- If text is unreadable, write [unclear].',
    '- Preserve Urdu exactly, including script order.',
    '- Preserve numbering, marks, MCQ options, headings, and separators.',
    '- Accept Punjab/BISE 9th Urdu past-paper layout: objective page with Roll No/Annual/Code/header/noise, 15 MCQs, and options spread right-to-left as (A), (B), (C), (D). Ignore watermarks such as FGSTUDY.COM.',
    '- Accept Urdu subjective layout with headings such as حصہ اوّل, حصہ دوم, معروضی, انشائیہ, اشعار کی تشریح, خلاصہ, مرکزی خیال, درخواست, کہانی, واحد جمع, جملے, and subparts like (i), (ii), (iii).',
    '- If marks appear in the left margin or beside a question, copy them into marks and do not treat them as question text.',
    '- Classify each question into one of these standard types:',
    '  - "mcq", "true_false", "fill" (fill in blanks), "columns" (match columns), "short", "long", "definition", "numerical", "diagram", "wahid_jama" (Urdu singular/plural), "mutradif" (synonyms), "mutzad" (antonyms), "alfaz_maani" (vocabulary meaning), "sentence_correction", "sentence_usage", "comprehension", "translation", "essay", "letter", "muhawara" (idioms), "grammar".',
    '- Keep page order.',
    `- Default all questions' "chapter" field to '${chapterHint || ''}' if no other chapter is explicitly specified in the text.`,
    '',
    'Return strict JSON only with this structure:',
    JSON.stringify({
      language: 'urdu|english|mixed',
      paperTitle: '',
      class: '',
      subject: '',
      sections: [
        {
          type: 'mcq|true_false|fill|columns|short|long|definition|numerical|diagram|wahid_jama|mutradif|mutzad|alfaz_maani|sentence_correction|sentence_usage|comprehension|translation|essay|letter|muhawara|grammar',
          heading: '',
          marks: '',
          questions: [
            {
              type: 'mcq|true_false|fill|columns|short|long|definition|numerical|diagram|wahid_jama|mutradif|mutzad|alfaz_maani|sentence_correction|sentence_usage|comprehension|translation|essay|letter|muhawara|grammar',
              question: '',
              textUrdu: '',
              options: [
                { label: 'A', text: '', textUrdu: '' },
              ],
              leftColumn: [],
              rightColumn: [],
              answer: '',
              marks: '',
              sourcePage: '',
              confidence: 0,
            },
          ],
        },
      ],
      rawText: '',
      confidence: 0,
      warnings: [],
    }),
  ].filter(Boolean).join('\n')
}

function buildQuestionExtractionPrompt({ subject, classLevel, medium, pageLabel = '', chapterHint = '' }) {
  const isBoardClass = ['9', '10', '11', '12'].includes(String(classLevel));
  const boardInstruction = isBoardClass 
    ? 'BOARD CLASS EXAM (9, 10, 11, 12): Strict Board Patterns Apply. Identify objective MCQs (must have 4 options), precise short questions (usually 2 marks), and detailed long questions/explanations (4-8 marks). Categorize them exactly into "mcq", "short", and "long".'
    : 'SCHOOL CLASS EXAM (1-8): Patterns are random and flexible. Use your best judgment to classify questions into "mcq", "short", and "long" based on the context.';

  return [
    'You are an elite, highly precise OCR and Data Extraction Engine for educational assessments in Pakistan.',
    `Subject: ${subject || ''}`,
    `Class: ${classLevel || ''}`,
    `Medium: ${medium || 'english'}`,
    pageLabel ? `Page label: ${pageLabel}` : '',
    chapterHint ? `Chapter hint: ${chapterHint}` : '',
    '',
    'CRITICAL EXTRACTION RULES (STRICT COMPLIANCE REQUIRED):',
    '1. STRICT EXTRACTION ONLY: Your absolute ONLY job is to extract questions exactly as they appear in the provided text/images. DO NOT generate, invent, or synthesize new questions. DO NOT search your knowledge base for questions.',
    '2. ACCURACY: Extract text exactly as written. Preserve numbering, formatting, Urdu Nastaliq script perfectly. Do not alter or translate unless requested.',
    `3. CLASSIFICATION: ${boardInstruction}`,
    '4. MCQ OPTIONS: For MCQs, extract all options accurately into the options array with their labels (A, B, C, D).',
    '5. ANSWERS: If answers are present in the text, extract them. If no answers are in the text, provide a highly accurate, concise answer key from your knowledge.',
    `6. LANGUAGE (${medium}): If the source is dual-medium (English + Urdu), map the English to 'text' and Urdu to 'textUrdu' cleanly.`,
    `7. TOPIC MAPPING: Attempt to identify the textbook topic (e.g., '1.1 Introduction') for the questions based on the text.`,
    '8. BOARD PAPER FORMAT ACCEPTED: 9th Urdu past-paper scans/text may include objective MCQ pages and subjective pages. Treat headings like حصہ اوّل, حصہ دوم, معروضی, انشائیہ, اشعار کی تشریح, خلاصہ, مرکزی خیال, درخواست, کہانی, واحد جمع, جملے as valid structure, not noise.',
    '9. OCR CLEANUP: Ignore repeated watermarks/header noise such as FGSTUDY.COM, Roll No, Code, Annual year, page numbers, and scanned crop marks. Preserve real question text and Urdu punctuation.',
    '10. MCQ RTL OPTIONS: Options may appear visually right-to-left as (A), (B), (C), (D), sometimes spread across the line. Extract them into labels A-D and keep the Urdu option text with the correct label.',
    '',
    'Return strict JSON only with this exact structure:',
    JSON.stringify({
      chapter: chapterHint || 'Chapter Name',
      topic: 'Topic Name (if found)',
      questions: [
        {
          type: 'mcq|true_false|fill|columns|short|long|definition|numerical|diagram|wahid_jama|mutradif|mutzad|alfaz_maani|sentence_correction|sentence_usage|comprehension|translation|essay|letter|muhawara|grammar|other',
          text: 'English question text',
          textUrdu: 'Urdu question text',
          options: [
            { label: 'A', text: 'Option A English', textUrdu: 'Option A Urdu' }
          ],
          leftColumn: [],
          rightColumn: [],
          answer: 'Extracted or concise generated answer',
          marks: 'marks (if provided)',
          language: 'urdu|english|mixed',
          sourcePage: pageLabel,
          priority: 'exercise',
          topic: 'Specific Topic (if found)',
          confidence: 95,
        },
      ],
      warnings: [],
    }),
  ].filter(Boolean).join('\n')
}

function buildBoardPaperExtractionPrompt({ subject, classLevel, medium, pageLabel = '', chapterHint = '' }) {
  return [
    'You are an elite AI capable of extracting highly structured, hierarchical Exam Board Papers.',
    `Subject: ${subject || ''}`,
    `Class: ${classLevel || ''}`,
    `Medium: ${medium || 'english'}`,
    '',
    'CRITICAL EXTRACTION RULES:',
    '1. The text provided is a fully structured Exam Paper (e.g., BISE Board Paper).',
    '2. You MUST preserve the exact sequence, sections, and hierarchy of the paper.',
    '3. Papers are typically divided into SECTIONS (e.g., "Objective Part / حصہ معروضی", "Subjective Part / حصہ انشائی").',
    '4. Inside sections, there are MAIN QUESTIONS (e.g., "Q2. Attempt any 5 short questions", "سوال نمبر 3: اشعار کی تشریح کریں").',
    '5. Inside main questions, there are SUB-PARTS (the actual questions or poetry verses).',
    '6. DO NOT flatten the structure. Keep the nesting intact.',
    '7. Preserve Urdu formatting perfectly.',
    '8. Accept 9th Urdu Punjab board past-paper layout: objective MCQs may show options in right-to-left visual order with labels (A), (B), (C), (D); subjective pages may have marks in the left margin and roman subparts (i), (ii), (iii).',
    '9. Ignore repeated watermarks/header noise such as FGSTUDY.COM, Roll No, Code, Annual year, page numbers, and scanned crop marks.',
    '',
    'Return strict JSON only with this exact structure:',
    JSON.stringify({
      paperTitle: 'Extracted Paper Title',
      structureMode: 'board_pattern',
      sections: [
        {
          heading: 'Section Name (e.g., Objective Part / حصہ معروضی)',
          instructions: 'Any top-level section instructions',
          marks: 'Total marks for section',
          mainQuestions: [
             {
               qNumber: '1',
               title: 'Main question title (e.g., Choose correct answers / اشعار کی تشریح کریں)',
               instructions: 'Attempt any 3 etc.',
               type: 'mcq|ashaar|short_group|long_group|paragraph|letter|essay|translation|other',
               marks: 'Marks for this main question',
               parts: [
                 {
                   label: '(i) or A',
                   text: 'English text for this specific part',
                   textUrdu: 'Urdu text / poetry verse / etc for this specific part',
                   options: [
                     { label: 'A', text: 'Option A En', textUrdu: 'Option A Ur' }
                   ],
                   answer: 'Extracted answer if any',
                   marks: 'Marks for this part'
                 }
               ]
             }
          ]
        }
      ],
      warnings: []
    })
  ].filter(Boolean).join('\n')
}

function buildPaperGenerationPrompt({ classLevel, subject, chapters = [], counts = {}, medium = 'english', questionType = 'paper' }) {
  return [
    'You are a professional, high-fidelity Pakistan national curriculum exam paper generator and past board paper synthesizer.',
    `Class: ${classLevel || ''}`,
    `Subject: ${subject || ''}`,
    `Chapters/Topics: ${chapters.length ? chapters.join(', ') : 'All relevant chapters'}`,
    `Language Medium: ${medium}`,
    `Generate exactly: MCQ ${counts.mcq || 0}, Short ${counts.short || 0}, Long ${counts.long || 0} questions.`,
    '',
    'Advanced Search & Curate Rules:',
    '- First, recall and search actual past board papers from BISE Punjab (Lahore, Rawalpindi, Gujranwala, Faisalabad, Multan, etc.) and Federal Board (FBISE) from 2015 to 2025 for this subject and chapters.',
    '- Prioritize generating questions that have actually appeared in those past papers. Tag these with priority: "past".',
    '- For standard textbook exercise questions, tag them with priority: "exercise".',
    '- For other relevant high-quality curriculum questions, tag them with priority: "additional".',
    '- Every question MUST be mapped to its specific textbook topic (e.g. "1.1 Introduction" or "2.3 Osmoregulation") and returned in the "topic" field.',
    '- Ensure that every single question has a correct, complete, non-placeholder answer in the "answer" field. For MCQs, this MUST be the correct option letter (e.g. "A"). For Short and Long questions, this MUST be the precise correct textbook answer or detailed key points (written in English, Urdu, or Dual depending on the medium). No comments, no "todo", no "refer to textbook", no placeholders.',
    '- Handle the Language Medium strictly:',
    `  - If english: Generate questions and answers in English. The "text" and "answer" fields must be in English. MCQ options must be in English.`,
    `  - If urdu: Generate questions and answers in Urdu. The "textUrdu" and "answer" fields must be in Urdu. MCQ options must be in Urdu.`,
    `  - If dual or mixed: Generate dual-medium questions. The "text" field must contain the English version, and the "textUrdu" field must contain the high-quality, accurate Urdu translation of the exact same question. Each MCQ option must have "text" in English and "textUrdu" in Urdu. The "answer" field for Short/Long questions must contain the dual English and Urdu answer key.`,
    '- Do not repeat questions.',
    '- Return strict JSON only.',
    '',
    JSON.stringify({
      mcq: [
        {
          text: 'English MCQ question',
          textUrdu: 'Urdu MCQ question translation',
          options: [
            { label: 'A', text: 'Option A in English', textUrdu: 'Option A in Urdu' },
            { label: 'B', text: 'Option B in English', textUrdu: 'Option B in Urdu' },
            { label: 'C', text: 'Option C in English', textUrdu: 'Option C in Urdu' },
            { label: 'D', text: 'Option D in English', textUrdu: 'Option D in Urdu' }
          ],
          answer: 'A',
          marks: 1,
          chapter: 'Chapter name',
          topic: 'Specific topic name',
          priority: 'past|exercise|additional',
          difficulty: 'medium',
        },
      ],
      short: [
        {
          text: 'English short question',
          textUrdu: 'Urdu short question translation',
          answer: 'Concise, complete correct textbook reference answer',
          marks: 2,
          chapter: 'Chapter name',
          topic: 'Specific topic name',
          priority: 'past|exercise|additional',
          difficulty: 'medium',
        },
      ],
      long: [
        {
          text: 'English descriptive long question',
          textUrdu: 'Urdu descriptive long question translation',
          answer: 'Detailed correct textbook reference answer / key points list',
          marks: 5,
          chapter: 'Chapter name',
          topic: 'Specific topic name',
          priority: 'past|exercise|additional',
          difficulty: 'medium',
        },
      ],
      questionType,
    }),
  ].join('\n')
}

async function generateJsonWithRepair({
  apiKey,
  model,
  purpose,
  contents,
  generationConfig,
  schemaHint,
  timeoutMs,
  onAttempt,
}) {
  const result = await callWithFallback({
    apiKey,
    model,
    purpose,
    contents,
    generationConfig,
    timeoutMs,
    onAttempt,
  })

  let parsed = safeJsonParse(result.text)
  if (!parsed) {
    parsed = await repairJsonResponse({
      apiKey,
      model: result.model,
      rawText: result.text,
      schemaHint,
      timeoutMs: Math.min(timeoutMs || 45000, 45000),
    }).catch(() => null)
  }

  if (!parsed) {
    throw new GeminiError('AI returned an invalid response.', {
      code: 'INVALID_JSON',
      status: 502,
      model: result.model,
      details: result.text?.slice(0, 500) || null,
    })
  }

  return { parsed, model: result.model, fallbackUsed: result.fallbackUsed, rawText: result.text }
}

async function processHandwrittenJob({ job, update, jobDir }) {
  assertNotCancelled(job)
  const { config = {}, files = [], preferredModel, retryPages = [] } = job.payload || {}
  const apiKey = getAiEnvConfig().apiKey
  if (!apiKey) {
    if (!ALLOW_AI_MOCK_FALLBACK) {
      throw new GeminiError('Gemini API key is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
    }
    console.warn('GEMINI_API_KEY is not configured. Running offline mock scanner pipeline.');
    update({ status: 'running', progress: 10, message: 'Simulating handwritten page analysis (Mock Mode)...' })
    await sleep(400);
    assertNotCancelled(job)
    update({ progress: 30, message: 'Optimizing page layout and contrast (Mock Mode)...' })
    await sleep(400);
    assertNotCancelled(job)
    update({ progress: 60, message: 'Extracting multilingual questions (Mock Mode)...' })
    await sleep(400);
    assertNotCancelled(job)
    update({ progress: 90, message: 'Finalizing exam paper model mapping (Mock Mode)...' })
    await sleep(300);
    assertNotCancelled(job)

    const mockResult = {
      language: config.language || 'mixed',
      paperTitle: config.paperTitle || 'Terminal Examination - 2026',
      class: config.classLevel || 'Class 10',
      subject: config.subject || 'Physics / Computer Science',
      sections: [
        {
          type: 'mcq',
          heading: 'SECTION A - MULTIPLE CHOICE QUESTIONS (MCQs)',
          marks: '10',
          questions: [
            {
              id: 'q_mock_1',
              type: 'mcq',
              question: 'Which of the following is an input device?',
              textUrdu: 'درج ذیل میں سے کون سا ان پٹ آلہ ہے؟',
              options: [
                { label: 'A', text: 'Keyboard', textUrdu: 'کی بورڈ' },
                { label: 'B', text: 'Monitor', textUrdu: 'مانیٹر' },
                { label: 'C', text: 'Printer', textUrdu: 'پرنٹر' },
                { label: 'D', text: 'Speaker', textUrdu: 'سپیکر' }
              ],
              answer: 'A',
              marks: '1',
              sourcePage: 'Page 1',
              confidence: 98
            },
            {
              id: 'q_mock_2',
              type: 'mcq',
              question: 'The SI unit of force is:',
              textUrdu: 'فورس کا ایس آئی یونٹ ہے:',
              options: [
                { label: 'A', text: 'Joule', textUrdu: 'جول' },
                { label: 'B', text: 'Newton', textUrdu: 'نیوٹن' },
                { label: 'C', text: 'Watt', textUrdu: 'واٹ' },
                { label: 'D', text: 'Pascal', textUrdu: 'پاسکل' }
              ],
              answer: 'B',
              marks: '1',
              sourcePage: 'Page 1',
              confidence: 99
            },
            {
              id: 'q_mock_3',
              type: 'mcq',
              question: 'Which gas is essential for our respiration?',
              textUrdu: 'ہمارے سانس لینے کے لیے کون سی گیس ضروری ہے؟',
              options: [
                { label: 'A', text: 'Carbon dioxide', textUrdu: 'کاربن ڈائی آکسائیڈ' },
                { label: 'B', text: 'Nitrogen', textUrdu: 'نائٹروجن' },
                { label: 'C', text: 'Oxygen', textUrdu: 'آکسیجن' },
                { label: 'D', text: 'Hydrogen', textUrdu: 'ہائیڈروجن' }
              ],
              answer: 'C',
              marks: '1',
              sourcePage: 'Page 1',
              confidence: 97
            }
          ]
        },
        {
          type: 'short',
          heading: 'SECTION B - SHORT QUESTIONS',
          marks: '10',
          questions: [
            {
              id: 'q_mock_4',
              type: 'short',
              question: 'Define Ohm\'s Law and write its mathematical formula.',
              textUrdu: 'اوہم کے قانون کی تعریف کریں اور اس کا ریاضیاتی فارمولا لکھیں۔',
              answer: 'Ohm\'s Law states that current is directly proportional to voltage (I = V/R) at constant temperature.',
              marks: '2',
              sourcePage: 'Page 2',
              confidence: 95
            },
            {
              id: 'q_mock_5',
              type: 'short',
              question: 'What is the difference between RAM and ROM?',
              textUrdu: 'ریم (RAM) اور روم (ROM) میں کیا فرق ہے؟',
              answer: 'RAM is volatile memory used for active processes; ROM is non-volatile memory used for bootstrap firmware.',
              marks: '2',
              sourcePage: 'Page 2',
              confidence: 96
            },
            {
              id: 'q_mock_6',
              type: 'short',
              question: 'Explain the greenhouse effect in brief.',
              textUrdu: 'گرین ہاؤس اثر کی مختصر وضاحت کریں۔',
              answer: 'The greenhouse effect is the trapping of sun\'s warmth in the atmosphere due to greenhouse gases.',
              marks: '2',
              sourcePage: 'Page 2',
              confidence: 94
            }
          ]
        },
        {
          type: 'long',
          heading: 'SECTION C - DESCRIPTIVE / LONG QUESTIONS',
          marks: '10',
          questions: [
            {
              id: 'q_mock_7',
              type: 'long',
              question: 'Describe Newton\'s Laws of Motion in detail with real-world examples.',
              textUrdu: 'نیوٹن کے قوانینِ حرکت کی تفصیل اور حقیقی دنیا کی مثالوں سے وضاحت کریں۔',
              answer: 'Includes Newton\'s First, Second, and Third laws of motion along with gravity, inertia, and action-reaction examples.',
              marks: '5',
              sourcePage: 'Page 3',
              confidence: 93
            },
            {
              id: 'q_mock_8',
              type: 'long',
              question: 'Explain the CPU architecture including ALU, MU, and CU functions.',
              textUrdu: 'سی پی یو (CPU) کے آرکیٹیکچر بشمول اے ایل یو، ایم یو اور سی یو کی وضاحت کریں۔',
              answer: 'Explains the Arithmetic Logic Unit, Memory Unit, and Control Unit relationship and fetching/decoding instructions cycle.',
              marks: '5',
              sourcePage: 'Page 3',
              confidence: 95
            }
          ]
        }
      ],
      rawText: 'This is the scanned text of the test paper including Nastaliq options. Physics/Computer Science Class 10 Exam.',
      confidence: 98,
      warnings: ['Running in Offline Mock Fallback mode because GEMINI_API_KEY is not configured.'],
      mcq: [
        {
          id: 'q_mock_1',
          type: 'mcq',
          text: 'Which of the following is an input device?',
          textUrdu: 'درج ذیل میں سے کون سا ان پٹ آلہ ہے؟',
          options: [
            { label: 'A', text: 'Keyboard', textUrdu: 'کی بورڈ' },
            { label: 'B', text: 'Monitor', textUrdu: 'مانیٹر' },
            { label: 'C', text: 'Printer', textUrdu: 'پرنٹر' },
            { label: 'D', text: 'Speaker', textUrdu: 'سپیکر' }
          ],
          answer: 'A',
          marks: 1,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        },
        {
          id: 'q_mock_2',
          type: 'mcq',
          text: 'The SI unit of force is:',
          textUrdu: 'فورس کا ایس آئی یونٹ ہے:',
          options: [
            { label: 'A', text: 'Joule', textUrdu: 'جول' },
            { label: 'B', text: 'Newton', textUrdu: 'نیوٹن' },
            { label: 'C', text: 'Watt', textUrdu: 'واٹ' },
            { label: 'D', text: 'Pascal', textUrdu: 'پاسکل' }
          ],
          answer: 'B',
          marks: 1,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        },
        {
          id: 'q_mock_3',
          type: 'mcq',
          text: 'Which gas is essential for our respiration?',
          textUrdu: 'ہمارے سانس لینے کے لیے کون سی گیس ضروری ہے؟',
          options: [
            { label: 'A', text: 'Carbon dioxide', textUrdu: 'کاربن ڈائی آکسائیڈ' },
            { label: 'B', text: 'Nitrogen', textUrdu: 'نائٹروجن' },
            { label: 'C', text: 'Oxygen', textUrdu: 'آکسیجن' },
            { label: 'D', text: 'Hydrogen', textUrdu: 'ہائیڈروجن' }
          ],
          answer: 'C',
          marks: 1,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        }
      ],
      short: [
        {
          id: 'q_mock_4',
          type: 'short',
          text: 'Define Ohm\'s Law and write its mathematical formula.',
          textUrdu: 'اوہم کے قانون کی تعریف کریں اور اس کا ریاضیاتی فارمولا لکھیں۔',
          answer: 'Ohm\'s Law states that current is directly proportional to voltage (I = V/R) at constant temperature.',
          marks: 2,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        },
        {
          id: 'q_mock_5',
          type: 'short',
          text: 'What is the difference between RAM and ROM?',
          textUrdu: 'ریم (RAM) اور روم (ROM) میں کیا فرق ہے؟',
          answer: 'RAM is volatile memory used for active processes; ROM is non-volatile memory used for bootstrap firmware.',
          marks: 2,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        },
        {
          id: 'q_mock_6',
          type: 'short',
          text: 'Explain the greenhouse effect in brief.',
          textUrdu: 'گرین ہاؤس اثر کی مختصر وضاحت کریں۔',
          answer: 'The greenhouse effect is the trapping of sun\'s warmth in the atmosphere due to greenhouse gases.',
          marks: 2,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        }
      ],
      long: [
        {
          id: 'q_mock_7',
          type: 'long',
          text: 'Describe Newton\'s Laws of Motion in detail with real-world examples.',
          textUrdu: 'نیوٹن کے قوانینِ حرکت کی تفصیل اور حقیقی دنیا کی مثالوں سے وضاحت کریں۔',
          answer: 'Includes Newton\'s First, Second, and Third laws of motion along with gravity, inertia, and action-reaction examples.',
          marks: 5,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        },
        {
          id: 'q_mock_8',
          type: 'long',
          text: 'Explain the CPU architecture including ALU, MU, and CU functions.',
          textUrdu: 'سی پی یو (CPU) کے آرکیٹیکچر بشمول اے ایل یو، ایم یو اور سی یو کی وضاحت کریں۔',
          answer: 'Explains the Arithmetic Logic Unit, Memory Unit, and Control Unit relationship and fetching/decoding instructions cycle.',
          marks: 5,
          chapter: '',
          priority: 'exercise',
          medium: 'mixed'
        }
      ],
      failedPages: [],
    };

    return {
      status: 'completed',
      progress: 100,
      message: 'Handwritten paper scanned successfully (Mock Fallback).',
      result: mockResult,
    };
  }

  update({ status: 'running', progress: 5, message: 'Uploaded. Preparing handwritten pages...' })

  const compressedPages = []
  const retrySet = new Set(Array.isArray(retryPages) ? retryPages.map(page => Number(page)).filter(Number.isFinite) : [])
  const selectedFiles = files
    .map((file, index) => ({ file, pageNumber: index + 1 }))
    .filter(item => !retrySet.size || retrySet.has(item.pageNumber))

  if (!selectedFiles.length) {
    throw new GeminiError('No matching pages were available to retry.', { code: 'NO_RETRY_PAGES', status: 400 })
  }

  update({
    progress: 8,
    message: retrySet.size
      ? `Retrying failed pages: ${Array.from(retrySet).sort((a, b) => a - b).join(', ')}...`
      : 'Preparing handwritten pages...',
  })

  for (let i = 0; i < selectedFiles.length; i += 1) {
    assertNotCancelled(job)
    const { file, pageNumber } = selectedFiles[i]
    if (!file || !fs.existsSync(file)) {
      throw new GeminiError(`Uploaded page file missing: ${file}`, { code: 'FILE_NOT_FOUND', status: 400 })
    }
    update({
      progress: Math.min(15 + Math.round((i / Math.max(selectedFiles.length, 1)) * 20), 35),
      message: `Optimizing page ${pageNumber}/${files.length}...`,
    })
    const base64 = await compressImageFile(file)
    compressedPages.push({ pageNumber, image: base64, file })
  }

  update({ progress: 40, message: 'Scanning pages with Gemini Vision...' })
  const prompt = buildHandwrittenPrompt(config)
  const schemaHint = 'Handwritten paper structure JSON with sections and questions arrays.'
  const batchSize = 3
  const allSections = []
  const warnings = []
  const failedPages = []
  let rawText = ''

  for (let i = 0; i < compressedPages.length; i += batchSize) {
    assertNotCancelled(job)
    const batch = compressedPages.slice(i, i + batchSize)
    update({
      progress: Math.min(40 + Math.round((i / Math.max(compressedPages.length, 1)) * 45), 88),
      message: `OCR batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(compressedPages.length / batchSize)}...`,
    })
    try {
      const contents = [
        { role: 'user', parts: [
          { text: prompt },
          ...batch.map(page => ({ inlineData: { mimeType: 'image/jpeg', data: page.image } })),
        ]},
      ]

      const { parsed, model, rawText: responseRaw } = await generateJsonWithRepair({
        apiKey,
        model: preferredModel,
        purpose: 'vision',
        contents,
        generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
        schemaHint,
        timeoutMs: 120000,
        onAttempt: ({ model: attemptModel, attempt }) => update({
          progress: Math.min(40 + attempt * 2, 50),
          message: `OCR using ${attemptModel} (attempt ${attempt})...`,
        }),
      })

      const normalized = normalizeScannerResult(parsed)
      allSections.push(...normalized.sections)
      warnings.push(...(normalized.warnings || []))
      rawText += `\n\n${normalized.rawText || responseRaw || ''}`
      update({
        progress: Math.min(55 + Math.round((i / Math.max(compressedPages.length, 1)) * 30), 92),
        message: `OCR batch completed with ${model}.`,
      })
    } catch (err) {
      failedPages.push(...batch.map(page => page.pageNumber))
      warnings.push(`Page batch ${batch.map(page => page.pageNumber).join(', ')} failed: ${err.message}`)
    }
  }

  const finalResult = {
    ...normalizeScannerResult({
    language: 'mixed',
    paperTitle: config.paperTitle || '',
    class: config.classLevel || '',
    subject: config.subject || '',
    sections: allSections,
    rawText: cleanText(rawText),
    confidence: 82,
    warnings,
    }),
    failedPages: [...new Set(failedPages)],
  }

  return {
    status: 'completed',
    progress: 100,
    message: 'Handwritten paper scanned successfully.',
    result: finalResult,
  }
}

async function extractPdfPages(buffer, jobDir) {
  const mupdf = await import('mupdf')
  const doc = mupdf.Document.openDocument(buffer, 'application/pdf')
  const numPages = doc.countPages()
  const pages = []

  for (let i = 0; i < numPages; i += 1) {
    const pageNumber = i + 1
    const page = doc.loadPage(i)
    const text = await extractPageText(page)
    if (text.length >= MIN_PAGE_TEXT_CHARS) {
      pages.push({ pageNumber, kind: 'text', text })
    } else {
      const image = await renderPdfPageImage(page, mupdf)
      const imagePath = path.join(jobDir, `page-${String(pageNumber).padStart(4, '0')}.jpg`)
      await fs.promises.writeFile(imagePath, Buffer.from(image, 'base64'))
      pages.push({ pageNumber, kind: 'vision', imagePath })
    }
  }

  return pages
}

function splitTextBatches(pageManifests) {
  const batches = []
  let current = { kind: 'text', pages: [], text: '', chars: 0 }
  pageManifests.forEach(page => {
    const pageText = `--- PAGE ${page.pageNumber} ---\n${cleanText(page.text)}`
    if (current.pages.length && (current.chars + pageText.length > TEXT_BATCH_CHARS || current.pages.length >= TEXT_BATCH_PAGES)) {
      batches.push(current)
      current = { kind: 'text', pages: [], text: '', chars: 0 }
    }
    current.pages.push(page)
    current.text += `${pageText}\n\n`
    current.chars += pageText.length
  })
  if (current.pages.length) batches.push(current)
  return batches
}

function splitVisionBatches(pageManifests) {
  const batches = []
  for (let i = 0; i < pageManifests.length; i += VISION_BATCH_PAGES) {
    batches.push({
      kind: 'vision',
      pages: pageManifests.slice(i, i + VISION_BATCH_PAGES),
    })
  }
  return batches
}

async function processTextBatch({ apiKey, preferredModel, batch, config, update, schemaHint }) {
  const prompt = buildQuestionExtractionPrompt({
    subject: config.subject,
    classLevel: config.classLevel,
    medium: config.medium,
    pageLabel: batch.pages.length === 1 ? `Page ${batch.pages[0].pageNumber}` : `Pages ${batch.pages[0].pageNumber}-${batch.pages[batch.pages.length - 1].pageNumber}`,
    chapterHint: config.chapterHint || '',
  })

  const contents = [{
    role: 'user',
    parts: [{ text: `${prompt}\n\n===CONTENT===\n${batch.text}\n===END===` }],
  }]

  const { parsed, model } = await generateJsonWithRepair({
    apiKey,
    model: preferredModel,
    purpose: 'text',
    contents,
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
    schemaHint,
    timeoutMs: 120000,
    onAttempt: ({ model: attemptModel, attempt }) => update({
      progress: Math.min(20 + attempt * 2, 35),
      message: `Text extraction using ${attemptModel} (attempt ${attempt})...`,
    }),
  })

  const questions = Array.isArray(parsed.questions) ? parsed.questions.map(q => normalizeQuestion(q, {
    chapter: parsed.chapter || '',
    topic: parsed.topic || '',
    language: config.medium || 'mixed',
  })) : []

  return {
    model,
    questions: dedupeQuestions(questions),
    chapter: parsed.chapter || '',
    topic: parsed.topic || '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  }
}

async function processVisionBatch({ apiKey, preferredModel, batch, config, update, schemaHint }) {
  const prompt = buildQuestionExtractionPrompt({
    subject: config.subject,
    classLevel: config.classLevel,
    medium: config.medium,
    pageLabel: batch.pages.length === 1 ? `Page ${batch.pages[0].pageNumber}` : `Pages ${batch.pages[0].pageNumber}-${batch.pages[batch.pages.length - 1].pageNumber}`,
    chapterHint: config.chapterHint || '',
  })

  const contents = [{
    role: 'user',
    parts: [
      { text: prompt },
      ...batch.pages.map(page => {
        if (!page.imagePath || !fs.existsSync(page.imagePath)) {
          throw new GeminiError(`OCR image page missing: ${page.imagePath}`, { code: 'FILE_NOT_FOUND', status: 400 })
        }
        const imageData = fs.readFileSync(page.imagePath)
        if (!imageData || !imageData.length) {
          throw new GeminiError(`OCR image page empty: ${page.imagePath}`, { code: 'FILE_EMPTY', status: 400 })
        }
        return { inlineData: { mimeType: 'image/jpeg', data: imageData.toString('base64') } }
      }),
    ],
  }]

  const { parsed, model } = await generateJsonWithRepair({
    apiKey,
    model: preferredModel,
    purpose: 'vision',
    contents,
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
    schemaHint,
    timeoutMs: 120000,
    onAttempt: ({ model: attemptModel, attempt }) => update({
      progress: Math.min(50 + attempt * 2, 70),
      message: `Vision OCR using ${attemptModel} (attempt ${attempt})...`,
    }),
  })

  const questions = Array.isArray(parsed.questions) ? parsed.questions.map(q => normalizeQuestion(q, {
    chapter: parsed.chapter || '',
    topic: parsed.topic || '',
    language: config.medium || 'mixed',
  })) : []

  return {
    model,
    questions: dedupeQuestions(questions),
    chapter: parsed.chapter || '',
    topic: parsed.topic || '',
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
  }
}

async function processPdfImportJob({ job, update, jobDir }) {
  assertNotCancelled(job)
  const apiKey = getAiEnvConfig().apiKey
  const { config = {}, filePath, preferredModel, retryPages = [] } = job.payload || {}
  if (!apiKey) {
    if (!ALLOW_AI_MOCK_FALLBACK) {
      throw new GeminiError('Gemini API key is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
    }
    console.warn('GEMINI_API_KEY is not configured. Running offline mock PDF import pipeline.');
    update({ progress: 10, message: 'Parsing PDF pages (Mock Mode)...' })
    await sleep(300);
    assertNotCancelled(job)
    update({ progress: 50, message: 'Extracting questions from PDF layout (Mock Mode)...' })
    await sleep(300);
    assertNotCancelled(job)
    update({ progress: 90, message: 'Deduplicating questions (Mock Mode)...' })
    await sleep(200);
    assertNotCancelled(job)

    const questions = [];
    for (let i = 1; i <= 8; i++) {
      questions.push({
        id: `q_pdf_${i}`,
        type: i <= 3 ? 'mcq' : i <= 6 ? 'short' : 'long',
        question: `Mock PDF Extracted Question ${i} for ${config.subject || 'General'}`,
        text: `Mock PDF Extracted Question ${i} for ${config.subject || 'General'}`,
        textUrdu: `پی ڈی ایف سے حاصل کردہ سوال نمبر ${i}`,
        options: i <= 3 ? [
          { label: 'A', text: 'Option A', textUrdu: 'الف' },
          { label: 'B', text: 'Option B', textUrdu: 'ب' },
          { label: 'C', text: 'Option C', textUrdu: 'ج' },
          { label: 'D', text: 'Option D', textUrdu: 'د' }
        ] : [],
        answer: 'A',
        marks: i <= 3 ? '1' : i <= 6 ? '2' : '5',
        confidence: 96,
        chapter: 'Chapter 1'
      });
    }

    const result = {
      chapter: 'Chapter 1',
      topic: 'Introduction',
      questions,
      warnings: ['Running in Offline Mock Fallback mode.'],
      failedPages: [],
      stats: {
        total: questions.length,
        byType: { mcq: 3, short: 3, long: 2 },
        chapters: ['Chapter 1'],
        topics: ['Introduction']
      }
    };

    await fs.promises.writeFile(path.join(jobDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');

    return {
      status: 'completed',
      progress: 100,
      message: 'PDF question bank import completed (Mock).',
      result,
    };
  }
  if (!filePath || !fs.existsSync(filePath)) {
    throw new GeminiError('PDF file not found for processing.', { code: 'FILE_NOT_FOUND', status: 400 })
  }

  const buffer = await fs.promises.readFile(filePath)
  update({ progress: 4, message: 'Uploaded. Parsing PDF...' })

  let pageManifests = []
  try {
    pageManifests = await extractPdfPages(buffer, jobDir)
  } catch (err) {
    console.warn('mupdf extraction failed, falling back to pdf-parse:', err.message)
    try {
      const parsed = await pdfParse(buffer)
      const fallbackText = cleanText(parsed.text || '')
      pageManifests = fallbackText ? [{ pageNumber: 1, kind: 'text', text: fallbackText }] : []
    } catch (fallbackErr) {
      console.error('pdf-parse fallback also failed:', fallbackErr.message)
      throw new GeminiError('Failed to parse PDF file. Ensure the file is a valid PDF and contains readable text.', { code: 'PDF_PARSE_FAILED', status: 400 })
    }
  }

  if (pageManifests.length === 0) {
     throw new GeminiError('No readable text or images found in the PDF. Please try a different file.', { code: 'PDF_EMPTY', status: 400 })
  }

  await fs.promises.writeFile(path.join(jobDir, 'pages.json'), JSON.stringify(pageManifests, null, 2), 'utf8')
  update({ progress: 20, message: `PDF parsed. ${pageManifests.length} pages ready.` })

  const retrySet = new Set(Array.isArray(retryPages) ? retryPages.map(page => Number(page)).filter(Number.isFinite) : [])
  if (retrySet.size) {
    pageManifests = pageManifests.filter(page => retrySet.has(page.pageNumber))
    if (!pageManifests.length) {
      throw new GeminiError('No matching pages were available to retry.', { code: 'NO_RETRY_PAGES', status: 400 })
    }
    update({
      progress: 24,
      message: `Retrying failed pages: ${Array.from(retrySet).sort((a, b) => a - b).join(', ')}...`,
    })
  }

  const failedPages = []
  const warnings = []
  const allQuestions = []
  const textPages = pageManifests.filter(p => p.kind === 'text')
  const visionPages = pageManifests.filter(p => p.kind === 'vision')

  const textBatches = splitTextBatches(textPages)
  const visionBatches = splitVisionBatches(visionPages)

  update({ progress: 28, message: 'Chunking content for question generation...' })

  for (let i = 0; i < textBatches.length; i += 1) {
    assertNotCancelled(job)
    const batch = textBatches[i]
    try {
      update({
        progress: Math.min(30 + Math.round((i / Math.max(textBatches.length, 1)) * 30), 55),
        message: `Generating questions from text batch ${i + 1}/${textBatches.length}...`,
      })
      const result = await processTextBatch({
        apiKey,
        preferredModel,
        batch,
        config,
        update,
        schemaHint: 'JSON object with chapter, topic, questions array.',
      })
      allQuestions.push(...result.questions)
      warnings.push(...result.warnings)
      await fs.promises.writeFile(path.join(jobDir, `text-batch-${i + 1}.json`), JSON.stringify(result, null, 2), 'utf8')
    } catch (err) {
      failedPages.push(...batch.pages.map(p => p.pageNumber))
      warnings.push(`Text batch ${i + 1} failed: ${err.message}`)
    }
  }

  for (let i = 0; i < visionBatches.length; i += 1) {
    assertNotCancelled(job)
    const batch = visionBatches[i]
    try {
      update({
        progress: Math.min(58 + Math.round((i / Math.max(visionBatches.length, 1)) * 28), 86),
        message: `OCR batch ${i + 1}/${visionBatches.length}...`,
      })
      const result = await processVisionBatch({
        apiKey,
        preferredModel,
        batch,
        config,
        update,
        schemaHint: 'JSON object with chapter, topic, questions array.',
      })
      allQuestions.push(...result.questions)
      warnings.push(...result.warnings)
      await fs.promises.writeFile(path.join(jobDir, `vision-batch-${i + 1}.json`), JSON.stringify(result, null, 2), 'utf8')
    } catch (err) {
      failedPages.push(...batch.pages.map(p => p.pageNumber))
      warnings.push(`Vision batch ${i + 1} failed: ${err.message}`)
    }
  }

  const questions = dedupeQuestions(allQuestions).map((q, idx) => ({
    ...normalizeQuestion(q, {
      language: config.medium || 'mixed',
    }),
    id: q.id || uid('q'),
    sourcePage: q.sourcePage || '',
    confidence: Number.isFinite(Number(q.confidence)) ? Number(q.confidence) : 70,
  }))

  const chapters = [...new Set(questions.map(q => q.chapter).filter(Boolean))]
  const topics = [...new Set(questions.map(q => q.topic).filter(Boolean))]
  const byType = questions.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1
    return acc
  }, {})

  const result = {
    chapter: chapters[0] || '',
    topic: topics[0] || '',
    questions,
    warnings,
    failedPages: [...new Set(failedPages)],
    stats: {
      total: questions.length,
      byType,
      chapters,
      topics,
    },
  }

  await fs.promises.writeFile(path.join(jobDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8')

  return {
    status: 'completed',
    progress: 100,
    message: failedPages.length ? 'Import completed with some retried pages pending.' : 'Question bank import completed.',
    result,
  }
}

function splitTextImportChunks(text) {
  const cleaned = cleanText(text)
  if (!cleaned) return []
  const chunks = []
  let start = 0
  while (start < cleaned.length) {
    chunks.push(cleaned.slice(start, start + TEXT_IMPORT_CHUNK_CHARS))
    start += TEXT_IMPORT_CHUNK_CHARS - TEXT_IMPORT_OVERLAP
  }
  return chunks
}

async function processTextImportJob({ job, update, jobDir }) {
  assertNotCancelled(job)
  const apiKey = getAiEnvConfig().apiKey
  const payload = job.data || job.payload || {}
  const text = payload.text || ''
  const config = payload.options || payload.config || {}
  const preferredModel = payload.preferredModel || config.preferredModel
  if (!apiKey) {
    if (!ALLOW_AI_MOCK_FALLBACK) {
      throw new GeminiError('Gemini API key is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
    }
    console.warn('GEMINI_API_KEY is not configured. Running offline mock Text import pipeline.');
    update({ progress: 10, message: 'Parsing pasted text chunks (Mock Mode)...' })
    await sleep(300);
    assertNotCancelled(job)
    update({ progress: 60, message: 'Analyzing grammar and sentence structure (Mock Mode)...' })
    await sleep(300);
    assertNotCancelled(job)
    update({ progress: 90, message: 'Formatting parsed questions (Mock Mode)...' })
    await sleep(200);
    assertNotCancelled(job)

    const questions = [];
    for (let i = 1; i <= 6; i++) {
      questions.push({
        id: `q_text_${i}`,
        type: i <= 2 ? 'mcq' : i <= 4 ? 'short' : 'long',
        question: `Mock Text Extracted Question ${i} for ${config.subject || 'General'}`,
        text: `Mock Text Extracted Question ${i} for ${config.subject || 'General'}`,
        textUrdu: `تحریر سے حاصل کردہ سوال نمبر ${i}`,
        options: i <= 2 ? [
          { label: 'A', text: 'Option A', textUrdu: 'الف' },
          { label: 'B', text: 'Option B', textUrdu: 'ب' },
          { label: 'C', text: 'Option C', textUrdu: 'ج' },
          { label: 'D', text: 'Option D', textUrdu: 'د' }
        ] : [],
        answer: 'A',
        marks: i <= 2 ? '1' : i <= 4 ? '2' : '5',
        confidence: 97,
        chapter: 'Chapter 1'
      });
    }

    const result = {
      chapter: 'Chapter 1',
      topic: 'Introduction',
      questions,
      warnings: ['Running in Offline Mock Fallback mode.'],
      failedPages: [],
      stats: {
        total: questions.length,
        byType: { mcq: 2, short: 2, long: 2 },
        chapters: ['Chapter 1'],
        topics: ['Introduction']
      }
    };

    await fs.promises.writeFile(path.join(jobDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8');

    return {
      status: 'completed',
      progress: 100,
      message: 'Text question bank import completed (Mock).',
      result,
    };
  }
  const chunks = splitTextImportChunks(text)
  if (!chunks.length) {
    throw new GeminiError('No text provided for import.', { code: 'EMPTY_TEXT', status: 400 })
  }

  const allQuestions = []
  const warnings = []

  for (let i = 0; i < chunks.length; i += 1) {
    assertNotCancelled(job)
    update({
      progress: Math.min(20 + Math.round((i / Math.max(chunks.length, 1)) * 60), 85),
      message: `Processing text chunk ${i + 1}/${chunks.length}...`,
    })

    try {
      const result = await processTextBatch({
        apiKey,
        preferredModel,
        batch: { pages: [{ pageNumber: i + 1 }], text: `--- TEXT CHUNK ${i + 1} ---\n${chunks[i]}` },
        config,
        update,
        schemaHint: 'JSON object with chapter, topic, questions array.',
      })
      allQuestions.push(...result.questions)
      warnings.push(...result.warnings)
      await fs.promises.writeFile(path.join(jobDir, `text-chunk-${i + 1}.json`), JSON.stringify(result, null, 2), 'utf8')
    } catch (err) {
      warnings.push(`Text chunk ${i + 1} failed: ${err.message}`)
    }
  }

  const questions = dedupeQuestions(allQuestions)
  const result = {
    chapter: '',
    topic: '',
    questions,
    warnings,
    failedPages: [],
    stats: {
      total: questions.length,
      byType: questions.reduce((acc, q) => {
        acc[q.type] = (acc[q.type] || 0) + 1
        return acc
      }, {}),
      chapters: [...new Set(questions.map(q => q.chapter).filter(Boolean))],
      topics: [...new Set(questions.map(q => q.topic).filter(Boolean))],
    },
  }

  await fs.promises.writeFile(path.join(jobDir, 'result.json'), JSON.stringify(result, null, 2), 'utf8')

  return {
    status: 'completed',
    progress: 100,
    message: 'Text import completed.',
    result,
  }
}

async function generatePaperWithAi({ classLevel, subject, chapters = [], counts = {}, medium = 'english', preferredModel }) {
  const apiKey = getAiEnvConfig().apiKey
  if (!apiKey) {
    if (!ALLOW_AI_MOCK_FALLBACK) {
      throw new GeminiError('Gemini API key is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
    }
    console.warn('GEMINI_API_KEY is not configured. Returning offline mock generated paper.');
    const mcq = [];
    const short = [];
    const long = [];
    
    const mcqCount = Number(counts.mcq ?? 10);
    const shortCount = Number(counts.short ?? 5);
    const longCount = Number(counts.long ?? 2);
    
    for (let i = 1; i <= mcqCount; i++) {
      mcq.push({
        id: `q_mcq_${i}`,
        type: 'mcq',
        question: `Mock Multiple Choice Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        text: `Mock Multiple Choice Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        textUrdu: `کثیر الانتخابی سوال نمبر ${i} برائے ${subject || 'جنرل'}`,
        options: [
          { label: 'A', text: `Option A for Q${i}`, textUrdu: `آپشن الف` },
          { label: 'B', text: `Option B for Q${i}`, textUrdu: `آپشن ب` },
          { label: 'C', text: `Option C for Q${i}`, textUrdu: `آپشن ج` },
          { label: 'D', text: `Option D for Q${i}`, textUrdu: `آپشن د` }
        ],
        answer: 'A',
        marks: '1',
        difficulty: 'medium',
        chapter: chapters[0] || 'Chapter 1',
        topic: 'Introduction & Basics',
        priority: i % 3 === 0 ? 'past' : i % 3 === 1 ? 'exercise' : 'additional'
      });
    }
    
    for (let i = 1; i <= shortCount; i++) {
      short.push({
        id: `q_short_${i}`,
        type: 'short',
        question: `Mock Short Answer Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        text: `Mock Short Answer Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        textUrdu: `مختصر جواب سوال نمبر ${i} برائے ${subject || 'جنرل'}`,
        answer: `This is a pre-configured high-quality mock answer for Short Question ${i}.`,
        marks: '2',
        difficulty: 'medium',
        chapter: chapters[0] || 'Chapter 1',
        topic: 'Important Concepts',
        priority: i % 3 === 0 ? 'past' : i % 3 === 1 ? 'exercise' : 'additional'
      });
    }
    
    for (let i = 1; i <= longCount; i++) {
      long.push({
        id: `q_long_${i}`,
        type: 'long',
        question: `Mock Descriptive Long Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        text: `Mock Descriptive Long Question ${i} for ${subject || 'General'} (Class ${classLevel || '10'})`,
        textUrdu: `تفصیلی جواب سوال نمبر ${i} برائے ${subject || 'جنرل'}`,
        answer: `This is a detailed step-by-step mock explanation for Long Question ${i}.`,
        marks: '5',
        difficulty: 'medium',
        chapter: chapters[0] || 'Chapter 1',
        topic: 'Core Theory & Mechanics',
        priority: i % 3 === 0 ? 'past' : i % 3 === 1 ? 'exercise' : 'additional'
      });
    }
    
    return {
      model: 'mock-gemini-pro',
      mcq,
      short,
      long
    };
  }

  const prompt = buildPaperGenerationPrompt({ classLevel, subject, chapters, counts, medium })
  const { parsed, model } = await generateJsonWithRepair({
    apiKey,
    model: preferredModel,
    purpose: 'text',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
    schemaHint: 'JSON object with mcq, short, long arrays.',
    timeoutMs: 120000,
  })

  const normalizeList = (list, type) => Array.isArray(list) ? list.map(item => normalizeQuestion({
    ...item,
    type,
    question: item.question || item.text || '',
  }, { type })) : []

  return {
    model,
    mcq: normalizeList(parsed.mcq || [], 'mcq'),
    short: normalizeList(parsed.short || [], 'short'),
    long: normalizeList(parsed.long || [], 'long'),
  }
}

async function testGeminiConnection({ preferredModel } = {}) {
  const apiKey = getAiEnvConfig().apiKey
  if (!apiKey) {
    if (!ALLOW_AI_MOCK_FALLBACK) {
      throw new GeminiError('Gemini API key is not configured.', { code: 'AI_NOT_CONFIGURED', status: 503 })
    }
    console.warn('GEMINI_API_KEY is not configured. Simulating successful connection.');
    return {
      model: 'mock-gemini-pro',
      ok: true,
      message: 'Gemini connection ok (Mock Offline Fallback Mode)'
    };
  }

  const prompt = 'Reply with a compact JSON object: {"ok":true,"message":"Gemini connection ok"}'
  const { parsed, model } = await generateJsonWithRepair({
    apiKey,
    model: preferredModel,
    purpose: 'text',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 128, responseMimeType: 'application/json' },
    schemaHint: 'JSON object with ok boolean and message string.',
    timeoutMs: 30000,
  })

  return {
    model,
    ok: Boolean(parsed.ok),
    message: parsed.message || 'Gemini connection ok',
  }
}

module.exports = {
  cleanText,
  dedupeQuestions,
  normalizeQuestion,
  normalizeScannerResult,
  buildHandwrittenPrompt,
  buildQuestionExtractionPrompt,
  buildPaperGenerationPrompt,
  processHandwrittenJob,
  processPdfImportJob,
  processTextImportJob,
  generatePaperWithAi,
  testGeminiConnection,
}
