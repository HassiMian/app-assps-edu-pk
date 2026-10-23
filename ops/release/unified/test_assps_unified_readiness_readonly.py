"""Pure, hermetic tests: NEVER connect to live database or make HTTP calls."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import assps_unified_readiness_readonly as gate

class SafeReadOnlyUnifiedReleaseGateTests(unittest.TestCase):
    def fixture(self):
        return {x:{'pass':True} for x in (
            'database','backup','frontend','rollback','http','backend_listener','owner_academic_authenticity','firstterm_snapshot_drift','exam9_original_immutability','owner_role_schema','live_user_provisioning_guard','live_staff_portal_guard','firstterm_forward_seal','unsigned_signed_runtime_deny','restricted_catalog_and_firstterm',
            'source_privacy_inventory','backend_source_inventory','attendance_roster_coverage',
            'fee_ledger_integrity','frontend_artifact_closure','exam_attendance_tenant_scope','academic_delivery_integrity','storage_headroom','timetable_collision_scope','lesson_coverage','cross_product_boundary','school_whatsapp_log_privacy','school_whatsapp_phone_scope')}
    def test_every_operational_check_passes_but_unapproved_signoff_remains_hold(self):
        e=self.fixture()
        e['frontend']['sidecar_matches']=True
        r=gate.classify(e)
        self.assertEqual(r['status'],'RELEASE_HOLD')
        self.assertTrue(r['operational_checks_pass'])
        self.assertGreaterEqual(len(r['unresolved_release_gates']),9)
        self.assertFalse(r['production_deployed_by_this_check'])
        self.assertFalse(r['safe_to_remove_timetable_ingress_quarantine'])
    def test_owner_schema_stays_hard_hold_when_db_owner_role_is_disallowed(self):
        evidence=self.fixture()
        evidence['owner_role_schema']['pass']=False
        result=gate.classify(evidence)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('production_users_role_check_blocks_authenticated_owner_provisioning',result['unresolved_release_gates'])

    def test_unsigned_signed_runtime_must_deny_other_school_and_school1(self):
        evidence=self.fixture()
        evidence['unsigned_signed_runtime_deny']['pass']=False
        result=gate.classify(evidence)
        self.assertIn('unsigned_runtime_can_read_another_school_or_local_marks',
                      result['unresolved_release_gates'])

    def test_future_firstterm_hmac_snapshot_mismatch_stays_hold(self):
        evidence=self.fixture()
        evidence['firstterm_forward_seal']['pass']=False
        result=gate.classify(evidence)
        self.assertIn('current_firstterm_hmac_seal_drift_or_missing',result['unresolved_release_gates'])

    def test_live_staff_portal_role_escape_blocks_release(self):
        evidence=self.fixture()
        evidence['live_staff_portal_guard']['pass']=False
        result=gate.classify(evidence)
        self.assertIn('production_staff_portal_privileged_role_provisioning_guard_missing',result['unresolved_release_gates'])

    def test_live_generic_account_privilege_escalation_guard_is_required(self):
        evidence=self.fixture()
        evidence['live_user_provisioning_guard']['pass']=False
        result=gate.classify(evidence)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('production_generic_user_creation_privilege_escalation_guard_missing',result['unresolved_release_gates'])

    def test_missing_original_immutable_trigger_blocks_release(self):
        evidence=self.fixture()
        evidence['exam9_original_immutability']['pass']=False
        result=gate.classify(evidence)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('school1_firstterm_original_immutability_trigger_or_rls_missing',result['unresolved_release_gates'])

    def test_unattributed_results_drift_blocks_release(self):
        evidence=self.fixture()
        evidence['firstterm_snapshot_drift']['pass']=False
        result=gate.classify(evidence)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('school1_firstterm_unattributed_score_or_grade_drift_requires_source_proof',result['unresolved_release_gates'])

    def test_owner_identity_or_academic_official_policy_missing_stays_hold(self):
        evidence=self.fixture()
        evidence['owner_academic_authenticity']['pass']=False
        result=gate.classify(evidence)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('owner_identity_grade_audit_and_firstterm_authority_not_verified',result['unresolved_release_gates'])

    def test_backend_offline_blocks_release_even_if_other_checks_pass(self):
        e=self.fixture()
        e['backend_listener']['pass']=False
        result=gate.classify(e)
        self.assertFalse(result['operational_checks_pass'])
        self.assertIn('active_backend_listener_or_whatsapp_syntax_uncertified',result['unresolved_release_gates'])

    def test_unscoped_live_exam_attendance_is_explicit_hold(self):
        e=self.fixture()
        e['exam_attendance_tenant_scope'].update({'live_scoped':False,'candidate_scoped':True})
        r=gate.classify(e)
        self.assertIn('active_exam_attendance_aggregate_missing_school_tenant_scope',r['unresolved_release_gates'])
        self.assertNotIn('candidate_exam_attendance_tenant_scope_regression',r['unresolved_release_gates'])
        self.assertTrue(r['operational_checks_pass'])

    def test_unscoped_candidate_attendance_blocks_release(self):
        e=self.fixture()
        e['exam_attendance_tenant_scope'].update({'live_scoped':True,'candidate_scoped':False})
        r=gate.classify(e)
        self.assertIn('candidate_exam_attendance_tenant_scope_regression',r['unresolved_release_gates'])

    def test_academic_coverage_unverified_stays_hold(self):
        e=self.fixture()
        e['academic_delivery_integrity'].update({'teacher_identity_complete':False,'teaching_sections_complete':False,'lesson_coverage_certified':False})
        r=gate.classify(e)
        for x in ('active_timetable_teacher_identity_null_for_approved_grants',
                  'unscoped_pre_nine_timetable_sections_require_reconciliation',
                  'lesson_planning_academic_publication_and_coverage_not_certified'):
            self.assertIn(x,r['unresolved_release_gates'])
        self.assertTrue(r['operational_checks_pass'])

    def test_insufficient_disk_capacity_stays_release_hold(self):
        e=self.fixture(); e['storage_headroom']['headroom_ok']=False
        r=gate.classify(e)
        self.assertIn('insufficient_space_for_safe_release_and_restore_rehearsal',r['unresolved_release_gates'])
        self.assertTrue(r['operational_checks_pass'])
    def test_inspection_failure_is_preflight_failure(self):
        e=self.fixture();e['storage_headroom']['pass']=False
        r=gate.classify(e)
        self.assertFalse(r['operational_checks_pass'])

    def test_whole_roster_unsaved_after_school_close_stays_explicit_hold(self):
        e=self.fixture()
        e['attendance_roster_coverage']['possible_post_close_full_roster_unsaved']=True
        verdict=gate.classify(e)
        self.assertIn('current_schoolday_full_attendance_roster_unsaved_after_close_requires_investigation',verdict['unresolved_release_gates'])
        self.assertTrue(verdict['operational_checks_pass'])

    def test_live_whatsapp_phone_tenant_scope_is_separate_release_hold(self):
        e=self.fixture()
        e['school_whatsapp_phone_scope']['live_school_phone_scope_hold']=True
        r=gate.classify(e)
        self.assertIn('live_school_whatsapp_signed_webhook_phone_scope_unverified',r['unresolved_release_gates'])
    def test_candidate_whatsapp_phone_tenant_scope_missing_blocks_release(self):
        e=self.fixture()
        e['school_whatsapp_phone_scope']['candidate_school_phone_scope_static_pass']=False
        r=gate.classify(e)
        self.assertIn('candidate_school_whatsapp_phone_number_scope_missing',r['unresolved_release_gates'])
    def test_missing_whatsapp_phone_boundary_evidence_fails_preflight(self):
        e=self.fixture();e.pop('school_whatsapp_phone_scope')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])

    def test_live_sensitive_whatsapp_logs_block_release(self):
        e=self.fixture()
        e['school_whatsapp_log_privacy']['live_sensitive_log_hold']=True
        self.assertIn('active_school_whatsapp_message_or_phone_logging_requires_privacy_fix',
                      gate.classify(e)['unresolved_release_gates'])
    def test_missing_whatsapp_log_privacy_evidence_breaks_operational_preflight(self):
        e=self.fixture();e.pop('school_whatsapp_log_privacy')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
    def test_unredacted_candidate_whatsapp_logs_block_release(self):
        e=self.fixture();e['school_whatsapp_log_privacy']['candidate_log_scope_pass']=False
        self.assertIn('candidate_school_whatsapp_sensitive_logs_not_redacted',
                      gate.classify(e)['unresolved_release_gates'])

    def test_active_cross_product_financial_coupling_is_release_hold(self):
        e=self.fixture()
        e['cross_product_boundary']['legacy_boundary_requires_review']=True
        r=gate.classify(e)
        self.assertTrue(r['operational_checks_pass'])
        self.assertIn('mounted_school_whatsapp_legacy_financial_coupling_requires_quarantine_evidence',r['unresolved_release_gates'])
    def test_missing_cross_product_inspection_fails_operational_gate(self):
        e=self.fixture();e.pop('cross_product_boundary')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])

    def test_missing_lesson_coverage_evidence_fails_operational_gate(self):
        e=self.fixture()
        e.pop('lesson_coverage')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
    def test_unapproved_lesson_scope_stays_release_hold(self):
        e=self.fixture()
        e['lesson_coverage']['lesson_coverage_certified']=False
        e['academic_delivery_integrity']['lesson_coverage_certified']=True
        self.assertIn('lesson_planning_academic_publication_and_coverage_not_certified',
                      gate.classify(e)['unresolved_release_gates'])

    def test_missing_teacher_occupancy_evidence_stays_hold(self):
        e=self.fixture()
        report=gate.classify(e)
        self.assertIn('active_timetable_unapproved_teacher_collisions_or_incomplete_periods',report['unresolved_release_gates'])
    def test_unapproved_teacher_collision_stays_hold(self):
        e=self.fixture();e['timetable_collision_scope']['structural_timetable_valid']=False
        r=gate.classify(e)
        self.assertTrue(r['operational_checks_pass'])
        self.assertIn('active_timetable_unapproved_teacher_collisions_or_incomplete_periods',r['unresolved_release_gates'])
    def test_valid_occupancy_omits_specific_collision_hold(self):
        e=self.fixture();e['timetable_collision_scope']['structural_timetable_valid']=True
        r=gate.classify(e)
        self.assertNotIn('active_timetable_unapproved_teacher_collisions_or_incomplete_periods',r['unresolved_release_gates'])

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
    def test_new_second_term_results_and_new_admissions_do_not_fake_corruption(self):
        grown=dict(gate.BASELINES)
        grown['students_total'] += 3
        grown['students_school1'] += 3
        grown['exam_results_total'] += 100
        grown['school1_lesson_plans'] += 12
        grown['school1_timetable'] += 60
        grown['force_enabled_public_rls'] += 2
        self.assertTrue(gate.compatible_aggregates(grown))
        self.assertEqual(grown['exam9_firstterm_rows'],1853)
    def test_loss_of_historic_student_result_or_teacher_grant_is_rejected(self):
        for key in ('students_total','students_school1','exam_results_total',
                    'exam9_firstterm_rows','exam9_true_zero','official_teacher_grants',
                    'firstterm_live_guard_triggers'):
            broken=dict(gate.BASELINES)
            broken[key]-=1
            self.assertFalse(gate.compatible_aggregates(broken),key)
    def test_extra_unapproved_teacher_grants_fail_closed(self):
        wrong=dict(gate.BASELINES)
        wrong['unauthorized_active_grants']=1
        self.assertFalse(gate.compatible_aggregates(wrong))
    def test_exam8_school2_retention_not_confused_with_school1_firstterm(self):
        wrong=dict(gate.BASELINES)
        wrong['exam8_school2_demo_rows']=0
        self.assertFalse(gate.compatible_aggregates(wrong))
        wrong=dict(gate.BASELINES)
        wrong['exam9_firstterm_rows']=1854
        self.assertFalse(gate.compatible_aggregates(wrong))

    def test_missing_or_bad_fee_integrity_blocks_operational_pass(self):
        e=self.fixture()
        e.pop('fee_ledger_integrity')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
        e=self.fixture()
        e['fee_ledger_integrity']={'pass':False,'financial_anomaly_count':1}
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
    def test_missing_attendance_coverage_evidence_fails_operational_gate(self):
        e=self.fixture()
        e.pop('attendance_roster_coverage')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
    def test_missing_backend_evidence_fails_operational_gate(self):
        e=self.fixture()
        e.pop('backend_source_inventory')
        self.assertFalse(gate.classify(e)['operational_checks_pass'])
    def test_unsafe_backend_whole_tree_copy_refused_even_if_source_tests_pass(self):
        e=self.fixture()
        e['backend_source_inventory']['whole_tree_safe']=False
        r=gate.classify(e)
        self.assertIn('backend_whole_tree_replacement_would_overwrite_or_remove_runtime_code',
                      r['unresolved_release_gates'])
        self.assertFalse(r['safe_to_remove_timetable_ingress_quarantine'])
        self.assertFalse(r['production_deployed_by_this_check'])

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
