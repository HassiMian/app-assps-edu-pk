import test from 'node:test'
import assert from 'node:assert/strict'

import { inferOfficialSectionKind } from '../../officialSectionSemantics.js'
import { optionLabelParts } from '../../paperSystemRules.js'
import {
  buildPaperTextFlow,
  resolvePaperFontFamily,
} from '../layouts/paperWorkspaceStyleEngine.js'

test('Paper Workspace contract: Urdu option labels normalize to Urdu letters with a closing bracket', () => {
  assert.deepEqual(optionLabelParts('A', 0, true), {
    label: 'الف',
    closingBracket: ')',
    direction: 'rtl',
  })
  assert.equal(optionLabelParts('B', 1, true).label, 'ب')
  assert.equal(optionLabelParts('C', 2, true).label, 'ج')
  assert.equal(optionLabelParts('D', 3, true).label, 'د')
  assert.equal(optionLabelParts('د(', 3, true).closingBracket, ')')
})

test('Paper Workspace contract: sentence-usage sections are semantic, not generic pair tables', () => {
  assert.equal(inferOfficialSectionKind({
    heading: 'سوال نمبر 4: درج ذیل الفاظ کو جملوں میں استعمال کریں۔ (5)',
    content: '1. کتاب\n2. وطن\n3. محنت',
  }), 'sentence_usage')

  assert.equal(inferOfficialSectionKind({
    heading: 'Use the following words in sentences. (5)',
    content: '1. school\n2. honesty',
  }), 'sentence_usage')

  // Exact Class 8 Urdu recovery-paper wording.
  assert.equal(inferOfficialSectionKind({
    heading: 'سوال نمبر 4: الفاظ کو اپنے جملوں میں استعمال کریں۔ (5)',
    content: '1. کتاب\n2. وطن',
  }), 'sentence_usage')
})

test('Paper Workspace style engine applies language-specific line height and spacing', () => {
  assert.deepEqual(buildPaperTextFlow({
    isUrdu: true,
    englishLineHeight: 1.4,
    urduLineHeight: 2.7,
    letterSpacing: 1.5,
    wordSpacing: 4,
  }), {
    lineHeight: 2.7,
    letterSpacing: '1.5px',
    wordSpacing: '4px',
  })

  assert.deepEqual(buildPaperTextFlow({
    isUrdu: false,
    englishLineHeight: 1.6,
    urduLineHeight: 2.8,
    letterSpacing: 0.5,
    wordSpacing: 2,
  }), {
    lineHeight: 1.6,
    letterSpacing: '0.5px',
    wordSpacing: '2px',
  })
})

test('Paper Workspace font selection may override the Urdu default when explicitly selected', () => {
  const selected = "'Times New Roman', serif"
  assert.equal(resolvePaperFontFamily({
    isUrdu: true,
    fontFamily: selected,
  }), selected)

  assert.match(resolvePaperFontFamily({
    isUrdu: true,
    fontFamily: '',
  }), /Jameel|Nastaliq|Urdu Typesetting/i)
})
