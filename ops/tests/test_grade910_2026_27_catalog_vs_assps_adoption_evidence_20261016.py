"""Hermetic publisher-catalog vs school-1 institutional-adoption evidence guards."""
from __future__ import annotations
import copy,hashlib,importlib.util,json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
sp=importlib.util.spec_from_file_location('assps_official_session_gate',
 ROOT/'ops/qbank/build-grade910-session-adoption-evidence-gate-20261016.py')
m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
class Grade910SessionAdoptionEvidence(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.mb=m.MANIFEST.read_bytes()
  cls.ob=m.ORIGINAL.read_bytes()
  cls.manifest=json.loads(cls.mb)
  cls.original=json.loads(cls.ob)
  frozen=cls.original['rows']
  cls.synthetic_live={'records':[{'questionId':x['questionId'],
   'revisionSha256':hashlib.sha256(str(x['questionId']).encode()).hexdigest()}
   for x in frozen[:2411]]}
  cls.no_school_evidence={'schema':'ASSPS_SCHOOL1_VERSIONED_ADOPTION_EVIDENCE_INVENTORY_V1',
   'schoolId':1,'counts':{k:0 for k in ('sessionVersions','curriculumProfileVersions',
    'resourceBooks','resourceVersions','learningScopeVersions','schoolAcademicApprovalEvents')},
   'schoolEditionAdoptionVerifiedByThisAudit':False,'approvedForCurrentAcademicSession':False,
   'academicQuestionApprovalGained':0,'studentOrQuestionDbWrites':0}
 def compile(self,manifest=None,original=None,adoption=None,live=None):
  return m.compile_evidence(manifest if manifest is not None else self.manifest,
   original if original is not None else self.original,
   adoption if adoption is not None else self.no_school_evidence,
   live if live is not None else self.synthetic_live,
   hashlib.sha256(self.mb).hexdigest(),hashlib.sha256(self.ob).hexdigest())
 def test_all_frozen_2581_map_to_111_public_catalog_entries(self):
  x=self.compile()
  self.assertEqual(x['originalResearchCount'],2581)
  self.assertEqual(x['actualLiveFullQuestionRevisionCount'],2411)
  self.assertEqual(x['heldOriginalOnlyCount'],170)
  self.assertEqual(x['allPublicCatalogs'],111)
  self.assertEqual(x['catalogsReferencedByFrozenResearch'],56)
 def test_2026_27_599_catalog_claims_are_not_school_adoption(self):
  x=self.compile()
  c=x['candidateCountByEvidenceLane']
  self.assertEqual(c['PUBLIC_LABEL_2026_27_NOT_ASSPS_ADOPTION'],599)
  self.assertEqual(c['EARLIER_PRINTED_EDITION_MUST_CONFIRM_SESSION'],1040)
  self.assertEqual(c['UNSPECIFIED_OR_DATE_LINK_REQUIRES_INDEPENDENT_ADOPTION'],942)
  self.assertEqual(sum(c.values()),2581)
  self.assertTrue(x['thePublic2026_27CatalogDoesNotAuthenticateASSPSAdoption'])
 def test_grade9_2026_alp_does_not_automatically_apply_to_2027(self):
  x=self.compile()
  self.assertEqual(x['grade9RevisedALPAppliesToAnnualExamYear'],2026)
  self.assertFalse(x['grade9RevisedALPAutomaticallyAppliesTo2027'])
  self.assertEqual(x['academicSessionUnderReview'],'2026-27')
 def test_missing_original_grade_label_is_not_silently_filled(self):
  x=self.compile()
  self.assertEqual(len(x['missingGradeClaimOriginalResearchIDs']),44)
  self.assertEqual(x['gradeConflictIDs'],[])
 def test_unknown_public_source_record_rejected(self):
  a=copy.deepcopy(self.original)
  a['rows'][0]['sourceCatalogId']='made-up-fake-pectaa'
  with self.assertRaisesRegex(ValueError,'SOURCE_CATALOG_MAPPING_OR_ADOPTION_CLAIM_INVALID'):
   self.compile(original=a)
 def test_forged_school_edition_approval_rejected(self):
  a=copy.deepcopy(self.no_school_evidence)
  a['schoolEditionAdoptionVerifiedByThisAudit']=True
  with self.assertRaisesRegex(ValueError,'INVALID_OR_FABRICATED_SCHOOL_ADOPTION'):
   self.compile(adoption=a)
 def test_published_frozen_candidate_rejected(self):
  a=copy.deepcopy(self.original);a['rows'][0]['published']=True
  with self.assertRaisesRegex(ValueError,'SOURCE_CATALOG_MAPPING_OR_ADOPTION_CLAIM_INVALID'):
   self.compile(original=a)
 def test_live_hash_record_duplication_rejected(self):
  a=copy.deepcopy(self.synthetic_live)
  a['records'][1]['questionId']=a['records'][0]['questionId']
  with self.assertRaisesRegex(ValueError,'LIVE_QUESTION_REVISION_ID_COLLISION'):
   self.compile(live=a)
 def test_public_report_contains_no_raw_questions(self):
  x=self.compile()
  text=m.report_text(x)
  self.assertIn('2026',text)
  self.assertIn('2,581',text)
  self.assertIn('Authentic',text)
  self.assertNotIn('originalIllustrativeParagraphNotUniqueAnswer',text)
  self.assertNotIn('schoolAdoptionVerified: true',text)
 def test_all_sources_would_still_be_unapproved(self):
  x=self.compile()
  for r in x['publisherCatalogRecordsWithFrozenResearch']:
   self.assertFalse(r['academicallyApproved'])
   self.assertFalse(r['paperStudioVerifiedSelectable'])
   self.assertFalse(r['school2026_27EditionAdoptionAuthenticated'])
  self.assertEqual(x['academicallyPublishedQuestions'],0)
  self.assertEqual(x['qualifiedIndependentSubjectAndLanguageReviewsAuthenticated'],0)
  self.assertEqual(x['productionQuestionOrStudentDatabaseWrites'],0)
if __name__=='__main__':unittest.main()
