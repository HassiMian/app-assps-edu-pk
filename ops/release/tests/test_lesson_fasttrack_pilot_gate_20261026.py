from importlib.util import module_from_spec,spec_from_file_location
from pathlib import Path
import unittest
FILE=Path(__file__).resolve().parents[1]/'lesson_fasttrack_pilot_gate_20261026.py'
spec=spec_from_file_location('lesson_pilot',FILE)
m=module_from_spec(spec)
spec.loader.exec_module(m)
GOOD_BACKUP={'archive_sha256_manifest_verified':True,
             'restore_from_current_backup':'PASS',
             'main':{'status':'PASS','app_catalog':'PASS'},
             'signed':{'status':'PASS','app_catalog':'PASS'}}
GOOD_CDN={'sustained_evidence_pass':True,'cached_private_exposure_observed_in_any_round':False,
          'sample_rounds':5,'provider_authenticated_purge':True}
def run(**overrides):
    x=dict(guard_parity=True,route_protected=True,backup=GOOD_BACKUP,cdn=GOOD_CDN,
           real_actor=True,independent_peer=True,print_witness=True,offhost=True,
           reviewed_core=True,rollback=True,academic_approval=True)
    x.update(overrides)
    return m.evaluate(**x)
class Gate(unittest.TestCase):
    def test_positive_only_with_all_true(self):
        x=run();self.assertTrue(x['all_pilot_evidence_pass']);self.assertEqual(x['decision'],'PILOT_GO')
    def test_missing_each_independent_requirement_fails_closed(self):
        for k in ('guard_parity','route_protected','real_actor','independent_peer','print_witness','offhost',
                  'reviewed_core','rollback','academic_approval'):
            with self.subTest(k=k):self.assertEqual(run(**{k:False})['decision'],'PILOT_HOLD')
    def test_cached_leak_blocks(self):
        self.assertEqual(run(cdn={**GOOD_CDN,'cached_private_exposure_observed_in_any_round':True})['decision'],'PILOT_HOLD')
    def test_missing_authenticated_purge_blocks(self):
        self.assertEqual(run(cdn={**GOOD_CDN,'provider_authenticated_purge':False})['decision'],'PILOT_HOLD')
    def test_missing_clusted_backup_blocks(self):
        self.assertEqual(run(backup={'archive_sha256_manifest_verified':True})['decision'],'PILOT_HOLD')
    def test_short_cdn_sample_blocks(self):
        self.assertEqual(run(cdn={**GOOD_CDN,'sample_rounds':1})['decision'],'PILOT_HOLD')
    def test_malformed_evidence_blocks(self):
        self.assertEqual(run(cdn=[],backup=None)['decision'],'PILOT_HOLD')
    def test_real_actor_not_inferred_from_synthetic(self):
        x=m.evaluate(guard_parity=True,route_protected=True,backup=GOOD_BACKUP,cdn=GOOD_CDN)
        self.assertFalse(x['checks']['real_school1_teacher_principal_acceptance'])
        self.assertEqual(x['decision'],'PILOT_HOLD')
    def test_no_private_personal_fields_in_output(self):
        self.assertFalse(any(k in str(run()).lower() for k in ('password','student_name','token','cookie')))
if __name__=='__main__':unittest.main()
