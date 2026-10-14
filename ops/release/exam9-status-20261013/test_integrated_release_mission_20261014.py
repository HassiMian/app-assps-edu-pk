"""Unit tests use synthetic fixture JSON; never sign or publish a real approval."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

TARGET=Path(__file__).with_name('run_integrated_release_mission_20261014.py')
SPEC=importlib.util.spec_from_file_location('one_release_mission',TARGET)
module=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

COMPLETE={
  key:True for key in (
    'original_exam_scores_preserved','current_exam9_rows_integrity',
    'original_grade_snapshot_unchanged_or_signed_revision','pass40_F_grade_conflicts_reviewed',
    'exact_active_teacher_assignments','all_offerings_independently_approved',
    'grade_policy_explicitly_configured','active_app_runtime_signed',
    'genuine_teacher_session_and_save_reload_print',
    'independent_real_peer_school_http_denial','traffic_rollback_evidence_attached',
  )
}
SIGNED={'production_release_certified':True,'authenticated_real_staff':True,'prod_app_switched':True,'status':'SIGNED_ACTIVE_TRAFFIC'}
GOOD_HTTP={'school_saas':200,'timetable':200,'connect_report_cards_anonymous':302,'scoped_admin_approval_anonymous':401}

def simulation(gates, shadow, *, status_code=0, source_tests=False):
    def fake_run(command, **_kwargs):
        cmd=' '.join(str(x) for x in command)
        if cmd.endswith('rev-parse HEAD'):
            return 0,'candidate-sha-qa\n',''
        if cmd.endswith('status --porcelain'):
            return 0,'',''
        if 'verify_exam9_release_gate_20261014.py' in cmd:
            return status_code,json.dumps({'gates':gates,'metrics':{'exam_result_count':1762,'zero_scores':213}}),''
        if 'verify-live-signed-shadow-current-20261014.py' in cmd:
            return 0,json.dumps(shadow),''
        raise AssertionError('Unexpected run command: '+cmd)
    with patch.object(module,'run',side_effect=fake_run),patch.object(module,'http_code',side_effect=lambda url:(
        302 if 'report-cards' in url else 401 if 'academic-approvals' in url else 200)):
        return module.run_mission(with_tests=source_tests)

class IntegratedMissionFailClosedTests(unittest.TestCase):
    def test_missing_principal_or_teacher_receipts_hold_even_with_production_database(self):
        gates={**COMPLETE,'genuine_teacher_session_and_save_reload_print':False}
        result=simulation(gates,SIGNED,status_code=2)
        self.assertEqual(result['status'],'HOLD')
        self.assertIn('genuine_teacher_session_and_save_reload_print',result['blocked'])
        self.assertFalse(result['production_deployment_performed'])

    def test_shadow_not_active_traffic_cannot_be_waived_by_other_gates(self):
        result=simulation(COMPLETE,{**SIGNED,'prod_app_switched':False})
        self.assertEqual(result['status'],'HOLD')
        self.assertEqual(result['signed_runtime_verifier']['prod_app_switched'],False)

    def test_no_source_test_run_is_no_certification(self):
        result=simulation(COMPLETE,SIGNED)
        self.assertEqual(result['status'],'HOLD')
        self.assertIn('not_run',result['source_tests'])
        self.assertFalse(result['production_deployment_performed'])

    def test_official_paper_maxima_and_teacher_assignments_are_distinct_from_stored_marks(self):
        gates={**COMPLETE,'exact_active_teacher_assignments':False,
                        'all_offerings_independently_approved':False}
        result=simulation(gates,SIGNED,status_code=2)
        self.assertEqual(result['status'],'HOLD')
        self.assertEqual(result['current_metrics']['exam_result_count'],1762)
        self.assertEqual(result['current_metrics']['zero_scores'],213)
        self.assertEqual(len(result['blocked']),2)

    def test_rejects_unexpected_database_and_port(self):
        with self.assertRaises(ValueError):
            module.run_mission(database='other_school')
        with self.assertRaises(ValueError):
            module.run_mission(port=55432)

if __name__=='__main__':
    unittest.main()
