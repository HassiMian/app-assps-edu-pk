"""Pure, hermetic tests: NEVER connect to live database or make HTTP calls."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import assps_unified_readiness_readonly as gate

class SafeReadOnlyUnifiedReleaseGateTests(unittest.TestCase):
    def fixture(self):
        return {x:{'pass':True} for x in (
            'database','backup','frontend','rollback','http','restricted_catalog_and_firstterm',
            'source_privacy_inventory')}
    def test_every_operational_check_passes_but_unapproved_signoff_remains_hold(self):
        e=self.fixture()
        e['frontend']['sidecar_matches']=True
        r=gate.classify(e)
        self.assertEqual(r['status'],'RELEASE_HOLD')
        self.assertTrue(r['operational_checks_pass'])
        self.assertGreaterEqual(len(r['unresolved_release_gates']),9)
        self.assertFalse(r['production_deployed_by_this_check'])
        self.assertFalse(r['safe_to_remove_timetable_ingress_quarantine'])
    def test_stale_sidecar_adds_provenance_blocker(self):
        e=self.fixture();e['frontend']['sidecar_matches']=False
        r=gate.classify(e)
        self.assertIn('active_frontend_attestation_does_not_match_served_hash',r['unresolved_release_gates'])
    def test_a_single_backup_failure_fails_operational_preflight(self):
        e=self.fixture();e['backup']['pass']=False
        r=gate.classify(e)
        self.assertFalse(r['operational_checks_pass'])
        self.assertIn('read_only_operational_preflight_failed',r['unresolved_release_gates'])
    def test_unsigned_peer_school_and_academic_bypass_is_never_accepted(self):
        e=self.fixture();e['frontend']['sidecar_matches']=True
        e['mock_tests_pass']= {'pass':True}
        r=gate.classify(e)
        self.assertIn('genuine_principal_teacher_school2_browser_auth',r['unresolved_release_gates'])
        self.assertIn('independent_59_academic_source_approvals',r['unresolved_release_gates'])
        self.assertIn('signed_runtime_hmac_actor_and_effective_rls',r['unresolved_release_gates'])
    def test_no_printer_or_offsite_false_certificate(self):
        r=gate.classify(self.fixture())
        self.assertIn('witnessed_urdu_a4_hardware_acceptance',r['unresolved_release_gates'])
        self.assertIn('offhost_decrypted_two_cluster_restore',r['unresolved_release_gates'])
        self.assertIn('public_repository_sensitive_asset_history_review',r['unresolved_release_gates'])
    def test_empty_evidence_fails_closed(self):
        r=gate.classify({})
        self.assertFalse(r['operational_checks_pass'])
        self.assertEqual(r['status'],'RELEASE_HOLD')
    def test_exact_aggregate_fields_preserve_zeros_and_firstterm_scope(self):
        records=dict(gate.BASELINES)
        lines='\n'.join(f'{k}|{v}' for k,v in records.items())
        self.assertEqual(gate.parse_aggregate(lines),records)
        self.assertEqual(records['exam9_true_zero'],224)
        self.assertEqual(records['exam9_firstterm_rows'],1853)
        self.assertEqual(records['exam8_school2_demo_rows'],1)
    def test_missing_count_is_a_failure(self):
        with self.assertRaises(ValueError):
            gate.parse_aggregate('students_total|326')
    def test_duplicate_counts_are_rejected(self):
        lines='\n'.join(f'{k}|{v}' for k,v in gate.BASELINES.items())+'\nstudents_total|326'
        with self.assertRaises(ValueError):
            gate.parse_aggregate(lines)
    def test_non_numeric_injected_sql_output_rejected(self):
        lines='\n'.join(f'{k}|{v}' for k,v in gate.BASELINES.items())+'\nROLE|admin'
        with self.assertRaises(ValueError):
            gate.parse_aggregate(lines)
    def test_db_script_is_read_only_and_does_not_change_firstterm(self):
        query=gate.READONLY_SQL.upper()
        self.assertIn('BEGIN TRANSACTION READ ONLY',query)
        for forbidden in ('DELETE FROM','INSERT INTO','UPDATE PUBLIC.','TRUNCATE ','DROP TABLE ','CREATE TRIGGER '):
            self.assertNotIn(forbidden,query)
        self.assertIn('EXAM_ID=9',query)
    def test_guard_endpoint_uses_syntactically_invalid_empty_body(self):
        self.assertTrue(all((method!='POST' or 'timetable/save' in url) for _,url,method,_ in gate.URL_EXPECTATIONS))
        self.assertTrue(all(expected==403 for key,_,_,expected in gate.URL_EXPECTATIONS if key.startswith('timetable_')))
    def test_expected_backups_include_two_postgresql_clusters(self):
        source=Path(gate.__file__).read_text()
        self.assertIn('postgres-all.sql.gz',source)
        self.assertIn('postgres-asspssigned-55432-all.sql.gz',source)
        self.assertIn("'SHA256SUMS'",source)
    def test_provenance_sidecar_not_rewritten(self):
        source=Path(gate.__file__).read_text()
        self.assertIn('sidecar_matches',source)
        self.assertNotIn('write_text(',source)
        self.assertNotIn('os.system(',source)

if __name__=='__main__':
    unittest.main()
