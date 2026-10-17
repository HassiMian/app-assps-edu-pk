"""No real school data, tokens, database connections, or production writes."""
import copy
from decimal import Decimal
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
import contextlib
import io
from unittest.mock import patch

import verify_locked_classone_urdu_staging_20261016 as gate
from verify_locked_classone_urdu_staging_20261016 import (
    private_json, verify_payload, parse_database_facts, query_live_facts,
)


def fixture():
    data = {'results': [dict(exam_id=9, student_id=i + 1, subject='Urdu',
                             total_marks=50, marks_obtained=20) for i in range(38)]}
    digest = hashlib.sha256(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    receipt = dict(payload_sha256=digest, photo_rows=38, exam_id=9, school_id=1,
                   total_marks=50, pass_marks=20, score_sum=760,
                   production_student_result_rows_modified=0)
    auth = dict(source_payload_sha256=digest, upload_executed=False, upload_proof_obtained=False)
    return data, receipt, auth


def dbfacts(status='pending', total='NULL', passing='NULL', school_grade='0|39'):
    return (f'students|38\nfour_original|152\nurdu_existing|0\n'
            f'offering|38|1|{status}|{total}|{passing}|t\n'
            f'grade_f|{school_grade}\n')


class RecoveryContract(unittest.TestCase):
    def test_valid_synthetic_38_source(self):
        data, rec, auth = fixture()
        ids, digest = verify_payload(data, rec, auth)
        self.assertEqual(len(ids), 38)
        self.assertEqual(digest, rec['payload_sha256'])

    def test_reject_tampered_score_even_if_still_in_range(self):
        data, rec, auth = fixture()
        data['results'][0]['marks_obtained'] = 21
        with self.assertRaisesRegex(ValueError, 'SHA_MISMATCH'):
            verify_payload(data, rec, auth)

    def test_reject_duplicate_student_id_after_rehash(self):
        data, rec, auth = fixture()
        data['results'][0]['student_id'] = 2
        sig = hashlib.sha256(json.dumps(data, separators=(',', ':')).encode()).hexdigest()
        rec['payload_sha256'] = sig
        auth['source_payload_sha256'] = sig
        with self.assertRaisesRegex(ValueError, 'DUPLICATE'):
            verify_payload(data, rec, auth)

    def test_reject_unsigned_extra_field(self):
        data, rec, auth = fixture()
        data['results'][0]['school_override'] = 2
        sig = hashlib.sha256(json.dumps(data, separators=(',', ':')).encode()).hexdigest()
        rec['payload_sha256'] = sig
        auth['source_payload_sha256'] = sig
        with self.assertRaisesRegex(ValueError, 'UNEXPECTED_RECORD_FIELD'):
            verify_payload(data, rec, auth)

    def test_reject_guessed_marks_or_nan(self):
        for mark in ('?', 'NaN', -1, 51, 19):
            data, rec, auth = fixture()
            data['results'][0]['marks_obtained'] = mark
            sig = hashlib.sha256(json.dumps(data, separators=(',', ':')).encode()).hexdigest()
            rec['payload_sha256'] = sig
            auth['source_payload_sha256'] = sig
            with self.assertRaises(ValueError):
                verify_payload(data, rec, auth)

    def test_reject_wrong_exam_grade_or_subject(self):
        for field, value in [('exam_id', 10), ('subject', 'English'), ('total_marks', 60), ('student_id', '1')]:
            data, rec, auth = fixture()
            data['results'][0][field] = value
            sig = hashlib.sha256(json.dumps(data, separators=(',', ':')).encode()).hexdigest()
            rec['payload_sha256'] = sig
            auth['source_payload_sha256'] = sig
            with self.assertRaises(ValueError):
                verify_payload(data, rec, auth)

    def test_no_replay_after_already_uploaded(self):
        data, rec, auth = fixture()
        auth['upload_executed'] = True
        with self.assertRaisesRegex(ValueError, 'ALREADY_SUBMITTED'):
            verify_payload(data, rec, auth)

    def test_reject_fake_authorized_receipt(self):
        data, rec, auth = fixture()
        rec['pass_marks'] = 10
        with self.assertRaisesRegex(ValueError, 'RULES_CHANGED'):
            verify_payload(data, rec, auth)

    def test_pending_unapproved_fails_approval_gate(self):
        x = parse_database_facts(dbfacts())
        self.assertTrue(x['subject_offering_pending'])
        self.assertFalse(x['subject_offering_approved'])

    def test_real_approved_metadata_does_not_auto_upload(self):
        x = parse_database_facts(dbfacts('approved', '50', '20'))
        self.assertTrue(x['subject_offering_approved'])
        self.assertFalse(x['subject_offering_pending'])

    def test_reject_offering_not_approved_or_wrong_threshold(self):
        for status, total, passing in [('pending', '50', '20'), ('approved', '50', '10'), ('approved', 'NULL', 'NULL')]:
            with self.assertRaises(ValueError):
                parse_database_facts(dbfacts(status, total, passing))

    def test_reject_already_saved_urdu_or_lost_original_scores(self):
        for field, n in [('urdu_existing', '1'), ('four_original', '151'), ('students', '37')]:
            vals = {'students': '38', 'four_original': '152', 'urdu_existing': '0'}
            vals[field] = n
            s = ''.join(k + '|' + v + '\n' for k, v in vals.items()) + 'offering|38|1|pending|NULL|NULL|t\ngrade_f|0|39\n'
            with self.assertRaisesRegex(ValueError, 'DRIFT'):
                parse_database_facts(s)

    def test_reject_multiple_offerings_or_unsolicited_output(self):
        s = dbfacts() + 'offering|38|2|approved|50|20|t\n'
        with self.assertRaisesRegex(ValueError, 'DUPLICATE'):
            parse_database_facts(s)
        with self.assertRaisesRegex(ValueError, 'MISSING_DB_FACTS'):
            parse_database_facts('students|38\n')

    def test_failing_grade_policy_drift_must_hold(self):
        for f in ['0|40', '0|38', 'NULL|39']:
            with self.assertRaisesRegex(ValueError, 'SCHOOL_GRADE_POLICY_CHANGED'):
                parse_database_facts(dbfacts(school_grade=f))

    def test_revision_or_offering_id_must_be_unique_positive_integer(self):
        for bad in ['0|1', '38|0', '1;DROP TABLE grades|1']:
            sample = dbfacts().replace('offering|38|1|', 'offering|' + bad + '|')
            with self.assertRaisesRegex(ValueError, 'REVISION_OR_STATUS_INVALID'):
                parse_database_facts(sample)

    def test_sql_scope_cannot_accept_strings_or_injection(self):
        for ids in ([1] * 38, [1] * 37, list(range(1, 38)) + ['2);DELETE FROM students;--']):
            with self.assertRaisesRegex(ValueError, 'UNSAFE_QUERY_SCOPE'):
                query_live_facts(ids)

    def test_even_official_approval_cannot_auto_upload_or_release(self):
        data, rec, auth = fixture()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            os.chmod(root, 0o700)
            documents = {gate.PAYLOAD: data, gate.SOURCE_RECEIPT: rec, gate.AUTH_RECEIPT: auth}
            def fake_source(folder, filename):
                self.assertEqual(folder, root)
                return documents[filename]
            facts = {'subject_offering_approved': True, 'subject_offering_pending': False,
                     'offering_id': 38, 'offering_revision': 2}
            out = io.StringIO()
            with patch.object(gate, 'PRIVATE_ROOT', root), \
                 patch.object(gate, 'private_json', side_effect=fake_source), \
                 patch.object(gate, 'query_live_facts', return_value=facts), \
                 patch.object(gate, 'baseline_intact', return_value=None), \
                 contextlib.redirect_stdout(out):
                self.assertEqual(gate.main(), 2)
            a = json.loads(out.getvalue())
            self.assertEqual(a['status'], 'HOLD_AUTHENTICATED_STAFF_SAVE')
            self.assertIs(a['production_modified'], False)
            self.assertIs(a['scores_uploaded'], False)
            self.assertIs(a['release_authorized'], False)
            self.assertEqual((root / gate.OUTPUT).stat().st_mode & 0o777, 0o600)

    def test_untrusted_private_directory_or_symlink_rejected(self):
        # CI runs unprivileged; production MUST still require real root ownership.
        # This fixture only simulates st_uid, never changes the private_json guard.
        from types import SimpleNamespace

        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            f = root / 'example.json'
            f.write_text('{}')
            os.chmod(root, 0o700)
            os.chmod(f, 0o600)
            if root.lstat().st_uid != 0:
                with self.assertRaisesRegex(ValueError, 'UNTRUSTED_PRIVATE_DIRECTORY'):
                    private_json(root, 'example.json')

            original_lstat = Path.lstat

            def root_owned_fixture_lstat(path, *args, **kwargs):
                info = original_lstat(path, *args, **kwargs)
                if path == root or path.parent == root:
                    return SimpleNamespace(st_mode=info.st_mode, st_uid=0)
                return info

            with patch.object(Path, 'lstat', root_owned_fixture_lstat):
                self.assertEqual(private_json(root, 'example.json'), {})
                os.chmod(f, 0o644)
                with self.assertRaisesRegex(ValueError, 'UNTRUSTED_PRIVATE_FILE'):
                    private_json(root, 'example.json')
                os.chmod(f, 0o600)
                (root / 'link.json').symlink_to(f)
                with self.assertRaisesRegex(ValueError, 'UNTRUSTED_PRIVATE_FILE'):
                    private_json(root, 'link.json')


if __name__ == '__main__':
    unittest.main()
