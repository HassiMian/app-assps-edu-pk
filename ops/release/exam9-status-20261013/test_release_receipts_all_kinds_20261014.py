"""All four synthetic proof types. Keys are ephemeral and test-only."""
import base64,datetime,json,tempfile
from pathlib import Path
from unittest import TestCase
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
from verify_release_receipts_20261014 import KINDS,verified_receipt_gates

class ProofMatrix(TestCase):
 def test_signed_synthetic_matrix(self):
  now=datetime.datetime(2026,10,14,9,20,tzinfo=datetime.timezone.utc)
  common=dict(school_id=1,exam_id=9,environment='production',auth_session_verified=True,backend_commit='test-only',core_release_id='test-only',evidence_digest='a'*64,verified_at=now.isoformat())
  data=[
   dict(actor_role='teacher',actor_user_id=101,actor_school_id=1,actor_scope_exact=True,save_http_status=200,idempotent_existing_score=True,reloaded_score_matches=True,browser_print_window_opened=True,original_marks_unchanged=True),
   dict(actor_role='teacher',actor_user_id=102,actor_school_id=2,peer_token_cryptographically_verified=True,cross_tenant_http_status=403,requested_school_id=1,same_school_positive_verified=True,no_school_a_records_returned=True),
   dict(actor_role='release_operator',traffic_canary_switched=True,traffic_rollback_executed=True,nginx_check_passed=True,pm2_healthy_after_rollback=True,result_row_counts_identical=True,original_score_digest_identical=True,school_ingress_http_status=200,connect_health_http_status=200,restored_release_id='synthetic-old'),
   dict(actor_role='admin',actor_user_id=103,actor_school_id=1,approved_grade_changes=112,revision_actor_bound_to_session=True,original_scores_preserved=True,grade_change_ledger_verified=True,old_301_grade_digest='0376ec1d25555b0dfc963857564b36aa',new_301_grade_digest='0e0115e1bdafa8c56edb174da6241f3a',original_301_score_digest='bcdc098a3e6cabb6f4c31736b14e39b9')
  ]
  signer=Ed25519PrivateKey.generate();events=[]
  for kind,extra in zip(KINDS,data):
   claims={**common,**extra}
   raw=json.dumps(dict(kind=kind,claims=claims),sort_keys=True,separators=(',',':')).encode()
   events.append(dict(kind=kind,claims=claims,signature=base64.b64encode(signer.sign(raw)).decode()))
  with tempfile.TemporaryDirectory() as t:
   p=Path(t);pub=p/'p.pem';bundle=p/'b.json'
   pub.write_bytes(signer.public_key().public_bytes(Encoding.PEM,PublicFormat.SubjectPublicKeyInfo))
   bundle.write_text(json.dumps(dict(schema='assps-school-release-receipts-v1',events=events)))
   self.assertTrue(all(verified_receipt_gates(bundle,now,pub).values()))
