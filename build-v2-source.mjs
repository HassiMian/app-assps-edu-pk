// build-v2-source.mjs — One-shot script to write early-years-first-term-2026-source-v2.json
// Run: node build-v2-source.mjs
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const v2 = {
  version: '2.0.0',
  supersedes: '1.0.0',
  supersessionReason:
    'Teacher-source fidelity repair: V1 contained inferred/replaced academic content.',
  corpusId: 'early-years-first-term-2026',
  academicSession: '2026',
  term: 'First Term',
  paperCount: 9,
  sourcePresentCount: 9,
  sourceMissingCount: 0,
  classes: ['starter', 'mover', 'flyer'],
  subjects: ['english', 'urdu', 'math'],
  papers: [
    // ═══════════════════════════════════════
    // STARTER ENGLISH
    // ═══════════════════════════════════════
    {
      id: 'ey-starter-english-2026',
      classStage: 'starter',
      classDisplayName: 'Starter',
      subject: 'english',
      language: 'english',
      rawTeacherSource: {
        note: 'Teacher-supplied Starter English paper. Transcribed without inference or normalisation.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '',
        date: '',
        class: 'Starter',
        subject: 'English',
        totalMarks: 50
      },
      totalMarksSource: {
        headerTotal: 50,
        listedQuestionTotal: 50,
        hasConflict: false,
        conflictStatus: 'SOURCE_OK'
      },
      questions: [
        {
          id: 'ey-starter-eng-q1',
          questionNumber: 1,
          label: 'Q1',
          rawInstruction: 'Trace the Alphabets.',
          rawContent: 'A B C D E F G H I J',
          instruction: 'Trace the Alphabets.',
          marks: 10,
          presentationType: 'TraceGlyphGrid',
          content: {
            glyphs: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
            gridColumns: 5,
            practiceLane: true
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-eng-q2',
          questionNumber: 2,
          label: 'Q2',
          rawInstruction: 'Match capital letters with small letters.',
          rawContent: 'B-c, A-e, C-b, D-d, E-a',
          instruction: 'Match capital letters with small letters.',
          marks: 10,
          presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: 'B' },
              { id: 'l2', text: 'A' },
              { id: 'l3', text: 'C' },
              { id: 'l4', text: 'D' },
              { id: 'l5', text: 'E' }
            ],
            rightItems: [
              { id: 'r1', text: 'c' },
              { id: 'r2', text: 'e' },
              { id: 'r3', text: 'b' },
              { id: 'r4', text: 'd' },
              { id: 'r5', text: 'a' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-eng-q3',
          questionNumber: 3,
          label: 'Q3',
          rawInstruction: 'Color it.',
          rawContent: 'Apple, Mango, Grapes, Banana',
          instruction: 'Color it.',
          marks: 10,
          presentationType: 'PictureColoringBlock',
          content: {
            items: [
              { id: 'c1', label: 'Apple', sketchId: 'sketch.apple.v1' },
              { id: 'c2', label: 'Mango', sketchId: 'sketch.mango.v1' },
              { id: 'c3', label: 'Grapes', sketchId: 'sketch.grapes.v1' },
              { id: 'c4', label: 'Banana', sketchId: 'sketch.banana.v1' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-eng-q4',
          questionNumber: 4,
          label: 'Q4',
          rawInstruction: 'Match picture with its letter',
          rawContent:
            'Apple-Lion Drawing, Doll-Flower Drawing, Kite-Doll Drawing, Flower-Kite Drawing, Lion-Apple Drawing',
          sourceInstruction: 'Match picture with its letter',
          displayInstruction: 'Match picture with its letter',
          displayNormalizationReason:
            'Source instruction preserved exactly without /name addition',
          instruction: 'Match picture with its letter',
          marks: 10,
          presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-sketch',
            leftItems: [
              { id: 'l1', text: 'Apple' },
              { id: 'l2', text: 'Doll' },
              { id: 'l3', text: 'Kite' },
              { id: 'l4', text: 'Flower' },
              { id: 'l5', text: 'Lion' }
            ],
            rightItems: [
              { id: 'r1', sketchId: 'sketch.lion.v1', label: 'Lion Drawing' },
              { id: 'r2', sketchId: 'sketch.flower.v1', label: 'Flower Drawing' },
              { id: 'r3', sketchId: 'sketch.doll.v1', label: 'Doll Drawing' },
              { id: 'r4', sketchId: 'sketch.kite.v1', label: 'Kite Drawing' },
              { id: 'r5', sketchId: 'sketch.apple.v1', label: 'Apple Drawing' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-eng-q5',
          questionNumber: 5,
          label: 'Q5',
          rawInstruction: 'Circle the small letters of given Capital letters.',
          rawContent: 'A: w e a | B: d b t | C: c s u | D: p r d',
          instruction: 'Circle the small letters of given Capital letters.',
          marks: 10,
          presentationType: 'ChoiceLetterRow',
          content: {
            rows: [
              { id: 'r1', prompt: 'A', choices: ['w', 'e', 'a'] },
              { id: 'r2', prompt: 'B', choices: ['d', 'b', 't'] },
              { id: 'r3', prompt: 'C', choices: ['c', 's', 'u'] },
              { id: 'r4', prompt: 'D', choices: ['p', 'r', 'd'] }
            ]
          },
          qaFlags: ['SOURCE_ITEM_COUNT_MARKS_AMBIGUITY']
        }
      ],
      qaFlags: ['SOURCE_ITEM_COUNT_MARKS_AMBIGUITY'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // STARTER URDU — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-starter-urdu-2026',
      classStage: 'starter',
      classDisplayName: 'Starter',
      subject: 'urdu',
      language: 'urdu',
      rawTeacherSource: {
        note:
          'Teacher-supplied Starter Urdu paper. Header total 50 conflicts with question marks sum 80. Exact letter grids and choice options preserved as supplied. Q1: 14-glyph ragged sequence (not 6). Q2: exact choices per picture. Q3: ragged grid from teacher source.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '',
        date: '',
        class: 'Starter',
        subject: 'Urdu',
        totalMarks: 50
      },
      totalMarksSource: {
        headerTotal: 50,
        listedQuestionTotal: 80,
        hasConflict: true,
        conflictStatus: 'SOURCE_TOTAL_CONFLICT'
      },
      questions: [
        {
          id: 'ey-starter-urdu-q1',
          questionNumber: 1,
          label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 1',
          rawInstruction: '\u062d\u0631\u0648\u0641 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba \u0679\u0631\u06cc\u0633 \u06a9\u0631\u06cc\u06ba',
          rawContent: 'Row1: \u0627 \u0622 \u0628 \u067e \u062a | Row2: \u0679 \u062b \u062c \u0686 \u062d | Row3: \u062e \u062f \u0688 \u0630',
          instruction: '\u062d\u0631\u0648\u0641 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba \u0679\u0631\u06cc\u0633 \u06a9\u0631\u06cc\u06ba',
          marks: 20,
          presentationType: 'TraceGlyphGrid',
          content: {
            glyphs: ['\u0627', '\u0622', '\u0628', '\u067e', '\u062a', '\u0679', '\u062b', '\u062c', '\u0686', '\u062d', '\u062e', '\u062f', '\u0688', '\u0630'],
            raggedRows: [
              ['\u0627', '\u0622', '\u0628', '\u067e', '\u062a'],
              ['\u0679', '\u062b', '\u062c', '\u0686', '\u062d'],
              ['\u062e', '\u062f', '\u0688', '\u0630']
            ],
            gridColumns: 5,
            supportsRaggedRows: true,
            practiceLane: true
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-urdu-q2',
          questionNumber: 2,
          label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 2',
          rawInstruction: '\u0635\u062d\u06cc\u062d \u062d\u0631\u0648\u0641 \u067e\u0631 \u062f\u0627\u0626\u0631\u06c1 \u0644\u06af\u0627\u0626\u06cc\u06ba',
          rawContent: '\u0645\u0631\u063a\u06cc: \u0633 \u0645 \u0628 | \u067e\u0646\u06a9\u06be\u0627: \u0628 \u0628 \u062c | \u0679\u0645\u0627\u0679\u0631: \u062a \u0633 \u0636',
          instruction: '\u0635\u062d\u06cc\u062d \u062d\u0631\u0648\u0641 \u067e\u0631 \u062f\u0627\u0626\u0631\u06c1 \u0644\u06af\u0627\u0626\u06cc\u06ba',
          marks: 20,
          presentationType: 'CircleChoiceWithSketch',
          content: {
            items: [
              { id: 'i1', sketchId: 'sketch.chicken.v1', prompt: '\u0645\u0631\u063a\u06cc', choices: ['\u0633', '\u0645', '\u0628'] },
              { id: 'i2', sketchId: 'sketch.hand-fan.v1', prompt: '\u067e\u0646\u06a9\u06be\u0627', choices: ['\u0628', '\u0628', '\u062c'] },
              { id: 'i3', sketchId: 'sketch.tomato.v1', prompt: '\u0679\u0645\u0627\u0679\u0631', choices: ['\u062a', '\u0633', '\u0636'] }
            ]
          },
          qaFlags: ['SUSPICIOUS_PICTURE_LETTER_OPTIONS', 'DUPLICATE_CANDIDATE']
        },
        {
          id: 'ey-starter-urdu-q3',
          questionNumber: 3,
          label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 3',
          rawInstruction: '\u0641 \u0627\u0648\u0631 \u0628 \u067e\u0631 \u062f\u0627\u0626\u0631\u06c1 \u0644\u06af\u0627\u0626\u06cc\u06ba',
          rawContent: 'Row1: \u0641 \u062a \u062a \u062c \u062f \u0630 | Row2: \u0630 \u0633 \u0628 \u062f \u0641 \u062d \u0628 | Row3: \u0641 \u0645 \u0628',
          instruction: '\u0641 \u0627\u0648\u0631 \u0628 \u067e\u0631 \u062f\u0627\u0626\u0631\u06c1 \u0644\u06af\u0627\u0626\u06cc\u06ba',
          marks: 10,
          presentationType: 'CircleChoiceGrid',
          content: {
            targetLetters: ['\u0641', '\u0628'],
            letterGrid: [
              ['\u0641', '\u062a', '\u062a', '\u062c', '\u062f', '\u0630'],
              ['\u0630', '\u0633', '\u0628', '\u062f', '\u0641', '\u062d', '\u0628'],
              ['\u0641', '\u0645', '\u0628']
            ],
            supportsRaggedRows: true
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-urdu-q4',
          questionNumber: 4,
          label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 4',
          rawInstruction: '\u0631\u0646\u06af \u0628\u06be\u0631\u06cc\u06ba',
          rawContent: '\u067e\u0646\u0633\u0644\u060c \u0622\u0645\u060c \u0627\u0646\u06af\u0648\u0631',
          instruction: '\u0631\u0646\u06af \u0628\u06be\u0631\u06cc\u06ba',
          marks: 10,
          presentationType: 'PictureColoringBlock',
          content: {
            items: [
              { id: 'c1', label: '\u067e\u0646\u0633\u0644', sketchId: 'sketch.pencil.v1' },
              { id: 'c2', label: '\u0622\u0645', sketchId: 'sketch.mango.v1' },
              { id: 'c3', label: '\u0627\u0646\u06af\u0648\u0631', sketchId: 'sketch.grapes.v1' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-urdu-q5',
          questionNumber: 5,
          label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 5',
          rawInstruction: '\u06a9\u0627\u0644\u0645 \u0645\u0644\u0627\u0626\u06cc\u06ba',
          rawContent: 'Left: \u0627\u060c \u0628\u060c \u062a | Right: \u062a\u062a\u0644\u06cc\u060c \u0627\u0646\u06af\u0648\u0631\u060c \u0628\u0644\u0627',
          instruction: '\u06a9\u0627\u0644\u0645 \u0645\u0644\u0627\u0626\u06cc\u06ba',
          marks: 20,
          presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-sketch',
            leftItems: [
              { id: 'l1', text: '\u0627' },
              { id: 'l2', text: '\u0628' },
              { id: 'l3', text: '\u062a' }
            ],
            rightItems: [
              { id: 'r1', sketchId: 'sketch.butterfly.v1', label: '\u062a\u062a\u0644\u06cc' },
              { id: 'r2', sketchId: 'sketch.grapes.v1', label: '\u0627\u0646\u06af\u0648\u0631' },
              { id: 'r3', sketchId: 'sketch.cricket-bat.v1', label: '\u0628\u0644\u0627' }
            ]
          },
          qaFlags: []
        }
      ],
      qaFlags: ['SOURCE_TOTAL_CONFLICT', 'SUSPICIOUS_PICTURE_LETTER_OPTIONS', 'DUPLICATE_CANDIDATE'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // STARTER MATH
    // ═══════════════════════════════════════
    {
      id: 'ey-starter-math-2026',
      classStage: 'starter',
      classDisplayName: 'Starter',
      subject: 'math',
      language: 'english',
      rawTeacherSource: {
        note: 'Teacher-supplied Starter Math. Caterpillar marker and Q3 exact wording preserved including source spelling errors.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Starter', subject: 'Math', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 50, hasConflict: false, conflictStatus: 'SOURCE_OK' },
      questions: [
        {
          id: 'ey-starter-math-q1', questionNumber: 1, label: 'Q1',
          rawInstruction: 'Trace the numbers.',
          rawContent: 'Drawing of cartipiler — numbers 1 to 10',
          instruction: 'Trace the numbers.',
          marks: 10, presentationType: 'CaterpillarNumberTrace',
          content: { sourceMarker: 'Drawing of cartipiler', numbers: [1,2,3,4,5,6,7,8,9,10], assetId: 'sketch.caterpillar.v1' },
          qaFlags: []
        },
        {
          id: 'ey-starter-math-q2', questionNumber: 2, label: 'Q2',
          rawInstruction: 'Count the apples in each box, match with Correct numbers.',
          rawContent: '4 apples-4, 3 apples-3, 5 apples-5, 2 apples-2, 1 apple-1',
          instruction: 'Count the apples in each box, match with Correct numbers.',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'count-text',
            leftItems: [
              { id: 'l1', count: 4, sketchId: 'sketch.apple.v1', label: '4 apples' },
              { id: 'l2', count: 3, sketchId: 'sketch.apple.v1', label: '3 apples' },
              { id: 'l3', count: 5, sketchId: 'sketch.apple.v1', label: '5 apples' },
              { id: 'l4', count: 2, sketchId: 'sketch.apple.v1', label: '2 apples' },
              { id: 'l5', count: 1, sketchId: 'sketch.apple.v1', label: '1 apple' }
            ],
            rightItems: [
              { id: 'r1', text: '5' }, { id: 'r2', text: '4' }, { id: 'r3', text: '3' },
              { id: 'r4', text: '1' }, { id: 'r5', text: '2' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-starter-math-q3', questionNumber: 3, label: 'Q3',
          rawInstruction: 'Trace the shapes using led pencil and colour it.',
          rawContent: '[Square shape dotted]',
          instruction: 'Trace the shapes using led pencil and colour it.',
          marks: 10, presentationType: 'TraceShapeBlock',
          content: { sourceMarker: '[Square shape dotted]', shapeId: 'shape.square.v1', shapeName: 'square', isDotted: true },
          qaFlags: []
        },
        {
          id: 'ey-starter-math-q4', questionNumber: 4, label: 'Q4',
          rawInstruction: 'Look above and write it yourself.',
          rawContent: 'Reference row: 1 2 3 4 5',
          instruction: 'Look above and write it yourself.',
          marks: 10, presentationType: 'NumberCopyPractice',
          content: { referenceRow: [1,2,3,4,5] },
          qaFlags: []
        },
        {
          id: 'ey-starter-math-q5', questionNumber: 5, label: 'Q5',
          rawInstruction: 'Match the Same words.',
          rawContent: 'Left: 15, 17, 18, 19, 11 | Right: 20, 18, 19, 17, 11',
          instruction: 'Match the Same words.',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: '15' }, { id: 'l2', text: '17' }, { id: 'l3', text: '18' },
              { id: 'l4', text: '19' }, { id: 'l5', text: '11' }
            ],
            rightItems: [
              { id: 'r1', text: '20' }, { id: 'r2', text: '18' }, { id: 'r3', text: '19' },
              { id: 'r4', text: '17' }, { id: 'r5', text: '11' }
            ]
          },
          qaFlags: ['SOURCE_AMBIGUOUS']
        }
      ],
      qaFlags: ['SOURCE_AMBIGUOUS'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // MOVER ENGLISH — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-mover-english-2026',
      classStage: 'mover',
      classDisplayName: 'Mover',
      subject: 'english',
      language: 'english',
      rawTeacherSource: {
        note: 'Q1 layout ambiguous. Q2: 6 words total, grouping ambiguous. Q3=20 marks. Q4=10 marks, exact 6 rows: R/M/P/Q/D/S.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Mover', subject: 'English', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 50, hasConflict: false, conflictStatus: 'SOURCE_OK' },
      questions: [
        {
          id: 'ey-mover-eng-q1', questionNumber: 1, label: 'Q1',
          rawInstruction: 'Supply missing letters',
          rawContent: 'A   D\n  F\nH   J\n  L  M',
          instruction: 'Supply missing letters',
          marks: 10, presentationType: 'MissingLetterGrid',
          content: { rawSourceLayout: 'A   D\n  F\nH   J\n  L  M', layoutAmbiguous: true },
          qaFlags: ['SOURCE_LAYOUT_AMBIGUOUS']
        },
        {
          id: 'ey-mover-eng-q2', questionNumber: 2, label: 'Q2',
          rawInstruction: 'Tick the correct name of the picture.',
          rawContent: '[F Picture]=Fish, [M Picture]=Mouse | Words: Fish, Dog, Cat, Monkey, Mouse, Bus',
          instruction: 'Tick the correct name of the picture.',
          marks: 10, presentationType: 'CircleChoiceWithSketch',
          content: {
            items: [
              { id: 'i1', sketchId: 'sketch.fish.v1', label: 'Fish' },
              { id: 'i2', sketchId: 'sketch.mouse.v1', label: 'Mouse' }
            ],
            allWords: ['Fish', 'Dog', 'Cat', 'Monkey', 'Mouse', 'Bus'],
            groupingAmbiguous: true
          },
          qaFlags: ['SOURCE_LAYOUT_AMBIGUOUS']
        },
        {
          id: 'ey-mover-eng-q3', questionNumber: 3, label: 'Q3',
          rawInstruction: 'Write Alphabets A to Z',
          rawContent: 'Write Alphabets A to Z',
          instruction: 'Write Alphabets A to Z',
          marks: 20, presentationType: 'AlphabetWritingArea',
          content: { range: 'A to Z', lines: 4 },
          qaFlags: []
        },
        {
          id: 'ey-mover-eng-q4', questionNumber: 4, label: 'Q4',
          rawInstruction: 'Match the capital letter with small letters',
          rawContent: 'R-q, M-p, P-m, Q-r, D-s, S-d',
          instruction: 'Match the capital letter with small letters',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: 'R' }, { id: 'l2', text: 'M' }, { id: 'l3', text: 'P' },
              { id: 'l4', text: 'Q' }, { id: 'l5', text: 'D' }, { id: 'l6', text: 'S' }
            ],
            rightItems: [
              { id: 'r1', text: 'q' }, { id: 'r2', text: 'p' }, { id: 'r3', text: 'm' },
              { id: 'r4', text: 'r' }, { id: 'r5', text: 's' }, { id: 'r6', text: 'd' }
            ]
          },
          qaFlags: []
        }
      ],
      qaFlags: ['SOURCE_LAYOUT_AMBIGUOUS'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // MOVER URDU — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-mover-urdu-2026',
      classStage: 'mover',
      classDisplayName: 'Mover',
      subject: 'urdu',
      language: 'urdu',
      rawTeacherSource: {
        note: 'No explicit paper total. Q1 handwriting practice grid, not alphabet-to-ye. Q2 layout ambiguous. Q3=20 marks. Q4 has repeated target nun (not ba).'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Mover', subject: 'Urdu', totalMarks: null
      },
      totalMarksSource: {
        headerTotal: null,
        listedQuestionTotal: 50,
        hasConflict: false,
        conflictStatus: 'AUTHORITATIVE_HEADER_TOTAL_ABSENT',
        derivedPotentialTotal: 50
      },
      questions: [
        {
          id: 'ey-mover-urdu-q1', questionNumber: 1, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 1',
          rawInstruction: '\u0645\u0646\u062f\u0631\u062c\u06c1 \u0630\u06cc\u0644 \u0627\u0644\u0641\u0627\u0638 \u06a9\u0648 \u062f\u0648\u0628\u0627\u0631\u06c1 \u062e\u0648\u0634\u062e\u0637 \u06a9\u0631 \u06a9\u06d2 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: 'Row1: \u0627 \u0628 \u067e \u0679 | Row2: \u062d \u062f \u0631 \u0633',
          instruction: '\u0645\u0646\u062f\u0631\u062c\u06c1 \u0630\u06cc\u0644 \u0627\u0644\u0641\u0627\u0638 \u06a9\u0648 \u062f\u0648\u0628\u0627\u0631\u06c1 \u062e\u0648\u0634\u062e\u0637 \u06a9\u0631 \u06a9\u06d2 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 10, presentationType: 'TraceGlyphGrid',
          content: {
            glyphs: ['\u0627', '\u0628', '\u067e', '\u0679', '\u062d', '\u062f', '\u0631', '\u0633'],
            raggedRows: [['\u0627', '\u0628', '\u067e', '\u0679'], ['\u062d', '\u062f', '\u0631', '\u0633']],
            gridColumns: 4, supportsRaggedRows: false, practiceLane: true
          },
          qaFlags: []
        },
        {
          id: 'ey-mover-urdu-q2', questionNumber: 2, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 2',
          rawInstruction: '\u0645\u0646\u0627\u0633\u0628 \u0627\u0644\u0641\u0627\u0638 \u06a9\u06cc \u0645\u062f\u062f \u0633\u06d2 \u062e\u0627\u0644\u06cc \u062c\u06af\u06c1 \u067e\u0631 \u06a9\u0631\u06cc\u06ba\u06d4',
          rawContent: '\u0628   \u0627\n\u062b   \u062a\n\u062e   \u062c\n\u0631   \u0630',
          instruction: '\u0645\u0646\u0627\u0633\u0628 \u0627\u0644\u0641\u0627\u0638 \u06a9\u06cc \u0645\u062f\u062f \u0633\u06d2 \u062e\u0627\u0644\u06cc \u062c\u06af\u06c1 \u067e\u0631 \u06a9\u0631\u06cc\u06ba\u06d4',
          marks: 10, presentationType: 'MissingUrduLetterGrid',
          content: { rawSourceLayout: '\u0628   \u0627\n\u062b   \u062a\n\u062e   \u062c\n\u0631   \u0630', layoutAmbiguous: true },
          qaFlags: ['SOURCE_LAYOUT_AMBIGUOUS']
        },
        {
          id: 'ey-mover-urdu-q3', questionNumber: 3, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 3',
          rawInstruction: '\u0627 \u062a\u0627 \u0634 \u062d\u0631\u0648\u0641\u06d4 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: '\u0627 \u062a\u0627 \u0634',
          instruction: '\u0627 \u062a\u0627 \u0634 \u062d\u0631\u0648\u0641\u06d4 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 20, presentationType: 'UrduHandwritingResponse',
          content: { prompt: '\u0627 \u062a\u0627 \u0634', lineCount: 4 },
          qaFlags: []
        },
        {
          id: 'ey-mover-urdu-q4', questionNumber: 4, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 4',
          rawInstruction: '\u06a9\u0627\u0644\u0645 \u0627\u0644\u0641 \u06a9\u0648 \u06a9\u0627\u0644\u0645 \u0628 \u0633\u06d2 \u0645\u0644\u0627\u0626\u06cc\u06ba (\u0627\u06cc\u06a9 \u062c\u06cc\u0633\u06d2 \u062d\u0631\u0648\u0641 \u06a9\u0648 \u0645\u0644\u0627\u0626\u06cc\u06ba)',
          rawContent: 'Left: \u0633 \u0635 \u0639 \u0641 \u0644 \u0645 \u0646 | Right: \u0646 \u0645 \u0646 \u0635 \u0633 \u0644 \u0639',
          instruction: '\u06a9\u0627\u0644\u0645 \u0627\u0644\u0641 \u06a9\u0648 \u06a9\u0627\u0644\u0645 \u0628 \u0633\u06d2 \u0645\u0644\u0627\u0626\u06cc\u06ba (\u0627\u06cc\u06a9 \u062c\u06cc\u0633\u06d2 \u062d\u0631\u0648\u0641 \u06a9\u0648 \u0645\u0644\u0627\u0626\u06cc\u06ba)',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: '\u0633' }, { id: 'l2', text: '\u0635' }, { id: 'l3', text: '\u0639' },
              { id: 'l4', text: '\u0641' }, { id: 'l5', text: '\u0644' }, { id: 'l6', text: '\u0645' },
              { id: 'l7', text: '\u0646' }
            ],
            rightItems: [
              { id: 'r1', text: '\u0646' }, { id: 'r2', text: '\u0645' }, { id: 'r3', text: '\u0646' },
              { id: 'r4', text: '\u0635' }, { id: 'r5', text: '\u0633' }, { id: 'r6', text: '\u0644' },
              { id: 'r7', text: '\u0639' }
            ]
          },
          qaFlags: ['REPEATED_MATCHING_VALUE']
        }
      ],
      qaFlags: ['AUTHORITATIVE_HEADER_TOTAL_ABSENT', 'REPEATED_MATCHING_VALUE', 'SOURCE_LAYOUT_AMBIGUOUS'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // MOVER MATH — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-mover-math-2026',
      classStage: 'mover',
      classDisplayName: 'Mover',
      subject: 'math',
      language: 'english',
      rawTeacherSource: {
        note: 'Q1 exact 5-row grid (not odd-alternating). Q3=20 marks. Q4=10 marks, exact 7 matching rows.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Mover', subject: 'Math', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 50, hasConflict: false, conflictStatus: 'SOURCE_OK' },
      questions: [
        {
          id: 'ey-mover-math-q1', questionNumber: 1, label: 'Q1',
          rawInstruction: 'Write the missing numbers.',
          rawContent: 'Row1: 1 _ 3 _ | Row2: 5 6 _ 8 | Row3: _ 10 11 _ | Row4: 13 _ 15 _ | Row5: 17 _ 19 _',
          instruction: 'Write the missing numbers.',
          marks: 10, presentationType: 'MissingNumberGrid',
          content: {
            rows: [
              [1, null, 3, null],
              [5, 6, null, 8],
              [null, 10, 11, null],
              [13, null, 15, null],
              [17, null, 19, null]
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-mover-math-q2', questionNumber: 2, label: 'Q2',
          rawInstruction: 'Draw the pattern one by one',
          rawContent: '1. Triangle 2. Arrow 3. Circle',
          instruction: 'Draw the pattern one by one',
          marks: 10, presentationType: 'PatternCopyBlock',
          content: {
            patterns: [
              { shapeId: 'shape.triangle.v1', name: 'Triangle' },
              { shapeId: 'shape.arrow.v1', name: 'Arrow' },
              { shapeId: 'shape.circle.v1', name: 'Circle' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-mover-math-q3', questionNumber: 3, label: 'Q3',
          rawInstruction: 'Write Counting 1 to 30',
          rawContent: 'Write Counting 1 to 30',
          instruction: 'Write Counting 1 to 30',
          marks: 20, presentationType: 'CountingWritingGrid',
          content: { countTo: 30, gridColumns: 6, gridRows: 5 },
          qaFlags: []
        },
        {
          id: 'ey-mover-math-q4', questionNumber: 4, label: 'Q4',
          rawInstruction: 'Match the following.',
          rawContent: 'Left: 12 17 19 30 70 40 50 | Right: 30 40 70 19 12 50 17',
          instruction: 'Match the following.',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: '12' }, { id: 'l2', text: '17' }, { id: 'l3', text: '19' },
              { id: 'l4', text: '30' }, { id: 'l5', text: '70' }, { id: 'l6', text: '40' },
              { id: 'l7', text: '50' }
            ],
            rightItems: [
              { id: 'r1', text: '30' }, { id: 'r2', text: '40' }, { id: 'r3', text: '70' },
              { id: 'r4', text: '19' }, { id: 'r5', text: '12' }, { id: 'r6', text: '50' },
              { id: 'r7', text: '17' }
            ]
          },
          qaFlags: []
        }
      ],
      qaFlags: [],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // FLYER ENGLISH — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-flyer-english-2026',
      classStage: 'flyer',
      classDisplayName: 'Flyer',
      subject: 'english',
      language: 'english',
      rawTeacherSource: {
        note: 'Q1: 5 rows with exact spelling candidates. Q2: 5 exact prompts. Q4: exact source instruction. Q5: 7 exact matching rows L/G/P/M/R/T/N.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Flyer', subject: 'English', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 50, hasConflict: false, conflictStatus: 'SOURCE_OK' },
      questions: [
        {
          id: 'ey-flyer-eng-q1', questionNumber: 1, label: 'Q1',
          rawInstruction: 'Circle the correct spelling of the words.',
          rawContent: 'boat boal boot | Aple Appl Apple | Car Cir Cpr | ball ball bill | Dig Dog Dag',
          instruction: 'Circle the correct spelling of the words.',
          marks: 10, presentationType: 'ChoiceLetterRow',
          content: {
            rows: [
              { id: 'r1', prompt: '1.', choices: ['boat', 'boal', 'boot'] },
              { id: 'r2', prompt: '2.', choices: ['Aple', 'Appl', 'Apple'] },
              { id: 'r3', prompt: '3.', choices: ['Car', 'Cir', 'Cpr'] },
              { id: 'r4', prompt: '4.', choices: ['ball', 'ball', 'bill'] },
              { id: 'r5', prompt: '5.', choices: ['Dig', 'Dog', 'Dag'] }
            ]
          },
          qaFlags: ['DUPLICATE_CANDIDATE']
        },
        {
          id: 'ey-flyer-eng-q2', questionNumber: 2, label: 'Q2',
          rawInstruction: 'Write missing letters.',
          rawContent: '(a) Appl _ | (b) Ball _ | (c) C __r | (d) D __ g | (e) H _ n',
          instruction: 'Write missing letters.',
          marks: 10, presentationType: 'MissingLetterGrid',
          content: { items: ['Appl _', 'Ball _', 'C __r', 'D __ g', 'H _ n'] },
          qaFlags: ['AMBIGUOUS_PROMPT']
        },
        {
          id: 'ey-flyer-eng-q3', questionNumber: 3, label: 'Q3',
          rawInstruction: 'Write small letters A a to S',
          rawContent: 'Write small letters A a to S',
          instruction: 'Write small letters A a to S',
          marks: 10, presentationType: 'AlphabetWritingArea',
          content: { prompt: 'A a to S', lines: 3 },
          qaFlags: ['WORDING_AMBIGUITY']
        },
        {
          id: 'ey-flyer-eng-q4', questionNumber: 4, label: 'Q4',
          rawInstruction: 'Write Alphabets A to P',
          rawContent: 'Write Alphabets A to P',
          sourceInstruction: 'Write Alphabets A to P',
          displayInstruction: 'Write Alphabets A to P',
          displayNormalizationReason: 'Source instruction preserved exactly; capital letters not added by source',
          instruction: 'Write Alphabets A to P',
          marks: 10, presentationType: 'AlphabetWritingArea',
          content: { prompt: 'A to P', lines: 3 },
          qaFlags: []
        },
        {
          id: 'ey-flyer-eng-q5', questionNumber: 5, label: 'Q5',
          rawInstruction: 'Match the capital letters with small letters.',
          rawContent: 'L-p, G-t, P-l, M-n, R-g, T-r, N-m',
          instruction: 'Match the capital letters with small letters.',
          marks: 10, presentationType: 'VisualMatchingColumns',
          content: {
            matchType: 'text-text',
            leftItems: [
              { id: 'l1', text: 'L' }, { id: 'l2', text: 'G' }, { id: 'l3', text: 'P' },
              { id: 'l4', text: 'M' }, { id: 'l5', text: 'R' }, { id: 'l6', text: 'T' },
              { id: 'l7', text: 'N' }
            ],
            rightItems: [
              { id: 'r1', text: 'p' }, { id: 'r2', text: 't' }, { id: 'r3', text: 'l' },
              { id: 'r4', text: 'n' }, { id: 'r5', text: 'g' }, { id: 'r6', text: 'r' },
              { id: 'r7', text: 'm' }
            ]
          },
          qaFlags: []
        }
      ],
      qaFlags: ['DUPLICATE_CANDIDATE', 'AMBIGUOUS_PROMPT', 'WORDING_AMBIGUITY'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // FLYER URDU
    // ═══════════════════════════════════════
    {
      id: 'ey-flyer-urdu-2026',
      classStage: 'flyer',
      classDisplayName: 'Flyer',
      subject: 'urdu',
      language: 'urdu',
      rawTeacherSource: {
        note: 'Header total 50 vs question sum 60 — SOURCE_TOTAL_CONFLICT preserved. All question content verbatim.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Flyer', subject: 'Urdu', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 60, hasConflict: true, conflictStatus: 'SOURCE_TOTAL_CONFLICT' },
      questions: [
        {
          id: 'ey-flyer-urdu-q1', questionNumber: 1, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 1',
          rawInstruction: '\u062d\u0631\u0648\u0641 \u06a9\u0648 \u062c\u0648\u0691 \u06a9\u0631 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: '\u0627+\u0646+\u0627+\u0631 | \u0628+\u062a+\u0627+\u067e | \u0645+\u0648+\u0645 | \u0628+\u0644+\u06cc | \u06a9+\u062a+\u0627+\u0628',
          instruction: '\u062d\u0631\u0648\u0641 \u06a9\u0648 \u062c\u0648\u0691 \u06a9\u0631 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 10, presentationType: 'UrduJoinLettersExercise',
          content: {
            expressions: [
              { id: 'e1', parts: ['\u0627', '\u0646', '\u0627', '\u0631'], raw: '\u0627 + \u0646 + \u0627 + \u0631 = _______' },
              { id: 'e2', parts: ['\u0628', '\u062a', '\u0627', '\u067e'], raw: '\u0628 + \u062a + \u0627 + \u067e = _______' },
              { id: 'e3', parts: ['\u0645', '\u0648', '\u0645'], raw: '\u0645 + \u0648 + \u0645 = _______' },
              { id: 'e4', parts: ['\u0628', '\u0644', '\u06cc'], raw: '\u0628 + \u0644 + \u06cc = _______' },
              { id: 'e5', parts: ['\u06a9', '\u062a', '\u0627', '\u0628'], raw: '\u06a9 + \u062a + \u0627 + \u0628 = _______' }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-flyer-urdu-q2', questionNumber: 2, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 2',
          rawInstruction: '\u06a9\u0648\u0626\u06cc \u0633\u06d2 \u062a\u06cc\u0646 \u067e\u06be\u0644\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: '3 blank lines',
          instruction: '\u06a9\u0648\u0626\u06cc \u0633\u06d2 \u062a\u06cc\u0646 \u067e\u06be\u0644\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 20, presentationType: 'UrduHandwritingResponse',
          content: { lineCount: 3, placeholders: ['1.', '2.', '3.'] },
          qaFlags: []
        },
        {
          id: 'ey-flyer-urdu-q3', questionNumber: 3, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 3',
          rawInstruction: '\u062e\u0627\u0644\u06cc \u062c\u06af\u06c1 \u067e\u0631 \u06a9\u0631\u06cc\u06ba\u06d4',
          rawContent: '\u0627 _ \u0628 _ \u062a | \u062b _ \u062c _ \u062e',
          instruction: '\u062e\u0627\u0644\u06cc \u062c\u06af\u06c1 \u067e\u0631 \u06a9\u0631\u06cc\u06ba\u06d4',
          marks: 10, presentationType: 'MissingUrduLetterGrid',
          content: { sequences: [['\u0627', null, '\u0628', null, '\u062a'], ['\u062b', null, '\u062c', null, '\u062e']] },
          qaFlags: []
        },
        {
          id: 'ey-flyer-urdu-q4', questionNumber: 4, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 4',
          rawInstruction: '\u062d\u0631\u0648\u0641 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: '4 lines',
          instruction: '\u062d\u0631\u0648\u0641 \u062a\u06c1\u062c\u06cc \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 10, presentationType: 'UrduAlphabetWritingArea',
          content: { lineCount: 4 },
          qaFlags: []
        },
        {
          id: 'ey-flyer-urdu-q5', questionNumber: 5, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 5',
          rawInstruction: '\u06a9\u0648\u0626\u06cc \u0633\u06cc \u062a\u06cc\u0646 \u0633\u0628\u0632\u06cc\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          rawContent: '3 blank lines',
          instruction: '\u06a9\u0648\u0626\u06cc \u0633\u06cc \u062a\u06cc\u0646 \u0633\u0628\u0632\u06cc\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba\u06d4',
          marks: 5, presentationType: 'UrduHandwritingResponse',
          content: { lineCount: 3, placeholders: ['1.', '2.', '3.'] },
          qaFlags: []
        },
        {
          id: 'ey-flyer-urdu-q6', questionNumber: 6, label: '\u0633\u0648\u0627\u0644 \u0646\u0645\u0628\u0631 6',
          rawInstruction: '\u06c1\u0641\u062a\u06d2 \u06a9\u06d2 \u062f\u0646\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba (\u06a9\u0648\u0626\u06cc \u0633\u06d2 \u0686\u0627\u0631)\u06d4',
          rawContent: '4 blank lines',
          instruction: '\u06c1\u0641\u062a\u06d2 \u06a9\u06d2 \u062f\u0646\u0648\u06ba \u06a9\u06d2 \u0646\u0627\u0645 \u0644\u06a9\u06be\u06cc\u06ba (\u06a9\u0648\u0626\u06cc \u0633\u06d2 \u0686\u0627\u0631)\u06d4',
          marks: 5, presentationType: 'UrduHandwritingResponse',
          content: { lineCount: 4, placeholders: ['1.', '2.', '3.', '4.'] },
          qaFlags: []
        }
      ],
      qaFlags: ['SOURCE_TOTAL_CONFLICT'],
      status: 'SOURCE_PRESENT',
      printable: true
    },

    // ═══════════════════════════════════════
    // FLYER MATH — EXACT SOURCE REPAIR
    // ═══════════════════════════════════════
    {
      id: 'ey-flyer-math-2026',
      classStage: 'flyer',
      classDisplayName: 'Flyer',
      subject: 'math',
      language: 'english',
      rawTeacherSource: {
        note: 'Q1 raw sequence preserved exactly (ambiguous). Q2 exact 7 before-targets. Q5 exact 5 after-sequences with full context numbers.'
      },
      headerSource: {
        schoolName: 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL',
        campus: 'Sharif Chowk, Rayya Khas, Narowal',
        day: '', date: '',
        class: 'Flyer', subject: 'Math', totalMarks: 50
      },
      totalMarksSource: { headerTotal: 50, listedQuestionTotal: 50, hasConflict: false, conflictStatus: 'SOURCE_OK' },
      questions: [
        {
          id: 'ey-flyer-math-q1', questionNumber: 1, label: 'Q1',
          rawInstruction: 'Write the missing numbers',
          rawContent: '1 __3 _6 __ 9___11_ 13 _ 15__17 __20',
          instruction: 'Write the missing numbers',
          marks: 10, presentationType: 'MissingNumberGrid',
          content: { rawSourceSequence: '1 __3 _6 __ 9___11_ 13 _ 15__17 __20', layoutAmbiguous: true },
          qaFlags: ['SOURCE_LAYOUT_AMBIGUOUS']
        },
        {
          id: 'ey-flyer-math-q2', questionNumber: 2, label: 'Q2',
          rawInstruction: 'What comes before',
          rawContent: '_ 10, _ 14, _ 21, _ 8, _ 17, _ 25, _ 13',
          instruction: 'What comes before',
          marks: 10, presentationType: 'BeforeAfterGrid',
          content: {
            mode: 'before',
            items: [
              { id: 'b1', target: 10 }, { id: 'b2', target: 14 }, { id: 'b3', target: 21 },
              { id: 'b4', target: 8 },  { id: 'b5', target: 17 }, { id: 'b6', target: 25 },
              { id: 'b7', target: 13 }
            ]
          },
          qaFlags: []
        },
        {
          id: 'ey-flyer-math-q3', questionNumber: 3, label: 'Q3',
          rawInstruction: 'Write english counting 1 to 10',
          rawContent: 'Write english counting 1 to 10',
          instruction: 'Write english counting 1 to 10',
          marks: 10, presentationType: 'CountingWritingGrid',
          content: { prompt: 'Write english counting 1 to 10', countTo: 10, gridColumns: 5, gridRows: 2 },
          qaFlags: ['SEMANTIC_AMBIGUITY']
        },
        {
          id: 'ey-flyer-math-q4', questionNumber: 4, label: 'Q4',
          rawInstruction: 'Write numbers counting 1 to 50',
          rawContent: 'Write numbers counting 1 to 50',
          instruction: 'Write numbers counting 1 to 50',
          marks: 10, presentationType: 'CountingWritingGrid',
          content: { countTo: 50, gridColumns: 5, gridRows: 10 },
          qaFlags: []
        },
        {
          id: 'ey-flyer-math-q5', questionNumber: 5, label: 'Q5',
          rawInstruction: 'What comes after',
          rawContent: '13,14,15,_ | 25,26,27,_ | 29,30,31,_ | 35,36,37,_ | 47,48,49,_',
          instruction: 'What comes after',
          marks: 10, presentationType: 'BeforeAfterGrid',
          content: {
            mode: 'after-sequence',
            items: [
              { id: 'a1', sequence: [13, 14, 15], blank: true },
              { id: 'a2', sequence: [25, 26, 27], blank: true },
              { id: 'a3', sequence: [29, 30, 31], blank: true },
              { id: 'a4', sequence: [35, 36, 37], blank: true },
              { id: 'a5', sequence: [47, 48, 49], blank: true }
            ]
          },
          qaFlags: []
        }
      ],
      qaFlags: ['SEMANTIC_AMBIGUITY', 'SOURCE_LAYOUT_AMBIGUOUS'],
      status: 'SOURCE_PRESENT',
      printable: true
    }
  ]
}

const outPath = join(
  __dirname,
  'al-siddique-frontend/src/Modules/Paper-Generator/PaperEditor/earlyYears/data/early-years-first-term-2026-source-v2.json'
)

writeFileSync(outPath, JSON.stringify(v2, null, 2), 'utf8')
console.log('✓ Written:', outPath)
console.log('  Papers:', v2.papers.length)
v2.papers.forEach(p => {
  console.log(`  ${p.id}: ${p.questions.length} questions, marks=[${p.questions.map(q=>q.marks).join(',')}]`)
})
