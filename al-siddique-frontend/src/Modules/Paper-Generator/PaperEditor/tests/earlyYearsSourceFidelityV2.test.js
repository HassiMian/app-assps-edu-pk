// earlyYearsSourceFidelityV2.test.js
// INDEPENDENT SOURCE-FIDELITY FIXTURES — EY-H
// These fixtures are hard-coded from the teacher source supplied in the task brief.
// They do NOT import V2 JSON and assert it against itself.
// They assert V2 store outputs against independently coded expected literals.
// Any future source rewrite that violates teacher content will fail these tests.

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getEarlyYearsPaperById,
  getAllEarlyYearsPapers,
  validateEarlyYearsCorpus,
  getQAFindingsForPaper,
  getEarlyYearsCorpus
} from '../earlyYears/data/earlyYearsSourceStore.js'

function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected)
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected)
    },
    toContain(expected) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        assert.ok(actual.includes(expected), `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`)
      } else {
        assert.ok(expected in actual, `Expected ${JSON.stringify(actual)} to contain key ${expected}`)
      }
    },
    toBeTruthy() {
      assert.ok(actual, `Expected truthy value, got ${actual}`)
    },
    toBeFalsy() {
      assert.ok(!actual, `Expected falsy value, got ${actual}`)
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined)
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`)
    },
    not: {
      toContain(expected) {
        if (typeof actual === 'string' || Array.isArray(actual)) {
          assert.ok(!actual.includes(expected), `Expected ${JSON.stringify(actual)} not to contain ${JSON.stringify(expected)}`)
        } else {
          assert.ok(!(expected in actual), `Expected ${JSON.stringify(actual)} not to contain key ${expected}`)
        }
      },
      toBe(expected) {
        assert.notStrictEqual(actual, expected)
      },
      toBeUndefined() {
        assert.notStrictEqual(actual, undefined)
      }
    }
  }
}

// ─────────────────────────────────────────
// CORPUS STRUCTURAL INVARIANTS
// ─────────────────────────────────────────

describe('Corpus structural invariants', () => {
  it('EY-F-1: Corpus has exactly 9 SOURCE_PRESENT papers', () => {
    const papers = getAllEarlyYearsPapers()
    expect(papers.length).toBe(9)
    expect(papers.every((p) => p.status === 'SOURCE_PRESENT')).toBe(true)
    expect(papers.every((p) => p.printable === true)).toBe(true)
  })

  it('EY-F-2: validateEarlyYearsCorpus passes cleanly', () => {
    const result = validateEarlyYearsCorpus()
    expect(result.errors.join(', ')).toBe('')
    expect(result.valid).toBe(true)
  })

  it('EY-F-3: V2 corpus metadata is correct', () => {
    const corpus = getEarlyYearsCorpus()
    expect(corpus.version).toBe('2.0.0')
    expect(corpus.supersedes).toBe('1.0.0')
    expect(corpus.supersessionReason).toContain('fidelity repair')
  })
})

// ─────────────────────────────────────────
// STARTER URDU — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Starter Urdu fidelity', () => {
  it('EY-F-4: Q1 has exactly 14 glyphs in correct ragged order', () => {
    const paper = getEarlyYearsPaperById('ey-starter-urdu-2026')
    expect(paper).toBeTruthy()
    const q1 = paper.questions.find((q) => q.questionNumber === 1)
    expect(q1).toBeTruthy()

    const EXPECTED_GLYPHS = ['ا', 'آ', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ڈ', 'ذ']
    expect(q1.content.glyphs.length).toBe(14)
    expect(q1.content.glyphs).toEqual(EXPECTED_GLYPHS)

    expect(Array.isArray(q1.content.raggedRows)).toBe(true)
    expect(q1.content.raggedRows.length).toBe(3)
    expect(q1.content.raggedRows[0].length).toBe(5)
    expect(q1.content.raggedRows[1].length).toBe(5)
    expect(q1.content.raggedRows[2].length).toBe(4)

    expect(q1.content.raggedRows[0]).toEqual(['ا', 'آ', 'ب', 'پ', 'ت'])
    expect(q1.content.raggedRows[1]).toEqual(['ٹ', 'ث', 'ج', 'چ', 'ح'])
    expect(q1.content.raggedRows[2]).toEqual(['خ', 'د', 'ڈ', 'ذ'])
    expect(q1.marks).toBe(20)
  })

  it('EY-F-5: Q2 exact source choice arrays preserved', () => {
    const paper = getEarlyYearsPaperById('ey-starter-urdu-2026')
    const q2 = paper.questions.find((q) => q.questionNumber === 2)
    expect(q2).toBeTruthy()

    const EXPECTED_ITEMS = [
      { prompt: 'مرغی', choices: ['س', 'م', 'ب'] },
      { prompt: 'پنکھا', choices: ['ب', 'ب', 'ج'] },
      { prompt: 'ٹماٹر', choices: ['ت', 'س', 'ض'] }
    ]
    expect(q2.content.items.length).toBe(3)
    EXPECTED_ITEMS.forEach((expected, idx) => {
      expect(q2.content.items[idx].prompt).toBe(expected.prompt)
      expect(q2.content.items[idx].choices).toEqual(expected.choices)
    })
    expect(q2.qaFlags).toContain('SUSPICIOUS_PICTURE_LETTER_OPTIONS')
  })

  it('EY-F-6: Q3 exact ragged grid preserved', () => {
    const paper = getEarlyYearsPaperById('ey-starter-urdu-2026')
    const q3 = paper.questions.find((q) => q.questionNumber === 3)
    expect(q3).toBeTruthy()

    const EXPECTED_GRID = [
      ['ف', 'ت', 'ت', 'ج', 'د', 'ذ'],
      ['ذ', 'س', 'ب', 'د', 'ف', 'ح', 'ب'],
      ['ف', 'م', 'ب']
    ]
    expect(q3.content.letterGrid.length).toBe(3)
    expect(q3.content.letterGrid[0].length).toBe(6)
    expect(q3.content.letterGrid[1].length).toBe(7)
    expect(q3.content.letterGrid[2].length).toBe(3)
    expect(q3.content.letterGrid).toEqual(EXPECTED_GRID)
    expect(q3.content.targetLetters).toEqual(['ف', 'ب'])
    expect(q3.content.supportsRaggedRows).toBe(true)
  })

  it('EY-F-7: Total marks conflict preserved (50 header vs 80 sum)', () => {
    const paper = getEarlyYearsPaperById('ey-starter-urdu-2026')
    const sum = paper.questions.reduce((acc, q) => acc + q.marks, 0)
    expect(sum).toBe(80)
    expect(paper.headerSource.totalMarks).toBe(50)
    expect(paper.totalMarksSource.conflictStatus).toBe('SOURCE_TOTAL_CONFLICT')
    expect(paper.totalMarksSource.hasConflict).toBe(true)
  })
})

// ─────────────────────────────────────────
// MOVER ENGLISH — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Mover English fidelity', () => {
  it('EY-F-8: Q3 marks = 20 (not 15)', () => {
    const paper = getEarlyYearsPaperById('ey-mover-english-2026')
    const q3 = paper.questions.find((q) => q.questionNumber === 3)
    expect(q3).toBeTruthy()
    expect(q3.marks).toBe(20)
    expect(q3.instruction).toBe('Write Alphabets A to Z')
  })

  it('EY-F-9: Q4 marks = 10 with exact 6 rows R/M/P/Q/D/S', () => {
    const paper = getEarlyYearsPaperById('ey-mover-english-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    expect(q4).toBeTruthy()
    expect(q4.marks).toBe(10)

    const EXPECTED_CAPITALS = ['R', 'M', 'P', 'Q', 'D', 'S']
    const EXPECTED_SMALLS = ['q', 'p', 'm', 'r', 's', 'd']
    expect(q4.content.leftItems.length).toBe(6)
    expect(q4.content.leftItems.map((i) => i.text)).toEqual(EXPECTED_CAPITALS)
    expect(q4.content.rightItems.map((i) => i.text)).toEqual(EXPECTED_SMALLS)
    // Must not contain V1 invented letters
    expect(q4.content.leftItems.map((i) => i.text)).not.toContain('F')
    expect(q4.content.leftItems.map((i) => i.text)).not.toContain('G')
  })

  it('EY-F-10: Q2 preserves all 6 source words, no Dish/House', () => {
    const paper = getEarlyYearsPaperById('ey-mover-english-2026')
    const q2 = paper.questions.find((q) => q.questionNumber === 2)
    expect(q2).toBeTruthy()

    const ALL_WORDS = ['Fish', 'Dog', 'Cat', 'Monkey', 'Mouse', 'Bus']
    expect(q2.content.allWords).toEqual(ALL_WORDS)
    expect(q2.content.allWords).not.toContain('Dish')
    expect(q2.content.allWords).not.toContain('House')
    expect(q2.qaFlags).toContain('SOURCE_LAYOUT_AMBIGUOUS')
  })
})

// ─────────────────────────────────────────
// MOVER MATH — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Mover Math fidelity', () => {
  it('EY-F-11: Q1 exact 5-row grid preserved', () => {
    const paper = getEarlyYearsPaperById('ey-mover-math-2026')
    const q1 = paper.questions.find((q) => q.questionNumber === 1)
    expect(q1).toBeTruthy()

    const EXPECTED_ROWS = [
      [1, null, 3, null],
      [5, 6, null, 8],
      [null, 10, 11, null],
      [13, null, 15, null],
      [17, null, 19, null]
    ]
    expect(Array.isArray(q1.content.rows)).toBe(true)
    expect(q1.content.rows.length).toBe(5)
    expect(q1.content.rows).toEqual(EXPECTED_ROWS)
    expect(q1.content.grid).toBeUndefined()
  })

  it('EY-F-12: Q3 marks = 20 (not 15)', () => {
    const paper = getEarlyYearsPaperById('ey-mover-math-2026')
    const q3 = paper.questions.find((q) => q.questionNumber === 3)
    expect(q3).toBeTruthy()
    expect(q3.marks).toBe(20)
  })

  it('EY-F-13: Q4 marks = 10 with exact 7 matching rows', () => {
    const paper = getEarlyYearsPaperById('ey-mover-math-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    expect(q4).toBeTruthy()
    expect(q4.marks).toBe(10)

    const EXPECTED_LEFT = ['12', '17', '19', '30', '70', '40', '50']
    const EXPECTED_RIGHT = ['30', '40', '70', '19', '12', '50', '17']
    expect(q4.content.leftItems.length).toBe(7)
    expect(q4.content.leftItems.map((i) => i.text)).toEqual(EXPECTED_LEFT)
    expect(q4.content.rightItems.map((i) => i.text)).toEqual(EXPECTED_RIGHT)
    expect(q4.content.leftItems.map((i) => i.text)).not.toContain('6')
    expect(q4.content.leftItems.map((i) => i.text)).not.toContain('8')
  })
})

// ─────────────────────────────────────────
// MOVER URDU — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Mover Urdu fidelity', () => {
  it('EY-F-14: Marks sum = 10+10+20+10 = 50', () => {
    const paper = getEarlyYearsPaperById('ey-mover-urdu-2026')
    expect(paper).toBeTruthy()
    const EXPECTED_MARKS = [10, 10, 20, 10]
    expect(paper.questions.map((q) => q.marks)).toEqual(EXPECTED_MARKS)
    expect(paper.questions.reduce((a, b) => a + b.marks, 0)).toBe(50)
  })

  it('EY-F-15: Q1 instruction is exact teacher source (not generic alphabet)', () => {
    const paper = getEarlyYearsPaperById('ey-mover-urdu-2026')
    const q1 = paper.questions.find((q) => q.questionNumber === 1)
    expect(q1).toBeTruthy()

    const EXACT_INSTRUCTION = 'مندرجہ ذیل الفاظ کو دوبارہ خوشخط کر کے لکھیں۔'
    expect(q1.instruction).toBe(EXACT_INSTRUCTION)
    expect(q1.instruction).not.toContain('الف تا ے')

    const EXPECTED_GLYPHS = ['ا', 'ب', 'پ', 'ٹ', 'ح', 'د', 'ر', 'س']
    expect(q1.content.glyphs).toEqual(EXPECTED_GLYPHS)
  })

  it('EY-F-16: Q4 has exact 7 rows with repeated target ن (not ب)', () => {
    const paper = getEarlyYearsPaperById('ey-mover-urdu-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    expect(q4).toBeTruthy()

    const EXPECTED_LEFT = ['س', 'ص', 'ع', 'ف', 'ل', 'م', 'ن']
    const EXPECTED_RIGHT = ['ن', 'م', 'ن', 'ص', 'س', 'ل', 'ع']
    expect(q4.content.leftItems.length).toBe(7)
    expect(q4.content.rightItems.length).toBe(7)
    expect(q4.content.leftItems.map((i) => i.text)).toEqual(EXPECTED_LEFT)
    expect(q4.content.rightItems.map((i) => i.text)).toEqual(EXPECTED_RIGHT)

    const rightValues = q4.content.rightItems.map((i) => i.text)
    expect(rightValues.filter((v) => v === 'ن').length).toBe(2)
    expect(rightValues.filter((v) => v === 'ب').length).toBe(0)
    expect(q4.qaFlags).toContain('REPEATED_MATCHING_VALUE')
  })

  it('EY-F-35: Q3 instruction matches exact teacher source without punctuation split', () => {
    const paper = getEarlyYearsPaperById('ey-mover-urdu-2026')
    const q3 = paper.questions.find((q) => q.questionNumber === 3)
    expect(q3).toBeTruthy()
    expect(q3.rawInstruction).toBe('ا تا ش  حروفِ تہجی لکھیں۔')
    expect(q3.instruction).toBe('ا تا ش  حروفِ تہجی لکھیں۔')
    expect(q3.rawInstruction).not.toContain('حروف۔')
    expect(q3.rawInstruction).toContain('حروفِ')
  })
})


// ─────────────────────────────────────────
// FLYER ENGLISH — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Flyer English fidelity', () => {
  it('EY-F-17: Q1 has 5 rows with exact spelling candidates', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-english-2026')
    const q1 = paper.questions.find((q) => q.questionNumber === 1)
    expect(q1).toBeTruthy()

    const EXPECTED_ROWS = [
      ['boat', 'boal', 'boot'],
      ['Aple', 'Appl', 'Apple'],
      ['Car', 'Cir', 'Cpr'],
      ['ball', 'ball', 'bill'],
      ['Dig', 'Dog', 'Dag']
    ]
    expect(q1.content.rows.length).toBe(5)
    EXPECTED_ROWS.forEach((expected, idx) => {
      expect(q1.content.rows[idx].choices).toEqual(expected)
    })
    expect(q1.content.rows.reduce((acc, r) => acc + r.choices.length, 0)).toBe(15)
  })

  it('EY-F-18: Q2 has 5 exact prompts', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-english-2026')
    const q2 = paper.questions.find((q) => q.questionNumber === 2)
    expect(q2).toBeTruthy()

    const EXPECTED_ITEMS = ['Appl _', 'Ball _', 'C __r', 'D __ g', 'H _ n']
    expect(q2.content.items).toEqual(EXPECTED_ITEMS)
    expect(q2.content.items).not.toContain('C_t')
    expect(q2.content.items).not.toContain('F_sh')
  })

  it('EY-F-19: Q4 instruction preserved exactly without "capital" addition', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-english-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    expect(q4).toBeTruthy()
    expect(q4.instruction).toBe('Write Alphabets A to P')
    expect(q4.instruction).not.toContain('capital')
  })

  it('EY-F-20: Q5 has 7 exact matching rows L/G/P/M/R/T/N', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-english-2026')
    const q5 = paper.questions.find((q) => q.questionNumber === 5)
    expect(q5).toBeTruthy()

    const EXPECTED_CAPS = ['L', 'G', 'P', 'M', 'R', 'T', 'N']
    const EXPECTED_SMALL = ['p', 't', 'l', 'n', 'g', 'r', 'm']
    expect(q5.content.leftItems.length).toBe(7)
    expect(q5.content.leftItems.map((i) => i.text)).toEqual(EXPECTED_CAPS)
    expect(q5.content.rightItems.map((i) => i.text)).toEqual(EXPECTED_SMALL)
    expect(q5.content.leftItems.map((i) => i.text)).not.toContain('K')
    expect(q5.content.leftItems.map((i) => i.text)).not.toContain('O')
  })
})

// ─────────────────────────────────────────
// FLYER MATH — EXACT SOURCE FIDELITY
// ─────────────────────────────────────────

describe('Flyer Math fidelity', () => {
  it('EY-F-21: Q2 has 7 exact before-targets', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-math-2026')
    const q2 = paper.questions.find((q) => q.questionNumber === 2)
    expect(q2).toBeTruthy()

    const EXPECTED_TARGETS = [10, 14, 21, 8, 17, 25, 13]
    expect(q2.content.items.length).toBe(7)
    expect(q2.content.items.map((i) => i.target)).toEqual(EXPECTED_TARGETS)
    expect(q2.content.mode).toBe('before')
    expect(q2.content.items.map((i) => i.target)).not.toContain(5)
    expect(q2.content.items.map((i) => i.target)).not.toContain(9)
  })

  it('EY-F-22: Q5 has 5 after-sequences with full context numbers', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-math-2026')
    const q5 = paper.questions.find((q) => q.questionNumber === 5)
    expect(q5).toBeTruthy()

    const EXPECTED_SEQUENCES = [[13, 14, 15], [25, 26, 27], [29, 30, 31], [35, 36, 37], [47, 48, 49]]
    expect(q5.content.items.length).toBe(5)
    expect(q5.content.mode).toBe('after-sequence')
    EXPECTED_SEQUENCES.forEach((expected, idx) => {
      expect(q5.content.items[idx].sequence).toEqual(expected)
      expect(q5.content.items[idx].blank).toBe(true)
    })
    expect(q5.content.items.some((i) => 'target' in i && !('sequence' in i))).toBe(false)
  })
})

// ─────────────────────────────────────────
// STARTER ENGLISH
// ─────────────────────────────────────────

describe('Starter English fidelity', () => {
  it('EY-F-23: Q4 source instruction exact (no /name addition)', () => {
    const paper = getEarlyYearsPaperById('ey-starter-english-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    expect(q4).toBeTruthy()
    expect(q4.instruction).toBe('Match picture with its letter')
    expect(q4.instruction).not.toContain('/name')
  })

  it('EY-F-24: Q4 matching order preserved', () => {
    const paper = getEarlyYearsPaperById('ey-starter-english-2026')
    const q4 = paper.questions.find((q) => q.questionNumber === 4)
    const EXPECTED_LEFT = ['Apple', 'Doll', 'Kite', 'Flower', 'Lion']
    expect(q4.content.leftItems.map((i) => i.text)).toEqual(EXPECTED_LEFT)
  })
})

// ─────────────────────────────────────────
// STARTER MATH — PROVENANCE
// ─────────────────────────────────────────

describe('Starter Math fidelity', () => {
  it('EY-F-25: Q1 preserves caterpillar source spelling exactly', () => {
    const paper = getEarlyYearsPaperById('ey-starter-math-2026')
    const q1 = paper.questions.find((q) => q.questionNumber === 1)
    expect(q1).toBeTruthy()
    expect(q1.content.sourceMarker).toBe('Drawing of cartipiler')
    expect(q1.content.numbers).toEqual([1,2,3,4,5,6,7,8,9,10])
  })

  it('EY-F-26: Q3 instruction preserved with source wording', () => {
    const paper = getEarlyYearsPaperById('ey-starter-math-2026')
    const q3 = paper.questions.find((q) => q.questionNumber === 3)
    expect(q3).toBeTruthy()
    expect(q3.instruction).toBe('Trace the shapes using led pencil and colour it.')
    expect(q3.content.sourceMarker).toBe('[Square shape dotted]')
  })

  it('EY-F-27: Q5 SOURCE_AMBIGUOUS heading preserved', () => {
    const paper = getEarlyYearsPaperById('ey-starter-math-2026')
    const q5 = paper.questions.find((q) => q.questionNumber === 5)
    expect(q5).toBeTruthy()
    expect(q5.instruction).toBe('Match the Same words.')
    expect(q5.qaFlags).toContain('SOURCE_AMBIGUOUS')
  })
})

// ─────────────────────────────────────────
// FLYER URDU — CONFLICT PRESERVED
// ─────────────────────────────────────────

describe('Flyer Urdu fidelity', () => {
  it('EY-F-28: 50 vs 60 conflict preserved without reconciliation', () => {
    const paper = getEarlyYearsPaperById('ey-flyer-urdu-2026')
    expect(paper).toBeTruthy()
    expect(paper.headerSource.totalMarks).toBe(50)
    expect(paper.totalMarksSource.listedQuestionTotal).toBe(60)
    expect(paper.totalMarksSource.conflictStatus).toBe('SOURCE_TOTAL_CONFLICT')
    expect(paper.totalMarksSource.hasConflict).toBe(true)
    const sum = paper.questions.reduce((acc, q) => acc + q.marks, 0)
    expect(sum).toBe(60)
  })
})

// ─────────────────────────────────────────
// RAW PROVENANCE FIELDS
// ─────────────────────────────────────────

describe('Provenance field coverage', () => {
  it('EY-F-29: All papers have substantive literal rawTeacherSource text, not a summary note', () => {
    const papers = getAllEarlyYearsPapers()
    for (const paper of papers) {
      expect(paper.rawTeacherSource).toBeTruthy()
      expect(typeof paper.rawTeacherSource).toBe('string')
      expect(paper.rawTeacherSource.length).toBeGreaterThan(50)
      // Must be literal teacher text, not just a summary note
      expect(paper.rawTeacherSource).toContain('School:')
      expect(paper.rawTeacherSource).toContain('Al-siddique')
    }
  })

  it('EY-F-30: All questions have non-empty rawInstruction and rawContent fields', () => {
    const papers = getAllEarlyYearsPapers()
    for (const paper of papers) {
      for (const q of paper.questions) {
        expect(typeof q.rawInstruction).toBe('string')
        expect(q.rawInstruction.trim().length).toBeGreaterThan(0)
        expect(typeof q.rawContent).toBe('string')
        expect(q.rawContent.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('EY-F-33: Starter Math Q2 rawContent contains both apple count sequence AND shuffled right values 5,4,3,1,2', () => {
    const paper = getEarlyYearsPaperById('ey-starter-math-2026')
    const q2 = paper.questions.find((q) => q.questionNumber === 2)
    expect(q2).toBeTruthy()
    // Must preserve two-column source ordering with apples and shuffled right-side values
    expect(q2.rawContent).toContain('4 apples | 5')
    expect(q2.rawContent).toContain('3 apples | 4')
    expect(q2.rawContent).toContain('5 apples | 3')
    expect(q2.rawContent).toContain('2 apples | 1')
    expect(q2.rawContent).toContain('1 apple  | 2')
  })

  it('EY-F-34: Raw fields preserve literal teacher spellings without normalization', () => {
    const sMath = getEarlyYearsPaperById('ey-starter-math-2026')
    const sMathQ1 = sMath.questions.find((q) => q.questionNumber === 1)
    expect(sMathQ1.rawContent).toContain('cartipiler')

    const sMathQ3 = sMath.questions.find((q) => q.questionNumber === 3)
    expect(sMathQ3.rawInstruction).toContain('led pencil')

    const sMathQ5 = sMath.questions.find((q) => q.questionNumber === 5)
    expect(sMathQ5.rawInstruction).toBe('Match the Same words.')

    const fMath = getEarlyYearsPaperById('ey-flyer-math-2026')
    const fMathQ3 = fMath.questions.find((q) => q.questionNumber === 3)
    expect(fMathQ3.rawInstruction).toBe('Write english counting 1 to 10')

    const fEng = getEarlyYearsPaperById('ey-flyer-english-2026')
    const fEngQ1 = fEng.questions.find((q) => q.questionNumber === 1)
    expect(fEngQ1.rawContent).toContain('Aple')
    expect(fEngQ1.rawContent).toContain('Appl')
    expect(fEngQ1.rawContent).toContain('Apple')

    const fEngQ2 = fEng.questions.find((q) => q.questionNumber === 2)
    expect(fEngQ2.rawContent).toContain('Ball _')
  })
})

// ─────────────────────────────────────────
// QA MANIFEST V2 CORRECTNESS
// ─────────────────────────────────────────

describe('QA Manifest V2', () => {
  it('EY-F-31: Mover Urdu repeated target = ن finding is correct', () => {
    const findings = getQAFindingsForPaper('ey-mover-urdu-2026')
    const repeatedFinding = findings.find((f) => f.status === 'REPEATED_MATCHING_VALUE')
    expect(repeatedFinding).toBeTruthy()
    expect(repeatedFinding.description).toContain('ن')
  })

  it('EY-F-32: SOURCE_LAYOUT_AMBIGUOUS findings exist for correct papers', () => {
    const moverEngFindings = getQAFindingsForPaper('ey-mover-english-2026')
    expect(moverEngFindings.some((f) => f.status === 'SOURCE_LAYOUT_AMBIGUOUS')).toBe(true)

    const flyerMathFindings = getQAFindingsForPaper('ey-flyer-math-2026')
    expect(flyerMathFindings.some((f) => f.status === 'SOURCE_LAYOUT_AMBIGUOUS')).toBe(true)
  })
})
