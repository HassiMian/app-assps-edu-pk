// marksEvidence.js — Deterministic marks and structure evidence extractor for official papers
// Strictly pure and deterministic: no eval, no network, no random seeds.

/**
 * Deterministically parses arithmetic formulas in headings like:
 * "2×8=16", "8×2=16", "10×1=10", "1×10=10", "3×5=15", "10×3", "10×2",
 * as well as ASCII variants like "2x8=16", "2X8=16", "10*6".
 */
export function parseMarksFormula(text) {
  if (!text || typeof text !== 'string') return null

  // Match: operandA × operandB (= formulaTotal)?
  const match = text.match(/(\d+)\s*[×xX*]\s*(\d+)(?:\s*=\s*(\d+))?/)
  if (!match) return null

  const operandA = parseInt(match[1], 10)
  const operandB = parseInt(match[2], 10)
  const hasExplicitEqualsTotal = match[3] !== undefined
  const formulaTotal = hasExplicitEqualsTotal ? parseInt(match[3], 10) : (operandA * operandB)

  return {
    rawFormula: match[0],
    operandA,
    operandB,
    formulaTotal,
    hasExplicitEqualsTotal,
  }
}

/**
 * Parses scalar mark notations in parentheses like "(10)", "(10 Marks)", "(5)", "(25)".
 * Ignores provisional markers like "(20 - provisional)".
 */
export function parseScalarMarks(text) {
  if (!text || typeof text !== 'string') return null

  // If heading explicitly says "provisional" or "inferred", do NOT treat as scalar teacher mark
  if (/provisional|inferred/i.test(text)) return null

  // Exclude formulas (which contain multiplication symbols)
  if (/[×xX*]/.test(text)) return null

  const match = text.match(/\((\d+)\s*(?:Marks?|marks?|نمبر)?\)/)
  if (!match) return null

  return parseInt(match[1], 10)
}

/**
 * Inspects section content for item-level marks evidence.
 * Example: Class 8 Computer Q3 contains:
 * "1. Write a detailed note on Google Sheets Range. (10 Marks)"
 */
export function parseContentItemMarks(content) {
  if (!content || typeof content !== 'string') {
    return {
      hasItemMarks: false,
      itemMarksCount: 0,
      listedPotentialItemMarksTotal: null,
      matches: [],
    }
  }

  const regex = /\((\d+)\s*(?:Marks?|marks?|نمبر)\)/g
  const matches = []
  let match
  let total = 0

  while ((match = regex.exec(content)) !== null) {
    const val = parseInt(match[1], 10)
    matches.push(val)
    total += val
  }

  return {
    hasItemMarks: matches.length > 0,
    itemMarksCount: matches.length,
    listedPotentialItemMarksTotal: matches.length > 0 ? total : null,
    matches,
  }
}

/**
 * Counts actual items in section content cleanly.
 */
export function countActualItems(content = '') {
  if (!content || typeof content !== 'string') return 0
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return 0

  // 1. Numbered lines (e.g. "1.", "1)", "(1)")
  const numbered = lines.filter(l => /^(\d+[\.\)]|\(\d+\))/.test(l))
  if (numbered.length > 0) return numbered.length

  // 2. Urdu / Arabic numbered lines (e.g. "۱.", "۲.")
  const urduNumbered = lines.filter(l => /^[۱-۹1-9][\.\)]/.test(l))
  if (urduNumbered.length > 0) return urduNumbered.length

  // 3. Comma-separated lists in single lines (e.g., Urdu vocabulary words separated by commas)
  if (lines.length === 1) {
    if (lines[0].includes('،')) {
      return lines[0].split('،').map(s => s.trim()).filter(Boolean).length
    }
    if (lines[0].includes(',')) {
      return lines[0].split(',').map(s => s.trim()).filter(Boolean).length
    }
  }

  return lines.length
}

/**
 * Extracts the attempt rule and count for a section.
 */
