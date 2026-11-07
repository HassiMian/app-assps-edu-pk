"""Synthetic non-JS runtime dependency custody; no production data."""
import importlib.util,json,subprocess,tempfile
from pathlib import Path
import unittest

M=Path(__file__).resolve().parents[1]/'a225_ancillary_runtime_custody.py'
sp=importlib.util.spec_from_file_location('a225assets',M)
a=importlib.util.module_from_spec(sp);sp.loader.exec_module(a)
class TestA225Assets(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.addCleanup(self.t.cleanup)
  self.root=Path(self.t.name);self.live=self.root/'live';self.can=self.root/'can'
  self.live.mkdir();self.can.mkdir()
  for root in [self.live,self.can]:
   (root/'entry.cjs').write_text('module.exports=1;\n')
   (root/'client.mjs').write_text('export const value=3;\n')
   (root/'schema.sql').write_text('SELECT 1;\n')
   (root/'database.prisma').write_text('datasource db {}\n')
   (root/'package.json').write_text('{}\n')
 def eval(self):return a.evaluate(self.live,self.can)
 def put(self,root,path,contents):
  p=root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(contents)
 def test_live_asset_count(self):self.assertEqual(self.eval()['liveAssetCount'],5)
 def test_candidate_asset_count(self):self.assertEqual(self.eval()['candidateAssetCount'],5)
 def test_no_missing(self):self.assertEqual(self.eval()['missingAssets'],0)
 def test_no_different(self):self.assertEqual(self.eval()['differentAssets'],0)
 def test_all_exact(self):self.assertEqual(self.eval()['exactAssets'],5)
 def test_identical_always_hold_not_deploy(self):self.assertEqual(self.eval()['release'],'HOLD')
 def test_no_full_release_claim(self):self.assertFalse(self.eval()['fullBackendReadyForRelease'])
 def test_no_auth_claim(self):self.assertFalse(self.eval()['actualDependencyGraphExecuted'])
 def test_excluded_env(self):
  self.put(self.live,'.env','DB_PASSWORD=do-not-copy')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_excluded_csv(self):
  self.put(self.live,'records.csv','private,not-for-audit')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_excluded_text(self):
  self.put(self.live,'student.txt','private')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_missing_sql_detect(self):
  (self.can/'schema.sql').unlink()
  self.assertEqual(self.eval()['missingSchemaSqlPrisma'],1)
 def test_missing_prisma_detect(self):
  (self.can/'database.prisma').unlink()
  self.assertEqual(self.eval()['missingSchemaSqlPrisma'],1)
 def test_missing_cjs_detect(self):
  (self.can/'entry.cjs').unlink()
  self.assertEqual(self.eval()['missingExecutableCjsMjs'],1)
 def test_missing_mjs_detect(self):
  (self.can/'client.mjs').unlink()
  self.assertEqual(self.eval()['missingExecutableCjsMjs'],1)
 def test_missing_both_executable(self):
  for x in ['client.mjs','entry.cjs']:(self.can/x).unlink()
  self.assertEqual(self.eval()['missingExecutableCjsMjs'],2)
 def test_changed_config_json_detect(self):
  self.put(self.can,'package.json','{"changed":true}')
  self.assertEqual(self.eval()['differentAssets'],1)
 def test_changed_config_name(self):
  self.put(self.can,'package.json','{"changed":true}')
  self.assertIn('package.json',self.eval()['differentPaths'])
 def test_missing_named_paths(self):
  (self.can/'entry.cjs').unlink()
  self.assertEqual(self.eval()['missingPaths'],['entry.cjs'])
 def test_excluded_node_modules(self):
  self.put(self.live,'node_modules/big.cjs','module.exports=1;')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_excluded_cache(self):
  self.put(self.live,'.cache/unstable.mjs','export default 0')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_excluded_dist(self):
  self.put(self.live,'dist/bundle.mjs','export default 0')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_regular_json_count(self):
  self.assertEqual(self.eval()['liveCountsByExt']['.json'],1)
 def test_extension_report(self):
  self.assertIn('.mjs',self.eval()['sourceExtensions'])
 def test_extension_report_schema(self):
  self.assertIn('.sql',self.eval()['sourceExtensions'])
 def test_source_path_relative_only(self):
  self.assertTrue(all(not x.startswith('/') for x in self.eval()['liveAssetManifest']))
 def test_hash_is_64(self):
  self.assertEqual(len(self.eval()['liveAssetManifest']['package.json']['sha256']),64)
 def test_bytes_count(self):
  self.assertEqual(self.eval()['liveAssetManifest']['entry.cjs']['bytes'],len('module.exports=1;\n'))
 def test_credential_not_read(self):
  self.put(self.live,'.env','PASSWORD=TEST')
  self.assertNotIn('PASSWORD=TEST',json.dumps(self.eval()))
 def test_production_writes_zero(self):self.assertEqual(self.eval()['productionWrites'],0)
 def test_modified_sql_detect(self):
  self.put(self.can,'schema.sql','DROP TABLE x;')
  self.assertEqual(self.eval()['differentByExt']['.sql'],1)
 def test_candidate_only_path_detect(self):
  self.put(self.can,'newFeature.cjs','module.exports={};')
  self.assertEqual(self.eval()['candidateOnlyPaths'],['newFeature.cjs'])
 def test_unsupported_py_excluded(self):
  self.put(self.live,'test.py','print(1)')
  self.assertEqual(self.eval()['missingAssets'],0)
 def test_symlink_denied(self):
  (self.live/'linked.cjs').symlink_to(self.can/'entry.cjs')
  with self.assertRaisesRegex(ValueError,'SYMLINKED_CUSTODY_ASSET'):self.eval()
 def test_cli_writes_private_outside(self):
  out=self.root/'report.json'
  p=subprocess.run(['python3',str(M),'--live-root',str(self.live),
      '--candidate-root',str(self.can),'--out',str(out)],capture_output=True,text=True)
  self.assertEqual(p.returncode,3)
  self.assertEqual(json.loads(out.read_text())['release'],'HOLD')
 def test_cli_refuses_live_output(self):
  out=self.live/'generated.json'
  p=subprocess.run(['python3',str(M),'--live-root',str(self.live),
      '--candidate-root',str(self.can),'--out',str(out)],capture_output=True,text=True)
  self.assertEqual(p.returncode,2);self.assertFalse(out.exists())
 def test_cli_refuses_candidate_output(self):
  out=self.can/'generated.json'
  p=subprocess.run(['python3',str(M),'--live-root',str(self.live),
      '--candidate-root',str(self.can),'--out',str(out)],capture_output=True,text=True)
  self.assertEqual(p.returncode,2);self.assertFalse(out.exists())
 def test_yaml_file_included(self):
  self.put(self.live,'k8s.yaml','apiVersion: v1')
  self.assertIn('k8s.yaml',self.eval()['missingPaths'])
 def test_ts_file_included(self):
  self.put(self.live,'script.ts','export const x = 1')
  self.assertIn('script.ts',self.eval()['missingPaths'])
 def test_sh_file_included(self):
  self.put(self.live,'deploy.sh','echo test')
  self.assertIn('deploy.sh',self.eval()['missingPaths'])
 def test_multiple_diffs_count(self):
  self.put(self.can,'client.mjs','// different')
  self.put(self.can,'package.json','{"x":1}')
  self.assertEqual(self.eval()['differentAssets'],2)
 def test_one_missing_and_one_changed(self):
  (self.can/'client.mjs').unlink()
  self.put(self.can,'package.json','{"x":1}')
  o=self.eval();self.assertEqual((o['missingAssets'],o['differentAssets']),(1,1))
 def test_no_student_data_migration_claim(self):
  self.assertFalse(self.eval()['allProductionDataMigrated'])
 def test_created_utc(self):
  self.assertIn('+00:00',self.eval()['checkedUtc'])
 def test_existing_manifest_sha(self):
  self.assertEqual(a.sha(self.live/'entry.cjs'),a.sha(self.can/'entry.cjs'))
if __name__=='__main__':unittest.main()
