"""Hermetic regression tests for exam attendance tenant-scope static guard."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import verify_exam_attendance_tenant_scope_readonly as fence

OLD="""LEFT JOIN ( SELECT student_id, COUNT(*) AS total FROM attendance GROUP BY student_id ) att ON att.student_id = s.id\n"""
NEW="""LEFT JOIN ( SELECT school_id, student_id, COUNT(*) AS total FROM attendance GROUP BY school_id, student_id ) att ON att.school_id = s.school_id AND att.student_id = s.id\n"""

class SchoolScopedAttendanceTests(unittest.TestCase):
    def test_two_scoped_aggregates_pass(self):
        r=fence.inspect_text(NEW+NEW)
        self.assertEqual(r['projections_detected'],2)
        self.assertTrue(r['scoped'])
    def test_live_unscoped_attendance_joins_fail_closed(self):
        self.assertFalse(fence.inspect_text(OLD+OLD)['scoped'])
    def test_mixed_or_missing_aggregate_fails_closed(self):
        self.assertFalse(fence.inspect_text(NEW+OLD)['scoped'])
        self.assertFalse(fence.inspect_text('/* no query */')['scoped'])
        self.assertFalse(fence.inspect_text(NEW)['scoped'])
    def test_proposed_aggregate_must_group_and_join_both_identifiers(self):
        weak=NEW.replace('GROUP BY school_id, student_id','GROUP BY student_id')
        self.assertFalse(fence.inspect_text(weak*2)['scoped'])
        weak=NEW.replace('att.school_id = s.school_id AND ','')
        self.assertFalse(fence.inspect_text(weak*2)['scoped'])
    def test_file_inspection_is_nonmutating_and_hashes_sources(self):
        with tempfile.TemporaryDirectory() as folder:
            live=Path(folder)/'live.js';can=Path(folder)/'candidate.js'
            live.write_text(OLD*2);can.write_text(NEW*2)
            result=fence.inspect(live,can)
            self.assertTrue(result['pass'])
            self.assertFalse(result['live_scoped'])
            self.assertTrue(result['candidate_scoped'])
            self.assertEqual(live.read_text(),OLD*2)
            self.assertEqual(can.read_text(),NEW*2)

if __name__=='__main__': unittest.main()
