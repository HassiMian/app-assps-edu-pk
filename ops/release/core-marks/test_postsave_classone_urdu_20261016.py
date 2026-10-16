"""Only fabricated synthetic student IDs and mock read-only SQL. No live marks or tokens."""
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import verify_postsave_classone_urdu_20261016 as gate


def fixture():
    source={'results':[{'exam_id':9,'student_id':i+1,'subject':'Urdu','total_marks':50,'marks_obtained':20} for i in range(38)]}
    digest=hashlib.sha256(json.dumps(source,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
    before={'source_payload_sha256':digest,'upload_executed':False,'upload_proof_obtained':False,'existing_four_subject_rows':152}
    after={'payload_sha256':digest,'upload_executed':True,'upload_proof_obtained':True,'verified_rows_exact':38,
           'production_student_result_rows_modified':38,'verified_before_152_fingerprint_same':True,
           'write_state':'PERSISTED_VERIFIED_2026-10-16','exam_id':9,'school_id':1,'total_marks':50,
           'pass_marks':20,'photo_rows':38,'score_sum':760}
    return source,before,after


def sql_fixture(n=38, marks=20, total=50, grade='D', school=1, exam=9):
    return ''.join(f'{i}|{marks}|{total}|{school}|{exam}|{grade}\n' for i in range(1,n+1))


class PostSaveContract(unittest.TestCase):
    def test_verifies_exact_synthetic_postsave_provenance(self):
        data,old,new=fixture()
        expected,digest=gate.validate_postsave_source(data,old,new)
        self.assertEqual(len(expected),38)
        self.assertEqual(new['payload_sha256'],digest)

    def test_hash_drift_fails_even_when_scores_in_range(self):
        data,old,new=fixture()
        data['results'][0]['marks_obtained']=21
        with self.assertRaisesRegex(ValueError,'DIGEST_MISMATCH'):
            gate.validate_postsave_source(data,old,new)

    def test_stale_or_fabricated_upload_proof_rejected(self):
        for key,value in [('upload_executed',False),('upload_proof_obtained',False),('verified_rows_exact',37),
                          ('production_student_result_rows_modified',0),('verified_before_152_fingerprint_same',False),
                          ('write_state','PENDING')]:
            data,old,new=fixture()
            new[key]=value
            with self.assertRaisesRegex(ValueError,'EVIDENCE|INCONSISTENT'):
                gate.validate_postsave_source(data,old,new)

    def test_old_original_gate_cannot_be_rewritten_to_say_submitted(self):
        data,old,new=fixture()
        old['upload_executed']=True
        with self.assertRaisesRegex(ValueError,'ORIGINAL_PREUPLOAD_GATE_NOT_FROZEN'):
            gate.validate_postsave_source(data,old,new)

    def test_duplicate_student_even_with_forged_new_hash_rejected(self):
        data,old,new=fixture()
        data['results'][0]['student_id']=2
        newhash=hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
        old['source_payload_sha256']=new['payload_sha256']=newhash
        with self.assertRaisesRegex(ValueError,'DUPLICATE_OR_OUT_OF_SCOPE'):
            gate.validate_postsave_source(data,old,new)

    def test_unauthorized_exam_subject_maximum_or_failing_marks_rejected(self):
        for key,value in [('exam_id',10),('subject','Math'),('total_marks',60),('marks_obtained',19),
                          ('marks_obtained','NaN')]:
            data,old,new=fixture()
            data['results'][0][key]=value
            newhash=hashlib.sha256(json.dumps(data,separators=(',',':')).encode()).hexdigest()
            old['source_payload_sha256']=new['payload_sha256']=newhash
            with self.assertRaises(ValueError):
                gate.validate_postsave_source(data,old,new)

    def test_exact_38_saved_scores_and_known_grade_matches(self):
        data,old,new=fixture()
        expected,_=gate.validate_postsave_source(data,old,new)
        result=gate.compare_persisted_scores(expected,sql_fixture())
        self.assertEqual(result['verified_exact_rows'],38)
        self.assertEqual(result['mismatch_count'],0)

    def test_saved_score_drift_rejected(self):
        data,old,new=fixture()
        expected,_=gate.validate_postsave_source(data,old,new)
        with self.assertRaisesRegex(ValueError,'MISMATCH'):
            gate.compare_persisted_scores(expected,sql_fixture(marks=21))

    def test_short_roster_rejected(self):
        data,old,new=fixture()
        expected,_=gate.validate_postsave_source(data,old,new)
        with self.assertRaisesRegex(ValueError,'MISMATCH'):
            gate.compare_persisted_scores(expected,sql_fixture(n=37))

    def test_wrong_school_exam_or_saved_total_rejected(self):
        data,old,new=fixture()
        expected,_=gate.validate_postsave_source(data,old,new)
        for bad in (sql_fixture(school=2),sql_fixture(exam=8),sql_fixture(total=60)):
            with self.assertRaises(ValueError):
                gate.compare_persisted_scores(expected,bad)

    def test_null_or_failing_grade_cannot_be_certified(self):
        data,old,new=fixture()
        expected,_=gate.validate_postsave_source(data,old,new)
        for grade in ('','F','<NULL>'):
            with self.assertRaises(ValueError):
                gate.compare_persisted_scores(expected,sql_fixture(grade=grade))

    def test_reject_injected_noninteger_sql_ids(self):
        for bad in [{i:(20,50) for i in range(1,38)}, {i:(20,50) for i in range(1,38)}|{'DROP TABLE results':(20,50)}]:
            with self.assertRaisesRegex(ValueError,'UNSAFE_QUERY_IDENTIFIERS'):
                gate.query_source_data(bad)

    def test_pending_offering_is_not_approved(self):
        with patch.object(gate,'read_only_query',return_value='38|1|pending|NULL|NULL\n'):
            x=gate.check_academic_offering()
            self.assertFalse(x['subject_approved'])

    def test_approved_50_20_offering_is_not_full_release(self):
        with patch.object(gate,'read_only_query',return_value='38|2|approved|50|20\n'):
            x=gate.check_academic_offering()
            self.assertTrue(x['subject_approved'])

    def test_wrong_approval_maximum_rejected(self):
        for s in ('38|1|approved|50|10\n','38|1|pending|50|20\n','38|1|approved|60|20\n','38|0|pending|NULL|NULL\n'):
            with patch.object(gate,'read_only_query',return_value=s):
                with self.assertRaises(ValueError):
                    gate.check_academic_offering()

    def test_even_saved_and_approved_cannot_authorize_a_full_release(self):
        data,old,new=fixture()
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            os.chmod(root,0o700)
            sources={gate.PAYLOAD:data,gate.AUTH_RECEIPT:old,gate.SOURCE_RECEIPT:new}
            def fake_private(directory,filename):
                self.assertEqual(directory,root)
                return sources[filename]
            approved={'subject_approved':True,'subject_revision':2,'subject_offering_id':38}
            captured=io.StringIO()
            with patch.object(gate,'PRIVATE_ROOT',root),patch.object(gate,'private_json',side_effect=fake_private),\
                 patch.object(gate,'query_source_data',return_value=sql_fixture()),\
                 patch.object(gate,'verify_frozen_four_subjects',return_value={'original_four_subject_rows':152,'original_genuine_zeros':6}),\
                 patch.object(gate,'check_academic_offering',return_value=approved),contextlib.redirect_stdout(captured):
                self.assertEqual(gate.main(),2)
            receipt=json.loads(captured.getvalue())
            self.assertEqual(receipt['status'],'SAVED_38_EXACT_POLICY_APPROVED_FULL_RELEASE_HOLD')
            self.assertFalse(receipt['full_production_release_authorized'])
            self.assertFalse(receipt['production_write_performed_by_this_check'])
            self.assertFalse(receipt['subject_approval_performed'])
            evidence=list(root.glob('core-postsave-verified-*.json'))
            self.assertEqual(len(evidence),1)
            self.assertEqual(evidence[0].stat().st_mode&0o777,0o600)


if __name__=='__main__':
    unittest.main()
