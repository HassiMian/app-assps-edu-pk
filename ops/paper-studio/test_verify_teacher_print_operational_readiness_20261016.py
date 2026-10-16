import importlib.util
import io
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

MODULE_PATH = Path(__file__).with_name('verify_teacher_print_operational_readiness_20261016.py')
spec = importlib.util.spec_from_file_location('paper_teacher_readiness', MODULE_PATH)
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class OperationalReadinessGate(unittest.TestCase):
    def test_live_zero_fixture_fails_closed(self):
        result = gate.run_live(runner=lambda *a, **kw: SimpleNamespace(returncode=0, stdout='0|0|0|0\n0|0|0|0\n'))
        self.assertEqual(len(result['blockers']), 3)
        self.assertEqual(result['status'], 'HOLD_PAPER_TEACHER_OPERATIONAL_PRECONDITIONS')
        self.assertFalse(result['production_release_authorized'])

    def test_inactive_assignments_do_not_allow_printing(self):
        result = gate.decide(dict(zip(gate.KEYS, (50,0,2,4))))
        self.assertIn('NO_ACTIVE_TEACHER_ASSIGNMENTS',result['blockers'])

    def test_technical_positive_cannot_certify_actor_or_release(self):
        result=gate.decide(dict(zip(gate.KEYS,(3,2,1,1))))
        self.assertEqual(result['blockers'],[])
        self.assertFalse(result['authenticated_teacher_acceptance_verified'])
        self.assertFalse(result['independent_school2_denial_verified'])
        self.assertFalse(result['production_release_authorized'])

    def test_active_exceeds_total_is_invalid(self):
        with self.assertRaises(ValueError): gate.parse_counts('0|1|0|0\n0|0|0|0\n')

    def test_forged_negative_count_rejected(self):
        with self.assertRaises(ValueError): gate.parse_counts('1|-1|0|0\n0|0|0|0\n')

    def test_extra_row_or_text_rejected(self):
        for s in ('0|0|0|0\n0|0|0|0\n1|1|1|1\n','SELECT 10\n0|0|0|0\n','0|0|0|0|0','', '0.0|0|0|0'):
            with self.subTest(s=s), self.assertRaises(ValueError):gate.parse_counts(s)

    def test_extreme_counts_rejected(self):
        with self.assertRaises(ValueError):gate.parse_counts('1000000001|1|2|3\n0|0|0|0')

    def test_bool_not_a_count(self):
        c=dict(zip(gate.KEYS,(3,2,1,1)));c['active_assignment_rows']=True
        with self.assertRaises(ValueError):gate.decide(c)

    def test_no_school_authentication_or_sql_write(self):
        s=gate.SCHEMA_QUERY.upper()
        self.assertIn('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',s)
        self.assertIn('SET LOCAL ROLE APEXOS_USER',s)
        self.assertIn('ROLLBACK;',s)
        for forbidden in ('INSERT ','UPDATE ','DELETE ','ALTER ','DROP ','TRUNCATE ','GRANT ','REVOKE '):
            self.assertNotIn(forbidden,s)
        self.assertIn('-X',gate.PSQL_ARGS)
        self.assertNotIn('--password',gate.PSQL_ARGS)

    def test_readonly_query_only_exact_aggregates(self):
        executed=[]
        def fake_run(args, **kwargs):
            executed.append((args,kwargs))
            return SimpleNamespace(returncode=0,stdout='2|1|3|4\n0|0|0|0\n')
        report=gate.run_live(fake_run)
        self.assertEqual(len(executed),1)
        self.assertEqual(executed[0][0],gate.PSQL_ARGS)
        self.assertEqual(report['system_wide_physical_counts']['released_papers'],3)
        self.assertEqual(report['application_role_without_tenant_context_counts']['released_papers'],0)
        self.assertFalse(report['actual_authenticated_actor_visibility_verified'])

    def test_pg_error_is_not_reinterpreted_as_success(self):
        with self.assertRaises(RuntimeError):gate.run_live(lambda *a,**k: SimpleNamespace(returncode=2,stdout='9|9|9|9'))

    def test_timeout_is_not_success(self):
        def timeout(*args, **kwargs): raise subprocess.TimeoutExpired('psql',20)
        with self.assertRaises(subprocess.TimeoutExpired):gate.run_live(timeout)

    def test_physical_rows_not_equal_unscoped_role(self):
        physical, unscoped = gate.parse_counts('0|0|2|0\n0|0|0|0\n')
        report = gate.decide(physical, unscoped)
        self.assertEqual(report['system_wide_physical_counts']['released_papers'], 2)
        self.assertEqual(report['application_role_without_tenant_context_counts']['released_papers'], 0)
        self.assertFalse(report['production_release_authorized'])

    def test_reject_privileged_app_role_wider_than_physical(self):
        with self.assertRaises(ValueError):gate.parse_counts('0|0|2|0\n0|0|3|0\n')

    def test_receipt_rejects_external_path(self):
        with self.assertRaises(ValueError):gate.write_receipt({},'/tmp/paper-release-ready.json')

    def test_receipt_no_overwrite_and_mode_0600(self):
        with tempfile.TemporaryDirectory() as td:
            os.chmod(td,0o700)
            path=Path(td)/'isolated-receipt.json'
            with patch.object(gate,'AUDIT_DIR',Path(td)):
                gate.write_receipt({'production_release_authorized':False},str(path))
                self.assertEqual(path.stat().st_mode&0o777,0o600)
                with self.assertRaises(FileExistsError):gate.write_receipt({},str(path))
                self.assertFalse(json.loads(path.read_text())['production_release_authorized'])

    def test_receipt_rejects_world_readable_folder(self):
        with tempfile.TemporaryDirectory() as td:
            os.chmod(td,0o755)
            with patch.object(gate,'AUDIT_DIR',Path(td)):
                with self.assertRaises(ValueError):gate.write_receipt({},str(Path(td)/'unsafe.json'))


if __name__=='__main__':unittest.main()
