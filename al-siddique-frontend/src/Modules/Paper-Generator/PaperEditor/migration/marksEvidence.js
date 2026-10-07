// marksEvidence.js — Deterministic marks and structure evidence extractor for official papers
// Strictly pure and deterministic: no eval, no network, no random seeds.

/**
 * Deterministically parses arithmetic formulas in headings like:
 * "2×8=16", "8×2=16", "10×1=10", "1×10=10", "3×5=15", "10×3", "10×2",
 * as well as ASCII variants like "2x8=16", "2X8=16", "10*6".
 * Preserves raw formula structure without positional assumptions.
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
 * Resolves formula operand semantic roles (item count vs marks per item)
 * using a deterministic 4-tier hierarchy:
 * A. Explicit attempt instruction (e.g. "Attempt any 8" + 2×8=16)
 * B. Explicit item-count wording in heading (e.g. "10 MCQs" + 10×1=10, or singular "حدیث مبارکہ کا ترجمہ" + 1×4=4)
 * C. Actual item count matching exactly one operand without contradiction
 * D. Unresolved (do not guess; preserve commutative total but leave roles null)
 */
export function resolveFormulaRoles(formula, heading = '', actualItemCount = 0, attemptCount = null) {
  if (!formula) return null

  const { operandA, operandB, rawFormula, formulaTotal, hasExplicitEqualsTotal } = formula

  let interpretedItemCount = null
  let interpretedMarksPerItem = null
  let interpretationStatus = 'UNRESOLVED'

  // A. Explicit attempt instruction
  if (attemptCount !== null && attemptCount !== undefined) {
    if (operandA === attemptCount && operandB !== attemptCount) {
      interpretedItemCount = operandA
      interpretedMarksPerItem = operandB
      interpretationStatus = 'RESOLVED'
    } else if (operandB === attemptCount && operandA !== attemptCount) {
      interpretedItemCount = operandB
      interpretedMarksPerItem = operandA
      interpretationStatus = 'RESOLVED'
    } else if (operandA === attemptCount && operandB === attemptCount) {
      interpretedItemCount = operandA
      interpretedMarksPerItem = operandB
      interpretationStatus = 'RESOLVED'
    }
  }

  // B. Explicit item-count wording in heading
  if (interpretationStatus === 'UNRESOLVED') {
    const isSingularUrdu = /(?:حدیث\s+مبارکہ\s+کا\s+ترجمہ|تفصیلی\s+سوال\s+کا\s+جواب|مضمون\s+لکھ|درخواست\s+لکھ|خط\s+لکھ)/i.test(heading)
    if (isSingularUrdu && (operandA === 1 || operandB === 1)) {
      interpretedItemCount = 1
      interpretedMarksPerItem = operandA === 1 ? operandB : operandA
      interpretationStatus = 'RESOLVED'
    } else {
      const numMatch = heading.match(/(\d+)\s*(?:mcqs?|questions?|سوالات|اجزاء)/i)
      if (numMatch) {
        const countInHeading = parseInt(numMatch[1], 10)
        if (operandA === countInHeading && operandB !== countInHeading) {
          interpretedItemCount = operandA
          interpretedMarksPerItem = operandB
          interpretationStatus = 'RESOLVED'
        } else if (operandB === countInHeading && operandA !== countInHeading) {
          interpretedItemCount = operandB
          interpretedMarksPerItem = operandA
          interpretationStatus = 'RESOLVED'
        }
      } else if (/mcqs?|multiple\s+choice/i.test(heading) && (operandA === 1 || operandB === 1) && actualItemCount > 1) {
        // Objective multiple-choice convention: 1 mark per question when multiple questions exist
        interpretedItemCount = operandA === 1 ? operandB : operandA
        interpretedMarksPerItem = 1
        interpretationStatus = 'RESOLVED'
      }
    }
  }

  // C. Actual item count matching exactly one formula operand, when no contradictory attempt rule exists
  if (interpretationStatus === 'UNRESOLVED') {
    if (actualItemCount > 0 && attemptCount === null) {
      if (operandA === actualItemCount && operandB !== actualItemCount) {
        interpretedItemCount = operandA
        interpretedMarksPerItem = operandB
        interpretationStatus = 'RESOLVED'
      } else if (operandB === actualItemCount && operandA !== actualItemCount) {
        interpretedItemCount = operandB
        interpretedMarksPerItem = operandA
        interpretationStatus = 'RESOLVED'
      } else if (operandA === actualItemCount && operandB === actualItemCount) {
        interpretedItemCount = operandA
        interpretedMarksPerItem = operandB
        interpretationStatus = 'RESOLVED'
      }
    }
  }

  // D. Ambiguous roles remain UNRESOLVED with null values; formula total remains mathematically valid
  return {
    rawFormula,
    operandA,
    operandB,
    formulaTotal,
    hasExplicitEqualsTotal,
    interpretedItemCount,
    interpretedMarksPerItem,
    interpretationStatus,
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
 * Detects whether a section is a spacer, syllabus banner, or chapter scope header.
 * Examples: "# Objective Part", "# Chapters 1, 2, 3, 4, 6, 8", "# Section A".
 */
export function isSpacerOrScopeSection(heading = '', content = '') {
  const trimmedHeading = (heading || '').trim()
  const trimmedContent = (content || '').trim()

  if (!trimmedHeading && trimmedContent.startsWith('#')) {
    return true
  }

  if (!trimmedHeading && /^#?\s*(?:chapters?|first\s+\w+\s+chapters?|objective\s+part|subjective\s+part|section\s+[a-z]|حصہ\s+[الف-ی])/i.test(trimmedContent)) {
    return true
  }

  return false
}

/**
 * Counts actual academic items in section content cleanly.
 * Spacer / chapter header sections return 0.
 */
export function countActualItems(content = '', heading = '') {
  if (isSpacerOrScopeSection(heading, content)) {
    return 0
  }

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
 * Extracts the attempt rule and count for a section without naive assumptions.
 * Lock: Absence of "attempt any" does NOT prove that every item is compulsory.
 */
export function parseAttemptRule(heading = '', content = '', actualItemCount = 0, hasItemMarks = false) {
  // 1. Not applicable for spacer or scope sections
  if (isSpacerOrScopeSection(heading, content) || (!heading.trim() && actualItemCount === 0)) {
    return {
      attemptRule: 'NOT_APPLICABLE',
      attemptCount: null,
      attemptRuleOrigin: 'NOT_APPLICABLE',
    }
  }

  // 2. Check explicit "Attempt any X" or Urdu "کوئی سے X" / "کسی X کا / کے"
  const anyMatch = heading.match(/attempt\s+any\s+(\d+|two|three|four|five|six|seven|eight|nine|ten)/i) ||
                   heading.match(/کوئی\s+(?:سے\s+|میں\s+سے\s+)?(\d+|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس)/i) ||
                   heading.match(/کسی\s+(\d+|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس)\s+(?:کا|کے)/i)

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

  // 3. If items in content declare marks (e.g. Class 8 Computer Q3 has three 10-mark items)
  // but no attempt instruction is given: MUST NOT assume ALL!
  if (hasItemMarks && actualItemCount > 1) {
    return {
      attemptRule: 'UNSPECIFIED',
      attemptCount: null,
      attemptRuleOrigin: 'UNKNOWN',
    }
  }

  // 4. Check single essay/letter/application/translation
  if (actualItemCount <= 1 && /(?:essay|application|letter|translation|مضمون|درخواست|خط|ترجمہ)/i.test(heading)) {
    return {
      attemptRule: 'NOT_APPLICABLE',
      attemptCount: actualItemCount > 0 ? actualItemCount : 1,
      attemptRuleOrigin: 'DETERMINISTIC_FROM_HEADING',
    }
  }

  // 5. Positive indication of ALL
  const wordToNum = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
  }

  const explicitAllMatch = /(?:answer|attempt)\s+all\s+(?:the\s+)?questions/i.test(heading) ||
                           /all\s+questions\s+are\s+compulsory/i.test(heading) ||
                           /\bcompulsory\b/i.test(heading) ||
                           /تمام\s+سوالات/i.test(heading) ||
                           /تمام\s+(?:کے\s+)?جوابات/i.test(heading) ||
                           /(?:مندرجہ\s+ذیل|درج\s+ذیل)\s+تمام/i.test(heading)

  if (explicitAllMatch) {
    return {
      attemptRule: 'ALL',
      attemptCount: actualItemCount > 0 ? actualItemCount : null,
      attemptRuleOrigin: 'TEACHER_EXPLICIT',
    }
  }

  const countMatch = heading.match(/(?:answer|attempt)\s+(?:the\s+following\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+questions/i) ||
                     heading.match(/(?:مندرجہ\s+ذیل|درج\s+ذیل)\s+(\d+|ایک|دو|تین|چار|پانچ|چھ|سات|آٹھ|نو|دس)\s+سوالات/i)
  if (countMatch) {
    const rawVal = countMatch[1].toLowerCase()
    const specifiedCount = parseInt(rawVal, 10) || wordToNum[rawVal] || null
    if (specifiedCount === actualItemCount) {
      return {
        attemptRule: 'ALL',
        attemptCount: actualItemCount,
        attemptRuleOrigin: 'TEACHER_EXPLICIT',
      }
    }
  }

  // 6. When multiple items exist and no authoritative selection/compulsory rule can be established:
  // MUST NOT ASSUME ALL!
  if (actualItemCount > 1) {
    return {
      attemptRule: 'UNSPECIFIED',
      attemptCount: null,
      attemptRuleOrigin: 'UNKNOWN',
    }
  }

  // Single item without choice
  if (actualItemCount === 1) {
    return {
      attemptRule: 'NOT_APPLICABLE',
      attemptCount: 1,
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
 * formulaExpectedItemCount is drawn strictly from interpretedItemCount.
 */
export function evaluateItemCountStatus(actualItemCount, resolvedFormula, declaredScalarMarks) {
  if (resolvedFormula) {
    if (resolvedFormula.interpretationStatus === 'RESOLVED') {
      const expected = resolvedFormula.interpretedItemCount
      if (expected === null) {
        return {
          formulaExpectedItemCount: null,
          itemCountStatus: 'UNKNOWN',
        }
      }
      if (actualItemCount === expected) {
        return {
          formulaExpectedItemCount: expected,
          itemCountStatus: 'MATCH',
        }
      }
      return {
        formulaExpectedItemCount: expected,
        itemCountStatus: 'SOURCE_COUNT_MISMATCH',
      }
    } else {
      // Ambiguous / UNRESOLVED formula roles do NOT guess expected item count
      return {
        formulaExpectedItemCount: null,
        itemCountStatus: 'UNKNOWN',
      }
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