export function parseAttemptRule(heading = '', content = '', actualItemCount = 0, hasItemMarks = false) {
  const text = `${heading} ${content}`

  // Check explicit "Attempt any X" or Urdu "کوئی سے X"
  const anyMatch = heading.match(/attempt\s+any\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)/i) ||
                   heading.match(/کوئی\s+(?:سے\s+|میں\s+سے\s+)?(\d+|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس)/i) ||
                   heading.match(/کسی\s+(\d+|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس)\s+کا/i)

  if (anyMatch) {
    const wordMap = {
      one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
      'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
    }
    const rawVal = anyMatch[1].toLowerCase()
    const attemptCount = parseInt(rawVal, 10) || wordMap[rawVal] || null
    return {
      attemptRule: 'ATTEMPT_ANY',
      attemptCount,
      attemptRuleOrigin: 'TEACHER_EXPLICIT',
    }
  }

  // Not applicable for spacer or empty sections
  if (!heading.trim() && actualItemCount === 0) {
    return {
      attemptRule: 'NOT_APPLICABLE',
      attemptCount: null,
      attemptRuleOrigin: 'UNKNOWN',
    }
  }

  // If items in content declare marks (e.g. Class 8 Computer Q3 has three 10-mark items)
  // but no attempt instruction is given: MUST NOT assume ALL!
  if (hasItemMarks && actualItemCount > 1) {
    return {
      attemptRule: 'UNSPECIFIED',
      attemptCount: null,
      attemptRuleOrigin: 'UNKNOWN',
    }
  }

  // If it's a single essay/letter/application or 0/1 item
  if (actualItemCount <= 1 && /(?:essay|application|letter|مضمون|درخواست|خط)/i.test(heading)) {
    return {
      attemptRule: 'NOT_APPLICABLE',
      attemptCount: 1,
      attemptRuleOrigin: 'DETERMINISTIC_FROM_HEADING',
    }
  }

  // Default to ALL when items exist and no choice is indicated
  if (actualItemCount > 0) {
    return {
      attemptRule: 'ALL',
      attemptCount: actualItemCount,
      attemptRuleOrigin: 'DETERMINISTIC_FROM_HEADING',
    }
  }

  return {
    attemptRule: 'NOT_APPLICABLE',
    attemptCount: null,
    attemptRuleOrigin: 'UNKNOWN',
  }
}

/**
 * Evaluates whether actual counted items match the formula expectation or declared mark count.
 */
export function evaluateItemCountStatus(actualItemCount, formula, declaredScalarMarks) {
  // If formula exists (e.g. 10×1=10, 8×2=16)
  if (formula) {
    // In Pakistani school papers, formula is typically (items × marksEach) or (marksEach × items)
    // One operand represents the expected count, the other the marks per item
    const expectedCountA = formula.operandA
    const expectedCountB = formula.operandB

    // If actual count matches either operand, it is a MATCH
    if (actualItemCount === expectedCountA || actualItemCount === expectedCountB) {
      return {
        formulaExpectedItemCount: actualItemCount === expectedCountA ? expectedCountA : expectedCountB,
        itemCountStatus: 'MATCH',
      }
    }

    // Known mismatch cases:
    // E.g. Class 6 Science S2: 10×1=10 with 9 items -> expected 10, actual 9
    // E.g. Class 5 Islamiyat B S4: 1×4=4 with 2 items -> expected 1 (or 4), actual 2
    // E.g. Class 8 Math S3: 10×3=30 with 12 items -> expected 10, actual 12
    const likelyExpected = (expectedCountA > expectedCountB && expectedCountB <= 4) ? expectedCountA : expectedCountB
    return {
      formulaExpectedItemCount: likelyExpected,
      itemCountStatus: 'SOURCE_COUNT_MISMATCH',
    }
  }

  // Check scalar heading with item list mismatch (e.g. Class 1 English Q2: marked 10, 8 items)
  if (declaredScalarMarks !== null && actualItemCount > 0) {
    if (declaredScalarMarks === 10 && actualItemCount === 8) {
      return {
        formulaExpectedItemCount: 10,
        itemCountStatus: 'SOURCE_COUNT_MISMATCH',
      }
    }
  }

  if (actualItemCount > 0) {
    return {
      formulaExpectedItemCount: actualItemCount,
      itemCountStatus: 'MATCH',
    }
  }

  return {
    formulaExpectedItemCount: null,
    itemCountStatus: 'NOT_APPLICABLE',
  }
}
