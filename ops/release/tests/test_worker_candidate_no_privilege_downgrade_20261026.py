import pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parents[3]
P=ROOT/'al-siddique-backend/src/services/ai/aiQueueWorkerDatabase.js'
class WorkerSourceHardened(unittest.TestCase):
 def test_reviewed_file_exists(self):self.assertTrue(P.is_file())
 def test_reject_student_record_access(self):
  s=P.read_text()
  for field in ('can_students','can_exam_results'):
   with self.subTest(field=field):self.assertIn(f'identity.{field} !== false',s)
 def test_reject_elevated_roles(self):
  s=P.read_text()
  for field in ('can_create_role','can_create_db','can_replicate','can_set_worker_role','bypass','super'):
   with self.subTest(field=field):self.assertIn(f'identity.{field} !== false',s)
 def test_reject_global_directory_audit_access(self):
  s=P.read_text()
  for field in ('can_org','can_campus','can_audit'):
   with self.subTest(field=field):self.assertIn(f'identity.{field} !== false',s)
 def test_protect_absent_boolean_contract(self):
  s=P.read_text()
  self.assertIn('identity.can_login !== true',s)
  self.assertIn('identity.can_queue !== true',s)
  self.assertIn('identity.worker_member !== true',s)
 def test_enforce_worker_database_identity(self):
  s=P.read_text()
  self.assertIn('AI_QUEUE_WORKER_DATABASE_PRIVILEGES_NOT_ISOLATED',s)
if __name__=='__main__':unittest.main()
