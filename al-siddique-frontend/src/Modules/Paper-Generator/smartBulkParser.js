// smartBulkParser.js — Al Siddique Smart School OS
// Smart Ingestion Engine for Question Bank (Power Bank)
// Parses raw copy-pasted content from Word, PDFs, and textbooks (English & Urdu).

export function stripQuestionNumber(str) {
  if (!str) return ''
  return String(str)
    .replace(/^\s*(?:Q(?:uestion)?\s*\d+[\s:.-]*|سوال(?:\s+نمبر)?\s*[\d٠-٩]+[\s:.-]*|\(?[\d٠-٩ivxlcdm]+\)?[.:-]\s*)/i, '')
    .trim()
}

export function isUrduText(str) {
  if (!str) return false
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str)
}

export function parseRawColumns(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const leftColumn = []
  const rightColumn = []

  for (const line of lines) {
    // Skip separator lines like |---|---| or -------
    if (/^[|\-\s:]+$/.test(line)) continue

    let parts = []
    if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim()).filter(Boolean)
    } else if (line.includes('\t')) {
      parts = line.split('\t').map(p => p.trim()).filter(Boolean)
    } else if (line.includes('->')) {
      parts = line.split('->').map(p => p.trim()).filter(Boolean)
    } else if (line.includes(' - ')) {
      parts = line.split(' - ').map(p => p.trim()).filter(Boolean)
    }

    if (parts.length >= 2) {
      const colA = parts[0].trim()
      const colB = parts[1].trim()

      // Skip header lines like "Column A | Column B" or "کالم الف | کالم ب"
      if (/^(?:column\s*[ab]|کالم\s*(?:\(?\s*[الفب]\s*\)?|الف|ب))/i.test(colA) &&
          /^(?:column\s*[ab]|کالم\s*(?:\(?\s*[الفب]\s*\)?|الف|ب))/i.test(colB)) {
        continue
      }

      const cleanA = stripQuestionNumber(colA)
      const cleanB = stripQuestionNumber(colB)
      if (cleanA && cleanB) {
        leftColumn.push(cleanA)
        rightColumn.push(cleanB)
      }
    }
  }

  return { leftColumn, rightColumn }
}

export function parseRawMcqs(rawText) {
  const blocks = String(rawText || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const mcqs = []

  const processBlock = (block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (!lines.length) return

    let answer = ''
    const answerLineIndex = lines.findIndex(l => /^(?:Ans(?:wer)?|جواب)[\s:.-]/i.test(l))
    if (answerLineIndex !== -1) {
      answer = lines[answerLineIndex].replace(/^(?:Ans(?:wer)?|جواب)[\s:.-]*/i, '').trim()
      lines.splice(answerLineIndex, 1)
    }

    const fullText = lines.join(' ')
    const optRegex = /(?:\(([A-Da-d\u0627\u0628\u062C\u062F])\)|(?:\b|^)([A-Da-d\u0627\u0628\u062C\u062F])[\).])\s*([^(]+?)(?=(?:\([A-Da-d\u0627\u0628\u062C\u062F]\)|(?:\b|^)[A-Da-d\u0627\u0628\u062C\u062F][\).])|$)/g
    const matches = [...fullText.matchAll(optRegex)]

    if (matches.length >= 2) {
      const firstOptIndex = fullText.search(optRegex)
      const prompt = stripQuestionNumber(fullText.slice(0, firstOptIndex).trim())
      const options = matches.map(m => {
        const rawLabel = (m[1] || m[2]).toUpperCase()
        const labelMap = { 'ا': 'A', 'ب': 'B', 'ج': 'C', 'د': 'D' }
        const label = labelMap[rawLabel] || rawLabel
        return {
          label,
          text: m[3].trim(),
          textUrdu: isUrduText(m[3]) ? m[3].trim() : '',
        }
      })
      if (prompt && options.length >= 2) {
        mcqs.push({
          type: 'mcq',
          text: prompt,
          textUrdu: isUrduText(prompt) ? prompt : '',
          options,
          answer,
          marks: 1,
        })
      }
    }
  }

  // If blank-separated blocks didn't yield enough, try line-by-line or numbered items
  if (blocks.length > 1) {
    blocks.forEach(processBlock)
  } else {
    // Single chunk: split by numbered questions e.g. 1. ... 2. ...
    const numberedChunks = String(rawText || '').split(/(?=(?:^|\n)\s*(?:\d+[.)]|Q\d+[.:]|سوال(?:\s+نمبر)?\s*[\d٠-٩]+[.:]))/i).filter(Boolean)
    numberedChunks.forEach(processBlock)
  }

  return mcqs
}

