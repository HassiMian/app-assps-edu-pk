'use strict';
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { assertVerifiedPaperDocument, isInstitutionalDraftRow } = require('../services/grade910PaperWorkspaceReleaseGuard');

const UNAPPROVED_SHA = '0'.repeat(64);

function sha256(text) {
  return crypto.createHash('sha256').update(String(text || '')).digest('hex');
}

(async () => {
  console.log('=== TEST 1: Plain document without verified selections passes immediately ===');
  const res1 = await assertVerifiedPaperDocument({
    document: { metadata: { title: 'Standard Paper' } },
    schoolId: 1,
    actor: { id: 1, role: 'teacher' },
    lookup: async () => ({ rows: [] }),
    isRelease: false
  });
  assert.equal(res1.verifiedReferences, 0);
  assert.equal(res1.draftReferences, 0);
  console.log('PASS: Plain document without verified selections');

  console.log('=== TEST 2: Valid institutional draft revision save passes without publisher keys ===');
  const qStem = 'Define photosynthesis and state its importance in living organisms.';
  const qAns = 'Photosynthesis is the process by which green plants synthesize nutrients.';
  const qSha = sha256(qStem);
  const aSha = sha256(qAns);

  const mockQuestionDb = {
    id: 'bio9-q1',
    school_id: 1,
    class_level: '9th',
    subject: 'Biology',
    question_text: qStem,
    question_text_urdu: '',
    answer: qAns,
    correct_option: '',
    marks: 5,
    question_type: 'short',
    is_duplicate: false
  };

  const draftDocument = {
    metadata: {
      title: 'Class 9 Biology Pop Quiz',
      className: '9th',
      subjectName: 'Biology'
    },
    sections: [
      {
        id: 'manual-section-sec-1',
        nodes: [{ id: 'n1', content: '1. ' + qStem, operationalNodeMarks: 5 }],
        operationalSectionTotal: 5
      }
    ],
    academicVerifiedSelections: {
      schemaVersion: 'assps-grade910-canonical-approved-revisions-v1',
      alwaysRequireServerReverification: true,
      rows: [
        {
          originalQuestionId: 'bio9-q1',
          revision: 1,
          questionSha: qSha,
          answerSha: aSha,
          publicationGrantSha: UNAPPROVED_SHA,
          tier: 'institutional-draft',
          academicallyApproved: false,
          section: {
            id: 'sec-1',
            layoutPreset: 'short',
            heading: 'Q1 [Draft Candidate ?? AI Advisory]: (5 marks)',
            content: '1. ' + qStem,
            marks: 5
          },
          question: {
            id: 'bio9-q1',
            type: 'short',
            marks: 5,
            verifiedAcademicRef: {
              originalQuestionId: 'bio9-q1',
              revision: 1,
              questionSha: qSha,
              answerSha: aSha,
              publicationGrantSha: UNAPPROVED_SHA,
              grade: 9,
              subject: 'Biology',
              section: 'Usman',
              tier: 'institutional-draft',
              academicallyApproved: false
            }
          }
        }
      ]
    }
  };

  const mockLookup = async (sql, params) => {
    if (sql.includes('teacher_class_assignments')) {
      return { rows: [{ allowed: true }] };
    }
    if (sql.includes('FROM question_bank')) {
      assert.equal(params[0], 'bio9-q1');
      assert.equal(params[1], 1);
      return { rows: [mockQuestionDb] };
    }
    return { rows: [] };
  };

  // Publisher env keys NOT set:
  delete process.env.ASSPS_GRADE910_PUBLISHER_PUBLIC_KEY_PEM;
  delete process.env.ASSPS_GRADE910_PUBLISHER_TRUST_FINGERPRINT_SHA256;

  const res2 = await assertVerifiedPaperDocument({
    document: draftDocument,
    schoolId: 1,
    actor: { id: 4190, role: 'teacher' },
    lookup: mockLookup,
    isRelease: false
  });
  assert.equal(res2.draftReferences, 1);
  assert.equal(res2.verifiedReferences, 0);
  console.log('PASS: Valid institutional draft passes revision save check');

  console.log('=== TEST 3: Institutional draft cannot be finalized as an official release ===');
  await assert.rejects(
    async () => {
      await assertVerifiedPaperDocument({
        document: draftDocument,
        schoolId: 1,
        actor: { id: 4190, role: 'teacher' },
        lookup: mockLookup,
        isRelease: true // Final release
      });
    },
    { code: 'INSTITUTIONAL_DRAFT_CANNOT_BE_OFFICIALLY_RELEASED', status: 409 }
  );
  console.log('PASS: Institutional draft blocked from official release cutover');

  console.log('=== TEST 4: Forged academic approval on draft row fails closed ===');
  const forgedApprovalDoc = JSON.parse(JSON.stringify(draftDocument));
  forgedApprovalDoc.academicVerifiedSelections.rows[0].question.verifiedAcademicRef.academicallyApproved = true;
  await assert.rejects(
    async () => {
      await assertVerifiedPaperDocument({
        document: forgedApprovalDoc,
        schoolId: 1,
        actor: { id: 4190, role: 'teacher' },
        lookup: mockLookup,
        isRelease: false
      });
    },
    { code: 'DRAFT_CANNOT_CLAIM_ACADEMIC_APPROVAL', status: 409 }
  );
  console.log('PASS: Forged academic approval on draft rejected');

  console.log('=== TEST 5: Forged publication grant SHA on draft row fails closed ===');
  const forgedGrantDoc = JSON.parse(JSON.stringify(draftDocument));
  forgedGrantDoc.academicVerifiedSelections.rows[0].publicationGrantSha = 'a'.repeat(64);
  await assert.rejects(
    async () => {
      await assertVerifiedPaperDocument({
        document: forgedGrantDoc,
        schoolId: 1,
        actor: { id: 4190, role: 'teacher' },
        lookup: mockLookup,
        isRelease: false
      });
    },
    { code: 'DRAFT_CANNOT_CLAIM_PUBLICATION_GRANT', status: 409 }
  );
  console.log('PASS: Forged publication grant on draft rejected');

  console.log('=== TEST 6: Hash mismatch with question_bank fails closed ===');
  const tamperedDoc = JSON.parse(JSON.stringify(draftDocument));
  tamperedDoc.academicVerifiedSelections.rows[0].questionSha = sha256('Completely different question');
  tamperedDoc.academicVerifiedSelections.rows[0].question.verifiedAcademicRef.questionSha = tamperedDoc.academicVerifiedSelections.rows[0].questionSha;
  await assert.rejects(
    async () => {
      await assertVerifiedPaperDocument({
        document: tamperedDoc,
        schoolId: 1,
        actor: { id: 4190, role: 'teacher' },
        lookup: mockLookup,
        isRelease: false
      });
    },
    { code: 'DRAFT_QUESTION_REVISION_HASH_MISMATCH', status: 409 }
  );
  console.log('PASS: Hash mismatch against question_bank rejected');

  console.log('=== TEST 7: Teacher not assigned to section or subject is denied ===');
  const mockUnassignedLookup = async (sql) => {
    if (sql.includes('teacher_class_assignments')) {
      return { rows: [{ allowed: false }] };
    }
    return { rows: [mockQuestionDb] };
  };
  await assert.rejects(
    async () => {
      await assertVerifiedPaperDocument({
        document: draftDocument,
        schoolId: 1,
        actor: { id: 4190, role: 'teacher' },
        lookup: mockUnassignedLookup,
        isRelease: false
      });
    },
    { code: 'CERTIFIED_TEACHER_EXACT_ASSIGNMENT_REQUIRED', status: 403 }
  );
  console.log('PASS: Unassigned teacher denied draft save');

  console.log('=== ALL 7 INSTITUTIONAL DRAFT VALIDATION CONTRACT TESTS PASSED ===');
})();
