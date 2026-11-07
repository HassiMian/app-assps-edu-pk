"""No real database, deployment, or real attendance user data is needed."""
import copy
import hashlib
import importlib.util
import json
import subprocess
import tempfile
from pathlib import Path
import unittest

MODULE=Path(__file__).resolve().parents[1]/"a223_live_attendance_forwardport.py"
spec=importlib.util.spec_from_file_location("a223_forwardport",MODULE)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

BASE="""require('dotenv').config()
const express = require('express')
const { tenantClause, currentSchoolId, currentTenantId, hasColumn } = require('../middleware/tenant')
const { teacherStudentScopeClause } = require('../services/teacherAssignmentService')
router.get('/', protect, async(req,res) => {});
router.post('/mark', protect, canMarkAttendance, async (req,res) => {
  const { records, marked_by } = req.body
  const x = await requireTeacherAssignmentsForAttendance(req, res);
  const schoolId = currentSchoolId(req)
  const tenantId = currentTenantId(req)
  const schoolCondition = teacherStudentScopeClause(req, 'students', 1)
  const skippedInactiveIds = []
  const persistableRecords = []
  await client.query('BEGIN')
  await client.query('COMMIT')
  await client.query('ROLLBACK')
    const authenticatedActorId = Number.isInteger(Number(req.user?.id)) ? Number(req.user.id) : null
    const markedByUserId = actorRole === 'teacher'
      ? authenticatedActorId
      : (Number.isInteger(Number(marked_by)) ? Number(marked_by) : authenticatedActorId)
})
router.post('/mark-by-gr', protect, async(req,res) => {});
module.exports = router
"""

