const normalizeText = value => String(value ?? '').trim()
const normKey = value => normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
const safeIdPart = value => normKey(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown'

export function isQuestionEligibleForPaper(question) {
  return question?.isApproved !== false && question?.approvalStatus !== 'provisional'
}

export function normalizeBackendQuestionMedium(value) {
  const v = normKey(value)
  if (v === 'urdu' || v === 'ur' || v.includes('urdu')) return 'urdu'
  if (v === 'dual' || v === 'bilingual') return 'dual'
  return 'english'
}

function normalizeOption(option, index, medium) {
  if (option == null) return null
  const raw = typeof option === 'string' ? { text: option } : option
  const label = normalizeText(raw.id || raw.label || raw.key || String.fromCharCode(65 + index)).toUpperCase()
  const text = normalizeText(raw.text ?? raw.value ?? raw.labelText ?? '')
  if (!text) return null
  return {
    label,
    text,
    textUrdu: medium === 'urdu' ? text : normalizeText(raw.textUrdu || raw.text_urdu || ''),
  }
}

function normalizeCorrectOption(value, options) {
  const raw = normalizeText(value).toUpperCase()
  if (!raw) return ''
  const exact = options.find(opt => opt.label === raw)
  if (exact) return exact.label
  const byText = options.find(opt => normKey(opt.text) === normKey(value))
  return byText?.label || raw
}

function localPriority(value) {
  const v = normKey(value)
  if (v === 'past' || v === 'past paper' || v === 'past papers') return 'past'
  if (v === 'exercise') return 'exercise'
  return 'additional'
}

function subjectKey(name, classLevel) {
  return `${normKey(classLevel)}::${normKey(name)}`
}

function questionSignature({ classLevel, subject, chapter, text }) {
  return [classLevel, subject, chapter, text].map(normKey).join('::')
}

export function mapBackendQuestionRow(row, subjectId) {
  const medium = normalizeBackendQuestionMedium(row?.medium)
  const options = (Array.isArray(row?.options) ? row.options : []).map((opt, index) => normalizeOption(opt, index, medium)).filter(Boolean)
  const questionText = normalizeText(row?.question_text)
  const type = normalizeText(row?.question_type || row?.category || 'short').toLowerCase().replace(/\s+/g, '_')
  const correctOption = normalizeCorrectOption(row?.correct_option, options)
  const approved = row?.is_approved === true
  return {
    id: `db_q_${row?.id}`,
    subjectId,
    type,
    medium,
    text: medium === 'urdu' ? '' : questionText,
    textUrdu: medium === 'urdu' ? questionText : '',
    options,
    answer: type === 'mcq' ? correctOption : normalizeText(row?.answer),
    answerText: normalizeText(row?.answer),
    marks: Number(row?.marks || 1),
    chapter: normalizeText(row?.chapter_name || (row?.chapter_no ? `Chapter ${row.chapter_no}` : '')),
    topic: normalizeText(row?.topic_name),
    priority: localPriority(row?.priority),
    backendPriority: normalizeText(row?.priority),
    difficulty: normalizeText(row?.difficulty),
    board: normalizeText(row?.board),
    source: normalizeText(row?.source || 'ASSPS Question Bank DB'),
    tags: Array.isArray(row?.tags) ? row.tags : [],
    backendQuestionId: row?.id,
    syncOrigin: 'backend-question-bank',
    approvalStatus: approved ? 'approved' : 'provisional',
    isApproved: approved,
    createdAt: row?.created_at || new Date().toISOString(),
  }
}

export function mergeBackendQuestionBankRows(store, rows, { scope = 'unknown' } = {}) {
  const sourceRows = Array.isArray(rows) ? rows : []
  const subjects = Array.isArray(store?.subjects) ? [...store.subjects] : []
  const questions = Array.isArray(store?.questions) ? [...store.questions] : []
  const subjectByKey = new Map()
  const subjectById = new Map(subjects.map(subject => [subject.id, subject]))
  subjects.forEach(subject => subjectByKey.set(subjectKey(subject?.name, subject?.classLevel), subject.id))

  const dbIndex = new Map()
  const signatureIndex = new Set()
  questions.forEach((question, index) => {
    if (question?.backendQuestionId != null) dbIndex.set(String(question.backendQuestionId), index)
    const subject = subjectById.get(question?.subjectId) || {}
    signatureIndex.add(questionSignature({
      classLevel: subject?.classLevel,
      subject: subject?.name,
      chapter: question?.chapter,
      text: question?.text || question?.textUrdu,
    }))
  })

  let inserted = 0
  let updated = 0
  let skippedDuplicates = 0
  const now = new Date().toISOString()

  sourceRows.forEach(row => {
    if (!row?.id || !normalizeText(row?.subject) || !normalizeText(row?.class_level) || !normalizeText(row?.question_text)) return
    const key = subjectKey(row.subject, row.class_level)
    let subjectId = subjectByKey.get(key)
    if (!subjectId) {
      const baseId = `db_sub_${safeIdPart(row.class_level)}_${safeIdPart(row.subject)}`
      subjectId = baseId
      let counter = 2
      while (subjectById.has(subjectId)) subjectId = `${baseId}_${counter++}`
      const subject = {
        id: subjectId,
        name: normalizeText(row.subject),
        nameUrdu: '',
        publisher: normalizeText(row.board || 'Punjab Board'),
        classLevel: normalizeText(row.class_level),
        source: 'backend-question-bank',
        createdAt: now,
      }
      subjects.push(subject)
      subjectById.set(subjectId, subject)
      subjectByKey.set(key, subjectId)
    }

    const mapped = mapBackendQuestionRow(row, subjectId)
    const dbKey = String(row.id)
    const existingIndex = dbIndex.get(dbKey)
    if (existingIndex != null) {
      questions[existingIndex] = { ...questions[existingIndex], ...mapped, id: questions[existingIndex].id }
      updated += 1
      return
    }

    const signature = questionSignature({
      classLevel: row.class_level,
      subject: row.subject,
      chapter: mapped.chapter,
      text: row.question_text,
    })
    if (signatureIndex.has(signature)) {
      skippedDuplicates += 1
      return
    }
    signatureIndex.add(signature)
    dbIndex.set(dbKey, questions.length)
    questions.push(mapped)
    inserted += 1
  })

  const nextStore = {
    ...(store || {}),
    subjects,
    questions,
    seedInfo: {
      ...(store?.seedInfo || {}),
      backendQuestionBank: {
        scope,
        syncedAt: now,
        totalRead: sourceRows.length,
        inserted,
        updated,
        skippedDuplicates,
      },
    },
  }
  return {
    store: nextStore,
    stats: { totalRead: sourceRows.length, inserted, updated, skippedDuplicates },
    changed: inserted > 0 || updated > 0 || subjects.length !== (store?.subjects?.length || 0),
  }
}
