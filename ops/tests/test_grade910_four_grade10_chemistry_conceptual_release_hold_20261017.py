"""Four high-priority Chemistry conceptual research candidates never become lab instructions or approval."""
import copy,hashlib,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('assps_chem_four_conceptual',ROOT/'ops/qbank/author-grade10-four-safe-conceptual-chemistry-exemplars-20261017.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class OfflineChemFour(unittest.TestCase):
 def test_exact_four_existing_research_ids(self):
  self.assertEqual(set(m.ANS),{'X-CHEM-C23-L01','X-CHEM-UR-C18-L01','X-CHEM-UR-C23-L01','X-CHEM-UR-C24-L01'})
 def test_nonprocedural_stem_answer_depth(self):
  for ans,rubric in m.ANS.values():
   self.assertTrue(80<=len(ans.split())<=180)
   self.assertEqual(len(rubric),5)
   self.assertTrue(all(len(c.strip())>=17 for c in rubric))
 def test_no_operating_parameters_in_original_explanations(self):
  for ans,rubric in m.ANS.values():
   self.assertFalse(any(term in ans.lower() for term in ('°c','grams','millilit','hours','minutes','distillat','equipment list')))
 def test_nonunique_model_keys_allowed(self):
  self.assertEqual(len(set(x[0] for x in m.ANS.values())),4)
 def test_grade_x_four_english_urdu_mediums_distinct(self):
  self.assertTrue('Ethanol is an alcohol' in m.ANS['X-CHEM-C23-L01'][0])
  self.assertTrue('کاربوکسلک' in m.ANS['X-CHEM-UR-C24-L01'][0])
class ActualCurrentSchool1Chemistry(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  if not (m.STATE/'live-question-revisions.json').exists():
   raise unittest.SkipTest('actual current revisions available only on authenticated restricted VPS')
  cls.packet=m.run()
 def test_all_four_exact_live_frozen_sha(self):
  self.assertEqual(self.packet['candidateCount'],4)
  self.assertEqual(self.packet['school1LiveCurrentRevisionCount'],2411)
  self.assertEqual({x['medium'] for x in self.packet['answers']},{'english','Urdu'})
  self.assertEqual([x['medium'] for x in self.packet['answers']].count('Urdu'),3)
 def test_no_publication_reviewer_or_adoption_forgery(self):
  x=self.packet
  self.assertEqual(x['qualifiedSubjectApprovals'],0)
  self.assertEqual(x['qualifiedUrduReviews'],0)
  self.assertEqual(x['academicallyApproved'],0)
  self.assertEqual(x['paperStudioPublished'],0)
  self.assertEqual(x['school1DatabaseMutations'],0)
  self.assertEqual(x['verifiedSchoolAdoptedSourceExercisePages'],0)
  self.assertIs(x['laboratoryOperatingInstructionsIncluded'],False)
  for row in x['answers']:
   self.assertFalse(row['academicApproved'])
   self.assertFalse(row['paperStudioVerifiedSelectable'])
   self.assertFalse(row['independentChemistryFacultyRevisionApproval'])
   self.assertFalse(row['independentUrduReviewerApproval'])
   self.assertFalse(row['originalPrintedTextbookExercisePageVerified'])
   self.assertFalse(row['schoolSpecific2026To2027EditionAdopted'])
 def test_exact_original_frozen_research_bytes(self):
  for row in self.packet['answers']:
   self.assertEqual(hashlib.sha256((m.SEED/row['originalFrozenSourceFile']).read_bytes()).hexdigest(),row['frozenResearchFileSHA256'])
 def test_tamper_question_revision_fails(self):
  mod=m.source_module()
  live=mod.read_live()
  rev={r['questionId']:r['revisionSha256'] for r in json.loads((m.STATE/'live-question-revisions.json').read_text())['records']}
  risk={r['questionId']:r for r in json.loads((m.STATE/'subjective-answer-depth-risk-20261016.json').read_text())['records']}
  q={r['questionId']:r for r in json.loads((m.STATE/'live-existing-answer-proposal-crosswalk-20261016.json').read_text())['unlinkedCurrentRevisionResearchQueue']}
  frozen={r['questionId']:r for r in json.loads(m.PUB.read_text())['rows']}
  for id in m.ANS:
   q.setdefault(id,{'questionId':id,'priority':'HIGH','currentLiveRevisionSha256':rev[id],'academicallySelectable':False,'schoolStreamApplicability':'SUBJECT_BOOK_EDITION_ADOPTION_EVIDENCE_REQUIRED'})
  rev[next(iter(m.ANS))]='f'*64
  with self.assertRaisesRegex(ValueError,'CURRENT_FULL_REVISION_FROZEN_ANSWER_MISMATCH'):
   m.build(live,rev,risk,q,frozen)
 def test_generated_packet_reproducible(self):
  self.assertEqual(self.packet,json.loads(m.OUT.read_text()))
if __name__=='__main__':unittest.main()