def fingerprint(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()
def patch(src=BASE):
    return m.forwardport(src,fingerprint(src))
class A223Surgical(unittest.TestCase):
    def test_valid_fixture_patch(self):
        self.assertIn("resolveAuthenticatedAttendanceMarker(req.user)",patch())
    def test_helper_import_one_time(self):
        self.assertEqual(patch().count(m.NEW_IMPORT),1)
    def test_client_records_key_retained(self):
        self.assertIn("const { records } = req.body",patch())
    def test_client_marker_binding_removed(self):
        self.assertNotIn("const { records, marked_by } = req.body",patch())
    def test_admin_marker_override_removed(self):
        self.assertNotIn("Number.isInteger(Number(marked_by))",patch())
    def test_teacher_scope_present(self):
        self.assertIn("teacherStudentScopeClause",patch())
    def test_authenticated_teacher_scope_gate_present(self):
        self.assertIn("requireTeacherAssignmentsForAttendance(req, res)",patch())
    def test_inactive_records_unchanged(self):
        self.assertIn("skippedInactiveIds",patch())
    def test_persistable_records_preserved(self):
        self.assertIn("persistableRecords",patch())
    def test_school_scope_preserved(self):
        self.assertIn("currentSchoolId(req)",patch())
    def test_tenant_scope_preserved(self):
        self.assertIn("currentTenantId(req)",patch())
    def test_read_handler_unchanged(self):
        a=BASE.split("router.post('/mark',",1)[0]
        b=patch().split("router.post('/mark',",1)[0]
        self.assertIn("router.get('/',",a)
        self.assertEqual(a.replace(m.IMPORT_ANCHOR,m.IMPORT_ANCHOR+"\n"+m.NEW_IMPORT),b)
    def test_mark_by_gr_handler_unchanged(self):
        self.assertEqual(BASE.split("router.post('/mark-by-gr',",1)[1],
                         patch().split("router.post('/mark-by-gr',",1)[1])
    def test_rollback_on_missing_actor(self):
        p=patch()
        self.assertIn("if (markedByUserId === null)",p)
        self.assertIn("await client.query('ROLLBACK')",p)
    def test_403_on_missing_actor(self):
        self.assertIn("return res.status(403)",patch())
    def test_no_unknown_actor_can_record(self):
        self.assertIn("'ATTENDANCE_MARKER_NOT_AUTHENTICATED'",patch())
    def test_patch_non_empty_unified_diff(self):
        self.assertIn("@@",m.patch_string(BASE,patch()))
    def test_patch_names_identify_review_only(self):
        self.assertIn('review-attendanceRoutes.js@a223',m.patch_string(BASE,patch()))
    def test_report_source_does_not_execute_deploy(self):
        contents=MODULE.read_text()
        for token in ["os.system(", "subprocess.run(", "shutil.rmtree(", ".unlink(", "pm2 restart", "sudo systemctl", "DELETE FROM"]:
            self.assertNotIn(token,contents)
    def test_fail_sha_one_character_modified(self):
        source=BASE.replace('skippedInactiveIds','skippedInactiveIdsChanged')
        with self.assertRaisesRegex(ValueError,"LIVE_ROUTE_SHA256_NOT_PINNED"):
            m.forwardport(source,fingerprint(BASE))
    def test_fail_source_with_wrong_sha(self):
        with self.assertRaisesRegex(ValueError,"LIVE_ROUTE_SHA256_NOT_PINNED"):
            m.forwardport(BASE,"0"*64)
    def test_fail_source_none(self):
        with self.assertRaises(TypeError):m.forwardport(None,fingerprint(BASE))
    def test_fail_source_bytes(self):
        with self.assertRaises(TypeError):m.forwardport(BASE.encode(),fingerprint(BASE))
    def test_fail_duplicate_import_anchor(self):
        s=BASE+m.IMPORT_ANCHOR
        with self.assertRaisesRegex(ValueError,"IMPORT_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_missing_import_anchor(self):
        s=BASE.replace(m.IMPORT_ANCHOR,"// missing anchor")
        with self.assertRaisesRegex(ValueError,"IMPORT_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_duplicate_bulk_record_anchor(self):
        s=BASE+"  const { records, marked_by } = req.body"
        with self.assertRaisesRegex(ValueError,"BULK_RECORDS_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_missing_bulk_record_anchor(self):
        s=BASE.replace("const { records, marked_by }","const { records }")
        with self.assertRaisesRegex(ValueError,"BULK_RECORDS_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_duplicate_marker_block(self):
        s=BASE+m.ORIGINAL_MARKER
        with self.assertRaisesRegex(ValueError,"MARKER_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_missing_marker_block(self):
        s=BASE.replace(m.ORIGINAL_MARKER,"const marker = 4")
        with self.assertRaisesRegex(ValueError,"MARKER_ANCHOR_NOT_UNIQUE"):
            m.forwardport(s,fingerprint(s))
    def test_fail_marker_outside_bulk_handler(self):
        s=BASE.replace(m.ORIGINAL_MARKER,'')+m.ORIGINAL_MARKER
        with self.assertRaisesRegex(ValueError,"MARKER_OUTSIDE_BULK_HANDLER"):
            m.forwardport(s,fingerprint(s))
    def test_fail_bad_handler_order(self):
        s=BASE.replace("router.post('/mark-by-gr',","router.post('/mark-other',")
        with self.assertRaises(ValueError):m.forwardport(s,fingerprint(s))
    def test_no_double_patching(self):
        s=patch()
        with self.assertRaises(ValueError):m.forwardport(s,fingerprint(s))
    def test_out_of_private_dir_blocked(self):
        with self.assertRaises(ValueError):m.path_guard("/tmp/A223_SHOULD_NOT_EXIST.txt")
    def test_out_of_scope_prefix_blocked(self):
        with self.assertRaises(ValueError):m.path_guard(str(m.PRIVATE_DIR/"arbitrary.txt"))
    def test_out_of_scope_prefix_parent_escape(self):
        with self.assertRaises(ValueError):m.path_guard(str(m.PRIVATE_DIR/".." /"A223_ESCAPED.txt"))
    def test_missing_source_anchor_returns_hold_not_best_effort(self):
        s=BASE.replace('router.get(', 'router.fetch(',1)
        with self.assertRaises(ValueError):m.forwardport(s,fingerprint(s))
    def test_changed_marker_integrity_rejected(self):
        s=BASE.replace("actorRole === 'teacher'","actorRole === 'admin'")
        with self.assertRaises(ValueError):m.forwardport(s,fingerprint(BASE))
    def test_changed_scope_guard_rejected_even_with_valid_hash(self):
        s=BASE.replace("teacherStudentScopeClause","unsafeStudentScope")
        with self.assertRaisesRegex(ValueError,"MISSING_LIVE_GUARD_"):
            m.forwardport(s,fingerprint(s))
    def test_record_extras_preserved(self):
        self.assertIn("const { records } = req.body",patch())
    def test_mark_by_gr_handler_unaffected(self):
        self.assertIn("router.post('/mark-by-gr',",patch())
    def test_no_role_override_in_bulk(self):
        block=patch().split("router.post('/mark',",1)[1].split("router.post('/mark-by-gr',",1)[0]
        self.assertNotIn("Number(marked_by)",block)
    def test_invalid_unscoped_target_cannot_pass(self):
        s=BASE.replace("currentTenantId(req)","null")
        with self.assertRaises(ValueError):m.forwardport(s,fingerprint(s))
    def test_output_preserves_source_newline(self):
        self.assertTrue(patch().endswith("\n"))
    def test_source_target_hashes_different(self):
        self.assertNotEqual(fingerprint(BASE),fingerprint(patch()))
    def test_file_fingerprint_static_valid(self):
        self.assertEqual(len(m.PINNED_SHA),64)
        self.assertTrue(all(c in "0123456789abcdef" for c in m.PINNED_SHA))

def _guard_missing(token):
    def test(self):
        s=BASE.replace(token,"BROKEN_"+str(len(token)))
        with self.assertRaises(ValueError):
            m.forwardport(s,fingerprint(s))
    return test
for i,guard in enumerate(m.SCOPING_GUARDS):
    setattr(A223Surgical,"test_fail_missing_guard_%02d"%i,_guard_missing(guard))

if __name__=="__main__":unittest.main()
