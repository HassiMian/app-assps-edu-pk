"""Evidence analysis unit tests; never access or mutate a production tenant."""
from unittest import TestCase
from exam9_school_evidence_matrix_20261014 import analyze

class SourceReconciliationTests(TestCase):
    def setUp(self):
        self.offer=dict(id=1,class_name='Five',section='Blue',subject='Mathematics',
                        official_maximum=None,approval_status='pending',
                        approved_by_user_id=None,saved_rows=23,
                        historical_denominators=[60])
        self.slot=dict(class_name='Five',section='',period_label='Period 1',
                       subject='Mathematics',teacher_display_name='Miss Isma',
                       teacher_id=None,staff_identity_reviewed=False,
                       source_sha256='a'*64)
        self.roster=[dict(class_name='Five',section='Blue',students=23)]

    def test_historical_60_is_not_official_60(self):
        r=analyze([self.offer],[self.slot],self.roster)
        self.assertFalse(r['release_safe'])
        self.assertEqual(r['offering_rows_without_maxima'],1)
        self.assertEqual(r['offering_review'][0]['historical_denominators'],[60])
        self.assertIsNone(r['offering_review'][0]['official_maximum'])
        self.assertEqual(r['unverified_timetable_staff'],1)
        self.assertEqual(r['unscoped_timetable_sections'],1)

    def test_name_only_never_activates_teacher_grant(self):
        r=analyze([self.offer],[self.slot],self.roster)
        self.assertEqual(r['timetable_review'][0]['state'],'DISPLAY_ONLY_UNAPPROVED')
        self.assertIn('UNVERIFIED_TEACHER_ACCOUNT',r['timetable_review'][0]['review_blockers'])

    def test_grade_nine_not_improperly_treated_as_exam_nine(self):
        slot={**self.slot,'class_name':'Nine','section':'Usman','teacher_id':42,
              'staff_identity_reviewed':True}
        r=analyze([], [slot],self.roster)
        self.assertIn('NON_EXAM9_COHORT_NO_AUTO_GRANT',r['timetable_review'][0]['review_blockers'])
        self.assertFalse(r['release_safe'])

    def test_denominator_conflict_and_inactive_cohort_block(self):
        offer={**self.offer,'class_name':'One','section':'Blue',
               'historical_denominators':[50,75]}
        r=analyze([offer],[],self.roster)
        self.assertEqual(r['observed_denominator_conflicts'],1)
        self.assertEqual(r['offerings_without_active_cohort'],1)

    def test_orphan_saved_score_is_reported_but_not_modified(self):
        orphan=[dict(class_name='Mover',section='Purple',subject='Computer',saved_rows=1)]
        r=analyze([self.offer],[],self.roster,orphan)
        self.assertEqual(r['saved_rows_without_matching_offering'],1)
        self.assertEqual(r['unmatched_saved_subjects'][0]['subject'],'Computer')
        self.assertFalse(r['release_safe'])
