"""Synthetic, isolated source trees. Never read/write production data."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPT=Path(__file__).resolve().parents[1]/'a225_backend_custody_gate.py'
spec=importlib.util.spec_from_file_location('a225backendcustody',SCRIPT)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

SERVER="""const registerRoutes = (router) => {
  const mount = (path, file) => router.use(path, require(file));
  mount('/attendance', './routes/attendanceRoutes')
  mount('/academic', './routes/academicRoutes')
};
module.exports = registerRoutes;
"""
ROUTE_A="module.exports = {handler: 'attendance'};\n"
ROUTE_B="module.exports = {handler: 'academic'};\n"
class TestBackendCustody(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory(prefix='a225-custody-')
        self.addCleanup(self.folder.cleanup)
        self.base=Path(self.folder.name)
        self.live=self.base/'live'
        self.can=self.base/'candidate'
        self.main=self.base/'main'
        for folder in (self.live,self.can,self.main):
            (folder/'routes').mkdir(parents=True)
            (folder/'server.js').write_text(SERVER)
            (folder/'routes/attendanceRoutes.js').write_text(ROUTE_A)
            (folder/'routes/academicRoutes.js').write_text(ROUTE_B)
    def write(self,root,path,text):
        f=root/path;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(text)
    def evaluate(self):return m.evaluate(self.live,self.can,self.main)
    def test_identical_sources_ready_review(self):
        d=self.evaluate()
        self.assertEqual(d['release'],'READY_FOR_INDEPENDENT_CORE_REVIEW')
    def test_ready_not_production_deploy(self):
        self.assertFalse(self.evaluate()['productionDeploymentAuthorized'])
    def test_ready_not_live_source_changed(self):
        self.assertFalse(self.evaluate()['publicationCertified'])
    def test_ready_not_auto_merge(self):
        self.assertFalse(self.evaluate()['autoMergeOrFileDeletionAllowed'])
    def test_no_production_writes_report(self):
        self.assertEqual(self.evaluate()['productionWrites'],0)
    def test_ready_no_offhost_claim(self):
        self.assertFalse(self.evaluate()['offhostDisasterRecoveryCertified'])
    def test_identical_mounts_count(self):
        self.assertEqual(self.evaluate()['mounts']['liveCount'],2)
    def test_identical_file_count(self):
        self.assertEqual(self.evaluate()['sourceCounts']['live'],3)
    def test_no_missing_files(self):
        self.assertEqual(self.evaluate()['compare']['candidate']['filesMissingFromTarget'],0)
    def test_no_diff_files(self):
        self.assertEqual(self.evaluate()['compare']['candidate']['filesDifferentFromLive'],0)
    def test_sha_deterministic(self):
        first=self.evaluate()['liveFileManifest'];second=self.evaluate()['liveFileManifest']
        self.assertEqual(first,second)
    def test_changed_file_hold(self):
        self.write(self.can,'routes/academicRoutes.js','// changed\n')
        self.assertEqual(self.evaluate()['release'],'HOLD')
    def test_changed_file_count(self):
        self.write(self.can,'routes/academicRoutes.js','// changed\n')
        self.assertEqual(self.evaluate()['compare']['candidate']['filesDifferentFromLive'],1)
    def test_removed_file_hold(self):
        (self.can/'routes/academicRoutes.js').unlink()
        self.assertEqual(self.evaluate()['release'],'HOLD')
    def test_removed_file_count(self):
        (self.can/'routes/academicRoutes.js').unlink()
        self.assertEqual(self.evaluate()['compare']['candidate']['filesMissingFromTarget'],1)
    def test_candidate_missing_mount_hold(self):
        self.write(self.can,'server.js',SERVER.replace("  mount('/academic', './routes/academicRoutes')\n",''))
        self.assertEqual(self.evaluate()['release'],'HOLD')
    def test_candidate_missing_mount_name_recorded(self):
        self.write(self.can,'server.js',SERVER.replace("  mount('/academic', './routes/academicRoutes')\n",''))
        self.assertEqual(self.evaluate()['mounts']['missingFromCandidate'][0]['prefix'],'/academic')
    def test_candidate_additional_mount_hold(self):
        self.write(self.can,'routes/extraRoutes.js','module.exports = {};\n')
        self.write(self.can,'server.js',SERVER.replace('};', "  mount('/extra', './routes/extraRoutes')\n};"))
        self.assertEqual(self.evaluate()['release'],'HOLD')
    def test_live_broken_mount_fails(self):
        (self.live/'routes/attendanceRoutes.js').unlink()
        with self.assertRaisesRegex(ValueError,'BROKEN_LIVE_ROUTE_MOUNT'):self.evaluate()
    def test_unrelated_live_new_module_hold(self):
        self.write(self.live,'services/newSchoolService.js','module.exports={};\n')
        self.assertEqual(self.evaluate()['release'],'HOLD')
    def test_new_live_file_missing_count(self):
        self.write(self.live,'services/newSchoolService.js','module.exports={};\n')
        self.assertEqual(self.evaluate()['compare']['candidate']['filesMissingFromTarget'],1)
    def test_main_drift_is_not_candidate_drift(self):
        self.write(self.main,'routes/academicRoutes.js','// old branch version\n')
        d=self.evaluate()
        self.assertEqual(d['release'],'READY_FOR_INDEPENDENT_CORE_REVIEW')
        self.assertEqual(d['compare']['canonicalMain']['filesDifferentFromLive'],1)
    def test_live_mount_path_no_suffix_resolves(self):
        self.assertTrue(self.evaluate()['mounts']['liveMounts'][0]['module'].endswith('.js'))
    def test_duplicate_live_mount_denied(self):
        self.write(self.live,'server.js',SERVER.replace('};',"  mount('/attendance', './routes/attendanceRoutes')\n};"))
        with self.assertRaisesRegex(ValueError,'DUPLICATED_ROUTE_MOUNT'):self.evaluate()
    def test_duplicate_candidate_mount_denied(self):
        self.write(self.can,'server.js',SERVER.replace('};',"  mount('/attendance', './routes/attendanceRoutes')\n};"))
        with self.assertRaisesRegex(ValueError,'DUPLICATED_ROUTE_MOUNT'):self.evaluate()
    def test_no_static_mount_denied(self):
        self.write(self.live,'server.js',"module.exports = {};\n")
        with self.assertRaisesRegex(ValueError,'NO_STATIC_MOUNTS_FOUND'):self.evaluate()
    def test_server_entrypoint_absent_denied(self):
        (self.live/'server.js').unlink()
        with self.assertRaisesRegex(ValueError,'SERVER_ENTRYPOINT_MISSING'):self.evaluate()
    def test_symlink_source_denied(self):
        (self.live/'routes/attendanceRoutes.js').unlink()
        (self.live/'routes/attendanceRoutes.js').symlink_to(self.main/'routes/attendanceRoutes.js')
        with self.assertRaisesRegex(ValueError,'SYMLINKED_JS_DENIED'):self.evaluate()
    def test_sha_same_content(self):
        self.assertEqual(m.sha256(self.live/'server.js'),m.sha256(self.can/'server.js'))
    def test_sha_changed_content(self):
        self.write(self.can,'server.js','// not same')
        self.assertNotEqual(m.sha256(self.live/'server.js'),m.sha256(self.can/'server.js'))
    def test_counts_stable(self):
        d=self.evaluate()
        c=d['compare']['candidate']
        self.assertEqual(c['filesMissingFromTarget']+c['filesDifferentFromLive']+c['filesByteIdenticalToLive'],3)
    def test_paths_not_exposed_as_absolute(self):
        d=self.evaluate()
        self.assertTrue(all(not x.startswith('/') for x in d['liveFileManifest']))
    def test_path_names_sorted(self):
        d=self.evaluate();self.assertEqual(list(d['liveFileManifest']),sorted(d['liveFileManifest']))
    def test_mounted_file_present(self):
        self.assertTrue(all(x['present'] for x in self.evaluate()['mounts']['liveMounts']))
    def test_no_fabricated_signed_gate(self):
        self.assertFalse(self.evaluate()['fullFrontendBuiltAndAuthenticatedAccepted'])
    def test_iso_time_present(self):
        self.assertTrue(self.evaluate()['checkedUtc'].endswith('+00:00'))
    def test_not_credentials_in_manifest(self):
        d=self.evaluate()
        self.assertNotIn('private key',json.dumps(d).lower())
    def test_file_bytes_reported(self):
        d=self.evaluate()
        self.assertEqual(d['liveFileManifest']['server.js']['bytes'],len(SERVER.encode()))
    def test_sha_64_hex(self):
        d=self.evaluate()
        self.assertEqual(len(d['liveFileManifest']['server.js']['sha256']),64)
    def test_mount_prefix_recorded(self):
        d=self.evaluate()
        self.assertIn('/academic',[x['prefix'] for x in d['mounts']['liveMounts']])
    def test_missing_mount_count_exact(self):
        self.write(self.can,'server.js',SERVER.replace("  mount('/academic', './routes/academicRoutes')\n",''))
        self.assertEqual(self.evaluate()['mounts']['candidateMissingLiveMounts'],1)
    def test_cli_hold_writes_report_to_outside(self):
        (self.can/'routes/academicRoutes.js').unlink()
        out=self.base/'result.json'
        p=subprocess.run(['python3',str(SCRIPT),'--live-root',str(self.live),
           '--candidate-root',str(self.can),'--canonical-root',str(self.main),
           '--out',str(out)],capture_output=True,text=True)
        self.assertEqual(p.returncode,3)
        self.assertEqual(json.loads(out.read_text())['release'],'HOLD')
    def test_cli_ready_only_review(self):
        out=self.base/'result.json'
        p=subprocess.run(['python3',str(SCRIPT),'--live-root',str(self.live),
           '--candidate-root',str(self.can),'--canonical-root',str(self.main),
           '--out',str(out)],capture_output=True,text=True)
        self.assertEqual(p.returncode,0)
        self.assertFalse(json.loads(out.read_text())['productionDeploymentAuthorized'])
    def test_cli_refuses_out_inside_live(self):
        out=self.live/'result.json'
        p=subprocess.run(['python3',str(SCRIPT),'--live-root',str(self.live),
          '--candidate-root',str(self.can),'--canonical-root',str(self.main),
          '--out',str(out)],capture_output=True,text=True)
        self.assertEqual(p.returncode,2)
        self.assertFalse(out.exists())
    def test_cli_refuses_out_inside_candidate(self):
        out=self.can/'result.json'
        p=subprocess.run(['python3',str(SCRIPT),'--live-root',str(self.live),
          '--candidate-root',str(self.can),'--canonical-root',str(self.main),
          '--out',str(out)],capture_output=True,text=True)
        self.assertEqual(p.returncode,2)
        self.assertFalse(out.exists())
    def test_candidate_mount_source_missing_detected(self):
        (self.can/'routes/academicRoutes.js').unlink()
        # Mount count remains same, but the module and source custody fail closed.
        d=self.evaluate()
        self.assertEqual(d['mounts']['candidateMountFilesMissing'],1)
        self.assertEqual(d['release'],'HOLD')
    def test_canonical_extra_source_does_not_make_candidate_ready_by_deployment(self):
        self.write(self.main,'services/oldExtra.js','module.exports={};')
        self.assertFalse(self.evaluate()['productionDeploymentAuthorized'])

if __name__=='__main__':unittest.main()
