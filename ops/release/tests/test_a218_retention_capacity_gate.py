import importlib.util
from pathlib import Path
import tempfile
import unittest
SRC=Path(__file__).resolve().parents[1]/"a218_retention_capacity_gate.py"
spec=importlib.util.spec_from_file_location("a218capacity",SRC)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class GateTests(unittest.TestCase):
    def test_threshold_shortfall(self):
        x=m.evaluate_capacity(disk_free_gib=4.8)
        self.assertEqual(x["shortfallGiB"],11.2)
        self.assertEqual(x["release"],"HOLD")
    def test_proposed_cache_estimate_does_not_clear_actual_headroom(self):
        x=m.evaluate_capacity(disk_free_gib=4,proposed_reclaim_gib=50)
        self.assertEqual(x["release"],"HOLD")
    def test_free_space_alone_insufficient(self):
        self.assertEqual(m.evaluate_capacity(disk_free_gib=17)["release"],"HOLD")
    def test_offhost_is_required(self):
        x=m.evaluate_capacity(disk_free_gib=17,role_password_acl_restore=True,owners_approved=True,has_verified_snapshot=True)
        self.assertIn("OFFHOST_FULL_DATA_RESTORE_MISSING",x["blockers"])
    def test_password_acl_restore_is_required(self):
        x=m.evaluate_capacity(disk_free_gib=17,offhost_full_restore=True,owners_approved=True,has_verified_snapshot=True)
        self.assertIn("OFFHOST_ROLE_PASSWORD_ACL_RESTORE_MISSING",x["blockers"])
    def test_owner_approval_is_required(self):
        x=m.evaluate_capacity(disk_free_gib=17,offhost_full_restore=True,role_password_acl_restore=True,has_verified_snapshot=True)
        self.assertIn("OWNER_RETENTION_APPROVAL_MISSING",x["blockers"])
    def test_hash_verification_is_required(self):
        x=m.evaluate_capacity(disk_free_gib=17,offhost_full_restore=True,role_password_acl_restore=True,owners_approved=True)
        self.assertIn("INDEPENDENT_BACKUP_HASH_NOT_VERIFIED",x["blockers"])
    def test_all_proofs_cannot_authorize_deletion(self):
        x=m.evaluate_capacity(disk_free_gib=17,offhost_full_restore=True,role_password_acl_restore=True,owners_approved=True,has_verified_snapshot=True)
        self.assertEqual(x["release"],"READY_FOR_INDEPENDENT_RELEASE_REVIEW")
        self.assertFalse(x["safeToDeleteProductionOrSourceFiles"])
    def test_negative_input_rejected(self):
        for kwargs in ({"disk_free_gib":-0.01},{"disk_free_gib":5,"proposed_reclaim_gib":-1}):
            with self.assertRaises(ValueError):m.evaluate_capacity(**kwargs)
    def test_none_of_the_paths_auto_delete(self):
        for p in m.CANDIDATE_NAMES:
            self.assertFalse(m.classify_candidate(m.MONITORED_ROOT/p)["deletionAuthorized"])
    def test_no_signed_owner_is_never_safe_archive(self):
        x=m.classify_candidate(m.MONITORED_ROOT/m.CANDIDATE_NAMES[0])
        self.assertFalse(x["eligibleForReviewOfReversibleArchivePlan"])
        self.assertIn("NO_SIGNED_RETENTION_OWNER_APPROVAL",x["blockers"])
    def test_active_owner_blocks(self):
        x=m.classify_candidate(m.MONITORED_ROOT/m.CANDIDATE_NAMES[0],is_active_owner=True)
        self.assertIn("OWNER_STILL_ACTIVE",x["blockers"])
    def test_symlink_or_nested_paths_block(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/"qbank-source-cache";path.mkdir()
            self.assertIn("OUTSIDE_EXACT_REVIEW_CANDIDATES_OR_SYMLINK",m.classify_candidate(path)["blockers"])
            self.assertIn("OUTSIDE_EXACT_REVIEW_CANDIDATES_OR_SYMLINK",m.classify_candidate(path/"nested")["blockers"])
    def test_protected_paths_are_protected(self):
        for p in m.NO_TOUCH_ROOTS:
            self.assertFalse(m.classify_candidate(p)["deletionAuthorized"])
    def test_explicit_review_does_not_remove_files(self):
        with tempfile.TemporaryDirectory() as temp:
            file=Path(temp)/"original.db";file.write_text("NO_DELETE")
            m.classify_candidate(file)
            self.assertEqual(file.read_text(),"NO_DELETE")
    def test_no_cli_apply_or_delete_operations(self):
        script=SRC.read_text()
        self.assertNotIn("--apply",script)
        self.assertNotIn("shutil.rmtree(",script)
        self.assertNotIn(".unlink(",script)
        self.assertNotIn("DELETE FROM",script)
if __name__=="__main__":unittest.main()
