"""Matric-Tech 137 original/current revision catalog metadata and no-publication guards."""
import copy,importlib.util,json,unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[2]
p=BASE/'ops/qbank/build-grade910-tech137-adoption-metadata-proof-20261017.py'
spec=importlib.util.spec_from_file_location('tech137_meta',p)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Offline(unittest.TestCase):
 def test_exact_grade_subject_scope(self):
  self.assertEqual(sum(m.EXPECTED.values()),137)
  self.assertEqual(len(m.EXPECTED),10)
 def test_no_implicit_teacher_review_or_syllabus_adoption(self):
  self.assertIn('adoption',m.OUTPUT.name.lower())
 def test_absent_private_data_does_not_create_a_fake_review(self):
  with self.assertRaises((ValueError,KeyError)):
   m.assess({}, {}, {}, {}, {})
class ProtectedCurrentReadOnly(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not (m.PRIVATE/'live-question-revisions.json').exists():
   raise unittest.SkipTest('Actual School 1 source SHA ledgers only on protected VPS')
  cls.paths=[m.ROOT/'docs/question-bank/ASSPS_GRADE910_2581_PUBLIC_SAFE_REVIEW_CROSSWALK_20261015.json',
   m.PRIVATE/'live-existing-answer-proposal-crosswalk-20261016.json',
   m.PRIVATE/'live-question-revisions.json',
   m.SEED/'officialSourceManifest.json',
   m.PRIVATE/'physical-page-count.json']
  cls.args=[json.loads(x.read_text()) for x in cls.paths]
  cls.result=m.assess(*cls.args)
 def altered(self,index,edit):
  args=copy.deepcopy(self.args)
  edit(args[index])
  return m.assess(*args)
 def test_137_full_sha_and_15_attested_source_documents(self):
  self.assertEqual(self.result['currentQuestionRevisionsPinned'],137)
  self.assertEqual(self.result['previouslyAttestedCatalogDocuments'],15)
  self.assertEqual(len({x['questionId'] for x in self.result['records']}),137)
 def test_53_possible_pairs_not_translations(self):
  self.assertEqual(len(self.result['candidatePairs']),53)
  self.assertTrue(all(x['realTranslationEquivalenceReviewed'] is False for x in self.result['candidatePairs']))
 def test_26_2026_27_111_unspecified(self):
  self.assertEqual(self.result['explicitCatalogSession2026_27Only'],26)
  self.assertEqual(self.result['catalogSessionNotStated'],111)
  self.assertEqual(self.result['catalogMediumNotStated'],29)
 def test_no_approvals_syllabus_or_database_writes(self):
  for name in ('realSchoolTechAdoptions','qualifiedAcademicApprovals',
               'realPrintedExerciseProof','publishedVerifiedQuestions','productionDatabaseWrites'):
   self.assertEqual(self.result[name],0)
  self.assertFalse(self.result['questionAnswerTextReadOrCopied'])
 def test_publication_false_per_revision(self):
  for x in self.result['records']:
   for flag in ('actualSchoolProgrammeAdoption','actualSchoolBookEditionApproval',
                'actualPrintedExerciseQuestionPageVerified','qualifiedSubjectReviewerApproved',
                'bilingualEquivalentApproved','paperStudioVerifiedSelectable'):
    self.assertFalse(x[flag])
 def test_output_root_private_and_reproducible(self):
  self.assertEqual(m.OUTPUT.stat().st_mode&0o777,0o600)
  self.assertEqual(self.result,json.loads(m.OUTPUT.read_text()))
 def test_wrong_current_live_revision_is_refused(self):
  with self.assertRaisesRegex(ValueError,'REVISION_DRIFT'):
   self.altered(2,lambda x:next(z for z in x['records'] if z['questionId']=='X-BIO-TECH-C01-L01').update(revisionSha256='f'*64))
 def test_duplicate_research_question_is_refused(self):
  with self.assertRaisesRegex(ValueError,'SOURCE_KEYS'):
   self.altered(0,lambda x:x['rows'].__getitem__(0).update(questionId=x['rows'][1]['questionId']))
 def test_catalog_session_impersonation_refused(self):
  def altered(x):
   next(z for z in x['entries'] if z['recordId']=='pectaa-catalog-062').update(edition='CURRENT_CATALOG_LABEL_NO_SESSION')
  with self.assertRaisesRegex(ValueError,'CATALOG_SESSION_COUNTS_CHANGED'):
   self.altered(3,altered)
 def test_fake_prior_source_pdf_hash_refused(self):
  with self.assertRaisesRegex(ValueError,'ATTESTED_PECTAA_SOURCE_DRIFT'):
   self.altered(4,lambda x:next(z for z in x['assets'] if z['catalog']=='pectaa-catalog-035').update(originalPdfBytesHashMatches=False))
 def test_fake_original_human_review_refused(self):
  def altered(x):
   x['rows'].__iter__().__next__()['independentHumanAccuracyReview']=True
   next(z for z in x['rows'] if z['questionId']=='X-BIO-TECH-C01-L01').update(independentHumanAccuracyReview=True)
  with self.assertRaisesRegex(ValueError,'REVISION_DRIFT'):
   self.altered(0,altered)
 def test_mark_question_selectable_refused(self):
  with self.assertRaisesRegex(ValueError,'REVISION_DRIFT'):
   self.altered(0,lambda x:next(z for z in x['rows'] if z['questionId']=='X-BIO-TECH-C01-L01').update(paperStudioSelectable=True))
if __name__=='__main__':unittest.main()
