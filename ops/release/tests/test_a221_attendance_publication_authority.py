import copy
import importlib.util
import json
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('a221_gate',HERE/'a221_attendance_publication_authority.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def fake():
 return {
  'entryModulesConfirmed':4,'rootIndexSHA256':'a'*64,'bootAssetSHA256':'b'*64,
  'markAttendanceImportMapSafeReplacements':4,
  'entryEvidence':[{
    'bootEntry':'index-%02d.js'%i,'oldMarkAliasPreNineToNine':True,
    'replacementPreservesPreNineIdentity':True,'replacementSHA256':'c'*64,
    'nineToPreNineSectionFallbackPresent':False,
    'attendanceModuleHasImportMapReplacement':True,
    'safeEffectiveAttendanceModuleVerified':True
  } for i in range(4)]}
def flags():
 return dict(disk_free_gib=32,independent_offhost_dr=True,
  principal_authorization=True,teacher_nine_prenine_acceptance=True,
  real_browser_tenant_tests=True,exact_build_index_parity=True,
  rollback_proven=True,lesson_planner_preserved=True,
  source_branch_reviewed=True)
def judge(s=None,**changed):
 return m.evaluate(fake() if s is None else s,**{**flags(),**changed})
class AttendanceReleaseTests(unittest.TestCase):
 def test_hypothetical_safe_is_only_review(self):
  out=judge()
  self.assertEqual(out['release'],'READY_FOR_INDEPENDENT_SAAS_CORE_REVIEW_ONLY')
  self.assertFalse(out['canDeploy'])
  self.assertFalse(out['actualApprovedRelease'])
  self.assertFalse(out['canDeleteOriginals'])
 def test_real_A220_live_gate_fails(self):
  p=Path('/root/workspace/assps-mission-20261106-a220-private/A220_LIVE_PUBLICATION_GRAPH_GATE.json')
  if not p.exists():self.skipTest('External real observation missing')
  out=m.audit_live(json.loads(p.read_text()),2.36)
  self.assertEqual(out['releaseDecision']['release'],'HOLD')
  self.assertIn('UNSAFE_ATTENDANCE_FALLBACK_LIVE',out['releaseDecision']['blockers'])
 def test_missing_graph_rejects(self):
  with self.assertRaises(ValueError):m.evaluate(None,**flags())
 def test_missing_entries_rejects(self):
  with self.assertRaises(ValueError):m.evaluate({},**flags())
 def test_single_entry_rejects(self):
  x=fake();x['entryEvidence']=x['entryEvidence'][:1]
  self.assertIn('FOUR_PUBLISHED_BRANCHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_five_entries_rejects(self):
  x=fake();x['entryEvidence'].append(copy.deepcopy(x['entryEvidence'][0]))
  self.assertIn('FOUR_PUBLISHED_BRANCHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_entry_count_claim_forged(self):
  x=fake();x['entryModulesConfirmed']=3
  self.assertIn('FOUR_PUBLISHED_BRANCHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_missing_index_sha(self):
  x=fake();x['rootIndexSHA256']=None
  self.assertIn('PUBLISHED_ASSET_HASHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_uppercase_boot_sha(self):
  x=fake();x['bootAssetSHA256']='F'*64
  self.assertIn('PUBLISHED_ASSET_HASHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_hash_too_short(self):
  x=fake();x['rootIndexSHA256']='a'*63
  self.assertIn('PUBLISHED_ASSET_HASHES_NOT_VERIFIED',judge(x)['blockers'])
 def test_missing_mark_override(self):
  x=fake();x['markAttendanceImportMapSafeReplacements']=3
  self.assertIn('MARK_ATTENDANCE_SAFE_OVERRIDES_MISSING',judge(x)['blockers'])
 def test_safe_mark_source_can_have_no_old_alias(self):
  x=fake();x['entryEvidence'][0]['oldMarkAliasPreNineToNine']=False
  self.assertEqual(judge(x)['release'],'READY_FOR_INDEPENDENT_SAAS_CORE_REVIEW_ONLY')
 def test_nonstring_entry_id_blocks_without_type_error(self):
  x=fake();x['entryEvidence'][0]['bootEntry']={'bad':'type'}
  self.assertIn('INVALID_PUBLISHED_ENTRY_ID',judge(x)['blockers'])
 def test_missing_entry_id_blocks(self):
  x=fake();x['entryEvidence'][0]['bootEntry']=None
  self.assertIn('INVALID_PUBLISHED_ENTRY_ID',judge(x)['blockers'])
 def test_mark_safe_false(self):
  x=fake();x['entryEvidence'][0]['replacementPreservesPreNineIdentity']=False
  self.assertIn('MARK_ATTENDANCE_PRE_NINE_SAFE_IDENTITY_UNVERIFIED',judge(x)['blockers'])
 def test_mark_hash_missing(self):
  x=fake();x['entryEvidence'][0]['replacementSHA256']=None
  self.assertIn('MARK_ATTENDANCE_REPLACEMENT_HASH_MISSING',judge(x)['blockers'])
 def test_attendance_fallback_direct_blocks(self):
  x=fake();x['entryEvidence'][0]['nineToPreNineSectionFallbackPresent']=True
  self.assertIn('UNSAFE_ATTENDANCE_FALLBACK_LIVE',judge(x)['blockers'])
 def test_attendance_override_missing(self):
  x=fake();x['entryEvidence'][0]['attendanceModuleHasImportMapReplacement']=False
  self.assertIn('ATTENDANCE_MODULE_REPLACEMENT_MISSING',judge(x)['blockers'])
 def test_effective_module_unverified(self):
  x=fake();x['entryEvidence'][0]['safeEffectiveAttendanceModuleVerified']=False
  self.assertIn('EFFECTIVE_ATTENDANCE_MODULE_NOT_CERTIFIED',judge(x)['blockers'])
 def test_duplicate_boot_entry_blocks(self):
  x=fake();x['entryEvidence'][1]['bootEntry']=x['entryEvidence'][0]['bootEntry']
  self.assertIn('DUPLICATE_ENTRY_MODULE_ID',judge(x)['blockers'])
 def test_invalid_nested_entry_blocks(self):
  x=fake();x['entryEvidence'][0]=None
  self.assertIn('ENTRY_NOT_A_STRUCTURED_EVIDENCE_OBJECT',judge(x)['blockers'])
 def test_below_16gib_blocks(self):
  self.assertIn('DISK_RESERVE_BELOW_16_GIB',judge(disk_free_gib=15.999)['blockers'])
 def test_exact_16gib_possible_only_after_proofs(self):
  self.assertEqual(judge(disk_free_gib=16)['release'],'READY_FOR_INDEPENDENT_SAAS_CORE_REVIEW_ONLY')
 def test_negative_disk_rejected(self):
  with self.assertRaises(ValueError):judge(disk_free_gib=-1)
 def test_nan_disk_rejected(self):
  with self.assertRaises(ValueError):judge(disk_free_gib=float('nan'))
 def test_infinite_disk_rejected(self):
  with self.assertRaises(ValueError):judge(disk_free_gib=float('inf'))
 def test_boolean_disk_rejected(self):
  with self.assertRaises(ValueError):judge(disk_free_gib=True)
 def test_no_offhost_dr_blocks(self):
  self.assertIn('INDEPENDENT_OFFHOST_FULL_RESTORE_MISSING',judge(independent_offhost_dr=False)['blockers'])
 def test_no_principal_blocks(self):
  self.assertIn('PRINCIPAL_POSITIVE_ROLE_ACCEPTANCE_MISSING',judge(principal_authorization=False)['blockers'])
 def test_no_teacher_acceptance_blocks(self):
  self.assertIn('TEACHER_NINE_PRENINE_ACCEPTANCE_MISSING',judge(teacher_nine_prenine_acceptance=False)['blockers'])
 def test_no_browser_tenant_tests_blocks(self):
  self.assertIn('ACTUAL_PUBLISHED_BROWSER_TENANT_TESTS_MISSING',judge(real_browser_tenant_tests=False)['blockers'])
 def test_no_exact_build_index_parity_blocks(self):
  self.assertIn('PUBLISHED_BUILD_GRAPH_AND_INDEX_PARITY_MISSING',judge(exact_build_index_parity=False)['blockers'])
 def test_no_rollback_blocks(self):
  self.assertIn('ROLLBACK_NOT_PROVEN',judge(rollback_proven=False)['blockers'])
 def test_no_lesson_planner_parity_blocks(self):
  self.assertIn('LESSON_PLANNER_EXACT_BUILD_NOT_CERTIFIED',judge(lesson_planner_preserved=False)['blockers'])
 def test_no_core_source_review_blocks(self):
  self.assertIn('SAA_CORE_SOURCE_REVIEW_MISSING',judge(source_branch_reviewed=False)['blockers'])
 def test_all_missing_is_HOLD(self):
  out=m.evaluate(fake(),disk_free_gib=0)
  self.assertEqual(out['release'],'HOLD')
  self.assertGreaterEqual(len(out['blockers']),8)
 def test_old_safe_mark_not_enough(self):
  x=fake()
  for row in x['entryEvidence']:
   row['attendanceModuleHasImportMapReplacement']=False
   row['nineToPreNineSectionFallbackPresent']=True
  out=judge(x)
  self.assertIn('UNSAFE_ATTENDANCE_FALLBACK_LIVE',out['blockers'])
 def test_not_a_deployment_operator(self):
  source=(HERE/'a221_attendance_publication_authority.py').read_text()
  for cmd in ('subprocess.run(', 'shutil.rmtree(', '.unlink(', 'DELETE FROM', 'rsync', 'npm run build'):
   self.assertNotIn(cmd,source)
if __name__=='__main__':unittest.main()
