import copy
import importlib.util
from pathlib import Path
import unittest

HERE=Path(__file__).resolve().parents[1]/"a222_attendance_data_integrity_gate.py"
spec=importlib.util.spec_from_file_location("a222_integrity",HERE)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def fixture():
    roster=[
       {"class_name":"Nine","section_name":"Fatima","active_students":6},
       {"class_name":"Nine","section_name":"Usman","active_students":9},
       {"class_name":"Pre Nine","section_name":"Blue","active_students":12}
    ]
    daily=[]
    for day in ["2026-11-03","2026-11-04","2026-11-05","2026-11-06"]:
        for row in roster:
            daily.append({"day":day,"class_name":row["class_name"],"section_name":row["section_name"],
                          "entries":row["active_students"],"unique_students":row["active_students"]})
    data={"rosters":roster,"daily":daily,
          "duplicateStudentDateRows":0,"orphanSchool1AttendanceRows":0,
          "mismatchedSchoolStudentJoins":0,
          "school1Active":329,
          "statusCounts":[{"status":"absent","count":105},{"status":"late","count":3},{"status":"present","count":1208}]}
    branches=[]
    for i in range(4):
        branches.append({"nineToPreNineSectionFallbackPresent":True,
                        "attendanceModuleHasImportMapReplacement":False,
                        "replacementPreservesPreNineIdentity":True})
    published={"entryModulesConfirmed":4,"entryEvidence":branches,
               "importMapReplacementObservedInBrowser":False}
    return data,published

def decision(data=None,published=None,free_bytes=4*1024**3):
    baseline,graph=fixture()
    return m.validate_aggregates(data if data is not None else baseline,
                                 published if published is not None else graph,free_bytes=free_bytes)

