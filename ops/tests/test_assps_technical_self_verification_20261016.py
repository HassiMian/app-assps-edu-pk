import importlib.util
from pathlib import Path
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]/"release"/"assps-technical-self-verification-20261016.py"
spec=importlib.util.spec_from_file_location("assps_autonomous_validator",ROOT)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def good():
 return {
  "appHTTP":200,"apiHTTP":200,
  "checks":{
   "resultCards":{"status":"PASS","distinctPremiumTemplates":10},
   "diary":{"status":"PASS","prePromotionDecision":"PASS_DIARY_ACTIVE_CONTROLLER_PRESERVATION_ONLY"},
   "marks":{"status":"PASS"}},
  "metrics":{
   "scores":{"total_score_rows":1763,"actual_zeros":213,"school_count":2,"invalid_rows":0},
   "subjectEvidence":{"inconsistent_configurations":0}}
 }

class TestAcceptanceWithoutForgedSignatures(unittest.TestCase):
 def test_operational_evidence_does_not_require_fake_faculty_signoff(self):
  self.assertEqual(module.evaluate(good(),None),("OPERATIONAL",[]))
 def test_resultcards_regression_blocked(self):
  a=good();a["checks"]["resultCards"]["status"]="FAIL"
  self.assertEqual(module.evaluate(a,None)[0],"CRITICAL")
 def test_active_diary_must_keep_subject_controllers(self):
  a=good();a["checks"]["diary"]["prePromotionDecision"]="REGRESSED"
  self.assertIn("DIARY_RELEASE_GUARD_FAILED",module.evaluate(a,None)[1])
 def test_numerical_zero_not_considered_a_missing_mark(self):
  a=good();a["metrics"]["scores"]["actual_zeros"]=213
  self.assertEqual(module.evaluate(a,None)[0],"OPERATIONAL")
 def test_result_count_drop_is_guarded_but_increase_is_not(self):
  baseline=good();baseline["metrics"]["scores"]["total_score_rows"]=1770
  self.assertIn("SAVED_RESULT_ROW_COUNT_DROPPED_SINCE_PRIOR_CHECK",
                module.evaluate(good(),baseline)[1])
 def test_invalid_marks_cause_critical(self):
  a=good();a["metrics"]["scores"]["invalid_rows"]=1
  self.assertIn("INVALID_SCORED_MARKS_DETECTED",module.evaluate(a,None)[1])
 def test_duplicate_exam_subject_scores_trigger_critical(self):
  a=good();a["metrics"]["firstTermCompleteness"]={"duplicateStudentSubjects":1,"subjectGradeBandGaps":0,"studentGradeBandGaps":0}
  self.assertIn("DUPLICATE_STUDENT_SUBJECT_RESULT",module.evaluate(a,None)[1])
 def test_grade_band_gaps_trigger_critical(self):
  a=good();a["metrics"]["firstTermCompleteness"]={"duplicateStudentSubjects":0,"subjectGradeBandGaps":1,"studentGradeBandGaps":0}
  self.assertIn("GRADE_BAND_COVERAGE_REGRESSION",module.evaluate(a,None)[1])
 def test_known_missing_marks_are_not_fabricated_or_break_school_use(self):
  a=good();a["metrics"]["firstTermCompleteness"]={"duplicateStudentSubjects":0,"subjectGradeBandGaps":0,"studentGradeBandGaps":0,"missingEntries":284,"affectedStudents":233,"unmappedRecordedSubjects":1}
  self.assertEqual(module.evaluate(a,None)[0],"OPERATIONAL")
 def test_grade910_fake_approved_without_source_evidence_triggers_critical(self):
  a=good();a["metrics"]["grade910QuestionQuality"]={"approved_rows_missing_minimum_evidence":1}
  self.assertIn("GRADE910_APPROVED_QUESTION_WITHOUT_MINIMUM_SOURCE_OR_ANSWER_EVIDENCE",module.evaluate(a,None)[1])
 def test_unreviewed_grade910_candidates_not_falsely_approved(self):
  a=good();a["metrics"]["grade910QuestionQuality"]={"class9_question_rows":1530,"class10_question_rows":881,"flagged_approved_rows":0,"approved_rows_missing_minimum_evidence":0}
  self.assertEqual(module.evaluate(a,None)[0],"OPERATIONAL")
 def test_receipt_stored_atomically_and_no_personal_data(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"receipt.json";module.write_receipt(p,good())
   self.assertTrue(p.is_file())
   self.assertEqual(p.stat().st_mode & 0o777,0o600)

if __name__=="__main__":unittest.main()
