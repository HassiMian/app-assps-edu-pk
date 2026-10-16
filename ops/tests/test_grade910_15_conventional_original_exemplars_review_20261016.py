"""15 Urdu/Pakistan Studies/Math/Physics original-unapproved exemplars: SHA/review safety."""
from __future__ import annotations
import copy
import importlib.util
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('assps_current_fifteen',ROOT/'ops/qbank/author-grade910-15-nontech-high-original-exemplars-20261016.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class FifteenResearchOnlyReviewTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not (m.STATE/'live-question-revisions.json').exists():
   raise unittest.SkipTest('Authentic School1 live revision ledger available only on protected VPS')
  cls.real=m.run()
 def test_exact_15_original_nontech_exemplars_not_approval(self):
  x=self.real
  self.assertEqual(x['candidateCount'],15)
  self.assertEqual(len(x['answers']),15)
  self.assertEqual(len({r['questionId'] for r in x['answers']}),15)
  self.assertEqual(x['productionDatabaseWrites'],0)
  self.assertEqual(x['independentQualifiedSubjectApprovalCount'],0)
  self.assertFalse(x['paperStudioVerifiedPublication'])
 def test_all_live_current_revisions_sha256_bound(self):
  self.assertTrue(all(len(x['currentLiveFullRevisionSha256'])==64 for x in self.real['answers']))
  self.assertTrue(all(len(x['originalResearchFileSHA256'])==64 for x in self.real['answers']))
 def test_five_distinct_criterion_rubrics_and_substantive_unique_examples(self):
  texts=[x['independentOriginalIllustrativeExemplarNotUniqueModelKey'] for x in self.real['answers']]
  self.assertEqual(len(set(texts)),15)
  for row in self.real['answers']:
   self.assertEqual(len(row['fivePointReviewRubricNotApprovedAnswerKey']),5)
   self.assertGreaterEqual(len(row['independentOriginalIllustrativeExemplarNotUniqueModelKey'].split()),65)
 def test_no_school_adoption_or_staff_approvals_forged(self):
  for row in self.real['answers']:
   for key in ('school2026To2027BookAdoptionAuthenticated',
    'specificPrintedTextbookExercisePageAuthenticated',
    'qualifiedSubjectIndependentTeacherApproval','qualifiedUrduLanguageTeacherApproval',
    'academicApproved','paperStudioVerifiedSelectable'):
    self.assertIs(row[key],False)
 def test_all_examples_are_multianswer_illustrations_not_single_official_keys(self):
  self.assertTrue(all(x['alternateAccurateStudentAnswersPermitted'] is True for x in self.real['answers']))
 def test_official_pakistan_constitution_primary_reference_no_fake_school_adoption(self):
  r=next(x for x in self.real['answers'] if x['questionId']=='X-PAK-UR-C03-L01')
  self.assertEqual(len(r['referenceFactCheckOfficialParliamentaryLinks']),2)
  text=r['independentOriginalIllustrativeExemplarNotUniqueModelKey']
  for year in ('1949','1956','1962','1973'):
   self.assertIn(year,text)
  self.assertFalse(r['specificPrintedTextbookExercisePageAuthenticated'])
 def test_math_truth_table_complete_four_combinations_both_mediums(self):
  for id in ('IX-MATH-C08-L01','IX-MATH-UR-C08-L01'):
   r=next(x for x in self.real['answers'] if x['questionId']==id)
   text=r['independentOriginalIllustrativeExemplarNotUniqueModelKey']
   self.assertIn('T,F,F',text.replace('،',',').replace(' ',''))
   self.assertIn('F,T,F',text.replace('،',',').replace(' ',''))
   self.assertIn('F,F,F',text.replace('،',',').replace(' ',''))
 def test_geometry_radius_must_exceed_half_segment_and_prove_equal_halves(self):
  r=next(x for x in self.real['answers'] if x['questionId']=='IX-MATH-UR-C11-L01')
  text=r['independentOriginalIllustrativeExemplarNotUniqueModelKey']
  self.assertIn('نصف لمبائی سے زیادہ',text)
  self.assertIn('AM = MB',text)
 def test_these_do_not_bypass_islamic_or_technical_stream_adoption(self):
  self.assertFalse(any('-TECH' in x['questionId'] or '-ISL-' in x['questionId'] for x in self.real['answers']))
 def test_no_model_explanations_ever_written_to_production(self):
  self.assertEqual(self.real['productionDatabaseWrites'],0)
  self.assertFalse(self.real['actualSchoolTextbookAdoptionVerified'])
 def test_original_15_source_files_preserved_not_replaced(self):
  for r in self.real['answers']:
   p=m.SEED/r['originalResearchSourceFile']
   import hashlib
   self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),r['originalResearchFileSHA256'])
 def test_changed_current_question_full_sha_denied(self):
  a=m.original_module().read_live()
  original=__import__('json').loads(m.PUBLIC.read_text())['rows']
  risks=__import__('json').loads((m.STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']
  rev={r['questionId']:r['revisionSha256'] for r in __import__('json').loads((m.STATE/'live-question-revisions.json').read_text())['records']}
  q=__import__('json').loads((m.STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']
  d=next(iter(m.DATA))
  rev[d]='f'*64
  with self.assertRaisesRegex(ValueError,'ORIGINAL_UNLINKED_HIGH_REVISION_NOT_FOUND|FROZEN_ORIGINAL_LIVE_CURRENT_ACADEMIC_REVIEW_NOT_BOUND'):
   # Live full hash also compared against original immutable risk ledger.
   m.build(a,original,risks,rev,q)
 def test_public_manifest_reproducible_current_revisions(self):
  self.assertTrue(m.OUT.exists())
  self.assertEqual(__import__('json').loads(m.OUT.read_text()),self.real)

class HermeticConventionalCandidateSourceChecks(unittest.TestCase):
 def test_offline_fixed_15_distinct_ids(self):
  self.assertEqual(len(m.DATA),15)
  self.assertEqual(len(set(m.DATA)),15)
 def test_offline_original_answer_and_rubric_depth(self):
  for id,(answer,rubric) in m.DATA.items():
   self.assertTrue(id.startswith(('IX-','X-')))
   self.assertTrue(65<=len(answer.split())<=190)
   self.assertEqual(len(rubric),5)
   self.assertTrue(all(len(x.strip())>=12 for x in rubric))
 def test_offline_math_conjunction_all_four_conditions(self):
  for id in ('IX-MATH-C08-L01','IX-MATH-UR-C08-L01'):
   text=m.DATA[id][0].replace('،',',').replace(' ','')
   self.assertTrue(all(q in text for q in ('T,T,T','T,F,F','F,T,F','F,F,F')))
 def test_offline_official_parliamentary_factcheck_not_school_adoption(self):
  links=m.CONSTITUTION_PRIMARY_EVIDENCE['X-PAK-UR-C03-L01']
  self.assertEqual(len(links),2)
  self.assertTrue(all(link.startswith('https://') for link in links))

if __name__=='__main__':unittest.main()
