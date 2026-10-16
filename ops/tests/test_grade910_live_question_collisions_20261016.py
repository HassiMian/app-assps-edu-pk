import importlib.util
import tempfile
import unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'qbank/audit-grade910-live-question-collisions-20261016.py'
spec=importlib.util.spec_from_file_location('livecollisions',P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def rows():
    # 2411 isolated metadata buckets: no quadratic scanning in hermetic tests.
    return [{'id':f'IX-TEST-{i}','grade':'9th','subject':f'Subject-{i}',
             'chapter':1,'type':'short','medium':'English',
             'stem':f'Which scientific property describes the element numbered {i} in the independent experiment?',
             'answer':'Placeholder for machine-only test','approved':False}
            for i in range(2411)]
def same_bucket(x,y):
    y.update({k:x[k] for k in ('grade','subject','chapter','type','medium')})
class LiveCollisionSafety(unittest.TestCase):
 def test_unmodified_unique_bank_has_no_duplicate(self):
    r=m.audit(rows())
    self.assertEqual(r['exactStemCollisionGroups'],0)
    self.assertEqual(r['possibleNearStemReviewPairs'],0)
    self.assertEqual(r['approvedQuestions'],0)
 def test_whitespace_and_punctuation_exact_duplicated_stems_produce_ids_not_content(self):
    x=rows();same_bucket(x[0],x[1])
    x[1]['stem']=x[0]['stem'].upper().replace('?', ' ! ')
    r=m.audit(x)
    self.assertEqual(r['exactStemCollisionGroups'],1)
    self.assertEqual(r['exactCollisionGroupsIdOnly'][0]['ids'],['IX-TEST-0','IX-TEST-1'])
    self.assertTrue(r['questionTextOrAnswersPersisted'] is False)
 def test_identical_stem_different_answer_is_unresolved_conflict(self):
    x=rows();same_bucket(x[0],x[1])
    x[1]['stem']=x[0]['stem'];x[1]['answer']='Contradictory test answer'
    r=m.audit(x)
    self.assertEqual(r['exactStemDifferentAnswerGroups'],1)
    self.assertEqual(r['academicallyConfirmedDuplicates'],0)
 def test_number_20_and_30_are_never_collapsed(self):
    x=rows();same_bucket(x[0],x[1])
    x[0]['stem']='Calculate the force from mass 20 kg at acceleration 2 m per second squared.'
    x[1]['stem']='Calculate the force from mass 30 kg at acceleration 2 m per second squared.'
    r=m.audit(x)
    self.assertEqual(r['possibleNearStemReviewPairs'],0)
    self.assertGreaterEqual(r['meaningfulNumericOrQualifierContrastPairsExcluded'],1)
 def test_chemistry_charge_signs_must_not_be_equated(self):
    self.assertTrue(m.changes_meaning('Determine charge Na + in the molecule','Determine charge Na - in the molecule'))
 def test_positive_vs_zero_discriminant_not_duplicate(self):
    self.assertTrue(m.changes_meaning('What does a positive discriminant indicate for the quadratic roots?',
                 'What does a zero discriminant indicate for the quadratic roots?'))
 def test_qualifier_safe_near_matches_are_only_advisory(self):
    x=rows();same_bucket(x[0],x[1])
    x[0]['stem']='Explain how the biological cell membrane regulates diffusion in living organisms during the process.'
    x[1]['stem']='Explain how the biological cell membrane regulates diffusion for living organisms during this process.'
    r=m.audit(x)
    self.assertEqual(r['possibleNearStemReviewPairs'],1)
    self.assertFalse(r['nearStemIdsAndScoresOnly'][0]['independentReviewerApproved'])
 def test_strict_duplicate_stable_id_is_blocked(self):
    x=rows();x[1]['id']=x[0]['id']
    with self.assertRaises(ValueError):m.audit(x)
 def test_private_receipt_0600(self):
    with tempfile.TemporaryDirectory() as d:
        p=Path(d)/'private'/'receipt.json'
        m.save(p,{'published':False})
        self.assertEqual(p.stat().st_mode&0o777,0o600)
if __name__=='__main__':unittest.main()