class A222Integrity(unittest.TestCase):
    def test_valid_database_not_live_publication_approval(self):
        x=decision()
        self.assertEqual(x["release"],"HOLD")
        self.assertFalse(x["liveCutoverCertified"])
        self.assertEqual(x["published"]["unsafeAttendanceModules"],4)
    def test_three_roster_groups(self):
        self.assertEqual(decision()["distinctConfiguredRosterGroups"],3)
    def test_27_roster_students(self):
        self.assertEqual(decision()["activeStudentsInScope"],27)
    def test_108_attendance_rows(self):
        self.assertEqual(decision()["observedDailyRecords"],108)
    def test_four_observed_days(self):
        self.assertEqual(decision()["distinctDaysWithAttendance"],4)
    def test_twelve_aggregate_groups(self):
        self.assertEqual(decision()["aggregateGroups"],12)
    def test_absent_dates_not_automatically_absence(self):
        self.assertTrue(decision()["unverifiedDaysAreNotInterpretedAsAbsence"])
    def test_database_aggregate_cannot_prove_teacher_action(self):
        self.assertTrue(decision()["anonymousAggregatesNotProofOfTeacherAction"])
    def test_unsafe_fallback_blocker(self):
        self.assertIn("PUBLISHED_ATTENDANCE_MODULE_UNSAFE_NINE_PRENINE_FALLBACK",decision()["blockers"])
    def test_missing_principal_acceptance_blocked(self):
        self.assertIn("PRINCIPAL_TEACHER_PUBLISHED_UI_ACCEPTANCE_NOT_PROVEN",decision()["blockers"])
    def test_offhost_dr_not_inferred(self):
        self.assertIn("OFFHOST_RECOVERABLE_FULL_DATABASE_ROLES_PASSWORDS_ACL_NOT_PROVEN",decision()["blockers"])
    def test_rollback_never_inferred(self):
        self.assertIn("SIGNED_SAAS_CORE_ROLLBACK_NOT_PROVEN",decision()["blockers"])
    def test_full_disk_below_reserve(self):
        self.assertIn("ROOT_FILESYSTEM_BELOW_16_GIB_FREE",decision()["blockers"])
    def test_free_capacity_at_16_not_full_release(self):
        self.assertEqual(decision(free_bytes=16*1024**3)["release"],"HOLD")
    def test_negative_disk_rejected(self):
        with self.assertRaises(ValueError):decision(free_bytes=-1)
    def test_boolean_disk_rejected(self):
        with self.assertRaises(ValueError):decision(free_bytes=True)
    def test_float_disk_rejected(self):
        with self.assertRaises(ValueError):decision(free_bytes=4.2)
    def test_empty_record_rejected(self):
        with self.assertRaises(ValueError):decision(data={})
    def test_null_record_rejected(self):
        with self.assertRaises(ValueError):decision(data=[])
    def test_null_graph_rejected(self):
        with self.assertRaises(ValueError):m.published_graph_shape(None)
    def test_graph_missing_branch_list_rejected(self):
        with self.assertRaises(ValueError):m.published_graph_shape({})
    def test_no_attendance_not_marked_absent(self):
        d,_=fixture();d["daily"]=[]
        x=decision(data=d)
        self.assertEqual(x["observedDailyRecords"],0)
        self.assertTrue(x["unverifiedDaysAreNotInterpretedAsAbsence"])
    def test_missing_pre_nine_roster_blocks(self):
        d,_=fixture();d["rosters"]=d["rosters"][:2]
        self.assertIn("DISTINCT_NINE_AND_PRENINE_ROSTER_SCOPE_NOT_PROVEN",decision(data=d)["blockers"])
    def test_missing_nine_fatima_blocks(self):
        d,_=fixture();d["rosters"]=d["rosters"][1:]
        self.assertIn("DISTINCT_NINE_AND_PRENINE_ROSTER_SCOPE_NOT_PROVEN",decision(data=d)["blockers"])
    def test_duplicate_roster_group_blocks(self):
        d,_=fixture();d["rosters"].append(copy.deepcopy(d["rosters"][0]))
        self.assertIn("DISTINCT_NINE_AND_PRENINE_ROSTER_SCOPE_NOT_PROVEN",decision(data=d)["blockers"])
    def test_relabel_nine_to_pre_nine_blocks(self):
        d,_=fixture();d["rosters"][0]["class_name"]="Pre Nine"
        self.assertIn("DISTINCT_NINE_AND_PRENINE_ROSTER_SCOPE_NOT_PROVEN",decision(data=d)["blockers"])
    def test_zero_pre_nine_roster_blocks(self):
        d,_=fixture();d["rosters"][2]["active_students"]=0
        self.assertIn("ONE_OR_MORE_ATTENDANCE_GROUPS_EMPTY",decision(data=d)["blockers"])
    def test_false_boolean_roster_count_rejected(self):
        d,_=fixture();d["rosters"][2]["active_students"]=False
        with self.assertRaises(ValueError):decision(data=d)
    def test_negative_roster_rejected(self):
        d,_=fixture();d["rosters"][0]["active_students"]=-1
        with self.assertRaises(ValueError):decision(data=d)
    def test_unexpected_daily_class_rejected(self):
        d,_=fixture();d["daily"][0]["class_name"]="Six"
        with self.assertRaises(ValueError):decision(data=d)
    def test_unknown_daily_section_rejected(self):
        d,_=fixture();d["daily"][0]["section_name"]="Unknown"
        with self.assertRaises(ValueError):decision(data=d)
    def test_missing_day_rejected(self):
        d,_=fixture();d["daily"][0]["day"]=None
        with self.assertRaises(ValueError):decision(data=d)
    def test_invalid_date_length_rejected(self):
        d,_=fixture();d["daily"][0]["day"]="2026-11"
        with self.assertRaises(ValueError):decision(data=d)
    def test_duplicate_student_record_blocks(self):
        d,_=fixture();d["daily"][0]["entries"]=7
        self.assertIn("DUPLICATE_ATTENDANCE_FOR_SAME_DATE_AND_SECTION",decision(data=d)["blockers"])
    def test_daily_more_than_active_roster_blocks(self):
        d,_=fixture();d["daily"][0]["unique_students"]=7
        self.assertIn("ATTENDANCE_EXCEEDS_CURRENT_ACTIVE_ROSTER",decision(data=d)["blockers"])
    def test_duplicate_day_section_aggregate_blocks(self):
        d,_=fixture();d["daily"].append(copy.deepcopy(d["daily"][0]))
        self.assertIn("DUPLICATE_DAY_CLASS_SECTION_AGGREGATE",decision(data=d)["blockers"])
    def test_boolean_entries_rejected(self):
        d,_=fixture();d["daily"][0]["entries"]=True
        with self.assertRaises(ValueError):decision(data=d)
    def test_negative_unique_count_rejected(self):
        d,_=fixture();d["daily"][0]["unique_students"]=-1
        with self.assertRaises(ValueError):decision(data=d)
    def test_null_daily_list_rejected(self):
        d,_=fixture();d["daily"]=None
        with self.assertRaises(ValueError):decision(data=d)
    def test_corrupt_status_string_rejected(self):
        d,_=fixture();d["statusCounts"][0]["status"]=4
        with self.assertRaises(ValueError):decision(data=d)
    def test_status_bool_count_rejected(self):
        d,_=fixture();d["statusCounts"][0]["count"]=True
        with self.assertRaises(ValueError):decision(data=d)
    def test_unrecognized_status_blocked(self):
        d,_=fixture();d["statusCounts"].append({"status":"unauthorized","count":1})
        self.assertIn("UNKNOWN_ATTENDANCE_STATUS",decision(data=d)["blockers"])
    def test_graph_two_entries_blocks(self):
        d,g=fixture();g["entryEvidence"]=g["entryEvidence"][:2]
        self.assertIn("FOUR_PUBLISHED_ENTRY_MODULES_NOT_PROVEN",decision(d,g)["blockers"])
    def test_graph_no_safe_mark_overrides_blocks(self):
        d,g=fixture();g["entryEvidence"][0]["replacementPreservesPreNineIdentity"]=False
        self.assertIn("MARK_ATTENDANCE_IMPORTMAP_NOT_ALL_SAFE",decision(d,g)["blockers"])
    def test_even_clean_published_fallback_requires_auth(self):
        d,g=fixture()
        for b in g["entryEvidence"]:
            b["nineToPreNineSectionFallbackPresent"]=False
            b["attendanceModuleHasImportMapReplacement"]=True
        r=decision(d,g,free_bytes=64*1024**3)
        self.assertEqual(r["published"]["unsafeAttendanceModules"],0)
        self.assertEqual(r["release"],"HOLD")
        self.assertIn("PRINCIPAL_TEACHER_PUBLISHED_UI_ACCEPTANCE_NOT_PROVEN",r["blockers"])
    def test_contains_readonly_transaction(self):
        self.assertIn("BEGIN READ ONLY",m.SQL)
        self.assertIn("ROLLBACK;",m.SQL)
    def test_expected_three_distinct_identities(self):
        self.assertEqual(m.EXPECTED,{("Nine","Fatima"),("Nine","Usman"),("Pre Nine","Blue")})
    def test_query_requires_tenant_id_on_join(self):
        self.assertIn("s.school_id=a.school_id",m.SQL)
        self.assertIn("a.school_id=1",m.SQL)
    def test_query_never_reads_personal_student_columns(self):
        for field in ["father_name","parent_phone","father_cnic","address","student_user_id"]:
            self.assertNotIn(field,m.SQL)
    def test_source_never_contains_sql_mutation(self):
        for value in ["UPDATE students", "DELETE FROM", "INSERT INTO", "TRUNCATE", "ALTER TABLE",
                      "shutil.rmtree(", ".unlink(", "os.system(", "--apply"]:
            self.assertNotIn(value,HERE.read_text())

def _database_integrity_issue(field):
    def case(self):
        d,_=fixture()
        d[field]=1
        self.assertIn("DATABASE_"+field,decision(data=d)["blockers"])
    return case
def _database_integrity_bad_count(field):
    def case(self):
        d,_=fixture()
        d[field]=True
        with self.assertRaises(ValueError):decision(data=d)
    return case
for field in ("duplicateStudentDateRows","orphanSchool1AttendanceRows","mismatchedSchoolStudentJoins"):
    setattr(A222Integrity,"test_integrity_issue_"+field,_database_integrity_issue(field))
    setattr(A222Integrity,"test_integrity_boolean_"+field,_database_integrity_bad_count(field))

if __name__=="__main__":unittest.main()
