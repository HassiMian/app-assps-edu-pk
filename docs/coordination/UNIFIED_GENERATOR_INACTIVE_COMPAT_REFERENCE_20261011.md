# Inactive Unified Generator adapters — preserved source contract

Recovered from prior Core-derived Paper source. These two functions had zero callers (the sole use of adaptUnifiedForPaperStudio was an unused memo) and were removed from the live component to prevent accidental unsupported teacher-editor route use. Active pathways remain parseSmartPasteV2 → manual review and adaptUnifiedForPTS → canonical teacher-facing Workspace. This is historical reference only. Exact extracted JS SHA256: d36d6780cd35154e053ce6139eebcbc2054c6a47285630b7d1ac4469a2c0d099.

```javascript
function parseSmartPaste(rawText, config) {
  const raw = String(rawText || '').replace(/\r/g, '').trim()
  if (!raw) return []
  const chunks = raw
    .split(/\n{2,}|(?=\n?\s*(?:Q\.?\s*\d+|سوال\s*\d+|\d+\s*[.)]))/i)
    .map(x => x.trim())
    .filter(Boolean)
  const items = chunks.length ? chunks : [raw]
  return items.map((text, index) => {
    const type = normalizeType(text)
    const confidence = /[?؟]|(?:^|\n)\s*(?:[A-D]\)|\(A\)|الف|ب|ج|د)/.test(text) ? 0.78 : 0.48
    return {
      id: safeId('review'),
      text,
      answer: '',
      type,
      category: guessCategory(text, config.subject),
      marks: type === 'MCQ' ? 1 : type === 'Long Question' || type === 'Essay' ? 5 : 2,
      chapter: '',
      topic: '',
      source: 'Manual Paste',
      confidence,
      reviewStatus: confidence >= 0.7 ? 'Ready' : 'Needs Review',
      duplicateHash: duplicateHash(text),
      language: isUrduText(text) ? 'urdu' : 'english',
      medium: config.medium,
      classLevel: config.classLevel,
      subject: config.subject,
      board: config.board,
      createdAt: new Date().toISOString(),
      order: index + 1,
    }
  })
}

function adaptUnifiedForPaperStudio(config, sections) {
  const selectedMCQ = []
  const selectedShort = []
  const selectedLong = []
  sections.forEach(section => {
    ;(section.questions || []).filter(q => String(q.text || '').trim()).forEach((q, index) => {
      const item = {
        id: q.id || safeId('legacy_q'),
        text: q.text || '',
        textUrdu: isUrduText(q.text) ? q.text : '',
        answer: q.answer || '',
        marks: Number(q.marks || section.marksEach || 1),
        options: Array.isArray(q.options) && q.options.length ? q.options : normalizeLegacyOptions(q.text),
        type: q.type || section.type,
        category: q.category || section.title,
        chapter: q.chapter || '',
        source: q.source || 'Unified Paper Generator',
        order: index + 1,
      }
      const bucket = legacyBucketForQuestion(item)
      if (bucket === 'mcq') selectedMCQ.push(item)
      else if (bucket === 'long') selectedLong.push(item)
      else selectedShort.push(item)
    })
  })
  const language = config.medium === 'Urdu' ? 'urdu' : config.medium === 'Dual Medium' ? 'mixed' : 'english'
  return {
    config: {
      title: `${config.subject || 'Paper'} ${config.paperType || ''}`.trim(),
      classLevel: config.classLevel,
      subject: config.subject,
      examType: config.paperType || config.intent || 'Paper',
      duration: parseDurationMinutes(config.time),
      totalMarks: config.totalMarks,
      language,
      instructions: sections?.[0]?.instructions || '',
      paperCode: '',
      examDate: new Date().toISOString().slice(0, 10),
    },
    selectedMCQ,
    selectedShort,
    selectedLong,
    selectedChapters: String(config.chapters || '').split(/[,\n]+/).map(x => x.trim()).filter(Boolean),
  }
}
```

## Dependent inactive helper functions

These helpers were used only by the archived adapter.

```javascript
function parseDurationMinutes(value) {
  const text = String(value || '').toLowerCase()
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)/)
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:minute|min|m)/)
  if (hourMatch || minuteMatch) {
    return Math.round(Number(hourMatch?.[1] || 0) * 60 + Number(minuteMatch?.[1] || 0))
  }
  const numeric = Number(text.replace(/[^\d.]/g, ''))
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 120
}

function normalizeLegacyOptions(text = '') {
  const lines = String(text || '').split('\n')
  const optionLines = lines.filter(line => /^\s*(?:[A-D][.)]|\([A-D]\))\s*/i.test(line))
  return optionLines.map((line, index) => {
    const clean = line.replace(/^\s*(?:[A-D][.)]|\([A-D]\))\s*/i, '').trim()
    return { key: String.fromCharCode(65 + index), label: String.fromCharCode(65 + index), text: clean }
  })
}

function legacyBucketForQuestion(question = {}) {
  const type = String(question.type || question.category || '').toLowerCase()
  if (type.includes('mcq') || type.includes('objective') || type.includes('correct answer')) return 'mcq'
  if (type.includes('long') || type.includes('essay') || type.includes('letter') || type.includes('application') || type.includes('explanation') || type.includes('comprehension')) return 'long'
  return 'short'
}
```
