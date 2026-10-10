import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMcqSection } from '../migration/semanticParsers/parseMcqSection.js'

const urduInline = [
  'الف) پانی کیا ہے؟',
  'الف) مائع ب) ٹھوس ج) گیس د) توانائی',
  'ب) سورج کیا ہے؟',
  'الف) ستارہ ب) سیارہ ج) چاند د) بادل',
].join('\n')

test('Urdu MCQ inline options do not become extra question headings', () => {
  const items = parseMcqSection(urduInline, { sectionId: 'urdu-qa', heading: 'معروضی سوالات', direction: 'rtl' })
  assert.equal(items.length, 2, 'two questions, not four option/question hybrids')
  assert.deepEqual(items.map(item => item.node.stemText), ['پانی کیا ہے؟', 'سورج کیا ہے؟'])
  assert.deepEqual(items.map(item => item.node.options.length), [4, 4])
  assert.equal(items[0].node.options[0].text, 'مائع')
  assert.equal(items[1].node.options[3].text, 'بادل')
})

test('numeric MCQ question boundaries and four inline English options remain intact', () => {
  const items = parseMcqSection('1. What is energy?\n(a) Work (b) Power (c) Force (d) Speed\n2) Select a unit\n(a) Joule (b) Kilogram (c) Metre (d) Second', { sectionId: 'en-qa' })
  assert.equal(items.length, 2)
  assert.deepEqual(items.map(item => item.node.options.length), [4, 4])
})
