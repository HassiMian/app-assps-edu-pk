import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import assps_attendance_coverage_readonly as mod
class Coverage(unittest.TestCase):
    def test_starter_active_and_saved_not_equivalent(self):
        r=mod.parse("DAY|2026-10-19\nCLASS|Starter|48|44|44|4\nCLASS|Flyer|19|19|19|0")
        row=next(x for x in r['class_coverage'] if x['class_name']=='Starter')
        self.assertEqual(row['unmarked'],4)
        self.assertEqual(row['newly_registered_unmarked'],4)
        self.assertEqual(row['previously_registered_unmarked'],0)
        self.assertEqual(r['zero_saved_class_alerts'],0)
        self.assertTrue(r['does_not_infer_missing_attendance_status'])
    def test_suspect_whole_class_unmarked(self):
        r=mod.parse("DAY|2026-10-19\nCLASS|Starter|48|0|0|0\nCLASS|Flyer|19|19|19|0")
        self.assertEqual(r['zero_saved_class_alerts'],1)
    def test_absence_of_saved_attendance_not_fabricated_as_absent(self):
        r=mod.parse("DAY|2026-10-19\nCLASS|Starter|48|0|0|0")
        self.assertEqual(r['total_marked'],0)
        self.assertEqual(r['zero_saved_class_alerts'],0)
    def test_duplicate_persisted_rows_are_identified(self):
        r=mod.parse("DAY|2026-10-19\nCLASS|Starter|48|44|46|4")
        self.assertEqual(r['class_coverage'][0]['duplicate_rows'],2)
    def test_bad_more_marked_than_active_fails_closed(self):
        with self.assertRaises(ValueError):
            mod.parse("DAY|2026-10-19\nCLASS|Starter|48|49|49|0")
    def test_unmarked_count_cannot_be_less_than_new_today(self):
        with self.assertRaises(ValueError):
            mod.parse("DAY|2026-10-19\nCLASS|Starter|48|44|44|7")
    def test_duplicate_names_not_accepted(self):
        with self.assertRaises(ValueError):
            mod.parse("DAY|2026-10-19\nCLASS|Starter|48|45|45|0\nCLASS|Starter|48|45|45|0")
    def test_no_date_or_roster_rejected(self):
        with self.assertRaises(ValueError):
            mod.parse("DAY|2026-10-19")
    def test_sql_is_read_only(self):
        s=mod.SQL.upper()
        self.assertIn('BEGIN TRANSACTION READ ONLY',s)
        for word in ('INSERT INTO','DELETE FROM','TRUNCATE ','UPDATE PUBLIC.'):
            self.assertNotIn(word,s)
if __name__=='__main__':unittest.main()
