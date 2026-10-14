import importlib.util
from pathlib import Path
import unittest
FILE=Path(__file__).with_name('verify_exam9_printed_paper_sources_20261014.py')
SPEC=importlib.util.spec_from_file_location('paper_sources',FILE)
mod=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(mod)
class SourceEvidenceNotAuthorization(unittest.TestCase):
    def test_reject_monthly_chapter_papers_even_when_approved(self):
        for kind in ('Chapter Test','Monthly Test','Monthly Assessment','Quiz',''):
            data={'id':1,'exam_type':kind,'status':'approved','total_marks':25}
            self.assertEqual(mod.paper_evidence(data)['status'],'REJECT_WRONG_ASSESSMENT_TYPE')
    def test_first_term_is_only_reference_pending_signed_actor_and_exact_offering(self):
        for kind in ('First Term','First Term Examination','First-Term Paper'):
            data={'id':3,'exam_type':kind,'status':'approved','total_marks':60,
                  'class_name':'Six','subject_name':'Science'}
            self.assertEqual(mod.paper_evidence(data)['status'],
                             'REFERENCE_ONLY_NEEDS_ACTOR_AND_EXACT_OFFERING_MATCH')
    def test_reject_unapproved_or_invalid_maxima(self):
        self.assertEqual(mod.paper_evidence({'id':1,'exam_type':'First Term',
                         'status':'draft','total_marks':60})['status'],'REJECT_UNAPPROVED_PAPER')
        for total in (0,-1,None,'75'):
            self.assertEqual(mod.paper_evidence({'id':1,'exam_type':'First Term',
                             'status':'approved','total_marks':total})['status'],'REJECT_UNSUPPORTED_TOTAL')
    def test_no_cross_database_queries(self):
        with self.assertRaises(ValueError):mod.read_production('other_school',5432)
        with self.assertRaises(ValueError):mod.read_production('apexos',55432)
if __name__=='__main__':unittest.main()
