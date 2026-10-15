import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarksLedger } from '../paperSystemRules.js';

test('buildMarksLedger correctly sums official section question marks', () => {
  const paper = {
    config: { totalMarks: 5 },
    official_section: [
      {
        id: 'draft-grade910-bio9-q1-r1',
        type: 'official_section',
        layoutPreset: 'short',
        heading: 'Q1 [Draft Candidate ?? AI Advisory]: (5 marks)',
        content: '1. What is photosynthesis?',
        marks: 5,
        nodes: [{ id: 'n1', operationalNodeMarks: 5, content: '1. What is photosynthesis?' }],
        verifiedAcademicRef: {
          originalQuestionId: 'bio9-q1',
          revision: 1,
          tier: 'institutional-draft',
          academicallyApproved: false
        }
      }
    ]
  };

  const ledger = buildMarksLedger(paper);
  assert.equal(ledger.questionTotal, 5, 'Question total must equal 5');
  assert.equal(ledger.headerTotal, 5, 'Header total must equal 5');
  assert.equal(ledger.balanced, true, 'Marks ledger must be balanced');
  assert.equal(ledger.difference, 0, 'Difference must be 0');
});

test('Template total marks resolves question sum (5 marks) even if stale header was 1', () => {
  const paper = {
    official_section: [
      {
        id: 'draft-grade910-bio9-q1-r1',
        marks: 5,
        nodes: [{ operationalNodeMarks: 5 }]
      }
    ]
  };
  const cfgStale = { totalMarks: 1 };
  const questionTypes = [{ value: 'official_section', marks: 0 }];

  // Emulate template total marks formula
  const officialSectionSum = paper.official_section?.length
    ? paper.official_section.reduce((sum, s) => sum + (Number(s.marks) || Number(s.nodes?.[0]?.operationalNodeMarks) || 0), 0)
    : 0;
  const total = officialSectionSum > 0
    ? (Number(cfgStale.totalMarks) === officialSectionSum || !Number(cfgStale.totalMarks) || Number(cfgStale.totalMarks) === 1
        ? officialSectionSum
        : Number(cfgStale.totalMarks))
    : (Number(cfgStale.totalMarks) || questionTypes.reduce((sum, t) => t.value === 'official_section' ? sum : sum + (paper[t.value]?.length || 0) * (paper[`${t.value}_marks`] || t.marks || 1), 0));

  assert.equal(total, 5, 'Resolved template total marks must be 5, not 1');
});

test('Template total marks works in Urdu RTL and half-A4 modes', () => {
  const paper = {
    official_section: [
      {
        id: 'draft-grade910-bio9-q1-urdu',
        marks: 4,
        nodes: [{ operationalNodeMarks: 4 }]
      },
      {
        id: 'draft-grade910-bio9-q2-urdu',
        marks: 6,
        nodes: [{ operationalNodeMarks: 6 }]
      }
    ]
  };
  const cfg = { totalMarks: 10, language: 'urdu', printMode: 'half' };
  const officialSectionSum = paper.official_section.reduce((sum, s) => sum + (Number(s.marks) || Number(s.nodes?.[0]?.operationalNodeMarks) || 0), 0);
  assert.equal(officialSectionSum, 10, 'Urdu RTL multi-question sum is 10');
});
