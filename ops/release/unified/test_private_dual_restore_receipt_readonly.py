import unittest,sys,json,hmac,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from verify_private_dual_restore_receipt_readonly import verify_payload
KEY=b'mock-key-only'
def fixture():
 p={'schema':'ASSPS_20261023_PRIVATE_ONHOST_DUAL_POSTGRESQL_RESTORE_V1',
 'backup_snapshot':'assps-critical-20261023T013552Z','backup_manifest_sha256':'HASH',
 'source_exam9_hmac_sha256':'SEAL','main_databases':{'count':64},
 'signed_databases':{'count':37},'signed_sample_catalogs':{'a':{},'b':{},'c':{}},
 'main_firstterm_exam9_rows':1854,'main_firstterm_exam9_numeric_zeros':215,
 'main_firstterm_hmac_matches_forward_seal':True,'main_restore_errors':0,
 'signed_restore_errors':0,'signed_restore_psql_exit':0,
 'offhost_two_cluster_restore_proven':False,
 'restored_live_production_mutated':False,'socket_only_listening':True}
 def wrap(p):
  sig=hmac.new(KEY,json.dumps(p,sort_keys=True,separators=(',',':')).encode(),hashlib.sha256).hexdigest()
  return {'receipt':p,'hmac_sha256':sig}
 return p,wrap
class RestoreCertificateTests(unittest.TestCase):
 def check(self,e):return verify_payload(e,KEY,'HASH','SEAL','assps-critical-20261023T013552Z')
 def test_authentic_local_receipt(self):
  p,wrap=fixture();self.assertTrue(self.check(wrap(p)))
 def test_altered_archive_manifest_blocks(self):
  p,wrap=fixture();self.assertFalse(verify_payload(wrap(p),KEY,'OTHER','SEAL',p['backup_snapshot']))
 def test_changed_exam_rows_block(self):
  p,wrap=fixture();self.assertFalse(verify_payload(wrap(p),KEY,'HASH','CHANGED',p['backup_snapshot']))
 def test_stale_backup_rejected(self):
  p,wrap=fixture();self.assertFalse(verify_payload(wrap(p),KEY,'HASH','SEAL','assps-critical-20261024T000000Z'))
 def test_forged_payload_refused(self):
  p,wrap=fixture();e=wrap(p);e['receipt']['signed_restore_psql_exit']=4
  self.assertFalse(self.check(e))
 def test_failed_signed_restore_rejected_even_if_re_signed(self):
  p,wrap=fixture();p['signed_restore_psql_exit']=3
  self.assertFalse(self.check(wrap(p)))
 def test_no_offhost_certification_is_claimed(self):
  p,wrap=fixture();p['offhost_two_cluster_restore_proven']=True
  self.assertFalse(self.check(wrap(p)))
