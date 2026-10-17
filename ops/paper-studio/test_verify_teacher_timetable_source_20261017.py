import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

f=Path(__file__).with_name('verify_teacher_timetable_source_20261017.py')
spec=importlib.util.spec_from_file_location('safe_teacher_timetable_preflight',f)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)


def fixture():
    return dict(zip(mod.COUNTS,(58,43,0,0,58,58,43,56,0,0)))

class TeacherScopeProvenance(unittest.TestCase):
    def test_live_58_43_unreviewed_is_hold(self):
        result=mod.interpret(fixture())
        self.assertEqual(result['status'],'HOLD_TEACHER_PRINT_ROLLOUT')
        self.assertIn('TIMETABLE_TEACHER_IDS_NOT_INDEPENDENTLY_REVIEWED',result['blockers'])
        self.assertIn('NO_ACTIVE_EXPLICIT_TEACHER_PRINT_ASSIGNMENTS',result['blockers'])
        self.assertFalse(result['production_release_authorized'])

    def test_replay_approved_row_counts_still_cannot_authorize_release(self):
        c=fixture();c.update(timetable_reviewed_staff_identity=43,timetable_unreviewed_linked_identity=0,
                              teacher_assignment_rows=5,teacher_assignment_active_rows=5)
        report=mod.interpret(c)
        self.assertEqual(report['blockers'],[])
        self.assertFalse(report['timetable_automatically_grants_print_access'])
        self.assertFalse(report['authenticated_teacher_acl_verified'])
        self.assertFalse(report['production_release_authorized'])

    def test_teacher_id_without_staff_review_is_not_grant(self):
        c=fixture();c.update(teacher_assignment_rows=43,teacher_assignment_active_rows=43)
        report=mod.interpret(c)
        self.assertIn('TIMETABLE_TEACHER_IDS_NOT_INDEPENDENTLY_REVIEWED',report['blockers'])

    def test_no_timetable_rows_is_hold(self):
        c=dict.fromkeys(mod.COUNTS,0)
        self.assertIn('NO_TIMETABLE_SOURCE',mod.interpret(c)['blockers'])

    def test_tenantless_timetable_is_hold(self):
        c=fixture();c['timetable_missing_school_id']=1
        self.assertIn('TIMETABLE_HAS_UNSCOPED_TENANT_ROWS',mod.interpret(c)['blockers'])

    def test_unsigned_provenance_is_hold(self):
        c=fixture();c['timetable_source_sha256']=57
        self.assertIn('TIMETABLE_HAS_UNFINGERPRINTED_ROWS',mod.interpret(c)['blockers'])

    def test_unsessioned_timetable_is_hold(self):
        c=fixture();c['timetable_academic_session']=57
        self.assertIn('TIMETABLE_HAS_SESSIONLESS_ROWS',mod.interpret(c)['blockers'])

    def test_reviewed_plus_unreviewed_must_match_linked(self):
        c=fixture();c['timetable_reviewed_staff_identity']=1
        with self.assertRaises(ValueError):mod.interpret(c)

    def test_active_assignment_cannot_exceed_total(self):
        c=fixture();c['teacher_assignment_active_rows']=1
        with self.assertRaises(ValueError):mod.interpret(c)

    def test_untrusted_type_bool_rejected(self):
        c=fixture();c['timetable_reviewed_staff_identity']=True
        with self.assertRaises(ValueError):mod.interpret(c)

    def test_negative_numbers_rejected(self):
        c=fixture();c['teacher_assignment_rows']=-1
        with self.assertRaises(ValueError):mod.interpret(c)

    def test_parser_exact_ten_cells(self):
        self.assertEqual(mod.parse_counts('58|43|0|0|58|58|43|56|0|0\n'),fixture())
        for broken in ('', '58|43|0|0|58|58|43|56|0',
                       '58|43|0|0|58|58|43|56|0|0\n0|0|0|0|0|0|0|0|0|0',
                       '58|43|0|0|58|58|43|56|0|-1','1|2|3|4|5|6|7|8|9|NaN'):
            with self.subTest(broken=broken),self.assertRaises(ValueError):mod.parse_counts(broken)

    def test_read_only_sql_no_principal_impersonation(self):
        s=mod.SQL.upper()
        self.assertIn('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;',s)
        self.assertIn('ROLLBACK;',s)
        self.assertIn('STAFF_IDENTITY_REVIEWED',s)
        for bad in ('INSERT ','UPDATE ','DELETE ','ALTER ','GRANT ','REVOKE ','TRUNCATE ','DROP '):
            with self.subTest(bad=bad):self.assertNotIn(bad,s)
        self.assertIn('-X',mod.PSQL)

    def test_live_runner_uses_only_one_readonly_query(self):
        calls=[]
        def fake(args,**kwargs):
            calls.append(args)
            return SimpleNamespace(returncode=0,stdout='58|43|0|0|58|58|43|56|0|0\n')
        result=mod.live(fake)
        self.assertEqual(calls,[mod.PSQL])
        self.assertIn('NO_ACTIVE_EXPLICIT_TEACHER_PRINT_ASSIGNMENTS',result['blockers'])

    def test_db_error_never_passed(self):
        with self.assertRaises(RuntimeError):mod.live(lambda *a,**k:SimpleNamespace(returncode=1,stdout='58|43|0|0|58|58|43|56|0|0'))

    def test_timeout_never_passed(self):
        def fail(*a,**kw):raise subprocess.TimeoutExpired('psql',18)
        with self.assertRaises(subprocess.TimeoutExpired):mod.live(fail)

    def test_private_receipt_is_mode_0600_and_noclobber(self):
        with tempfile.TemporaryDirectory() as path:
            os.chmod(path,0o700)
            target=Path(path)/'safe-source-proof.json'
            with patch.object(mod,'PRIVATE_DIR',Path(path)):
                mod.write_receipt({'production_release_authorized':False},str(target))
                self.assertEqual(target.stat().st_mode&0o777,0o600)
                with self.assertRaises(FileExistsError):mod.write_receipt({},str(target))
                self.assertFalse(json.loads(target.read_text())['production_release_authorized'])

    def test_unrestricted_folder_rejected(self):
        with tempfile.TemporaryDirectory() as path:
            os.chmod(path,0o755)
            with patch.object(mod,'PRIVATE_DIR',Path(path)):
                with self.assertRaises(ValueError):mod.write_receipt({},str(Path(path)/'bad.json'))

    def test_external_receipt_rejected(self):
        with self.assertRaises(ValueError):mod.write_receipt({},'/tmp/paper-teacher-grant.json')

if __name__=='__main__':unittest.main()
