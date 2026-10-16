import importlib.util
import tempfile
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'qbank/audit-school1-versioned-textbook-adoption-20261016.py'
s=importlib.util.spec_from_file_location('adoption',P)
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def sample(n=0):
 return {k:n for k in ['sessionVersions','curriculumProfileVersions','resourceBooks','resourceVersions','learningScopeVersions','schoolAcademicApprovalEvents']}
class AdoptionChainSafety(unittest.TestCase):
 def test_zero_version_records_cannot_certify_assps_adoption(self):
  x=m.interpret(sample())
  self.assertFalse(x['potentialVersionedAdoptionMappingToReview'])
  self.assertFalse(x['schoolEditionAdoptionVerifiedByThisAudit'])
  self.assertFalse(x['approvedForCurrentAcademicSession'])
 def test_even_populated_rows_not_automatically_authentic_school_adoption(self):
  x=m.interpret(sample(1))
  self.assertTrue(x['potentialVersionedAdoptionMappingToReview'])
  self.assertFalse(x['schoolEditionAdoptionVerifiedByThisAudit'])
  self.assertEqual(x['academicQuestionApprovalGained'],0)
 def test_partial_chain_does_not_synthesize_missing_links(self):
  x=m.interpret({**sample(),'resourceVersions':1})
  self.assertFalse(x['potentialVersionedAdoptionMappingToReview'])
 def test_malformed_negative_counts_fail(self):
  with self.assertRaises(ValueError):m.interpret({**sample(),'resourceVersions':-1})
 def test_missing_schema_field_fails(self):
  with self.assertRaises(ValueError):m.interpret({'sessionVersions':3})
 def test_0600_evidence_permissions(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t)/'private'/'receipt.json'
   m.save(p,m.interpret(sample()))
   self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