export function parseRawTrueFalse(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items = []

  for (const line of lines) {
    if (!line) continue
    let answer = ''
    if (/\b(?:true|T|درست|صحیح)\b/i.test(line)) answer = 'True'
    else if (/\b(?:false|F|غلط)\b/i.test(line)) answer = 'False'

    const cleanText = stripQuestionNumber(
      line.replace(/(?:\[\s*[✓✗TFtf]?\s*\]|\(\s*[✓✗TFtf]?\s*\)|\((?:True|False|درست|غلط)\)|\b(?:True|False|درست|غلط)\b|_{3,})\s*$/i, '')
    ).trim()

    if (cleanText) {
      items.push({
        type: 'true_false',
        text: cleanText,
        textUrdu: isUrduText(cleanText) ? cleanText : '',
        answer,
        marks: 1,
      })
    }
  }

  return items
}

export function parseRawFillInBlanks(rawText) {
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items = []

  for (const line of lines) {
    if (!line) continue
    let answer = ''
    let text = line

    const ansMatch = text.match(/(?:Ans(?:wer)?|جواب)[\s:.-]*([^\n]+)$/i)
    if (ansMatch) {
      answer = ansMatch[1].trim()
      text = text.replace(/(?:Ans(?:wer)?|جواب)[\s:.-]*[^\n]+$/i, '').trim()
    }

    const clean = stripQuestionNumber(text)
    if (clean) {
      items.push({
        type: 'fill',
        text: clean,
        textUrdu: isUrduText(clean) ? clean : '',
        answer,
        marks: 1,
      })
    }
  }

  return items
}

export function parseRawNumberedQuestions(rawText, defaultType = 'short', defaultMarks = 2) {
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const items = []
  let current = null

  for (const line of lines) {
    const isNumbered = /^(?:Q(?:uestion)?\s*\d+|سوال(?:\s+نمبر)?\s*[\d٠-٩]+|\(?[\d٠-٩ivxlcdm]+\)?[.:-])/i.test(line)
    if (isNumbered || !current) {
      if (current) items.push(current)
      const clean = stripQuestionNumber(line)
      current = {
        type: defaultType,
        text: clean,
        textUrdu: isUrduText(clean) ? clean : '',
        marks: defaultMarks,
      }
    } else {
      current.text += `\n${line}`
      if (isUrduText(line)) current.textUrdu += `\n${line}`
    }
  }
  if (current) items.push(current)

  return items
}

export function smartAutoParse(rawText, selectedType = 'auto', defaultMarks = null) {
  const text = String(rawText || '').trim()
  if (!text) return []

  // If user explicitly chose a type:
  if (selectedType === 'columns') {
    const cols = parseRawColumns(text)
    if (cols.leftColumn.length) {
      return [{
        type: 'columns',
        text: isUrduText(text) ? 'کالم (الف) کو کالم (ب) سے ملائیں۔' : 'Match Column A with Column B.',
        textUrdu: isUrduText(text) ? 'کالم (الف) کو کالم (ب) سے ملائیں۔' : '',
        leftColumn: cols.leftColumn,
        rightColumn: cols.rightColumn,
        marks: defaultMarks || Math.max(3, cols.leftColumn.length),
      }]
    }
    return []
  }

  if (selectedType === 'mcq') {
    return parseRawMcqs(text)
  }

  if (selectedType === 'true_false') {
    return parseRawTrueFalse(text)
  }

  if (selectedType === 'fill') {
    return parseRawFillInBlanks(text)
  }

  if (selectedType === 'short' || selectedType === 'long') {
    return parseRawNumberedQuestions(text, selectedType, defaultMarks || (selectedType === 'long' ? 5 : 2))
  }

  // AUTO-DETECT MODE:
  // 1. Check for Column A | Column B or کالم الف | کالم ب
  if (/(?:column\s*[ab]|کالم\s*[الفب]|\|.+?\|.+?\|)/i.test(text)) {
    const cols = parseRawColumns(text)
    if (cols.leftColumn.length >= 2) {
      return [{
        type: 'columns',
        text: isUrduText(text) ? 'کالم (الف) کو کالم (ب) سے ملائیں۔' : 'Match Column A with Column B.',
        textUrdu: isUrduText(text) ? 'کالم (الف) کو کالم (ب) سے ملائیں۔' : '',
        leftColumn: cols.leftColumn,
        rightColumn: cols.rightColumn,
        marks: defaultMarks || Math.max(3, cols.leftColumn.length),
      }]
    }
  }

  // 2. Check for MCQs (contains (A) (B) or A) B) or الف) ب))
  const mcqs = parseRawMcqs(text)
  if (mcqs.length > 0) {
    return mcqs
  }

  // 3. Check for True / False
  if (/(?:\[\s*[✓✗TFtf]?\s*\]|\((?:True|False|درست|غلط)\)|(?:True\s*\/\s*False|درست\s*\/\s*غلط))/i.test(text)) {
    const tf = parseRawTrueFalse(text)
    if (tf.length > 0) return tf
  }

  // 4. Check for Fill in the blanks
  if (/(?:_{3,}|\[blank\]|\.{4,})/i.test(text)) {
    const fills = parseRawFillInBlanks(text)
    if (fills.length > 0) return fills
  }

  // 5. Default to Short Questions
  return parseRawNumberedQuestions(text, 'short', defaultMarks || 2)
}
