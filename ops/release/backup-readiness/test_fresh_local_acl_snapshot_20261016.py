import hashlib
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('backup_review',HERE/'verify_fresh_local_acl_snapshot_20261016.py')
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
TOC="""; TOC Entries: 9
111; 0 0 ROW SECURITY public exams owner
112; 0 0 ACL - SCHEMA core_security owner
113; 0 0 DEFAULT ACL public DEFAULT PRIVILEGES owner
114; 0 0 TABLE public exam_results owner
"""
COUNTS={'entries':4,'toc_entries':9,'row_security':1,'acl':1,'default_acl':1,'all_acl':2}

def ok_run(argv,**kwargs):
    assert argv[0]=='pg_restore' and argv[1] in ('-l','-f') and kwargs.get('check') is False
    return subprocess.CompletedProcess(argv,0,TOC,'')

class TestSnapshotGuard(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.file=Path(self.tmp.name)/'synthetic.dump'
        self.file.write_bytes(b'A'*1_100_010)
        self.file.chmod(0o600)
        self.hash=hashlib.sha256(self.file.read_bytes()).hexdigest()
        self.now=self.file.stat().st_mtime+1
    def inspect(self,**kwargs):
        return m.inspect_archive(self.file,self.hash,expected=COUNTS,now=self.now,
            runner=ok_run,expected_owner_uid=os.getuid(),**kwargs)
    def test_valid_archive_still_not_release_certified(self):
        report=self.inspect()
        self.assertEqual(report['decision'],'LOCAL_ARCHIVE_STRUCTURALLY_VERIFIED_NOT_RELEASE_CERTIFIED')
        self.assertIs(report['fullSqlStreamParsed'],True)
        for k in ('releaseAuthorized','offsiteRestoreCertified','independentReviewerSignatureVerified','officialCoreApprovedBackupUpdated','productionDatabaseChanged'):
            self.assertIs(report[k],False)
    def test_stale_timestamp_and_future_mtime_fail_closed(self):
        for t in (self.file.stat().st_mtime+86401,self.file.stat().st_mtime-1):
            with self.assertRaisesRegex(ValueError,'FRESH'):
                m.inspect_archive(self.file,self.hash,expected=COUNTS,now=t,
                    runner=ok_run,expected_owner_uid=os.getuid())
    def test_bad_digest_and_wrong_bytes_never_pass(self):
        self.assertRaisesRegex(ValueError,'DIGEST',m.inspect_archive,self.file,'invalid',
            expected=COUNTS,now=self.now,runner=ok_run,expected_owner_uid=os.getuid())
        self.file.write_bytes(b'B'*1_100_010)
        with self.assertRaisesRegex(ValueError,'MISMATCH'):self.inspect()
    def test_private_permissions_required(self):
        self.file.chmod(0o644)
        with self.assertRaisesRegex(ValueError,'0600'):self.inspect()
    def test_symlink_rejected(self):
        link=Path(self.tmp.name)/'link.dump'
        link.symlink_to(self.file)
        with self.assertRaisesRegex(ValueError,'REGULAR'):
            m.inspect_archive(link,self.hash,expected=COUNTS,now=self.now,
                runner=ok_run,expected_owner_uid=os.getuid())
    def test_missing_rls_and_acl_never_pass(self):
        broken=COUNTS.copy();broken['row_security']=2
        with self.assertRaisesRegex(ValueError,'DRIFT'):
            m.inspect_archive(self.file,self.hash,expected=broken,now=self.now,
                runner=ok_run,expected_owner_uid=os.getuid())
    def test_full_sql_stream_parse_failure_rejected(self):
        def badstream(argv,**kwargs):
            if argv[1]=='-f':return subprocess.CompletedProcess(argv,1,'','bad archive stream')
            return ok_run(argv,**kwargs)
        with self.assertRaisesRegex(ValueError,'FULL_SQL_STREAM'):
            m.inspect_archive(self.file,self.hash,expected=COUNTS,now=self.now,
                runner=badstream,expected_owner_uid=os.getuid())
    def test_pg_restore_parse_error_and_missing_toc(self):
        def failed(argv,**kwargs):return subprocess.CompletedProcess(argv,1,'','restore failed')
        with self.assertRaisesRegex(ValueError,'INVALID'):
            m.inspect_archive(self.file,self.hash,expected=COUNTS,now=self.now,
                runner=failed,expected_owner_uid=os.getuid())
        def missing(argv,**kwargs):return subprocess.CompletedProcess(argv,0,'not real toc','')
        with self.assertRaisesRegex(ValueError,'MISSING'):
            m.inspect_archive(self.file,self.hash,expected=COUNTS,now=self.now,
                runner=missing,expected_owner_uid=os.getuid())
    def test_wrong_owner_identity_rejected(self):
        with self.assertRaisesRegex(ValueError,'ROOT_OWNED'):
            m.inspect_archive(self.file,self.hash,expected=COUNTS,now=self.now,
                runner=ok_run,expected_owner_uid=os.getuid()+1)

if __name__=='__main__':unittest.main()
