"""Regression tests: a staged principal name or forged approval must never greenlight release."""
import importlib.util
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
from unittest import TestCase, main
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    'exam9_preflight', Path(__file__).with_name('verify_exam9_release_gate_20261014.py'))
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)

BASE = {
    'exam_result_count':301,'zero_scores':36,'teacher_assignments':75,
    'active_cohorts':13,'unmapped_cohorts':2,'invalid_assignments':0,
    'duplicate_assignment_grants':0,'exam_subjects':81,'maxima_configured':81,
    'grade_bands':0,'app_signed_guards':0,
    'invalid_bounds':0,'duplicate_scores':0,
    'F_grade_at_40_to_49_pct':42,'original_301_rows':301,
    'original_301_zeros':36,'original_301_scores_digest':'bcdc098a3e6cabb6f4c31736b14e39b9',
    'original_301_digest':'0376ec1d25555b0dfc963857564b36aa'
}
APPROVAL = ['approval_status','approval_revision','approved_by_user_id','approved_at']

class ReleaseGateTests(TestCase):
    def check(self, metrics, columns, reviewed):
        output = io.StringIO()
        response = [metrics, columns] + ([{'valid':reviewed}] if len(columns)==4 else [])
        with patch.object(MOD,'run',side_effect=response), patch('sys.argv',['gate']), redirect_stdout(output):
            exit_code = MOD.main()
        return exit_code,json.loads(output.getvalue())

    def test_rejects_qa_eighty_one_invalid_reviewers(self):
        code, r = self.check(BASE, APPROVAL, 0)
        self.assertEqual(code,2)
        self.assertEqual(r['verdict'],'HOLD')
        self.assertFalse(r['gates']['all_offerings_independently_approved'])
        self.assertFalse(r['gates']['exact_active_teacher_assignments'])

    def test_rejects_missing_approval_migration(self):
        code,r = self.check({**BASE,'teacher_assignments':0,'maxima_configured':0},[],0)
        self.assertEqual(code,2)
        self.assertFalse(r['metrics']['approval_schema_complete'])

    def test_even_valid_approvals_are_not_human_http_acceptance(self):
        complete = {**BASE,'unmapped_cohorts':0,'grade_bands':6,'app_signed_guards':77}
        code,r = self.check(complete,APPROVAL,81)
        self.assertEqual(code,2)
        self.assertTrue(r['gates']['all_offerings_independently_approved'])
        self.assertTrue(r['gates']['exact_active_teacher_assignments'])
        self.assertFalse(r['gates']['genuine_teacher_session_and_save_reload_print'])
        self.assertFalse(r['gates']['independent_real_peer_school_http_denial'])
        self.assertFalse(r['gates']['traffic_rollback_evidence_attached'])

    def test_live_growth_preserves_original_numeric_scores(self):
        live={**BASE,'exam_result_count':1588,'zero_scores':203,
              'F_grade_at_40_to_49_pct':0,'grade_bands':6,
              'original_301_digest':'0e0115e1bdafa8c56edb174da6241f3a'}
        code,result=self.check(live,[],0)
        self.assertEqual(code,2)
        self.assertTrue(result['gates']['original_exam_scores_preserved'])
        self.assertTrue(result['gates']['current_exam9_rows_integrity'])
        self.assertFalse(result['gates']['original_grade_snapshot_unchanged_or_signed_revision'])
        self.assertTrue(result['gates']['pass40_F_grade_conflicts_reviewed'])

    def test_rejects_numeric_grade_or_maximum_tampering(self):
        changed={**BASE,'original_301_scores_digest':'changed'}
        code,result=self.check(changed,APPROVAL,0)
        self.assertEqual(code,2)
        self.assertFalse(result['gates']['original_exam_scores_preserved'])

    def test_grade_f_conflicts_with_40_percent_pass(self):
        code,result=self.check(BASE,APPROVAL,0)
        self.assertEqual(code,2)
        self.assertFalse(result['gates']['pass40_F_grade_conflicts_reviewed'])

if __name__=='__main__':
    main()
