import test from 'node:test';
import assert from 'node:assert/strict';
import {inventoryDraftDocuments, loadStarterDocuments} from './provisionalBankInventory.mjs';

const q = (id, stem, opts = {}) => ({
  id, curriculum: {grade: 9, subjectId: 'biology', edition: '2025-26'},
  chapter: {number: 1}, medium: 'english', type: 'short',
  content: {en: {stem, answer: 'A scientifically accurate answer'}},
  source: {pdfSha256: 'a'.repeat(64), page: 7},
  review: {status: 'draft', checks: {academic: false}}, ...opts
});
const doc = (file, drafts, opts = {}) => ({file, data: {publicationAllowed: false, liveImportAllowed: false, drafts, ...opts}});

test('inventories chapters and types without claiming release certification', () => {
  const report = inventoryDraftDocuments([doc('a.json', [q('1', 'Why are cells studied?'), q('2', 'How are cells classified?', {type: 'mcq', correctOptionId: 'A'})])]);
  assert.equal(report.totals.records, 2);
  assert.equal(report.totals.reviewApproved, 0);
  assert.deepEqual(report.byCohort[0].chapters, [1]);
  assert.equal(report.releaseEligible, false);
  assert.equal(report.totals.missingAnswers, 0);
});

test('detects repeated IDs and stems across separate files', () => {
  const report = inventoryDraftDocuments([
    doc('first.json', [q('1', 'Define a cell')]),
    doc('second.json', [q('1', 'Different question'), q('2', ' DEFINE   A CELL ')])
  ]);
  assert.equal(report.totals.idCollisions, 1);
  assert.equal(report.totals.semanticDuplicates, 1);
});

test('distinguishes same words across subjects and chapters', () => {
  const report = inventoryDraftDocuments([doc('a.json', [
    q('1', 'Describe this process'),
    q('2', 'Describe this process', {chapter: {number: 2}}),
    q('3', 'Describe this process', {curriculum: {grade: 9, subjectId: 'chemistry', edition: '2025-26'}})
  ])]);
  assert.equal(report.totals.semanticDuplicates, 0);
});

test('flags missing metadata and refuses publication-allowed files', () => {
  const report = inventoryDraftDocuments([doc('a.json', [q('', '', {content: {}})], {publicationAllowed: true})]);
  assert.equal(report.totals.publicationAllowedFiles, 1);
  assert.ok(report.totals.incompleteMetadata > 0);
});

test('loads real staging starter documents without mutating them', () => {
  const files = loadStarterDocuments();
  assert.ok(files.length >= 40);
  const report = inventoryDraftDocuments(files);
  assert.ok(report.totals.records >= 1000);
  assert.equal(report.totals.publicationAllowedFiles, 0);
  assert.equal(report.releaseEligible, false);
});

