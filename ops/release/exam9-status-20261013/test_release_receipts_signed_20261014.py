"""Synthetic Ed25519 unit proof; not a real staff approval."""
import base64,datetime,json,tempfile
from pathlib import Path
from unittest import TestCase
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
from verify_release_receipts_20261014 import verified_receipt_gates
NOW=datetime.datetime(2026,10,14,9,20,tzinfo=datetime.timezone.utc)
class SignedProofTests(TestCase):
 def test_signed_and_tampered(self):
  with tempfile.TemporaryDirectory() as t:
   p=Path(t);k=Ed25519PrivateKey.generate()
   (p/'pub').write_bytes(k.public_key().public_bytes(Encoding.PEM,PublicFormat.SubjectPublicKeyInfo))
   c=dict(school_id=1,exam_id=9,environment='production',auth_session_verified=True,backend_commit='synthetic',core_release_id='synthetic',evidence_digest='a'*64,verified_at=NOW.isoformat(),actor_role='teacher',actor_user_id=1,actor_school_id=1,actor_scope_exact=True,save_http_status=200,idempotent_existing_score=True,reloaded_score_matches=True,browser_print_window_opened=True,original_marks_unchanged=True)
   raw=json.dumps(dict(kind='teacher_save_reload_print',claims=c),sort_keys=True,separators=(',',':')).encode()
   sig=base64.b64encode(k.sign(raw)).decode()
   e=dict(kind='teacher_save_reload_print',claims=c,signature=sig)
   f=p/'receipt'; f.write_text(json.dumps(dict(schema='assps-school-release-receipts-v1',events=[e])))
   self.assertTrue(verified_receipt_gates(f,NOW,p/'pub')['teacher_save_reload_print'])
   c['browser_print_window_opened']=False
   f.write_text(json.dumps(dict(schema='assps-school-release-receipts-v1',events=[e])))
   self.assertFalse(verified_receipt_gates(f,NOW,p/'pub')['teacher_save_reload_print'])
